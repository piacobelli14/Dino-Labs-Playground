import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import "../../styles/mainStyles/DinoLabsTextEditor/DinoLabsTextEditor.css";
import { showDialog } from "../../helpers/DinoLabsAlert.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket, faSave, faDownload, faUndo, faRedo,
  faCut, faCopy, faPaste, faArrowPointer, faSearch, faIcons, faCalculator,
  faFile
} from "@fortawesome/free-solid-svg-icons";

const SAVE_BANNER_TIMEOUT_MS = 3000;
const mathSymbols = [
    "∀", "∁", "∂", "∃", "∄", "∅", "∆", "∇", "∈", "∉", "∊", "∋", "∌", "∍", "∎", "∏", "∐", "∑",
    "−", "±", "÷", "×", "⋅", "√", "∛", "∜", "∝", "∞", "∟", "∠", "∢", "∣", "∧", "∨", "¬", "∩",
    "∪", "∫", "∬", "∭", "∮", "∯", "∰", "∱", "∲", "∳", "∴", "∵", "∶", "∷", "∸", "∹", "∺",
    "∻", "∼", "∽", "≁", "≂", "≃", "≃", "≄", "≅", "≆", "≇", "≈", "≉", "≊", "≋", "≌", "≍", "≎", "≏",
    "≐", "≑", "≒", "≓", "≔", "≕", "≖", "≗", "≘", "≙", "≚", "≛", "≜", "≝", "≞", "≟", "≠", "≡",
    "≤", "≥", "≦", "≧", "≨", "≩", "≪", "≫", "≬", "≭", "≮", "≯", "≰", "≱",
    "∎", "⊂", "⊃", "⊄", "⊅", "⊆", "⊇", "⊈", "⊉", "⊊", "⊋", "⊏", "⊐", "⊑", "⊒", "⊓", "⊔", "⊕",
    "⊖", "⊗", "⊘", "⊙", "⊚", "⊛", "⊜", "⊝", "⊞", "⊟", "⊠", "⊡", "⊢", "⊣", "⊤", "⊥", "⊦", "⊧",
    "⊨", "⊩", "⊪", "⊫", "⊬", "⊭", "⊮", "⊯", "⊰", "⊱", "⊲", "⊳", "⊴", "⊵", "⊶", "⊷", "⊸", "⊹",
    "⊺", "⊻", "⊼", "⊽", "⊾", "⊿", "⋀", "⋁", "⋂", "⋃", "⋄", "⋅", "⋆", "⋇", "⋈", "⋉", "⋊", "⋋",
    "⋌", "⋍", "⋎", "⋏", "⋐", "⋑", "⋒", "⋓", "⋔", "⋕", "⋖", "⋗", "⋘", "⋙", "⋚", "⋛", "⋜", "⋝",
    "⋞", "⋟", "⋠", "⋡", "⋢", "⋣", "⋤", "⋥", "⋦", "⋧", "⋨", "⋩", "⋪", "⋫", "⋬", "⋭", "⋮", "⋯",
    "⋰", "⋱", "⋲", "⋳", "⋴", "⋵", "⋶", "⋷", "⋸", "⋹", "⋺", "⋻", "⋼", "⋽", "⋾", "⋿",
    "⌀", "⌁", "⌂", "⌃", "⌄", "⌅", "⌆", "⌇", "⌈", "⌉", "⌊", "⌋", "⌌", "⌍", "⌎", "⌏", "⌐", "⌑",
    "⌒", "⌓", "⌔", "⌕", "⌖", "⌗", "⌘", "⌙", "⌚", "⌛", "⌜", "⌝", "⌞", "⌟", "⌠", "⌡", "⌢", "⌣",
    "⌤", "⌥", "⌦", "⌧", "⌨", "〈", "〉", "⌫", "⌬", "⌭", "⌮", "⌯", "⌰", "⌱", "⌲", "⌳", "⌴", "⌵",
    "⌶", "⌷", "⌸", "⌹", "⌺", "⌻", "⌼", "⌽", "⌾", "⌿", "⍀", "⍁", "⍂", "⍃", "⍄", "⍅", "⍆", "⍇",
    "⍈", "⍉", "⍊", "⍋", "⍌", "⍍", "⍎", "⍏", "⍐", "⍑", "⍒", "⍓", "⍔", "⍕", "⍖", "⍗", "⍘", "⍙",
    "⍚", "⍛", "⍜", "⍝", "⍞", "⍟", "⍠", "⍡", "⍢", "⍣", "⍤", "⍥", "⍦", "⍧", "⍨", "⍩", "⍪", "⍫",
    "⍬", "⍭", "⍮", "⍯", "⍰", "⍱", "⍲", "⍳", "⍴", "⍵", "⍶", "⍷", "⍸", "⍹", "⍺", "⎀", "⎁", "⎂",
    "⎃", "⎄", "⎅", "⎆", "⎇", "⎈", "⎉", "⎊", "⎋", "⎌", "⎍", "⎎", "⎏", "⎐", "⎑", "⎒", "⎓", "⎔",
    "⎕", "⎖", "⎗", "⎘", "⎙", "⎚", "⎛", "⎜", "⎝", "⎞", "⎟", "⎠", "⎡", "⎢", "⎣", "⎤", "⎥", "⎦",
    "⎧", "⎨", "⎩", "⎪", "⎫", "⎬", "⎭", "⎮", "⎯", "⎰", "⎱", "⎲", "⎳", "⎴", "⎵", "⎶", "⎷", "⎸",
    "⎹", "⎺", "⎻", "⎼", "⎽", "⎾", "⎿"
];
const latinSymbols = [
    "À", "Á", "Â", "Ã", "Ä", "Å", "Æ", "Ç", "È", "É", "Ê", "Ë", "Ì", "Í", "Î", "Ï", "Ñ", "Ò", "Ó", "Ô",
    "Õ", "Ö", "Ù", "Ú", "Û", "Ü", "Ý", "ß", "à", "á", "â", "ã", "ä", "å", "æ", "ç", "è", "é", "ê", "ë",
    "ì", "í", "î", "ï", "ñ", "ò", "ó", "ô", "õ", "ö", "ù", "ú", "û", "ü", "ý", "ÿ"
];
const greekSymbols = [
    "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ", "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ",
    "Φ", "Χ", "Ψ", "Ω", "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π",
    "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"
];
const punctuationSymbols = [
    "…", "—", "–", "'", "'", "«", "»", "¡", "¿", "§", "¶", "•", "†", "‡"
];
const isMacPlatform = () => navigator.platform.toUpperCase().includes("MAC");
const stopAll = e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); };
function parseBind(str) { if (!str) return null; const parts = String(str).trim().toLowerCase().split("+").map(p => p.trim()); const spec = { key: null, shift: false }; for (const p of parts) { if (p === "shift") spec.shift = true; else if (p) spec.key = p; } return spec.key ? spec : null; }
function matchBind(e, spec, isMac) { if (!spec) return false; const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey; return !!cmdOrCtrl && (!!spec.shift === !!e.shiftKey) && e.key.toLowerCase() === spec.key; }
function normalizeBinds(keyBinds) {
  const d = { search: "f", save: "s", selectAll: "a", cut: "x", copy: "c", paste: "v", undo: "z", redo: null };
  const m = { ...d, ...(keyBinds || {}) };
  const one = k => [parseBind(m[k])].filter(Boolean);
  return { search: one("search"), save: one("save"), selectAll: one("selectAll"), cut: one("cut"), copy: one("copy"), paste: one("paste"), undo: one("undo"), redo: m.redo ? one("redo") : [parseBind("y"), parseBind("shift+z")].filter(Boolean) };
}
function clampPosition(rect, width = 180, height = 200, offset = 6) {
  let top = rect.bottom + offset, left = rect.left;
  if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - offset);
  return { top, left };
}

function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

export default function DinoLabsTextEditor({ fileHandle, keyBinds, onSaveStatusChange, onSave, onEdit }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const editorRef = useRef(null);
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
  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuPortalRef = useRef(null);
  const fileBtnRef = useRef(null);
  const editBtnRef = useRef(null);
  const insertBtnRef = useRef(null);
  const toolsBtnRef = useRef(null);
  const [ctxMenu, setCtxMenu] = useState({ open: false, x: 0, y: 0, items: [] });
  const ctxMenuRef = useRef(null);
  const [showSpecialPicker, setShowSpecialPicker] = useState(false);
  const [specialCategory, setSpecialCategory] = useState("math");
  const [showDrawPanel, setShowDrawPanel] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [symbolSuggestions, setSymbolSuggestions] = useState([]);
  const specialPickerRef = useRef(null);
  const [showEquationPicker, setShowEquationPicker] = useState(false);
  const [equationCategory, setEquationCategory] = useState("basic");
  const equationPickerRef = useRef(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const equationTemplates = {
    basic: [
      { label: "Superscript", text: "x²", html: 'x<sup contenteditable="true" style="font-size: 0.7em; vertical-align: super;">2</sup>' },
      { label: "Subscript", text: "x₁", html: 'x<sub contenteditable="true" style="font-size: 0.7em; vertical-align: sub;">1</sub>' },
      { label: "Fraction", text: "½", html: '<span style="display: inline-block; text-align: center; vertical-align: middle; font-size: 0.9em;"><span contenteditable="true" style="display: block; border-bottom: 1px solid #f5f5f5; padding: 0; margin: 0;">1</span><span contenteditable="true" style="display: block; padding: 0; margin: 0;">2</span></span>' },
      { label: "Square Root", text: "√x", html: '<span style="font-size: 1em;">√</span><span contenteditable="true" style="border-top: 1px solid #f5f5f5; padding: 0 1px;">x</span>' },
      { label: "Sum", text: "∑", html: '<span style="position: relative; display: inline-block; margin: 0 2px; vertical-align: middle;"><span contenteditable="true" style="position: absolute; top: -0.8em; left: 50%; transform: translateX(-50%); font-size: 0.6em; white-space: nowrap;">n</span><span style="font-size: 1.2em;">∑</span><span contenteditable="true" style="position: absolute; bottom: -0.8em; left: 50%; transform: translateX(-50%); font-size: 0.6em; white-space: nowrap;">i=1</span></span>' },
      { label: "Integral", text: "∫", html: '<span style="position: relative; display: inline-block; margin: 0 2px; vertical-align: middle;"><span contenteditable="true" style="position: absolute; top: -0.6em; left: 0.6em; font-size: 0.6em; white-space: nowrap;">b</span><span style="font-size: 1.4em;">∫</span><span contenteditable="true" style="position: absolute; bottom: -0.6em; left: 0; font-size: 0.6em; white-space: nowrap;">a</span></span>' },
      { label: "Limit", text: "lim", html: '<span style="position: relative; display: inline-block; margin: 0 1px;">lim<span contenteditable="true" style="position: absolute; bottom: -0.8em; left: 50%; transform: translateX(-50%); font-size: 0.6em; white-space: nowrap;">x→0</span></span>' }
    ],
    advanced: [
      { label: "Both Sub/Super", text: "x₁²", html: 'x<sub contenteditable="true" style="font-size: 0.7em; vertical-align: sub;">1</sub><sup contenteditable="true" style="font-size: 0.7em; vertical-align: super;">2</sup>' },
      { label: "Nth Root", text: "ⁿ√x", html: '<span style="position: relative; display: inline-block;"><span contenteditable="true" style="position: absolute; top: -0.4em; left: 0; font-size: 0.5em;">n</span><span style="font-size: 1em; margin-left: 0.3em;">√</span></span><span contenteditable="true" style="border-top: 1px solid #f5f5f5; padding: 0 1px;">x</span>' },
      { label: "Product", text: "∏", html: '<span style="position: relative; display: inline-block; margin: 0 2px; vertical-align: middle;"><span contenteditable="true" style="position: absolute; top: -0.8em; left: 50%; transform: translateX(-50%); font-size: 0.6em; white-space: nowrap;">n</span><span style="font-size: 1.2em;">∏</span><span contenteditable="true" style="position: absolute; bottom: -0.8em; left: 50%; transform: translateX(-50%); font-size: 0.6em; white-space: nowrap;">i=1</span></span>' }
    ]
  };

  const notifySaveStatus = useCallback((statusMessage, additionalData = {}) => {
    onSaveStatusChange?.({
      hasUnsavedChanges,
      status: statusMessage,
      operation: additionalData.operation || 'edit',
    });
  }, [onSaveStatusChange, hasUnsavedChanges]);

  const debouncedNotifySaveStatus = useDebounce(notifySaveStatus, 100);

  useEffect(() => {
    setHasUnsavedChanges(undoStack.length > 0);
  }, [undoStack]);

  useEffect(() => {
    async function loadFile() {
      try {
        if (!fileHandle) { setLoading(false); return; }
        const file = await fileHandle.getFile();
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["txt", "md"].includes(ext)) throw new Error(`Unsupported file type: .${ext}`);
        const t = await file.text();
        if (editorRef.current) {
          editorRef.current.innerHTML = t;
        }
      } catch (error) { setError(e.message); } finally { setLoading(false); }
    }
    loadFile();
  }, [fileHandle]);

  const insertEquation = (htmlContent) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
   
    const prevHTML = editor.innerHTML;
   
    setUndoStack(prev => [...prev, prevHTML]);
    setRedoStack([]);
   
    document.execCommand('insertHTML', false, `<span class="math-expression" contenteditable="false" style="display: inline; margin: 0; padding: 0; border: 1px solid transparent; border-radius: 2px; vertical-align: baseline; font-family: 'Times New Roman', serif; cursor: pointer; background: rgba(76, 175, 80, 0.03);">${htmlContent}</span>`);
   
    setShowEquationPicker(false);
   
    setTimeout(() => {
      const newHTML = editor.innerHTML;
      onEdit?.({ fullCode: prevHTML }, { fullCode: newHTML });
      debouncedNotifySaveStatus("Unsaved Changes", { operation: "insertEquation" });
     
      editor.querySelectorAll('.math-expression').forEach(mathSpan => {
        mathSpan.onclick = (e) => {
          e.stopPropagation();
          document.querySelectorAll('.math-expression').forEach(el => {
            el.style.border = '1px solid transparent';
            el.style.backgroundColor = 'rgba(76, 175, 80, 0.03)';
            el.querySelectorAll('[contenteditable="true"]').forEach(editable => {
              editable.style.backgroundColor = 'transparent';
            });
          });
          mathSpan.style.border = '1px solid #4CAF50';
          mathSpan.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
          mathSpan.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
          });
        };
      });
    }, 0);
  };

  const handleTextInput = useCallback((e) => {
    const editor = editorRef.current;
    if (!editor) return;
    const prevHTML = editor.innerHTML;
   
    setUndoStack(prev => [...prev, prevHTML]);
    setRedoStack([]);
   
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
     
      const range = selection.getRangeAt(0);
      if (!range.startContainer || range.startContainer.nodeType !== Node.TEXT_NODE) return;
     
      const textNode = range.startContainer;
      const textContent = textNode.textContent;
      const cursorPos = range.startOffset;
      const beforeCursor = textContent.substring(0, cursorPos);
     
      const superMatch = beforeCursor.match(/([a-zA-Z0-9]+)\^([a-zA-Z0-9]+)$/);
      if (superMatch) {
        const fullMatch = superMatch[0];
        const base = superMatch[1];
        const exp = superMatch[2];
        const startPos = cursorPos - fullMatch.length;
       
        const newRange = document.createRange();
        newRange.setStart(textNode, startPos);
        newRange.setEnd(textNode, cursorPos);
        newRange.deleteContents();
       
        document.execCommand('insertHTML', false, `${base}<sup contenteditable="true" style="font-size: 0.7em; vertical-align: super;">${exp}</sup>`);
        return;
      }
     
      const subMatch = beforeCursor.match(/([a-zA-Z0-9]+)_([a-zA-Z0-9]+)$/);
      if (subMatch) {
        const fullMatch = subMatch[0];
        const base = subMatch[1];
        const sub = subMatch[2];
        const startPos = cursorPos - fullMatch.length;
       
        const newRange = document.createRange();
        newRange.setStart(textNode, startPos);
        newRange.setEnd(textNode, cursorPos);
        newRange.deleteContents();
       
        document.execCommand('insertHTML', false, `${base}<sub contenteditable="true" style="font-size: 0.7em; vertical-align: sub;">${sub}</sub>`);
        return;
      }
     
      const fracMatch = beforeCursor.match(/(\d+)\/(\d+)$/);
      if (fracMatch) {
        const fullMatch = fracMatch[0];
        const num = fracMatch[1];
        const den = fracMatch[2];
        const startPos = cursorPos - fullMatch.length;
       
        const newRange = document.createRange();
        newRange.setStart(textNode, startPos);
        newRange.setEnd(textNode, cursorPos);
        newRange.deleteContents();
       
        document.execCommand('insertHTML', false, `<span style="display: inline-block; text-align: center; vertical-align: middle; font-size: 0.9em;"><span contenteditable="true" style="display: block; border-bottom: 1px solid #f5f5f5; padding: 0; margin: 0;">${num}</span><span contenteditable="true" style="display: block; padding: 0; margin: 0;">${den}</span></span>`);
        return;
      }
     
      const newHTML = editor.innerHTML;
      onEdit?.({ fullCode: prevHTML }, { fullCode: newHTML });
      debouncedNotifySaveStatus("Unsaved Changes");
    }, 10);
  }, [onEdit, debouncedNotifySaveStatus]);

  const handleKeyDown = useCallback((e) => {
    const editor = editorRef.current;
    if (!editor) return;
    const isMac = isMacPlatform();
    const binds = normalizeBinds(keyBinds);
    const mod = isMac ? e.metaKey : e.ctrlKey;
   
    if (mod) {
      if (binds.search.some(b => matchBind(e, b, isMac))) { stopAll(e); setShowSearchPanel(true); return; }
      if (binds.save.some(b => matchBind(e, b, isMac))) { stopAll(e); handleSave(); return; }
      if (binds.selectAll.some(b => matchBind(e, b, isMac))) { stopAll(e); handleSelectAll(); return; }
      if (binds.cut.some(b => matchBind(e, b, isMac))) { stopAll(e); handleCut(); return; }
      if (binds.copy.some(b => matchBind(e, b, isMac))) { stopAll(e); handleCopy(); return; }
      if (binds.paste.some(b => matchBind(e, b, isMac))) { stopAll(e); handlePaste(); return; }
      if (binds.undo.some(b => matchBind(e, b, isMac))) { stopAll(e); handleUndo(); return; }
      if (binds.redo.some(b => matchBind(e, b, isMac))) { stopAll(e); handleRedo(); return; }
    }
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (e.key === 'Backspace') {
      const commonAncestor = range.commonAncestorContainer;
      const mathExpr = commonAncestor.nodeType === Node.ELEMENT_NODE
        ? commonAncestor.querySelector('.math-expression') || commonAncestor.closest('.math-expression')
        : commonAncestor.parentNode?.closest?.('.math-expression');
      if (mathExpr) {
        e.preventDefault();
        const sel = window.getSelection();
        const newRange = document.createRange();
        newRange.selectNode(mathExpr);
        sel.removeAllRanges();
        sel.addRange(newRange);
        document.execCommand('delete');
        return;
      }
      if (range.collapsed && range.startOffset === 0) {
        const container = range.startContainer;
        let prevNode = container.previousSibling;
       
        if (!prevNode && container.nodeType === Node.TEXT_NODE) {
          prevNode = container.parentNode.previousSibling;
        }
        if (prevNode && prevNode.classList && prevNode.classList.contains('math-expression')) {
          e.preventDefault();
          const sel = window.getSelection();
          const newRange = document.createRange();
          newRange.selectNode(prevNode);
          sel.removeAllRanges();
          sel.addRange(newRange);
          document.execCommand('delete');
          return;
        }
      }
    }
  }, [keyBinds]);

  const handleEditorClick = (e) => {
    if (!e.target.closest('.math-expression')) {
      document.querySelectorAll('.math-expression').forEach(el => {
        el.style.border = '1px solid transparent';
        el.style.backgroundColor = 'rgba(76, 175, 80, 0.03)';
        el.querySelectorAll('[contenteditable="true"]').forEach(editable => {
          editable.style.backgroundColor = 'transparent';
        });
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!showDrawPanel || !canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#4CAF50";
    ctx.shadowColor = "#4CAF50";
    ctx.shadowBlur = 2;
    let drawing = false;
    let currentStroke = [];
    let allStrokes = [];
    let lastPoint = null;
    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    const drawSmoothStroke = (points) => {
      if (points.length < 2) return;
     
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
     
      for (let i = 1; i < points.length - 1; i++) {
        const currentPoint = points[i];
        const nextPoint = points[i + 1];
        const controlPoint = {
          x: (currentPoint.x + nextPoint.x) / 2,
          y: (currentPoint.y + nextPoint.y) / 2
        };
        ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlPoint.x, controlPoint.y);
      }
     
      if (points.length > 1) {
        const lastIdx = points.length - 1;
        ctx.lineTo(points[lastIdx].x, points[lastIdx].y);
      }
     
      ctx.stroke();
    };
    const startDrawing = (e) => {
      drawing = true;
      const pos = getMousePos(e);
      currentStroke = [pos];
      lastPoint = pos;
      setIsDrawing(true);
    };
    const draw = (e) => {
      if (!drawing) return;
     
      const pos = getMousePos(e);
     
      if (lastPoint && Math.abs(pos.x - lastPoint.x) < 2 && Math.abs(pos.y - lastPoint.y) < 2) {
        return;
      }
     
      currentStroke.push(pos);
      lastPoint = pos;
     
      ctx.clearRect(0, 0, canvas.width, canvas.height);
     
      allStrokes.forEach(stroke => {
        if (stroke.length > 1) {
          drawSmoothStroke(stroke);
        }
      });
     
      if (currentStroke.length > 1) {
        drawSmoothStroke(currentStroke);
      }
    };
    const stopDrawing = () => {
      if (!drawing) return;
      drawing = false;
      setIsDrawing(false);
      lastPoint = null;
     
      if (currentStroke.length > 3) {
        allStrokes.push([...currentStroke]);
        setStrokeCount(allStrokes.length);
       
        const allPoints = allStrokes.flat();
        if (allPoints.length > 10) {
          const suggestions = analyzeDrawing(allPoints);
          setSymbolSuggestions(suggestions);
        }
      }
     
      currentStroke = [];
    };
    const analyzeDrawing = (drawPath) => {
      if (drawPath.length < 10) return [];
     
      const suggestions = [];
     
      const minX = Math.min(...drawPath.map(p => p.x));
      const maxX = Math.max(...drawPath.map(p => p.x));
      const minY = Math.min(...drawPath.map(p => p.y));
      const maxY = Math.max(...drawPath.map(p => p.y));
     
      const width = maxX - minX;
      const height = maxY - minY;
      const aspectRatio = width / height;
     
      let pathLength = 0;
      let totalAngleChange = 0;
      let straightSegments = 0;
      let curveSegments = 0;
     
      for (let i = 1; i < drawPath.length; i++) {
        const dx = drawPath[i].x - drawPath[i-1].x;
        const dy = drawPath[i].y - drawPath[i-1].y;
        pathLength += Math.sqrt(dx * dx + dy * dy);
       
        if (i > 1) {
          const prevDx = drawPath[i-1].x - drawPath[i-2].x;
          const prevDy = drawPath[i-1].y - drawPath[i-2].y;
          const angle1 = Math.atan2(prevDy, prevDx);
          const angle2 = Math.atan2(dy, dx);
          let angleDiff = Math.abs(angle2 - angle1);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
         
          totalAngleChange += angleDiff;
         
          if (angleDiff < 0.2) straightSegments++;
          else if (angleDiff > 1.0) curveSegments++;
        }
      }
     
      const avgAngleChange = totalAngleChange / (drawPath.length - 2);
      const curviness = curveSegments / drawPath.length;
      const straightness = straightSegments / drawPath.length;
     
      const startPoint = drawPath[0];
      const endPoint = drawPath[drawPath.length - 1];
      const closureDistance = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) +
        Math.pow(endPoint.y - startPoint.y, 2)
      );
      const isClosedPath = closureDistance < Math.min(width, height) * 0.2;
     
      if (isClosedPath && curviness > 0.3 && aspectRatio > 0.6 && aspectRatio < 1.6) {
        if (aspectRatio > 0.8 && aspectRatio < 1.2) {
          suggestions.push("○", "●", "∘", "∅", "◯");
        } else {
          suggestions.push("○", "◯", "∅", "θ", "φ", "∞");
        }
      }
      else if (aspectRatio > 4 && straightness > 0.6) {
        suggestions.push("−", "=", "≡", "≈", "∼");
        if (aspectRatio > 8) suggestions.push("⟶", "⟷", "↔");
      }
      else if (aspectRatio < 0.25 && straightness > 0.6) {
        suggestions.push("|", "∣", "‖", "∥");
        if (height > 100) suggestions.push("∫", "∑", "∏");
      }
      else if (totalAngleChange > Math.PI * 1.5 && totalAngleChange < Math.PI * 2.5 && curviness < 0.2) {
        suggestions.push("△", "▽", "∆", "∇", "⋀", "⋁");
      }
      else if (!isClosedPath && curviness > 0.4 && aspectRatio > 0.5 && aspectRatio < 2) {
        if (height > width) {
          suggestions.push("∫", "∑", "∏", "√", "∂");
        } else {
          suggestions.push("∼", "≈", "∞", "⌒", "⌓");
        }
      }
      else if (allStrokes.length >= 2) {
        const stroke1 = allStrokes[allStrokes.length - 2];
        const stroke2 = allStrokes[allStrokes.length - 1];
       
        if (stroke1 && stroke2) {
          const s1_aspect = getStrokeAspectRatio(stroke1);
          const s2_aspect = getStrokeAspectRatio(stroke2);
         
          if ((s1_aspect > 2 && s2_aspect < 0.5) || (s1_aspect < 0.5 && s2_aspect > 2)) {
            suggestions.push("+", "×", "⊕", "⊗", "⋅");
          }
        }
      }
      else if (totalAngleChange > Math.PI * 3 && straightness > 0.4 && aspectRatio > 0.3 && aspectRatio < 3) {
        suggestions.push("□", "■", "▢", "▣", "⊠", "⊡");
      }
      else if (curviness > 0.5 || avgAngleChange > 0.8) {
        if (aspectRatio < 0.7) {
          suggestions.push("∫", "∑", "∏", "√", "∂", "∆", "∇");
        } else {
          suggestions.push("∞", "θ", "φ", "ω", "α", "β", "γ");
        }
      }
      else {
        if (aspectRatio > 1.5) {
          suggestions.push("÷", "±", "∓", "≠", "≤", "≥");
        } else if (aspectRatio < 0.7) {
          suggestions.push("∈", "∉", "⊂", "⊃", "∪", "∩");
        } else {
          suggestions.push("∧", "∨", "⊕", "⊖", "⊗", "⊘");
        }
      }
     
      function getStrokeAspectRatio(stroke) {
        const minX = Math.min(...stroke.map(p => p.x));
        const maxX = Math.max(...stroke.map(p => p.x));
        const minY = Math.min(...stroke.map(p => p.y));
        const maxY = Math.max(...stroke.map(p => p.y));
        return (maxX - minX) / (maxY - minY);
      }
     
      return [...new Set(suggestions)].slice(0, 8);
    };
    const clearAll = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      allStrokes = [];
      currentStroke = [];
      setSymbolSuggestions([]);
      setStrokeCount(0);
    };
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);
    canvas._clearDrawing = clearAll;
    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);
    };
  }, [showDrawPanel]);

  const handleSave = useCallback(() => {
    if (!fileHandle) {
      setSaveStatus("no-handle");
      notifySaveStatus("No file handle available.", { operation: "save" });
      setTimeout(() => {
        setSaveStatus("idle");
        notifySaveStatus("", { operation: "save" });
      }, SAVE_BANNER_TIMEOUT_MS);
      return;
    }
    setSaveStatus("saving");
    notifySaveStatus("Saving...", { operation: "save" });
    (async () => {
      try {
        const editor = editorRef.current;
        if (editor) {
          document.querySelectorAll('.math-expression').forEach(el => {
            el.style.border = '1px solid transparent';
            el.style.backgroundColor = 'rgba(76, 175, 80, 0.03)';
            el.querySelectorAll('[contenteditable="true"]').forEach(editable => {
              editable.style.backgroundColor = 'transparent';
            });
          });
        }
        const content = editor ? editor.innerHTML : '';
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        setSaveStatus("saved");
        setUndoStack([]);
        setRedoStack([]);
        notifySaveStatus("Saved!", { operation: "save" });
        onSave?.(content);
        setTimeout(() => {
          setSaveStatus("idle");
          notifySaveStatus("", { operation: "save" });
        }, SAVE_BANNER_TIMEOUT_MS);
      } catch {
        setSaveStatus("failed");
        notifySaveStatus("Save failed!", { operation: "save" });
        setTimeout(() => {
          setSaveStatus("idle");
          notifySaveStatus("", { operation: "save" });
        }, SAVE_BANNER_TIMEOUT_MS);
      }
    })();
  }, [fileHandle, onSave, notifySaveStatus]);

  const handleDownload = useCallback(async () => {
    const result = await showDialog({
      title: "Download as...",
      message: "Select file type:",
      inputs: [{ name: "type", type: "select", options: [{ label: "Text (.txt)", value: "txt" }, { label: "Markdown (.md)", value: "md" }] }],
      showCancel: true
    });
    if (result) {
      const editor = editorRef.current;
      const content = editor ? editor.innerHTML : '';
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (fileHandle?.name?.replace(/\.[^/.]+$/, "") || "Untitled") + "." + result.type;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [fileHandle]);

  const handleUndo = useCallback(() => {
    if (!undoStack.length) return;
    const editor = editorRef.current;
    if (!editor) return;
    const currentHTML = editor.innerHTML;
    const previousHTML = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentHTML]);
    editor.innerHTML = previousHTML;
    debouncedNotifySaveStatus("Unsaved Changes", { operation: "undo" });
    onEdit?.({ fullCode: currentHTML }, { fullCode: previousHTML });
  }, [undoStack, onEdit, debouncedNotifySaveStatus]);

  const handleRedo = useCallback(() => {
    if (!redoStack.length) return;
    const editor = editorRef.current;
    if (!editor) return;
    const currentHTML = editor.innerHTML;
    const nextHTML = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentHTML]);
    editor.innerHTML = nextHTML;
    debouncedNotifySaveStatus("Unsaved Changes", { operation: "redo" });
    onEdit?.({ fullCode: currentHTML }, { fullCode: nextHTML });
  }, [redoStack, onEdit, debouncedNotifySaveStatus]);

  const handleCut = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const prevHTML = editor.innerHTML;
    setUndoStack(prev => [...prev, prevHTML]);
    setRedoStack([]);
    document.execCommand("cut");
    setTimeout(() => {
      const newHTML = editor.innerHTML;
      onEdit?.({ fullCode: prevHTML }, { fullCode: newHTML });
      debouncedNotifySaveStatus("Unsaved Changes", { operation: "cut" });
    }, 0);
  };

  const handleCopy = () => document.execCommand("copy");

  const handlePaste = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const prevHTML = editor.innerHTML;
    setUndoStack(prev => [...prev, prevHTML]);
    setRedoStack([]);
    document.execCommand("paste");
    setTimeout(() => {
      const newHTML = editor.innerHTML;
      onEdit?.({ fullCode: prevHTML }, { fullCode: newHTML });
      debouncedNotifySaveStatus("Unsaved Changes", { operation: "paste" });
    }, 0);
  };

  const handleSelectAll = () => {
    if (editorRef.current) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleStatistics = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const plainText = editor.textContent || '';
    const words = plainText.trim().split(/\s+/).length;
    const chars = plainText.length;
    const lines = plainText.split("\n").length;
    showDialog({ title: "Statistics", message: `Words: ${words}\nCharacters: ${chars}\nLines: ${lines}` });
  }, []);

  const insertSymbol = useCallback(symbol => {
    const editor = editorRef.current;
    if (!editor) return;
   
    const prevHTML = editor.innerHTML;
   
    setUndoStack(prev => [...prev, prevHTML]);
    setRedoStack([]);
   
    editor.focus();
    document.execCommand('insertText', false, symbol);
   
    setTimeout(() => {
      const newHTML = editor.innerHTML;
      onEdit?.({ fullCode: prevHTML }, { fullCode: newHTML });
      debouncedNotifySaveStatus("Unsaved Changes", { operation: "insertSymbol" });
    }, 10);
  }, [debouncedNotifySaveStatus, onEdit]);

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas && canvas._clearDrawing) {
      canvas._clearDrawing();
    }
  };

  function highlightMatches() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll('.search-match, .search-match-active').forEach(span => {
      const parent = span.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
      parent.normalize();
    });

    if (!searchResults.length || !searchTerm) return;

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement.closest('.math-expression') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push({ node, offset: 0 });
    }

    let globalOffset = 0;
    textNodes.forEach(({ node }, nodeIndex) => {
      const text = caseSensitive ? node.textContent : node.textContent.toLowerCase();
      const search = caseSensitive ? searchTerm : searchTerm.toLowerCase();
      const matches = [];
      let pos = 0;

      while (true) {
        const idx = text.indexOf(search, pos);
        if (idx === -1) break;
        matches.push({ start: idx, end: idx + searchTerm.length });
        pos = idx + 1;
      }

      if (matches.length) {
        const fragment = document.createDocumentFragment();
        let lastPos = 0;

        matches.forEach((match, matchIndex) => {
          const matchGlobalOffset = globalOffset + match.start;
          const matchEndGlobalOffset = globalOffset + match.end;
          const globalIndex = searchResults.findIndex(r => r.start === matchGlobalOffset && r.end === matchEndGlobalOffset);

          if (lastPos < match.start) {
            fragment.appendChild(document.createTextNode(node.textContent.slice(lastPos, match.start)));
          }

          const span = document.createElement('span');
          span.className = globalIndex === currentResultIndex ? 'search-match-active' : 'search-match';
          span.style.backgroundColor = globalIndex === currentResultIndex ? 'rgba(255, 255, 0, 0.5)' : 'rgba(255, 165, 0, 0.3)';
          span.style.borderRadius = '2px';
          span.textContent = node.textContent.slice(match.start, match.end);
          fragment.appendChild(span);

          lastPos = match.end;
        });

        if (lastPos < node.textContent.length) {
          fragment.appendChild(document.createTextNode(node.textContent.slice(lastPos)));
        }

        node.parentNode.replaceChild(fragment, node);
      }

      globalOffset += node.textContent.length;
    });

    if (currentResultIndex >= 0 && searchResults[currentResultIndex]) {
      const activeSpan = editor.querySelector('.search-match-active');
      if (activeSpan) {
        activeSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function findAllMatches(term) {
    setSearchResults([]);
    setCurrentResultIndex(-1);
    if (!term) return;
    const editor = editorRef.current;
    if (!editor) return;
    const results = [];
    let concatenatedLength = 0;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement.closest('.math-expression') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = caseSensitive ? node.textContent : node.textContent.toLowerCase();
      const search = caseSensitive ? term : term.toLowerCase();
      let pos = 0;
      while (true) {
        const idx = text.indexOf(search, pos);
        if (idx === -1) break;
        results.push({ start: concatenatedLength + idx, end: concatenatedLength + idx + term.length });
        pos = idx + 1;
      }
      concatenatedLength += node.textContent.length;
    }
    setSearchResults(results);
    if (results.length) {
      setCurrentResultIndex(0);
    }
  }

  useEffect(() => {
    if (searchTerm) {
      findAllMatches(searchTerm);
    } else {
      setSearchResults([]);
      setCurrentResultIndex(-1);
    }
  }, [searchTerm, caseSensitive]);

  const goToNext = () => {
    if (!searchResults.length) return;
    const idx = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(idx);
  };

  const goToPrevious = () => {
    if (!searchResults.length) return;
    const idx = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(idx);
  };

  const replaceCurrent = () => {
    if (currentResultIndex < 0 || !searchResults[currentResultIndex]) return;
    const editor = editorRef.current;
    if (!editor) return;

    const prevHTML = editor.innerHTML;

    const { start, end } = searchResults[currentResultIndex];
    const range = document.createRange();
    let currentOffset = 0;
    let targetNode = null;
    let startOffset = 0;
    let endOffset = 0;

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement.closest('.math-expression') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent.length;
      if (currentOffset + nodeLength > start) {
        targetNode = node;
        startOffset = start - currentOffset;
        endOffset = end - currentOffset;
        break;
      }
      currentOffset += nodeLength;
    }

    if (targetNode) {
      range.setStart(targetNode, startOffset);
      range.setEnd(targetNode, endOffset);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('insertText', false, replaceTerm);
      
      const newHTML = editor.innerHTML;
      onEdit?.({ fullCode: prevHTML }, { fullCode: newHTML });
      debouncedNotifySaveStatus("Unsaved Changes", { operation: "replace" });
      setTimeout(() => findAllMatches(searchTerm), 0);
    }
  };

  const replaceAll = () => {
    if (!searchResults.length) return;
    const editor = editorRef.current;
    if (!editor) return;

    const prevHTML = editor.innerHTML;

    const sortedResults = [...searchResults].sort((a, b) => b.start - a.start);

    for (const result of sortedResults) {
      const range = document.createRange();
      let currentOffset = 0;
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
        acceptNode: node => node.parentElement.closest('.math-expression') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      });

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeLength = node.textContent.length;
        if (currentOffset + nodeLength > result.start) {
          const startOffset = result.start - currentOffset;
          const endOffset = result.end - currentOffset;
          range.setStart(node, startOffset);
          range.setEnd(node, endOffset);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand('insertText', false, replaceTerm);
          break;
        }
        currentOffset += nodeLength;
      }
    }

    const newHTML = editor.innerHTML;
    onEdit?.({ fullCode: prevHTML }, { fullCode: newHTML });
    debouncedNotifySaveStatus("Unsaved Changes", { operation: "replaceAll" });
    setTimeout(() => findAllMatches(searchTerm), 0);
  };

  useEffect(() => {
    highlightMatches();
  }, [searchResults, currentResultIndex]);

  useEffect(() => {
    if (searchPanelDragging) {
      const move = e => setSearchPanelPos({ x: e.clientX - searchPanelOffset.x, y: e.clientY - searchPanelOffset.y });
      const up = () => setSearchPanelDragging(false);
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
    }
  }, [searchPanelDragging, searchPanelOffset]);

  const startSearchDrag = e => {
    setSearchPanelDragging(true);
    setSearchPanelOffset({ x: e.clientX - searchPanelPos.x, y: e.clientY - searchPanelPos.y });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSpecialPicker && specialPickerRef.current && !specialPickerRef.current.contains(e.target)) {
        setShowSpecialPicker(false);
        setShowDrawPanel(false);
        setStrokeCount(0);
        clearDrawing();
      }
      if (showEquationPicker && equationPickerRef.current && !equationPickerRef.current.contains(e.target)) {
        setShowEquationPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpecialPicker, showEquationPicker]);

  useEffect(() => {
    const down = e => {
      if (openMenu && !menuPortalRef.current?.contains(e.target) && !e.target.closest(".dinolabsOperationsButton")) setOpenMenu(null);
    };
    document.addEventListener("mousedown", down, true);
    return () => document.removeEventListener("mousedown", down, true);
  }, [openMenu]);

  const openTopMenu = (name, btnRef) => {
    setOpenMenu(prev => prev === name ? null : name);
    if (btnRef.current) setMenuPosition(clampPosition(btnRef.current.getBoundingClientRect()));
  };

  const renderDropdownMenu = (menuName, items) => {
    if (openMenu !== menuName) return null;
    return createPortal(
      <div className="dinolabsTextDropdownMenu" ref={menuPortalRef} style={{ top: menuPosition.top, left: menuPosition.left }}>
        {items.map((item, i) => (
          <div className="dinolabsTextDropdownMenuItem" key={i} style={{ borderBottom: i < items.length - 1 ? "1px solid #444" : "none" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#3a3a3a"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"} onClick={() => { item.action(); setOpenMenu(null); }}>
            {item.icon && <FontAwesomeIcon icon={item.icon} />}
            {item.text}
          </div>
        ))}
      </div>,
      document.body
    );
  };

  useEffect(() => {
    const down = e => { if (ctxMenu.open && !ctxMenuRef.current?.contains(e.target)) setCtxMenu(c => ({ ...c, open: false })); };
    document.addEventListener("mousedown", down, true);
    return () => document.removeEventListener("mousedown", down, true);
  }, [ctxMenu.open]);

  const openContextMenu = e => {
    e.preventDefault();
    const items = [
      { icon: faUndo, text: "Undo", action: handleUndo },
      { icon: faRedo, text: "Redo", action: handleRedo },
      { icon: faCut, text: "Cut", action: handleCut },
      { icon: faCopy, text: "Copy", action: handleCopy },
      { icon: faPaste, text: "Paste", action: handlePaste },
      { icon: faArrowPointer, text: "Select All", action: handleSelectAll },
      { icon: faSearch, text: "Search/Replace", action: () => setShowSearchPanel(true) },
      { icon: faIcons, text: "Insert Special Character", action: () => setShowSpecialPicker(true) },
      { icon: faCalculator, text: "Insert Equation", action: () => setShowEquationPicker(true) },
      { icon: faSave, text: "Save", action: handleSave },
      { icon: faDownload, text: "Download", action: handleDownload }
    ];
    let x = e.clientX, y = e.clientY;
    setCtxMenu({ open: true, x, y, items });
    requestAnimationFrame(() => {
      const node = ctxMenuRef.current;
      if (node) {
        const w = node.offsetWidth, h = node.offsetHeight;
        if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
        if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
        setCtxMenu(c => ({ ...c, x, y }));
      }
    });
  };

  const renderSpecialPicker = () => {
    if (!showSpecialPicker) return null;
    const symbols = specialCategory === "math" ? mathSymbols :
                    specialCategory === "latin" ? latinSymbols :
                    specialCategory === "greek" ? greekSymbols :
                    punctuationSymbols;
    return createPortal(
      <div ref={specialPickerRef} className="dinolabsTextEquationPicker" style={{ "overflow": showDrawPanel ? "hidden" : "" }}>
        <div className="dinolabsTextEquationNavButtons">
          <button
            onClick={() => setSpecialCategory("math")}
            style={{
              backgroundColor: specialCategory === "math" ? "#444" : "#333"
            }}
          >
            Math
          </button>
          <button
            onClick={() => setSpecialCategory("latin")}
            style={{
              backgroundColor: specialCategory === "latin" ? "#444" : "#333"
            }}
          >
            Latin
          </button>
          <button
            onClick={() => setSpecialCategory("greek")}
            style={{
              backgroundColor: specialCategory === "greek" ? "#444" : "#333"
            }}
          >
            Greek
          </button>
          <button
            onClick={() => setSpecialCategory("punctuation")}
            style={{
              backgroundColor: specialCategory === "punctuation" ? "#444" : "#333"
            }}
          >
            Punctuation
          </button>
          <button
            onClick={() => { setShowDrawPanel(true); setStrokeCount(0); clearDrawing(); }}
            style={{
              backgroundColor: showDrawPanel ? "#4CAF50" : "#333"
            }}
          >
            Draw Symbol
          </button>
          <button
            onClick={() => { setShowSpecialPicker(false); setShowDrawPanel(false); setStrokeCount(0); clearDrawing(); }}
            style={{
              backgroundColor: "#666"
            }}
          >
            Close
          </button>
        </div>
       
        {!showDrawPanel && (
          <div className="dinolabsTextEquationSelectionButtons" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(30px, 1fr))" }}>
            {symbols.map(s => (
              <button
                key={s}
                onClick={() => { insertSymbol(s); setShowSpecialPicker(false); setStrokeCount(0); }}
                style={{
                  fontSize: "16px",
                  height: "20px" 
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#444"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "#333"}
              >
                {s}
              </button>
            ))}
          </div>
        )}
       
        {showDrawPanel && (
          <div className="dinolabsTextDrawSymbolWrapper">
            <div className="dinolabsTextDrawSymbolSketchBoxStack">
              <canvas
                ref={canvasRef}
                style={{
                  background: "#1a1a1a",
                  cursor: "crosshair",
                  display: "block"
                }}
              />
              <div className="dinolabsTextDrawSymbolSketchBoxStackBottom">
                <button className="dinolabsTextDrawSymbolSketchBoxStackBottomButton"
                  onClick={clearDrawing}
                >
                  Clear
                </button>
              </div>
            </div>
           
            {symbolSuggestions.length > 0 && (
              <div className="dinolabsTextDrawSymbolSketchBoxStackSuggestions">
                <div className="dinolabsTextDrawSymbolSketchBoxStackSuggestionsButtons" >
                  {symbolSuggestions.map((symbol, i) => (
                    <button
                      key={i}
                      onClick={() => { insertSymbol(symbol); setShowSpecialPicker(false); setShowDrawPanel(false); setStrokeCount(0); clearDrawing(); }}
                    
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#444"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "#333"}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>,
      document.body
    );
  };

  const renderEquationPicker = () => {
    if (!showEquationPicker) return null;
    const templates = equationTemplates[equationCategory] || [];
    return createPortal(
      <div className="dinolabsTextEquationPicker">
        <div className="dinolabsTextEquationNavButtons" >
          <button
            onClick={() => setEquationCategory("basic")}
            style={{ backgroundColor: equationCategory === "basic" ? "#444" : "#333" }}
          >
            Basic
          </button>
          <button
            onClick={() => setEquationCategory("advanced")}
            style={{ backgroundColor: equationCategory === "advanced" ? "#444" : "#333" }}
          >
            Advanced
          </button>
          <button
            onClick={() => setShowEquationPicker(false)}
            style={{
              backgroundColor: "#666"
            }}
          >
            Close
          </button>
        </div>
        <div className="dinolabsTextEquationSelectionButtons">
          {templates.map((t, i) => (
            <button
              key={i}
              onClick={() => insertEquation(t.html)}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#444"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#333"}
            >
              <label>{t.label}</label>
              <div>{t.text}</div>
            </button>
          ))}
        </div>
      </div>,
      document.body
    );
  };

  if (loading) return <div className="loading-wrapper">
                <div className="loading-circle" />
                <label className="loading-title">Dino Labs Web IDE</label>
            </div>;
  if (error) return <div className="loading-wrapper">
                <div className="loading-circle" />
                <label className="loading-title">Dino Labs Web IDE</label>
            </div>;

  const saveBannerText = saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : saveStatus === "failed" ? "Save failed!" : saveStatus === "no-handle" ? "No file handle" : "";

  return (
    <div className="dinolabsTextContentWrapper" onContextMenu={openContextMenu}>
      <div className="dinolabsTextToolbarWrapper">
        <div className="dinolabsTextToolBar">
          <div className="dinolabsTextTitleWrapper">
            <div className="dinolabsTextFileNameStack">
              <label className="dinolabsTextFileNameInput"><FontAwesomeIcon icon={faFile} /> {fileHandle?.name || "Untitled Text"}</label>
              <div className="dinolabsTextOperationsButtonsWrapper">
                <button ref={fileBtnRef} className="dinolabsTextOperationsButton" onClick={() => openTopMenu("file", fileBtnRef)}>File</button>
                {renderDropdownMenu("file", [
                  { icon: faSave, text: "Save", action: handleSave },
                  { icon: faDownload, text: "Download", action: handleDownload }
                ])}
                <button ref={editBtnRef} className="dinolabsTextOperationsButton" onClick={() => openTopMenu("edit", editBtnRef)}>Edit</button>
                {renderDropdownMenu("edit", [
                  { icon: faUndo, text: "Undo", action: handleUndo },
                  { icon: faRedo, text: "Redo", action: handleRedo },
                  { icon: faCut, text: "Cut", action: handleCut },
                  { icon: faCopy, text: "Copy", action: handleCopy },
                  { icon: faPaste, text: "Paste", action: handlePaste },
                  { icon: faArrowPointer, text: "Select All", action: handleSelectAll },
                  { icon: faSearch, text: "Search/Replace", action: () => setShowSearchPanel(true) }
                ])}
                <button ref={insertBtnRef} className="dinolabsTextOperationsButton" onClick={() => openTopMenu("insert", insertBtnRef)}>Insert</button>
                {renderDropdownMenu("insert", [
                  { icon: faIcons, text: "Special Character", action: () => setShowSpecialPicker(true) },
                  { icon: faCalculator, text: "Equation", action: () => setShowEquationPicker(true) }
                ])}
                <button ref={toolsBtnRef} className="dinolabsTextOperationsButton" onClick={() => openTopMenu("tools", toolsBtnRef)}>Tools</button>
                {renderDropdownMenu("tools", [
                  { text: "Statistics", action: handleStatistics }
                ])}
              </div>
            </div>
          </div>
        </div>
      </div>
     
      <div className="dinolabsTextContent">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleTextInput}
          onKeyDown={handleKeyDown}
          onClick={handleEditorClick}
          suppressContentEditableWarning={true}
          className="dinolabsTextEditor"
          data-placeholder="Start typing... Try x^2, x_1, 1/2, or use Insert → Equation for structured math"
        />
      </div>
     
      {showSearchPanel && (
        <div ref={searchPanelRef} className="dinolabsTextEditingSearchBoxWrapper" style={{ position: "absolute", top: searchPanelPos.y, left: searchPanelPos.x, zIndex: 10001 }} onMouseDown={startSearchDrag}>
          <div className="dinolabsTextEditngSearchBarWrapper">
            <label className="dinolabsTextEditingSearchLabel">Search: <span><input className="dinolabsSettingsCheckbox" type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} />Case Sensitive</span></label>
            <input className="dinolabsTextEditingSearchInput" type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="dinolabsTextEditingSearchOperationsButtonWrapper">
              <button className="dinolabsTextEditingSearchOperationsButton" onClick={() => findAllMatches(searchTerm)}>Search</button>
              <button className="dinolabsTextEditingSearchOperationsButton" onClick={goToPrevious}>Prev</button>
              <button className="dinolabsTextEditingSearchOperationsButton" onClick={goToNext}>Next</button>
            </div>
          </div>
          <div className="dinolabsTextEditngSearchBarWrapper">
            <label className="dinolabsTextEditingSearchLabel">Replace:</label>
            <input className="dinolabsTextEditingSearchInput" type="text" value={replaceTerm} onChange={e => setReplaceTerm(e.target.value)} />
            <div className="dinolabsTextEditingSearchOperationsButtonWrapper">
              <button className="dinolabsTextEditingSearchOperationsButton" onClick={replaceCurrent}>Replace</button>
              <button className="dinolabsTextEditingSearchOperationsButton" onClick={replaceAll}>Replace All</button>
            </div>
          </div>
          <div className="dinolabsTextEditingSearchOperationsButtonWrapper" style={{ justifyContent: "center" }}>
            <button className="dinolabsTextEditingSearchOperationsButton" style={{"width": "100%"}} onClick={() => { setShowSearchPanel(false); setSearchResults([]); setCurrentResultIndex(-1); }}>
              <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ transform: "scaleX(-1)" }} /> Close Search
            </button>
          </div>
        </div>
      )}
      {ctxMenu.open && createPortal(
        <div ref={ctxMenuRef} className="dinolabsContextMenu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={e => e.stopPropagation()}>
          {ctxMenu.items.map((it, i) => (
            <div key={i} className="dinolabsContextMenuItem" onClick={() => { setCtxMenu(c => ({ ...c, open: false })); it.action(); }}>
              {it.icon && <FontAwesomeIcon icon={it.icon} />}
              <span>{it.text}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
      {renderSpecialPicker()}
      {renderEquationPicker()}
      {saveBannerText && <div className="codeSaveStatusIndicator" style={{ zIndex: 10003 }}>{saveBannerText}</div>}
    </div>
  );
}