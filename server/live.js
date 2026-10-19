// Live quiz games for the teacher tools. A teacher picks questions and starts a game; pupils join on their own
// devices with a 6-digit code and get a random computing-themed name (they never type a name, so no personal data
// is collected and nothing unkind can appear on the board). Everything is held in memory and forgotten when the
// game ends or goes quiet.
//
// Updates are pushed with server-sent events (one GET stream per screen); actions are small JSON POSTs.
//   POST /api/games                       {ids, theme, time, names, discuss} -> {code, key}
//   GET  /api/games/CODE                                                -> {phase, theme, names} (does it exist?)
//   GET  /api/games/CODE/results?key=K    every player's answers, for the teacher's spreadsheet
//   GET  /api/games/CODE/host?key=K       event stream for the teacher's screen
//   POST /api/games/CODE/host             {key, action: start|next|reveal|revote|board|end|kick, pid}
//   POST /api/games/CODE/join             {pid?, secret?, real?}        -> {pid, secret, name, avatar}
//   POST /api/games/CODE/rename           {pid, secret}                 -> {name, avatar}   (in the lobby, 3 times)
//   GET  /api/games/CODE/play?pid&secret  event stream for a pupil's screen
//   POST /api/games/CODE/answer           {pid, secret, qi, answer}
// The right answers stay on the server until a question closes. With "discuss" on (peer instruction), each
// question is voted on twice: everyone answers, the spread of answers is shown without saying which is right,
// the class argues it out, then everyone votes again. Only the second vote scores.
// With "names" on, pupils also type their real name. It goes only into the teacher's results download: the board
// and every screen still show the random names.
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const LIMITS = { games: 300, players: 80, questions: 60, idleMs: 45 * 60e3, lifeMs: 4 * 3600e3, body: 20e3, joinsPerMinute: 60 };
const LIVE_TYPES = new Set(["mc", "multi", "tf", "num", "short"]);
const THEMES = ["arcade", "binary", "circuit", "space", "desktop"];
const TIMES = [0, 10, 20, 30, 45, 60, 90];   // seconds; 0 = no limit (the teacher closes each question)

const ADJ = ["Pixel", "Binary", "Turbo", "Quantum", "Cosmic", "Glitchy", "Speedy", "Sparky", "Mega", "Retro", "Neon", "Atomic",
  "Hyper", "Logical", "Laser", "Rocket", "Clever", "Jolly", "Fuzzy", "Mighty", "Lucky", "Bouncy", "Encrypted", "Compiled",
  "Debugged", "Overclocked", "Wireless", "Recursive", "Sorted", "Validated", "Boolean", "Hexadecimal", "Turbocharged",
  "Gigabit", "Upgraded", "Wifi", "Holographic", "Supersonic", "Electric", "Digital"];
const NOUN = ["Puffin", "Haggis", "Otter", "Gannet", "Selkie", "Kelpie", "Badger", "Hedgehog", "Capybara", "Penguin", "Narwhal",
  "Kestrel", "Squirrel", "Highland Cow", "Seagull", "Red Deer", "Osprey", "Pine Marten", "Wildcat", "Dolphin", "Byte",
  "Router", "Cursor", "Kernel", "Compiler", "Packet", "Cache", "Server", "Floppy Disk", "Motherboard", "Algorithm",
  "Variable", "Array", "Robot", "Processor", "Keyboard", "Joystick", "Modem", "Pixel Pal", "Microchip"];
const AVATARS = 16, COLOURS = 10;

module.exports = function live(SITE, hooks = {}) {
  const DATA = path.join(SITE, "data/questions.json");
  let bank = null, bankTime = 0;
  function loadBank() {
    const t = fs.statSync(DATA).mtimeMs;
    if (!bank || t !== bankTime) {
      const units = JSON.parse(fs.readFileSync(DATA, "utf8")).units;
      bank = new Map();
      for (const u of units) for (const tp of u.topics) for (const q of tp.questions) if (LIVE_TYPES.has(q.type)) bank.set(q.id, { ...q, topic: tp.title, unit: u.code });
      bankTime = t;
    }
    return bank;
  }

  const games = new Map(), joins = new Map();
  const token = n => crypto.randomBytes(n).toString("base64url");
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function newCode() {
    for (let i = 0; i < 50; i++) { const c = String(crypto.randomInt(100000, 1000000)); if (!games.has(c)) return c; }
    return null;
  }
  function freshName(g) {
    const used = new Set([...g.players.values()].map(p => p.name));
    for (let i = 0; i < 200; i++) { const n = ADJ[crypto.randomInt(ADJ.length)] + " " + NOUN[crypto.randomInt(NOUN.length)]; if (!used.has(n)) return n; }
    return "Player " + (g.players.size + 1);
  }
  const avatar = () => ({ s: crypto.randomInt(AVATARS), c: crypto.randomInt(COLOURS) });

  /* ---------- What each screen is sent ---------- */
  function publicQuestion(g) {
    const q = g.questions[g.qi];
    return { qi: g.qi, n: g.questions.length, type: q.type, html: q.q, topic: q.topic, opts: q.shown ? q.shown.map(o => o.h) : null,
             time: g.time, deadline: g.deadline, round: g.round, discuss: g.discuss };
  }
  // How many chose each option in a round, without saying which is right (used for the discussion screen).
  function spread(g, round) {
    const q = g.questions[g.qi], counts = q.shown ? q.shown.map(() => 0) : [];
    let answered = 0;
    for (const p of g.players.values()) {
      const a = round === 1 && g.discuss ? p.first[g.qi] : p.answers[g.qi];
      if (!a) continue;
      answered++;
      if (q.shown) [].concat(a.answer).forEach(i => { if (counts[i] !== undefined) counts[i]++; });
    }
    return { counts, answered, players: g.players.size };
  }
  function results(g) {
    const q = g.questions[g.qi], counts = q.shown ? q.shown.map(() => 0) : [];
    let right = 0, answered = 0;
    for (const p of g.players.values()) {
      const a = p.answers[g.qi]; if (!a) continue;
      answered++; if (a.correct) right++;
      if (q.shown) [].concat(a.answer).forEach(i => { if (counts[i] !== undefined) counts[i]++; });
    }
    const out = { right: q.shown ? q.shown.map(o => o.ok) : null, answer: q.type === "num" ? fmtNum(q.num.v) : q.type === "short" ? q.short.join(" or ") : null,
                  counts, correct: right, answered, players: g.players.size, fb: q.fb, why: q.shown ? q.shown.map(o => o.fb) : null };
    if (g.discuss) {                                     // how the class moved after talking it over
      out.first = spread(g, 1).counts;
      out.firstCorrect = [...g.players.values()].filter(p => p.first[g.qi] && p.first[g.qi].correct).length;
      out.firstAnswered = spread(g, 1).answered;
    }
    return out;
  }
  const fmtNum = n => String(Math.round(n * 1e6) / 1e6);
  function ranking(g) {
    return [...g.players.values()].sort((a, b) => b.score - a.score || a.joined - b.joined)
      .map((p, i) => ({ pid: p.pid, name: p.name, avatar: p.avatar, score: p.score, streak: p.streak, best: p.best, rank: i + 1, prev: p.prevRank,
                        correct: Object.values(p.answers).filter(a => a.correct).length, online: p.streams.size > 0 }));
  }
  function hostState(g) {
    const s = { phase: g.phase, code: g.code, theme: g.theme, time: g.time, n: g.questions.length, qi: g.qi, now: Date.now(),
                players: ranking(g) };
    if (g.phase === "question" || g.phase === "reveal") s.question = publicQuestion(g);
    if (g.phase === "question") s.answered = spread(g, g.round).answered;
    if (g.phase === "discuss") { s.question = publicQuestion(g); s.spread = spread(g, 1); }
    if (g.phase === "reveal") s.results = results(g);
    return s;
  }
  function playerState(g, p) {
    const s = { phase: g.phase, theme: g.theme, me: { name: p.name, avatar: p.avatar, score: p.score, streak: p.streak, renames: p.renames },
                n: g.questions.length, qi: g.qi, now: Date.now(), players: g.players.size };
    const rank = ranking(g).find(r => r.pid === p.pid); s.me.rank = rank ? rank.rank : null;
    if (g.phase === "question") {
      s.question = publicQuestion(g);
      const mine = g.round === 1 && g.discuss ? p.first[g.qi] : p.answers[g.qi];
      s.answered = Boolean(mine);
      if (g.round === 2) s.before = p.first[g.qi] ? p.first[g.qi].answer : null;      // what they chose first
    }
    if (g.phase === "discuss") { s.question = publicQuestion(g); s.mine = p.first[g.qi] ? p.first[g.qi].answer : null; }
    if (g.phase === "reveal" || g.phase === "board") {
      const a = p.answers[g.qi], q = g.questions[g.qi];
      s.result = { answered: Boolean(a), correct: Boolean(a && a.correct), points: a ? a.points : 0, streak: p.streak,
                   answer: q.shown ? q.shown.filter(o => o.ok).map(o => o.h) : [q.type === "num" ? fmtNum(q.num.v) : q.short[0]] };
    }
    if (g.phase === "end") { s.me.best = p.best; s.me.correct = Object.values(p.answers).filter(a => a.correct).length; s.podium = ranking(g).slice(0, 3).map(r => ({ name: r.name, avatar: r.avatar, score: r.score })); }
    return s;
  }
  function send(res, obj) { try { res.write("data: " + JSON.stringify(obj) + "\n\n"); } catch (e) { /* closed */ } }
  function broadcast(g) {
    g.active = Date.now();
    const h = hostState(g); for (const res of g.hosts) send(res, h);
    for (const p of g.players.values()) if (p.streams.size) { const s = playerState(g, p); for (const res of p.streams) send(res, s); }
  }
  // Answer counts change often during a question: tell the hosts only, at most a few times a second.
  function hostsSoon(g) { if (g.hostTimer) return; g.hostTimer = setTimeout(() => { g.hostTimer = null; const h = hostState(g); for (const res of g.hosts) send(res, h); }, 250); }

  /* ---------- The game itself ---------- */
  function startQuestion(g, qi, round) {
    clearTimeout(g.timer);
    g.qi = qi; g.phase = "question"; g.round = round || 1;
    const q = g.questions[qi];
    g.opened = Date.now();
    g.deadline = g.time ? g.opened + g.time * 1000 + 600 : null;     // a little grace for slow networks
    for (const p of g.players.values()) p.prevRank = null;
    ranking(g).forEach(r => { g.players.get(r.pid).prevRank = r.rank; });
    if (g.time) g.timer = setTimeout(() => closeRound(g), g.time * 1000 + 700);
    broadcast(g);
  }
  // The end of a round: with discussion on, the first one opens the discussion instead of giving the answer.
  function closeRound(g) {
    if (g.phase !== "question") return;
    clearTimeout(g.timer);
    if (g.discuss && g.round === 1) { g.phase = "discuss"; broadcast(g); return; }
    reveal(g);
  }
  function reveal(g) {
    if (g.phase !== "question" && g.phase !== "discuss") return;
    clearTimeout(g.timer);
    g.phase = "reveal";
    for (const p of g.players.values()) if (!p.answers[g.qi]) p.streak = 0;
    broadcast(g);
  }
  function mark(q, answer) {
    if (q.type === "mc" || q.type === "tf") return Number.isInteger(answer) && q.shown[answer] && q.shown[answer].ok === true;
    if (q.type === "multi") {
      if (!Array.isArray(answer)) return false;
      const pick = new Set(answer.filter(i => Number.isInteger(i) && q.shown[i]));
      return q.shown.every((o, i) => o.ok === pick.has(i));
    }
    if (q.type === "num") {
      const v = Number(String(answer).trim().replace(/,/g, "").replace(/^£/, ""));
      return String(answer).trim() !== "" && !Number.isNaN(v) && Math.abs(v - q.num.v) <= q.num.tol + 1e-9;
    }
    if (q.type === "short") { const a = String(answer).trim().toLowerCase().replace(/\s+/g, " "); return q.short.some(s => s.trim().toLowerCase().replace(/\s+/g, " ") === a); }
    return false;
  }
  function answer(g, p, qi, ans) {
    const firstRound = g.discuss && g.round === 1;
    if (g.phase !== "question" || qi !== g.qi || (firstRound ? p.first[qi] : p.answers[qi])) return false;
    const q = g.questions[qi], ms = Date.now() - g.opened;
    if (g.deadline && Date.now() > g.deadline) return false;
    const correct = mark(q, ans);
    if (firstRound) {                                   // the first vote is recorded but does not score
      p.first[qi] = { answer: ans, correct, points: 0, ms };
      const s = playerState(g, p); for (const res of p.streams) send(res, s);
      if ([...g.players.values()].every(x => x.first[qi])) closeRound(g); else hostsSoon(g);
      return true;
    }
    let points = 0;
    if (correct) {
      p.streak++; p.best = Math.max(p.best, p.streak);
      const limit = (g.time || 30) * 1000, speed = Math.max(0, 1 - ms / limit);
      points = 500 + Math.round(500 * speed) + Math.min(500, 100 * (p.streak - 1));
    } else p.streak = 0;
    p.score += points;
    p.answers[qi] = { answer: ans, correct, points, ms };
    const s = playerState(g, p); for (const res of p.streams) send(res, s);
    if ([...g.players.values()].every(x => x.answers[qi])) closeRound(g); else hostsSoon(g);
    return true;
  }

  // Everything the teacher's spreadsheet needs. Answers are given as the text the pupil chose or typed.
  function resultsFor(g) {
    const text = (q, a) => a === undefined ? "" : q.shown ? [].concat(a).map(i => (q.shown[i] ? q.shown[i].h : "?")).join(" + ") : String(a);
    return {
      names: g.names, played: g.qi + 1, started: g.created,
      questions: g.questions.map(q => ({ id: q.id, topic: q.topic, html: q.q,
        answer: q.shown ? q.shown.filter(o => o.ok).map(o => o.h).join(" + ") : q.type === "num" ? fmtNum(q.num.v) : q.short.join(" or ") })),
      discuss: g.discuss,
      players: ranking(g).map(r => { const p = g.players.get(r.pid);
        return { real: p.real, name: p.name, rank: r.rank, score: p.score, correct: r.correct, best: p.best,
                 firstCorrect: g.discuss ? g.questions.filter((q, i) => p.first[i] && p.first[i].correct).length : null,
                 answers: g.questions.map((q, i) => { const a = p.answers[i]; return a ? { text: text(q, a.answer), correct: a.correct, points: a.points, ms: a.ms } : null; }) }; })
    };
  }

  /* ---------- HTTP ---------- */
  function json(res, code, obj) { res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); }
  function body(req) {
    return new Promise((ok, bad) => {
      let s = ""; req.on("data", c => { s += c; if (s.length > LIMITS.body) { bad(new Error("too big")); req.destroy(); } });
      req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { bad(e); } });
    });
  }
  function stream(req, res, set) {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.write("retry: 2000\n\n");
    set.add(res);
    req.on("close", () => set.delete(res));
  }
  const ip = req => String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  function tooMany(req) {
    const k = ip(req), now = Date.now(), list = (joins.get(k) || []).filter(t => now - t < 60e3);
    list.push(now); joins.set(k, list);
    return list.length > LIMITS.joinsPerMinute;
  }

  async function handle(req, res, url) {
    try {
      const parts = url.pathname.split("/").filter(Boolean);         // api, games, CODE, action
      if (parts[1] !== "games") return json(res, 404, { error: "not found" });
      if (parts.length === 2 && req.method === "POST") {
        const b = await body(req);
        const qs = loadBank(), ids = Array.isArray(b.ids) ? b.ids.filter(id => qs.has(id)).slice(0, LIMITS.questions) : [];
        if (!ids.length) return json(res, 400, { error: "Choose at least one question." });
        if (games.size >= LIMITS.games) return json(res, 503, { error: "Too many games are running. Try again in a few minutes." });
        const code = newCode();
        const g = { code, key: token(18), theme: THEMES.includes(b.theme) ? b.theme : "arcade", time: TIMES.includes(Number(b.time)) ? Number(b.time) : 20, names: b.names === true, discuss: b.discuss === true,
                    questions: ids.map(id => { const q = qs.get(id); return { ...q, shown: q.opts ? (q.type === "tf" ? q.opts : shuffle(q.opts)) : null }; }),
                    phase: "lobby", qi: -1, players: new Map(), hosts: new Set(), created: Date.now(), active: Date.now(), timer: null, hostTimer: null };
        games.set(code, g);
        if (hooks.onGame) hooks.onGame();      // a count for the day, nothing about the game
        return json(res, 200, { code, key: g.key });
      }
      const g = games.get(parts[2]);
      if (!g) return json(res, 404, { error: "There is no game with that code. Check it with your teacher." });
      const action = parts[3] || "";
      if (!action && req.method === "GET") return json(res, 200, { phase: g.phase, theme: g.theme, names: g.names });
      if (action === "results" && req.method === "GET") {
        if (url.searchParams.get("key") !== g.key) return json(res, 403, { error: "key" });
        return json(res, 200, resultsFor(g));
      }
      if (action === "host" && req.method === "GET") {
        if (url.searchParams.get("key") !== g.key) return json(res, 403, { error: "This game was started on another screen." });
        stream(req, res, g.hosts); send(res, hostState(g)); return;
      }
      if (action === "play" && req.method === "GET") {
        const p = g.players.get(url.searchParams.get("pid"));
        if (!p || p.secret !== url.searchParams.get("secret")) return json(res, 403, { error: "Join the game again." });
        stream(req, res, p.streams); send(res, playerState(g, p)); hostsSoon(g);
        req.on("close", () => hostsSoon(g));
        return;
      }
      if (req.method !== "POST") return json(res, 405, { error: "method" });
      const b = await body(req);
      if (action === "host") {
        if (b.key !== g.key) return json(res, 403, { error: "key" });
        switch (b.action) {
          case "start": if (g.phase === "lobby") startQuestion(g, 0); break;
          case "reveal": if (g.phase === "question" && g.discuss && g.round === 1) closeRound(g); else reveal(g); break;
          case "revote": if (g.phase === "discuss") startQuestion(g, g.qi, 2); break;
          case "board": if (g.phase === "reveal") { g.phase = "board"; broadcast(g); } break;
          case "next":
            if (g.phase === "reveal" || g.phase === "board") { if (g.qi + 1 < g.questions.length) startQuestion(g, g.qi + 1); else { g.phase = "end"; broadcast(g); } }
            break;
          case "end": clearTimeout(g.timer); g.phase = "end"; broadcast(g); break;
          case "kick": { const p = g.players.get(b.pid); if (p) { for (const r of p.streams) { send(r, { phase: "kicked" }); r.end(); } g.players.delete(b.pid); broadcast(g); } break; }
          case "close": clearTimeout(g.timer); for (const p of g.players.values()) for (const r of p.streams) { send(r, { phase: "closed" }); r.end(); } games.delete(g.code); return json(res, 200, { ok: true });
          default: return json(res, 400, { error: "action" });
        }
        return json(res, 200, { ok: true });
      }
      if (action === "join") {
        const old = g.players.get(b.pid);
        if (old && old.secret === b.secret) return json(res, 200, { pid: old.pid, secret: old.secret, name: old.name, avatar: old.avatar });
        if (tooMany(req)) return json(res, 429, { error: "Too many people are joining from here at once. Wait a moment and try again." });
        if (g.phase === "end") return json(res, 409, { error: "This game has finished." });
        if (g.players.size >= LIMITS.players) return json(res, 409, { error: "This game is full." });
        const real = String(b.real || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
        if (g.names && !real) return json(res, 400, { error: "Type your name: your teacher needs it for the results." });
        const p = { pid: token(9), secret: token(18), real: g.names ? real : "", name: freshName(g), avatar: avatar(), score: 0, streak: 0, best: 0, answers: {}, first: {},
                    streams: new Set(), joined: Date.now(), renames: 3, prevRank: null };
        g.players.set(p.pid, p); broadcast(g);
        return json(res, 200, { pid: p.pid, secret: p.secret, name: p.name, avatar: p.avatar });
      }
      const p = g.players.get(b.pid);
      if (!p || p.secret !== b.secret) return json(res, 403, { error: "Join the game again." });
      if (action === "rename") {
        if (g.phase !== "lobby" || p.renames <= 0) return json(res, 409, { error: "You can't change your name now." });
        p.renames--; p.name = freshName(g); p.avatar = avatar(); broadcast(g);
        return json(res, 200, { name: p.name, avatar: p.avatar });
      }
      if (action === "answer") return json(res, 200, { ok: answer(g, p, Number(b.qi), b.answer) });
      return json(res, 404, { error: "not found" });
    } catch (e) {
      return json(res, 400, { error: "Bad request" });
    }
  }

  // Tidy up: games that have gone quiet or run too long; keep-alive comments so proxies keep streams open.
  setInterval(() => {
    const now = Date.now();
    for (const g of games.values()) {
      if (now - g.active > LIMITS.idleMs || now - g.created > LIMITS.lifeMs) {
        clearTimeout(g.timer);
        for (const r of g.hosts) r.end();
        for (const p of g.players.values()) for (const r of p.streams) { send(r, { phase: "closed" }); r.end(); }
        games.delete(g.code);
      } else {
        for (const r of g.hosts) r.write(": ping\n\n");
        for (const p of g.players.values()) for (const r of p.streams) r.write(": ping\n\n");
      }
    }
    for (const [k, list] of joins) if (!list.some(t => now - t < 60e3)) joins.delete(k);
  }, 20e3).unref();

  return { handle, games, THEMES, TIMES };
};
