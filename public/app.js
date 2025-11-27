// public/app.js
// Frontend logic for ChanduLabs live talking AI.

const $ = (id) => document.getElementById(id);
const log = (msg) => {
  const el = $('log');
  el.textContent = msg;
};

// Elements
const textEl = $('text');
const langEl = $('lang');
const micBtn = $('micBtn');
const speakBtn = $('speakBtn');
const stopBtn = $('stopBtn');

let currentAudio = null;

// ---- PLAYBACK ----
function playAudio(blob) {
  if (currentAudio) currentAudio.pause();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  audio.play();
  log("Playing response...");
}

stopBtn.addEventListener('click', () => {
  if (currentAudio) currentAudio.pause();
  log("Audio stopped.");
});

// ---- SEND TEXT TO BACKEND ----
async function sendText() {
  const text = textEl.value.trim();
  const language = langEl.value;

  if (!text) return alert("Type something or use mic.");

  log("Sending text to server...");

  const res = await fetch('/api/voice', {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language, mode: "cloned" })
  });

  const blob = await res.blob();
  playAudio(blob);
}

speakBtn.addEventListener('click', sendText);

// ---- MIC RECORDING ----
let mediaRecorder;
let chunks = [];

async function initMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = e => chunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(chunks, { type: "audio/webm" });
    chunks = [];

    log("Uploading voice for reply...");

    const fd = new FormData();
    fd.append("audio", audioBlob);
    fd.append("language", langEl.value);
    fd.append("mode", "cloned");

    const res = await fetch("/api/voice", { method: "POST", body: fd });
    const blob = await res.blob();
    playAudio(blob);
  };

  log("Mic ready.");
}

micBtn.addEventListener('mousedown', async () => {
  if (!mediaRecorder) await initMic();
  chunks = [];
  mediaRecorder.start();
  log("Recording... release to stop.");
});

micBtn.addEventListener('mouseup', () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    log("Processing your voice...");
  }
});
