/* Reference-language interpreter for the teacher code stepper. Copied unchanged from the code-stepper simulations
   (content/sims/standard-algorithms/index.html and the five others, which share it), so programs behave exactly
   as they do in the course. Exposes tokenise, parseExpr, evalExpr, show, showQ, parseProgram and runProgram. */
"use strict";
/* ================= A small interpreter for SQA-style reference language =================
   Statements: DECLARE x INITIALLY e | SET x TO e | RECEIVE x FROM KEYBOARD | SEND e TO DISPLAY
               IF c THEN / ELSE IF c THEN / ELSE / END IF | FOR v FROM a TO b DO / END FOR
               FOR EACH v FROM list DO / END FOR EACH | WHILE c DO / END WHILE | REPEAT / UNTIL c
   Expressions: numbers, "text", TRUE, FALSE, names, list[index], [a, b], round() random() length(),
               ^  * /  + -  &  = != < > <= >=  NOT AND OR, and brackets.                                */
function tokenise(src) {
  const out = [], re = /\s*(?:(\d+\.?\d*)|"([^"]*)"|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|!=|≤|≥|≠|[-+*\/^&=<>()\[\],]))/y;
  let m; re.lastIndex = 0;
  while (re.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(re.lastIndex))) break;
    m = re.exec(src);
    if (!m) throw new Error("I cannot read this part: " + src.slice(re.lastIndex).trim().slice(0, 12));
    if (m[1] !== undefined) out.push({ t: "num", v: Number(m[1]), raw: m[1] });
    else if (m[2] !== undefined) out.push({ t: "str", v: m[2] });
    else if (m[3] !== undefined) out.push({ t: "id", v: m[3] });
    else out.push({ t: "op", v: { "≤": "<=", "≥": ">=", "≠": "!=" }[m[4]] || m[4] });
  }
  return out;
}
function parseExpr(src) {
  const tk = tokenise(src); let i = 0;
  const peek = () => tk[i], is = v => tk[i] && tk[i].v === v && tk[i].t !== "str", eat = v => { if (!is(v)) throw new Error("expected " + v); i++; };
  const bin = (next, ops) => () => { let a = next(); while (tk[i] && tk[i].t !== "str" && ops.includes(tk[i].v)) { const op = tk[i++].v; a = { k: "bin", op, a, b: next() }; } return a; };
  function atom() {
    const t = tk[i++];
    if (!t) throw new Error("something is missing at the end of the line");
    if (t.t === "num" || t.t === "str") return { k: "lit", v: t.v, raw: t.raw };
    if (t.t === "op" && t.v === "(") { const e = or(); eat(")"); return e; }
    if (t.t === "op" && t.v === "[") { const items = []; if (!is("]")) { do { items.push(or()); } while (is(",") && i++); } eat("]"); return { k: "list", items }; }
    if (t.t === "op" && t.v === "-") return { k: "neg", a: atom() };
    if (t.t === "id") {
      if (t.v === "TRUE" || t.v === "FALSE") return { k: "lit", v: t.v === "TRUE" };
      if (t.v === "NOT") return { k: "not", a: cmp() };
      if (is("(")) { i++; const args = []; if (!is(")")) { do { args.push(or()); } while (is(",") && i++); } eat(")"); return { k: "call", name: t.v, args }; }
      if (is("[")) { i++; const ix = or(); eat("]"); return { k: "index", name: t.v, ix }; }
      return { k: "var", name: t.v };
    }
    throw new Error("unexpected " + t.v);
  }
  const pow = () => { const a = atom(); if (is("^")) { i++; return { k: "bin", op: "^", a, b: pow() }; } return a; };
  const mul = bin(pow, ["*", "/"]), add = bin(mul, ["+", "-"]), cat = bin(add, ["&"]);
  const cmp = bin(cat, ["=", "!=", "<", ">", "<=", ">="]);
  const and = bin(cmp, ["AND"]), or = bin(and, ["OR"]);
  const e = or();
  if (i < tk.length) throw new Error("unexpected " + tk[i].v);
  return e;
}
const show = v => typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : Array.isArray(v) ? "[" + v.map(showQ).join(", ") + "]"
  : typeof v === "number" ? String(Math.round(v * 1e9) / 1e9) : String(v);
const showQ = v => typeof v === "string" ? '"' + v + '"' : show(v);
function evalExpr(e, vars) {
  const num = v => { if (typeof v !== "number") throw new Error(showQ(v) + " is not a number, so it cannot be used in a calculation"); return v; };
  switch (e.k) {
    case "lit": return e.v;
    case "list": return e.items.map(x => evalExpr(x, vars));
    case "var": if (!(e.name in vars)) throw new Error("there is no variable called " + e.name); return vars[e.name];
    case "neg": return -num(evalExpr(e.a, vars));
    case "not": return !evalExpr(e.a, vars);
    case "index": {
      if (!(e.name in vars)) throw new Error("there is no array called " + e.name);
      const arr = vars[e.name], ix = evalExpr(e.ix, vars);
      if (!Array.isArray(arr)) throw new Error(e.name + " is not an array");
      if (!Number.isInteger(ix) || ix < 0 || ix >= arr.length) throw new Error(e.name + "[" + show(ix) + "] does not exist: the indexes go from 0 to " + (arr.length - 1));
      return arr[ix];
    }
    case "call": {
      const a = e.args.map(x => evalExpr(x, vars)), n = e.name.toLowerCase();
      if (n === "round" && a.length === 2) { const f = 10 ** num(a[1]); return Math.round((num(a[0]) + Number.EPSILON) * f) / f; }
      if (n === "random" && a.length === 2) return num(a[0]) + Math.floor(Math.random() * (num(a[1]) - a[0] + 1));
      if (n === "length" && a.length === 1 && (typeof a[0] === "string" || Array.isArray(a[0]))) return a[0].length;
      throw new Error(["round", "random", "length"].includes(n) ? e.name + " has been given the wrong parameters" : "there is no function called " + e.name);
    }
    case "bin": {
      if (e.op === "AND") return Boolean(evalExpr(e.a, vars)) && Boolean(evalExpr(e.b, vars));
      if (e.op === "OR") return Boolean(evalExpr(e.a, vars)) || Boolean(evalExpr(e.b, vars));
      const a = evalExpr(e.a, vars), b = evalExpr(e.b, vars);
      switch (e.op) {
        case "&": return show(a) + show(b);
        case "+": return num(a) + num(b);
        case "-": return num(a) - num(b);
        case "*": return num(a) * num(b);
        case "/": if (num(b) === 0) throw new Error("division by zero"); return num(a) / b;
        case "^": return num(a) ** num(b);
        case "=": return a === b; case "!=": return a !== b;
        case "<": return a < b; case ">": return a > b; case "<=": return a <= b; case ">=": return a >= b;
      }
    }
  }
  throw new Error("I cannot work this out");
}
// The data type each variable holds, worked out from the expression stored in it (the interpreter keeps plain values).
function typeOf(e, types) {
  const kind = t => (t === "INTEGER" || t === "REAL" ? t : "");
  switch (e.k) {
    case "lit": return typeof e.v === "boolean" ? "BOOLEAN" : typeof e.v === "string" ? "STRING" : /\./.test(e.raw || "") || !Number.isInteger(e.v) ? "REAL" : "INTEGER";
    case "list": { const t = e.items.map(x => typeOf(x, types)); return t.length ? "ARRAY OF " + (t.includes("REAL") ? "REAL" : t[0]) : "ARRAY"; }
    case "var": return types[e.name] || "";
    case "neg": return typeOf(e.a, types);
    case "not": return "BOOLEAN";
    case "index": return (types[e.name] || "").replace(/^ARRAY OF /, "");
    case "call": return /^length$|^random$/i.test(e.name) ? "INTEGER" : /^round$/i.test(e.name) ? "REAL" : "";
    case "bin": {
      if (["AND", "OR", "=", "!=", "<", ">", "<=", ">="].includes(e.op)) return "BOOLEAN";
      if (e.op === "&") return "STRING";
      const a = kind(typeOf(e.a, types)), b = kind(typeOf(e.b, types));
      if (!a || !b) return "";
      return e.op === "/" || a === "REAL" || b === "REAL" ? "REAL" : "INTEGER";
    }
  }
  return "";
}
// Turn the text of a program into numbered statements. Throws {line, message} for a syntax error.
function parseProgram(text) {
  const lines = text.split("\n"), prog = [], stack = [];
  const fail = (n, message) => { throw { line: n, message }; };
  lines.forEach((raw, idx) => {
    const n = idx + 1, s = raw.trim();
    if (!s) { prog.push({ op: "blank" }); return; }
    let m, st;
    const ex = src => { try { return parseExpr(src); } catch (e) { fail(n, e.message); } };
    if ((m = /^(?:DECLARE)\s+(\w+)\s+INITIALLY\s+(.+)$/.exec(s))) st = { op: "set", target: { k: "var", name: m[1] }, e: ex(m[2]) };
    else if ((m = /^SET\s+(\w+)(?:\[(.+)\])?\s+TO\s+(.+)$/.exec(s))) st = { op: "set", target: m[2] ? { k: "index", name: m[1], ix: ex(m[2]) } : { k: "var", name: m[1] }, e: ex(m[3]) };
    else if ((m = /^RECEIVE\s+(\w+)\s+FROM\s+(?:\((\w+)\)\s+)?KEYBOARD$/.exec(s))) st = { op: "receive", name: m[1], type: m[2] };
    else if ((m = /^SEND\s+(.+)\s+TO\s+DISPLAY$/.exec(s))) st = { op: "send", e: ex(m[1]) };
    else if ((m = /^IF\s+(.+)\s+THEN$/.exec(s))) { st = { op: "if", c: ex(m[1]), src: m[1], branches: [idx] }; stack.push({ kind: "IF", at: idx, st }); }
    else if ((m = /^ELSE\s+IF\s+(.+)\s+THEN$/.exec(s))) { const top = stack[stack.length - 1]; if (!top || top.kind !== "IF") fail(n, "ELSE IF without an IF above it"); st = { op: "elseif", c: ex(m[1]), src: m[1], head: top.at }; top.st.branches.push(idx); }
    else if (s === "ELSE") { const top = stack[stack.length - 1]; if (!top || top.kind !== "IF") fail(n, "ELSE without an IF above it"); st = { op: "else", head: top.at }; top.st.branches.push(idx); }
    else if (s === "END IF") { const top = stack.pop(); if (!top || top.kind !== "IF") fail(n, "END IF without an IF above it"); st = { op: "endif" }; top.st.branches.push(idx); top.st.end = idx; }
    else if ((m = /^FOR\s+EACH\s+(\w+)\s+FROM\s+(\w+)\s+DO$/.exec(s))) { st = { op: "foreach", name: m[1], list: m[2] }; stack.push({ kind: "FOR EACH", at: idx, st }); }
    else if (s === "END FOR EACH") { const top = stack.pop(); if (!top || top.kind !== "FOR EACH") fail(n, "END FOR EACH without a FOR EACH above it"); st = { op: "endforeach", head: top.at }; top.st.end = idx; }
    else if ((m = /^FOR\s+(\w+)\s+FROM\s+(.+)\s+TO\s+(.+)\s+DO$/.exec(s))) { st = { op: "for", name: m[1], a: ex(m[2]), b: ex(m[3]) }; stack.push({ kind: "FOR", at: idx, st }); }
    else if (s === "END FOR") { const top = stack.pop(); if (!top || top.kind !== "FOR") fail(n, "END FOR without a FOR above it"); st = { op: "endfor", head: top.at }; top.st.end = idx; }
    else if ((m = /^WHILE\s+(.+)\s+DO$/.exec(s))) { st = { op: "while", c: ex(m[1]), src: m[1] }; stack.push({ kind: "WHILE", at: idx, st }); }
    else if (s === "END WHILE") { const top = stack.pop(); if (!top || top.kind !== "WHILE") fail(n, "END WHILE without a WHILE above it"); st = { op: "endwhile", head: top.at }; top.st.end = idx; }
    else if (s === "REPEAT") { st = { op: "repeat" }; stack.push({ kind: "REPEAT", at: idx, st }); }
    else if ((m = /^UNTIL\s+(.+)$/.exec(s))) { const top = stack.pop(); if (!top || top.kind !== "REPEAT") fail(n, "UNTIL without a REPEAT above it"); st = { op: "until", c: ex(m[1]), src: m[1], head: top.at }; }
    else fail(n, /^(IF|ELSE IF)\b/.test(s) ? "an IF line must end with THEN" : /^(WHILE|FOR)\b/.test(s) ? "a " + s.split(" ")[0] + " line must end with DO" : "this is not a statement I recognise. Check the spelling of the keywords.");
    prog.push(st);
  });
  if (stack.length) { const top = stack.pop(); fail(top.at + 1, "this " + top.kind + " is never closed"); }
  return prog;
}
// Run a program to the end, recording one step per line carried out.
function runProgram(text, inputs) {
  let prog;
  try { prog = parseProgram(text); } catch (e) { return { syntax: e, steps: [] }; }
  const vars = {}, types = {}, out = [], steps = [], taken = {}, loops = {}, queue = inputs.slice();
  let pc = 0, crashed = null, guard = 0;
  const snap = (line, note, error) => steps.push({ line: line + 1, vars: JSON.parse(JSON.stringify(vars)), types: { ...types }, out: out.slice(), note, error: error || "" });
  const tf = v => (v ? "TRUE" : "FALSE");
  while (pc < prog.length && !crashed) {
    if (++guard > 400) { snap(pc, "", "The program has run 400 lines without finishing. It is probably stuck in a loop that never ends."); crashed = "loop"; break; }
    const st = prog[pc], at = pc;
    try {
      switch (st.op) {
        case "blank": pc++; continue;
        case "set": {
          const v = evalExpr(st.e, vars);
          if (st.target.k === "var") { types[st.target.name] = typeOf(st.e, types); vars[st.target.name] = v; snap(at, st.target.name + " now holds " + showQ(v) + "."); }
          else { const ix = evalExpr(st.target.ix, vars), arr = vars[st.target.name];
            if (!Array.isArray(arr) || !Number.isInteger(ix) || ix < 0 || ix >= arr.length) throw new Error(st.target.name + "[" + show(ix) + "] does not exist");
            arr[ix] = v; snap(at, st.target.name + "[" + ix + "] now holds " + showQ(v) + "."); }
          pc++; break;
        }
        case "receive": {
          if (!queue.length) throw new Error("the program asked for input, but there are no more values to type in");
          const raw = queue.shift(), asNum = raw.trim() !== "" && !isNaN(Number(raw));
          if (st.type && /INTEGER|REAL/.test(st.type) && !asNum) throw new Error('"' + raw + '" was typed, but a number was expected');
          vars[st.name] = st.type === "STRING" || st.type === "CHARACTER" ? raw : asNum ? Number(raw) : raw;
          types[st.name] = st.type || (!asNum ? "STRING" : /\./.test(raw) ? "REAL" : "INTEGER");
          snap(at, "The user types " + raw + ". It is stored in " + st.name + "."); pc++; break;
        }
        case "send": { const v = show(evalExpr(st.e, vars)); out.push(v); snap(at, "This is displayed: " + v); pc++; break; }
        case "if": case "elseif": {
          const head = st.op === "if" ? at : st.head, chain = prog[head];
          if (st.op === "if") taken[head] = false;
          if (taken[head]) { pc = chain.end; snap(at, "An earlier part of this IF was true, so the rest is skipped."); break; }
          const c = Boolean(evalExpr(st.c, vars));
          if (c) { taken[head] = true; pc = at + 1; snap(at, st.src + " is TRUE, so the lines below it run."); }
          else { pc = chain.branches[chain.branches.indexOf(at) + 1]; snap(at, st.src + " is FALSE, so these lines are skipped."); }
          break;
        }
        case "else": { const chain = prog[st.head];
          if (taken[st.head]) { pc = chain.end; snap(at, "An earlier part of this IF was true, so ELSE is skipped."); }
          else { taken[st.head] = true; pc = at + 1; snap(at, "None of the conditions above was true, so the ELSE lines run."); } break; }
        case "endif": pc++; break;
        case "for": {
          if (!loops[at]) { const a = evalExpr(st.a, vars), b = evalExpr(st.b, vars); loops[at] = { b }; vars[st.name] = a; types[st.name] = typeOf(st.a, types); }
          if (vars[st.name] > loops[at].b) { delete loops[at]; pc = st.end + 1; snap(at, st.name + " has gone past the end value, so the loop stops."); }
          else { pc = at + 1; snap(at, st.name + " is " + show(vars[st.name]) + ". The loop body runs."); }
          break;
        }
        case "endfor": vars[prog[st.head].name]++; pc = st.head; break;
        case "foreach": {
          const list = vars[st.list]; if (!Array.isArray(list)) throw new Error(st.list + " is not an array");
          if (!loops[at]) loops[at] = { i: 0 };
          if (loops[at].i >= list.length) { delete loops[at]; pc = st.end + 1; snap(at, "Every item of " + st.list + " has been used, so the loop stops."); }
          else { vars[st.name] = list[loops[at].i]; types[st.name] = (types[st.list] || "").replace(/^ARRAY OF /, ""); pc = at + 1; snap(at, st.name + " takes the next item: " + showQ(vars[st.name]) + "."); }
          break;
        }
        case "endforeach": loops[st.head].i++; pc = st.head; break;
        case "while": { const c = Boolean(evalExpr(st.c, vars));
          if (c) { pc = at + 1; snap(at, st.src + " is TRUE, so the loop body runs."); } else { pc = st.end + 1; snap(at, st.src + " is FALSE, so the loop ends."); } break; }
        case "endwhile": pc = st.head; break;
        case "repeat": pc++; snap(at, "Start of the loop body. The condition is tested at the end."); break;
        case "until": { const c = Boolean(evalExpr(st.c, vars));
          if (c) { pc = at + 1; snap(at, st.src + " is TRUE, so the loop ends."); } else { pc = st.head + 1; snap(at, st.src + " is FALSE, so the loop goes round again."); } break; }
      }
    } catch (e) { snap(at, "", "Execution error on line " + (at + 1) + ": " + e.message + ". The program has crashed."); crashed = "error"; }
  }
  return { syntax: null, steps, crashed, out: steps.length ? steps[steps.length - 1].out : [] };
}

