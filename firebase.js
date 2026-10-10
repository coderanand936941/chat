/* ============================================================
   ChatWave — Firebase + shared helpers
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ------------------------------------------------------------------
   1) YAHAN APNA FIREBASE CONFIG DAALO
      Firebase Console → Project Settings → General → Your apps
   ------------------------------------------------------------------ */
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCN_B0ltC7wztVPv65yMq8oeoyG2NCI16I",
  authDomain: "chat-7c5d9.firebaseapp.com",
  projectId: "chat-7c5d9",
  storageBucket: "chat-7c5d9.firebasestorage.app",
  messagingSenderId: "35374554907",
  appId: "1:35374554907:web:4e44ecee1f63313a0d7dbe",
  measurementId: "G-Z5NCTLP6BK"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ------------------------------------------------------------------
   ICE servers (WebRTC)
   ------------------------------------------------------------------ */
export const ICE_SERVERS = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302"] }
  ],
  iceCandidatePoolSize: 10
};

/* ------------------------------------------------------------------
   Toast notifications
   ------------------------------------------------------------------ */
export function toast(message, type = "info", duration = 3200) {
  let wrap = document.getElementById("toastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toastWrap";
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icons = { success: "✅", error: "⚠️", info: "💬" };
  el.innerHTML = `<span>${icons[type] || "💬"}</span><span>${escapeHtml(message)}</span>`;
  wrap.appendChild(el);

  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 320);
  }, duration);
}

/* ------------------------------------------------------------------
   Time helpers
   ------------------------------------------------------------------ */
export function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 45) return "abhi";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "kal";
  if (d < 7) return `${d}d`;
  const date = new Date(ts);
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------------------------------------------
   Avatar helpers
   ------------------------------------------------------------------ */
export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#e17076", "#7bc862", "#e5ca77", "#65aadd", "#a695e7",
  "#ee7aae", "#6ec9cb", "#faa774", "#8d9db6", "#c47ac0"
];

export function avatarColor(uid = "") {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/* ------------------------------------------------------------------
   Chat id (deterministic, sorted)
   ------------------------------------------------------------------ */
export function chatIdFor(a, b) {
  return [a, b].sort().join("_");
}

/* ------------------------------------------------------------------
   Escape html
   ------------------------------------------------------------------ */
export function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );
}

/* ------------------------------------------------------------------
   Ringtone (simple WebAudio beep loop) — incoming call ke liye
   ------------------------------------------------------------------ */
let ringCtx = null;
let ringTimer = null;

export function startRinging() {
  if (ringTimer) return;
  try {
    ringCtx = ringCtx || new (window.AudioContext || window.webkitAudioContext)();
    const beep = () => {
      if (!ringCtx || ringCtx.state === "suspended") return;
      const now = ringCtx.currentTime;
      [0, 0.42].forEach((offset, i) => {
        const osc = ringCtx.createOscillator();
        const gain = ringCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(i === 0 ? 880 : 660, now + offset);
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.16, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.34);
        osc.connect(gain).connect(ringCtx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.36);
      });
    };
    beep();
    ringTimer = setInterval(beep, 1700);
  } catch (e) { /* silent */ }
}

export function stopRinging() {
  clearInterval(ringTimer);
  ringTimer = null;
}

/* ------------------------------------------------------------------
   Incoming call listener + overlay
   Dashboard aur Chat page dono me use hota hai.
   ------------------------------------------------------------------ */
export function initCallListener(user) {
  if (!user || !user.uid) return () => {};

  // Overlay DOM inject
  let overlay = document.getElementById("incomingCall");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "incomingCall";
    overlay.className = "incoming-call";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="ic-card">
        <div class="ic-avatar" id="icAvatar">?</div>
        <div class="ic-name" id="icName">User</div>
        <div class="ic-type" id="icType">Incoming call…</div>
        <div class="ic-actions">
          <button class="ic-btn decline" id="icDecline" title="Decline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22"/><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
          <button class="ic-btn accept" id="icAccept" title="Accept">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  // Styles inject (ek baar)
  if (!document.getElementById("icStyles")) {
    const st = document.createElement("style");
    st.id = "icStyles";
    st.textContent = `
      .incoming-call{position:fixed;inset:0;z-index:9998;display:grid;place-items:center;
        background:rgba(4,10,13,.82);backdrop-filter:blur(12px);animation:fadeIn .25s}
      .ic-card{width:min(92vw,330px);padding:32px 24px 26px;border-radius:26px;text-align:center;
        background:var(--surface);border:1px solid var(--border-2);box-shadow:0 22px 60px rgba(0,0,0,.5);
        display:grid;gap:9px;justify-items:center;animation:pop .5s cubic-bezier(.2,1.3,.4,1)}
      .ic-avatar{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;
        font-size:32px;font-weight:800;color:#fff;background:linear-gradient(140deg,#00a884,#06cf9c);
        box-shadow:0 12px 34px rgba(0,168,132,.42);position:relative}
      .ic-avatar::after{content:"";position:absolute;inset:-6px;border-radius:50%;
        border:2px solid rgba(0,168,132,.5);animation:ripple 2s ease-out infinite}
      .ic-name{font-size:19px;font-weight:750;margin-top:6px;color:var(--text)}
      .ic-type{font-size:13px;color:var(--text-dim)}
      .ic-actions{display:flex;gap:34px;margin-top:16px}
      .ic-btn{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;
        color:#fff;transition:transform .16s cubic-bezier(.2,1.3,.4,1),box-shadow .2s}
      .ic-btn svg{width:25px;height:25px}
      .ic-btn:active{transform:scale(.9)}
      .ic-btn.decline{background:linear-gradient(140deg,#ef4444,#dc2626);box-shadow:0 10px 26px rgba(239,68,68,.45)}
      .ic-btn.accept{background:linear-gradient(140deg,#00a884,#06cf9c);box-shadow:0 10px 26px rgba(0,168,132,.45);animation:wiggle 1.3s infinite}
      @keyframes wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-11deg)}75%{transform:rotate(11deg)}}
      @keyframes ripple{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.7);opacity:0}}
      @keyframes fadeIn{from{opacity:0}}
      @keyframes pop{from{transform:scale(.86);opacity:0}}
    `;
    document.head.appendChild(st);
  }

  const nameEl = overlay.querySelector("#icName");
  const typeEl = overlay.querySelector("#icType");
  const avEl = overlay.querySelector("#icAvatar");
  const acceptBtn = overlay.querySelector("#icAccept");
  const declineBtn = overlay.querySelector("#icDecline");

  let currentCall = null;
  let unsub = null;
  let ringStartedAt = 0;

  const q = query(
    collection(db, "calls"),
    where("to", "==", user.uid),
    where("status", "==", "ringing")
  );

  unsub = onSnapshot(q, (snap) => {
    if (snap.empty) {
      if (currentCall) hideOverlay();
      return;
    }
    const d = snap.docs[snap.docs.length - 1];
    const data = d.data();
    if (currentCall && currentCall.id === d.id) return;

    currentCall = { id: d.id, ...data };
    nameEl.textContent = data.fromName || "User";
    typeEl.textContent = data.type === "video" ? "📹 Incoming video call…" : "📞 Incoming audio call…";
    avEl.textContent = initials(data.fromName || "U");
    avEl.style.background = `linear-gradient(140deg, ${avatarColor(data.from || "x")}, #06cf9c)`;

    overlay.hidden = false;
    ringStartedAt = Date.now();
    startRinging();

    acceptBtn.onclick = async () => {
      stopRinging();
      try {
        await updateDoc(doc(db, "calls", currentCall.id), { status: "accepted" });
      } catch (e) { /* ignore */ }
      overlay.hidden = true;
      location.href = `call.html?callId=${currentCall.id}&role=callee&type=${currentCall.type}`;
    };

    declineBtn.onclick = async () => {
      stopRinging();
      try {
        await updateDoc(doc(db, "calls", currentCall.id), { status: "declined", endedAt: serverTimestamp() });
      } catch (e) { /* ignore */ }
      hideOverlay();
    };
  }, (err) => {
    // Composite index ki zarurat pad sakti hai — console me link milega
    console.warn("Incoming call listener error:", err?.message);
  });

  function hideOverlay() {
    stopRinging();
    overlay.hidden = true;
    currentCall = null;
  }

  // Auto-timeout: 45 sec tak ring hone ke baad band
  const timeoutInt = setInterval(() => {
    if (currentCall && Date.now() - ringStartedAt > 45000) {
      updateDoc(doc(db, "calls", currentCall.id), { status: "ended", endedAt: serverTimestamp() }).catch(() => {});
      hideOverlay();
    }
  }, 3000);

  return () => {
    unsub && unsub();
    clearInterval(timeoutInt);
    stopRinging();
  };
}