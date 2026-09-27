# Contributing to Clippy LLM

Thanks for wanting to help. This project stays intentionally small: a Mac-first desktop companion that chats with a local Ollama model.

Please read this before opening an issue or pull request.

## Scope

We welcome **basic expansions** and polish. Large product or architecture changes are out of scope.

### Welcome

- New companions (sprite packs + registry entries)
- Quality-of-life improvements (UX polish, tray/config tweaks, accessibility, small performance fixes)
- Bug fixes and documentation
- Dependency or security bumps that do not change behavior

### Out of scope

Please do not open PRs for these without prior maintainer agreement (use [Discussions](https://github.com/Loyft/clippy-llm/discussions) if enabled, or an issue labeled for discussion):

- New LLM backends (non-Ollama), cloud APIs, accounts, or sync
- Large cross-platform ports (Windows / Linux)
- Plugin systems, hot-loaded companions, or major architecture refactors
- Redesigns, monetization, telemetry, or non-local model hosting

Out-of-scope PRs may be closed with a pointer to this guide.

## Getting started

Prerequisites and run steps are in the [README](README.md).

```bash
npm install
ollama pull llama3.2
./clippy
# or: npm run clippy
```

## Adding a companion

Companions are registry-based (not a plugin system). You need assets plus a few code touch points.

### 1. Assets

Add a folder:

```
public/agents/<Name>/
  agent.json
  map.png
```

Use the same clippy.js-compatible agent format as the existing packs under `public/agents/`.

### 2. Frontend registry

In [`src/clippy.ts`](src/clippy.ts):

1. Add the id to the `CompanionId` union
2. Add a full entry to `COMPANIONS` (`name`, `path`, greetings, `systemPrompt`, `idleAnims`, `displaySize`, etc.)

### 3. Config allowlist

In [`src-tauri/src/config.rs`](src-tauri/src/config.rs), extend `normalize_companion` so the new name is accepted (and persisted correctly).

### 4. Docs

Update the companions table in [`README.md`](README.md).

### Asset rules

- Prefer original, CC0, or otherwise clearly licensed artwork you have rights to contribute
- Classic Office Assistant recreations (clippy.js style) must remain clearly unofficial; Microsoft trademarks belong to their owners
- Do not submit scraped copyrighted packs without clear rights and attribution

## Pull requests

1. Prefer a focused issue first for non-trivial work (`companion`, `qol`, or `bug`)
2. Keep PRs small and on-topic
3. Fill out the PR template (scope type, test steps, asset rights if applicable)
4. All merges require maintainer approval (`CODEOWNERS`)

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md). Do not file public issues for vulnerabilities.

## Maintainer: GitHub settings

After this scaffolding lands, complete these once in the GitHub UI (or CLI):

1. Confirm the repository is **public**
2. Create labels — see [`.github/LABELS.md`](.github/LABELS.md)
3. **Settings → Branches → Add branch protection rule** for `main` (and `dev` if you use it):
   - Require a pull request before merging
   - Require review from **Code Owners**
   - Optionally dismiss stale reviews
4. Enable **Discussions** (optional) so “big idea” / out-of-scope topics have a parking lot — issue templates already link there
5. Enable **Private vulnerability reporting** under **Settings → Code security** (matches [SECURITY.md](SECURITY.md))
