import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { VariableSizeGrid as Grid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "../../styles/mainStyles/DinoLabsTabularEditor/DinoLabsTabularEditor.css";
import { showDialog } from "../../helpers/DinoLabsAlert.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket, faFilter, faSquareMinus, faSquarePlus, faSave, faDownload, faUndo, faRedo,
  faCut, faCopy, faPaste, faArrowPointer, faSearch, faSortAlphaDown, faSortAlphaUp,
  faSortNumericDown, faSortNumericUp, faTableCells, faTrash, faCalculator, faCheckCircle
} from "@fortawesome/free-solid-svg-icons";

const MAX_ROWS = 10000;
const MAX_COLS = 5000;
const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_COL_WIDTH = 120;
const SAVE_BANNER_TIMEOUT_MS = 3000;

const isMacPlatform = () => navigator.platform.toUpperCase().includes("MAC");
const isCellInput = el => el?.classList?.contains("dinolabsTableCellInput");
const clampNum = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
const toKey = (r, c) => `${r},${c}`;
const fromKey = k => k.split(",").map(Number);
const stopAll = e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); };

function getColumnLabel(colIndex) {
  let label = "", n = colIndex + 1;
  while (n > 0) { n--; label = String.fromCharCode(65 + (n % 26)) + label; n = Math.floor(n / 26); }
  return label;
}

const a1FromRC = (r, c) => `${getColumnLabel(c)}${r + 1}`;

function colFromLabel(lbl) { let n = 0; for (let i = 0; i < lbl.length; i++) n = n * 26 + (lbl.charCodeAt(i) - 64); return n - 1; }

function rcFromA1(ref) { const m = /^([A-Z]+)(\d+)$/.exec(ref.toUpperCase()); if (!m) return null; const col = colFromLabel(m[1]); const row = parseInt(m[2], 10) - 1; if (row < 0 || col < 0) return null; return { row, col }; }

function parseBind(str) { if (!str) return null; const parts = String(str).trim().toLowerCase().split("+").map(p => p.trim()); const spec = { key: null, shift: false }; for (const p of parts) { if (p === "shift") spec.shift = true; else if (p) spec.key = p; } return spec.key ? spec : null; }

function matchBind(e, spec, isMac) { if (!spec) return false; const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey; return !!cmdOrCtrl && (!!spec.shift === !!e.shiftKey) && e.key.toLowerCase() === spec.key; }

function normalizeBinds(keyBinds) {
  const d = { search: "f", save: "s", selectAll: "a", cut: "x", copy: "c", paste: "v", undo: "z", redo: null };
  const m = { ...d, ...(keyBinds || {}) };
  const one = k => [parseBind(m[k])].filter(Boolean);
  return { search: one("search"), save: one("save"), selectAll: one("selectAll"), cut: one("cut"), copy: one("copy"), paste: one("paste"), undo: one("undo"), redo: m.redo ? one("redo") : [parseBind("y"), parseBind("shift+z")].filter(Boolean) };
}

function idxFromCumulative(cumulative, pos) { if (pos <= 0) return 0; const total = cumulative[cumulative.length - 1]; if (pos >= total) return cumulative.length - 2; let lo = 0, hi = cumulative.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; cumulative[mid] <= pos ? (lo = mid + 1) : (hi = mid); } return Math.max(0, lo - 1); }

function idxFromCumulativeExtend(cumulative, pos, defaultSize) { if (pos <= 0) return 0; const total = cumulative[cumulative.length - 1]; if (pos < total) return idxFromCumulative(cumulative, pos); const extra = Math.ceil((pos - total) / defaultSize); return cumulative.length - 2 + Math.max(0, extra); }

function clampPosition(rect, width = 240, height = 280, offset = 6) {
  let top = rect.bottom + offset, left = rect.left;
  if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - offset);
  return { top, left };
}

function tokenizeFormula(src) {
  const s = src.replace(/^\s*=/, "");
  const tokens = [];
  let i = 0;
  const isLetter = ch => /[A-Za-z]/.test(ch);
  const isDigit = ch => /[0-9]/.test(ch);
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if ("+-*/^(),".includes(ch)) { tokens.push({ t: ch }); i++; continue; }
    if (ch === ":") { tokens.push({ t: ":" }); i++; continue; }
    if (isDigit(ch) || (ch === "." && isDigit(s[i + 1]))) {
      let j = i + 1; while (j < s.length && /[0-9.]/.test(s[j])) j++;
      tokens.push({ t: "num", v: parseFloat(s.slice(i, j)) }); i = j; continue;
    }
    if (isLetter(ch)) {
      let j = i + 1; while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      const head = s.slice(i, j);
      let k = j; while (k < s.length && isDigit(s[k])) k++;
      if (k > j) { tokens.push({ t: "a1start", v: head }); tokens.push({ t: "rownum", v: parseInt(s.slice(j, k), 10) }); i = k; continue; }
      else { tokens.push({ t: "ident", v: head.toUpperCase() }); i = j; continue; }
    }
    tokens.push({ t: "?" }); i++;
  }
  return tokens;
}

function makeRefToken(colLabel, rowNumber) { const rc = rcFromA1(`${colLabel}${rowNumber}`); if (!rc) return { t: "err", v: "#REF!" }; return { t: "ref", v: rc }; }

function toRPN(tokens) {
  const out = [], ops = [], funcArgCount = [];
  const prec = { "^": 4, "*": 3, "/": 3, "+": 2, "-": 2 }, rightAssoc = { "^": true };
  const pushOp = (op) => { while (ops.length) { const top = ops[ops.length - 1]; if (top.t === "(" || top.t === "func") break; const pTop = prec[top.t] || 0, pOp = prec[op.t] || 0; if (pTop > pOp || (pTop === pOp && !rightAssoc[op.t])) out.push(ops.pop()); else break; } ops.push(op); };
  const stream = [];
  for (let i = 0; i < tokens.length; i++) { const t = tokens[i]; if (t.t === "a1start" && tokens[i + 1]?.t === "rownum") { stream.push(makeRefToken(t.v, tokens[i + 1].v)); i++; } else stream.push(t); }
  for (let i = 0; i < stream.length; i++) {
    const t = stream[i];
    if (t.t === "ref" && stream[i + 1]?.t === ":" && stream[i + 2]?.t === "ref") { out.push({ t: "range", v: { start: t.v, end: stream[i + 2].v } }); i += 2; continue; }
    if (t.t === "num" || t.t === "ref" || t.t === "range") { out.push(t); continue; }
    if (t.t === "ident") { if (stream[i + 1]?.t === "(") { ops.push({ t: "func", v: t.v }); funcArgCount.push(0); } else { out.push({ t: "err", v: "#NAME?" }); } continue; }
    if (t.t === ",") { while (ops.length && ops[ops.length - 1].t !== "(") out.push(ops.pop()); if (funcArgCount.length) funcArgCount[funcArgCount.length - 1]++; continue; }
    if (t.t === "(") { ops.push(t); continue; }
    if (t.t === ")") { while (ops.length && ops[ops.length - 1].t !== "(") out.push(ops.pop()); if (ops.length && ops[ops.length - 1].t === "(") ops.pop(); if (ops.length && ops[ops.length - 1].t === "func") { const fn = ops.pop(); const nCommas = funcArgCount.pop() || 0; const argc = (stream[i - 1]?.t === "(") ? 0 : (nCommas + 1); out.push({ t: "call", v: fn.v, argc }); } continue; }
    if ("+-*/^".includes(t.t)) { pushOp(t); continue; }
    out.push({ t: "err", v: "#ERROR" });
  }
  while (ops.length) { const op = ops.pop(); if (op.t === "(") { out.push({ t: "err", v: "#ERROR" }); continue; } out.push(op); }
  return out;
}

function flattenToNumbers(arg) { if (Array.isArray(arg)) return arg.flat(Infinity).map(v => Number(v) || 0); return [Number(arg) || 0]; }

function evalRPN(rpn, getCell) {
  const st = [];
  function toNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  const fns = {
    SUM: (...args) => flattenToNumbers(args).reduce((a, b) => a + b, 0),
    AVERAGE: (...args) => { const arr = flattenToNumbers(args); return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0; },
    MIN: (...args) => Math.min(...flattenToNumbers(args)),
    MAX: (...args) => Math.max(...flattenToNumbers(args)),
    COUNT: (...args) => flattenToNumbers(args).filter(v => !Number.isNaN(v)).length,
    SQRT: (x) => Math.sqrt(toNum(x)),
    ABS: (x) => Math.abs(toNum(x)),
    POWER: (base, exp) => Math.pow(toNum(base), toNum(exp)),
    ROUND: (num, digits = 0) => { const n = toNum(num); const d = toNum(digits); const factor = Math.pow(10, d); return Math.round(n * factor) / factor; },
    FLOOR: (num, significance = 1) => Math.floor(toNum(num) / toNum(significance)) * toNum(significance),
    CEILING: (num, significance = 1) => Math.ceil(toNum(num) / toNum(significance)) * toNum(significance),
    LOG: (num, base = 10) => Math.log(toNum(num)) / Math.log(toNum(base)),
    EXP: (x) => Math.exp(toNum(x)),
    SIN: (x) => Math.sin(toNum(x)),
    COS: (x) => Math.cos(toNum(x)),
    TAN: (x) => Math.tan(toNum(x)),
    ASIN: (x) => Math.asin(toNum(x)),
    ACOS: (x) => Math.acos(toNum(x)),
    ATAN: (x) => Math.atan(toNum(x)),
    PI: () => Math.PI,
    RAND: () => Math.random(),
    MEDIAN: (...args) => {
      const arr = flattenToNumbers(args).sort((a, b) => a - b);
      if (!arr.length) return 0;
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
    },
    STDEV: (...args) => {
      const arr = flattenToNumbers(args);
      if (arr.length < 2) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1);
      return Math.sqrt(variance);
    },
    VAR: (...args) => {
      const arr = flattenToNumbers(args);
      if (arr.length < 2) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1);
    },
    PRODUCT: (...args) => flattenToNumbers(args).reduce((a, b) => a * b, 1),
    COUNTA: (...args) => flattenToNumbers(args).length,
    COUNTIF: (range, criteria) => {
      if (!Array.isArray(range)) return 0;
      return range.flat(Infinity).filter(v => {
        if (criteria.startsWith(">")) return Number(v) > Number(criteria.slice(1));
        if (criteria.startsWith("<")) return Number(v) < Number(criteria.slice(1));
        return v == criteria;
      }).length;
    },
    SUMIF: (range, criteria, sumRange = range) => {
      if (!Array.isArray(range) || !Array.isArray(sumRange)) return 0;
      const flatRange = range.flat(Infinity);
      const flatSum = sumRange.flat(Infinity);
      let sum = 0;
      for (let i = 0; i < flatRange.length; i++) {
        const v = flatRange[i];
        let match = false;
        if (criteria.startsWith(">")) match = Number(v) > Number(criteria.slice(1));
        else if (criteria.startsWith("<")) match = Number(v) < Number(criteria.slice(1));
        else match = v == criteria;
        if (match) sum += Number(flatSum[i]) || 0;
      }
      return sum;
    },
    IF: (condition, trueVal, falseVal) => !!condition ? trueVal : falseVal,
    AND: (...args) => args.every(v => !!v),
    OR: (...args) => args.some(v => !!v),
    NOT: (v) => !v,
    CONCAT: (...args) => args.map(v => String(v)).join(""),
    TEXT: (value, format) => String(value),
    NOW: () => new Date().toISOString(),
    TODAY: () => new Date().toDateString()
  };
  for (const t of rpn) {
    if (t.t === "num") st.push(t.v);
    else if (t.t === "ref") { const v = getCell(t.v.row, t.v.col); st.push(v); }
    else if (t.t === "range") { const { start, end } = t.v; const r1 = Math.min(start.row, end.row), r2 = Math.max(start.row, end.row); const c1 = Math.min(start.col, end.col), c2 = Math.max(start.col, end.col); const arr = []; for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) arr.push(getCell(r, c)); st.push(arr); }
    else if ("+-*/^".includes(t.t)) { const b = st.pop(); const a = st.pop(); const A = toNum(a), B = toNum(b); st.push(t.t === "+" ? A + B : t.t === "-" ? A - B : t.t === "*" ? A * B : t.t === "/" ? (B === 0 ? 0 : A / B) : Math.pow(A, B)); }
    else if (t.t === "call") { const args = []; for (let k = 0; k < t.argc; k++) args.unshift(st.pop()); const fn = fns[t.v] || (() => { throw new Error("#NAME?"); }); st.push(fn(...args)); }
    else if (t.t === "err") { return t.v; }
  }
  return st.length ? st[0] : 0;
}

function evaluateFormulaString(src, getCell) {
  try {
    const rpn = toRPN(tokenizeFormula(src));
    const val = evalRPN(rpn, getCell);
    return (typeof val === "number" && Number.isFinite(val)) ? String(val) : (Array.isArray(val) ? String(val[0] ?? 0) : String(val ?? ""));
  } catch { return "#ERROR"; }
}

function computeTable(tableData) {
  const cache = new Map(), visiting = new Set();
  function evaluateCell(key) {
    if (cache.has(key)) return cache.get(key);
    if (visiting.has(key)) { cache.set(key, "#CYCLE!"); return "#CYCLE!"; }
    visiting.add(key);
    const raw = tableData[key];
    let result = raw ?? "";
    if (typeof raw === "string" && raw.trim().startsWith("=")) {
      result = evaluateFormulaString(raw.trim(), (r, c) => {
        const v = evaluateCell(toKey(r, c));
        const num = parseFloat(v);
        return Number.isFinite(num) ? num : 0;
      });
    }
    visiting.delete(key); cache.set(key, result); return result;
  }
  const out = {}; for (const k of Object.keys(tableData)) out[k] = evaluateCell(k); return out;
}

function extractFirstRefOrRange(formula) {
  if (typeof formula !== "string" || !formula.trim().startsWith("=")) return null;
  const s = formula.trim().slice(1).toUpperCase();
  const mRange = s.match(/([A-Z]+[0-9]+)\s*:\s*([A-Z]+[0-9]+)/);
  if (mRange) {
    const a = rcFromA1(mRange[1]); const b = rcFromA1(mRange[2]);
    if (a && b) return { top: Math.min(a.row, b.row), left: Math.min(a.col, b.col), bottom: Math.max(a.row, b.row), right: Math.max(a.col, b.col) };
  }
  const mRef = s.match(/([A-Z]+[0-9]+)/);
  if (mRef) {
    const a = rcFromA1(mRef[1]); if (a) return { top: a.row, left: a.col, bottom: a.row, right: a.col };
  }
  return null;
}

function isExpectingFunctionRange(value, caret) {
  if (typeof value !== "string" || !value.trim().startsWith("=")) return false;
  const upToCaret = value.slice(0, caret ?? value.length);
  const opens = (upToCaret.match(/\(/g) || []).length;
  const closes = (upToCaret.match(/\)/g) || []).length;
  return opens > closes;
}

export default function DinoLabsTabularEditor({ fileHandle, keyBinds, onSaveStatusChange, onSave, onEdit }) {
  const [tableData, setTableData] = useState({});
  const tableDataRef = useRef(tableData);
  const [error, setError] = useState(null);
  const hasLoadedFile = useRef(false);
  const [truncationInfo, setTruncationInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numRows, setNumRows] = useState(1000);
  const [numCols, setNumCols] = useState(100);
  const [activeCell, setActiveCell] = useState({ row: null, col: null });
  const [cellEditingValue, setCellEditingValue] = useState("");
  const activeInputRef = useRef(null);
  const cellHistoryRef = useRef({ key: null, undo: [], redo: [], suppress: false });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [clipboardData, setClipboardData] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuPortalRef = useRef(null);
  const fileBtnRef = useRef(null);
  const editBtnRef = useRef(null);
  const toolsBtnRef = useRef(null);
  const sortBtnRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchPanelPos, setSearchPanelPos] = useState({ x: 100, y: 100 });
  const [searchPanelDragging, setSearchPanelDragging] = useState(false);
  const [searchPanelOffset, setSearchPanelOffset] = useState({ x: 0, y: 0 });
  const searchPanelRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionType, setSelectionType] = useState(null);
  const [justFinishedSelecting, setJustFinishedSelecting] = useState(false);
  const [skipClear, setSkipClear] = useState(false);
  const [selectionDrag, setSelectionDrag] = useState({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, originalSelection: null, block: null, grabRowOffset: 0, grabColOffset: 0, grabVisibleOffset: 0 });
  const dragRef = useRef(null);
  const previewRef = useRef(null);
  const [isMoving, setIsMoving] = useState(false);
  const [rowHeights, setRowHeights] = useState([]);
  const [colWidths, setColWidths] = useState([]);
  const [headerDrag, setHeaderDrag] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);
  const [filterDropdownPos, setFilterDropdownPos] = useState({ top: 0, left: 0 });
  const filterPortalRef = useRef(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [selectionResize, setSelectionResize] = useState({ active: false, handle: null, startX: 0, startY: 0, initialSelection: null });
  const gridContainerRef = useRef(null);
  const tableWrapperContainerRef = useRef(null);
  const dataGridRef = useRef(null);
  const scrollPos = useRef({ left: 0, top: 0 });
  const columnHeaderRef = useRef(null);
  const rowHeaderRef = useRef(null);
  const selectionOverlayRef = useRef(null);
  const [autoSizerDims, setAutoSizerDims] = useState({ width: 0, height: 0 });
  const suppressNextOverlayClickRef = useRef(false);
  const [ctxMenu, setCtxMenu] = useState({ open: false, x: 0, y: 0, items: [] });
  const ctxMenuRef = useRef(null);
  const [formulaPick, setFormulaPick] = useState({ active: false, start: null, end: null });
  const formulaBarRef = useRef(null);
  const SUPPORTED_FUNCS = ["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "SQRT", "ABS", "POWER", "ROUND", "FLOOR", "CEILING", "LOG", "EXP", "SIN", "COS", "TAN", "ASIN", "ACOS", "ATAN", "PI", "RAND", "MEDIAN", "STDEV", "VAR", "PRODUCT", "COUNTA", "COUNTIF", "SUMIF", "IF", "AND", "OR", "NOT", "CONCAT", "TEXT", "NOW", "TODAY"];
  const interactingWithFormulaBarRef = useRef(false);
  const [formulaBarValue, setFormulaBarValue] = useState("");
  const [summaryCollapsed, setSummaryCollapsed] = useState(true);
  const [qualityCollapsed, setQualityCollapsed] = useState(true);

  const computedTableData = useMemo(() => computeTable(tableData), [tableData]);

  const currentFormulaBarContent = useMemo(() => {
    if (activeCell.row !== null && activeCell.col !== null) {
      return cellEditingValue;
    }
    if (selection && selection.top === selection.bottom && selection.left === selection.right) {
      return tableDataRef.current[toKey(selection.top, selection.left)] || "";
    }
    return "";
  }, [activeCell.row, activeCell.col, cellEditingValue, selection, tableData]);

  useEffect(() => {
    if (document.activeElement !== formulaBarRef.current) {
      setFormulaBarValue(currentFormulaBarContent);
    }
  }, [currentFormulaBarContent]);

  const saveBannerText =
    saveStatus === "saving" ? "Saving..." :
      saveStatus === "saved" ? "Save successful!" :
        saveStatus === "no-handle" ? "No file handle available." :
          saveStatus === "failed" ? "Save failed!" :
            "";

  useEffect(() => { tableDataRef.current = tableData; }, [tableData]);

  const activateCell = useCallback((row, col) => {
    setSelection(null);
    setActiveCell({ row, col });
    const v = tableDataRef.current[toKey(row, col)] || "";
    setCellEditingValue(v);
    setFormulaBarValue(v);
    cellHistoryRef.current = { key: toKey(row, col), undo: [v], redo: [], suppress: false };
  }, []);

  const commitActiveCellIfNeeded = useCallback(() => {
    const { row, col } = activeCell;
    if (row === null || col === null) return;
    const key = toKey(row, col);
    const currentVal =
      (document.activeElement === activeInputRef.current ? activeInputRef.current?.value :
        (document.activeElement === formulaBarRef.current ? formulaBarRef.current?.value : null)) ?? cellEditingValue;
    const oldVal = tableDataRef.current[key] || "";
    if (oldVal !== currentVal) {
      setUndoStack(prev => [...prev, tableDataRef.current]);
      setRedoStack([]);
      const next = { ...tableDataRef.current, [key]: currentVal };
      tableDataRef.current = next;
      setTableData(next);
      onSaveStatusChange?.("Unsaved Changes");
      onEdit?.({ fullCode: generateCSV({ ...tableDataRef.current, [key]: oldVal }) }, { fullCode: generateCSV(next) });
    }
    cellHistoryRef.current = { key: null, undo: [], redo: [], suppress: false };
    setActiveCell({ row: null, col: null });
    setFormulaBarValue("");
  }, [activeCell, cellEditingValue, onEdit, onSaveStatusChange]);

  const withTableMutation = useCallback((mutator) => {
    commitActiveCellIfNeeded();
    const base = tableDataRef.current;
    const next = { ...base };
    mutator(next);
    setUndoStack(prev => [...prev, base]);
    setRedoStack([]);
    tableDataRef.current = next;
    setTableData(next);
    onSaveStatusChange?.("Unsaved Changes");
    onEdit?.({ fullCode: generateCSV(base) }, { fullCode: generateCSV(next) });
  }, [commitActiveCellIfNeeded, onEdit, onSaveStatusChange]);

  const clearUIHighlightsAndStates = useCallback(() => {
    commitActiveCellIfNeeded();
    setSelection(null);
    setSearchResults([]);
    setCurrentResultIndex(-1);
    setShowSearchPanel(false);
    setFormulaBarValue("");
  }, [commitActiveCellIfNeeded]);

  const ensureInBounds = useCallback((row, col, effRows, effCols) => ({ row: clampNum(row, 0, effRows - 1), col: clampNum(col, 0, effCols - 1) }), []);

  function generateCSV(data) {
    let maxRow = 0, maxCol = 0;
    Object.keys(data).forEach(k => { const [r, c] = fromKey(k); if (r > maxRow) maxRow = r; if (c > maxCol) maxCol = c; });
    let lines = [], lastNonEmptyRow = -1;
    for (let r = 0; r <= maxRow; r++) {
      let rowHas = false, rowCells = [];
      for (let c = 0; c <= maxCol; c++) {
        const v = data[toKey(r, c)] || "";
        if (v !== "") rowHas = true;
        rowCells.push(v);
      }
      if (rowHas) lastNonEmptyRow = r;
      lines.push(rowCells.join(","));
    }
    return lines.slice(0, lastNonEmptyRow + 1).join("\r\n");
  }

  const applyTableData = useCallback((next) => {
    const prevCSV = generateCSV(tableDataRef.current);
    const nextCSV = generateCSV(next);
    if (typeof onEdit === "function" && prevCSV !== nextCSV) onEdit({ fullCode: prevCSV }, { fullCode: nextCSV });
    tableDataRef.current = next;
    setTableData(next);
    onSaveStatusChange?.("Unsaved Changes");
  }, [onEdit, onSaveStatusChange]);

  useEffect(() => {
    if (activeCell.row === null && selection && selection.top === selection.bottom && selection.left === selection.right) {
      const value = tableDataRef.current[toKey(selection.top, selection.left)] || "";
      if (document.activeElement !== formulaBarRef.current) {
        setFormulaBarValue(value);
      }
    } else if (!selection && activeCell.row === null) {
      if (document.activeElement !== formulaBarRef.current) {
        setFormulaBarValue("");
      }
    }
  }, [selection, activeCell.row, tableData]);

  useEffect(() => { setSelectionEpoch(e => e + 1); }, [selection?.top, selection?.left, selection?.bottom, selection?.right]);

  const minNeededCols = useMemo(() => autoSizerDims.width ? Math.ceil(autoSizerDims.width / DEFAULT_COL_WIDTH) + 5 : 20, [autoSizerDims.width]);
  const minNeededRows = useMemo(() => autoSizerDims.height ? Math.ceil(autoSizerDims.height / DEFAULT_ROW_HEIGHT) + 10 : 50, [autoSizerDims.height]);
  const effectiveRows = useMemo(() => Math.max(numRows, minNeededRows), [numRows, minNeededRows]);
  const effectiveCols = useMemo(() => Math.max(numCols, minNeededCols), [numCols, minNeededCols]);

  useEffect(() => { setRowHeights(prev => { const out = prev.slice(0, effectiveRows); while (out.length < effectiveRows) out.push(DEFAULT_ROW_HEIGHT); return out; }); }, [effectiveRows]);

  useEffect(() => { setColWidths(prev => { const out = prev.slice(0, effectiveCols); while (out.length < effectiveCols) out.push(DEFAULT_COL_WIDTH); return out; }); }, [effectiveCols]);

  const rowHeightsCumulative = useMemo(() => { const cum = [0]; for (let i = 0; i < rowHeights.length; i++) cum.push(cum[i] + (rowHeights[i] || DEFAULT_ROW_HEIGHT)); return cum; }, [rowHeights]);

  const colWidthsCumulative = useMemo(() => { const cum = [0]; for (let i = 0; i < colWidths.length; i++) cum.push(cum[i] + (colWidths[i] || DEFAULT_COL_WIDTH)); return cum; }, [colWidths]);

  const filterOptions = useMemo(() => {
    const options = {};
    for (let c = 0; c < effectiveCols; c++) {
      const set = new Set();
      for (const k in tableData) {
        const [, col] = fromKey(k);
        if (col === c && tableData[k]?.trim() !== "") set.add(tableData[k]);
      }
      options[c] = Array.from(set);
    }
    return options;
  }, [tableData, effectiveCols]);

  const hasActiveFilter = useMemo(() => Object.values(columnFilters).some(arr => Array.isArray(arr) && arr.length > 0), [columnFilters]);

  const filteredRows = useMemo(() => {
    if (!hasActiveFilter) return Array.from({ length: effectiveRows }, (_, i) => i);
    const result = [];
    const activeCols = Object.keys(columnFilters).map(Number).filter(c => (columnFilters[c] || []).length > 0);
    for (let r = 0; r < effectiveRows; r++) {
      let include = true;
      for (const col of activeCols) {
        const allowed = columnFilters[col];
        const cell = (tableData[toKey(r, col)] || "").trim();
        if (!allowed.includes(cell)) { include = false; break; }
      }
      if (include) result.push(r);
    }
    return result;
  }, [tableData, columnFilters, effectiveRows, hasActiveFilter]);

  const filteredRowHeightsCumulative = useMemo(() => {
    const cum = [0];
    for (let i = 0; i < filteredRows.length; i++) { const ar = filteredRows[i]; cum.push(cum[i] + (rowHeights[ar] || DEFAULT_ROW_HEIGHT)); }
    return cum;
  }, [filteredRows, rowHeights]);

  const visibleToActualRow = useCallback((i) => hasActiveFilter ? (filteredRows[i] ?? 0) : i, [hasActiveFilter, filteredRows]);

  const actualToVisibleIndex = useCallback((ar) => hasActiveFilter ? filteredRows.indexOf(ar) : ar, [hasActiveFilter, filteredRows]);

  const nextVisibleActualRow = useCallback((ar, delta) => {
    if (!hasActiveFilter) return clampNum(ar + delta, 0, effectiveRows - 1);
    const i = actualToVisibleIndex(ar);
    if (i === -1) return filteredRows[delta > 0 ? 0 : Math.max(0, filteredRows.length - 1)] ?? 0;
    const newI = clampNum(i + delta, 0, filteredRows.length - 1);
    return filteredRows[newI] ?? ar;
  }, [hasActiveFilter, filteredRows, effectiveRows, actualToVisibleIndex]);

  const forEachSelectedCell = useCallback((sel, fn) => {
    if (!sel) return;
    const rows = hasActiveFilter
      ? (() => {
        const s = actualToVisibleIndex(sel.top), e = actualToVisibleIndex(sel.bottom);
        if (s === -1 || e === -1) return [];
        const [from, to] = [Math.min(s, e), Math.max(s, e)];
        return filteredRows.slice(from, to + 1);
      })()
      : Array.from({ length: sel.bottom - sel.top + 1 }, (_, i) => sel.top + i);
    for (const r of rows) for (let c = sel.left; c <= sel.right; c++) fn(r, c);
  }, [hasActiveFilter, actualToVisibleIndex, filteredRows]);

  const getSelectedActualRowList = useCallback(sel => {
    const out = [];
    forEachSelectedCell(sel, (r, c) => { if (c === sel.left) out.push(r); });
    return Array.from(new Set(out));
  }, [forEachSelectedCell]);

  const addRow = useCallback(() => { if (numRows < MAX_ROWS) setNumRows(n => n + 1); }, [numRows]);

  const addColumn = useCallback(() => { if (numCols < MAX_COLS) setNumCols(n => n + 1); }, [numCols]);

  const handleUndo = useCallback(() => {
    commitActiveCellIfNeeded();
    if (!undoStack.length) return;

    const currentState = { ...tableDataRef.current };
    const previousState = undoStack[undoStack.length - 1];

    setUndoStack(s => s.slice(0, -1));
    setRedoStack(r => [...r, currentState]);

    tableDataRef.current = previousState;
    setTableData(previousState);
    onSaveStatusChange?.("Unsaved Changes");
    if (typeof onEdit === "function") {
      onEdit({ fullCode: generateCSV(currentState) }, { fullCode: generateCSV(previousState) });
    }
  }, [undoStack, commitActiveCellIfNeeded, onEdit, onSaveStatusChange]);

  const handleRedo = useCallback(() => {
    commitActiveCellIfNeeded();
    if (!redoStack.length) return;

    const currentState = { ...tableDataRef.current };
    const nextState = redoStack[redoStack.length - 1];

    setRedoStack(r => r.slice(0, -1));
    setUndoStack(s => [...s, currentState]);

    tableDataRef.current = nextState;
    setTableData(nextState);
    onSaveStatusChange?.("Unsaved Changes");
    if (typeof onEdit === "function") {
      onEdit({ fullCode: generateCSV(currentState) }, { fullCode: generateCSV(nextState) });
    }
  }, [redoStack, commitActiveCellIfNeeded, onEdit, onSaveStatusChange]);

  const handleSelectAll = useCallback(() => {
    commitActiveCellIfNeeded();
    if (hasActiveFilter) {
      if (!filteredRows.length) { setSelection(null); return; }
      setSelection({ top: filteredRows[0], left: 0, bottom: filteredRows[filteredRows.length - 1], right: effectiveCols - 1 });
    } else {
      setSelection({ top: 0, left: 0, bottom: effectiveRows - 1, right: effectiveCols - 1 });
    }
  }, [commitActiveCellIfNeeded, hasActiveFilter, filteredRows, effectiveCols, effectiveRows]);

  const handleCut = useCallback(() => {
    commitActiveCellIfNeeded();
    if (!selection) return;
    const clip = {};
    forEachSelectedCell(selection, (r, c) => { clip[toKey(r, c)] = tableDataRef.current[toKey(r, c)] || ""; });
    setClipboardData(clip);
    withTableMutation(next => { forEachSelectedCell(selection, (r, c) => { delete next[toKey(r, c)]; }); });
  }, [selection, forEachSelectedCell, withTableMutation, commitActiveCellIfNeeded]);

  const handleCopy = useCallback(() => {
    commitActiveCellIfNeeded();
    if (!selection) return;
    const clip = {};
    forEachSelectedCell(selection, (r, c) => { clip[toKey(r, c)] = tableDataRef.current[toKey(r, c)] || ""; });
    setClipboardData(clip);
  }, [selection, forEachSelectedCell, commitActiveCellIfNeeded]);

  const handleClearSelection = useCallback(() => {
    if (!selection) return;
    withTableMutation(next => { forEachSelectedCell(selection, (r, c) => { delete next[toKey(r, c)]; }); });
  }, [selection, withTableMutation, forEachSelectedCell]);

  const handlePaste = useCallback(async () => {
    commitActiveCellIfNeeded();
    if (!selection || !clipboardData) return;
    const keys = Object.keys(clipboardData);
    let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
    keys.forEach(k => { const [r, c] = fromKey(k); minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); });
    const rs = maxR - minR + 1, cs = maxC - minC + 1;
    const destR = selection.top, destC = selection.left;
    let shouldAlert = false;
    outer: for (let r = 0; r < rs; r++) for (let c = 0; c < cs; c++) {
      const dk = toKey(destR + r, destC + c);
      const dv = (tableDataRef.current[dk] || "").trim();
      const sv = (clipboardData[toKey(minR + r, minC + c)] || "").trim();
      if (dv !== "" && dv !== sv) { shouldAlert = true; break outer; }
    }
    if (shouldAlert) {
      const res = await showDialog({ title: "System Alert", message: "The data being pasted over will be replaced. Do you want to continue?", showCancel: true });
      if (res === null) return;
    }
    withTableMutation(next => {
      for (let r = 0; r < rs; r++) for (let c = 0; c < cs; c++) {
        const sk = toKey(minR + r, minC + c), dk = toKey(destR + r, destC + c);
        const v = clipboardData[sk];
        v !== undefined ? next[dk] = v : delete next[dk];
      }
    });
    setActiveCell({ row: null, col: null });
    document.activeElement?.blur?.();
  }, [selection, clipboardData, commitActiveCellIfNeeded, withTableMutation]);

  const sortTableByColumn = useCallback((command) => {
    const sel = selection || (hasActiveFilter && filteredRows.length
      ? { top: filteredRows[0], left: 0, bottom: filteredRows[filteredRows.length - 1], right: effectiveCols - 1 }
      : { top: 0, left: 0, bottom: effectiveRows - 1, right: effectiveCols - 1 });
    const sortCol = sel.left, startRow = sel.top, endRow = sel.bottom;
    const rowsToSort = []; for (let i = 0; i <= (endRow - startRow); i++) rowsToSort.push(startRow + i);

    rowsToSort.sort((a, b) => {
      const aVal = tableDataRef.current[toKey(a, sortCol)], bVal = tableDataRef.current[toKey(b, sortCol)];
      const aE = !aVal || aVal === "", bE = !bVal || bVal === "";
      if (aE && !bE) return 1; if (!aE && bE) return -1; if (aE && bE) return 0;
      if (command === "sortAZ" || command === "sortZA") { const aS = aVal.toString().toLowerCase(), bS = bVal.toString().toLowerCase(); return command === "sortAZ" ? aS.localeCompare(bS) : bS.localeCompare(aS); }
      else { const aN = parseFloat(aVal) || 0, bN = parseFloat(bVal) || 0; return command === "sortNumericAsc" ? aN - bN : bN - aN; }
    });
    withTableMutation(newTableData => {
      for (let idx = 0; idx < rowsToSort.length; idx++) {
        const sortedRow = rowsToSort[idx], targetRow = startRow + idx;
        for (let col = 0; col < effectiveCols; col++) {
          const oldKey = toKey(sortedRow, col), newKey = toKey(targetRow, col);
          const originalValue = tableDataRef.current[oldKey];
          if (originalValue !== undefined) {
            newTableData[newKey] = originalValue;
          } else {
            delete newTableData[newKey];
          }
        }
      }
    });
    setOpenMenu(null);
  }, [selection, hasActiveFilter, filteredRows, effectiveCols, effectiveRows, withTableMutation]);

  function highlightAll(term) {
    commitActiveCellIfNeeded();
    if (!term) { setSearchResults([]); setCurrentResultIndex(-1); return; }
    const results = [], cmpTerm = caseSensitive ? term : term.toLowerCase();
    Object.keys(tableDataRef.current).forEach(k => {
      const orig = tableDataRef.current[k]; if (!orig) return;
      const cmpVal = caseSensitive ? orig : orig.toLowerCase();
      let s = 0; while (true) {
        const p = cmpVal.indexOf(cmpTerm, s); if (p === -1) break;
        const [r, c] = fromKey(k); results.push({ row: r, col: c, indexInCell: p, length: term.length }); s = p + term.length;
      }
    });
    setSearchResults(results); setCurrentResultIndex(results.length ? 0 : -1);
  }

  const goToNext = () => { if (searchResults.length) setCurrentResultIndex(i => (i + 1) % searchResults.length); };
  const goToPrevious = () => { if (searchResults.length) setCurrentResultIndex(i => (i - 1 + searchResults.length) % searchResults.length); };

  function replaceCurrent() {
    commitActiveCellIfNeeded();
    if (currentResultIndex < 0 || currentResultIndex >= searchResults.length) return;
    const r = searchResults[currentResultIndex];
    const oldVal = tableDataRef.current[toKey(r.row, r.col)] || "";
    const nv = oldVal.slice(0, r.indexInCell) + replaceTerm + oldVal.slice(r.indexInCell + r.length);
    withTableMutation(next => { next[toKey(r.row, r.col)] = nv; });
    setTimeout(() => highlightAll(searchTerm), 0);
  }

  function replaceAll() {
    commitActiveCellIfNeeded();
    if (!searchResults.length) return;
    withTableMutation(next => {
      for (const r of searchResults) {
        const k = toKey(r.row, r.col), ov = next[k] || ""; if (!ov) continue;
        next[k] = caseSensitive ? ov.replaceAll(searchTerm, replaceTerm)
          : ov.replace(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), replaceTerm);
      }
    });
    setTimeout(() => highlightAll(searchTerm), 0);
  }

  const getRowHeight = useCallback((index) => { const ar = hasActiveFilter ? filteredRows[index] : index; return ar !== undefined ? (rowHeights[ar] || DEFAULT_ROW_HEIGHT) : DEFAULT_ROW_HEIGHT; }, [hasActiveFilter, filteredRows, rowHeights]);

  const getColWidth = useCallback((index) => colWidths[index] || DEFAULT_COL_WIDTH, [colWidths]);

  const getVisibleRowIndexFromPosition = useCallback((y) => { if (hasActiveFilter) return idxFromCumulative(filteredRowHeightsCumulative, y); return idxFromCumulativeExtend(rowHeightsCumulative, y, DEFAULT_ROW_HEIGHT); }, [hasActiveFilter, filteredRowHeightsCumulative, rowHeightsCumulative]);

  const getColIndexFromPosition = useCallback((x) => { return idxFromCumulativeExtend(colWidthsCumulative, x, DEFAULT_COL_WIDTH); }, [colWidthsCumulative]);

  const buildRefTextForPick = useCallback((start, end) => {
    if (!start || !end) return "";
    const r1 = Math.min(start.row, end.row), r2 = Math.max(start.row, end.row);
    const c1 = Math.min(start.col, end.col), c2 = Math.max(start.col, end.col);
    if (!hasActiveFilter) {
      return (r1 === r2 && c1 === c2)
        ? a1FromRC(r1, c1)
        : `${a1FromRC(r1, c1)}:${a1FromRC(r2, c2)}`;
    }
    const v1 = actualToVisibleIndex(r1);
    const v2 = actualToVisibleIndex(r2);
    if (v1 === -1 && v2 === -1) return "";
    const from = Math.max(0, Math.min(v1 === -1 ? 0 : v1, v2 === -1 ? filteredRows.length - 1 : v2));
    const to = Math.min(filteredRows.length - 1, Math.max(v1 === -1 ? 0 : v1, v2 === -1 ? filteredRows.length - 1 : v2));
    const visibleActuals = filteredRows.slice(from, to + 1);
    if (!visibleActuals.length) return "";
    const blocks = [];
    let bStart = visibleActuals[0], last = visibleActuals[0];
    for (let i = 1; i < visibleActuals.length; i++) {
      const cur = visibleActuals[i];
      if (cur !== last + 1) { blocks.push([bStart, last]); bStart = cur; }
      last = cur;
    }
    blocks.push([bStart, last]);
    const parts = blocks.map(([br1, br2]) =>
      (br1 === br2 && c1 === c2)
        ? a1FromRC(br1, c1)
        : `${a1FromRC(br1, c1)}:${a1FromRC(br2, c2)}`
    );
    return parts.join(",");
  }, [hasActiveFilter, filteredRows, actualToVisibleIndex]);

  function insertRefIntoActiveInput(refText, { overrideInCurrentArgument = true } = {}) {
    const target = (document.activeElement === activeInputRef.current)
      ? activeInputRef.current
      : (document.activeElement === formulaBarRef.current ? formulaBarRef.current : activeInputRef.current);
    if (!target) return;
    const original = target.value;
    let base = original;
    let start = target.selectionStart ?? original.length;
    let end = target.selectionEnd ?? start;
    if (!original.trim().startsWith("=")) {
      base = "=" + original.replace(/^\s+/, "");
      const delta = base.length - original.length;
      start += delta; end += delta;
    }
    let newVal;
    if (overrideInCurrentArgument && isExpectingFunctionRange(base, start)) {
      const leftPart = base.slice(0, start);
      const rightPart = base.slice(start);
      const lastParen = leftPart.lastIndexOf("(");
      const lastComma = leftPart.lastIndexOf(",");
      const argStart = Math.max(lastParen, lastComma) + 1;
      const nextComma = rightPart.indexOf(",");
      const nextParen = rightPart.indexOf(")");
      let argEndInRight = rightPart.length;
      if (nextComma !== -1) argEndInRight = Math.min(argEndInRight, nextComma);
      if (nextParen !== -1) argEndInRight = Math.min(argEndInRight, nextParen);
      const argEnd = start + argEndInRight;
      newVal = base.slice(0, argStart) + refText + base.slice(argEnd);
      const caret = argStart + refText.length;
      setCellEditingValue(newVal);
      const h = cellHistoryRef.current;
      if (h.undo[h.undo.length - 1] !== newVal) { h.undo.push(newVal); h.redo = []; }
      requestAnimationFrame(() => { try { target.focus(); target.setSelectionRange(caret, caret); } catch { } });
      return;
    }
    const before = base.slice(0, start);
    const after = base.slice(end);
    newVal = before + refText + after;
    setCellEditingValue(newVal);
    const h = cellHistoryRef.current;
    if (h.undo[h.undo.length - 1] !== newVal) { h.undo.push(newVal); h.redo = []; }
    requestAnimationFrame(() => {
      try { target.focus(); const caret = before.length + refText.length; target.setSelectionRange(caret, caret); } catch { }
    });
  }

  const isFormulaEditing = () => {
    const val = (document.activeElement === activeInputRef.current ? activeInputRef.current?.value : (document.activeElement === formulaBarRef.current ? formulaBarRef.current?.value : "")) || cellEditingValue || "";
    return !!val.trim().startsWith("=");
  };

  const currentFormulaPreview = useMemo(() => {
    let row = activeCell.row, col = activeCell.col, text = cellEditingValue;
    if (row === null || col === null) {
      if (selection && selection.top === selection.bottom && selection.left === selection.right) {
        row = selection.top; col = selection.left;
        text = tableDataRef.current[toKey(row, col)] || "";
      } else {
        return null;
      }
    }
    const r = extractFirstRefOrRange(text);
    return r;
  }, [activeCell.row, activeCell.col, cellEditingValue, selection]);

  const summaryStats = useMemo(() => {
    const data = [];
    const sourceSelection = selection || { top: 0, left: 0, bottom: effectiveRows - 1, right: effectiveCols - 1 };

    forEachSelectedCell(sourceSelection, (r, c) => {
      const val = computedTableData[toKey(r, c)] || tableDataRef.current[toKey(r, c)] || "";
      if (val.trim() !== "") {
        const num = parseFloat(val);
        if (!isNaN(num) && isFinite(num)) {
          data.push(num);
        }
      }
    });
    if (data.length === 0) {
      return {
        count: 0,
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        nullCount: 0,
        naCount: 0,
        missingPercent: 0,
        uniqueValues: 0,
        duplicateCount: 0
      };
    }
    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / data.length;
    const median = data.length % 2 === 0
      ? (sorted[data.length / 2 - 1] + sorted[data.length / 2]) / 2
      : sorted[Math.floor(data.length / 2)];

    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const min = Math.min(...data);
    const max = Math.max(...data);
    let totalCells = 0;
    let nullCount = 0;
    let naCount = 0;
    const allValues = [];

    forEachSelectedCell(sourceSelection, (r, c) => {
      totalCells++;
      const val = computedTableData[toKey(r, c)] || tableDataRef.current[toKey(r, c)] || "";
      if (val.trim() === "") {
        nullCount++;
      } else if (val.toLowerCase().includes("n/a") || val.toLowerCase().includes("null")) {
        naCount++;
      }
      allValues.push(val);
    });
    const unique = [...new Set(allValues)];
    const uniqueValues = unique.length;
    const duplicateCount = totalCells - uniqueValues;
    const missingPercent = ((nullCount + naCount) / totalCells * 100);
    return {
      count: data.length,
      mean,
      median,
      stdDev,
      min,
      max,
      nullCount,
      naCount,
      missingPercent,
      uniqueValues,
      duplicateCount
    };
  }, [selection, computedTableData, tableDataRef, effectiveRows, effectiveCols, forEachSelectedCell]);

  function handleCellMouseDown(rowIndex, colIndex, e) {
    if (e.button !== 0) return;
    if ((document.activeElement === activeInputRef.current || document.activeElement === formulaBarRef.current) && isFormulaEditing()) {
      const target = document.activeElement;
      const caret = target?.selectionStart ?? undefined;
      if (isExpectingFunctionRange(target?.value ?? cellEditingValue, caret)) {
        e.preventDefault(); e.stopPropagation();
        setFormulaPick({ active: true, start: { row: rowIndex, col: colIndex }, end: { row: rowIndex, col: colIndex } });
        return;
      } else {
        commitActiveCellIfNeeded();
        setSelection({ top: rowIndex, left: colIndex, bottom: rowIndex, right: colIndex });
        return;
      }
    }
    setSkipClear(true);
    if (e.detail >= 2) {
      e.preventDefault(); e.stopPropagation();
      commitActiveCellIfNeeded();
      setSelection(null);
      activateCell(rowIndex, colIndex);
      return;
    }
    commitActiveCellIfNeeded();
    const isSingle = selection && selection.top === selection.bottom && selection.left === selection.right &&
      selection.top === rowIndex && selection.left === colIndex;
    if (isSingle && !e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      setSelection(null);
      if (!(activeCell.row === rowIndex && activeCell.col === colIndex)) activateCell(rowIndex, colIndex);
      return;
    }
    if (e.shiftKey && selection) {
      setSelection({
        top: Math.min(selection.top, rowIndex),
        left: Math.min(selection.left, colIndex),
        bottom: Math.max(selection.bottom, rowIndex),
        right: Math.max(selection.right, colIndex)
      });
      return;
    }
    setIsSelecting(true);
    setSelectionStart({ row: rowIndex, col: colIndex });
    setSelectionType("cell");
    setSelection({ top: rowIndex, left: colIndex, bottom: rowIndex, right: colIndex });
  }

  function handleColumnHeaderMouseDown(e, colIndex) {
    if ((document.activeElement === activeInputRef.current || document.activeElement === formulaBarRef.current) && isFormulaEditing()) {
      const target = document.activeElement;
      const caret = target?.selectionStart ?? undefined;
      if (isExpectingFunctionRange(target?.value ?? cellEditingValue, caret)) {
        e.preventDefault(); e.stopPropagation();
        const first = hasActiveFilter ? (filteredRows[0] ?? 0) : 0;
        const last = hasActiveFilter ? ((filteredRows[filteredRows.length - 1]) ?? (effectiveRows - 1)) : (effectiveRows - 1);
        setFormulaPick({ active: true, start: { row: first, col: colIndex }, end: { row: last, col: colIndex } });
        return;
      }
    }
    commitActiveCellIfNeeded(); e.preventDefault();
    const first = hasActiveFilter ? (filteredRows[0] ?? 0) : 0;
    const last = hasActiveFilter ? ((filteredRows[filteredRows.length - 1]) ?? (effectiveRows - 1)) : (effectiveRows - 1);
    if (e.shiftKey && selection && selection.top === first && selection.bottom === last) {
      setSelection({ top: first, left: Math.min(selection.left, colIndex), bottom: last, right: Math.max(selection.right, colIndex) });
      return;
    }
    setIsSelecting(true);
    setSelectionStart({ row: first, col: colIndex });
    setSelectionType("column");
    setSelection({ top: first, left: colIndex, bottom: last, right: colIndex });
  }

  function handleRowHeaderMouseDown(e, rowIndex) {
    if ((document.activeElement === activeInputRef.current || document.activeElement === formulaBarRef.current) && isFormulaEditing()) {
      const target = document.activeElement;
      const caret = target?.selectionStart ?? undefined;
      if (isExpectingFunctionRange(target?.value ?? cellEditingValue, caret)) {
        e.preventDefault(); e.stopPropagation();
        setFormulaPick({ active: true, start: { row: rowIndex, col: 0 }, end: { row: rowIndex, col: effectiveCols - 1 } });
        return;
      }
    }
    commitActiveCellIfNeeded(); e.preventDefault();
    if (e.shiftKey && selection && selection.left === 0 && selection.right === effectiveCols - 1) {
      setSelection({ top: Math.min(selection.top, rowIndex), left: 0, bottom: Math.max(selection.bottom, rowIndex), right: effectiveCols - 1 });
      return;
    }
    setIsSelecting(true);
    setSelectionStart({ row: rowIndex, col: 0 });
    setSelectionType("row");
    setSelection({ top: rowIndex, left: 0, bottom: rowIndex, right: effectiveCols - 1 });
  }

  const onCellValueChange = e => {
    const v = e.target.value;
    setCellEditingValue(v);
    setFormulaBarValue(v);
    const h = cellHistoryRef.current;
    if (!h.suppress) {
      const last = h.undo[h.undo.length - 1];
      if (last !== v) { h.undo.push(v); h.redo = []; }
    }
  };

  const handleCellBlur = e => {
    const maybeNext = e.relatedTarget || document.activeElement;
    if (maybeNext) {
      const nextCell = maybeNext.closest?.(".dinolabsTableCell");
      const thisCell = e.target.closest?.(".dinolabsTableCell");
      const inFormulaBar = !!maybeNext.closest?.(".dinolabsFormulaBarWrapper");
      if (inFormulaBar) return;
      if (nextCell === thisCell) return;
    }
    commitActiveCellIfNeeded();
  };

  const isCellInSelection = (r, c) => !!selection && r >= selection.top && r <= selection.bottom && c >= selection.left && c <= selection.right;

  function isCellHighlightedBySearch(r, c) {
    const found = searchResults.filter(res => res.row === r && res.col === c);
    if (!found.length) return false;
    const cur = currentResultIndex >= 0 && currentResultIndex < searchResults.length && searchResults[currentResultIndex].row === r && searchResults[currentResultIndex].col === c;
    return cur ? "current" : "matched";
  }

  function moveActiveCellHorizontally(offset) {
    if (activeCell.row === null || activeCell.col === null) return;
    let newCol = activeCell.col + offset;
    if (newCol >= effectiveCols && offset > 0 && numCols < MAX_COLS) { addColumn(); newCol = effectiveCols; }
    newCol = clampNum(newCol, 0, effectiveCols - 1);
    activateCell(activeCell.row, newCol);
    setSelection({ top: activeCell.row, left: newCol, bottom: activeCell.row, right: newCol });
  }

  function moveActiveCellVertically(offset) {
    if (activeCell.row === null || activeCell.col === null) return;
    const newRow = nextVisibleActualRow(activeCell.row, offset);
    activateCell(newRow, activeCell.col);
    setSelection({ top: newRow, left: activeCell.col, bottom: newRow, right: activeCell.col });
  }

  useEffect(() => {
    if (hasLoadedFile.current) return; hasLoadedFile.current = true;
    async function loadFile() {
      try {
        const file = typeof fileHandle?.getFile === "function" ? await fileHandle.getFile() : fileHandle;
        if (!file) { setLoading(false); return; }
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["csv"].includes(ext)) throw new Error(`Unsupported file type: .${ext}`);
        const text = await file.text();
        let lines = text.split(/\r?\n/); while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        const data = {}; let maxColsFound = 0;
        lines.forEach((line, r) => {
          const cells = line.split(","); if (cells.length > maxColsFound) maxColsFound = cells.length;
          cells.forEach((cell, c) => { if (cell.trim()) data[toKey(r, c)] = cell.trim(); });
        });
        let finalRows = lines.length, finalCols = maxColsFound, tr = 0, tc = 0;
        if (finalRows > MAX_ROWS) { tr = finalRows - MAX_ROWS; finalRows = MAX_ROWS; }
        if (finalCols > MAX_COLS) { tc = finalCols - MAX_COLS; finalCols = MAX_COLS; }
        let alertMessage = "";
        if (tr > 0) alertMessage += `Row count exceeds limit. ${tr === 1 ? "1 row will be truncated. " : `${tr} rows will be truncated. `}`;
        if (tc > 0) alertMessage += `Column count exceeds limit. ${tc === 1 ? "1 column will be truncated." : `${tc} columns will be truncated.`}`;
        if (alertMessage) {
          await showDialog({ title: "Data Truncation Alert", message: alertMessage });
          setTruncationInfo({ rows: tr, cols: tc });
          Object.keys(data).forEach(k => { const [r, c] = fromKey(k); if (r >= finalRows || c >= finalCols) delete data[k]; });
        }
        setTableData(data); setNumRows(finalRows); setNumCols(finalCols);
      } catch (error) { setError(error.message); } finally { setLoading(false); }
    }
    fileHandle ? loadFile() : setLoading(false);
  }, [fileHandle]);

  useEffect(() => {
    const isMac = isMacPlatform();
    function ensureSingleSelection() {
      if (activeCell.row !== null && activeCell.col !== null) return { row: activeCell.row, col: activeCell.col };
      if (selection) return { row: selection.top, col: selection.left };
      const startRow = hasActiveFilter ? (filteredRows[0] ?? 0) : 0;
      return { row: startRow, col: 0 };
    }
    function clampRC(rc) { return ensureInBounds(rc.row, rc.col, effectiveRows, effectiveCols); }
    function startEditAt(row, col) { commitActiveCellIfNeeded(); activateCell(row, col); }
    function handler(e) {
      const ae = document.activeElement;
      if ((ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable) && !isCellInput(ae))) return;
      if (isCellInput(ae)) return;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl) {
        const binds = normalizeBinds(keyBinds);
        if (binds.search.some(b => matchBind(e, b, isMac))) { stopAll(e); commitActiveCellIfNeeded(); setShowSearchPanel(true); return; }
        if (binds.save.some(b => matchBind(e, b, isMac))) { stopAll(e); commitActiveCellIfNeeded(); handleSave(); return; }
        if (binds.selectAll.some(b => matchBind(e, b, isMac))) { stopAll(e); handleSelectAll(); return; }
        if (binds.cut.some(b => matchBind(e, b, isMac))) { stopAll(e); selection && handleCut(); return; }
        if (binds.copy.some(b => matchBind(e, b, isMac))) { stopAll(e); selection && handleCopy(); return; }
        if (binds.paste.some(b => matchBind(e, b, isMac))) { stopAll(e); selection && handlePaste(); return; }
        if (binds.undo.some(b => matchBind(e, b, isMac))) { stopAll(e); handleUndo(); return; }
        if (binds.redo.some(b => matchBind(e, b, isMac))) { stopAll(e); handleRedo(); return; }
        return;
      }
      if (e.key === "Backspace") {
        if (selection && selection.top === selection.bottom && selection.left === selection.right) {
          stopAll(e); commitActiveCellIfNeeded();
          const k = toKey(selection.top, selection.left);
          if (tableDataRef.current[k] !== undefined) withTableMutation(next => { delete next[k]; });
          return;
        }
      }
      const k = e.key;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Tab"].includes(k)) return;
      stopAll(e);
      let { row, col } = ensureSingleSelection();
      if (k === "ArrowUp") row = nextVisibleActualRow(row, -1);
      else if (k === "ArrowDown") row = nextVisibleActualRow(row, 1);
      else if (k === "ArrowLeft") col -= 1;
      else if (k === "ArrowRight") col += 1;
      else if (k === "Tab") col += (e.shiftKey ? -1 : 1);
      if (k === "Enter") { const t = clampRC({ row, col }); startEditAt(t.row, t.col); return; }
      const t = clampRC({ row, col });
      setActiveCell({ row: null, col: null });
      setSelection({ top: t.row, left: t.col, bottom: t.row, right: t.col });
    }
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [
    keyBinds, selection, activeCell, undoStack, redoStack, effectiveRows, effectiveCols,
    hasActiveFilter, filteredRows, nextVisibleActualRow, withTableMutation, handleUndo, handleRedo,
    handleCut, handleCopy, handlePaste, handleSelectAll, commitActiveCellIfNeeded, activateCell, ensureInBounds
  ]);

  useEffect(() => {
    function posRelativeToContainer(e) {
      const rect = gridContainerRef.current?.getBoundingClientRect();
      if (!rect) return { rx: 0, ry: 0, rect: null };
      return { rx: e.clientX - rect.left + scrollPos.current.left, ry: e.clientY - rect.top + scrollPos.current.top, rect };
    }
    function onMouseMove(e) {
      if (searchPanelDragging) { setSearchPanelPos({ x: e.clientX - searchPanelOffset.x, y: e.clientY - searchPanelOffset.y }); return; }
      if (headerDrag && gridContainerRef.current) {
        if (headerDrag.type === "column") {
          const newWidth = Math.max(20, headerDrag.initialWidth + (e.clientX - headerDrag.startX));
          setColWidths(prev => { const copy = [...prev]; copy[headerDrag.col] = newWidth; dataGridRef.current?.resetAfterColumnIndex?.(0, true); return copy; });
        } else {
          const newHeight = Math.max(10, headerDrag.initialHeight + (e.clientY - headerDrag.startY));
          setRowHeights(prev => { const copy = [...prev]; copy[headerDrag.row] = newHeight; dataGridRef.current?.resetAfterRowIndex?.(0, true); return copy; });
        }
      }
      if (formulaPick.active && gridContainerRef.current) {
        const { rx, ry } = posRelativeToContainer(e);
        const vr = getVisibleRowIndexFromPosition(ry);
        const ar = visibleToActualRow(vr);
        const c = getColIndexFromPosition(rx);
        setFormulaPick(fp => ({ ...fp, end: { row: ar, col: c } }));
      }
      if (selectionResize.active && gridContainerRef.current) {
        const { rx, ry } = posRelativeToContainer(e);
        const visibleRow = getVisibleRowIndexFromPosition(ry);
        const newRowActual = visibleToActualRow(visibleRow);
        const newCol = getColIndexFromPosition(rx);
        const initial = selectionResize.initialSelection;
        let newBottom = Math.max(newRowActual, initial.top);
        let newRight = Math.max(newCol, initial.left);
        if (!hasActiveFilter && newBottom >= numRows && numRows < MAX_ROWS) {
          const add = newBottom - numRows + 1, added = Math.min(add, MAX_ROWS - numRows);
          setNumRows(prev => prev + added); if (added < add) newBottom = numRows + added - 1;
        }
        if (newRight >= numCols && numCols < MAX_COLS) {
          const add = newRight - numCols + 1, added = Math.min(add, MAX_COLS - numCols);
          setNumCols(prev => prev + added); if (added < add) newRight = numCols + added - 1;
        }
        setSelection({ top: initial.top, left: initial.left, bottom: newBottom, right: newRight });
      }
      if (dragRef.current?.active && previewRef.current) {
        previewRef.current.style.transform = `translate(${e.clientX - dragRef.current.startX}px, ${e.clientY - dragRef.current.startY}px)`;
      }
      if (!isSelecting || !selectionStart) return;
      const { rx, ry } = posRelativeToContainer(e);
      if (selectionType === "column") {
        const currentCol = getColIndexFromPosition(rx);
        const first = hasActiveFilter ? (filteredRows[0] ?? 0) : 0;
        const last = hasActiveFilter ? ((filteredRows[filteredRows.length - 1]) ?? (effectiveRows - 1)) : (effectiveRows - 1);
        setSelection({ top: first, left: Math.min(selectionStart.col, currentCol), bottom: last, right: Math.max(selectionStart.col, currentCol) });
      } else if (selectionType === "row") {
        const currentRow = visibleToActualRow(getVisibleRowIndexFromPosition(ry));
        setSelection({ top: Math.min(selectionStart.row, currentRow), left: 0, bottom: Math.max(selectionStart.row, currentRow), right: effectiveCols - 1 });
      } else if (selectionType === "cell") {
        const currentRow = visibleToActualRow(getVisibleRowIndexFromPosition(ry));
        const currentCol = getColIndexFromPosition(rx);
        setSelection({ top: Math.min(selectionStart.row, currentRow), left: Math.min(selectionStart.col, currentCol), bottom: Math.max(selectionStart.row, currentRow), right: Math.max(selectionStart.col, currentCol) });
      }
    }
    async function onMouseUp(e) {
      setSearchPanelDragging(false);
      if (formulaPick.active) {
        const { start, end } = formulaPick;
        if (start && end) {
          const refText = buildRefTextForPick(start, end);
          if (refText) insertRefIntoActiveInput(refText, { overrideInCurrentArgument: true });
        }
        setFormulaPick({ active: false, start: null, end: null });
      }
      if (isSelecting && selection) { setJustFinishedSelecting(true); setTimeout(() => setJustFinishedSelecting(false), 100); }
      if (selectionResize.active) { setJustFinishedSelecting(true); suppressNextOverlayClickRef.current = true; setTimeout(() => setJustFinishedSelecting(false), 100); }
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionType(null);
      setHeaderDrag(null);
      if (selectionResize.active) setSelectionResize({ active: false, handle: null, startX: 0, startY: 0, initialSelection: null });
      if (dragRef.current?.active) {
        previewRef.current?.remove?.();
        previewRef.current = null;
        const dragState = dragRef.current;
        dragRef.current = null;
        if (gridContainerRef.current) {
          const { rx, ry } = (() => {
            const rect = gridContainerRef.current.getBoundingClientRect();
            return { rx: e.clientX - rect.left + scrollPos.current.left, ry: e.clientY - rect.top + scrollPos.current.top };
          })();
          const targetVisibleRow = getVisibleRowIndexFromPosition(ry);
          const targetRowActual = visibleToActualRow(targetVisibleRow);
          const targetCol = getColIndexFromPosition(rx);
          const rowsOrig = getSelectedActualRowList(dragState.originalSelection);
          if (!rowsOrig.length) return;
          let rowOffsetVisible = hasActiveFilter
            ? targetVisibleRow - (actualToVisibleIndex(rowsOrig[0]) + dragState.grabVisibleOffset)
            : targetRowActual - (dragState.originalSelection.top + dragState.grabRowOffset);
          let rowsDestActual = [];
          if (hasActiveFilter) {
            const sVis = actualToVisibleIndex(rowsOrig[0]);
            const eVis = actualToVisibleIndex(rowsOrig[rowsOrig.length - 1]);
            if (sVis === -1 || eVis === -1) return;
            let dStart = clampNum(sVis + rowOffsetVisible, 0, filteredRows.length - 1);
            let dEnd = clampNum(eVis + rowOffsetVisible, 0, filteredRows.length - 1);
            const from = Math.min(dStart, dEnd), to = Math.max(dStart, dEnd);
            rowsDestActual = filteredRows.slice(from, to + 1);
            if (rowsDestActual.length !== rowsOrig.length) rowsDestActual = rowsDestActual.slice(0, Math.min(rowsOrig.length, rowsDestActual.length));
          } else {
            const newTop = dragState.originalSelection.top + rowOffsetVisible;
            rowsDestActual = Array.from({ length: rowsOrig.length }, (_, i) => newTop + i);
            const maxNeeded = rowsDestActual[rowsDestActual.length - 1];
            if (maxNeeded >= numRows && numRows < MAX_ROWS) { const add = maxNeeded - numRows + 1, added = Math.min(add, MAX_ROWS - numRows); setNumRows(n => n + added); }
          }
          const colOffset = targetCol - dragState.originalSelection.left - dragState.grabColOffset;
          const destLeft = Math.max(0, dragState.originalSelection.left + colOffset);
          const destRight = Math.min(effectiveCols - 1, destLeft + (dragState.originalSelection.right - dragState.originalSelection.left));
          let shouldAlert = false;
          const colsSpan = destRight - destLeft + 1;
          outer: for (let i = 0; i < rowsDestActual.length; i++) {
            for (let j = 0; j < colsSpan; j++) {
              const destR = rowsDestActual[i], destC = destLeft + j;
              const srcR = rowsOrig[i], srcC = dragState.originalSelection.left + j;
              const inOrig = destR >= dragState.originalSelection.top && destR <= dragState.originalSelection.bottom &&
                destC >= dragState.originalSelection.left && destC <= dragState.originalSelection.right;
              if (inOrig) continue;
              const dK = toKey(destR, destC);
              const dV = (tableDataRef.current[dK] || "").trim();
              const sV = (tableDataRef.current[toKey(srcR, srcC)] || "").trim();
              if (dV !== "" && dV !== sV) { shouldAlert = true; break outer; }
            }
          }
          let proceed = true;
          if (shouldAlert) {
            const res = await showDialog({ title: "System Alert", message: "The data being moved will replace existing data. Do you want to continue?", showCancel: true });
            if (res === null) proceed = false;
          }
          if (proceed) {
            const sourceData = {};
            for (const r of rowsOrig) {
              for (let c = dragState.originalSelection.left; c <= dragState.originalSelection.right; c++) {
                const key = toKey(r, c);
                const value = tableDataRef.current[key];
                if (value !== undefined) {
                  sourceData[key] = value;
                }
              }
            }
            withTableMutation(next => {
              for (const r of rowsOrig) {
                for (let c = dragState.originalSelection.left; c <= dragState.originalSelection.right; c++) {
                  delete next[toKey(r, c)];
                }
              }

              const colsSpan = dragState.originalSelection.right - dragState.originalSelection.left + 1;
              const rowsCount = Math.min(rowsOrig.length, rowsDestActual.length);
              for (let i = 0; i < rowsCount; i++) {
                const srcR = rowsOrig[i], destR = rowsDestActual[i];
                for (let j = 0; j < colsSpan; j++) {
                  const srcC = dragState.originalSelection.left + j, destC = destLeft + j;
                  const sourceKey = toKey(srcR, srcC);
                  const destKey = toKey(destR, destC);
                  const value = sourceData[sourceKey];
                  if (value !== undefined && value !== "") {
                    next[destKey] = value;
                  } else {
                    delete next[destKey];
                  }
                }
              }
            });
            setSelection({ top: rowsDestActual[0], left: destLeft, bottom: rowsDestActual[rowsDestActual.length - 1], right: destRight });
            setActiveCell({ row: null, col: null });
            setIsMoving(true);
          }
        }
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    searchPanelDragging, searchPanelOffset, isSelecting, selectionStart, selectionType,
    effectiveRows, effectiveCols, selectionResize.active, headerDrag,
    hasActiveFilter, numRows, numCols, filteredRows, visibleToActualRow, actualToVisibleIndex,
    getVisibleRowIndexFromPosition, getColIndexFromPosition, withTableMutation, formulaPick, buildRefTextForPick, getSelectedActualRowList
  ]);

  useEffect(() => {
    if (isMoving) {
      setSelectionDrag({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, originalSelection: null, block: null, grabRowOffset: 0, grabColOffset: 0, grabVisibleOffset: 0 });
      setIsMoving(false);
    }
  }, [isMoving]);

  useEffect(() => {
    function handleDocMouseDown(e) {
      const target = e.target;
      const inGrid = !!target.closest?.(".dinolabsTableGridContainer");
      const inFormulaBar = !!target.closest?.(".dinolabsFormulaBarWrapper");
      if (interactingWithFormulaBarRef.current) return;
      if (!inGrid && !inFormulaBar) {
        if (document.activeElement === activeInputRef.current || document.activeElement === formulaBarRef.current) {
          commitActiveCellIfNeeded();
        }
      }
    }
    document.addEventListener("mousedown", handleDocMouseDown, true);
    return () => document.removeEventListener("mousedown", handleDocMouseDown, true);
  }, [commitActiveCellIfNeeded]);

  const selectionBounds = useCallback((sel) => {
    if (!sel) return { top: 0, left: 0, width: 0, height: 0 };
    if (hasActiveFilter) {
      const sTopVis = actualToVisibleIndex(sel.top);
      const sBotVis = actualToVisibleIndex(sel.bottom);
      const startIndex = Math.min(sTopVis, sBotVis);
      const endIndex = Math.max(sTopVis, sBotVis);
      const top = startIndex >= 0 ? filteredRowHeightsCumulative[startIndex] : 0;
      const left = colWidthsCumulative[sel.left];
      const width = colWidthsCumulative[sel.right + 1] - colWidthsCumulative[sel.left];
      const height = endIndex >= 0 ? filteredRowHeightsCumulative[endIndex + 1] - filteredRowHeightsCumulative[startIndex] : 0;
      return { top, left, width, height };
    }
    const top = rowHeightsCumulative[sel.top];
    const left = colWidthsCumulative[sel.left];
    const width = colWidthsCumulative[sel.right + 1] - colWidthsCumulative[sel.left];
    const height = rowHeightsCumulative[sel.bottom + 1] - rowHeightsCumulative[sel.top];
    return { top, left, width, height };
  }, [hasActiveFilter, actualToVisibleIndex, filteredRowHeightsCumulative, rowHeightsCumulative, colWidthsCumulative]);

  function handleSelectionMouseDown(e) {
    if (e.target.classList.contains("dinolabsTableSelectionHandleBottomRight")) return;
    e.stopPropagation();
    e.preventDefault();
    if (!selection || !gridContainerRef.current) return;
    const rows = getSelectedActualRowList(selection);
    if (!rows.length) return;
    const snapshot = rows.map(r => {
      const rowData = [];
      for (let c = selection.left; c <= selection.right; c++) rowData.push(tableDataRef.current[toKey(r, c)] ?? "");
      return rowData;
    });
    const containerRect = gridContainerRef.current.getBoundingClientRect();
    const grabScreenX = e.clientX, grabScreenY = e.clientY;
    const visibleGrabRow = getVisibleRowIndexFromPosition(grabScreenY - containerRect.top + scrollPos.current.top);
    const grabRowActual = visibleToActualRow(visibleGrabRow);
    const grabCol = getColIndexFromPosition(grabScreenX - containerRect.left + scrollPos.current.left);
    const selStartVis = actualToVisibleIndex(rows[0]);
    const grabVis = actualToVisibleIndex(grabRowActual);
    const grabVisibleOffset = Math.max(0, grabVis - selStartVis);
    const grabRowOffset = grabRowActual - selection.top;
    const grabColOffset = grabCol - selection.left;
    dragRef.current = { active: true, startX: grabScreenX, startY: grabScreenY, originalSelection: selection, block: snapshot, grabRowOffset, grabColOffset, grabVisibleOffset };
    const prev = document.createElement("div");
    prev.style.position = "absolute";
    prev.style.zIndex = "5"; 
    prev.style.pointerEvents = "none";
    prev.style.border = "2px solid #007acc";
    prev.style.backgroundColor = "rgba(0,122,255,0.5)";
    const { top, left, width, height } = selectionBounds(selection);
    const screenTop = top - scrollPos.current.top; 
    const screenLeft = left - scrollPos.current.left;
    Object.assign(prev.style, { top: `${screenTop}px`, left: `${screenLeft}px`, width: `${width}px`, height: `${height}px` });
    gridContainerRef.current.appendChild(prev); 
    previewRef.current = prev;
  }

  function startSelectionResize(_, e) {
    e.preventDefault(); e.stopPropagation(); if (!selection) return;
    commitActiveCellIfNeeded(); setActiveCell({ row: null, col: null });
    setSkipClear(true);
    suppressNextOverlayClickRef.current = true;
    setSelectionResize({ active: true, handle: "bottom-right", startX: e.clientX, startY: e.clientY, initialSelection: { ...selection } });
  }

  function handleSelectionDoubleClick(e) {
    e.stopPropagation();
    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const rx = e.clientX - rect.left + scrollPos.current.left;
    const ry = e.clientY - rect.top + scrollPos.current.top;
    const clickedRowActual = visibleToActualRow(getVisibleRowIndexFromPosition(ry));
    const clickedCol = getColIndexFromPosition(rx);
    activateCell(clickedRowActual, clickedCol);
  }

  function handleSelectionClick(e) {
    e.stopPropagation();
    if (suppressNextOverlayClickRef.current || justFinishedSelecting) { suppressNextOverlayClickRef.current = false; return; }
    if (!selection) return;
    const isSingle = selection.top === selection.bottom && selection.left === selection.right;
    if (isSingle) { setSelection(null); activateCell(selection.top, selection.left); }
    else { setSelection(null); }
  }

  useLayoutEffect(() => {
    if (selection && selectionOverlayRef.current) {
      const b = selectionBounds(selection);
      const top = b.top - scrollPos.current.top;
      const left = b.left - scrollPos.current.left;
      Object.assign(selectionOverlayRef.current.style, { top: `${top}px`, left: `${left}px`, width: `${b.width}px`, height: `${b.height}px` });
    }
  }, [selection, selectionBounds, hasActiveFilter]);

  const itemData = useMemo(() => ({
    tableDataRef, activeCell, cellEditingValue, selection, searchResults, currentResultIndex,
    selectionDrag, filteredRows, hasActiveFilter, handleCellMouseDown, handleCellDoubleClick: activateCell,
    onCellValueChange, handleCellBlur, moveActiveCellHorizontally,
    moveActiveCellVertically, isCellInSelection, isCellHighlightedBySearch, activeInputRef, keyBinds, cellHistoryRef,
    selectionEpoch, computedTableData, setFormulaBarValue, commitActiveCellIfNeeded
  }), [
    tableDataRef, activeCell, cellEditingValue, selection, searchResults, currentResultIndex, selectionDrag,
    filteredRows, hasActiveFilter, keyBinds, selectionEpoch, computedTableData, commitActiveCellIfNeeded
  ]);

  const Cell = React.memo(function Cell({ columnIndex, rowIndex, style, data }) {
    const {
      tableDataRef, activeCell, cellEditingValue, handleCellMouseDown, handleCellDoubleClick,
      onCellValueChange, handleCellBlur, moveActiveCellHorizontally, moveActiveCellVertically,
      isCellInSelection, isCellHighlightedBySearch, filteredRows, hasActiveFilter, activeInputRef, keyBinds, cellHistoryRef, computedTableData, commitActiveCellIfNeeded, setFormulaBarValue
    } = data;
    const actualRowIndex = hasActiveFilter ? filteredRows[rowIndex] : rowIndex;
    if (actualRowIndex === undefined) return <div style={style} />;
    const cellIsActive = activeCell.row === actualRowIndex && activeCell.col === columnIndex;
    const isSelected = isCellInSelection(actualRowIndex, columnIndex);
    const sh = isCellHighlightedBySearch(actualRowIndex, columnIndex);
    let backgroundColor = "transparent", border = "1px solid #444";
    if (sh === "matched") backgroundColor = "rgba(255,255,0,0.2)";
    else if (sh === "current") backgroundColor = "rgba(255,255,0,0.5)";
    else if (cellIsActive) { backgroundColor = "rgba(0,122,255,0.3)"; border = "2px solid #007acc"; }
    else if (isSelected) backgroundColor = "rgba(255,255,255,0.1)";
    const outerStyle = { ...style, backgroundColor, boxSizing: "border-box", border };
    const innerStyle = { userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", width: "100%", height: "100%", cursor: "default", paddingLeft: "10px", paddingRight: "10px", display: "flex", alignItems: "center", minHeight: "100%", boxSizing: "border-box" };
    const rawKey = toKey(actualRowIndex, columnIndex);
    const rawVal = tableDataRef.current[rawKey] || "";
    const displayVal = (cellIsActive ? cellEditingValue : (computedTableData[rawKey] ?? rawVal)) || "";
    const binds = normalizeBinds(keyBinds);
    function setInputValueAndKeepCaret(input, value, toEnd = true) {
      cellHistoryRef.current.suppress = true;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      if (input.classList?.contains("dinolabsTableCellInput")) {
        setFormulaBarValue?.(value);
      }
      cellHistoryRef.current.suppress = false;
      try { if (toEnd) input.setSelectionRange(value.length, value.length); } catch { }
    }
    async function handleInCellShortcut(e) {
      const isMac = isMacPlatform();
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (!cmdOrCtrl) return false;
      const input = e.currentTarget;
      const val = input.value;
      const selStart = input.selectionStart ?? 0;
      const selEnd = input.selectionEnd ?? 0;
      const hasSel = selEnd > selStart;
      if (binds.search.some(b => matchBind(e, b, isMac))) { stopAll(e); input.blur(); return true; }
      if (binds.save.some(b => matchBind(e, b, isMac))) { stopAll(e); input.blur(); return true; }
      if (binds.selectAll.some(b => matchBind(e, b, isMac))) { stopAll(e); try { input.setSelectionRange(0, val.length); } catch { } return true; }
      if (binds.copy.some(b => matchBind(e, b, isMac))) { stopAll(e); const toCopy = hasSel ? val.slice(selStart, selEnd) : val; await navigator.clipboard?.writeText?.(toCopy); return true; }
      if (binds.cut.some(b => matchBind(e, b, isMac))) {
        stopAll(e);
        const toCut = hasSel ? val.slice(selStart, selEnd) : val;
        await navigator.clipboard?.writeText?.(toCut);
        const newVal = hasSel ? (val.slice(0, selStart) + val.slice(selEnd)) : "";
        const h = cellHistoryRef.current; if (h.undo[h.undo.length - 1] !== newVal) h.undo.push(newVal); h.redo = [];
        setInputValueAndKeepCaret(input, newVal, true);
        return true;
      }
      if (binds.paste.some(b => matchBind(e, b, isMac))) {
        stopAll(e);
        let pasteText = ""; try { pasteText = await navigator.clipboard.readText(); } catch { }
        const newVal = val.slice(0, selStart) + pasteText + val.slice(selEnd);
        const h = cellHistoryRef.current; if (h.undo[h.undo.length - 1] !== newVal) h.undo.push(newVal); h.redo = [];
        setInputValueAndKeepCaret(input, newVal, true);
        return true;
      }
      if (binds.undo.some(b => matchBind(e, b, isMac)) && !e.shiftKey) {
        stopAll(e);
        const h = cellHistoryRef.current;
        if (h.undo.length > 1) {
          const cur = h.undo.pop();
          h.redo.push(cur);
          const prev = h.undo[h.undo.length - 1];
          setInputValueAndKeepCaret(input, prev, true);
          onCellValueChange({ target: { value: prev } });
        }
        return true;
      }
      if (binds.redo.some(b => matchBind(e, b, isMac))) {
        stopAll(e);
        const h = cellHistoryRef.current;
        if (h.redo.length > 0) {
          const next = h.redo.pop();
          h.undo.push(next);
          setInputValueAndKeepCaret(input, next, true);
          onCellValueChange({ target: { value: next } });
        }
        return true;
      }
      return false;
    }
    return (
      <div
        style={outerStyle}
        className="dinolabsTableCell"
        onMouseDown={e => handleCellMouseDown(actualRowIndex, columnIndex, e)}
        onDoubleClick={() => handleCellDoubleClick(actualRowIndex, columnIndex)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {cellIsActive ? (
          <div style={innerStyle}>
            <input
              type="text"
              className="dinolabsTableCellInput"
              ref={activeInputRef}
              value={cellEditingValue}
              onChange={onCellValueChange}
              onBlur={handleCellBlur}
              onKeyDown={async e => {
                const handled = await handleInCellShortcut(e);
                if (handled) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitActiveCellIfNeeded();
                }
                else if (e.key === "Tab") {
                  e.preventDefault();
                  e.currentTarget.blur();
                  moveActiveCellHorizontally(e.shiftKey ? -1 : 1);
                }
                else if (e.key === "Escape") {
                  e.preventDefault();
                  commitActiveCellIfNeeded();
                }
                else if (e.key === "ArrowRight" && !e.shiftKey && e.currentTarget.selectionStart === e.currentTarget.selectionEnd && e.currentTarget.selectionStart === e.currentTarget.value.length) {
                  e.preventDefault();
                  e.currentTarget.blur();
                  moveActiveCellHorizontally(1);
                }
                else if (e.key === "ArrowLeft" && !e.shiftKey && e.currentTarget.selectionStart === e.currentTarget.selectionEnd && e.currentTarget.selectionStart === 0) {
                  e.preventDefault();
                  e.currentTarget.blur();
                  moveActiveCellHorizontally(-1);
                }
                else if (e.key === "ArrowDown" && !e.shiftKey && e.currentTarget.selectionStart === e.currentTarget.selectionEnd && e.currentTarget.selectionStart === e.currentTarget.value.length) {
                  e.preventDefault();
                  e.currentTarget.blur();
                  moveActiveCellVertically(1);
                }
                else if (e.key === "ArrowUp" && !e.shiftKey && e.currentTarget.selectionStart === e.currentTarget.selectionEnd && e.currentTarget.selectionStart === 0) {
                  e.preventDefault();
                  e.currentTarget.blur();
                  moveActiveCellVertically(-1);
                }
              }}
              style={{ userSelect: "text", WebkitUserSelect: "text", MozUserSelect: "text", width: "100%", border: "none", background: "transparent", outline: "none", color: "#f5f5f5" }}
              autoFocus
            />
          </div>
        ) : (
          <div className="dinolabsTableCellContent" style={innerStyle}>
            {displayVal || "\u00A0"}
          </div>
        )}
      </div>
    );
  });

  const cellRenderer = props => <Cell {...props} data={itemData} />;

  useEffect(() => {
    const onDocDown = (e) => {
      const inMenu = menuPortalRef.current && menuPortalRef.current.contains(e.target);
      const inFilter = filterPortalRef.current && filterPortalRef.current.contains(e.target);
      const inButtons = !!e.target.closest(".dinolabsOperationsButtonsWrapper");
      const inFilterTrigger = !!e.target.closest(".dinolabsTabularHeaderFilterContainer");
      if (!inMenu && !inFilter && !inButtons && !inFilterTrigger) { setOpenMenu(null); setOpenFilterCol(null); }
    };
    const onEsc = (e) => { if (e.key === "Escape") { setOpenMenu(null); setOpenFilterCol(null); setCtxMenu(m => ({ ...m, open: false })); } };
    const onResize = () => { setOpenMenu(null); setOpenFilterCol(null); };
    document.addEventListener("mousedown", onDocDown, true);
    document.addEventListener("keydown", onEsc, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocDown, true);
      document.removeEventListener("keydown", onEsc, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const renderDropdownMenu = (menuName, items) => {
    if (openMenu !== menuName) return null;
    return createPortal(
      <div
        ref={menuPortalRef}
        className="dinolabsTabularDropdownMenu"
        style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, i) => (
          <div className="dinolabsTabularDropdownMenuItem"
            key={i}
            style={{ borderBottom: i < items.length - 1 ? "1px solid #444" : "none" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#3a3a3a"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
            onClick={() => { item.action(); setOpenMenu(null); }}
          >
            {item.icon && <FontAwesomeIcon icon={item.icon} />}
            {item.text}
          </div>
        ))}
      </div>,
      document.body
    );
  };

  function openTopMenu(name, btnRef) {
    setOpenMenu(prev => {
      const next = prev === name ? null : name;
      if (next && btnRef?.current) setMenuPosition(clampPosition(btnRef.current.getBoundingClientRect(), 220, 280, 6));
      return next;
    });
  }

  function openFilterDropdown(e, colIndex) {
    e.stopPropagation();
    setFilterDropdownPos(clampPosition(e.currentTarget.getBoundingClientRect(), 260, 320, 6));
    setFilterSearch("");
    setOpenFilterCol(colIndex);
  }

  function applyColumnFilters(updater) {
    setColumnFilters(prev => { const next = updater(prev); setTimeout(clearUIHighlightsAndStates, 0); return next; });
  }

  function toggleFilterOption(colIndex, value) {
    applyColumnFilters(prev => {
      const cur = prev[colIndex] || [];
      const exists = cur.includes(value);
      const nextSel = exists ? cur.filter(v => v !== value) : [...cur, value];
      const out = { ...prev, [colIndex]: nextSel };
      if (!nextSel.length) delete out[colIndex];
      return out;
    });
  }

  function selectAllFilter(colIndex) {
    const opts = filterOptions[colIndex] || [];
    if (opts.length === 0) return;
    applyColumnFilters(prev => ({ ...prev, [colIndex]: [...opts] }));
  }

  function clearFilter(colIndex) { applyColumnFilters(prev => { const n = { ...prev }; delete n[colIndex]; return n; }); }

  function clearAllFilters() { setColumnFilters({}); clearUIHighlightsAndStates(); setOpenFilterCol(null); }

  const renderFilterDropdown = () => {
    if (openFilterCol === null) return null;
    const col = openFilterCol;
    const options = (filterOptions[col] || []).filter(opt => String(opt).toLowerCase().includes(filterSearch.trim().toLowerCase()));
    const selected = new Set(columnFilters[col] || []);
    return createPortal(
      <div className="dinolabsTabularDropdownMenu"
        ref={filterPortalRef}
        style={{
          position: "fixed", top: filterDropdownPos.top, left: filterDropdownPos.left, width: 260, maxHeight: 360,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="dinolabsTabularDropdownMenuHeader">
          <div className="dinolabsTabularDropdownMenuHeaderSearch">
            <FontAwesomeIcon icon={faFilter} />
            <strong>Filter: {getColumnLabel(col)}</strong>
          </div>
          <div className="dinolabsTabularDropdownMenuSearch">
            <input
              type="text"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Search values..."
            />
          </div>
        </div>
        <div className="dinolabsTabularDropdownMenuSelection">
          <button onClick={() => selectAllFilter(col)}>Select All</button>
          <button onClick={() => clearFilter(col)}>Clear</button>
        </div>
        <div className="dinolabsTabularDropdownMenuSelectionList">
          {options.length === 0 ? (
            <div className="dinolabsTabularDropdownMenuSelectionListNoValue">No values</div>
          ) : options.map(opt => (
            <label
              className="dinolabsTabularDropdownMenuSelectionListLabel"
              key={opt}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#333"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <input className="dinolabsSettingsCheckbox" type="checkbox" checked={selected.has(opt)} onChange={() => toggleFilterOption(col, opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        <div className="dinolabsTabularDropdownMenuSelectionBottom">
          <span>{selected.size > 0 ? `${selected.size} value${selected.size === 1 ? "" : "s"} selected` : "All values"}</span>
          <button onClick={() => setOpenFilterCol(null)}>Close</button>
        </div>
      </div>,
      document.body
    );
  };

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!ctxMenu.open) return;
      if (!e.target.closest?.(".dinolabsContextMenu")) setCtxMenu(m => ({ ...m, open: false }));
    }
    function closeOnWindowChange() { setCtxMenu(m => ({ ...m, open: false })); }
    window.addEventListener("mousedown", onDocMouseDown, true);
    window.addEventListener("scroll", closeOnWindowChange, true);
    window.addEventListener("resize", closeOnWindowChange, true);
    return () => {
      window.removeEventListener("mousedown", onDocMouseDown, true);
      window.removeEventListener("scroll", closeOnWindowChange, true);
      window.removeEventListener("resize", closeOnWindowChange, true);
    };
  }, [ctxMenu.open]);

  const openContextMenu = useCallback((e, kind) => {
    e.preventDefault(); e.stopPropagation();
    const items = [];
    items.push({ icon: faSave, text: "Save", action: handleSave });
    items.push({ icon: faDownload, text: "Download", action: handleDownload });
    items.push({ separator: true });
    if (selection) {
      items.push({ icon: faCut, text: "Cut", action: handleCut });
      items.push({ icon: faCopy, text: "Copy", action: handleCopy });
      items.push({ icon: faPaste, text: "Paste", action: handlePaste });
      items.push({ icon: faTrash, text: "Clear Selection", action: handleClearSelection });
    } else {
      items.push({ icon: faArrowPointer, text: "Select All", action: handleSelectAll });
      items.push({ icon: faPaste, text: "Paste", action: handlePaste });
    }
    if (kind === "column") {
      items.push({ separator: true });
      items.push({ icon: faSortAlphaDown, text: "Sort A–Z", action: () => sortTableByColumn("sortAZ") });
      items.push({ icon: faSortAlphaUp, text: "Sort Z–A", action: () => sortTableByColumn("sortZA") });
      items.push({ icon: faSortNumericDown, text: "Sort 0–9", action: () => sortTableByColumn("sortNumericAsc") });
      items.push({ icon: faSortNumericUp, text: "Sort 9–0", action: () => sortTableByColumn("sortNumericDesc") });
    }
    items.push({ separator: true });
    items.push({ icon: faSquarePlus, text: "Add Row", action: addRow });
    items.push({ icon: faSquarePlus, text: "Add Column", action: addColumn });
    items.push({ separator: true });
    items.push({ icon: faSearch, text: "Search / Replace", action: () => { commitActiveCellIfNeeded(); setShowSearchPanel(true); } });
    const rendered = items.map(it => it.separator ? { text: "—separator—", action: () => { }, sep: true } : it);
    const rawX = e.clientX, rawY = e.clientY;
    setCtxMenu({ open: true, x: rawX, y: rawY, items: rendered });
    requestAnimationFrame(() => {
      const node = ctxMenuRef.current; if (!node) return;
      const pad = 8, w = node.offsetWidth || 240, h = node.offsetHeight || 200;
      let x = rawX, y = rawY;
      if (x + w + pad > window.innerWidth) x = Math.max(pad, window.innerWidth - w - pad);
      if (y + h + pad > window.innerHeight) y = Math.max(pad, window.innerHeight - h - pad);
      setCtxMenu(m => ({ ...m, x, y }));
    });
  }, [selection, addRow, addColumn, handleCut, handleCopy, handlePaste, handleClearSelection, handleSelectAll, sortTableByColumn, commitActiveCellIfNeeded]);

  function handleSave() {
    if (!fileHandle) {
      setSaveStatus("no-handle");
      onSaveStatusChange?.("No file handle available.");
      setTimeout(() => { setSaveStatus("idle"); onSaveStatusChange?.(""); }, SAVE_BANNER_TIMEOUT_MS);
      return;
    }
    setSaveStatus("saving"); onSaveStatusChange?.("Saving...");
    (async () => {
      try {
        const csv = generateCSV(tableDataRef.current);
        const writable = await fileHandle.createWritable();
        await writable.write(csv); await writable.close();
        setSaveStatus("saved");
        onSaveStatusChange?.("Save successful!");
        typeof onSave === "function" && onSave(csv);
        if (truncationInfo?.rows > 0) await showDialog({ title: "File Truncated", message: `This file has been truncated by ${truncationInfo.rows} row${truncationInfo.rows === 1 ? "" : "s"}.` });
        setTimeout(() => { setSaveStatus("idle"); onSaveStatusChange?.(""); }, SAVE_BANNER_TIMEOUT_MS);
      } catch {
        setSaveStatus("failed"); onSaveStatusChange?.("Save failed!");
        setTimeout(() => { setSaveStatus("idle"); onSaveStatusChange?.(""); }, SAVE_BANNER_TIMEOUT_MS);
      }
    })();
  }

  async function handleDownload() {
    setOpenMenu(null);
    const result = await showDialog({
      title: "Download as...", message: "Select a file type to download this file as.",
      inputs: [{ name: "fileType", type: "select", options: [{ label: "CSV (.csv)", value: "csv" }] }], showCancel: true
    });
    if (result) {
      const fileName = fileHandle?.name ? fileHandle.name.replace(/\.[^/.]+$/, "") : "Untitled";
      const content = generateCSV(tableDataRef.current);
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = fileName + ".csv"; link.click(); URL.revokeObjectURL(url);
      if (truncationInfo?.rows > 0) await showDialog({ title: "File Truncated", message: `This file has been truncated by ${truncationInfo.rows} row${truncationInfo.rows === 1 ? "" : "s"}.` });
    }
  }

  if (loading) return <div className="loading-wrapper">
    <div className="loading-circle" />
    <label className="loading-title">Dino Labs Web IDE</label>
  </div>;

  if (error) return <div className="loading-wrapper">
    <div className="loading-circle" />
    <label className="loading-title">Dino Labs Web IDE</label>
  </div>;

  const activeFilterCount = Object.values(columnFilters).reduce((acc, v) => acc + ((v && v.length) ? 1 : 0), 0);

  return (
    <div
      className="dinolabsTabularContentWrapper"
      onClick={e => {
        if (skipClear || justFinishedSelecting) { setSkipClear(false); return; }
        if (e.target.closest(".dinolabsTabularToolbarWrapper") || e.target.closest(".dinolabsEditingSearchBoxWrapper")) return;
        if (e.target.closest(".dinolabsFormulaBarWrapper")) {
          if (activeCell.row === null && selection && selection.top === selection.bottom && selection.left === selection.right) {
            activateCell(selection.top, selection.left);
          }
          return;
        }
        if (e.target.closest(".dinolabsTableColumnHeaderCell") || e.target.closest(".dinolabsTableRowHeaderCell") || e.target.closest(".dinolabsTableCornerHeader")) return;
        if (e.target.closest(".dinolabsTableSelectionOverlay")) return;
        if (e.target.closest(".dinolabsTabularColumnResizeHandle")) return;
        if (e.target.closest(".dinolabsTabularRowResizeHandle")) return;
        if (e.detail > 1) return;
        if (activeCell.row === null && activeCell.col === null && selection) setSelection(null);
        else if (activeCell.row !== null || activeCell.col !== null) {
          const cell = e.target.closest(".dinolabsTableCell");
          const input = e.target.closest(".dinolabsTableCellInput");
          const inFormulaBar = !!e.target.closest(".dinolabsFormulaBarWrapper");
          if (!cell && !input && !inFormulaBar) commitActiveCellIfNeeded();
        }
      }}
      onContextMenu={(e) => openContextMenu(e, "blank")}
      style={{ position: "relative" }}
    >
      <div className="dinolabsTabularToolbarWrapper">
        <div className="dinolabsTabularToolBar">
          <div className="dinolabsTabularTitleWrapper">
            <div className="dinolabsTabularFileNameStack">
              <label className="dinolabsTabularFileNameInput"><FontAwesomeIcon icon={faTableCells} /> {fileHandle?.name || "Untitled Table"}</label>
              <div className="dinolabsTabularOperationsButtonsWrapper">
                <div style={{ position: "relative" }}>
                  <button ref={fileBtnRef} className="dinolabsTabularOperationsButton" onClick={(e) => { e.stopPropagation(); openTopMenu("file", fileBtnRef); }}>File</button>
                  {renderDropdownMenu("file", [
                    { icon: faSave, text: saveStatus === "idle" ? "Save File" : saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : saveStatus === "failed" ? "Save failed!" : "Save File", action: handleSave },
                    { icon: faDownload, text: "Download", action: handleDownload }
                  ])}
                </div>
                <div style={{ position: "relative" }}>
                  <button ref={editBtnRef} className="dinolabsTabularOperationsButton" onClick={(e) => { e.stopPropagation(); openTopMenu("edit", editBtnRef); }}>Edit</button>
                  {renderDropdownMenu("edit", [
                    { icon: faUndo, text: "Undo", action: () => { commitActiveCellIfNeeded(); handleUndo(); } },
                    { icon: faRedo, text: "Redo", action: () => { commitActiveCellIfNeeded(); handleRedo(); } },
                    { icon: faCut, text: "Cut", action: handleCut },
                    { icon: faCopy, text: "Copy", action: handleCopy },
                    { icon: faPaste, text: "Paste", action: handlePaste },
                    { icon: faArrowPointer, text: "Select All", action: handleSelectAll },
                    { icon: faSearch, text: "Search/Replace", action: () => { commitActiveCellIfNeeded(); setShowSearchPanel(true); } }
                  ])}
                </div>
                <div style={{ position: "relative" }}>
                  <button ref={toolsBtnRef} className="dinolabsTabularOperationsButton" onClick={(e) => { e.stopPropagation(); openTopMenu("tools", toolsBtnRef); }}>Tools</button>
                  {renderDropdownMenu("tools", [
                    {
                      text: "Cell Count", action: async () => {
                        setOpenMenu(null); let count = 0;
                        if (selection) {
                          forEachSelectedCell(selection, (r, c) => { if (tableData[toKey(r, c)]?.trim() !== "") count++; });
                          await showDialog({ title: "Cell Count", message: `Non-empty cells in selection: ${count}` });
                        } else {
                          Object.values(tableData).forEach(v => { if (v.trim() !== "") count++; });
                          await showDialog({ title: "Cell Count", message: `Non-empty cells in table: ${count}` });
                        }
                      }
                    }
                  ])}
                </div>
                <div style={{ position: "relative" }}>
                  <button ref={sortBtnRef} className="dinolabsTabularOperationsButton" onClick={(e) => { e.stopPropagation(); openTopMenu("sort", sortBtnRef); }}>Sort</button>
                  {renderDropdownMenu("sort", [
                    { icon: faSortAlphaDown, text: "Sort A–Z", action: () => sortTableByColumn("sortAZ") },
                    { icon: faSortAlphaUp, text: "Sort Z–A", action: () => sortTableByColumn("sortZA") },
                    { icon: faSortNumericDown, text: "Sort 0–9", action: () => sortTableByColumn("sortNumericAsc") },
                    { icon: faSortNumericUp, text: "Sort 9–0", action: () => sortTableByColumn("sortNumericDesc") }
                  ])}
                </div>
              </div>
            </div>
          </div>
          <div className="dinolabsTableEditingButtonsWrapper">
            <Tippy content="Clear all filters" placement="bottom">
              <button className="dinolabsTableEditingButton" onClick={clearAllFilters} disabled={!hasActiveFilter} style={{ opacity: hasActiveFilter ? 1 : 0.5 }}>
                <FontAwesomeIcon icon={faSquareMinus} /> <span style={{ marginLeft: 6 }}>Clear Filters{hasActiveFilter ? ` (${activeFilterCount})` : ""}</span>
              </button>
            </Tippy>
          </div>
        </div>
      </div>
      <div
        className="dinolabsFormulaBarWrapper"
        onMouseDown={(e) => { interactingWithFormulaBarRef.current = true; e.stopPropagation(); }}
        onMouseUp={(e) => { e.stopPropagation(); setTimeout(() => { interactingWithFormulaBarRef.current = false; }, 0); }}
        onClick={(e) => e.stopPropagation()}
      >
        <select
          aria-label="Insert function"
          onMouseDown={(e) => { interactingWithFormulaBarRef.current = true; e.stopPropagation(); }}
          onFocus={() => { interactingWithFormulaBarRef.current = true; }}
          onBlur={() => { setTimeout(() => { interactingWithFormulaBarRef.current = false; }, 0); }}
          onChange={e => {
            const fn = e.target.value;
            if (!fn) return;

            if (activeCell.row !== null && activeCell.col !== null) {
              const target = formulaBarRef.current || activeInputRef.current;
              if (!target) return;
              const original = target.value;
              let base = original;
              let start = target.selectionStart ?? original.length;
              let end = target.selectionEnd ?? start;
              if (!original.trim().startsWith("=")) {
                base = "=" + original.replace(/^\s+/, "");
                const delta = base.length - original.length;
                start += delta; end += delta;
              }
              const insert = `${fn}(`;
              const newVal = base.slice(0, start) + insert + base.slice(end);
              setCellEditingValue(newVal);
              setFormulaBarValue(newVal);
              const caret = (start + insert.length);
              requestAnimationFrame(() => { try { target.focus(); target.setSelectionRange(caret, caret); } catch { } });
            } else if (selection && selection.top === selection.bottom && selection.left === selection.right) {
              const row = selection.top, col = selection.left;
              const currentVal = tableDataRef.current[toKey(row, col)] || "";
              const newVal = currentVal.trim().startsWith("=") ? currentVal : `=${fn}(`;
              activateCell(row, col);
              setCellEditingValue(newVal);
              setFormulaBarValue(newVal);
            }
            e.target.value = "";
          }}
          defaultValue=""
        >
          <option value="">Functions…</option>
          {SUPPORTED_FUNCS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <input
          ref={formulaBarRef}
          className="dinolabsFormulaBarInput"
          type="text"
          value={formulaBarValue}
          onMouseDown={(e) => { interactingWithFormulaBarRef.current = true; e.stopPropagation(); }}
          onFocus={() => {
            interactingWithFormulaBarRef.current = true;
            if (activeCell.row === null && selection && selection.top === selection.bottom && selection.left === selection.right) {
              const row = selection.top, col = selection.left;
              activateCell(row, col);
            }
          }}
          onBlur={(e) => {
            if (!e.relatedTarget?.closest?.(".dinolabsFormulaBarWrapper")) {
              setTimeout(() => { interactingWithFormulaBarRef.current = false; }, 0);
            }
          }}
          onChange={e => {
            const v = e.target.value;
            setFormulaBarValue(v);
            setCellEditingValue(v);
            const h = cellHistoryRef.current;
            if (h.undo[h.undo.length - 1] !== v) { h.undo.push(v); h.redo = []; }
          }}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commitActiveCellIfNeeded(); }
            if (e.key === "Escape") { e.preventDefault(); commitActiveCellIfNeeded(); }
          }}
          placeholder={activeCell.row !== null ? "Type a value or =FORMULA(A1:B5)" : "Select a cell to edit"}
          disabled={activeCell.row === null}
        />
      </div>
      <div
        className="dinolabsTabularWrapperContainer"
        ref={tableWrapperContainerRef}
        onContextMenu={(e) => openContextMenu(e, "blank")}
      >
        <div className="dinolabsTabularWrapper"
          onSelectStart={e => e.preventDefault()}
          onMouseDown={e => { if (e.target.tagName !== "INPUT" && window.getSelection) window.getSelection().removeAllRanges(); }}
          onDragStart={e => { if (e.target.tagName !== "INPUT") e.preventDefault(); }}
        >
          <div
            className="dinolabsTableCornerHeader"
            style={{ zIndex: 10 }}
            onMouseDown={e => {
              commitActiveCellIfNeeded();
              if (hasActiveFilter) {
                if (!filteredRows.length) { setSelection(null); return; }
                const allSel = selection?.top === filteredRows[0] && selection?.left === 0 && selection?.bottom === filteredRows[filteredRows.length - 1] && selection?.right === effectiveCols - 1;
                setSelection(allSel ? null : { top: filteredRows[0], left: 0, bottom: filteredRows[filteredRows.length - 1], right: effectiveCols - 1 });
              } else {
                const allSel = selection?.top === 0 && selection?.left === 0 && selection?.bottom === effectiveRows - 1 && selection?.right === effectiveCols - 1;
                setSelection(allSel ? null : { top: 0, left: 0, bottom: effectiveRows - 1, right: effectiveCols - 1 });
              }
              e.preventDefault();
            }}
            onContextMenu={(e) => openContextMenu(e, "blank")}
          />
          <div
            ref={columnHeaderRef}
            style={{ zIndex: 10 }}
            className="dinolabsTableColumnHeaderContainer"
            onContextMenu={(e) => {
              const headerCell = e.target.closest(".dinolabsTableColumnHeaderCell");
              headerCell ? openContextMenu(e, "column") : openContextMenu(e, "blank");
            }}
          >
            <div className="dinolabsTableColumnHeaderContent" style={{ width: colWidthsCumulative[effectiveCols] || effectiveCols * DEFAULT_COL_WIDTH }}>
              {Array.from({ length: effectiveCols }).map((_, colIndex) => {
                const leftOffset = colWidthsCumulative[colIndex] || colIndex * DEFAULT_COL_WIDTH;
                const width = colWidths[colIndex] || DEFAULT_COL_WIDTH;
                const isSelectedHeader = selection && colIndex >= selection.left && colIndex <= selection.right &&
                  (hasActiveFilter
                    ? (selection.top === (filteredRows[0] ?? 0) && selection.bottom === (filteredRows[filteredRows.length - 1] ?? 0))
                    : (selection.top === 0 && selection.bottom === effectiveRows - 1)
                  );
                const filterActive = (columnFilters[colIndex] || []).length > 0;
                const triggerBg = isSelectedHeader ? "#444" : (filterActive ? "#3a2f56" : "#292929");
                return (
                  <div key={colIndex} className="dinolabsColumnHeaderCellWrapper" style={{ left: leftOffset, width }}>
                    <div className="dinolabsTableColumnHeaderCell" style={{ backgroundColor: isSelectedHeader ? "#444" : "#333" }} onMouseDown={e => handleColumnHeaderMouseDown(e, colIndex)} onContextMenu={(e) => openContextMenu(e, "column", { colIndex })}>{getColumnLabel(colIndex)}</div>
                    <div className="dinolabsTabularHeaderFilterContainer" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                      <div className="dinolabsTabularHeaderFilterIcon" style={{ backgroundColor: isSelectedHeader ? "#444" : "#313131" }}>
                        <FontAwesomeIcon icon={faFilter} />
                      </div>
                      <button
                        className="dinolabsTabularHeaderFilter"
                        style={{ backgroundColor: triggerBg, color: "#f5f5f5", border: "none", cursor: "pointer" }}
                        onClick={(e) => openFilterDropdown(e, colIndex)}
                      >
                        {(columnFilters[colIndex]?.length > 0) ? `${columnFilters[colIndex].length} selected` : "All"}
                      </button>
                    </div>
                    <div
                      className="dinolabsTabularColumnResizeHandle"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        width: 4,
                        height: "100%",
                        cursor: "col-resize",
                        background: "transparent"
                      }}
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setHeaderDrag({ type: "column", col: colIndex, startX: e.clientX, initialWidth: colWidths[colIndex] || DEFAULT_COL_WIDTH }); }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div ref={rowHeaderRef} style={{ zIndex: 10 }} className="dinolabsTableRowHeaderContainer" onContextMenu={(e) => openContextMenu(e, "row")}>
            <div className="dinolabsTableRowHeaderContent" style={{ height: hasActiveFilter ? filteredRowHeightsCumulative[filteredRows.length] : (rowHeightsCumulative[effectiveRows] || effectiveRows * DEFAULT_ROW_HEIGHT) }}>
              {Array.from({ length: hasActiveFilter ? filteredRows.length : effectiveRows }).map((_, gridRowIndex) => {
                const actualRow = hasActiveFilter ? filteredRows[gridRowIndex] : gridRowIndex;
                const topOffset = hasActiveFilter ? filteredRowHeightsCumulative[gridRowIndex] : (rowHeightsCumulative[gridRowIndex] || gridRowIndex * DEFAULT_ROW_HEIGHT);
                const height = rowHeights[actualRow] || DEFAULT_ROW_HEIGHT;
                const isSelectedRow = selection && actualRow >= selection.top && actualRow <= selection.bottom && selection.left === 0 && selection.right === effectiveCols - 1;
                return (
                  <div
                    key={gridRowIndex}
                    className="dinolabsTableRowHeaderCell"
                    style={{ top: topOffset, height, backgroundColor: isSelectedRow ? "#3a3a3a" : "#2c2c2c" }}
                    onMouseDown={e => handleRowHeaderMouseDown(e, actualRow)}
                    onContextMenu={(e) => openContextMenu(e, "row", { rowIndex: actualRow })}
                  >
                    {actualRow + 1}
                    <div
                      className="dinolabsTabularRowResizeHandle"
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: "100%",
                        height: 4,
                        cursor: "row-resize",
                        background: "transparent"
                      }}
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setHeaderDrag({ type: "row", row: actualRow, startY: e.clientY, initialHeight: rowHeights[actualRow] || DEFAULT_ROW_HEIGHT }); }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div
            ref={gridContainerRef}
            className="dinolabsTableGridContainer"
            onContextMenu={(e) => openContextMenu(e, "blank")}
          >
            <AutoSizer>
              {({ width, height }) => {
                if (width !== autoSizerDims.width || height !== autoSizerDims.height) setAutoSizerDims({ width, height });
                return (
                  <Grid
                    ref={dataGridRef}
                    columnCount={effectiveCols}
                    rowCount={hasActiveFilter ? filteredRows.length : effectiveRows}
                    columnWidth={getColWidth}
                    rowHeight={getRowHeight}
                    width={width}
                    height={height}
                    itemData={itemData}
                    itemKey={({ columnIndex, rowIndex }) => `${rowIndex}:${columnIndex}:${selectionEpoch}`}
                    onScroll={({ scrollLeft, scrollTop }) => {
                      if (columnHeaderRef.current?.firstChild) columnHeaderRef.current.firstChild.style.transform = `translateX(-${scrollLeft}px)`;
                      if (rowHeaderRef.current?.firstChild) rowHeaderRef.current.firstChild.style.transform = `translateY(-${scrollTop}px)`;
                      scrollPos.current = { left: scrollLeft, top: scrollTop };
                      if (selection && selectionOverlayRef.current) {
                        const b = selectionBounds(selection);
                        selectionOverlayRef.current.style.top = `${b.top - scrollTop}px`;
                        selectionOverlayRef.current.style.left = `${b.left - scrollLeft}px`;
                      }
                    }}
                  >
                    {cellRenderer}
                  </Grid>
                );
              }}
            </AutoSizer>
            {selection && (activeCell.row === null || selection.top !== selection.bottom || selection.left !== selection.right) && (
              <div style={{ position: "absolute", top: 0, left: 0 }}>
                <div
                  ref={selectionOverlayRef}
                  className="dinolabsTableSelectionOverlay"
                  onMouseDown={handleSelectionMouseDown}
                  onClick={handleSelectionClick}
                  onDoubleClick={handleSelectionDoubleClick}
                  onContextMenu={(e) => openContextMenu(e, "selection")}
                  style={{ zIndex: 1, cursor: selectionDrag.active ? "grabbing" : "grab", transform: selectionDrag.active ? `translate(${selectionDrag.offsetX}px, ${selectionDrag.offsetY}px)` : "none" }}
                >
                  <div className="dinolabsTableSelectionHandleBottomRight" onMouseDown={e => startSelectionResize("bottom-right", e)} />
                </div>
              </div>
            )}
            {formulaPick.active && formulaPick.start && formulaPick.end && (
              <div style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 3 }}>
                {(() => {
                  const s = formulaPick.start, e = formulaPick.end;
                  const r1 = Math.min(s.row, e.row), r2 = Math.max(s.row, e.row);
                  const c1 = Math.min(s.col, e.col), c2 = Math.max(s.col, e.col);
                  if (!hasActiveFilter) {
                    const bounds = selectionBounds({ top: r1, left: c1, bottom: r2, right: c2 });
                    if (bounds.width <= 0 || bounds.height <= 0) return null;
                    const top = bounds.top - scrollPos.current.top;
                    const left = bounds.left - scrollPos.current.left;
                    return (
                      <div
                        className="dinolabsTableSelectionFormulaOverlay"
                        style={{ top, left, width: bounds.width, height: bounds.height }}
                      />
                    );
                  }
                  const v1 = actualToVisibleIndex(r1);
                  const v2 = actualToVisibleIndex(r2);
                  if (v1 === -1 && v2 === -1 || !filteredRows.length) return null;
                  const from = Math.max(0, Math.min(v1 === -1 ? 0 : v1, v2 === -1 ? filteredRows.length - 1 : v2));
                  const to = Math.min(filteredRows.length - 1, Math.max(v1 === -1 ? 0 : v1, v2 === -1 ? filteredRows.length - 1 : v2));
                  const visibleActuals = filteredRows.slice(from, to + 1);
                  if (!visibleActuals.length) return null;
                  const blocks = [];
                  let bStart = visibleActuals[0], last = visibleActuals[0];
                  for (let i = 1; i < visibleActuals.length; i++) {
                    const cur = visibleActuals[i];
                    if (cur !== last + 1) { blocks.push([bStart, last]); bStart = cur; }
                    last = cur;
                  }
                  blocks.push([bStart, last]);
                  return blocks.map(([br1, br2], i) => {
                    const b = selectionBounds({ top: br1, left: c1, bottom: br2, right: c2 });
                    if (b.width <= 0 || b.height <= 0) return null;
                    const t = b.top - scrollPos.current.top;
                    const l = b.left - scrollPos.current.left;
                    return (
                      <div
                        key={i}
                        className="dinolabsTableSelectionFormulaOverlay"
                        style={{ top: t, left: l, width: b.width, height: b.height }}
                      />
                    );
                  }).filter(Boolean);
                })()}
              </div>
            )}
            {currentFormulaPreview && !formulaPick.active && (
              <div style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 2 }}>
                {(() => {
                  const bounds = selectionBounds(currentFormulaPreview);
                  const top = bounds.top - scrollPos.current.top;
                  const left = bounds.left - scrollPos.current.left;
                  return (
                    <div
                      className="dinolabsTableSelectionRangeOverlay"
                      style={{
                        top, left, width: bounds.width, height: bounds.height
                      }}
                    />
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="dinolabsTableSummaryStatsWrapper">
        <div className="dinolabsTableSummaryStatsSubWrapper">
          <div className="dinolabsTableSummaryTitleWrapper" style={{ cursor: "pointer", color: "#c1c1c1",  "margin-bottom": summaryCollapsed ? 0 : ""}} onClick={() => setSummaryCollapsed(!summaryCollapsed)}>
            <FontAwesomeIcon icon={summaryCollapsed ? faSquarePlus : faSquareMinus} />
            <FontAwesomeIcon icon={faCalculator} style={{ color: "#5c2be2" }} />
            <strong>Summary Statistics</strong>
          </div>
          {!summaryCollapsed && <div className="dinolabsTableSummaryStatList">
            <div><strong>Count:</strong> {summaryStats.count}</div>
            <div><strong>Mean:</strong> {summaryStats.mean.toFixed(2)}</div>
            <div><strong>Median:</strong> {summaryStats.median.toFixed(2)}</div>
            <div><strong>Standard Deviation:</strong> {summaryStats.stdDev.toFixed(2)}</div>
            <div><strong>Min:</strong> {summaryStats.min.toFixed(2)} <strong>Max:</strong> {summaryStats.max.toFixed(2)}</div>
          </div>}
        </div>


        <div className="dinolabsTableSummaryStatsSubWrapper">
          <div className="dinolabsTableSummaryTitleWrapper" style={{ cursor: "pointer", color: "#c1c1c1",  "margin-bottom": qualityCollapsed ? 0 : ""}} onClick={() => setQualityCollapsed(!qualityCollapsed)}>
            <FontAwesomeIcon icon={qualityCollapsed ? faSquarePlus : faSquareMinus}  />
            <FontAwesomeIcon icon={faCheckCircle} style={{ color: "#10b981" }} />
            <strong>Data Quality</strong>
          </div>
          {!qualityCollapsed && <div className="dinolabsTableSummaryStatList">
            <div><strong>Null Count:</strong> {summaryStats.nullCount}</div>
            <div><strong>N/A Count:</strong> {summaryStats.naCount}</div>
            <div><strong>Missing:</strong> {summaryStats.missingPercent.toFixed(1)}%</div>
            <div><strong>Unique Values:</strong> {summaryStats.uniqueValues}</div>
            <div><strong>Duplicate Count:</strong> {summaryStats.duplicateCount}</div>
          </div>}
        </div>
      </div>
      {showSearchPanel && (
        <div
          ref={searchPanelRef}
          className="dinolabsTableEditingSearchBoxWrapper"
          style={{ position: "absolute", top: searchPanelPos.y, left: searchPanelPos.x, zIndex: 10 }}
          onMouseDown={e => {
            if (e.target !== searchPanelRef.current) return;
            setSearchPanelDragging(true);
            setSearchPanelOffset({ x: e.clientX - searchPanelPos.x, y: e.clientY - searchPanelPos.y });
          }}
        >
          <div className="dinolabsTableEditngSearchBarWrapper">
            <label className="dinolabsTableEditingSearchLabel">Search: <span><input className="dinolabsSettingsCheckbox" type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />Case Sensitive</span></label>
            <input className="dinolabsTableEditingSearchInput" type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); if (e.target.value.trim()) highlightAll(e.target.value); }} />
            <div className="dinolabsTableEditingSearchOperationsButtonWrapper">
              <button className="dinolabsTableEditingSearchOperationsButton" onClick={() => highlightAll(searchTerm)}>Search</button>
              <button className="dinolabsTableEditingSearchOperationsButton" onClick={goToPrevious}>Prev</button>
              <button className="dinolabsTableEditingSearchOperationsButton" onClick={goToNext}>Next</button>
            </div>
          </div>
          <div className="dinolabsTableEditngSearchBarWrapper">
            <label className="dinolabsTableEditingSearchLabel">Replace:</label>
            <input className="dinolabsTableEditingSearchInput" type="text" value={replaceTerm} onChange={e => setReplaceTerm(e.target.value)} />
            <div className="dinolabsTableEditingSearchOperationsButtonWrapper">
              <button className="dinolabsTableEditingSearchOperationsButton" onClick={replaceCurrent}>Replace</button>
              <button className="dinolabsTableEditingSearchOperationsButton" onClick={replaceAll}>Replace All</button>
            </div>
          </div>
          <div className="dinolabsTableEditingSearchOperationsButtonWrapper" style={{ justifyContent: "center" }}>
            <button className="dinolabsTableEditingSearchOperationsButton" onClick={() => { setShowSearchPanel(false); setSearchResults([]); setCurrentResultIndex(-1); }}>
              <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ transform: "scaleX(-1)" }} /> Close Search
            </button>
          </div>
        </div>
      )}
      {ctxMenu.open && createPortal(
        <div
          ref={ctxMenuRef}
          className="dinolabsContextMenu"
          style={{ position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 10001 }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.items.map((it, i) => it.sep ? (
            <div key={`sep-${i}`} style={{ height: 1, background: "#3a3a3a", margin: "4px 0" }} />
          ) : (
            <div
              key={`item-${i}`}
              className="dinolabsContextMenuItem"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#3a3a3a"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              onClick={() => { setCtxMenu(m => ({ ...m, open: false })); it.action(); }}
            >
              {it.icon && <FontAwesomeIcon icon={it.icon} />}
              <span>{it.text}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
      {renderFilterDropdown()}
      {saveBannerText && (<div className="codeSaveStatusIndicator">{saveBannerText}</div>)}
    </div>
  );
}