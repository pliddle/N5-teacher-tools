/* Teacher tools: shared helpers. Text size (A- / A+, remembered per tool), full screen, and the header bar.
   A page calls Teach.bar("Tool name") once; it fills <header class="bar" id="bar"></header>. */
"use strict";
const Teach = (() => {
  const $ = id => document.getElementById(id);
  const key = "n5t-scale-" + location.pathname;
  let scale = Number(localStorage.getItem(key)) || 1;
  const setScale = s => { scale = Math.min(2.2, Math.max(0.7, Math.round(s * 10) / 10)); document.documentElement.style.setProperty("--scale", scale); localStorage.setItem(key, scale); };
  setScale(scale);
  const full = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});

  function bar(title, extra) {
    const b = $("bar");
    b.innerHTML = '<a class="home" href="/"><img src="/assets/logo.svg" alt=""><span>N5 Computing<small>Teacher tools</small></span></a>' +
      "<h1></h1><span class=\"grow\"></span><div class=\"tools\" id=\"bar-tools\"></div>" +
      '<div class="tools"><button type="button" id="t-smaller" title="Smaller text (-)" aria-label="Smaller text">A−</button>' +
      '<button type="button" id="t-bigger" title="Bigger text (+)" aria-label="Bigger text">A+</button>' +
      '<button type="button" id="t-full" title="Full screen (F)" aria-label="Full screen">⛶</button></div>';
    b.querySelector("h1").textContent = title;
    if (extra) $("bar-tools").append(...extra);
    $("t-smaller").onclick = () => setScale(scale - 0.1);
    $("t-bigger").onclick = () => setScale(scale + 0.1);
    $("t-full").onclick = full;
    document.addEventListener("keydown", e => {
      if (e.target.closest("input, textarea, select, [contenteditable]") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") setScale(scale + 0.1);
      else if (e.key === "-") setScale(scale - 0.1);
      else if (e.key === "f" || e.key === "F") full();
    });
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const el = (tag, attrs, text) => { const e = document.createElement(tag); Object.assign(e, attrs || {}); if (text !== undefined) e.textContent = text; return e; };
  return { $, bar, esc, shuffle, el };
})();
