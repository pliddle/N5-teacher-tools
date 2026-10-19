// Teacher tools server (teachers.DOMAIN). Serves content/teachers/ and runs the live quiz games (live.js).
// No dependencies: plain Node (20 or later). Holds games in memory only; nothing about players is stored.
//
//   node server/server.js            (SITE=site PORT=8099 by default)
//
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const SITE = path.resolve(process.env.SITE || path.join(__dirname, "../site"));
const PORT = Number(process.env.PORT || 8099);
const stats = require("./stats.js")({ file: process.env.STATS_FILE || path.join(__dirname, "../.stats/visits.json"), key: process.env.STATS_KEY });
const live = require("./live.js")(SITE, { onGame: stats.game });

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const SECURITY = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "SAMEORIGIN" };

function serveFile(req, res, urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(SITE, path.normalize(rel));
  if (!file.startsWith(SITE + path.sep) || /\.md$/i.test(file)) { res.writeHead(404); return res.end(); }   // notes for us stay private
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { res.writeHead(301, { Location: urlPath + "/" }); return res.end(); }
    if (err) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", ...SECURITY }); return res.end('<p>Not found. <a href="/">Teacher tools</a></p>'); }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const etag = '"' + st.size.toString(36) + "-" + st.mtimeMs.toString(36) + '"';
    if (req.headers["if-none-match"] === etag) { res.writeHead(304); return res.end(); }
    res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, ETag: etag, "Cache-Control": "no-cache", ...SECURITY });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, "http://x"); } catch (e) { res.writeHead(400); return res.end(); }
  if (url.pathname === "/api/stats" || url.pathname.startsWith("/stats")) {      // The owner's visit counts: secret link only
    if (!stats.allowed(url)) { res.writeHead(404, SECURITY); return res.end(); }
    if (url.pathname === "/api/stats") {
      const out = JSON.stringify(stats.report());
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SECURITY });
      return res.end(out);
    }
    if (url.pathname !== "/stats/") { res.writeHead(301, { Location: "/stats/" + url.search }); return res.end(); }
    return serveFile(req, res, "/stats/");
  }
  if (url.pathname.startsWith("/api/")) return live.handle(req, res, url);
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  if (url.pathname === "/join" || url.pathname === "/play") { res.writeHead(302, { Location: "/play/" + url.search }); return res.end(); }
  stats.count(req, url);
  serveFile(req, res, url.pathname);
});
server.keepAliveTimeout = 65000;
server.listen(PORT, () => console.log("Teacher tools on port " + PORT + ", serving " + SITE));
process.on("SIGTERM", () => process.exit(0));
// One bad request must not take every running game down with it.
process.on("uncaughtException", e => console.error("Error:", e && e.stack || e));
