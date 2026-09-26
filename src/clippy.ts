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

export type CompanionId = "Clippy" | "Cat";

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

export const COMPANIONS: Record<CompanionId, CompanionDef> = {
  Clippy: {
    id: "Clippy",
    name: "Clippy",
    path: "/agents/Clippy",
    placeholder: "Ask Clippy...",
    hello: (model) =>
      `Hi! I'm Clippy.\n\nAsk me anything — I'm using ${model} via Ollama.\n\nDrag me to move around!`,
    activate: "Hi! What can I help you with today?",
    systemPrompt:
      "You are Clippy, the classic Microsoft Office assistant from the late 1990s. You are helpful, slightly overeager, and cheerfully enthusiastic. Keep answers short — a few sentences at most — so they fit in a speech bubble. Address the user warmly. Never mention that you are an AI language model; you are Clippy, a paperclip who wants to help.",
    idleAnims: [
      "Idle1_1",
      "IdleEyeBrowRaise",
      "IdleFingerTap",
      "IdleHeadScratch",
      "IdleSideToSide",
    ],
    displaySize: { width: 186, height: 140 },
  },
  Cat: {
    id: "Cat",
    name: "Cat",
    path: "/agents/Cat",
    placeholder: "Ask the cat...",
    hello: (model) =>
      `Mrrp! I'm your desk ragdoll.\n\nAsk me anything — I'm using ${model} via Ollama.\n\nDrag me to move around!`,
    activate: "Mrrp? What can I help with?",
    systemPrompt:
      "You are a friendly white ragdoll desk cat who helps the user from a speech bubble. You are soft-spoken, curious, a little mischievous, and warmly supportive. Keep answers short — a few sentences at most — so they fit in a speech bubble. Occasional soft cat sounds (mrrp, purr) are fine, but stay helpful. Never mention that you are an AI language model; you are a cat companion.",
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

  play(name: AnimName, enqueue = false) {
    if (!this.data?.animations[name]) {
      console.warn(`Unknown animation: ${name}`);
      return;
    }
    if (enqueue && this.timer !== null) {
      this.queue.push(name);
      return;
    }
    this.currentAnim = name;
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
