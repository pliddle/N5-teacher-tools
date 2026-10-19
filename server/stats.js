// Cookie-free visit counts for the teacher tools, so the owner can see how many teachers use them and where they come from.
// Only totals are kept: per day, page and source, a count (and games started per day). No cookie is set; no IP address,
// browser or name is stored. The source is the link's own ?from=, or else the website the visitor came from, or "direct".
// Robots are not counted. Saved to STATS_FILE every 30 seconds. Report: /stats/?key=STATS_KEY (STATS_KEY unset = off).
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

module.exports = function stats(opts) {
  const FILE = opts.file, KEY = opts.key || "", KEEP_DAYS = 400, MAX_ROWS_PER_DAY = 1500;
  const PAGES = { "/": "home", "/starter/": "starter", "/stepper/": "stepper", "/sql/": "sql", "/live/": "live-teacher",
                  "/play/": "live-pupils", "/privacy/": "privacy" };
  let data = { days: {} }, dirty = false;
  try { data = JSON.parse(fs.readFileSync(FILE, "utf8")); if (!data.days) data = { days: {} }; } catch (e) { /* first run */ }

  const day = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());   // 2026-10-19
  const dayRec = d => data.days[d] || (data.days[d] = { hits: {}, games: 0 });
  const clean = s => String(s || "").toLowerCase().replace(/[^a-z0-9_.:-]/g, "").slice(0, 40);
  const isRobot = ua => !ua || /bot|crawl|spider|slurp|facebookexternalhit|preview|curl|wget|python|headless|lighthouse|uptime/i.test(ua);

  function source(req, url) {
    const from = clean(url.searchParams.get("from"));
    if (from) return from;
    let host = "";
    try { host = new URL(req.headers.referer || "").hostname.toLowerCase(); } catch (e) { /* none */ }
    const ours = String(req.headers.host || "").split(":")[0].toLowerCase();
    if (!host || host === ours) return "direct";
    return "ref:" + host.replace(/^(www|m|l|lm)\./, "").slice(0, 36);
  }

  /** Count a page view (pages only: the tools' own front doors, not assets or API calls). */
  function count(req, url) {
    const page = PAGES[url.pathname];
    if (!page || req.method !== "GET" || isRobot(req.headers["user-agent"])) return;
    const rec = dayRec(day()), k = page + "|" + source(req, url);
    if (!(k in rec.hits) && Object.keys(rec.hits).length >= MAX_ROWS_PER_DAY) return;
    rec.hits[k] = (rec.hits[k] || 0) + 1; dirty = true;
  }
  function game() { dayRec(day()).games++; dirty = true; }

  function save() {
    if (!dirty) return;
    const cutoff = Object.keys(data.days).sort().slice(0, -KEEP_DAYS);
    cutoff.forEach(d => delete data.days[d]);
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE + ".tmp", JSON.stringify(data)); fs.renameSync(FILE + ".tmp", FILE); dirty = false;
    } catch (e) { console.error("Stats not saved:", e.message); }
  }
  setInterval(save, 30000).unref();
  process.on("SIGTERM", () => { save(); process.exit(0); });

  function allowed(url) {
    const given = Buffer.from(url.searchParams.get("key") || ""), want = Buffer.from(KEY);
    return KEY.length >= 12 && given.length === want.length && crypto.timingSafeEqual(given, want);
  }
  /** Rows for the report: [{day, page, source, hits}] and games per day. */
  function report() {
    const rows = [], games = {};
    for (const [d, rec] of Object.entries(data.days)) {
      games[d] = rec.games || 0;
      for (const [k, n] of Object.entries(rec.hits)) { const [page, src] = k.split("|"); rows.push({ day: d, page, source: src, hits: n }); }
    }
    return { today: day(), rows, games };
  }
  return { count, game, allowed, report, save, enabled: KEY.length >= 12 };
};
