# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SyncText — a static, zero-build web app for live text syncing between two devices over a peer-to-peer connection. No package manager, build step, test suite, or server of our own. Its sibling tool `../bulk-webp-converter` shares the same file layout, brand tokens, and fonts; keep them visually consistent.

## Running it

Open `index.html` in a browser, or serve the folder statically (needed if a browser blocks the CDN script over `file://`):

```bash
python -m http.server 8000
```

Then open two browser tabs/devices, copy the 6-character code from one, and Join it from the other.

## Architecture

Three files, split by concern, loaded directly by the browser:

- `index.html` — static markup. Every interactive element has a fixed `id`; `assets/sync.js` binds to those ids at load. Changing an id in one file requires changing it in the other.
- `assets/sync.js` — all behaviour, wrapped in one IIFE. No modules/imports.
- `assets/style.css` — all styling, driven by the brand tokens in the `:root` block (shared with `bulk-webp-converter`).

Connection/sync model in `sync.js`:

- **PeerJS over WebRTC** ([index.html](index.html) loads it from the `unpkg` CDN) brokers the P2P connection via PeerJS's default public signaling server; there is no backend of our own. This CDN script is the only external dependency.
- **Peer identity**: each tab generates a random 6-char code and registers a Peer id of `synctext-<CODE>` (the `PREFIX` constant). The visible "Your code" strips the prefix; Join re-adds it. This prefix namespaces our peers on the shared public broker — keep it consistent on both the register and connect sides.
- **Sync is last-writer-wins, full-document**: every `input` event sends the *entire* textarea contents as a `{ type: 'full', text }` message, and the receiver replaces its whole textarea. There is no CRDT, diffing, or cursor preservation. On connect open, each side pushes its full content once so a late joiner catches up (last one to fire wins).
- **Echo guard**: the `applyingRemote` flag wraps remote writes so applying an incoming update does not re-fire the `input` handler and bounce the message back.
- **Single connection**: `conn` holds one peer connection — the design is two-device, not multi-party. Sending to more than one peer is not implemented.

## Constraints to keep in mind when editing

- Because sync sends the full document on every keystroke, simultaneous editing on both sides will clobber; the model assumes one side edits at a time.
- Incoming text is applied via `textarea.value` (never `innerHTML`), so synced content can't inject script — preserve that when touching the receive path.
- The only access control is the short, guessable code; there is no authentication. See the Security & privacy section of `README.md` before changing the connection model.
