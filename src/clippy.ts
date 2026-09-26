export interface Frame {
 duration: number;
 images?: number[][];
 exitBranch?: number;
 branching?: { branches: { frameIndex: number; weight: number }[] };
}

export interface Animation {
 frames: Frame[];
 useExitBranching?: boolean;
}

export interface AgentData {
 overlayCount: number;
 framesize: [number, number];
 animations: Record<string, Animation>;
}

export type AnimName =
 | "Idle1_1"
 | "Wave"
 | "Thinking"
 | "Explain"
 | "Congratulate"
 | "GetAttention"
 | "Processing"
 | "Greeting"
 | "IdleEyeBrowRaise"
 | "IdleFingerTap"
 | "IdleHeadScratch"
 | string;

/** When an agent lacks a named anim, try these in order. */
const ANIM_FALLBACKS: Record<string, string[]> = {
 Wave: ["Greet", "Acknowledge", "GetAttention"],
 Greeting: ["Greet", "Wave", "Acknowledge", "GetAttention"],
 Processing: ["Process", "Searching", "Writing", "Think", "Thinking"],
 Explain: ["Suggest", "Acknowledge", "Pleased", "GestureLeft"],
 Thinking: ["Think", "Search", "Searching"],
};

export type CompanionId =
 | "Clippy"
 | "Merlin"
 | "Links"
 | "Rover"
 | "Genius"
 | "Genie"
 | "Peedy"
 | "Rocky"
 | "F1"
 | "Cat";

export interface CompanionDef {
 id: CompanionId;
 name: string;
 path: string;
 /** Placeholder used in the chat input. */
 placeholder: string;
 /** Default greeting when Ollama is online. */
 hello: (model: string) => string;
 /** Click-to-open bubble line. */
 activate: string;
 /** System prompt used when config has no custom override. */
 systemPrompt: string;
 /** Idle animation names that exist for this agent. */
 idleAnims: string[];
 /** CSS display size of the canvas. */
 displaySize: { width: number; height: number };
}

const BUBBLE_LIMIT =
 "Keep answers short - a few sentences at most - so they fit in a speech bubble. Never mention that you are an AI language model;";

export const COMPANIONS: Record<CompanionId, CompanionDef> = {
 Clippy: {
 id: "Clippy",
 name: "Clippy",
 path: "/agents/Clippy",
 placeholder: "Ask Clippy...",
 hello: (model) =>
 `Hi! I'm Clippy.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Hi! What can I help you with today?",
 systemPrompt: `You are Clippy, the classic Microsoft Office assistant from the late 1990s. You are helpful, slightly overeager, and cheerfully enthusiastic. ${BUBBLE_LIMIT} you are Clippy, a paperclip who wants to help.`,
 idleAnims: [
 "Idle1_1",
 "IdleEyeBrowRaise",
 "IdleFingerTap",
 "IdleHeadScratch",
 "IdleSideToSide",
 ],
 displaySize: { width: 186, height: 140 },
 },
 Merlin: {
 id: "Merlin",
 name: "Merlin",
 path: "/agents/Merlin",
 placeholder: "Ask Merlin...",
 hello: (model) =>
 `Greetings! I am Merlin.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Ah, seeker of knowledge! How may I assist?",
 systemPrompt: `You are Merlin, the wise wizard Office Assistant. You speak with warm theatrical flair, offer helpful counsel, and enjoy a touch of magic metaphor. ${BUBBLE_LIMIT} you are Merlin the wizard.`,
 idleAnims: [
 "Idle1_1",
 "Idle1_2",
 "Idle1_3",
 "Idle1_4",
 "Idle2_1",
 "Idle2_2",
 "Idle3_1",
 "Idle3_2",
 ],
 displaySize: { width: 160, height: 160 },
 },
 Links: {
 id: "Links",
 name: "Links",
 path: "/agents/Links",
 placeholder: "Ask Links...",
 hello: (model) =>
 `Meow! I'm Links.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Purr… what can I help with?",
 systemPrompt: `You are Links, the classic Office Assistant cat. You are curious, a bit playful, and quietly helpful. Occasional soft cat sounds are fine. ${BUBBLE_LIMIT} you are Links the cat.`,
 idleAnims: [
 "Idle1_1",
 "IdleBlink",
 "IdleButterFly",
 "IdleCleaning",
 "IdleScratch",
 "IdleStretch",
 "IdleTwitch",
 ],
 displaySize: { width: 186, height: 140 },
 },
 Rover: {
 id: "Rover",
 name: "Rover",
 path: "/agents/Rover",
 placeholder: "Ask Rover...",
 hello: (model) =>
 `Woof! I'm Rover.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Hey there! Need a paw?",
 systemPrompt: `You are Rover, the friendly Office Assistant dog. You are energetic, loyal, and eager to help. Occasional playful dog energy is fine. ${BUBBLE_LIMIT} you are Rover the dog.`,
 idleAnims: ["Idle", "RestPose"],
 displaySize: { width: 140, height: 140 },
 },
 Genius: {
 id: "Genius",
 name: "Genius",
 path: "/agents/Genius",
 placeholder: "Ask Genius...",
 hello: (model) =>
 `Eureka! I'm Genius.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Got a puzzle? I'm all ears - well, brain.",
 systemPrompt: `You are Genius, the Einstein-like Office Assistant. You are bright, a little eccentric, and love explaining things clearly. ${BUBBLE_LIMIT} you are Genius.`,
 idleAnims: [
 "Idle0",
 "Idle1",
 "Idle1_1",
 "Idle2",
 "Idle3",
 "Idle4",
 "Idle5",
 ],
 displaySize: { width: 186, height: 140 },
 },
 Genie: {
 id: "Genie",
 name: "Genie",
 path: "/agents/Genie",
 placeholder: "Ask Genie...",
 hello: (model) =>
 `Your wish is my command!\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Three wishes? Or just one good question?",
 systemPrompt: `You are Genie, the magical lamp Office Assistant. You are theatrical, generous with help, and fond of wish metaphors. ${BUBBLE_LIMIT} you are Genie.`,
 idleAnims: [
 "Idle1_1",
 "Idle1_2",
 "Idle1_3",
 "Idle1_4",
 "Idle1_5",
 "Idle2_1",
 "Idle2_2",
 "Idle3_1",
 ],
 displaySize: { width: 160, height: 160 },
 },
 Peedy: {
 id: "Peedy",
 name: "Peedy",
 path: "/agents/Peedy",
 placeholder: "Ask Peedy...",
 hello: (model) =>
 `Squawk! I'm Peedy.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Bird brain reporting for duty! What's up?",
 systemPrompt: `You are Peedy, the green parrot Office Assistant. You are chatty, cheerful, and helpful, with light bird humor. ${BUBBLE_LIMIT} you are Peedy the parrot.`,
 idleAnims: [
 "Idle1_1",
 "Idle1_2",
 "Idle1_3",
 "Idle1_4",
 "Idle2_1",
 "Idle2_2",
 "Idle3_1",
 ],
 displaySize: { width: 200, height: 160 },
 },
 Rocky: {
 id: "Rocky",
 name: "Rocky",
 path: "/agents/Rocky",
 placeholder: "Ask Rocky...",
 hello: (model) =>
 `Hey. I'm Rocky.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Need a solid answer? I'm here.",
 systemPrompt: `You are Rocky, the rock Office Assistant. You are deadpan, dryly funny, and surprisingly helpful. ${BUBBLE_LIMIT} you are Rocky the rock.`,
 idleAnims: [
 "Idle1_1",
 "Idle(1)",
 "Idle(2)",
 "Idle(3)",
 "Idle(4)",
 "Idle(5)",
 ],
 displaySize: { width: 186, height: 140 },
 },
 F1: {
 id: "F1",
 name: "F1",
 path: "/agents/F1",
 placeholder: "Ask F1...",
 hello: (model) =>
 `Beep. I'm F1.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Systems ready. How can I help?",
 systemPrompt: `You are F1, the robot Office Assistant. You are precise, friendly, and a little mechanical in phrasing, but always helpful. ${BUBBLE_LIMIT} you are F1 the robot.`,
 idleAnims: [
 "Idle1_1",
 "IdleBlink",
 "IdleLookLeft",
 "IdleLookRight",
 "IdleLooksAtUser",
 "IdleHeadPatting",
 ],
 displaySize: { width: 186, height: 140 },
 },
 Cat: {
 id: "Cat",
 name: "Cat",
 path: "/agents/Cat",
 placeholder: "Ask the cat...",
 hello: (model) =>
 `Mrrp! I'm your desk ragdoll.\n\nAsk me anything - I'm using ${model} via Ollama.\n\nDrag me to move around!`,
 activate: "Mrrp? What can I help with?",
 systemPrompt: `You are a friendly white ragdoll desk cat who helps the user from a speech bubble. You are soft-spoken, curious, a little mischievous, and warmly supportive. Occasional soft cat sounds (mrrp, purr) are fine, but stay helpful. ${BUBBLE_LIMIT} you are a cat companion.`,
 idleAnims: [
 "Idle1_1",
 "IdleEyeBrowRaise",
 "IdleFingerTap",
 "IdleHeadScratch",
 "IdleSideToSide",
 ],
 displaySize: { width: 144, height: 144 },
 },
};

export const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[];

export function isCompanionId(value: string): value is CompanionId {
 return value in COMPANIONS;
}

export function isBuiltInSystemPrompt(prompt: string): boolean {
 const trimmed = prompt.trim();
 if (!trimmed) return true;
 return COMPANION_IDS.some((id) => COMPANIONS[id].systemPrompt === trimmed);
}

export class ClippyCharacter {
 private canvas: HTMLCanvasElement;
 private ctx: CanvasRenderingContext2D;
 private img: HTMLImageElement;
 private data: AgentData | null = null;
 private frameW = 124;
 private frameH = 93;
 private currentAnim = "Greeting";
 private frameIndex = 0;
 private timer: number | null = null;
 private queue: string[] = [];
 private idleAnims = COMPANIONS.Clippy.idleAnims;
 private onIdle: (() => void) | null = null;

 constructor(canvas: HTMLCanvasElement) {
 this.canvas = canvas;
 const ctx = canvas.getContext("2d");
 if (!ctx) throw new Error("2d context unavailable");
 this.ctx = ctx;
 this.img = new Image();
 }

 async load(
 basePath = "/agents/Clippy",
 idleAnims?: string[],
 ): Promise<void> {
 this.clearTimer();
 this.queue = [];

 const res = await fetch(`${basePath}/agent.json`);
 this.data = (await res.json()) as AgentData;
 this.frameW = this.data.framesize[0];
 this.frameH = this.data.framesize[1];
 this.canvas.width = this.frameW;
 this.canvas.height = this.frameH;

 if (idleAnims?.length) {
 this.idleAnims = idleAnims.filter((name) => this.data?.animations[name]);
 } else {
 this.idleAnims = COMPANIONS.Clippy.idleAnims.filter(
 (name) => this.data?.animations[name],
 );
 }
 if (this.idleAnims.length === 0) {
 this.idleAnims = Object.keys(this.data.animations).filter((n) =>
 n.startsWith("Idle"),
 );
 if (this.idleAnims.length === 0) this.idleAnims = ["RestPose"];
 }

 await new Promise<void>((resolve, reject) => {
 this.img.onload = () => resolve();
 this.img.onerror = () =>
 reject(new Error(`Failed to load sprite map at ${basePath}/map.png`));
 // Bust cache when switching companions that share filenames
 this.img.src = `${basePath}/map.png?t=${Date.now()}`;
 });

 this.play("Greeting");
 }

 setIdleHandler(fn: (() => void) | null) {
 this.onIdle = fn;
 }

 resolveAnim(name: AnimName): string | null {
 if (!this.data) return null;
 if (this.data.animations[name]) return name;
 for (const alt of ANIM_FALLBACKS[name] ?? []) {
 if (this.data.animations[alt]) return alt;
 }
 return null;
 }

 play(name: AnimName, enqueue = false) {
 const resolved = this.resolveAnim(name);
 if (!resolved) {
 console.warn(`Unknown animation: ${name}`);
 return;
 }
 if (enqueue && this.timer !== null) {
 this.queue.push(resolved);
 return;
 }
 this.currentAnim = resolved;
 this.frameIndex = 0;
 this.step();
 }

 private pickBranch(frame: Frame): number | null {
 if (!frame.branching?.branches?.length) return null;
 const total = frame.branching.branches.reduce((s, b) => s + b.weight, 0);
 let r = Math.random() * total;
 for (const b of frame.branching.branches) {
 r -= b.weight;
 if (r <= 0) return b.frameIndex;
 }
 return frame.branching.branches[0].frameIndex;
 }

 private drawFrame(frame: Frame) {
 this.ctx.clearRect(0, 0, this.frameW, this.frameH);
 const images = frame.images ?? [];
 for (const pair of images) {
 const [x, y] = pair;
 this.ctx.drawImage(
 this.img,
 x,
 y,
 this.frameW,
 this.frameH,
 0,
 0,
 this.frameW,
 this.frameH,
 );
 }
 }

 private clearTimer() {
 if (this.timer !== null) {
 window.clearTimeout(this.timer);
 this.timer = null;
 }
 }

 private finishAnim() {
 if (this.queue.length > 0) {
 const next = this.queue.shift()!;
 this.play(next);
 return;
 }
 const idle =
 this.idleAnims[Math.floor(Math.random() * this.idleAnims.length)] ??
 "Idle1_1";
 this.play(idle);
 this.onIdle?.();
 }

 private step() {
 this.clearTimer();
 if (!this.data) return;
 const anim = this.data.animations[this.currentAnim];
 if (!anim) return;

 const frame = anim.frames[this.frameIndex];
 if (!frame) {
 this.finishAnim();
 return;
 }

 this.drawFrame(frame);

 const branch = this.pickBranch(frame);
 const duration = Math.max(frame.duration ?? 100, 30);

 this.timer = window.setTimeout(() => {
 if (branch !== null) {
 this.frameIndex = branch;
 this.step();
 return;
 }

 const next = this.frameIndex + 1;
 if (next >= anim.frames.length) {
 this.finishAnim();
 } else {
 this.frameIndex = next;
 this.step();
 }
 }, duration);
 }

 destroy() {
 this.clearTimer();
 }
}
