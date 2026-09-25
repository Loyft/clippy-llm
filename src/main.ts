import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ClippyCharacter } from "./clippy";
import {
  AppConfig,
  ChatMessage,
  checkOllama,
  streamChat,
} from "./ollama";

const canvas = document.querySelector<HTMLCanvasElement>("#clippy-canvas")!;
const bubble = document.querySelector<HTMLDivElement>("#bubble")!;
const bubbleText = document.querySelector<HTMLDivElement>("#bubble-text")!;
const chatForm = document.querySelector<HTMLFormElement>("#chat-form")!;
const chatInput = document.querySelector<HTMLInputElement>("#chat-input")!;
const sendBtn = document.querySelector<HTMLButtonElement>("#send-btn")!;
const closeBtn = document.querySelector<HTMLButtonElement>("#bubble-close")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;

const clippy = new ClippyCharacter(canvas);
let config: AppConfig = {
  model: "llama3.2",
  ollama_url: "http://127.0.0.1:11434",
  system_prompt: "",
  proactive: true,
};
let history: ChatMessage[] = [];
let busy = false;
let abortCtrl: AbortController | null = null;
let proactiveTimer: number | null = null;

const PROACTIVE_LINES = [
  "It looks like you're working hard! Need a hand with anything?",
  "Psst — I can help draft text, explain code, or just chat.",
  "Did you know you can drag me around the screen?",
  "Would you like some help organizing your thoughts?",
  "I'm still here if you need me!",
];

const DRAG_THRESHOLD_PX = 5;
let pointerActive = false;
let dragStarted = false;
let pointerStartX = 0;
let pointerStartY = 0;

function showStatus(msg: string, ms = 3500) {
  statusEl.textContent = msg;
  statusEl.classList.add("visible");
  window.setTimeout(() => statusEl.classList.remove("visible"), ms);
}

function openBubble(text = "") {
  bubble.classList.remove("hidden");
  bubbleText.textContent = text;
}

function closeBubble() {
  bubble.classList.add("hidden");
}

function setBusy(value: boolean) {
  busy = value;
  sendBtn.disabled = value;
  chatInput.disabled = value;
}

async function loadConfig() {
  try {
    config = await invoke<AppConfig>("get_config");
  } catch (e) {
    console.warn("Could not load config from Tauri, using defaults", e);
  }
  history = [{ role: "system", content: config.system_prompt }];
}

async function ensureOllama() {
  const ok = await checkOllama(config.ollama_url);
  if (!ok) {
    openBubble(
      `I can't reach Ollama at ${config.ollama_url}.\n\nStart it with:\n  ollama serve\nthen pull a model:\n  ollama pull ${config.model}`,
    );
    clippy.play("GetAttention");
    showStatus("Ollama offline");
    return false;
  }
  return true;
}

async function askClippy(prompt: string) {
  if (!prompt.trim() || busy) return;

  openBubble("…");
  setBusy(true);
  clippy.play("Thinking");

  const online = await ensureOllama();
  if (!online) {
    setBusy(false);
    return;
  }

  history.push({ role: "user", content: prompt.trim() });
  abortCtrl?.abort();
  abortCtrl = new AbortController();

  let reply = "";
  try {
    clippy.play("Processing");
    for await (const chunk of streamChat(
      config.ollama_url,
      config.model,
      history,
      abortCtrl.signal,
    )) {
      reply += chunk;
      bubbleText.textContent = reply;
      bubbleText.scrollTop = bubbleText.scrollHeight;
    }

    if (!reply.trim()) {
      reply = "Hmm, I came up blank. Try asking again?";
      bubbleText.textContent = reply;
    }

    history.push({ role: "assistant", content: reply });
    // Keep history bounded
    if (history.length > 21) {
      history = [history[0], ...history.slice(-20)];
    }
    clippy.play("Explain");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    bubbleText.textContent = `Oh dear — something went wrong:\n${msg}`;
    clippy.play("GetAttention");
    // Remove the failed user turn
    if (history[history.length - 1]?.role === "user") {
      history.pop();
    }
  } finally {
    setBusy(false);
    chatInput.focus();
  }
}

function scheduleProactive() {
  if (proactiveTimer !== null) {
    window.clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
  if (!config.proactive) return;

  // 3–6 minutes
  const delay = 180_000 + Math.random() * 180_000;
  proactiveTimer = window.setTimeout(() => {
    if (!busy && bubble.classList.contains("hidden")) {
      const line =
        PROACTIVE_LINES[Math.floor(Math.random() * PROACTIVE_LINES.length)];
      openBubble(line);
      clippy.play("GetAttention");
    }
    scheduleProactive();
  }, delay);
}

function onClippyActivate() {
  if (bubble.classList.contains("hidden")) {
    openBubble("Hi! What can I help you with today?");
    clippy.play("Wave");
    chatInput.focus();
  } else {
    chatInput.focus();
  }
}

/** Drag Clippy to move the window; a tap (no move) opens chat. */
function setupWindowDragging() {
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    pointerActive = true;
    dragStarted = false;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointerActive || dragStarted) return;
    const dx = e.clientX - pointerStartX;
    const dy = e.clientY - pointerStartY;
    if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;

    dragStarted = true;
    void getCurrentWindow()
      .startDragging()
      .catch((err) => console.warn("startDragging failed", err));
  });

  const endPointer = (e: PointerEvent) => {
    if (!pointerActive) return;
    const wasDrag = dragStarted;
    pointerActive = false;
    dragStarted = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    if (!wasDrag) {
      onClippyActivate();
    }
  };

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = chatInput.value;
  chatInput.value = "";
  void askClippy(value);
});

closeBtn.addEventListener("click", () => {
  abortCtrl?.abort();
  closeBubble();
});

setupWindowDragging();

async function boot() {
  await clippy.load("/agents/Clippy");
  await loadConfig();

  try {
    await listen<boolean>("proactive-changed", (event) => {
      config.proactive = event.payload;
      showStatus(config.proactive ? "Proactive tips on" : "Proactive tips muted");
      scheduleProactive();
    });
  } catch {
    // Running outside Tauri (browser preview)
  }

  const online = await ensureOllama();
  if (online) {
    openBubble(
      `Hi! I'm Clippy.\n\nAsk me anything — I'm using ${config.model} via Ollama.\n\nDrag me to move around!`,
    );
    clippy.play("Wave");
  }

  scheduleProactive();
  chatInput.focus();
}

void boot();
