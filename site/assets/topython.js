/* Reference language to Python, line by line, for the teacher code stepper's "Python alongside" view.
   toPython(code) returns { lines, imports } where lines[i] is the Python for reference line i+1 ("" for END lines; REPEAT gives two, joined by \n),
   or throws { line, message } if a line cannot be translated. Needs reflang.js (parseExpr).
   tools/check_teacher_tools.py runs every example through both and compares the output. */
"use strict";
function toPython(code) {
  const imports = new Set(), strVars = new Set(), strLists = new Set();   // what is known to hold text, so str() is only added where needed
  // Python precedence: or 1, and 2, not 3, comparisons 4, + - 5, * / 6, unary minus 7, ** 8, atoms 9.
  const PREC = { OR: 1, AND: 2, "=": 4, "!=": 4, "<": 4, ">": 4, "<=": 4, ">=": 4, "&": 5, "+": 5, "-": 5, "*": 6, "/": 6, "^": 8 };
  const PYOP = { OR: "or", AND: "and", "=": "==", "!=": "!=", "<=": "<=", ">=": ">=", "&": "+", "^": "**" };
  const wrap = (x, p) => (x.p < p ? "(" + x.s + ")" : x.s);
  function py(e) {
    switch (e.k) {
      case "lit": return { s: typeof e.v === "string" ? JSON.stringify(e.v) : typeof e.v === "boolean" ? (e.v ? "True" : "False") : show(e.v), p: 9, str: typeof e.v === "string" };
      case "var": return { s: e.name, p: 9, str: strVars.has(e.name) };
      case "list": { const items = e.items.map(py); return { s: "[" + items.map(x => x.s).join(", ") + "]", p: 9, strList: items.length > 0 && items.every(x => x.str) }; }
      case "index": return { s: e.name + "[" + py(e.ix).s + "]", p: 9, str: strLists.has(e.name) };
      case "neg": return { s: "-" + wrap(py(e.a), 7), p: 7 };
      case "not": return { s: "not " + wrap(py(e.a), 3), p: 3 };
      case "call": {
        const a = e.args.map(x => py(x).s), n = e.name.toLowerCase();
        if (n === "random") { imports.add("import random"); return { s: "random.randint(" + a.join(", ") + ")", p: 9 }; }
        if (n === "length") return { s: "len(" + a.join(", ") + ")", p: 9 };
        return { s: n + "(" + a.join(", ") + ")", p: 9 };
      }
      case "bin": {
        const p = PREC[e.op], op = PYOP[e.op] || e.op;
        if (e.op === "&") {             // Python cannot join a number to text, so non-text parts are converted with str()
          const part = x => { const r = py(x); return r.str ? wrap(r, p) : "str(" + r.s + ")"; };
          return { s: part(e.a) + " + " + part(e.b), p, str: true };
        }
        const a = py(e.a), b = py(e.b);
        const left = e.op === "^" ? wrap(a, p + 1) : wrap(a, p);
        const right = e.op === "^" ? wrap(b, p) : (e.op === "-" || e.op === "/" ? wrap(b, p + 1) : wrap(b, p));
        return { s: left + " " + op + " " + right, p };
      }
    }
    throw new Error("cannot translate this expression");
  }
  const ex = src => py(parseExpr(src)).s;
  const assign = (name, src) => { const r = py(parseExpr(src)); (r.str ? strVars.add(name) : strVars.delete(name)); (r.strList ? strLists.add(name) : strLists.delete(name)); return r.s; };
  const lines = [], stack = [], repeats = [];
  let depth = 0;
  code.split("\n").forEach((raw, i) => {
    const s = raw.trim(), pad = n => "    ".repeat(Math.max(0, n));
    let m;
    try {
      if (!s) lines.push("");
      else if ((m = /^DECLARE\s+(\w+)\s+INITIALLY\s+(.+)$/.exec(s))) lines.push(pad(depth) + m[1] + " = " + assign(m[1], m[2]));
      else if ((m = /^SET\s+(\w+)(?:\[(.+)\])?\s+TO\s+(.+)$/.exec(s))) lines.push(pad(depth) + m[1] + (m[2] ? "[" + ex(m[2]) + "]" : "") + " = " + (m[2] ? ex(m[3]) : assign(m[1], m[3])));
      else if ((m = /^RECEIVE\s+(\w+)\s+FROM\s+(?:\((\w+)\)\s+)?KEYBOARD$/.exec(s))) {
        const t = (m[2] || "").toUpperCase();
        if (t === "INTEGER" || t === "REAL") strVars.delete(m[1]); else strVars.add(m[1]);
        lines.push(pad(depth) + m[1] + " = " + (t === "INTEGER" ? "int(input())" : t === "REAL" ? "float(input())" : "input()"));
      }
      else if ((m = /^SEND\s+(.+)\s+TO\s+DISPLAY$/.exec(s))) lines.push(pad(depth) + "print(" + ex(m[1]) + ")");
      else if ((m = /^IF\s+(.+)\s+THEN$/.exec(s))) { lines.push(pad(depth) + "if " + ex(m[1]) + ":"); stack.push("IF"); depth++; }
      else if ((m = /^ELSE\s+IF\s+(.+)\s+THEN$/.exec(s))) lines.push(pad(depth - 1) + "elif " + ex(m[1]) + ":");
      else if (s === "ELSE") lines.push(pad(depth - 1) + "else:");
      else if (/^END\s+(IF|FOR|FOR EACH|WHILE)$/.test(s)) { stack.pop(); depth--; lines.push(""); }
      else if ((m = /^FOR\s+EACH\s+(\w+)\s+FROM\s+(\w+)\s+DO$/.exec(s))) { (strLists.has(m[2]) ? strVars.add(m[1]) : strVars.delete(m[1])); lines.push(pad(depth) + "for " + m[1] + " in " + m[2] + ":"); stack.push("FOR"); depth++; }
      else if ((m = /^FOR\s+(\w+)\s+FROM\s+(.+)\s+TO\s+(.+)\s+DO$/.exec(s))) {
        const to = /^\d+$/.test(m[3].trim()) ? String(Number(m[3]) + 1) : ex(m[3]) + " + 1";
        lines.push(pad(depth) + "for " + m[1] + " in range(" + ex(m[2]) + ", " + to + "):"); stack.push("FOR"); depth++;
      }
      else if ((m = /^WHILE\s+(.+)\s+DO$/.exec(s))) { lines.push(pad(depth) + "while " + ex(m[1]) + ":"); stack.push("WHILE"); depth++; }
      else if (s === "REPEAT") { const flag = repeats.length ? "finished" + (repeats.length + 1) : "finished"; repeats.push(flag); lines.push(pad(depth) + flag + " = False\n" + pad(depth) + "while not " + flag + ":"); stack.push("REPEAT"); depth++; }
      else if ((m = /^UNTIL\s+(.+)$/.exec(s))) { lines.push(pad(depth) + repeats.pop() + " = " + ex(m[1])); stack.pop(); depth--; }
      else throw new Error("not a statement");
    } catch (e) { throw { line: i + 1, message: e.message }; }
  });
  return { lines, imports: [...imports] };
}
