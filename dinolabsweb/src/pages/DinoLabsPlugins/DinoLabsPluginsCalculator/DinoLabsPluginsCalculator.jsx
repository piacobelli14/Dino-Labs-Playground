import React, { useState } from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import DinoLabsNav from "../../../helpers/Nav";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsCalculator/DinoLabsPluginsCalculator.css";

export default function DinoLabsPluginsCalculator() {
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState([]);
  const [terminalState, setTerminalState] = useState("funcs");

  const OPERATORS = {
    "+": { prec: 1, assoc: "L", arity: 2, fn: (a, b) => a + b },
    "-": { prec: 1, assoc: "L", arity: 2, fn: (a, b) => a - b },
    "*": { prec: 2, assoc: "L", arity: 2, fn: (a, b) => a * b },
    "/": { prec: 2, assoc: "L", arity: 2, fn: (a, b) => a / b },
    "^": { prec: 4, assoc: "R", arity: 2, fn: (a, b) => Math.pow(a, b) },
    neg: { prec: 3, assoc: "R", arity: 1, fn: (a) => -a },
  };

  const CONSTANTS = {
    pi: Math.PI,
    e: Math.E,
    tau: 2 * Math.PI,
    "τ": 2 * Math.PI,
    phi: (1 + Math.sqrt(5)) / 2,
    gamma: 0.5772156649015329,
    c: 299792458,
    G: 6.67430e-11,
    h: 6.62607015e-34,
    hbar: 1.054571817e-34,
    k: 1.380649e-23,
    R: 8.314462618,
    NA: 6.02214076e23,
    qe: 1.602176634e-19,
    eps0: 8.8541878128e-12,
    mu0: 1.25663706212e-6,
    me: 9.1093837015e-31,
    mp: 1.67262192369e-27,
    mn: 1.67492749804e-27,
    g0: 9.80665,
    sigmaSB: 5.670374419e-8,
    Ry: 10973731.568160,
    alpha: 7.2973525693e-3,
    ke: 8.9875517923e9,
  };

  const FUNCTIONS = {
    sin: { arity: 1, fn: (x) => Math.sin(x) },
    cos: { arity: 1, fn: (x) => Math.cos(x) },
    tan: { arity: 1, fn: (x) => Math.tan(x) },
    sec: { arity: 1, fn: (x) => 1 / Math.cos(x) },
    csc: { arity: 1, fn: (x) => 1 / Math.sin(x) },
    cot: { arity: 1, fn: (x) => 1 / Math.tan(x) },
    asin: { arity: 1, fn: (x) => { if (x < -1 || x > 1) throw new Error("DOMAIN asin"); return Math.asin(x); } },
    acos: { arity: 1, fn: (x) => { if (x < -1 || x > 1) throw new Error("DOMAIN acos"); return Math.acos(x); } },
    atan: { arity: 1, fn: (x) => Math.atan(x) },
    asec: { arity: 1, fn: (x) => { if (x === 0) throw new Error("DOMAIN asec"); const v = 1 / x; if (v < -1 || v > 1) throw new Error("DOMAIN asec"); return Math.acos(v); } },
    acsc: { arity: 1, fn: (x) => { if (x === 0) throw new Error("DOMAIN acsc"); const v = 1 / x; if (v < -1 || v > 1) throw new Error("DOMAIN acsc"); return Math.asin(v); } },
    acot: { arity: 1, fn: (x) => { if (x === 0) return Math.PI / 2; return Math.atan(1 / x); } },
    sinh: { arity: 1, fn: (x) => (Math.sinh ? Math.sinh(x) : (Math.exp(x) - Math.exp(-x)) / 2) },
    cosh: { arity: 1, fn: (x) => (Math.cosh ? Math.cosh(x) : (Math.exp(x) + Math.exp(-x)) / 2) },
    tanh: { arity: 1, fn: (x) => (Math.tanh ? Math.tanh(x) : (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x))) },
    asinh: { arity: 1, fn: (x) => (Math.asinh ? Math.asinh(x) : Math.log(x + Math.sqrt(x * x + 1))) },
    acosh: { arity: 1, fn: (x) => { if (x < 1) throw new Error("DOMAIN acosh"); return Math.acosh ? Math.acosh(x) : Math.log(x + Math.sqrt(x - 1) * Math.sqrt(x + 1)); } },
    atanh: { arity: 1, fn: (x) => { if (x <= -1 || x >= 1) throw new Error("DOMAIN atanh"); return Math.atanh ? Math.atanh(x) : 0.5 * Math.log((1 + x) / (1 - x)); } },
    sech: { arity: 1, fn: (x) => 1 / (Math.cosh ? Math.cosh(x) : (Math.exp(x) + Math.exp(-x)) / 2) },
    csch: { arity: 1, fn: (x) => { const s = Math.sinh ? Math.sinh(x) : (Math.exp(x) - Math.exp(-x)) / 2; if (s === 0) throw new Error("DOMAIN csch"); return 1 / s; } },
    coth: { arity: 1, fn: (x) => { const t = Math.tanh ? Math.tanh(x) : (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x)); if (t === 0) throw new Error("DOMAIN coth"); return 1 / t; } },
    asech: { arity: 1, fn: (x) => { if (x <= 0 || x > 1) throw new Error("DOMAIN asech"); return FUNCTIONS.acosh.fn(1 / x); } },
    acsch: { arity: 1, fn: (x) => { if (x === 0) throw new Error("DOMAIN acsch"); return FUNCTIONS.asinh.fn(1 / x); } },
    acoth: { arity: 1, fn: (x) => { if (Math.abs(x) <= 1) throw new Error("DOMAIN acoth"); return FUNCTIONS.atanh.fn(1 / x); } },
    exp: { arity: 1, fn: (x) => Math.exp(x) },
    ln: { arity: 1, fn: (x) => { if (x <= 0) throw new Error("DOMAIN ln"); return Math.log(x); } },
    log: { arity: 1, fn: (x) => { if (x <= 0) throw new Error("DOMAIN log"); return Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10; } },
    logn: { arity: 2, fn: (x, b) => { if (x <= 0 || b <= 0 || b === 1) throw new Error("DOMAIN logn"); return Math.log(x) / Math.log(b); } },
    sqrt: { arity: 1, fn: (x) => { if (x < 0) throw new Error("DOMAIN sqrt"); return Math.sqrt(x); } },
    pow: { arity: "var", fn: (...xs) => { if (xs.length === 1) return Math.pow(xs[0], 2); if (xs.length === 2) return Math.pow(xs[0], xs[1]); throw new Error("ARITY pow"); } },
    root: { arity: 2, fn: (x, n) => { if (n === 0) throw new Error("DOMAIN root"); if (x < 0 && Math.abs(n % 2) !== 1) throw new Error("DOMAIN root"); const sign = x < 0 ? -1 : 1; return sign * Math.pow(Math.abs(x), 1 / n); } },
    abs: { arity: 1, fn: (x) => Math.abs(x) },
    floor: { arity: 1, fn: (x) => Math.floor(x) },
    ceil: { arity: 1, fn: (x) => Math.ceil(x) },
    round: { arity: 1, fn: (x) => Math.round(x) },
    sign: { arity: 1, fn: (x) => Math.sign(x) },
    hypot: { arity: "var", fn: (...xs) => { if (xs.length < 2) throw new Error("ARITY hypot"); return Math.hypot(...xs); } },
    clamp: { arity: 3, fn: (x, min, max) => { if (min > max) throw new Error("DOMAIN clamp"); return Math.max(min, Math.min(max, x)); } },
    fact: { arity: 1, fn: (n) => { if (!Number.isInteger(n) || n < 0) throw new Error("DOMAIN fact"); if (n > 170) throw new Error("DOMAIN fact"); let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; } },
    perm: { arity: 2, fn: (n, k) => { if (![n, k].every(Number.isInteger) || n < 0 || k < 0 || k > n) throw new Error("DOMAIN perm"); let r = 1; for (let i = n - k + 1; i <= n; i++) r *= i; return r; } },
    comb: { arity: 2, fn: (n, k) => { if (![n, k].every(Number.isInteger) || n < 0 || k < 0 || k > n) throw new Error("DOMAIN comb"); k = Math.min(k, n - k); let num = 1; let den = 1; for (let i = 1; i <= k; i++) { num *= n - k + i; den *= i; } return num / den; } },
    toRad: { arity: 1, fn: (deg) => deg * (Math.PI / 180) },
    toDeg: { arity: 1, fn: (rad) => rad * (180 / Math.PI) },
  };

  const FUNCTION_NAMES = new Set(Object.keys(FUNCTIONS).map((s) => s.toLowerCase()));
  const RESERVED = new Set([...Object.keys(CONSTANTS), ...Object.keys(FUNCTIONS)].map((s) => s.toLowerCase()));

  const tokenize = (src) => {
    const tokens = [];
    const s = src.trim();
    let i = 0;
    let absOpen = 0;
    const isDigit = (c) => c >= "0" && c <= "9";
    const isAlpha = (c) => /[A-Za-z_]/.test(c);
    const isAlnum = (c) => /[A-Za-z0-9_]/.test(c);
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (isDigit(c) || (c === "." && isDigit(s[i + 1]))) {
        let num = "";
        while (i < s.length && (isDigit(s[i]) || s[i] === ".")) num += s[i++];
        if (s[i] === "e" || s[i] === "E") {
          let j = i + 1;
          if (s[j] === "+" || s[j] === "-") j++;
          if (isDigit(s[j])) {
            num += s[i++];
            if (s[i] === "+" || s[i] === "-") num += s[i++];
            while (i < s.length && isDigit(s[i])) num += s[i++];
          }
        }
        tokens.push({ type: "number", value: parseFloat(num) });
        continue;
      }
      if (isAlpha(c)) {
        let id = "";
        while (i < s.length && isAlnum(s[i])) id += s[i++];
        tokens.push({ type: "ident", value: id });
        continue;
      }
      if (c === "τ") { tokens.push({ type: "ident", value: "τ" }); i++; continue; }
      if ("([{".includes(c)) { tokens.push({ type: "lparen" }); i++; continue; }
      if (")]}".includes(c)) { tokens.push({ type: "rparen" }); i++; continue; }
      if (c === ",") { tokens.push({ type: "comma" }); i++; continue; }
      if (c === "|") {
        if (absOpen % 2 === 0) { tokens.push({ type: "function", value: "abs" }); tokens.push({ type: "lparen" }); }
        else { tokens.push({ type: "rparen" }); }
        absOpen++; i++; continue;
      }
      if ("+-*/^".includes(c)) { tokens.push({ type: "op", value: c }); i++; continue; }
      if (c === "=") { tokens.push({ type: "equals" }); i++; continue; }
      throw new Error(`Unexpected character "${c}"`);
    }
    return tokens;
  };

  const annotateIdentifiers = (tokens) => {
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === "ident") {
        const lower = String(t.value).toLowerCase();
        if (FUNCTION_NAMES.has(lower)) out.push({ type: "function", value: lower });
        else out.push({ type: "ident", value: lower });
      } else out.push(t);
    }
    return out;
  };

  const insertImplicitMultiplication = (tokens) => {
    const out = [];
    const isValueEnd = (t) => t.type === "number" || t.type === "rparen" || t.type === "ident";
    const isValueStart = (t) => t.type === "number" || t.type === "lparen" || t.type === "ident" || t.type === "function";
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      out.push(t);
      const n = tokens[i + 1];
      if (!n) continue;
      if (t.type === "function" && n.type === "lparen") continue;
      if (isValueEnd(t) && isValueStart(n)) {
        if (!(t.type === "ident" && n.type === "lparen" && FUNCTION_NAMES.has(t.value))) {
          out.push({ type: "op", value: "*" });
        }
      }
    }
    return out;
  };

  const toRPN = (tokens) => {
    const output = [];
    const stack = [];
    const frames = [];
    const peek = (arr) => arr[arr.length - 1];
    const isUnaryPosition = (prev) => {
      if (!prev) return true;
      return prev.type === "op" || prev.type === "lparen" || prev.type === "comma" || prev.type === "equals";
    };
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const prev = tokens[i - 1];
      if (t.type === "number" || t.type === "ident") { output.push(t); continue; }
      if (t.type === "function") { stack.push(t); continue; }
      if (t.type === "comma") {
        while (stack.length && peek(stack).type !== "lparen") output.push(stack.pop());
        if (!stack.length) throw new Error("Misplaced comma or mismatched parentheses");
        if (frames.length) frames[frames.length - 1].argCount++;
        continue;
      }
      if (t.type === "lparen") { stack.push(t); frames.push({ argCount: 1 }); continue; }
      if (t.type === "rparen") {
        while (stack.length && peek(stack).type !== "lparen") output.push(stack.pop());
        if (!stack.length) throw new Error("Mismatched parentheses");
        stack.pop();
        const f = stack[stack.length - 1];
        const frame = frames.pop();
        if (f && f.type === "function") {
          const func = stack.pop();
          const def = FUNCTIONS[func.value];
          const argc = def.arity === "var" ? frame.argCount : def.arity;
          if (def.arity !== "var" && frame.argCount !== def.arity) throw new Error(`${func.value} expects ${def.arity} argument(s)`);
          output.push({ type: "function", value: func.value, argc });
        }
        continue;
      }
      if (t.type === "op") {
        let op = t.value;
        if (op === "-" && isUnaryPosition(prev)) op = "neg";
        const o1 = op;
        if (!OPERATORS[o1]) throw new Error(`Unknown operator "${op}"`);
        while (stack.length) {
          const top = peek(stack);
          if (top.type !== "op") break;
          const o2 = top.value;
          const p1 = OPERATORS[o1].prec;
          const p2 = OPERATORS[o2].prec;
          if ((OPERATORS[o1].assoc === "L" && p1 <= p2) || (OPERATORS[o1].assoc === "R" && p1 < p2)) {
            output.push(stack.pop());
          } else break;
        }
        stack.push({ type: "op", value: o1 });
        continue;
      }
      if (t.type === "equals") { output.push(t); continue; }
      throw new Error("Invalid token");
    }
    while (stack.length) {
      const top = stack.pop();
      if (top.type === "lparen" || top.type === "rparen") throw new Error("Mismatched parentheses");
      if (top.type === "function") {
        const def = FUNCTIONS[top.value];
        const argc = def.arity === "var" ? 1 : def.arity;
        output.push({ type: "function", value: top.value, argc });
      } else output.push(top);
    }
    return output;
  };

  const evalRPN = (rpn, variables = {}) => {
    const st = [];
    for (let i = 0; i < rpn.length; i++) {
      const t = rpn[i];
      if (t.type === "number") { st.push(t.value); continue; }
      if (t.type === "ident") {
        if (Object.prototype.hasOwnProperty.call(CONSTANTS, t.value)) st.push(CONSTANTS[t.value]);
        else if (Object.prototype.hasOwnProperty.call(variables, t.value)) st.push(Number(variables[t.value]));
        else throw new Error(`Unknown variable "${t.value}"`);
        continue;
      }
      if (t.type === "op") {
        const def = OPERATORS[t.value];
        if (def.arity === 1) {
          if (st.length < 1) throw new Error("Stack Underflow.");
          const a = st.pop();
          const v = def.fn(a);
          if (!isFinite(v)) throw new Error("Invalid result");
          st.push(v);
        } else {
          if (st.length < 2) throw new Error("Stack Underflow.");
          const b = st.pop();
          const a = st.pop();
          const v = def.fn(a, b);
          if (!isFinite(v)) throw new Error("Invalid result");
          st.push(v);
        }
        continue;
      }
      if (t.type === "function") {
        const def = FUNCTIONS[t.value];
        const argc = def.arity === "var" ? t.argc ?? 1 : def.arity;
        if (st.length < argc) throw new Error("Stack Underflow.");
        const args = [];
        for (let k = 0; k < argc; k++) args.unshift(st.pop());
        const v = def.fn(...args);
        if (!isFinite(v)) throw new Error("Invalid result");
        st.push(v);
        continue;
      }
      if (t.type === "equals") throw new Error("Unexpected '=' In Expression.");
      throw new Error("Invalid RPN Token.");
    }
    if (st.length !== 1) throw new Error("Invalid Expression.");
    const val = st[0];
    if (typeof val !== "number" || !isFinite(val)) throw new Error("Invalid result");
    return val;
  };

  const parseAndEvaluate = (expr, variables = {}) => {
    try {
      const rpn = toRPN(insertImplicitMultiplication(annotateIdentifiers(tokenize(expr))));
      const val = evalRPN(rpn, variables);
      return { value: val, error: null };
    } catch (error) {
      const raw = String(error && error.message ? error.message : "Error");
      if (raw.startsWith("DOMAIN")) return { value: null, error: "Domain error." };
      if (raw.startsWith("ARITY pow")) return { value: null, error: "Pow expects one or two arguments." };
      if (raw.startsWith("ARITY hypot")) return { value: null, error: "Hypot expects at least two arguments." };
      if (raw.includes("Mismatched parentheses")) return { value: null, error: "Mismatched parentheses." };
      if (raw.includes("Stack Underflow")) return { value: null, error: "Malformed expression." };
      if (raw.startsWith("Unknown variable")) return { value: null, error: "Unknown variable." };
      if (raw.includes("Invalid Expression")) return { value: null, error: "Malformed expression." };
      return { value: null, error: "Error." };
    }
  };

  const detectVariables = (equation) => {
    const ids = [];
    for (const t of annotateIdentifiers(tokenize(equation))) {
      if (t.type === "ident" && !RESERVED.has(t.value)) ids.push(t.value);
    }
    return [...new Set(ids)];
  };

  const solveEquation = (equation) => {
    const parts = equation.split("=");
    if (parts.length !== 2) return equation;
    const leftStr = parts[0].trim();
    const rightStr = parts[1].trim();
    const vars = detectVariables(equation);
    let variable = null;
    if (vars.includes("x")) variable = "x";
    else if (vars.length === 1) variable = vars[0];
    else return "Cannot determine a single variable to solve for.";
    const f = (x) => {
      const l = parseAndEvaluate(leftStr, { [variable]: x });
      const r = parseAndEvaluate(rightStr, { [variable]: x });
      if (l.error || r.error) return NaN;
      return l.value - r.value;
    };
    const ranges = [[-1e6, 1e6], [-1e3, 1e3], [-100, 100], [-10, 10], [0, 100], [0, 10], [-5, 5]];
    const tryBisection = (a, b, maxIter = 160) => {
      let fa = f(a), fb = f(b);
      if (!isFinite(fa) || !isFinite(fb)) return null;
      if (fa === 0) return a;
      if (fb === 0) return b;
      if (fa * fb > 0) return null;
      for (let i = 0; i < maxIter; i++) {
        const m = (a + b) / 2;
        const fm = f(m);
        if (!isFinite(fm)) return null;
        if (Math.abs(fm) < 1e-12) return m;
        if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
        if (Math.abs(b - a) < 1e-10) return (a + b) / 2;
      }
      return (a + b) / 2;
    };
    const tryNewton = (x0, maxIter = 100) => {
      let x = x0;
      for (let i = 0; i < maxIter; i++) {
        const fx = f(x);
        if (!isFinite(fx)) return null;
        if (Math.abs(fx) < 1e-12) return x;
        const h = 1e-6;
        const fpx = (f(x + h) - f(x - h)) / (2 * h);
        if (!isFinite(fpx) || Math.abs(fpx) < 1e-14) return null;
        const nx = x - fx / fpx;
        if (!isFinite(nx)) return null;
        if (Math.abs(nx - x) < 1e-10) return nx;
        x = nx;
      }
      return null;
    };
    for (const [a, b] of ranges) {
      const m = tryBisection(a, b);
      if (m !== null && isFinite(m)) return `${variable} = ${m.toFixed(6)}`;
    }
    const seeds = [0, 1, -1, 2, -2, 5, -5, 10, -10, 100, -100];
    for (const s of seeds) {
      const r = tryNewton(s);
      if (r !== null && isFinite(r)) return `${variable} = ${r.toFixed(6)}`;
    }
    return "No real solution found.";
  };

  const handleEnter = () => {
    if (!expression.trim()) return;
    const originalExpression = expression.trim();
    let result = "";
    if (originalExpression.includes("=")) {
      result = solveEquation(originalExpression);
    } else {
      const { value, error } = parseAndEvaluate(originalExpression);
      if (!error) {
        if (Number.isInteger(value)) result = value.toString();
        else if (Math.abs(value) < 1e-6) result = "0";
        else if (Math.abs(value) > 1e12) result = value.toExponential(6);
        else result = parseFloat(value.toFixed(10)).toString();
      } else result = error;
    }
    setHistory((prev) => [...prev, { expression: originalExpression, result }]);
    setExpression("");
  };

  const appendToExpression = (value) => setExpression((prev) => prev + value);
  const deleteLast = () => setExpression((prev) => prev.slice(0, -1));
  const clearExpression = () => setExpression("");

  const handleKeyPress = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleEnter(); }
    else if (e.key === "Backspace") { e.preventDefault(); deleteLast(); }
    else if (e.key === "Escape") { e.preventDefault(); clearExpression(); }
    else if (/[0-9+\-*/().=^,]/.test(e.key)) { e.preventDefault(); appendToExpression(e.key); }
  };

  const CalcButton = ({ onClick, children, className = "" }) => (
    <button className={`dinolabsPluginsCalculatorButton ${className}`} onClick={onClick}>{children}</button>
  );

  const TTButton = ({ title, children, onClick, className = "" }) => (
    <Tippy theme="tooltip-light" content={title} placement="top" delay={[150, 0]}>
      <span><CalcButton onClick={onClick} className={className}>{children}</CalcButton></span>
    </Tippy>
  );

  return (
    <div className="dinolabsPluginsCalculatorApp" onKeyDown={handleKeyPress} tabIndex={0}>
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsPluginsCalculatorContainer">
        <div className="dinolabsPluginsCalculatorHistory">
          {history.slice().reverse().map((item, index) => (
            <div key={index} className="dinolabsPluginsCalculatorHistoryItem">
              {item.expression} → {item.result}
            </div>
          ))}
        </div>

        <div className="dinolabsPluginsCalculatorInputContainer">
          <input
            type="text"
            className="dinolabsPluginsCalculatorInput"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="Enter an expression."
            autoFocus
          />
        </div>

        <div className="dinolabsPluginsCalculatorTabs">
          <button
            className={`dinolabsPluginsCalculatorTabButton ${terminalState === "funcs" ? "dinolabsPluginsCalculatorTabActive" : ""}`}
            onClick={() => setTerminalState("funcs")}
          >
            Functions
          </button>
          <button
            className={`dinolabsPluginsCalculatorTabButton ${terminalState === "consts" ? "dinolabsPluginsCalculatorTabActive" : ""}`}
            onClick={() => setTerminalState("consts")}
          >
            Constants
          </button>
        </div>

        <div className="dinolabsPluginsCalculatorKeyboard">
          <div className="dinolabsPluginsCalculatorFunctionsPanel">
            <div className="dinolabsPluginsCalculatorKeyboardRow">
              <CalcButton onClick={() => appendToExpression("1")} className="dinolabsPluginsCalculatorNumber">1</CalcButton>
              <CalcButton onClick={() => appendToExpression("2")} className="dinolabsPluginsCalculatorNumber">2</CalcButton>
              <CalcButton onClick={() => appendToExpression("3")} className="dinolabsPluginsCalculatorNumber">3</CalcButton>
              <CalcButton onClick={() => appendToExpression("4")} className="dinolabsPluginsCalculatorNumber">4</CalcButton>
              <CalcButton onClick={() => appendToExpression("5")} className="dinolabsPluginsCalculatorNumber">5</CalcButton>
              <CalcButton onClick={() => appendToExpression("6")} className="dinolabsPluginsCalculatorNumber">6</CalcButton>
              <CalcButton onClick={() => appendToExpression("7")} className="dinolabsPluginsCalculatorNumber">7</CalcButton>
              <CalcButton onClick={() => appendToExpression("8")} className="dinolabsPluginsCalculatorNumber">8</CalcButton>
              <CalcButton onClick={() => appendToExpression("9")} className="dinolabsPluginsCalculatorNumber">9</CalcButton>

              <CalcButton onClick={() => appendToExpression("(")} className="dinolabsPluginsCalculatorOperator">(</CalcButton>
              <CalcButton onClick={() => appendToExpression(")")} className="dinolabsPluginsCalculatorOperator">)</CalcButton>

              <CalcButton onClick={() => appendToExpression("{")} className="dinolabsPluginsCalculatorOperator">{"{"}</CalcButton>
              <CalcButton onClick={() => appendToExpression("}")} className="dinolabsPluginsCalculatorOperator">{"}"}</CalcButton>
              <CalcButton onClick={() => appendToExpression("[")} className="dinolabsPluginsCalculatorOperator">[</CalcButton>
              <CalcButton onClick={() => appendToExpression("]")} className="dinolabsPluginsCalculatorOperator">]</CalcButton>

              <CalcButton onClick={() => appendToExpression("+")} className="dinolabsPluginsCalculatorOperator">+</CalcButton>
              <CalcButton onClick={() => appendToExpression("-")} className="dinolabsPluginsCalculatorOperator">-</CalcButton>
              <CalcButton onClick={() => appendToExpression("/")} className="dinolabsPluginsCalculatorOperator">/</CalcButton>
              <CalcButton onClick={() => appendToExpression(".")} className="dinolabsPluginsCalculatorOperator">.</CalcButton>
              <CalcButton onClick={() => appendToExpression("=")} className="dinolabsPluginsCalculatorOperator">=</CalcButton>
              <CalcButton onClick={() => appendToExpression("*")} className="dinolabsPluginsCalculatorOperator">*</CalcButton>
              <CalcButton onClick={() => appendToExpression("|")} className="dinolabsPluginsCalculatorOperator">|</CalcButton>
              <CalcButton onClick={() => appendToExpression("^")} className="dinolabsPluginsCalculatorOperator">^</CalcButton>
            </div>
          </div>

          <div className="dinolabsPluginsCalculatorKeyboardSide">
            {terminalState === "funcs" && (
              <div className="dinolabsPluginsCalculatorFunctionsPanel">
                <div className="dinolabsPluginsCalculatorFunctionRow">
                  <TTButton title="Compute the principal square root of a number." onClick={() => appendToExpression("sqrt(")} className="dinolabsPluginsCalculatorFunction">sqrt</TTButton>
                  <TTButton title="Raise a number to a power; with one argument, it squares the input." onClick={() => appendToExpression("pow(")} className="dinolabsPluginsCalculatorFunction">pow</TTButton>
                  <TTButton title="Compute the natural logarithm of a positive number." onClick={() => appendToExpression("ln(")} className="dinolabsPluginsCalculatorFunction">ln</TTButton>
                  <TTButton title="Compute the base-10 logarithm of a positive number." onClick={() => appendToExpression("log(")} className="dinolabsPluginsCalculatorFunction">log</TTButton>
                  <TTButton title="Return the sine of an angle in radians." onClick={() => appendToExpression("sin(")} className="dinolabsPluginsCalculatorFunction">sin</TTButton>
                  <TTButton title="Return the cosine of an angle in radians." onClick={() => appendToExpression("cos(")} className="dinolabsPluginsCalculatorFunction">cos</TTButton>
                  <TTButton title="Return the tangent of an angle in radians." onClick={() => appendToExpression("tan(")} className="dinolabsPluginsCalculatorFunction">tan</TTButton>
                  <TTButton title="Return the secant of an angle in radians." onClick={() => appendToExpression("sec(")} className="dinolabsPluginsCalculatorFunction">sec</TTButton>
                  <TTButton title="Return the cosecant of an angle in radians." onClick={() => appendToExpression("csc(")} className="dinolabsPluginsCalculatorFunction">csc</TTButton>
                  <TTButton title="Return the cotangent of an angle in radians." onClick={() => appendToExpression("cot(")} className="dinolabsPluginsCalculatorFunction">cot</TTButton>
                  <TTButton title="Return the arcsine in radians; domain is −1 to 1." onClick={() => appendToExpression("asin(")} className="dinolabsPluginsCalculatorFunction">asin</TTButton>
                  <TTButton title="Return the arccosine in radians; domain is −1 to 1." onClick={() => appendToExpression("acos(")} className="dinolabsPluginsCalculatorFunction">acos</TTButton>
                  <TTButton title="Return the arctangent in radians." onClick={() => appendToExpression("atan(")} className="dinolabsPluginsCalculatorFunction">atan</TTButton>
                  <TTButton title="Return the arcsecant in radians; domain excludes 0." onClick={() => appendToExpression("asec(")} className="dinolabsPluginsCalculatorFunction">asec</TTButton>
                  <TTButton title="Return the arccosecant in radians; domain excludes 0." onClick={() => appendToExpression("acsc(")} className="dinolabsPluginsCalculatorFunction">acsc</TTButton>
                  <TTButton title="Return the arccotangent in radians; acot(0) = π⁄2." onClick={() => appendToExpression("acot(")} className="dinolabsPluginsCalculatorFunction">acot</TTButton>
                  <TTButton title="Return the hyperbolic sine." onClick={() => appendToExpression("sinh(")} className="dinolabsPluginsCalculatorFunction">sinh</TTButton>
                  <TTButton title="Return the hyperbolic cosine." onClick={() => appendToExpression("cosh(")} className="dinolabsPluginsCalculatorFunction">cosh</TTButton>
                  <TTButton title="Return the hyperbolic tangent." onClick={() => appendToExpression("tanh(")} className="dinolabsPluginsCalculatorFunction">tanh</TTButton>
                  <TTButton title="Return e raised to the given power." onClick={() => appendToExpression("exp(")} className="dinolabsPluginsCalculatorFunction">exp</TTButton>
                  <TTButton title="Return the logarithm of x with base b." onClick={() => appendToExpression("logn(")} className="dinolabsPluginsCalculatorFunction">logn</TTButton>
                  <TTButton title="Return the n-th root of x (x^(1/n))." onClick={() => appendToExpression("root(")} className="dinolabsPluginsCalculatorFunction">root</TTButton>
                  <TTButton title="Return the sign of a number (−1, 0, or 1)." onClick={() => appendToExpression("sign(")} className="dinolabsPluginsCalculatorFunction">sign</TTButton>
                  <TTButton title="Return the Euclidean norm √(x₁² + … + xₙ²)." onClick={() => appendToExpression("hypot(")} className="dinolabsPluginsCalculatorFunction">hypot</TTButton>
                  <TTButton title="Clamp x to the closed interval [min, max]." onClick={() => appendToExpression("clamp(")} className="dinolabsPluginsCalculatorFunction">clamp</TTButton>
                  <TTButton title="Return n factorial (n!)." onClick={() => appendToExpression("fact(")} className="dinolabsPluginsCalculatorFunction">fact</TTButton>
                  <TTButton title="Return permutations: P(n, k)." onClick={() => appendToExpression("perm(")} className="dinolabsPluginsCalculatorFunction">perm</TTButton>
                  <TTButton title="Return combinations: C(n, k)." onClick={() => appendToExpression("comb(")} className="dinolabsPluginsCalculatorFunction">comb</TTButton>
                  <TTButton title="Convert degrees to radians." onClick={() => appendToExpression("toRad(")} className="dinolabsPluginsCalculatorFunction">toRad</TTButton>
                  <TTButton title="Convert radians to degrees." onClick={() => appendToExpression("toDeg(")} className="dinolabsPluginsCalculatorFunction">toDeg</TTButton>
                  <TTButton title="Return the absolute value." onClick={() => appendToExpression("abs(")} className="dinolabsPluginsCalculatorFunction">abs</TTButton>
                </div>
              </div>
            )}

            {terminalState === "consts" && (
              <div className="dinolabsPluginsCalculatorFunctionsPanel">
                <div className="dinolabsPluginsCalculatorFunctionRow">
                  <TTButton title="The circle ratio (π ≈ 3.14159)." onClick={() => appendToExpression("pi")} className="dinolabsPluginsCalculatorFunction">π</TTButton>
                  <TTButton title="Tau, two times π (τ = 2π)." onClick={() => appendToExpression("tau")} className="dinolabsPluginsCalculatorFunction">τ</TTButton>
                  <TTButton title="Euler’s number (e ≈ 2.71828)." onClick={() => appendToExpression("e")} className="dinolabsPluginsCalculatorFunction">e</TTButton>
                  <TTButton title="The golden ratio (φ ≈ 1.61803)." onClick={() => appendToExpression("phi")} className="dinolabsPluginsCalculatorFunction">φ</TTButton>
                  <TTButton title="The Euler–Mascheroni constant (γ ≈ 0.57721)." onClick={() => appendToExpression("gamma")} className="dinolabsPluginsCalculatorFunction">γ</TTButton>
                  <TTButton title="The speed of light in vacuum (c = 299,792,458 m/s)." onClick={() => appendToExpression("c")} className="dinolabsPluginsCalculatorFunction">c</TTButton>
                  <TTButton title="The gravitational constant (G ≈ 6.67430×10⁻¹¹ N·m²/kg²)." onClick={() => appendToExpression("G")} className="dinolabsPluginsCalculatorFunction">G</TTButton>
                  <TTButton title="Planck’s constant (h ≈ 6.62607015×10⁻³⁴ J·s)." onClick={() => appendToExpression("h")} className="dinolabsPluginsCalculatorFunction">h</TTButton>
                  <TTButton title="Reduced Planck’s constant (ħ ≈ 1.054571817×10⁻³⁴ J·s)." onClick={() => appendToExpression("hbar")} className="dinolabsPluginsCalculatorFunction">ħ</TTButton>
                  <TTButton title="The Boltzmann constant (k ≈ 1.380649×10⁻²³ J/K)." onClick={() => appendToExpression("k")} className="dinolabsPluginsCalculatorFunction">k</TTButton>
                  <TTButton title="The ideal-gas constant (R ≈ 8.314462618 J/(mol·K))." onClick={() => appendToExpression("R")} className="dinolabsPluginsCalculatorFunction">R</TTButton>
                  <TTButton title="Avogadro’s number (Nₐ ≈ 6.02214076×10²³ mol⁻¹)." onClick={() => appendToExpression("NA")} className="dinolabsPluginsCalculatorFunction">NA</TTButton>
                  <TTButton title="The elementary charge (qₑ = 1.602176634×10⁻¹⁹ C)." onClick={() => appendToExpression("qe")} className="dinolabsPluginsCalculatorFunction">qₑ</TTButton>
                  <TTButton title="Vacuum permittivity (ε₀ ≈ 8.8541878128×10⁻¹² F/m)." onClick={() => appendToExpression("eps0")} className="dinolabsPluginsCalculatorFunction">ε₀</TTButton>
                  <TTButton title="Vacuum permeability (μ₀ ≈ 1.25663706212×10⁻⁶ N/A²)." onClick={() => appendToExpression("mu0")} className="dinolabsPluginsCalculatorFunction">μ₀</TTButton>
                  <TTButton title="Electron rest mass (mₑ ≈ 9.1093837015×10⁻³¹ kg)." onClick={() => appendToExpression("me")} className="dinolabsPluginsCalculatorFunction">mₑ</TTButton>
                  <TTButton title="Proton rest mass (mₚ ≈ 1.67262192369×10⁻²⁷ kg)." onClick={() => appendToExpression("mp")} className="dinolabsPluginsCalculatorFunction">mₚ</TTButton>
                  <TTButton title="Neutron rest mass (mₙ ≈ 1.67492749804×10⁻²⁷ kg)." onClick={() => appendToExpression("mn")} className="dinolabsPluginsCalculatorFunction">mₙ</TTButton>
                  <TTButton title="Standard gravity at Earth’s surface (g₀ ≈ 9.80665 m/s²)." onClick={() => appendToExpression("g0")} className="dinolabsPluginsCalculatorFunction">g₀</TTButton>
                  <TTButton title="Stefan–Boltzmann constant (σ ≈ 5.670374419×10⁻⁸ W·m⁻²·K⁻⁴)." onClick={() => appendToExpression("sigmaSB")} className="dinolabsPluginsCalculatorFunction">σ</TTButton>
                  <TTButton title="Rydberg constant (R∞ ≈ 10,973,731.568160 m⁻¹)." onClick={() => appendToExpression("Ry")} className="dinolabsPluginsCalculatorFunction">R∞</TTButton>
                  <TTButton title="Fine-structure constant (α ≈ 7.2973525693×10⁻³)." onClick={() => appendToExpression("alpha")} className="dinolabsPluginsCalculatorFunction">α</TTButton>
                  <TTButton title="Coulomb constant (kₑ ≈ 8.9875517923×10⁹ N·m²/C²)." onClick={() => appendToExpression("ke")} className="dinolabsPluginsCalculatorFunction">kₑ</TTButton>
                </div>
              </div>
            )}
          </div>

          <div className="dinolabsPluginsCalculatorKeyboardControls">
            <div className="dinolabsPluginsCalculatorKeyboardRow">
              <CalcButton onClick={() => appendToExpression("x")} className="dinolabsPluginsCalculatorVariable">x</CalcButton>
              <CalcButton onClick={() => appendToExpression("a")} className="dinolabsPluginsCalculatorVariable">a</CalcButton>
              <CalcButton onClick={deleteLast} className="dinolabsPluginsCalculatorControl dinolabsPluginsCalculatorWide">⌫</CalcButton>
            </div>
            <div className="dinolabsPluginsCalculatorKeyboardRow">
              <CalcButton onClick={() => appendToExpression("y")} className="dinolabsPluginsCalculatorVariable">y</CalcButton>
              <CalcButton onClick={() => appendToExpression("b")} className="dinolabsPluginsCalculatorVariable">b</CalcButton>
              <CalcButton onClick={clearExpression} className="dinolabsPluginsCalculatorControl dinolabsPluginsCalculatorWide">Clear</CalcButton>
            </div>
            <div className="dinolabsPluginsCalculatorKeyboardRow">
              <CalcButton onClick={() => appendToExpression("z")} className="dinolabsPluginsCalculatorVariable">z</CalcButton>
              <CalcButton onClick={() => appendToExpression("c")} className="dinolabsPluginsCalculatorVariable">c</CalcButton>
              <CalcButton onClick={handleEnter} className="dinolabsPluginsCalculatorControl dinolabsPluginsCalculatorWide dinolabsPluginsCalculatorEnter">Enter</CalcButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}