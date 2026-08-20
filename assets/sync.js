/* ============================================
   SyncText - Main Script
   Live, last-writer-wins text sync between two
   browsers over a PeerJS / WebRTC connection.
   ============================================ */

(function () {
  'use strict';

  // ── DOM References ───────────────────────────────────────
  const pad        = document.getElementById('pad');
  const myCodeEl   = document.getElementById('myCode');
  const joinInput  = document.getElementById('joinInput');
  const joinBtn    = document.getElementById('joinBtn');
  const copyBtn    = document.getElementById('copyCode');
  const dot        = document.getElementById('dot');
  const statusText = document.getElementById('statusText');
  const toastEl    = document.getElementById('toast');

  // ── State ────────────────────────────────────────────────
  const PREFIX = 'synctext-';   // namespaces our ids on the shared public broker
  let conn = null;              // single active peer connection (two-device design)
  let applyingRemote = false;   // echo guard: true while writing an incoming update

  // ── Helpers ──────────────────────────────────────────────
  function randomCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  function setConnected(on, label) {
    dot.classList.toggle('on', on);
    statusText.textContent = label;
  }

  // ── Peer Setup ───────────────────────────────────────────
  const myId = PREFIX + randomCode();
  const peer = new Peer(myId);

  peer.on('open', () => {
    myCodeEl.textContent = myId.replace(PREFIX, '');
  });

  peer.on('error', (err) => {
    if (err.type === 'peer-unavailable') {
      toast('No session found for that code');
      setConnected(false, 'Waiting');
    } else {
      setConnected(false, 'Error');
    }
  });

  // ── Wire a Connection ────────────────────────────────────
  function wire(c) {
    conn = c;

    c.on('open', () => {
      setConnected(true, 'Connected');
      // Push current content so a late joiner catches up (last write wins).
      c.send({ type: 'full', text: pad.value });
    });

    c.on('data', (msg) => {
      if (msg && msg.type === 'full') {
        applyingRemote = true;
        pad.value = msg.text;   // .value (not innerHTML); synced text is never executed
        applyingRemote = false;
      }
    });

    c.on('close', () => setConnected(false, 'Disconnected'));
  }

  // Incoming connection (someone joined our code)
  peer.on('connection', (c) => wire(c));

  // ── Join (outgoing connection) ───────────────────────────
  joinBtn.addEventListener('click', () => {
    const target = PREFIX + joinInput.value.trim().toUpperCase();
    if (target === PREFIX) return;
    setConnected(false, 'Connecting…');
    const c = peer.connect(target, { reliable: true });
    wire(c);
  });

  joinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinBtn.click();
  });

  // ── Send Edits ───────────────────────────────────────────
  pad.addEventListener('input', () => {
    if (applyingRemote || !conn || !conn.open) return;
    conn.send({ type: 'full', text: pad.value });
  });

  // ── Copy Code ────────────────────────────────────────────
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(myCodeEl.textContent)
      .then(() => toast('Code copied'))
      .catch(() => toast('Copy failed, select it manually'));
  });
})();
