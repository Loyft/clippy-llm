import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
 ClippyCharacter,
 COMPANIONS,
 COMPANION_IDS,
 CompanionId,
 isBuiltInSystemPrompt,
 isCompanionId,
} from "./clippy";
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
const switcher = document.querySelector<HTMLDivElement>("#companion-switcher")!;
const companionMenu = document.querySelector<HTMLDivElement>("#companion-menu")!;

const clippy = new ClippyCharacter(canvas);
let config: AppConfig = {
 model: "llama3.2",
 ollama_url: "http://127.0.0.1:11434",
 system_prompt: "",
 proactive: true,
 companion: "Clippy",
};
let companionId: CompanionId = "Clippy";
let history: ChatMessage[] = [];
let busy = false;
let abortCtrl: AbortController | null = null;
let proactiveTimer: number | null = null;

const DEFAULT_PROACTIVE = [
 "It looks like you're working hard! Need a hand with anything?",
 "Psst - I can help draft text, explain code, or just chat.",
 "Did you know you can drag me around the screen?",
 "Would you like some help organizing your thoughts?",
 "I'm still here if you need me!",
];

const PROACTIVE_LINES: Partial<Record<CompanionId, string[]>> = {
 Clippy: DEFAULT_PROACTIVE,
 Cat: [
 "Mrrp - you've been busy. Want a paw with anything?",
 "I can help draft text, explain code, or just loaf and chat.",
 "Psst: you can drag me around the screen.",
 "Need help untangling a thought? Ragdolls are good at yarn… and ideas.",
 "Still here on the desk if you need me. Purr.",
 ],
 Merlin: [
 "A wise question often hides nearby. Shall we find it?",
 "I sense unfinished thoughts… care for a spell of clarity?",
 "Magic is optional. Help is not. Need anything?",
 ],
 Links: [
 "Meow - you've been staring at that screen. Need a nudge?",
 "I can help, or I can nap. Your call.",
 "Psst: drag me if you want a new perch.",
 ],
 Rover: [
 "Woof! Ready for a walk through that problem?",
 "I'm a good boy at brainstorming. Need me?",
 "Still here - just wagging patiently.",
 ],
 Genius: [
 "Relatively speaking… need a thought experiment?",
 "Eureka moments welcome anytime. What's on your mind?",
 ],
 Genie: [
 "No lamp rubbing required. Just ask.",
 "I grant answers, not just wishes. Need one?",
 ],
 Peedy: [
 "Squawk! Brainstorming session? Count me in.",
 "Pretty bird, pretty helpful. Need anything?",
 ],
 Rocky: [
 "…still here. Solid as ever. Need help?",
 "I don't roll away. Ask anytime.",
 ],
 F1: [
 "Idle loop complete. Awaiting query.",
 "Systems online. Need assistance?",
 ],
};

const DRAG_THRESHOLD_PX = 5;
let pointerActive = false;
let dragStarted = false;
let pointerStartX = 0;
let pointerStartY = 0;

function companion() {
 return COMPANIONS[companionId];
}

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

function buildCompanionMenu() {
 companionMenu.replaceChildren();
 for (const id of COMPANION_IDS) {
 const def = COMPANIONS[id];
 const btn = document.createElement("button");
 btn.type = "button";
 btn.className = "companion-btn";
 btn.dataset.companion = id;
 btn.title = def.name;
 btn.textContent = def.name;
 btn.setAttribute("role", "option");
 companionMenu.appendChild(btn);
 }
}

function applyCompanionChrome() {
 const def = companion();
 chatInput.placeholder = def.placeholder;
 canvas.style.width = `${def.displaySize.width}px`;
 canvas.style.height = `${def.displaySize.height}px`;
 canvas.setAttribute("aria-label", `${def.name} - drag to move · hover for companions`);

 for (const btn of companionMenu.querySelectorAll<HTMLButtonElement>(
 ".companion-btn",
 )) {
 const active = btn.dataset.companion === companionId;
 btn.classList.toggle("active", active);
 btn.setAttribute("aria-selected", active ? "true" : "false");
 }
}

let companionMenuCloseTimer: number | null = null;

function openCompanionMenu() {
 if (companionMenuCloseTimer !== null) {
 window.clearTimeout(companionMenuCloseTimer);
 companionMenuCloseTimer = null;
 }
 switcher.classList.add("open");
}

function scheduleCloseCompanionMenu() {
 if (companionMenuCloseTimer !== null) {
 window.clearTimeout(companionMenuCloseTimer);
 }
 companionMenuCloseTimer = window.setTimeout(() => {
 switcher.classList.remove("open");
 companionMenuCloseTimer = null;
 }, 600);
}

function setupCompanionMenuHover() {
 canvas.addEventListener("mouseenter", openCompanionMenu);
 canvas.addEventListener("mouseleave", scheduleCloseCompanionMenu);
 switcher.addEventListener("mouseenter", openCompanionMenu);
 switcher.addEventListener("mouseleave", scheduleCloseCompanionMenu);
}

function resetHistoryForCompanion() {
 const custom = config.system_prompt.trim();
 history = [
 {
 role: "system",
 content: isBuiltInSystemPrompt(custom)
 ? companion().systemPrompt
 : custom,
 },
 ];
}

async function loadConfig() {
 try {
 config = await invoke<AppConfig>("get_config");
 } catch (e) {
 console.warn("Could not load config from Tauri, using defaults", e);
 }

 const stored = localStorage.getItem("companion");
 if (config.companion && isCompanionId(config.companion)) {
 companionId = config.companion;
 } else if (stored && isCompanionId(stored)) {
 companionId = stored;
 }
 resetHistoryForCompanion();
}

async function persistCompanion(id: CompanionId) {
 localStorage.setItem("companion", id);
 try {
 config = await invoke<AppConfig>("set_companion", { companion: id });
 } catch {
 config = { ...config, companion: id };
 }
}

async function ensureOllama() {
 const ok = await checkOllama(config.ollama_url);
 if (!ok) {
 openBubble(
 `I can't reach Ollama at ${config.ollama_url}.\n\nStart it with:\n ollama serve\nthen pull a model:\n ollama pull ${config.model}`,
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
 if (history.length > 21) {
 history = [history[0], ...history.slice(-20)];
 }
 clippy.play("Explain");
 } catch (e) {
 const msg = e instanceof Error ? e.message : String(e);
 bubbleText.textContent = `Oh dear - something went wrong:\n${msg}`;
 clippy.play("GetAttention");
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

 const delay = 180_000 + Math.random() * 180_000;
 proactiveTimer = window.setTimeout(() => {
 if (!busy && bubble.classList.contains("hidden")) {
 const lines = PROACTIVE_LINES[companionId] ?? DEFAULT_PROACTIVE;
 const line = lines[Math.floor(Math.random() * lines.length)];
 openBubble(line);
 clippy.play("GetAttention");
 }
 scheduleProactive();
 }, delay);
}

function onClippyActivate() {
 if (bubble.classList.contains("hidden")) {
 openBubble(companion().activate);
 clippy.play("Wave");
 chatInput.focus();
 } else {
 chatInput.focus();
 }
}

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

async function switchCompanion(id: CompanionId) {
 if (id === companionId) return;
 if (busy) {
 showStatus("Wait for the reply first");
 return;
 }

 abortCtrl?.abort();
 companionId = id;
 applyCompanionChrome();
 resetHistoryForCompanion();
 await persistCompanion(id);
 await clippy.load(companion().path, companion().idleAnims);
 openBubble(companion().hello(config.model));
 clippy.play("Wave");
 showStatus(`Switched to ${companion().name}`);
 switcher.classList.remove("open");
 chatInput.focus();
}

switcher.addEventListener("click", (e) => {
 const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
 ".companion-btn",
 );
 if (!btn?.dataset.companion || !isCompanionId(btn.dataset.companion)) return;
 void switchCompanion(btn.dataset.companion);
});

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
setupCompanionMenuHover();

async function boot() {
 buildCompanionMenu();
 await loadConfig();
 applyCompanionChrome();
 await clippy.load(companion().path, companion().idleAnims);

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
 openBubble(companion().hello(config.model));
 clippy.play("Wave");
 }

 scheduleProactive();
 chatInput.focus();
}

void boot();
