/* Live quiz: shared by the teacher's screen (/live/) and the pupils' screens (/play/).
   Pixel-art avatars, the five themes' animated backgrounds, answer tile colours and shapes, sounds made in code
   (Web Audio: no sound files), and a small server-sent-events helper. All original artwork, drawn here. */
"use strict";
const Live = (() => {
  /* ---------- Avatars: 8x8 pixel sprites. X = the player's colour, k = dark, w = white, y = amber ---------- */
  const SPRITES = [
    ["...yy...", "...kk...", ".XXXXXX.", ".XwXXwX.", ".XXXXXX.", ".XkkkkX.", "..XXXX..", ".kk..kk."],   // robot
    ["..XXXX..", ".XXXXXX.", "XwkXXwkX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "XXXXXXXX", "X.XX.XX."],   // ghost
    ["X......X", "XX....XX", "XXXXXXXX", "XwkXXwkX", "XXXyyXXX", "XXXXXXXX", ".XXXXXX.", ".X....X."],   // cat
    ["..X..X..", "...XX...", "..XXXX..", ".XkXXkX.", "XXXXXXXX", "X.XXXX.X", "X.X..X.X", ".XX..XX."],   // invader
    ["XXXXXXX.", "XXkkkXXX", "XXkkkXXX", "XXXXXXXX", "XwwwwwwX", "XwkkkkwX", "XwwwwwwX", "XXXXXXXX"],   // floppy disk
    ["k..XX..k", ".k.XX.k.", "..XXXX..", ".XXkkXX.", "kXXkkXXk", ".XXkkXX.", "kXXkkXXk", "..XXXX.."],   // beetle (a bug!)
    ["...XX...", "..XXXX..", "..XwwX..", "..XwwX..", "..XXXX..", ".XXXXXX.", "X.XXXX.X", "..y..y.."],   // rocket
    ["..kkkk..", ".kkkkkk.", ".kwkkwk.", ".kwyywk.", "kXXXXXXk", "kkwwwwkk", ".kwwwwk.", "..y..y.."],   // penguin with a scarf
    ["X......X", "XXXXXXXX", "XwwXXwwX", "XwkXXkwX", "XXXyyXXX", ".XwwwwX.", ".XwwwwX.", "..y..y.."],   // owl
    ["..XXXX..", ".XwXXwX.", "XXXXXXXX", "XwXXXXwX", "..wwww..", "..wkkw..", "..wwww..", ".wwwwww."],   // mushroom
    ["........", "..XXXX..", ".XXXXXX.", "XXwkXwkX", "XXXXXXXX", "XXXkkXXX", "XXXXXXXX", ".X.X.X.X"],   // slime
    ["y......y", "yy....yy", ".XXXXXX.", "XXkXXkXX", "XXXXXXXX", ".XwwwwX.", ".XwkkwX.", "..wwww.."],   // Highland cow
    ["........", "..ww....", ".wkw....", "yywwwwww", "..wwXXXX", "..wwwXX.", "...y.y..", "........"],   // seagull
    ["XXXXXXXX", "XkkkkkkX", "XkykkykX", "XkkkkkkX", "XkyyyykX", "XXXXXXXX", "...XX...", ".XXXXXX."],   // happy computer
    ["........", ".XX..XX.", "XXXXXXXX", "XwXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX..", "...XX..."],   // pixel heart
    ["k.k..k.k", "XXXXXXXX", "XXwwwwXX", "kXwyywXk", "kXwyywXk", "XXwwwwXX", "XXXXXXXX", "k.k..k.k"]    // microchip
  ];
  const COLOURS = ["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#2a9d8f", "#1982c4", "#4267ac", "#9b5de5", "#ff70a6", "#2ec4b6"];
  const INK = { k: "#1d2733", w: "#ffffff", y: "#ffb300" };
  function avatar(a, size) {
    const sp = SPRITES[(a && a.s) % SPRITES.length || 0], col = COLOURS[(a && a.c) % COLOURS.length || 0];
    let r = "";
    sp.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") r += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + (ch === "X" ? col : INK[ch]) + '"/>'; }));
    return '<svg class="av" viewBox="-1 -1 10 10" width="' + (size || 48) + '" height="' + (size || 48) + '" shape-rendering="crispEdges" aria-hidden="true">' + r + "</svg>";
  }

  /* ---------- Answer tiles ---------- */
  const TILES = [{ shape: "▲", name: "triangle" }, { shape: "◆", name: "diamond" }, { shape: "●", name: "circle" }, { shape: "■", name: "square" },
                 { shape: "★", name: "star" }, { shape: "⬣", name: "hexagon" }];
  const LETTERS = "ABCDEF";

  /* ---------- Themes and their backgrounds ---------- */
  const THEMES = {
    arcade: { name: "8-bit Arcade", about: "Neon, scanlines and a pixel horizon. Retro game energy." },
    binary: { name: "Binary Rain", about: "Falling 0s and 1s on black. Very hacker." },
    circuit: { name: "Circuit Board", about: "Glowing traces and pulsing chips." },
    space: { name: "Space Bytes", about: "Stars, planets and a passing satellite." },
    desktop: { name: "Retro Desktop", about: "Windows, title bars and a pixel cursor, 1995 style." }
  };
  let bgStop = null;
  function background(theme) {
    if (bgStop) bgStop();
    document.body.dataset.theme = theme;
    let cv = document.getElementById("live-bg");
    if (!cv) { cv = document.createElement("canvas"); cv.id = "live-bg"; cv.setAttribute("aria-hidden", "true"); document.body.prepend(cv); }
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches, ctx = cv.getContext("2d");
    let w, h, raf = 0, items = [];
    const size = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; setup(); };
    const R = (a, b) => a + Math.random() * (b - a);
    function setup() {
      items = [];
      if (theme === "binary") for (let x = 0; x < w; x += 22) items.push({ x, y: R(-h, 0), v: R(1.5, 4.5), bits: Array.from({ length: 24 }, () => (Math.random() < .5 ? "0" : "1")) });
      if (theme === "space") for (let i = 0; i < 180; i++) items.push({ x: R(0, w), y: R(0, h), r: R(.4, 1.8), t: R(0, 6), v: R(.05, .35) });
      if (theme === "circuit") for (let i = 0; i < 26; i++) items.push(trace());
      if (theme === "arcade") for (let i = 0; i < 40; i++) items.push({ x: R(0, w), y: R(0, h * .55), s: Math.random() < .5 ? 2 : 3, t: R(0, 6) });
      if (theme === "desktop") for (let i = 0; i < 6; i++) items.push({ x: R(0, w), y: R(0, h), vx: R(-.4, .4), vy: R(-.3, .3), c: COLOURS[i % COLOURS.length], n: ["0101", "C:\\>", "OK", "</>", "{ }", "#FF0"][i] });
    }
    function trace() {
      const pts = [[R(0, w), R(0, h)]];
      for (let k = 0; k < 4; k++) { const [x, y] = pts[pts.length - 1]; pts.push(Math.random() < .5 ? [x + R(-260, 260), y] : [x, y + R(-200, 200)]); }
      return { pts, p: R(0, 1), v: R(.002, .006), c: ["#00f5d4", "#9b5de5", "#fee440", "#00bbf9"][Math.floor(R(0, 4))] };
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      if (theme === "binary") {
        ctx.font = "bold 18px monospace";
        for (const c of items) {
          c.bits.forEach((b, i) => { const y = c.y - i * 20; if (y < -20 || y > h) return; ctx.fillStyle = i === 0 ? "rgba(200,255,200,.95)" : "rgba(0," + (200 - i * 6) + ",70," + Math.max(.05, .7 - i * .03) + ")"; ctx.fillText(b, c.x, y); });
          if (!still) { c.y += c.v; if (c.y - 24 * 20 > h) { c.y = R(-200, 0); c.bits = c.bits.map(() => (Math.random() < .5 ? "0" : "1")); } if (Math.random() < .02) c.bits[Math.floor(R(0, 24))] = Math.random() < .5 ? "0" : "1"; }
        }
      } else if (theme === "space") {
        for (const s of items) { ctx.globalAlpha = .45 + .55 * Math.abs(Math.sin(s.t + t / 900)); ctx.fillStyle = "#fff"; ctx.fillRect(s.x, s.y, s.r, s.r); if (!still) { s.x -= s.v; if (s.x < 0) s.x = w; } }
        ctx.globalAlpha = 1;
        const sx = (t / 40) % (w + 300) - 150, sy = h * .18 + Math.sin(t / 3000) * 30;   // a satellite
        ctx.fillStyle = "#9fb7d6"; ctx.fillRect(sx, sy, 18, 10); ctx.fillStyle = "#3a86ff"; ctx.fillRect(sx - 26, sy + 2, 22, 6); ctx.fillRect(sx + 22, sy + 2, 22, 6);
      } else if (theme === "circuit") {
        ctx.lineWidth = 2;
        for (const tr of items) {
          ctx.strokeStyle = "rgba(0,245,212,.13)"; ctx.beginPath(); tr.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          tr.pts.forEach(([x, y]) => { ctx.fillStyle = "rgba(0,245,212,.25)"; ctx.fillRect(x - 3, y - 3, 6, 6); });
          const segs = tr.pts.length - 1, f = tr.p * segs, k = Math.min(segs - 1, Math.floor(f)), u = f - k, [x1, y1] = tr.pts[k], [x2, y2] = tr.pts[k + 1];
          ctx.fillStyle = tr.c; ctx.shadowColor = tr.c; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 4, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
          if (!still) { tr.p += tr.v; if (tr.p >= 1) Object.assign(tr, trace(), { p: 0 }); }
        }
      } else if (theme === "arcade") {
        for (const s of items) { ctx.globalAlpha = .4 + .6 * Math.abs(Math.sin(s.t + t / 700)); ctx.fillStyle = "#fff"; ctx.fillRect(s.x, s.y, s.s, s.s); }
        ctx.globalAlpha = 1;
        const hz = h * .62; ctx.strokeStyle = "rgba(255,0,170,.55)"; ctx.lineWidth = 2;   // the pixel horizon grid
        for (let i = 0; i < 14; i++) { const y = hz + Math.pow((i + ((still ? 0 : t / 1200) % 1)) / 14, 2) * (h - hz); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * 30, hz); ctx.lineTo(w / 2 + i * w / 8, h); ctx.stroke(); }
        ctx.fillStyle = "#ffb300"; const sun = h * .16; ctx.beginPath(); ctx.arc(w / 2, hz, sun, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#1a0033"; for (let i = 1; i < 6; i++) ctx.fillRect(w / 2 - sun, hz - i * sun / 6, sun * 2, i * 1.6);
      } else if (theme === "desktop") {
        ctx.font = "bold 22px monospace";
        for (const d of items) { ctx.fillStyle = d.c; ctx.globalAlpha = .55; ctx.fillText(d.n, d.x, d.y); if (!still) { d.x += d.vx; d.y += d.vy; if (d.x < 0 || d.x > w - 60) d.vx *= -1; if (d.y < 20 || d.y > h) d.vy *= -1; } }
        ctx.globalAlpha = 1;
      }
      if (!still) raf = requestAnimationFrame(draw);
    }
    size(); addEventListener("resize", size); raf = requestAnimationFrame(draw);
    bgStop = () => { cancelAnimationFrame(raf); removeEventListener("resize", size); };
  }

  /* ---------- Sounds, made in code ---------- */
  let ac = null, master = null, muted = localStorage.getItem("n5t-live-mute") === "1", music = null;
  function audio() {
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : .5; master.connect(ac.destination); }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function note(f, start, dur, type, vol) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (start || 0);
    o.type = type || "square"; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .12, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noise(start, dur, vol) {
    const a = audio(); if (!a) return;
    const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), g = a.createGain(), t = a.currentTime + start; s.buffer = b; g.gain.setValueAtTime(vol || .08, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(g); g.connect(master); s.start(t);
  }
  const N = n => 440 * Math.pow(2, (n - 69) / 12);       // MIDI note number to frequency
  const SOUNDS = {
    join() { note(N(76), 0, .08); note(N(83), .07, .12); },
    start() { [60, 64, 67, 72, 76].forEach((n, i) => note(N(n), i * .07, .18, "square", .1)); },
    tick() { note(N(96), 0, .04, "square", .05); },
    last() { note(N(84), 0, .08, "square", .09); },
    answer() { note(N(88), 0, .05, "triangle", .08); },
    reveal() { [72, 76, 79].forEach(n => note(N(n), 0, .6, "triangle", .1)); note(N(84), .12, .7, "square", .06); },
    board() { for (let i = 0; i < 14; i++) noise(i * .045, .04, .05); [67, 72].forEach((n, i) => note(N(n), .68 + i * .1, .35, "square", .1)); },
    fanfare() { [[60, 0], [64, .14], [67, .28], [72, .42], [67, .62], [72, .76]].forEach(([n, t]) => note(N(n), t, .3, "square", .11)); [48, 55, 60].forEach(n => note(N(n), .76, 1.2, "triangle", .1)); }
  };
  function play(name) { if (!muted && SOUNDS[name]) try { SOUNDS[name](); } catch (e) { /* no sound */ } }
  // A gentle chiptune loop for the lobby: bass and a little arpeggio, 8 bars.
  function startMusic() {
    if (music || muted) return; const a = audio(); if (!a) return;
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], beat = .2; let step = 0, next = a.currentTime + .1;
    music = setInterval(() => {
      while (next < a.currentTime + .4) {
        const c = chords[Math.floor(step / 16) % 4], s = step % 16, t = next - a.currentTime;
        if (s % 4 === 0) note(N(c[0] - 12), t, beat * 1.6, "triangle", .1);
        note(N(c[s % 3] + 12), t, beat * .8, "square", .025);
        step++; next += beat;
      }
    }, 100);
  }
  function stopMusic() { clearInterval(music); music = null; }
  function setMuted(m) { muted = m; localStorage.setItem("n5t-live-mute", m ? "1" : "0"); if (master) master.gain.value = m ? 0 : .5; if (m) stopMusic(); }

  /* ---------- Server-sent events with a fallback message when the connection drops ---------- */
  function listen(url, onState, onLost) {
    const es = new EventSource(url);
    es.onmessage = e => onState(JSON.parse(e.data));
    es.onerror = () => { if (onLost) onLost(es.readyState); };
    return es;
  }
  async function post(url, obj) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong (" + r.status + ").");
    return j;
  }
  function confetti(box) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let layer = document.getElementById("live-confetti");
    if (!layer) { layer = document.createElement("div"); layer.id = "live-confetti"; layer.setAttribute("aria-hidden", "true"); document.body.appendChild(layer); }
    const r = box ? box.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
    for (let i = 0; i < 90; i++) {
      const p = document.createElement("i"); p.style.background = COLOURS[i % COLOURS.length]; p.style.left = r.left + r.width / 2 + "px"; p.style.top = r.top + r.height / 2 + "px"; layer.appendChild(p);
      const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 300, dx = Math.cos(a) * sp, dy = Math.sin(a) * sp - 200;
      p.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: .5 },
        { transform: `translate(${dx * 1.3}px,${dy + 520}px) rotate(${Math.random() * 1080}deg)`, opacity: 0 }], { duration: 1800 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }).onfinish = () => p.remove();
    }
  }
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
  return { avatar, TILES, LETTERS, THEMES, background, play, startMusic, stopMusic, setMuted, isMuted: () => muted, audio, listen, post, confetti, ordinal };
})();
