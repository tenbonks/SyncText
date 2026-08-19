# SyncText

A dead-simple way to move a bit of text between your own devices — a login code from your phone, a URL, a paragraph, an SSH key — without email, messaging apps, or a cloud account. Open the page on two devices, link them with a short code, and whatever you type on one appears live on the other. The text travels **directly between the two browsers** over an encrypted peer-to-peer connection; it never lands on a server of ours.

---

## What it's for

You've got a two-factor code, a long URL, or a wall of text on your phone that you need on your PC (or the other way round). The usual options are clumsy — emailing yourself, pinging a messaging app, or fiddling with a cable. SyncText is a purely browser-based alternative:

- **No account, no install** — it's one static page
- **No upload** — the text hops browser-to-browser, not through a server
- **Live** — every keystroke syncs, so you can paste on one side and copy on the other instantly

Typical uses: passing OTP / 2FA codes, sharing a link between devices, moving a snippet of config or a command, or jotting something on your phone to grab on your desktop.

---

## Usage

1. Open `index.html` on **both** devices (see [Running it](#running-it))
2. On one device, click **Copy** next to *Your code* (a 6-character code)
3. On the other device, type that code into the **CODE** box and click **Join**
4. Once the status dot turns green, type or paste in either pad — it syncs live

Only one side should edit at a time (see [Sync model](#sync-model)).

---

## Running it

It's a static page — no build step, no server of your own. Open `index.html` directly in a browser, or serve the folder statically (recommended, since some browsers block the CDN script over `file://`):

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` on each device. For two *physical* devices to reach each other they each need internet access (for signaling), but they do **not** need to be on the same network.

---

## How it works

- **PeerJS over WebRTC** brokers a direct connection between the two browsers. Signaling (the initial "find each other" handshake) goes through PeerJS's free public server; after that, the data channel is peer-to-peer.
- **Codes**: each tab generates a random 6-character code and registers itself on the public broker as `synctext-<CODE>`. The visible code drops the `synctext-` prefix; **Join** adds it back. The prefix namespaces our sessions on the shared broker.
- **Sync model**: last-writer-wins, whole-document. Every keystroke sends the *entire* pad contents; the receiver replaces its whole pad. There's no diffing, no cursor preservation, and no merge — so **one side should edit at a time**. Simultaneous edits on both ends will clobber each other.
- **Catch-up**: when a connection opens, each side sends its current contents once, so a device that joins late gets what's already there.

---

## Security & privacy

Worth understanding before you paste anything sensitive:

- **The link itself is encrypted.** WebRTC data channels use DTLS, so the text is encrypted in transit between the two browsers. A network observer sees ciphertext, not your content.
- **The only "auth" is the code.** Anyone who has — or guesses — your 6-character code while your tab is open can connect and both **read and overwrite** your pad. The codes are short (≈2 billion combinations) and predictably formatted (`synctext-XXXXXX`), so treat them as a weak, throwaway secret, not a password. Keep sessions short, and close the tab when you're done to free the code.
- **Connecting reveals your IP.** WebRTC exposes each peer's IP address to the other side (and to the STUN server) to establish the direct link. Only connect with a device/person you trust.
- **You rely on two third parties:** PeerJS's public signaling broker (which sees connection metadata — peer ids — but not your DTLS-encrypted content) and the `unpkg` CDN that serves the PeerJS library. The CDN script is **pinned with Subresource Integrity** (a `sha384` `integrity` hash), so if the CDN ever served altered bytes the browser would refuse to run them. For an even more hardened setup, self-host the PeerJS library and run your own [PeerServer](https://github.com/peers/peerjs-server).
- **The page ships a strict Content-Security-Policy.** A `<meta http-equiv="Content-Security-Policy">` tag restricts the page to exactly what it needs — its own files, the pinned PeerJS CDN, Google Fonts, the PeerJS broker, and the `stun:`/`turn:` schemes WebRTC uses to connect — and blocks everything else (`default-src 'none'`). This limits the blast radius if any injection ever occurred. It's delivered via `<meta>` rather than an HTTP header because the app is designed to run on a static host (e.g. GitHub Pages) that can't set response headers. (The `stun:`/`turn:` schemes must be allowed because Firefox — unlike Chromium — enforces `connect-src` on WebRTC's ICE connections; without them the P2P link fails on Firefox.)
- **Synced text is never executed.** Incoming updates are written with `textarea.value`, not `innerHTML`, so a malicious peer can't inject running script into your page — the worst they can do is overwrite your text.
- **Nothing is stored.** There's no database, no logging, no history. Refresh the page and it's gone.

**Bottom line:** fine for OTP codes, links, and snippets between your own devices. For long-lived secrets or anything you'd never want a wrong-code stranger to glimpse, prefer a dedicated secrets tool.

---

## File Structure

```
index.html          — page markup and element layout
assets/sync.js      — all application logic (PeerJS wiring + sync)
assets/style.css    — all styling
assets/img/         — web-sights backlink logo
README.md           — this file
```

---

## Browser Compatibility

Needs WebRTC data channel support, which every current browser has (Chrome, Edge, Firefox, Safari). Requires an internet connection for the initial signaling handshake.

---

## License

MIT — do whatever you like with it.
