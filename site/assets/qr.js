/* A small QR code maker (byte mode, error correction level M, versions 1 to 10: up to 213 bytes), so the live quiz
   can show a join code for phones without loading anything from elsewhere. qrMatrix(text) returns rows of booleans
   (true = dark); qrSVG(text) returns an SVG string with a 4-module quiet zone.
   tools/check_teacher_qr.py compares the output with the Python "qrcode" library for many inputs. */
"use strict";
const QR = (() => {
  // Level M: [ecc codewords per block, blocks in group 1, data codewords each, blocks in group 2, data codewords each]
  const M = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
             [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  // GF(256) arithmetic with the QR polynomial 0x11d.
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  function rsGenerator(n) {
    let g = [1];
    for (let i = 0; i < n; i++) { const next = new Array(g.length + 1).fill(0); g.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= mul(c, EXP[i]); }); g = next; }
    return g;
  }
  function rsRemainder(data, n) {
    const g = rsGenerator(n), r = data.concat(new Array(n).fill(0));
    for (let i = 0; i < data.length; i++) { const c = r[i]; if (c) for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c); }
    return r.slice(data.length);
  }
  function codewords(bytes) {
    let v = 1;
    const cap = ver => { const b = M[ver]; return b[1] * b[2] + b[3] * b[4]; };
    while (v <= 10 && 4 + (v < 10 ? 8 : 16) + 8 * bytes.length > 8 * cap(v)) v++;
    if (v > 10) throw new Error("text too long for a QR code here");
    const bits = [], put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
    const total = 8 * cap(v);
    put(0, Math.min(4, total - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let pad = 0xec; data.length < cap(v); pad ^= 0xec ^ 0x11) data.push(pad);
    const [ecc, n1, d1, n2, d2] = M[v], blocks = [];
    let k = 0;
    for (let i = 0; i < n1 + n2; i++) { const len = i < n1 ? d1 : d2; blocks.push(data.slice(k, k + len)); k += len; }
    const eccs = blocks.map(b => rsRemainder(b, ecc)), out = [];
    for (let i = 0; i < Math.max(d1, d2); i++) blocks.forEach(b => { if (i < b.length) out.push(b[i]); });
    for (let i = 0; i < ecc; i++) eccs.forEach(e => out.push(e[i]));
    return { v, cw: out };
  }
  const MASKS = [(r, c) => (r + c) % 2 === 0, r => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0];
  function bch(value, poly, polyBits) {
    let v = value << (polyBits - 1);
    for (let i = 31 - Math.clz32(v); i >= polyBits - 1; i--) if ((v >> i) & 1) v ^= poly << (i - polyBits + 1);
    return v;
  }
  function build(v, cw, mask) {
    const size = 17 + 4 * v, m = [], fixed = [];
    for (let i = 0; i < size; i++) { m.push(new Array(size).fill(false)); fixed.push(new Array(size).fill(false)); }
    const set = (r, c, dark) => { m[r][c] = dark; fixed[r][c] = true; };
    const finder = (r0, c0) => { for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c; if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3)); set(rr, cc, ring !== 2 && ring !== 4); } };
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
    for (let i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const al = ALIGN[v];
    for (const r of al) for (const c of al) {
      if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (r === al[al.length - 1] && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
    // Format information: level M is 00, then the mask number; BCH(15,5), then XOR 101010000010010.
    const fmt = ((0 << 3 | mask) << 10 | bch(0 << 3 | mask, 0x537, 11)) ^ 0x5412;
    const fb = i => ((fmt >> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(i, 8, fb(i));                 // first copy, round the top-left finder
    set(7, 8, fb(6)); set(8, 8, fb(7)); set(8, 7, fb(8));
    for (let i = 9; i < 15; i++) set(8, 14 - i, fb(i));
    for (let i = 0; i < 8; i++) set(8, size - 1 - i, fb(i));      // second copy, split between the other two finders
    for (let i = 8; i < 15; i++) set(size - 15 + i, 8, fb(i));
    set(size - 8, 8, true);                                        // the dark module
    if (v >= 7) {
      const vi = v << 12 | bch(v, 0x1f25, 13);
      for (let i = 0; i < 18; i++) { const bit = ((vi >> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, bit); set(b, a, bit); }
    }
    // Data, in two-column strips from the bottom right, zig-zagging up and down.
    let bit = 0; const total = cw.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const c = right - j, upward = ((right + 1) & 2) === 0, r = upward ? size - 1 - vert : vert;
        if (fixed[r][c]) continue;
        let dark = false;
        if (bit < total) { dark = ((cw[bit >> 3] >> (7 - (bit & 7))) & 1) === 1; bit++; }
        m[r][c] = dark !== MASKS[mask](r, c);
      }
    }
    return m;
  }
  function penalty(m) {
    const n = m.length; let p = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      let run = 1;
      for (let j = 1; j <= n; j++) {
        const a = pass ? m[j - 1] && m[j - 1][i] : m[i][j - 1], b = j < n ? (pass ? m[j][i] : m[i][j]) : null;
        if (b === a) run++; else { if (run >= 5) p += run - 2; run = 1; }
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) { const c = m[i][j]; if (c === m[i + 1][j] && c === m[i][j + 1] && c === m[i + 1][j + 1]) p += 3; }
    const pat = [true, false, true, true, true, false, true, false, false, false, false], rev = pat.slice().reverse();
    for (let i = 0; i < n; i++) for (let j = 0; j <= n - 11; j++) for (const P of [pat, rev]) {
      if (P.every((x, k) => m[i][j + k] === x)) p += 40;
      if (P.every((x, k) => m[j + k][i] === x)) p += 40;
    }
    const dark = m.flat().filter(Boolean).length;
    p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
    return p;
  }
  function matrix(text, mask) {
    const { v, cw } = codewords([...new TextEncoder().encode(text)]);
    if (mask !== undefined) return build(v, cw, mask);
    let best = null, bestP = Infinity;
    for (let k = 0; k < 8; k++) { const m = build(v, cw, k), p = penalty(m); if (p < bestP) { best = m; bestP = p; } }
    return best;
  }
  function svg(text) {
    const m = matrix(text), n = m.length + 8; let d = "";
    m.forEach((row, r) => row.forEach((dark, c) => { if (dark) d += "M" + (c + 4) + " " + (r + 4) + "h1v1h-1z"; }));
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  return { matrix, svg };
})();
if (typeof module !== "undefined") module.exports = QR;
