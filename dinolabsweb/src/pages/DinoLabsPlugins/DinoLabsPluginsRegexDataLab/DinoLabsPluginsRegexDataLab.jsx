import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleHalfStroke, faWandMagicSparkles, faKeyboard, faFlag, faHighlighter, faBroom,
  faStopwatch, faBug, faShield, faDiagramNext, faFileCode, faCopy, faFileExport,
  faCubes, faPlus, faTrash, faDownload, faEraser, faShuffle
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsRegexDataLab/DinoLabsPluginsRegexDataLab.css";

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const uid = () => Math.random().toString(36).slice(2, 9);
const bytes = (str) => new TextEncoder().encode(str);
const fmtPct = (x) => isFinite(x) ? (x * 100).toFixed(1) + "%" : "—";
const escapeHtml = (s) => String(s).replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
function mulberry32(seed = 0x9E3779B1) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = ~0; for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (~c) >>> 0; };
const strU8 = (s) => new TextEncoder().encode(s);
const dosDateTime = (d = new Date()) => { const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | (Math.floor(d.getSeconds() / 2) & 31); const date = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31); return { time, date }; };
async function buildZip(files) {
  const local = [], central = []; let offset = 0; const { time, date } = dosDateTime();
  for (const f of files) {
    const name = strU8(f.name); const crc = crc32(f.u8); const sz = f.u8.length;
    const loc = new Uint8Array(30 + name.length + sz); let p = 0;
    const w16 = (v) => { loc[p++] = v & 255; loc[p++] = (v >>> 8) & 255; }; const w32 = (v) => { w16(v & 65535); w16((v >>> 16) & 65535); };
    w32(0x04034b50); w16(20); w16(0); w16(0); w16(time); w16(date); w32(crc); w32(sz); w32(sz); w16(name.length); w16(0);
    loc.set(name, p); p += name.length; loc.set(f.u8, p); local.push(loc);
    const cen = new Uint8Array(46 + name.length); p = 0; const c16 = (v) => { cen[p++] = v & 255; cen[p++] = (v >>> 8) & 255; }; const c32 = (v) => { c16(v & 65535); c16((v >>> 16) & 65535); };
    c32(0x02014b50); c16(0x031E); c16(20); c16(0); c16(0); c16(time); c16(date); c32(crc); c32(sz); c32(sz); c16(name.length); c16(0); c16(0); c16(0); c16(0); c32(0); c32(offset); cen.set(name, p); central.push(cen);
    offset += loc.length;
  }
  const cenSize = central.reduce((s, a) => s + a.length, 0), cenOffset = offset;
  const end = new Uint8Array(22); let q = 0; const e16 = (v) => { end[q++] = v & 255; end[q++] = (v >>> 8) & 255; }; const e32 = (v) => { e16(v & 65535); e16((v >>> 16) & 65535); };
  e32(0x06054b50); e16(0); e16(0); e16(files.length); e16(files.length); e32(cenSize); e32(cenOffset); e16(0);
  return new Blob([...local, ...central, end], { type: "application/zip" });
}
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toggleFlag = (flags, f) => flags.includes(f) ? flags.replace(f, "") : flags + f;
function hazardHints(pattern) {
  const hints = [];
  if (/\(\?:?[^)]*[\*\+][^)]*\)\s*[\*\+\{]/.test(pattern)) hints.push("Group followed by another quantifier; this may backtrack exponentially.");
  if (/\.\*\.\*/.test(pattern) || /\(\.\*\)/.test(pattern)) hints.push("Multiple greedy wildcards in proximity.");
  if (/\(\?:?[^)]*\|\s*[^)]*\)\+/.test(pattern)) hints.push("Alternations inside a repeated group can be costly.");
  if (/\\b\.\*\\b/.test(pattern)) hints.push("Word boundary with a greedy wildcard on long text can be slow.");
  return hints;
}
function explainRegex(pat) {
  const parts = []; let i = 0; const n = pat.length;
  const readClass = () => { let s = "["; i++; while (i < n) { const c = pat[i]; s += c; if (c === "]" && pat[i - 1] !== "\\") { i++; break; } i++; } parts.push(`${s} — character class`); };
  const readGroup = () => {
    let s = "("; if (pat[i + 1] === "?") { if (pat[i + 2] === ":") { s = "(?:"; parts.push("Non-capturing group"); i += 3; } else { parts.push("Group option"); i += 2; } } else { parts.push("Capturing group"); i++; }
    let depth = 1, buf = ""; while (i < n && depth > 0) {
      const c = pat[i];
      if (c === "[" && pat[i - 1] !== "\\") { let j = i + 1; while (j < n) { const d = pat[j]; if (d === "]" && pat[j - 1] !== "\\") { j++; break; } j++; } buf += pat.slice(i, j); i = j; continue; }
      if (c === "(" && pat[i - 1] !== "\\") { depth++; }
      if (c === ")" && pat[i - 1] !== "\\") { depth--; if (depth === 0) { i++; break; } }
      buf += c; i++;
    }
    parts.push(`(${buf}) — group body`);
  };
  while (i < n) {
    const c = pat[i];
    if (c === "^") { parts.push("^ — start anchor"); i++; continue; }
    if (c === "$") { parts.push("$ — end anchor"); i++; continue; }
    if (c === ".") { parts.push(". — any character except newline (unless s flag)"); i++; continue; }
    if (c === "\\") {
      const d = pat[i + 1] || ""; const map = { "d": "digit", "D": "non-digit", "w": "word character", "W": "non-word character", "s": "whitespace", "S": "non-whitespace", "b": "word boundary", "B": "non-word boundary", "t": "tab", "n": "newline", "r": "carriage return" };
      parts.push(`\\${d} — ${map[d] || "escaped character"}`); i += 2; continue;
    }
    if (c === "[") { readClass(); continue; }
    if (c === "(") { readGroup(); continue; }
    if ("*+?{}".includes(c)) { let q = c; let j = i + 1; while (j < n && "{}?".includes(pat[j])) { q += pat[j++]; if (q.length > 8) break; } parts.push(`${q} — quantifier`); i = j; continue; }
    if (c === "|") { parts.push("| — alternation"); i++; continue; }
    let j = i; let lit = ""; while (j < n) { const ch = pat[j]; if ("^$.*+?()[]{}|\\".includes(ch)) break; lit += ch; j++; }
    if (lit) parts.push(`${JSON.stringify(lit)} — literal`); i = j;
  }
  return parts;
}
function highlightMatches(text, re) {
  if (!re) return escapeHtml(text);
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const rx = new RegExp(re.source, flags);
  let out = ""; let last = 0; let m; let guard = 0;
  while ((m = rx.exec(text)) && guard < 5000) {
    guard++;
    const s = m.index, e = s + (m[0]?.length || 0);
    out += escapeHtml(text.slice(last, s));
    out += `<mark class="match" data-i="${guard - 1}">${escapeHtml(text.slice(s, e))}</mark>`;
    last = e;
    if (m[0]?.length === 0) { rx.lastIndex++; }
  }
  out += escapeHtml(text.slice(last));
  return out;
}
function replacePreview(text, re, repl) {
  if (!re) return text;
  try { const flags = re.flags.includes("g") ? re.flags : re.flags + "g"; return text.replace(new RegExp(re.source, flags), repl); } catch { return text; }
}
function timeMatch(samples, re, iterations = 1) {
  if (!re || samples.length === 0) return { ms: 0, total: 0 };
  const t0 = performance.now(); let total = 0; const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  for (let k = 0; k < iterations; k++) {
    for (const s of samples) {
      const rx = new RegExp(re.source, flags);
      let m; let guard = 0;
      while ((m = rx.exec(s)) && guard < 1000) { total += 1; if (m[0]?.length === 0) rx.lastIndex++; guard++; }
    }
  }
  return { ms: performance.now() - t0, total };
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (s) => `"${String(s).replace(/"/g, "\"\"")}"`;
  return [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h] ?? "")).join(","))].join("\n");
}
function genFromRegex(pattern, flags = "", rng = mulberry32(123), opts = {}) {
  const maxRepeat = clamp(opts.maxRepeat ?? 8, 0, 50);
  const preferLong = !!opts.preferLong;
  let i = 0; const n = pattern.length;
  function rndInt(a, b) { return a + Math.floor(rng() * (b - a + 1)); }
  function one() {
    if (i >= n) return "";
    const c = pattern[i];
    if (c === "^" || c === "$") { i++; return ""; }
    if (c === "\\") {
      const d = pattern[i + 1] || ""; i += 2;
      if (d === "d") return String(rndInt(0, 9));
      if (d === "D") { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefhjkmnprstuvwxyz_@#&"; return chars[Math.floor(rng() * chars.length)]; }
      if (d === "w") { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_"; return chars[Math.floor(rng() * chars.length)]; }
      if (d === "W") { const chars = "-+*/=,.;:!$%^&()[]{}<> "; return chars[Math.floor(rng() * chars.length)]; }
      if (d === "s") return [" ", "\t", "\n"][rndInt(0, 2)];
      if (d === "S") { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; return chars[Math.floor(rng() * chars.length)]; }
      if (/\d/.test(d)) return "";
      return d;
    }
    if (c === ".") { i++; const pool = flags.includes("s") ? "\u0000\u0001 abcXYZ09_—🙂" : " abcXYZ09_"; return pool[Math.floor(rng() * pool.length)] || "x"; }
    if (c === "[") {
      i++; let negate = false; if (pattern[i] === "^") { negate = true; i++; }
      const ranges = []; let prev = null;
      while (i < n) {
        const ch = pattern[i];
        if (ch === "]" && pattern[i - 1] !== "\\") { i++; break; }
        if (ch === "-" && prev && pattern[i + 1] && pattern[i + 1] !== "]") { const end = pattern[i + 1]; ranges.push([prev, end]); prev = null; i += 2; continue; }
        prev = ch; ranges.push([ch, ch]); i++;
      }
      const pick = () => {
        const opts = [];
        for (const [a, b] of ranges) {
          if (a === b) opts.push(a); else {
            const lo = a.charCodeAt(0), hi = b.charCodeAt(0);
            for (let t = lo; t <= hi && opts.length < 200; t++) opts.push(String.fromCharCode(t));
          }
        }
        return opts[Math.floor(rng() * opts.length)] || "x";
      };
      if (!negate) return pick();
      const bad = new Set(); for (let k = 0; k < 500; k++) bad.add(pick());
      const any = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 _-.,:/@#";
      const pool = [...any].filter(ch => !bad.has(ch));
      return pool[Math.floor(rng() * pool.length)] || "a";
    }
    if (c === "(") {
      let noncap = false; if (pattern[i + 1] === "?" && pattern[i + 2] === ":") { noncap = true; i += 3; } else { i++; }
      let depth = 1, buf = "";
      while (i < n && depth > 0) {
        const ch = pattern[i];
        if (ch === "[" && pattern[i - 1] !== "\\") { let j = i + 1; while (j < n) { if (pattern[j] === "]" && pattern[j - 1] !== "\\") { j++; break; } j++; } buf += pattern.slice(i, j); i = j; continue; }
        if (ch === "(" && pattern[i - 1] !== "\\") depth++;
        if (ch === ")" && pattern[i - 1] !== "\\") { depth--; if (depth === 0) { break; } }
        buf += ch; i++;
      }
      const inner = buf; i++;
      const parts = []; {
        let d = 0, cur = ""; for (let k = 0; k < inner.length; k++) {
          const ch = inner[k];
          if (ch === "[" && inner[k - 1] !== "\\") {
            let j = k + 1; while (j < inner.length) { if (inner[j] === "]" && inner[j - 1] !== "\\") { j++; break; } j++; }
            cur += inner.slice(k, j); k = j - 1; continue;
          }
          if (ch === "(" && inner[k - 1] !== "\\") d++;
          else if (ch === ")" && inner[k - 1] !== "\\") d--;
          else if (ch === "|" && d === 0) { parts.push(cur); cur = ""; continue; }
          cur += ch;
        } parts.push(cur);
      }
      const pick = parts[Math.floor(rng() * parts.length)] || "";
      return genFromRegex(pick, flags, rng, opts);
    }
    i++; return c;
  }
  function tokenWithQuant() {
    const start = i;
    const t = one();
    if (i >= n) return t;
    const q = pattern[i];
    if (q === "*") { i++; const rep = preferLong ? Math.max(0, Math.min(maxRepeat, 3 + Math.floor(rng() * maxRepeat))) : Math.floor(rng() * (maxRepeat + 1)); return t.repeat(rep); }
    if (q === "+") { i++; const rep = preferLong ? Math.max(1, 3 + Math.floor(rng() * maxRepeat)) : Math.max(1, Math.floor(rng() * Math.max(1, maxRepeat))); return t.repeat(rep); }
    if (q === "?") { i++; return rng() < 0.5 ? "" : t; }
    if (q === "{") {
      let j = i + 1; let num = ""; while (j < n && /\d|,/.test(pattern[j])) { num += pattern[j++]; }
      if (pattern[j] === "}") {
        i = j + 1; const parts = num.split(","); const a = parseInt(parts[0] || "0", 10); const b = parts[1] != null ? parseInt(parts[1] || String(a), 10) : a;
        const L = clamp(isFinite(a) ? a : 0, 0, maxRepeat), R = clamp(isFinite(b) ? b : L, L, Math.max(L, maxRepeat));
        const rep = Math.floor(rng() * (R - L + 1)) + L; return t.repeat(rep);
      }
      i = start + t.length; return t;
    }
    return t;
  }
  let out = ""; let guard = 0;
  while (i < n && guard < 10000) { out += tokenWithQuant(); guard++; }
  return out;
}
const FIRST = ["Ava", "Mia", "Liam", "Noah", "Olivia", "Emma", "Amir", "Leo", "Zara", "Kai", "Ivy", "Maya", "Ezra", "Iris", "Jude", "Nina", "Ruby", "Theo", "Sage", "Zoe"];
const LAST = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Moore", "Taylor", "Clark", "Nguyen", "Hall", "Allen", "Young", "King", "Wright", "Scott"];
const DOMAINS = ["example.com", "test.dev", "acme.io", "corp.local", "myapp.net", "demo.org"];
const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function makeGenerator(schema, seed = 12345) {
  const rng = mulberry32(seed | 0);
  const genInt = (min = 0, max = 100) => Math.floor(rng() * (max - min + 1)) + min;
  const genFloat = (min = 0, max = 1, dec = 2) => +(min + rng() * (max - min)).toFixed(dec);
  const genBool = (p = 0.5) => rng() < p;
  const genDate = (start, end) => new Date(start.getTime() + Math.floor(rng() * (end.getTime() - start.getTime() + 1)));
  const genUuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.floor(rng() * 16), v = c === "x" ? r : (r & 0x3 | 0x8); return v.toString(16); });
  const genHex = () => "#" + Array.from({ length: 6 }, () => Math.floor(rng() * 16).toString(16)).join("");
  const genIP = () => [0, 0, 0, 0].map(() => genInt(1, 254)).join(".");
  const genPhone = () => `(${genInt(200, 999)}) ${genInt(200, 999)}-${genInt(1000, 9999)}`;
  const genEmail = () => `${pick(FIRST, rng).toLowerCase()}.${pick(LAST, rng).toLowerCase()}@${pick(DOMAINS, rng)}`;
  const genUrl = () => `https://${pick(["www.", ""], rng)}${pick(["app", "api", "cdn", "img", "dev"], rng)}.${pick(DOMAINS, rng)}${pick(["", "/v1", "/users", "/products", "/search?q=test"], rng)}`;
  const genName = () => `${pick(FIRST, rng)} ${pick(LAST, rng)}`;
  const genLorem = (n = 12) => Array.from({ length: n }, () => pick(WORDS, rng)).join(" ");
  const regexCache = new Map();
  return () => {
    const row = {};
    for (const f of schema) {
      const t = f.type;
      if (t === "int") row[f.name] = genInt(+f.min || 0, +f.max || 100);
      else if (t === "float") row[f.name] = genFloat(+f.min || 0, +f.max || 1, +f.decimals || 2);
      else if (t === "bool") row[f.name] = genBool(+f.p || 0.5);
      else if (t === "date") { const s = new Date(f.start || "2020-01-01"), e = new Date(f.end || "2025-01-01"); const d = genDate(s, e); row[f.name] = (f.format || "iso") === "iso" ? d.toISOString() : d.toLocaleString(); }
      else if (t === "name") row[f.name] = genName();
      else if (t === "first") row[f.name] = pick(FIRST, rng);
      else if (t === "last") row[f.name] = pick(LAST, rng);
      else if (t === "email") row[f.name] = genEmail();
      else if (t === "url") row[f.name] = genUrl();
      else if (t === "uuid") row[f.name] = genUuid();
      else if (t === "ip") row[f.name] = genIP();
      else if (t === "phone") row[f.name] = genPhone();
      else if (t === "hex") row[f.name] = genHex();
      else if (t === "lorem") row[f.name] = genLorem(+f.words || 12);
      else if (t === "pick") { const opts = (f.options || "").split("|").filter(Boolean); row[f.name] = opts.length ? pick(opts, rng) : ""; }
      else if (t === "template") { const tpl = f.template || ""; row[f.name] = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => row[k] ?? ""); }
      else if (t === "regex") {
        const key = f.pattern + "__" + (f.flags || ""); let rx = regexCache.get(key);
        if (!rx) { try { rx = new RegExp(f.pattern, f.flags || ""); } catch { rx = null; } regexCache.set(key, rx); }
        row[f.name] = genFromRegex(f.pattern || ".{5,10}", f.flags || "", rng, { maxRepeat: +(f.maxRepeat || 8), preferLong: true });
      }
      else row[f.name] = "";
    }
    return row;
  };
}

const DinoLabsPluginsRegexDataLab = () => {
  const [pattern, setPattern] = useState(String.raw`^([A-Za-z]+)\s+(\d{2,4})-(\d{2})-(\d{2})$`);
  const [flags, setFlags] = useState("gmi");
  const [sample, setSample] = useState(`Alice 2025-09-01
Bob 2024-03-09
charlie 1999-12-31
ZED 20-01-01`);
  const [replaceWith, setReplaceWith] = useState("$1 :: $2/$3/$4");
  const [tests, setTests] = useState([{ id: uid(), text: "Alice 2025-09-01", expect: true }, { id: uid(), text: "foo", expect: false }]);
  const [perf, setPerf] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [explain, setExplain] = useState([]);
  const [passRate, setPassRate] = useState(null);
  const [seed, setSeed] = useState(1337);
  const [rowsN, setRowsN] = useState(50);
  const [schema, setSchema] = useState([
    { id: uid(), name: "id", type: "uuid" },
    { id: uid(), name: "name", type: "name" },
    { id: uid(), name: "email", type: "email" },
    { id: uid(), name: "signup", type: "date", start: "2022-01-01", end: "2025-12-31", format: "iso" },
    { id: uid(), name: "score", type: "int", min: 0, max: 100 },
    { id: uid(), name: "slug", type: "regex", pattern: "[a-z0-9-]{8,12}" },
  ]);
  const [dataPreview, setDataPreview] = useState([]);

  const rx = useMemo(() => { try { return new RegExp(pattern, flags); } catch { return null; } }, [pattern, flags]);
  const matchesHtml = useMemo(() => highlightMatches(sample, rx), [sample, rx]);
  const replaced = useMemo(() => replacePreview(sample, rx, replaceWith), [sample, rx, replaceWith]);

  useEffect(() => { setHazards(hazardHints(pattern)); setExplain(explainRegex(pattern)); }, [pattern]);

  useEffect(() => {
    if (!rx) { setPassRate(null); return; }
    let ok = 0, tot = tests.length;
    for (const t of tests) {
      try {
        const hit = new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : rx.flags + "g").test(t.text);
        if (!!hit === !!t.expect) ok++;
      } catch { }
    }
    setPassRate(ok / tot);
  }, [tests, rx]);

  useEffect(() => {
    const gen = makeGenerator(schema, seed);
    const rows = []; for (let i = 0; i < Math.min(rowsN, 200); i++) rows.push(gen());
    setDataPreview(rows);
  }, [schema, seed, rowsN]);

  const runPerf = () => {
    if (!rx) return;
    const samples = sample.split(/\r?\n/).filter(Boolean);
    const r = timeMatch(samples, rx, 50);
    setPerf(r);
  };

  const addField = (t = "name") => setSchema(s => [...s, { id: uid(), name: `field_${s.length + 1}`, type: t }]);
  const delField = (id) => setSchema(s => s.filter(f => f.id !== id));
  const setField = (id, k, v) => setSchema(s => s.map(f => f.id === id ? { ...f, [k]: v } : f));
  const insert = (frag) => setPattern(p => p + frag);

  const jsSnippet = `// JavaScript
  const rx = /${pattern.replace(/\//g, "\\/")}/${flags};
  const text = \`${sample.split("\n")[0] || ""}\`;
  `;

  const pySnippet = `# Python
  import re
  rx = re.compile(r"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}", re.${flags.includes("I") || flags.includes("i") ? "I" : ""}${flags.includes("M") || flags.includes("m") ? "|re.M" : ""}${flags.includes("S") || flags.includes("s") ? "|re.S" : ""})
  m = rx.findall(${JSON.stringify(sample.split("\\n")[0] || "")})
  print(m)
  `;

  const genSnippetJS = `// JS: generate ${rowsN} rows with seed ${seed}
  const schema = ${JSON.stringify(schema.map(({ id, ...f }) => f), null, 2)};
  `;

  const exportAll = async () => {
    const gen = makeGenerator(schema, seed);
    const rows = []; for (let i = 0; i < rowsN; i++) rows.push(gen());
    const files = [
      { name: "regex/pattern.txt", u8: strU8(`/${pattern}/${flags}`) },
      { name: "regex/tests.json", u8: strU8(JSON.stringify(tests, null, 2)) },
      { name: "regex/sample.txt", u8: strU8(sample) },
      { name: "regex/replacement.txt", u8: strU8(replaceWith) },
      { name: "data/schema.json", u8: strU8(JSON.stringify(schema, null, 2)) },
      { name: "data/preview.json", u8: strU8(JSON.stringify(rows.slice(0, 200), null, 2)) },
      { name: "data/all.json", u8: strU8(JSON.stringify(rows, null, 2)) },
      { name: "data/all.csv", u8: strU8(toCSV(rows)) },
      { name: "code/regex.js", u8: strU8(jsSnippet) },
      { name: "code/regex.py", u8: strU8(pySnippet) },
      { name: "code/generator.js", u8: strU8(genSnippetJS) },
      { name: "manifest.json", u8: strU8(JSON.stringify({ createdAt: new Date().toISOString(), pattern, flags, hazards, passRate, schema: schema.map(({ id, ...f }) => f), seed, rowsN }, null, 2)) }
    ];
    const zip = await buildZip(files);
    const url = URL.createObjectURL(zip);
    const a = document.createElement("a"); a.href = url; a.download = "regex-and-data-lab.zip"; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const CopyBtn = ({ text, children }) => {
    const [ok, setOk] = useState(false);
    return <button className={`dinolabsRegexLabBtn ${ok ? "ok" : ""}`} onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 900); } catch { } }}>
      <FontAwesomeIcon icon={faCopy} /> <small>{ok ? "Copied." : children}</small>
    </button>;
  };

  const DinolabsRegexLabField = ({ label, children }) => (
    <div className="dinolabsRegexLabField">
      <div className="dinolabsRegexLabSchemaLabel">{label}</div>
      {children}
    </div>
  );

  return (
    <div className="dinolabsRegexLabApp" tabIndex={0}>
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsRegexLabContainer">
        <aside className="dinolabsRegexLabSidebar">
          <section className="dinolabsRegexLabSection">
            <header className="dinolabsRegexLabSectionTitle"><FontAwesomeIcon icon={faCircleHalfStroke} /><span>Regex And Test-Data Builder</span></header>

            <div className="dinolabsRegexLabField">
              <label><FontAwesomeIcon icon={faKeyboard} /> Pattern</label>
              <input className="dinolabsRegexLabInput mono" value={pattern} onChange={(e) => setPattern(e.target.value)} />
            </div>

            <div className="dinolabsRegexLabField">
              <label><FontAwesomeIcon icon={faFlag} /> Flags</label>
              <div className="dinolabsRegexLabChips">
                {["g", "i", "m", "s", "u", "y"].map(f => (
                  <button key={f} className={`dinolabsRegexLabChip ${flags.includes(f) ? "on" : ""}`} onClick={() => setFlags(toggleFlag(flags, f))}>{f}</button>
                ))}
                <button className="dinolabsRegexLabChip subtle" onClick={() => { setFlags(""); }}><FontAwesomeIcon icon={faEraser} /> Clear</button>
              </div>
            </div>

            <section className="dinolabsRegexLabSection inner">
              <header className="dinolabsRegexLabMini"><FontAwesomeIcon icon={faWandMagicSparkles} /> Visual Composer</header>
              <div className="dinolabsRegexLabChips">
                {[".", "\\d", "\\w", "\\s", "[A-Za-z]", "[0-9]", "^", "$", "|", "()", "(?:)", "?", "+", "*", "{2,5}"].map((t) => (
                  <button key={t} className="dinolabsRegexLabChip" onClick={() => insert(t)}>{t}</button>
                ))}
                <button className="dinolabsRegexLabChip subtle" onClick={() => setPattern(escapeRegex(pattern))}><FontAwesomeIcon icon={faShield} /> Escape</button>
              </div>
              <div className="dinolabsRegexLabChips">
                {[
                  ["Email", "^[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}$"],
                  ["URL", "^https?://[\\w.-]+(?:/[\\w./%-]*)?$"],
                  ["UUID", "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"],
                  ["IPv4", "^(?:\\d{1,3}\\.){3}\\d{1,3}$"],
                  ["Hex", "^#?[0-9a-fA-F]{6}$"],
                  ["ISO Date", "^\\d{4}-\\d{2}-\\d{2}$"],
                  ["US Phone", "^\\(\\d{3}\\) \\d{3}-\\d{4}$"]
                ].map(([label, pat]) => (
                  <button key={label} className="dinolabsRegexLabChip" onClick={() => setPattern(pat)}>{label}</button>
                ))}
              </div>
            </section>

            <section className="dinolabsRegexLabSection">
              <header className="dinolabsRegexLabSectionTitle"><FontAwesomeIcon icon={faFileExport} /><span>Export</span></header>
              <div className="dinolabsRegexLabRow">
                <button className="dinolabsRegexLabBtn" onClick={exportAll}><FontAwesomeIcon icon={faDownload} /><small>Bundle Zip</small></button>
                <CopyBtn text={`/${pattern}/${flags}`}>Copy Pattern And Flags</CopyBtn>
                <CopyBtn text={jsSnippet}>Copy JavaScript</CopyBtn>
                <CopyBtn text={pySnippet}>Copy Python</CopyBtn>
              </div>
            </section>
          </section>
        </aside>

        <main className="dinolabsRegexLabMain">
          <section className="dinolabsRegexLabCard">
            <header className="dinolabsRegexLabCardTitle"><FontAwesomeIcon icon={faHighlighter} /><span>Regex Tester</span></header>
            <div className="dinolabsRegexLabGrid2">
              <div className="dinolabsRegexLabField">
                <label>Sample Text</label>
                <textarea className="dinolabsRegexLabTextarea" rows={10} value={sample} onChange={(e) => setSample(e.target.value)} />
              </div>
              <div className="dinolabsRegexLabField">
                <label>Matched With Highlighting</label>
                <div className="dinolabsRegexLabPreview" dangerouslySetInnerHTML={{ __html: matchesHtml }} />
              </div>
            </div>

            <div className="dinolabsRegexLabGrid2">
              <div className="dinolabsRegexLabField">
                <label>Replace (Supports $1, $2…).</label>
                <input className="dinolabsRegexLabInput mono" value={replaceWith} onChange={(e) => setReplaceWith(e.target.value)} />
                <div className="dinolabsRegexLabReplace">{replaced}</div>
              </div>
              <div className="dinolabsRegexLabField">
                <label><FontAwesomeIcon icon={faBug} /> Test Cases</label>
                <div className="dinolabsRegexLabTests">
                  {tests.map(t => (
                    <div key={t.id} className={`dinolabsRegexLabTest ${rx ? (new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : rx.flags + "g").test(t.text) === !!t.expect ? "ok" : "bad") : ""}`}>
                      <input className="dinolabsRegexLabInput" value={t.text} onChange={(e) => setTests(s => s.map(x => x.id === t.id ? { ...x, text: e.target.value } : x))} />
                      <select className="dinolabsRegexLabInput small" value={t.expect ? "yes" : "no"} onChange={(e) => setTests(s => s.map(x => x.id === t.id ? { ...x, expect: e.target.value === "yes" } : x))}>
                        <option value="yes">Should Match</option>
                        <option value="no">Should Not</option>
                      </select>
                      <button className="dinolabsRegexLabBtn tiny" onClick={() => setTests(s => s.filter(x => x.id !== t.id))}><FontAwesomeIcon icon={faTrash} /> <small>Delete</small></button>
                    </div>
                  ))}
                  <button className="dinolabsRegexLabBtn tiny" onClick={() => setTests(s => [{ id: uid(), text: "", expect: true }, ...s])}><FontAwesomeIcon icon={faPlus} /> Add Test</button>
                </div>
                <div className="dinolabsRegexLabRow wrap">
                  <div className="dinolabsRegexLabChipStat"><div className="dinolabsRegexLabChipValue">{passRate != null ? fmtPct(passRate) : "—"}</div><div className="dinolabsRegexLabChipLabel">Pass Rate</div></div>
                </div>
              </div>
            </div>

            <div className="dinolabsRegexLabRow wrap">
              <button className="dinolabsRegexLabBtn" onClick={runPerf}><FontAwesomeIcon icon={faStopwatch} /> Run Perf (×50)</button>
              {perf && (<>
                <div className="dinolabsRegexLabChipStat"><div className="dinolabsRegexLabChipValue">{perf.total}</div><div className="dinolabsRegexLabChipLabel">Matches</div></div>
                <div className="dinolabsRegexLabChipStat"><div className="dinolabsRegexLabChipValue">{perf.ms.toFixed(1)}</div><div className="dinolabsRegexLabChipLabel">Time (ms)</div></div>
              </>)}
              <div className="dinolabsRegexLabSpacer" />
              <button className="dinolabsRegexLabBtn subtle" onClick={() => { setPattern(""); setSample(""); }}><FontAwesomeIcon icon={faBroom} /> Clear</button>
            </div>

            <div className="dinolabsRegexLabHints">
              <div className="dinolabsRegexLabHintTitle"><FontAwesomeIcon icon={faShield} /> Safety</div>
              {hazards.length ? hazards.map((h, i) => <div className="dinolabsRegexLabHint" key={i}>• {h}</div>) : <div className="dinolabsRegexLabHint">No obvious red flags detected.</div>}
              <div className="dinolabsRegexLabHintTitle"><FontAwesomeIcon icon={faDiagramNext} /> Explain</div>
              <ul className="dinolabsRegexLabExplain">{explain.map((e, i) => <li key={i}><code>{e}</code></li>)}</ul>
            </div>
          </section>

          <section className="dinolabsRegexLabCard">
            <header className="dinolabsRegexLabCardTitle"><FontAwesomeIcon icon={faCubes} /><span>Synthetic Data Generator</span></header>

            <div className="dinolabsRegexLabRow wrap">
              <div className="dinolabsRegexLabField small">
                <label>Seed</label>
                <input className="dinolabsRegexLabInput" type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value || "0", 10))} />
              </div>
              <div className="dinolabsRegexLabField small">
                <label>Rows</label>
                <input className="dinolabsRegexLabInput" type="number" min={1} max={1000000} value={rowsN} onChange={(e) => setRowsN(parseInt(e.target.value || "0", 10))} />
              </div>
              <button className="dinolabsRegexLabBtn" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}><FontAwesomeIcon icon={faShuffle} /> Shuffle Seed</button>
            </div>

            <div className="dinolabsRegexLabSchema">
              <div className="dinolabsRegexLabSchemaHeader">
                <div>Name</div>
                <div>Type</div>
                <div>Options</div>
                <div></div>
              </div>

              {schema.map(f => (
                <div className="dinolabsRegexLabSchemaCard" key={f.id}>
                  <div className="dinolabsRegexLabSchemaMain">
                    <DinolabsRegexLabField label="Field Name">
                      <input
                        className="dinolabsRegexLabInput"
                        value={f.name}
                        onChange={(e) => setField(f.id, "name", e.target.value)}
                      />
                    </DinolabsRegexLabField>

                    <DinolabsRegexLabField label="Field Type">
                      <select
                        className="dinolabsRegexLabInput"
                        value={f.type}
                        onChange={(e) => setField(f.id, "type", e.target.value)}
                      >
                        {["uuid", "name", "first", "last", "email", "url", "ip", "phone", "hex", "date", "int", "float", "bool", "lorem", "pick", "template", "regex"].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </DinolabsRegexLabField>
                  </div>

                  <div className="dinolabsRegexLabSchemaOptions">
                    {f.type === "int" && (
                      <>
                        <DinolabsRegexLabField label="Min">
                          <input className="dinolabsRegexLabInput" value={f.min ?? 0} onChange={(e) => setField(f.id, "min", e.target.value)} />
                        </DinolabsRegexLabField>
                        <DinolabsRegexLabField label="Max">
                          <input className="dinolabsRegexLabInput" value={f.max ?? 100} onChange={(e) => setField(f.id, "max", e.target.value)} />
                        </DinolabsRegexLabField>
                      </>
                    )}

                    {f.type === "float" && (
                      <>
                        <DinolabsRegexLabField label="Min">
                          <input className="dinolabsRegexLabInput" value={f.min ?? 0} onChange={(e) => setField(f.id, "min", e.target.value)} />
                        </DinolabsRegexLabField>
                        <DinolabsRegexLabField label="Max">
                          <input className="dinolabsRegexLabInput" value={f.max ?? 1} onChange={(e) => setField(f.id, "max", e.target.value)} />
                        </DinolabsRegexLabField>
                        <DinolabsRegexLabField label="Decimals">
                          <input className="dinolabsRegexLabInput" value={f.decimals ?? 2} onChange={(e) => setField(f.id, "decimals", e.target.value)} />
                        </DinolabsRegexLabField>
                      </>
                    )}

                    {f.type === "bool" && (
                      <DinolabsRegexLabField label="Probability (True)">
                        <input className="dinolabsRegexLabInput" value={f.p ?? 0.5} onChange={(e) => setField(f.id, "p", e.target.value)} />
                      </DinolabsRegexLabField>
                    )}

                    {f.type === "date" && (
                      <>
                        <DinolabsRegexLabField label="Start">
                          <input className="dinolabsRegexLabInput" value={f.start || "2022-01-01"} onChange={(e) => setField(f.id, "start", e.target.value)} />
                        </DinolabsRegexLabField>
                        <DinolabsRegexLabField label="End">
                          <input className="dinolabsRegexLabInput" value={f.end || "2025-12-31"} onChange={(e) => setField(f.id, "end", e.target.value)} />
                        </DinolabsRegexLabField>
                        <DinolabsRegexLabField label="Format">
                          <select className="dinolabsRegexLabInput" value={f.format || "iso"} onChange={(e) => setField(f.id, "format", e.target.value)}>
                            <option value="iso">ISO</option>
                            <option value="local">Local</option>
                          </select>
                        </DinolabsRegexLabField>
                      </>
                    )}

                    {f.type === "pick" && (
                      <DinolabsRegexLabField label="Options (Use “|”)">
                        <input className="dinolabsRegexLabInput" value={f.options || "A|B|C"} onChange={(e) => setField(f.id, "options", e.target.value)} />
                      </DinolabsRegexLabField>
                    )}

                    {f.type === "template" && (
                      <DinolabsRegexLabField label="Template">
                        <input className="dinolabsRegexLabInput" placeholder="Hello {{name}}" value={f.template || ""} onChange={(e) => setField(f.id, "template", e.target.value)} />
                      </DinolabsRegexLabField>
                    )}

                    {f.type === "regex" && (
                      <>
                        <DinolabsRegexLabField label="Pattern">
                          <input className="dinolabsRegexLabInput mono" value={f.pattern || ""} onChange={(e) => setField(f.id, "pattern", e.target.value)} />
                        </DinolabsRegexLabField>
                        <DinolabsRegexLabField label="Flags">
                          <input className="dinolabsRegexLabInput mono" value={f.flags || ""} onChange={(e) => setField(f.id, "flags", e.target.value)} />
                        </DinolabsRegexLabField>
                        <DinolabsRegexLabField label="Max Repeat">
                          <input className="dinolabsRegexLabInput" value={f.maxRepeat ?? 8} onChange={(e) => setField(f.id, "maxRepeat", e.target.value)} />
                        </DinolabsRegexLabField>
                      </>
                    )}
                  </div>

                  <div className="dinolabsRegexLabSchemaActions">
                    <button className="dinolabsRegexLabBtn danger tiny" onClick={() => delField(f.id)}>Delete</button>
                  </div>
                </div>
              ))}

              <div className="dinolabsRegexLabSchemaFooter">
                <button className="dinolabsRegexLabBtn tiny" onClick={() => addField("name")}>Add Name</button>
                <button className="dinolabsRegexLabBtn tiny" onClick={() => addField("regex")}>Add Regex</button>
                <button className="dinolabsRegexLabBtn tiny" onClick={() => addField("int")}>Add Int</button>
              </div>
            </div>

            <div className="dinolabsRegexLabTableWrap">
              <table className="dinolabsRegexLabTable">
                <thead><tr>{dataPreview[0] ? Object.keys(dataPreview[0]).map(h => <th key={h}>{h}</th>) : null}</tr></thead>
                <tbody>
                  {dataPreview.slice(0, 200).map((r, ri) => (
                    <tr key={ri}>{Object.keys(r).map(k => <td key={k} className="mono">{String(r[k])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dinolabsRegexLabRow wrap">
              <CopyBtn text={toCSV(dataPreview)}>Copy CSV</CopyBtn>
              <CopyBtn text={JSON.stringify(dataPreview, null, 2)}>Copy JSON</CopyBtn>
              <button className="dinolabsRegexLabBtn" onClick={exportAll}><FontAwesomeIcon icon={faFileExport} /> Export Bundle</button>
            </div>
          </section>

          <section className="dinolabsRegexLabCard">
            <header className="dinolabsRegexLabCardTitle"><FontAwesomeIcon icon={faFileCode} /><span>Code Snippets</span></header>
            <div className="dinolabsRegexLabGrid2">
              <div className="dinolabsRegexLabSnippet"><div className="dinolabsRegexLabSnippetTitle">JavaScript</div><pre className="dinolabsRegexLabPre">{jsSnippet}</pre></div>
              <div className="dinolabsRegexLabSnippet"><div className="dinolabsRegexLabSnippetTitle">Python</div><pre className="dinolabsRegexLabPre">{pySnippet}</pre></div>
            </div>
            <div className="dinolabsRegexLabSnippet"><div className="dinolabsRegexLabSnippetTitle">JS Generator</div><pre className="dinolabsRegexLabPre">{genSnippetJS}</pre></div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DinoLabsPluginsRegexDataLab;
