# Clippy LLM

A Mac-first desktop companion that looks and acts like classic Clippy, powered by a local LLM via [Ollama](https://ollama.com).

## Stack

- **Tauri 2** — lightweight native shell, transparent always-on-top window, menu-bar tray
- **TypeScript + Vite** — speech bubble UI + Clippy sprite animations
- **Ollama** — local chat API (`http://127.0.0.1:11434`)

## Prerequisites

- macOS
- [Node.js](https://nodejs.org) 20+
- [Rust](https://rustup.rs) (stable)
- [Ollama](https://ollama.com) installed and running
- Xcode Command Line Tools (`xcode-select --install`)

## Setup

```bash
# Install JS deps
npm install

# Pull a model (once)
ollama pull llama3.2
```

## Run

```bash
# Dev (recommended while iterating)
./clippy
# or
npm run clippy

# With CLI flags (./clippy handles the Tauri/cargo `--` separators)
./clippy --model llama3.2 --ollama http://127.0.0.1:11434

# Raw tauri form needs two `--` groups: runner args, then app args
npm run tauri -- dev -- -- --model llama3.2

# Built binary (flags go straight to Clippy)
./src-tauri/target/debug/clippy --model llama3.2
npm run clippy:build
open src-tauri/target/release/bundle/macos/Clippy.app
```

| Flag | Default | Description |
|------|---------|-------------|
| `--model` | `llama3.2` | Ollama model name |
| `--ollama` | `http://127.0.0.1:11434` | Ollama base URL |

### Config file

On first launch, Clippy writes `~/.config/clippy-llm/config.toml`:

```toml
model = "llama3.2"
ollama_url = "http://127.0.0.1:11434"
proactive = true
# system_prompt = "..."
```

CLI flags override the config file.

## Usage

- Click Clippy to open the speech bubble and chat
- Drag Clippy by the character to reposition the window
- Menu-bar tray: Hide/Show, Mute proactive tips, Quit
- Closing the window hides Clippy; quit from the tray

## Project layout

```
src/                 # frontend (sprite stage, bubble, Ollama client)
src-tauri/           # Rust shell (window, tray, CLI, config)
public/agents/Clippy # classic Clippy sprite sheet + animation map
scripts/clippy.js    # npm bin helper
```

## License note

Clippy sprite assets originate from the classic Office Assistant recreation used by [clippy.js](https://github.com/smore-inc/clippy.js). Microsoft trademarks belong to their respective owners; this project is an unofficial fan companion for personal use.
