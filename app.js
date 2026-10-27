// ---------- Data ----------
const ALPHABET = [
  ["A", "a", "abeja", "🐝", "bee"], ["B", "be", "barco", "⛵", "boat"],
  ["C", "ce", "casa", "🏠", "house"], ["D", "de", "dedo", "☝️", "finger"],
  ["E", "e", "elefante", "🐘", "elephant"], ["F", "efe", "flor", "🌸", "flower"],
  ["G", "ge", "gato", "🐱", "cat"], ["H", "hache", "helado", "🍦", "ice cream"],
  ["I", "i", "isla", "🏝️", "island"], ["J", "jota", "jirafa", "🦒", "giraffe"],
  ["K", "ka", "koala", "🐨", "koala"], ["L", "ele", "luna", "🌙", "moon"],
  ["M", "eme", "manzana", "🍎", "apple"], ["N", "ene", "nube", "☁️", "cloud"],
  ["Ñ", "eñe", "piña", "🍍", "pineapple"], ["O", "o", "oso", "🐻", "bear"],
  ["P", "pe", "perro", "🐶", "dog"], ["Q", "cu", "queso", "🧀", "cheese"],
  ["R", "erre", "ratón", "🐭", "mouse"], ["S", "ese", "sol", "☀️", "sun"],
  ["T", "te", "tortuga", "🐢", "turtle"], ["U", "u", "uvas", "🍇", "grapes"],
  ["V", "uve", "vaca", "🐮", "cow"], ["W", "uve doble", "wafle", "🧇", "waffle"],
  ["X", "equis", "taxi", "🚕", "taxi"], ["Y", "ye", "yoyó", "🪀", "yo-yo"],
  ["Z", "zeta", "zapato", "👞", "shoe"],
].map(([upper, name, word, emoji, en]) => ({ upper, name, word, emoji, en }));

const VOWELS = ["a", "e", "i", "o", "u"];
const CONSONANTS = ["m", "p", "s", "l", "t", "n", "d"];

// Simple words split into syllables, for reading and writing practice
const WORDS = [
  { syl: ["ma", "má"], emoji: "👩", en: "mom" },
  { syl: ["pa", "pá"], emoji: "👨", en: "dad" },
  { syl: ["ga", "to"], emoji: "🐱", en: "cat" },
  { syl: ["lu", "na"], emoji: "🌙", en: "moon" },
  { syl: ["so", "pa"], emoji: "🍲", en: "soup" },
  { syl: ["ca", "sa"], emoji: "🏠", en: "house" },
  { syl: ["me", "sa"], emoji: "🪑", en: "table" },
  { syl: ["pe", "lo", "ta"], emoji: "⚽", en: "ball" },
  { syl: ["o", "so"], emoji: "🐻", en: "bear" },
  { syl: ["va", "ca"], emoji: "🐮", en: "cow" },
  { syl: ["pa", "to"], emoji: "🦆", en: "duck" },
  { syl: ["ma", "no"], emoji: "✋", en: "hand" },
  { syl: ["sol"], emoji: "☀️", en: "sun" },
  { syl: ["pez"], emoji: "🐟", en: "fish" },
  { syl: ["flor"], emoji: "🌸", en: "flower" },
  { syl: ["ra", "tón"], emoji: "🐭", en: "mouse" },
].map(w => ({ ...w, word: w.syl.join("") }));

// ---------- Helpers ----------
const $ = sel => document.querySelector(sel);
const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const stripAccents = s => s.normalize("NFD").replace(/[̀-́̈]/g, "").normalize("NFC");

let spanishVoice = null;
function loadVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = speechSynthesis.getVoices();
  spanishVoice = voices.find(v => v.lang === "es-MX") || voices.find(v => v.lang.startsWith("es")) || null;
}
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = spanishVoice ? spanishVoice.lang : "es-ES";
  if (spanishVoice) u.voice = spanishVoice;
  u.rate = 0.8;
  speechSynthesis.speak(u);
}

// Stars are a per-browser convenience; the page works without storage
let stars = 0;
try { stars = parseInt(localStorage.getItem("spanishStars"), 10) || 0; } catch (e) {}
function addStar(n = 1) {
  stars += n;
  try { localStorage.setItem("spanishStars", stars); } catch (e) {}
  const badge = $(".stars-badge");
  $("#stars").textContent = stars;
  badge.classList.remove("pop"); void badge.offsetWidth; badge.classList.add("pop");
}

function chip(text, extraClass = "", say = text) {
  const b = document.createElement("button");
  b.className = `chip ${extraClass}`;
  b.textContent = text;
  b.addEventListener("click", () => speak(say));
  return b;
}

// ---------- Alphabet ----------
function renderAlphabet() {
  const grid = $("#alphabet-grid");
  ALPHABET.forEach(l => {
    const col = document.createElement("div");
    col.className = "col-6 col-sm-4 col-md-3 col-lg-2";
    const idx = l.word.toUpperCase().indexOf(l.upper);
    const word = idx >= 0
      ? `${l.word.slice(0, idx)}<b>${l.word.slice(idx, idx + 1)}</b>${l.word.slice(idx + 1)}`
      : l.word;
    col.innerHTML = `
      <button class="letter-card" aria-label="${l.upper}, ${l.word}">
        <div class="big">${l.upper}${l.upper.toLowerCase()}</div>
        <div class="emoji">${l.emoji}</div>
        <div class="word">${word}</div>
        <div class="small text-muted">${l.en}</div>
      </button>`;
    col.querySelector("button").addEventListener("click", () => speak(`${l.name}. ${l.word}`));
    grid.appendChild(col);
  });
}

// ---------- Syllables ----------
function renderSyllables() {
  VOWELS.forEach(v => $("#vowels").appendChild(chip(v.toUpperCase() + v, "vowel", v)));
  let html = `<table class="table syl-table"><thead><tr><th></th>${VOWELS.map(v => `<th>${v}</th>`).join("")}</tr></thead><tbody>`;
  CONSONANTS.forEach(c => { html += `<tr><th>${c}</th>${VOWELS.map(() => "<td></td>").join("")}</tr>`; });
  $("#syllable-table").innerHTML = html + "</tbody></table>";
  $("#syllable-table").querySelectorAll("tbody tr").forEach((row, r) => {
    row.querySelectorAll("td").forEach((td, i) => td.appendChild(chip(CONSONANTS[r] + VOWELS[i])));
  });
}

// ---------- Reading ----------
let readQueue = [];
let readCurrent = null;
function nextRead() {
  if (!readQueue.length) readQueue = shuffle(WORDS);
  readCurrent = readQueue.pop();
  const box = $("#read-chunks");
  box.innerHTML = "";
  readCurrent.syl.forEach(s => {
    const c = chip(s);
    c.addEventListener("click", () => c.classList.add("active"));
    box.appendChild(c);
  });
  $("#read-picture").textContent = readCurrent.emoji;
  $("#read-picture").classList.add("hidden-picture");
  $("#read-meaning").innerHTML = "&nbsp;";
}
function revealRead() {
  const pic = $("#read-picture");
  if (pic.classList.contains("hidden-picture")) addStar();
  pic.classList.remove("hidden-picture");
  $("#read-meaning").textContent = `${readCurrent.word} = ${readCurrent.en}`;
  speak(readCurrent.word);
}

// ---------- Writing ----------
let writeCurrent = null;
let writeHints = 1;
function nextWrite() {
  writeCurrent = pick(WORDS.filter(w => w !== writeCurrent));
  writeHints = 1;
  $("#write-picture").textContent = writeCurrent.emoji;
  $("#write-input").value = "";
  $("#write-feedback").textContent = "";
  showHint();
}
function showHint() {
  const w = writeCurrent.word;
  $("#write-hint").textContent = w.split("").map((ch, i) => (i < writeHints ? ch : "_")).join(" ");
}
function checkWrite() {
  const typed = $("#write-input").value.trim().toLowerCase();
  const fb = $("#write-feedback");
  if (!typed) return;
  if (typed === writeCurrent.word) {
    fb.textContent = "¡Muy bien! 🎉";
    fb.className = "feedback mt-3 text-success";
    $("#write-hint").textContent = writeCurrent.word.split("").join(" ");
    speak("¡Muy bien! " + writeCurrent.word);
    addStar(2);
  } else if (stripAccents(typed) === stripAccents(writeCurrent.word)) {
    fb.textContent = "¡Casi! Don't forget the accent mark (´) 😊";
    fb.className = "feedback mt-3 text-warning";
  } else {
    writeHints = Math.min(writeHints + 1, writeCurrent.word.length);
    showHint();
    fb.textContent = "¡Inténtalo otra vez! Here's another letter 💡";
    fb.className = "feedback mt-3 text-danger";
  }
}
function renderAccentKeys() {
  ["á", "é", "í", "ó", "ú", "ñ"].forEach(ch => {
    const b = document.createElement("button");
    b.className = "btn btn-outline-secondary btn-sm fw-bold";
    b.textContent = ch;
    b.addEventListener("click", () => {
      const input = $("#write-input");
      const pos = input.selectionStart ?? input.value.length;
      input.value = input.value.slice(0, pos) + ch + input.value.slice(input.selectionEnd ?? pos);
      input.focus();
      input.setSelectionRange(pos + 1, pos + 1);
    });
    $("#accent-keys").appendChild(b);
  });
}

// ---------- Tracing ----------
let traceIndex = 0;
const canvas = $("#trace-canvas");
const ctx = canvas.getContext("2d");
function drawGuide() {
  const l = ALPHABET[traceIndex];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(77,171,247,.18)";
  ctx.font = "800 220px 'Baloo 2', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(l.upper + l.upper.toLowerCase(), canvas.width / 2, canvas.height / 2 + 15);
  $("#trace-label").textContent = `${l.upper} ${l.upper.toLowerCase()} — ${l.emoji} ${l.word}`;
}
function setupTracing() {
  let drawing = false;
  const point = e => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
  };
  canvas.addEventListener("pointerdown", e => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(...point(e));
  });
  canvas.addEventListener("pointermove", e => {
    if (!drawing) return;
    ctx.lineTo(...point(e));
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 12;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.stroke();
  });
  ["pointerup", "pointercancel"].forEach(t => canvas.addEventListener(t, () => (drawing = false)));
  const go = d => { traceIndex = (traceIndex + d + ALPHABET.length) % ALPHABET.length; drawGuide(); speak(ALPHABET[traceIndex].name); };
  $("#trace-prev").addEventListener("click", () => go(-1));
  $("#trace-next").addEventListener("click", () => go(1));
  $("#trace-clear").addEventListener("click", drawGuide);
  $("#trace-done").addEventListener("click", () => { addStar(); speak("¡Excelente!"); go(1); });
  // Redraw once the web font is ready so the guide letter uses it
  document.fonts?.ready.then(drawGuide);
  drawGuide();
}

// ---------- Quiz ----------
let quizCurrent = null;
let quizScore = 0;
let quizTotal = 0;
let quizAnswered = false;
function nextQuiz() {
  quizAnswered = false;
  quizCurrent = pick(WORDS.filter(w => w !== quizCurrent));
  const others = shuffle(WORDS.filter(w => w !== quizCurrent && w.emoji !== quizCurrent.emoji)).slice(0, 2);
  $("#quiz-word").textContent = quizCurrent.word;
  $("#quiz-feedback").textContent = "";
  const box = $("#quiz-options");
  box.innerHTML = "";
  shuffle([quizCurrent, ...others]).forEach(opt => {
    const b = document.createElement("button");
    b.className = "quiz-option";
    b.textContent = opt.emoji;
    b.setAttribute("aria-label", opt.en);
    b.addEventListener("click", () => answerQuiz(b, opt));
    box.appendChild(b);
  });
}
function answerQuiz(btn, opt) {
  if (quizAnswered) return;
  const fb = $("#quiz-feedback");
  if (opt === quizCurrent) {
    quizAnswered = true;
    quizTotal++; quizScore++;
    btn.classList.add("right");
    fb.textContent = `¡Correcto! ${quizCurrent.word} = ${quizCurrent.en} 🎉`;
    fb.className = "feedback mt-3 text-success";
    speak("¡Correcto!");
    addStar();
    setTimeout(nextQuiz, 1500);
  } else {
    if (!btn.classList.contains("wrong")) quizTotal++;
    btn.classList.add("wrong");
    fb.textContent = "Oops — try again! 🙂";
    fb.className = "feedback mt-3 text-danger";
  }
  $("#quiz-score").textContent = quizScore;
  $("#quiz-total").textContent = quizTotal;
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  $("#stars").textContent = stars;
  if (!("speechSynthesis" in window)) $("#no-voice").classList.remove("d-none");
  else { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }

  renderAlphabet();
  renderSyllables();

  nextRead();
  $("#read-word").addEventListener("click", () => speak(readCurrent.word));
  $("#read-reveal").addEventListener("click", revealRead);
  $("#read-next").addEventListener("click", nextRead);

  renderAccentKeys();
  nextWrite();
  $("#write-hear").addEventListener("click", () => speak(writeCurrent.word));
  $("#write-check").addEventListener("click", checkWrite);
  $("#write-next").addEventListener("click", nextWrite);
  $("#write-input").addEventListener("keydown", e => { if (e.key === "Enter") checkWrite(); });

  setupTracing();

  nextQuiz();
  $("#quiz-hear").addEventListener("click", () => speak(quizCurrent.word));

  // Collapse the mobile menu after picking a section
  document.querySelectorAll("#nav .nav-link").forEach(link =>
    link.addEventListener("click", () => bootstrap.Collapse.getInstance($("#nav"))?.hide()));
});
