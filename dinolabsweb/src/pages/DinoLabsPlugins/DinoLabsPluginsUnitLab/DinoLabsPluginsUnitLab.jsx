import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalculator,
  faCopy,
  faDeleteLeft,
  faDownload,
  faChevronRight,
  faArrowRotateRight,
  faScaleBalanced,
  faFlaskVial,
  faRoad,
  faCode,
  faLink
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/DinoLabsNav";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsUnitLab/DinoLabsPluginsUnitLab.css";

const DV = (L=0,M=0,T=0,I=0,Th=0,N=0,J=0) => [L,M,T,I,Th,N,J];
const ZERO = DV();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const almostEq = (a, b, eps=1e-12) => Math.abs(a-b) < eps;
const sameDim = (a, b) => a.length === b.length && a.every((v,i)=>almostEq(v,b[i]));
const addDim  = (a,b)=>a.map((v,i)=>v+b[i]);
const mulDim  = (a,k)=>a.map(v=>v*k);
const roundNice = (x) => {
  if (!isFinite(x)) return String(x);
  const s = Math.abs(x) >= 1e6 || (Math.abs(x) < 1e-4 && x !== 0)
    ? x.toExponential(6)
    : x.toFixed(6);
  return s.replace(/\.?0+($|e)/i, "$1");
};

const PREFIXES = [
  {k:"Y", f:1e24}, {k:"Z", f:1e21}, {k:"E", f:1e18}, {k:"P", f:1e15}, {k:"T", f:1e12},
  {k:"G", f:1e9},  {k:"M", f:1e6},  {k:"k", f:1e3},  {k:"h", f:1e2},  {k:"da", f:1e1},
  {k:"d", f:1e-1}, {k:"c", f:1e-2}, {k:"m", f:1e-3}, {k:"u", f:1e-6}, {k:"μ", f:1e-6},
  {k:"n", f:1e-9}, {k:"p", f:1e-12}, {k:"f", f:1e-15}
];

const UNITS = (() => {
  const U = [];
  const push = (names, dim, toSI, opts={}) => {
    U.push({ names, dim, toSI, allowPrefix: !!opts.allowPrefix, offset: opts.offset||0, isTemp: !!opts.isTemp, isDeltaTemp: !!opts.isDeltaTemp });
  };
  push(["m","meter","metre"], DV(1), 1, {allowPrefix:true});
  push(["s","sec","second"], DV(0,0,1), 1, {allowPrefix:true});
  push(["kg","kilogram"], DV(0,1), 1);
  push(["g","gram"], DV(0,1), 1e-3, {allowPrefix:true});
  push(["A","amp","ampere"], DV(0,0,0,1), 1);
  push(["K","kelvin"], DV(0,0,0,0,1), 1, {isTemp:true});
  push(["mol"], DV(0,0,0,0,0,1), 1);
  push(["cd"], DV(0,0,0,0,0,0,1), 1);
  push(["rad"], ZERO, 1);
  push(["deg","°"], ZERO, Math.PI/180);
  push(["min","minute"], DV(0,0,1), 60);
  push(["h","hr","hour"], DV(0,0,1), 3600);
  push(["day","d"], DV(0,0,1), 86400);
  push(["in","inch"], DV(1), 0.0254);
  push(["ft","foot","feet"], DV(1), 0.3048);
  push(["yd","yard"], DV(1), 0.9144);
  push(["mi","mile"], DV(1), 1609.344);
  push(["nmi","nautmi","nauticalmile"], DV(1), 1852);
  push(["L","l","liter","litre"], DV(3), 1e-3, {allowPrefix:true});
  push(["lb","pound","lbm"], DV(0,1), 0.45359237);
  push(["oz","ounce"], DV(0,1), 0.028349523125);
  push(["t","tonne","metricton"], DV(0,1), 1000);
  push(["N","newton"], addDim(DV(1,1,-2), ZERO), 1);
  push(["lbf","poundforce"], addDim(DV(1,1,-2), ZERO), 4.4482216152605);
  push(["Pa","pascal"], addDim(DV(-1,1,-2), ZERO), 1);
  push(["kPa"], addDim(DV(-1,1,-2), ZERO), 1e3);
  push(["bar"], addDim(DV(-1,1,-2), ZERO), 1e5);
  push(["atm"], addDim(DV(-1,1,-2), ZERO), 101325);
  push(["psi"], addDim(DV(-1,1,-2), ZERO), 6894.757293168);
  push(["J","joule"], addDim(DV(2,1,-2), ZERO), 1);
  push(["cal"], addDim(DV(2,1,-2), ZERO), 4.184);
  push(["kWh"], addDim(DV(2,1,-3), ZERO), 3.6e6);
  push(["BTU","btu"], addDim(DV(2,1,-2), ZERO), 1055.05585262);
  push(["W","watt"], addDim(DV(2,1,-3), ZERO), 1);
  push(["hp"], addDim(DV(2,1,-3), ZERO), 745.699871582);
  push(["VA","voltampere"], addDim(DV(2,1,-3), ZERO), 1);
  push(["var"], addDim(DV(2,1,-3), ZERO), 1);
  push(["V","volt"], addDim(DV(2,1,-3,-1), ZERO), 1);
  push(["C","coulomb"], addDim(DV(0,0,1,1), ZERO), 1);
  push(["ohm","Ω"], addDim(DV(2,1,-3,-2), ZERO), 1);
  push(["S","siemens"], addDim(DV(-2,-1,3,2), ZERO), 1);
  push(["Hz","hertz"], addDim(DV(0,0,-1), ZERO), 1, {allowPrefix:true});
  push(["F","farad"], addDim(DV(-2,-1,4,2), ZERO), 1);
  push(["H","henry"], addDim(DV(2,1,-2,-2), ZERO), 1);
  push(["Wb","weber"], addDim(DV(2,1,-2,-1), ZERO), 1);
  push(["T","tesla"], addDim(DV(0,1,-2,-1), ZERO), 1);
  push(["G","gauss"], addDim(DV(0,1,-2,-1), ZERO), 1e-4);
  push(["Ah","amperehour","ampHour"], addDim(DV(0,0,1,1), ZERO), 3600);
  push(["b","bit"], ZERO, 1, {allowPrefix:true});
  push(["B","byte"], ZERO, 8, {allowPrefix:true});
  push(["KiB"], ZERO, 8192);
  push(["MiB"], ZERO, 8*1024*1024);
  push(["GiB"], ZERO, 8*1024*1024*1024);
  push(["TiB"], ZERO, 8*1024*1024*1024*1024);
  push(["PiB"], ZERO, 8*1024*1024*1024*1024*1024);
  push(["°C","degC"], DV(0,0,0,0,1), 1, { isTemp:true, offset:273.15 });
  push(["°F","degF"], DV(0,0,0,0,1), 5/9, { isTemp:true, offset:255.37222222222223 });
  push(["deltaC","dC"], DV(0,0,0,0,1), 1, { isDeltaTemp:true });
  push(["deltaF","dF"], DV(0,0,0,0,1), 5/9, { isDeltaTemp:true });
  push(["gal","gallon"], DV(3), 0.003785411784);
  push(["qt","quart"], DV(3), 0.000946352946);
  push(["pt","pint"], DV(3), 0.000473176473);
  push(["cup"], DV(3), 0.0002365882365);
  push(["floz","fl_oz"], DV(3), 2.95735295625e-5);
  push(["lpm","LPM"], addDim(DV(3), mulDim(DV(0,0,1), -1)), 1e-3/60);
  push(["gpm","GPM"], addDim(DV(3), mulDim(DV(0,0,1), -1)), 0.003785411784/60);
  push(["cfm","CFM"], addDim(DV(3), mulDim(DV(0,0,1), -1)), Math.pow(0.3048,3)/60);
  return U;
})();

const ALL_UNIT_NAMES = Array.from(new Set(UNITS.flatMap(u => u.names)));
const SUGGESTION_BONUS = [
  "m/s","m/s^2","km/h","L/s","L/min","m^3/s","m^3/h","Pa","kPa","bar","atm","psi","J","kJ","MJ","kWh","W","kW","MW","hp","T","G","F","H","S","ohm","Ω","KiB","MiB","GiB","TiB","PiB"
];

const findUnit = (raw) => {
  const token = raw.trim();
  for (const u of UNITS) {
    if (u.names.some(n => n.toLowerCase() === token.toLowerCase())) return { ...u, label: token };
  }
  for (const u of UNITS) {
    if (!u.allowPrefix) continue;
    for (const p of PREFIXES) {
      if (token.startsWith(p.k) && token.length > p.k.length) {
        const tail = token.slice(p.k.length);
        if (u.names.some(n => n.toLowerCase() === tail.toLowerCase())) {
          return { ...u, toSI: u.toSI * p.f, label: token };
        }
      }
    }
  }
  return null;
};

const normalizeInput = (s) => {
  let x = s.replace(/×|·/g, "*").replace(/÷/g, "/");
  x = x.replace(/to|→/gi, "->");
  x = x.replace(/\s*([\/*+\-^()])\s*/g, "$1");
  x = x.replace(/([0-9.)A-Za-z°μΩ]+)\s+(?=[(A-Za-z°μΩ])/g, "$1*");
  x = x.replace(/\s+/g, " ");
  return x.trim();
};

const splitTarget = (s) => {
  const idx = s.indexOf("->");
  if (idx === -1) return { left: s.trim(), target: "" };
  return { left: s.slice(0, idx).trim(), target: s.slice(idx + 2).trim() };
};

const isNumber = (t) => /^(\d+(\.\d+)?|\.\d+)(e[+\-]?\d+)?$/i.test(t);

const tokenize = (s) => {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " ") { i++; continue; }
    if ("*/^()".includes(ch)) { out.push(ch); i++; continue; }
    const num = s.slice(i).match(/^(\d+(\.\d+)?|\.\d+)(e[+\-]?\d+)?/i);
    if (num) { out.push(num[0]); i += num[0].length; continue; }
    const unit = s.slice(i).match(/^[A-Za-z°μΩ_]+/);
    if (unit) { out.push(unit[0]); i += unit[0].length; continue; }
    throw new Error(`Unexpected Token At “${s.slice(i, i+8)}...”.`);
  }
  return out;
};

const toRPN = (tokens) => {
  const prec = {"^":4,"*":3,"/":3};
  const rightAssoc = {"^":true};
  const out = [];
  const op = [];
  for (let i=0;i<tokens.length;i++){
    const t = tokens[i];
    if (t === "(") { op.push(t); continue; }
    if (t === ")") { while (op.length && op[op.length-1] !== "(") out.push(op.pop()); if (!op.length) throw new Error("Mismatched Parentheses."); op.pop(); continue; }
    if (["*","/","^"].includes(t)) {
      while (op.length) {
        const top = op[op.length-1];
        if (!["*","/","^"].includes(top)) break;
        if ((!rightAssoc[t] && prec[t] <= prec[top]) || (rightAssoc[t] && prec[t] < prec[top])) out.push(op.pop()); else break;
      }
      op.push(t); continue;
    }
    out.push(t);
    const next = tokens[i+1];
    if (next && (isNumber(next) || /^[A-Za-z°μΩ_]+$/.test(next) || next === "(")) {
      if (t !== ")" && next !== ")" && next !== "^" && next !== "*" && next !== "/") {
        op.push("*");
      }
    }
  }
  while (op.length) {
    const t = op.pop();
    if (t === "(" || t === ")") throw new Error("Mismatched Parentheses.");
    out.push(t);
  }
  return out;
};

const quantityMul = (a,b)=>({ value: a.value*b.value, dim: addDim(a.dim,b.dim) });
const quantityDiv = (a,b)=>({ value: a.value/b.value, dim: addDim(a.dim, mulDim(b.dim, -1)) });
const quantityPow = (a,p)=>({ value: Math.pow(a.value,p), dim: mulDim(a.dim, p) });
const makeNumberQ = (n)=>({ value: n, dim: ZERO });
const makeUnitQ = (u)=>({ value: u.toSI, dim: u.dim });

const evaluateRPN = (rpn, {temperatureModeCheck=true}={}) => {
  const st = [];
  let containsOperator = false;
  for (let i=0;i<rpn.length;i++){
    const t = rpn[i];
    if (isNumber(t)) { st.push(makeNumberQ(Number(t))); continue; }
    if (["*","/","^"].includes(t)) {
      containsOperator = true;
      if (t === "^") {
        const p = st.pop(); const a = st.pop();
        if (!p || !a) throw new Error("Invalid Exponent Expression.");
        if (!almostEq(p.dim.reduce((s,x)=>s+Math.abs(x),0),0)) throw new Error("Exponent Must Be Dimensionless.");
        st.push(quantityPow(a, p.value));
      } else {
        const b = st.pop(); const a = st.pop();
        if (!a || !b) throw new Error("Invalid Expression.");
        st.push(t==="*" ? quantityMul(a,b) : quantityDiv(a,b));
      }
      continue;
    }
    const u = findUnit(t);
    if (!u) throw new Error(`Unknown Unit “${t}”.`);
    st.push(makeUnitQ(u));
  }
  if (st.length !== 1) throw new Error("Malformed Expression.");
  const q = st[0];
  if (temperatureModeCheck) {
    const hasAbsoluteTempUnit = rpn.some(tok => {
      const u = findUnit(tok); return u && u.isTemp && !u.isDeltaTemp;
    });
    if (hasAbsoluteTempUnit && containsOperator) {
      throw new Error("Absolute Temperatures Cannot Be Mixed In Arithmetic. Use K For Math Or deltaC/deltaF For Differences.");
    }
  }
  return q;
};

const evaluateUnitExpression = (s) => {
  const t = tokenize(s);
  if (t.some(isNumber)) throw new Error("Target Must Be A Unit Expression.");
  return evaluateRPN(toRPN(t), {temperatureModeCheck:false});
};

const convertAbsoluteTemperature = (value, fromName, toName) => {
  const f = (name, x) => {
    const u = findUnit(name);
    if (!u || !u.isTemp) throw new Error("Not A Temperature.");
    if (name.toLowerCase().includes("degf") || name.includes("°F")) {
      return (x + 459.67) * 5/9;
    } else if (name.toLowerCase().includes("degc") || name.includes("°C")) {
      return x + 273.15;
    } else {
      return x;
    }
  };
  const g = (name, K) => {
    if (name.toLowerCase().includes("degf") || name.includes("°F")) {
      return K * 9/5 - 459.67;
    } else if (name.toLowerCase().includes("degc") || name.includes("°C")) {
      return K - 273.15;
    } else {
      return K;
    }
  };
  return g(toName, f(fromName, value));
};

const powMap = (map, p) => {
  const exp = typeof p === "number" ? p : (p?.value ?? 1);
  const out = new Map();
  for (const [k, v] of (map || new Map()).entries()) out.set(k, v * exp);
  return out;
};

const mergeMap = (A, B, op) => {
  const out = new Map(A || new Map());
  for (const [k, v] of (B || new Map()).entries()) {
    out.set(k, (out.get(k) || 0) + (op === "*" ? v : -v));
  }
  return out;
};

const unitStrip = (unitExpr) => {
  const rpn = toRPN(tokenize(unitExpr));
  const st = []; 

  for (const t of rpn) {
    if (isNumber(t)) {
      st.push({ map: new Map(), value: Number(t) });
      continue;
    }
    if (t === "^") {
      const p = st.pop();
      const a = st.pop();
      if (!a) { st.push({ map: new Map() }); continue; }
      st.push({ map: powMap(a.map, p) });
      continue;
    }
    if (t === "*" || t === "/") {
      const b = st.pop() || { map: new Map() };
      const a = st.pop() || { map: new Map() };
      st.push({ map: mergeMap(a.map, b.map, t) });
      continue;
    }
    if (t !== "(" && t !== ")") {
      const u = findUnit(t);
      if (u) {
        const m = new Map();
        m.set(u.names[0], 1);
        st.push({ map: m });
      }
    }
  }

  const finalMap = st.reduce((acc, cur) => mergeMap(acc, cur.map, "*"), new Map());

  const num = [];
  const den = [];
  for (const [k, v] of finalMap.entries()) {
    if (v > 0) num.push(v === 1 ? k : `${k}^${v}`);
    if (v < 0) den.push(v === -1 ? k : `${k}^{${-v}}`);
  }
  return { num, den };
};

const INLINE_FROM_STRIP = ({num, den}) => {
  const join = (arr)=>arr.join("·");
  if (!num.length && !den.length) return "";
  if (!den.length) return join(num);
  return `${join(num)}/${join(den)}`;
};

const FRACTION_LATEX_FROM_STRIP = ({num, den}) => {
  const fix = (t)=>t.replaceAll("^","^{") + (t.includes("^")? "}": "");
  const left = num.length? num.map(fix).join("\\cdot "): "1";
  const right = den.length? den.map(fix).join("\\cdot "): "1";
  if (right === "1") return left;
  return `\\frac{${left}}{${right}}`;
};

const pickBestUnit = (valueSI, candidates) => {
  for (const u of candidates) {
    try {
      const q = evaluateUnitExpression(u);
      const v = valueSI / q.value;
      if (Math.abs(v) >= 0.1 && Math.abs(v) < 1000) return {unit:u, value:v};
    } catch {}
  }
  if (candidates.length) {
    const q = evaluateUnitExpression(candidates[0]);
    return { unit: candidates[0], value: valueSI / q.value };
  }
  return { unit: "", value: valueSI };
};

const chooseAutoUnit = (dim) => {
  if (sameDim(dim, DV(1))) return { unit: "m", table:["mm","cm","m","km"] };
  if (sameDim(dim, DV(0,0,1))) return { unit: "s", table:["ms","s","min","h"] };
  if (sameDim(dim, DV(0,1))) return { unit: "kg", table:["g","kg","t"] };
  if (sameDim(dim, addDim(DV(1), mulDim(DV(0,0,1),-1)))) {
    return { unit: "m/s", table:["m/s","km/h"] };
  }
  if (sameDim(dim, addDim(DV(-1,1,-2), ZERO))) {
    return { unit: "Pa", table:["Pa","kPa","bar","atm","psi"] };
  }
  if (sameDim(dim, DV(3))) {
    return { unit: "m^3", table:["m^3","L","mL"] };
  }
  if (sameDim(dim, addDim(DV(3), mulDim(DV(0,0,1), -1)))) {
    return { unit: "m^3/s", table:["m^3/s","L/s","L/min","m^3/h","lpm","gpm","cfm"] };
  }
  if (sameDim(dim, addDim(DV(2,1,-2), ZERO))) {
    return { unit: "J", table:["J","kJ","MJ","kWh","cal","BTU"] };
  }
  if (sameDim(dim, addDim(DV(2,1,-3), ZERO))) {
    return { unit: "W", table:["W","kW","MW","hp","VA","var"] };
  }
  return { unit: "", table:[] };
};

const dimToString = (dim) => {
  const labels = ["m","kg","s","A","K","mol","cd"];
  const parts = dim.map((e,i)=> e!==0 ? `${labels[i]}${e===1? "": `^${e}`}` : null).filter(Boolean);
  return parts.length ? parts.join("·") : "—";
};

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

const DinoLabsPluginsUnitLab = () => {
  const [expr, setExpr] = useState("3.5 ft/s -> km/h");
  const [resultStr, setResultStr] = useState("");
  const [unitStripView, setUnitStripView] = useState({num:[],den:[]});
  const [formatMode, setFormatMode] = useState("fraction");
  const [steps, setSteps] = useState([]);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [copied, setCopied] = useState({}); 
  const inputRef = useRef(null);

  const markCopied = useCallback((key) => {
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  }, []);

  const handleCopy = useCallback(async (text, key) => {
    const ok = await writeClipboard(text || "");
    if (ok) markCopied(key);
  }, [markCopied]);

  useEffect(()=>{
    inputRef.current?.focus();
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("expr");
      if (q) setExpr(q);
    } catch {}
  },[]);

  const quickies = [
    "12 in -> cm",
    "5 km -> mi",
    "65 mi/h -> m/s",
    "500 kPa -> atm",
    "2 L -> cup",
    "250 W * 3 h -> kWh",
    "9.81 m/s^2 * 2.2 s -> m/s",
    "32 °F -> °C",
    "10 deltaC -> K",
    "2000 MiB -> GB",
    "3 m^3/h -> L/min",
    "1 T -> G",
    "500 W -> hp",
    "100 lpm -> m^3/h",
    "3.5 ft/s -> km/h",
    "3.5 ft/s * 2 h -> km"
  ];

  const refreshSuggestions = useCallback((s) => {
    const norm = normalizeInput(s);
    const m = norm.match(/([A-Za-z°μΩ_]+)$/);
    thead: {
      const head = m?.[1] || "";
      if (!head) { setSuggestions([]); break thead; }
      const hay = [...ALL_UNIT_NAMES, ...SUGGESTION_BONUS];
      const list = hay.filter(n => n.toLowerCase().includes(head.toLowerCase())).slice(0, 10);
      setSuggestions(list);
    }
  },[]);

  const applySuggestion = (text) => {
    const norm = normalizeInput(expr);
    const m = norm.match(/^(.*?)([A-Za-z°μΩ_]+)?$/);
    const before = m ? (m[1] || "") : norm;
    const next = (before + text).trim();
    setExpr(next);
    setShowSuggest(false);
    setTimeout(()=>inputRef.current?.focus(), 0);
  };

  const evaluate = useCallback(() => {
    try {
      const normalized = normalizeInput(expr);
      const { left, target } = splitTarget(normalized);
      const tokens = tokenize(left);
      const rpn = toRPN(tokens);
      const q = evaluateRPN(rpn);
      const unitTokens = tokens.filter(t=>/^[A-Za-z°μΩ_]+$/.test(t));
      const dataTokens = ["b","B","KiB","MiB","GiB","TiB","PiB","kB","MB","GB","TB","PB"];
      const isDataLike = unitTokens.some(t => dataTokens.some(d=>d.toLowerCase()===t.toLowerCase()));
      const onlyUnit = tokens.find(t=>/^[A-Za-z°μΩ_]+$/.test(t));
      const onlyUnitObj = onlyUnit ? findUnit(onlyUnit) : null;

      let valueOut, unitOut, stepNotes = [];
      if (target) {
        const tQ = evaluateUnitExpression(target);
        if (!sameDim(q.dim, tQ.dim)) {
          const suggestion = (chooseAutoUnit(q.dim).unit || "");
          const hint = suggestion ? ` Try '-> ${suggestion}'.` : "";
          throw new Error(
            `Target Unit Is Dimensionally Incompatible: left is ${dimToString(q.dim)}, target is ${dimToString(tQ.dim)}.${hint}`
          );
        }
        if (onlyUnitObj?.isTemp && !onlyUnitObj?.isDeltaTemp && /^[A-Za-z°μΩ_]+$/.test(target) && findUnit(target)?.isTemp) {
          const numTok = tokens.find(isNumber);
          const numVal = numTok ? Number(numTok) : 0;
          valueOut = convertAbsoluteTemperature(numVal, onlyUnit, target);
          unitOut = target;
          stepNotes.push(`Converted Absolute Temperature ${onlyUnit} → ${target}`);
        } else {
          const factorTargetSI = tQ.value;
          valueOut = q.value / factorTargetSI;
          unitOut = target;
          stepNotes.push(`Divide By Target SI Factor (${roundNice(factorTargetSI)})`);
        }
      } else {
        let chosen = null;
        const auto = chooseAutoUnit(q.dim);
        if (auto.table.length) {
          chosen = pickBestUnit(q.value, auto.table);
          stepNotes.push(`Auto-Picked Unit “${chosen.unit}”`);
        } else if (isDataLike) {
          const candidates = ["b","B","kB","KB","MB","GB","TB","PB","KiB","MiB","GiB","TiB","PiB"];
          chosen = pickBestUnit(q.value, candidates);
          stepNotes.push(`Auto-Picked Data Unit “${chosen.unit}”`);
        } else {
          chosen = { unit: "", value: q.value };
          stepNotes.push("No Target Given; Showing SI Value.");
        }
        valueOut = chosen.value;
        unitOut = chosen.unit;
      }

      setResultStr(`${roundNice(valueOut)} ${unitOut}`.trim());

      let strip = {num:[], den:[]};
      try { strip = unitStrip(left); } catch {}
      setUnitStripView(strip);

      const unitSteps = [];
      for (const t of unitTokens) {
        const u = findUnit(t);
        if (!u) continue;
        unitSteps.push(`${t} → SI (× ${roundNice(u.toSI)}) • ${dimToString(u.dim)}`);
      }
      setSteps([...unitSteps, ...stepNotes]);
      setHistory((h)=>[{expr, out: `${roundNice(valueOut)} ${unitOut}`.trim(), ts: Date.now()}, ...h].slice(0,100));
    } catch (error) {
      setResultStr(`Error: ${error.message || error}`);
      setSteps([]);
      setUnitStripView({num:[], den:[]});
    }
  }, [expr]);

  const onEnter = (e) => { if (e.key === "Enter") { e.preventDefault(); evaluate(); } };
  const pasteQuick = (sample) => setExpr(sample);

  const copyResult = async () => handleCopy(resultStr, "copyResult");

  const copyShareLink = useCallback(async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("expr", expr);
      const ok = await writeClipboard(url.toString());
      if (ok) {
        try { window.history.replaceState({}, "", url.toString()); } catch {}
        markCopied("copyShare");
      }
    } catch {}
  }, [expr, markCopied]);

  const historyJson = useMemo(()=>JSON.stringify(history, null, 2), [history]);

  const downloadHistory = () => {
    const blob = new Blob([historyJson], { type: "application/json;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = "unitlab-history.json";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
  };

  const copyLatex = useCallback(async () => {
    try {
      const norm = normalizeInput(expr);
      const { left } = splitTarget(norm);
      let latexUnits = "";
      try { latexUnits = FRACTION_LATEX_FROM_STRIP(unitStrip(left)); } catch { latexUnits = ""; }
      const valuePart = (resultStr && resultStr.split(" ")[0]) || "";
      const latex = (valuePart ? `${valuePart}\\,` : "") + (latexUnits || "");
      const ok = await writeClipboard(latex || (resultStr || ""));
      if (ok) markCopied("copyLatex");
    } catch {}
  }, [expr, resultStr, markCopied]);

  const onInputChange = (v) => {
    setExpr(v);
    refreshSuggestions(v);
    setShowSuggest(true);
  };

  return (
    <div className="dinolabsUnitLabApp" tabIndex={0}>
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsUnitLabContainer">
        <aside className="dinolabsUnitLabSidebar">
          <div className="dinolabsUnitLabSection">
            <div className="dinolabsUnitLabSectionTitle">
              <FontAwesomeIcon icon={faCalculator} /><span>Expression</span>
            </div>

            <div className="dinolabsUnitLabExpressionStack">
              <div className="dinolabsUnitLabInputWrap">
                <input
                  ref={inputRef}
                  className="dinolabsUnitLabInput"
                  value={expr}
                  onChange={(e)=>onInputChange(e.target.value)}
                  onKeyDown={(e)=>{ if (e.key==="Escape") setShowSuggest(false); onEnter(e); }}
                  onFocus={()=>refreshSuggestions(expr)}
                  placeholder="E.g., 3.5 ft/s -> km/h"
                  autoComplete="off"
                  aria-label="Expression"
                />
                {showSuggest && suggestions.length>0 && (
                  <div className="dinolabsUnitLabSuggest" role="listbox" aria-label="Suggestions">
                    {suggestions.map((s,i)=>(
                      <button key={i} className="dinolabsUnitLabSuggestItem" onClick={()=>applySuggestion(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="dinolabsUnitLabBtn primary"
                onClick={() => { setShowSuggest(false); evaluate(); }}
              >
                <FontAwesomeIcon icon={faChevronRight}/> Evaluate
              </button>

              <div className="dinolabsUnitLabRowTwo">
                <button type="button" className="dinolabsUnitLabBtn" onClick={()=>{setExpr(""); setShowSuggest(false);} }>
                  <FontAwesomeIcon icon={faDeleteLeft}/> Clear
                </button>
                <button type="button" className="dinolabsUnitLabBtn" onClick={copyResult}>
                  <FontAwesomeIcon icon={faCopy}/> {copied.copyResult ? "Copied" : "Copy Result"}
                </button>
              </div>

              <div className="dinolabsUnitLabRowTwo">
                <button type="button" className="dinolabsUnitLabBtn" onClick={()=>setFormatMode("fraction")}>
                  Fraction
                </button>
                <button type="button" className="dinolabsUnitLabBtn" onClick={()=>setFormatMode("inline")}>
                  Inline
                </button>
              </div>

              <div className="dinolabsUnitLabRowThree">
                <button className="dinolabsUnitLabBtn tiny" title="LaTeX" onClick={copyLatex}>
                  <FontAwesomeIcon icon={faCode}/> {copied.copyLatex ? "Copied" : "LaTeX"}
                </button>
                <button className="dinolabsUnitLabBtn tiny" title="Share" onClick={copyShareLink}>
                  <FontAwesomeIcon icon={faLink}/> {copied.copyShare ? "Copied" : "Share"}
                </button>
                <button className="dinolabsUnitLabBtn tiny" title="Download History" onClick={downloadHistory}>
                  <FontAwesomeIcon icon={faDownload}/> History
                </button>
              </div>
            </div>
          </div>

          <div className="dinolabsUnitLabSection">
            <div className="dinolabsUnitLabSectionTitle">
              <FontAwesomeIcon icon={faRoad} /><span>Quick Picks</span>
            </div>
            <div className="dinolabsUnitLabChipsGrid">
              {quickies.map((q,i)=>(
                <button type="button" key={i} className="dinolabsUnitLabChip tile" onClick={()=>pasteQuick(q)}>{q}</button>
              ))}
            </div>
          </div>

          <div className="dinolabsUnitLabSection">
            <div className="dinolabsUnitLabSectionTitle">
              <FontAwesomeIcon icon={faScaleBalanced} /><span>Common Units</span>
            </div>

            <div className="dinolabsUnitLabChipGroup">
              <div className="dinolabsUnitLabChipLabel">Length</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["mm","cm","m","km","in","ft","yd","mi"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>

              <div className="dinolabsUnitLabChipLabel">Time</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["ms","s","min","h","day"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>

              <div className="dinolabsUnitLabChipLabel">Mass</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["g","kg","lb","oz","t"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>

              <div className="dinolabsUnitLabChipLabel">Pressure</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["Pa","kPa","bar","atm","psi"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>

              <div className="dinolabsUnitLabChipLabel">Energy/Power</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["J","kWh","cal","BTU","W","kW","hp","VA","var"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>

              <div className="dinolabsUnitLabChipLabel">Flow/Volume</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["m^3","L","mL","L/s","L/min","m^3/s","m^3/h","lpm","gpm","cfm"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>

              <div className="dinolabsUnitLabChipLabel">Electrical</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["V","A","C","ohm","Ω","S","F","H","Wb","T","G","Hz","kHz","MHz"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>

              <div className="dinolabsUnitLabChipLabel">Data</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["b","B","kB","MB","GB","TB","PB","KiB","MiB","GiB","TiB","PiB"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>

              <div className="dinolabsUnitLabChipLabel">Temperature</div>
              <div className="dinolabsUnitLabChipsWrap">
                {["°C","°F","K","deltaC","deltaF"].map(u=>(
                  <button type="button" key={u} className="dinolabsUnitLabChip small" onClick={()=>setExpr((s)=>`${s}${s&&/\S$/.test(s)?" ":""}${u}`)}>{u}</button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="dinolabsUnitLabMain">
          <div className="dinolabsUnitLabResultPanel">
            <div className="dinolabsUnitLabResultHeader">
              <div className="dinolabsUnitLabResultTitle"></div>
              <div className="dinolabsUnitLabResultActions">
                <button type="button" className="dinolabsUnitLabBtn subtle" onClick={evaluate}>
                  <FontAwesomeIcon icon={faArrowRotateRight}/> Re-Run
                </button>
              </div>
            </div>

            <div className="dinolabsUnitLabResultCard">
              <div className="dinolabsUnitLabResultValue">{resultStr || "—"}</div>

              <div className="dinolabsUnitLabStrip">
                {formatMode==="fraction" ? (
                  <>
                    <div className="dinolabsUnitLabStripSide">
                      {unitStripView.num.length ? unitStripView.num.join(" · ") : "—"}
                    </div>
                    <div className="dinolabsUnitLabStripDivider">/</div>
                    <div className="dinolabsUnitLabStripSide">
                      {unitStripView.den.length ? unitStripView.den.join(" · ") : "—"}
                    </div>
                  </>
                ) : (
                  <div className="dinolabsUnitLabStripInline">{INLINE_FROM_STRIP(unitStripView) || "—"}</div>
                )}
              </div>

              <div className="dinolabsUnitLabSteps">
                <div className="dinolabsUnitLabStepsTitle"><FontAwesomeIcon icon={faFlaskVial}/> Steps</div>
                {steps.length === 0
                  ? <div className="dinolabsUnitLabStepsEmpty">No Steps Yet. Press Evaluate.</div>
                  : steps.map((s,i)=><div key={i} className="dinolabsUnitLabStep">{i+1}. {s}</div>)
                }
              </div>
            </div>

            <div className="dinolabsUnitLabHistory">
              <div className="dinolabsUnitLabHistoryTitle">History</div>
              <div className="dinolabsUnitLabHistoryList">
                {history.length === 0 && <div className="dinolabsUnitLabHistoryEmpty">No History Yet.</div>}
                {history.map((h,idx)=>(
                  <div key={idx} className="dinolabsUnitLabHistoryItem">
                    <div className="dinolabsUnitLabHistoryExpr">{h.expr}</div>
                    <div className="dinolabsUnitLabHistoryOut">{h.out}</div>
                    <div className="dinolabsUnitLabHistoryActions">
                      <button type="button" className="dinolabsUnitLabBtn tiny" onClick={()=>setExpr(h.expr)}>Load</button>
                      <button
                        type="button"
                        className="dinolabsUnitLabBtn tiny"
                        onClick={()=>handleCopy(h.out, `hist-${idx}`)}
                      >
                        {copied[`hist-${idx}`] ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dinolabsUnitLabHistoryExport">
                <button className="dinolabsUnitLabBtn tiny" onClick={downloadHistory}>
                  <FontAwesomeIcon icon={faDownload}/> Download History (JSON)
                </button>
                <button
                  className="dinolabsUnitLabBtn tiny"
                  onClick={()=>handleCopy(historyJson, "copyHistory")}
                >
                  <FontAwesomeIcon icon={faCopy}/> {copied.copyHistory ? "Copied" : "Copy History"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DinoLabsPluginsUnitLab;
