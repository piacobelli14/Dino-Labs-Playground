import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faChevronDown } from "@fortawesome/free-solid-svg-icons";

function saveSelection(containerEl) {
  if (!containerEl) return null;
  return { start: containerEl.selectionStart, end: containerEl.selectionEnd };
}

function restoreSelection(containerEl, savedSel) {
  if (!savedSel || !containerEl) return;
  const { scrollTop, scrollLeft } = containerEl;
  containerEl.selectionStart = savedSel.start;
  containerEl.selectionEnd = savedSel.end;
  containerEl.scrollTop = scrollTop;
  containerEl.scrollLeft = scrollLeft;
}

function offsetToLineCol(text, offset) {
  let idx = 0;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (offset <= idx + lines[i].length) {
      return { line: i, col: offset - idx };
    }
    idx += lines[i].length + 1;
  }
  return { line: lines.length - 1, col: lines[lines.length - 1].length };
}

function lineColToOffset(text, line, col) {
  const lines = text.split("\n");
  let sum = 0;
  for (let i = 0; i < line && i < lines.length; i++) sum += lines[i].length + 1;
  return sum + Math.min(col, lines[line].length);
}

function unifyIndentation(line) {
  let i = 0;
  while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
  const leading = line.slice(0, i);
  const rest = line.slice(i);
  let spaceCount = 0;
  for (let j = 0; j < leading.length; j++) spaceCount += leading[j] === "\t" ? 4 : 1;
  return " ".repeat(spaceCount) + rest;
}

function detectFoldableRegions(code) {
  const lines = code.split("\n");
  const regions = [];
  const N = lines.length;
  const indents = new Array(N);
  const blanks = new Array(N);
  
  const indentOf = (s) => {
    let count = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === " ") count += 1;
      else if (ch === "\t") count += 4;
      else break;
    }
    return count;
  };
  
  const isBlank = (s) => s.trim().length === 0;
  
  for (let i = 0; i < N; i++) {
    blanks[i] = isBlank(lines[i]);
    indents[i] = blanks[i] ? 0 : indentOf(lines[i]);
  }
  
  for (let i = 0; i < N - 1; i++) {
    if (blanks[i]) continue;
    let j = i + 1;
    while (j < N && blanks[j]) j++;
    if (j >= N) break;
    
    const baseIndent = indents[i];
    const nextIndent = indents[j];
    
    if (nextIndent > baseIndent) {
      let k = j;
      let lastGreater = j;
      while (k < N) {
        if (!blanks[k]) {
          if (indents[k] > baseIndent) lastGreater = k;
          else break;
        }
        k++;
      }
      if (lastGreater > i) {
        regions.push({ startLine: i + 1, endLine: lastGreater + 1, type: "block" });
      }
    }
  }
  return regions;
}

function adjustFoldedRegionsForEdit(foldedRegions, editStartLine, editEndLine, linesDelta) {
  const newFoldedRegions = new Set();
  for (const foldedLine of foldedRegions) {
    if (foldedLine < editStartLine) {
      newFoldedRegions.add(foldedLine);
    } else if (foldedLine > editEndLine) {
      const newLine = foldedLine + linesDelta;
      if (newLine > 0) newFoldedRegions.add(newLine);
    }
  }
  return newFoldedRegions;
}

function adjustRegionsListForEdit(regions, editStartLine, editEndLine, linesDelta) {
  if (linesDelta === 0 || regions.length === 0) return regions;
  const updated = [];
  for (const r of regions) {
    if (r.endLine < editStartLine) updated.push(r);
    else if (r.startLine > editEndLine) updated.push({ ...r, startLine: r.startLine + linesDelta, endLine: r.endLine + linesDelta });
    else updated.push(r);
  }
  return updated;
}

function countNewlines(s) {
  if (!s) return 0;
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === "\n") n++;
  return n;
}

const DinoLabsMirror = forwardRef(function DinoLabsMirror(
  {
    viewCode,
    setViewCode,
    handleInput,
    handleKeyDown,
    highlightedCode,
    fontSize,
    lineHeight,
    editorId,
    disableFocus,
    keyBinds,
    lintErrors = [],
  },
  ref
) {
  const containerRef = useRef(null);
  const highlightRef = useRef(null);
  const textareaRef = useRef(null);
  const lastSavedSelRef = useRef(null);
  const pendingScrollRef = useRef(null);
  const isInternalOperationRef = useRef(false);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const commandChainRef = useRef(Promise.resolve());
  const previousCodeRef = useRef("");
  const foldableRegionsRef = useRef([]);
  const isFoldingRef = useRef(false);
  const isEditingRef = useRef(false);
  const forceRecalcRef = useRef(false);
  const isMinimapDraggingRef = useRef(false);
  const minimapWrapperRef = useRef(null);
  const minimapContentRef = useRef(null);
  const minimapViewportRef = useRef(null);
  const [contextMenuState, setContextMenuState] = useState({ visible: false, x: 0, y: 0 });
  const [foldedRegions, setFoldedRegions] = useState(new Set());
  const [breakpoints, setBreakpoints] = useState(new Set()); 
  const [gutterPx, setGutterPx] = useState(72);
  const [minimapHost, setMinimapHost] = useState(null);
  const [minimapRect, setMinimapRect] = useState({ top: 0, left: 0, width: 92, height: 0 });
  const [minimapReady, setMinimapReady] = useState(false);
  const minimapWidthPx = 92;

  const measureGutter = useCallback(() => {
    const totalLines = viewCode ? viewCode.split("\n").length : 1;
    const digits = Math.max(2, String(totalLines).length);
    
    const lineNumberWidth = digits * fontSize * 0.7; 
    const chevronWidth = fontSize * 1.2; 
    const indicatorWidth = fontSize * 0.8; 
    const spacing = fontSize * 0.15; 
    const leftPadding = fontSize * 0.3;
    const rightPadding = fontSize * 0.2;
    const codeGap = fontSize * 0.5; 
    
    const totalWidth = leftPadding + lineNumberWidth + chevronWidth + indicatorWidth + (spacing * 2) + rightPadding + codeGap;
    
    setGutterPx(Math.max(60, Math.ceil(totalWidth)));
  }, [viewCode, fontSize]);

  const foldableRegions = useMemo(() => {
    const currentCode = viewCode || "";
    
    if (forceRecalcRef.current) {
      const regions = detectFoldableRegions(currentCode);
      foldableRegionsRef.current = regions;
      previousCodeRef.current = currentCode;
      forceRecalcRef.current = false;
      return regions;
    }
    
    if (isEditingRef.current) return foldableRegionsRef.current;
    
    if (foldableRegionsRef.current.length > 0 && previousCodeRef.current) {
      const previousLines = previousCodeRef.current.split("\n");
      const currentLines = currentCode.split("\n");
      
      if (Math.abs(currentLines.length - previousLines.length) >= 10) {
        const regions = detectFoldableRegions(currentCode);
        foldableRegionsRef.current = regions;
        previousCodeRef.current = currentCode;
        return regions;
      }
      
      previousCodeRef.current = currentCode;
      return foldableRegionsRef.current;
    }
    
    const regions = detectFoldableRegions(currentCode);
    foldableRegionsRef.current = regions;
    previousCodeRef.current = currentCode;
    return regions;
  }, [viewCode]);

  const { displayCode, displayHighlightedCode, lineMapping } = useMemo(() => {
    if (!viewCode) return { displayCode: "", displayHighlightedCode: "", lineMapping: new Map() };
    
    const lines = viewCode.split("\n");
    const highlightLines = highlightedCode.includes("<br")
      ? highlightedCode.split(/<br\s*\/?>/gi)
      : highlightedCode.split(/\r\n|\r|\n/);
    
    const visibleLines = [];
    const visibleHighlightLines = [];
    const mapping = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const isHidden = foldableRegions.some(
        (region) => foldedRegions.has(region.startLine) && lineNumber > region.startLine && lineNumber <= region.endLine
      );
      
      if (!isHidden) {
        mapping.set(visibleLines.length + 1, lineNumber);
        visibleLines.push(lines[i]);
        visibleHighlightLines.push(
          highlightLines[i] ||
            lines[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        );
      }
    }
    
    return {
      displayCode: visibleLines.join("\n"),
      displayHighlightedCode: visibleHighlightLines.join("\n"),
      lineMapping: mapping,
    };
  }, [viewCode, highlightedCode, foldedRegions, foldableRegions]);

  const canFoldLine = useCallback(
    (originalLineNumber) => foldableRegions.some((region) => region.startLine === originalLineNumber),
    [foldableRegions]
  );
  
  const isLineFolded = useCallback((originalLineNumber) => foldedRegions.has(originalLineNumber), [foldedRegions]);
  const hasBreakpoint = useCallback((originalLineNumber) => breakpoints.has(originalLineNumber), [breakpoints]);

  const toggleFold = useCallback((originalLineNumber) => {
    isFoldingRef.current = true;
    setFoldedRegions((prev) => {
      const s = new Set(prev);
      if (s.has(originalLineNumber)) s.delete(originalLineNumber);
      else s.add(originalLineNumber);
      return s;
    });
    setTimeout(() => (isFoldingRef.current = false), 100);
  }, []);

  const toggleBreakpoint = useCallback((originalLineNumber) => {
    setBreakpoints((prev) => {
      const s = new Set(prev);
      if (s.has(originalLineNumber)) s.delete(originalLineNumber);
      else s.add(originalLineNumber);
      return s;
    });
  }, []);

  function queueCommand(fn) { 
    commandChainRef.current = commandChainRef.current.then(fn); 
  }
  
  function pushUndoSnapshot() {
    const sel = saveSelection(textareaRef.current);
    undoStackRef.current.push({ code: viewCode, sel });
  }
  
  function applyLineEditAdjustments(editStartLine, editEndLine, linesDelta, updatedCode, affectedOverlaps) {
    if (linesDelta !== 0) {
      setFoldedRegions((prev) => adjustFoldedRegionsForEdit(prev, editStartLine, editEndLine, linesDelta));
      setBreakpoints((prev) => adjustFoldedRegionsForEdit(prev, editStartLine, editEndLine, linesDelta));
      const shifted = adjustRegionsListForEdit(foldableRegionsRef.current, editStartLine, editEndLine, linesDelta);
      foldableRegionsRef.current = shifted;
    }
    previousCodeRef.current = updatedCode;
    if (affectedOverlaps) forceRecalcRef.current = true;
  }
  
  function editOverlapWithRegions(editStartLine, editEndLine) {
    return foldableRegionsRef.current.some((r) => !(r.endLine < editStartLine || r.startLine > editEndLine));
  }
  
  function updateContentViaParent(newCode, newSelection = null, scrollSnapshot = null) {
    isInternalOperationRef.current = true;
    if (newSelection) lastSavedSelRef.current = newSelection;
    if (scrollSnapshot) pendingScrollRef.current = scrollSnapshot;
    handleInput({ target: { value: newCode } });
  }

  const resolveLineHeight = useCallback(() => {
    if (typeof lineHeight === "number" && isFinite(lineHeight) && lineHeight > 0) return lineHeight;
    if (typeof lineHeight === "string") {
      const parsed = parseFloat(lineHeight);
      if (isFinite(parsed) && parsed > 0) return parsed;
    }
    const el = textareaRef.current;
    if (el) {
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight);
      if (isFinite(lh) && lh > 0) return lh;
    }
    return 16;
  }, [lineHeight]);

  const syncMinimapViewport = useCallback(() => {
    const wrapper = minimapWrapperRef.current;
    const viewport = minimapViewportRef.current;
    const container = containerRef.current;
    
    if (!wrapper || !viewport || !container) return;

    const minimapHeight = wrapper.clientHeight;
    const containerHeight = container.clientHeight;
    const containerScrollHeight = container.scrollHeight;
    const containerScrollTop = container.scrollTop;

    if (containerScrollHeight <= containerHeight) {
      viewport.style.top = "0px";
      viewport.style.height = `${minimapHeight}px`;
      return;
    }

    const visibleRatio = containerHeight / containerScrollHeight;
    const viewportHeight = Math.max(20, Math.round(visibleRatio * minimapHeight));

    const scrollRatio = containerScrollTop / (containerScrollHeight - containerHeight);
    const maxViewportTop = minimapHeight - viewportHeight;
    const viewportTop = Math.round(scrollRatio * maxViewportTop);

    viewport.style.height = `${viewportHeight}px`;
    viewport.style.top = `${Math.max(0, viewportTop)}px`;
  }, []);

  const syncMinimapContent = useCallback(() => {
    const container = containerRef.current;
    const minimapContent = minimapContentRef.current;
    
    if (!container || !minimapContent) return;
    
    const containerScrollHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    const containerScrollTop = container.scrollTop;
    const scale = 0.16;
    minimapContent.style.transformOrigin = "top left";
    
    if (containerScrollHeight <= containerHeight) {
      minimapContent.style.transform = `scale(${scale})`;
      return;
    }
    
    const scrollRatio = containerScrollTop / (containerScrollHeight - containerHeight);
    const contentHeight = minimapContent.scrollHeight * scale;
    const visibleHeight = minimapContent.parentElement.clientHeight;
    
    if (contentHeight <= visibleHeight) {
      minimapContent.style.transform = `scale(${scale})`;
      return;
    }
    
    const maxTranslate = (contentHeight - visibleHeight) / scale;
    const translateY = -scrollRatio * maxTranslate;
    
    minimapContent.style.transform = `scale(${scale}) translateY(${translateY}px)`;
  }, []);

  const renderMinimapContent = useCallback(() => {
    const node = minimapContentRef.current;
    if (!node) return;
    
    const lines = (displayHighlightedCode || "").split(/\r\n|\r|\n/);
    const html = lines
      .map((line) => (line.trim() === "" ? "\u200B" : line))
      .join("<br>");

    node.innerHTML = `<pre class="minimapPre" style="font-size: ${fontSize}px; line-height: ${lineHeight}px; margin: 0; padding: 0;">${html}</pre>`;

    requestAnimationFrame(() => {
      syncMinimapViewport();
      syncMinimapContent();
    });
  }, [displayHighlightedCode, fontSize, lineHeight, syncMinimapViewport, syncMinimapContent]);

  const handleAnyScroll = useCallback(() => {
    const container = containerRef.current;
    
    if (highlightRef.current && container) {
      highlightRef.current.scrollTop = container.scrollTop;
      highlightRef.current.scrollLeft = container.scrollLeft;
    }
    
    if (textareaRef.current && container) {
      textareaRef.current.scrollTop = container.scrollTop;
      textareaRef.current.scrollLeft = container.scrollLeft;
    }
    
    requestAnimationFrame(() => {
      syncMinimapViewport();
      syncMinimapContent();
    });
  }, [syncMinimapViewport, syncMinimapContent]);

  const minimapDragToScroll = useCallback((e) => {
    const wrapper = minimapWrapperRef.current;
    const container = containerRef.current;
    if (!wrapper || !container) return;

    const rect = wrapper.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const clickRatio = y / rect.height;

    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTop = clickRatio * maxScroll;
    
    syncMinimapViewport();
    syncMinimapContent();
  }, [syncMinimapViewport, syncMinimapContent]);

  const updateMinimapRect = useCallback(() => {
    const own = containerRef.current;
    if (!own) return;

    let anchor = own.closest(".codeContentWrapper");
    if (!anchor || !(anchor instanceof HTMLElement)) anchor = own.closest(".codeEditorContainer");
    if (!anchor || !(anchor instanceof HTMLElement)) anchor = own;

    const rect = anchor.getBoundingClientRect();
    const left = rect.right - minimapWidthPx;

    let adjustedTop = rect.top;
    let adjustedHeight = rect.height;

    if (anchor.classList.contains("codeEditorContainer")) {
      const editorWrapper = anchor.querySelector(".codeContentWrapper");
      if (editorWrapper) {
        const editorRect = editorWrapper.getBoundingClientRect();
        adjustedTop = editorRect.top;
        adjustedHeight = editorRect.height;
      } else {
        const cs = window.getComputedStyle(anchor);
        const topPadding = parseFloat(cs.paddingTop) || 0;
        adjustedTop = rect.top + topPadding;
        adjustedHeight = rect.height - topPadding * 2;
      }
    }

    setMinimapRect({ top: adjustedTop, left, width: minimapWidthPx, height: adjustedHeight });
    setMinimapReady(true);
  }, [minimapWidthPx]);

  const convertDisplayToOriginalOffset = useCallback(
    (displayOffset) => {
      if (!displayCode || !viewCode) return displayOffset;
      
      const displayLines = displayCode.split("\n");
      let currentDisplayOffset = 0;
      
      for (let displayLineIndex = 0; displayLineIndex < displayLines.length; displayLineIndex++) {
        const displayLine = displayLines[displayLineIndex];
        const displayLineLength = displayLine.length;
        
        if (displayOffset <= currentDisplayOffset + displayLineLength) {
          const offsetInDisplayLine = displayOffset - currentDisplayOffset;
          const originalLineNumber = lineMapping.get(displayLineIndex + 1);
          
          if (originalLineNumber) {
            const originalLines = viewCode.split("\n");
            let tempOffset = 0;
            for (let i = 0; i < originalLineNumber - 1; i++) tempOffset += originalLines[i].length + 1;
            return tempOffset + Math.min(offsetInDisplayLine, originalLines[originalLineNumber - 1]?.length || 0);
          }
        }
        currentDisplayOffset += displayLineLength + 1;
      }
      return viewCode.length;
    },
    [displayCode, viewCode, lineMapping]
  );

  const convertOriginalToDisplayOffset = useCallback(
    (originalOffset, code = viewCode) => {
      if (!displayCode || !code) return originalOffset;
      
      const originalLines = code.split("\n");
      const displayLines = displayCode.split("\n");
      let currentOriginalOffset = 0;
      let originalLineNumber = 1;
      
      for (let i = 0; i < originalLines.length; i++) {
        const lineLength = originalLines[i].length;
        if (originalOffset <= currentOriginalOffset + lineLength) {
          originalLineNumber = i + 1;
          break;
        }
        currentOriginalOffset += lineLength + 1;
      }
      
      let displayLineNumber = null;
      for (const [displayLine, origLine] of lineMapping.entries()) {
        if (origLine === originalLineNumber) {
          displayLineNumber = displayLine;
          break;
        }
      }
      
      if (!displayLineNumber) {
        let nearestVisible = 1;
        for (const [displayLine, origLine] of lineMapping.entries()) {
          if (origLine > originalLineNumber) {
            nearestVisible = displayLine;
            break;
          }
          nearestVisible = displayLine;
        }
        let displayOffset = 0;
        for (let i = 0; i < nearestVisible - 1; i++) displayOffset += displayLines[i].length + 1;
        return displayOffset;
      }
      
      let displayOffset = 0;
      for (let i = 0; i < displayLineNumber - 1; i++) displayOffset += displayLines[i].length + 1;
      const offsetInOriginalLine = originalOffset - currentOriginalOffset;
      displayOffset += Math.min(offsetInOriginalLine, displayLines[displayLineNumber - 1].length);
      return displayOffset;
    },
    [displayCode, viewCode, lineMapping]
  );

  function createEditOperation(operationFn) {
    return new Promise((resolve) => {
      isEditingRef.current = true;
      const textEl = textareaRef.current;
      if (!textEl) return resolve();
      
      pushUndoSnapshot();
      const scrollSnap = { top: textEl.scrollTop, left: textEl.scrollLeft };
      
      operationFn(textEl, scrollSnap, resolve);
      setTimeout(() => (isEditingRef.current = false), 0);
    });
  }

  function doUndo() {
    return new Promise((resolve) => {
      if (!undoStackRef.current.length) return resolve();
      const textEl = textareaRef.current;
      if (!textEl) return resolve();
      
      const currentSel = saveSelection(textEl);
      redoStackRef.current.push({ code: viewCode, sel: currentSel });
      const prev = undoStackRef.current.pop();
      const scrollSnap = { top: textEl.scrollTop, left: textEl.scrollLeft };
      
      const currLines = viewCode.split("\n").length;
      const prevLines = (prev.code || "").split("\n").length;
      const linesDelta = prevLines - currLines;
      
      applyLineEditAdjustments(1, Number.MAX_SAFE_INTEGER, linesDelta, prev.code, true);
      updateContentViaParent(prev.code, prev.sel, scrollSnap);
      resolve();
    });
  }

  function doRedo() {
    return new Promise((resolve) => {
      if (!redoStackRef.current.length) return resolve();
      const textEl = textareaRef.current;
      if (!textEl) return resolve();
      
      const currentSel = saveSelection(textEl);
      undoStackRef.current.push({ code: viewCode, sel: currentSel });
      const next = redoStackRef.current.pop();
      const scrollSnap = { top: textEl.scrollTop, left: textEl.scrollLeft };
      
      const currLines = viewCode.split("\n").length;
      const nextLines = (next.code || "").split("\n").length;
      const linesDelta = nextLines - currLines;
      
      applyLineEditAdjustments(1, Number.MAX_SAFE_INTEGER, linesDelta, next.code, true);
      updateContentViaParent(next.code, next.sel, scrollSnap);
      resolve();
    });
  }

  function doPaste(selStart, selEnd) {
    return createEditOperation(async (textEl, scrollSnap, resolve) => {
      const clipText = await navigator.clipboard.readText();
      const originalStart = convertDisplayToOriginalOffset(selStart);
      const originalEnd = convertDisplayToOriginalOffset(selEnd);
      const original = viewCode;
      const removed = original.slice(originalStart, originalEnd);
      
      let updated = original.slice(0, originalStart) + original.slice(originalEnd);
      updated = updated.slice(0, originalStart) + clipText + updated.slice(originalStart);
      
      const newCaretOriginal = originalStart + clipText.length;
      const newCaretDisplay = convertOriginalToDisplayOffset(newCaretOriginal, updated);
      
      const startLC = offsetToLineCol(original, originalStart);
      const endLC = offsetToLineCol(original, originalEnd);
      const editStartLine = Math.min(startLC.line, endLC.line) + 1;
      const editEndLine = Math.max(startLC.line, endLC.line) + 1;
      const linesDelta = countNewlines(clipText) - countNewlines(removed);
      const overlaps = editOverlapWithRegions(editStartLine, editEndLine);
      
      applyLineEditAdjustments(editStartLine, editEndLine, linesDelta, updated, overlaps);
      updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
      resolve();
    });
  }

  function doCut(selStart, selEnd) {
    return createEditOperation(async (textEl, scrollSnap, resolve) => {
      if (selStart === selEnd) return resolve();
      
      const originalStart = convertDisplayToOriginalOffset(selStart);
      const originalEnd = convertDisplayToOriginalOffset(selEnd);
      const original = viewCode;
      const cutText = original.slice(originalStart, originalEnd);
      
      await navigator.clipboard.writeText(cutText);
      
      const updated = original.slice(0, originalStart) + original.slice(originalEnd);
      const newCaretDisplay = convertOriginalToDisplayOffset(originalStart, updated);
      
      const startLC = offsetToLineCol(original, originalStart);
      const endLC = offsetToLineCol(original, originalEnd);
      const editStartLine = Math.min(startLC.line, endLC.line) + 1;
      const editEndLine = Math.max(startLC.line, endLC.line) + 1;
      const linesDelta = -countNewlines(cutText);
      const overlaps = editOverlapWithRegions(editStartLine, editEndLine);
      
      applyLineEditAdjustments(editStartLine, editEndLine, linesDelta, updated, overlaps);
      updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
      resolve();
    });
  }

  function doCopy(selStart, selEnd) {
    return new Promise(async (resolve) => {
      if (selStart === selEnd) return resolve();
      
      const originalStart = convertDisplayToOriginalOffset(selStart);
      const originalEnd = convertDisplayToOriginalOffset(selEnd);
      const selectedText = viewCode.slice(originalStart, originalEnd);
      
      await navigator.clipboard.writeText(selectedText);
      resolve();
    });
  }

  function doSelectAll() {
    return new Promise((resolve) => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
      resolve();
    });
  }

  function doEnter() {
    return createEditOperation((textEl, scrollSnap, resolve) => {
      const selObj = saveSelection(textEl);
      if (!selObj) return resolve();
      
      const { start, end } = selObj;
      const originalStart = convertDisplayToOriginalOffset(start);
      const originalEnd = convertDisplayToOriginalOffset(end);
      const text = viewCode;
      const { line } = offsetToLineCol(text, originalStart);
      const lineStartOffset = lineColToOffset(text, line, 0);
      const lineFragment = text.slice(lineStartOffset, originalStart);
      const indentMatch = lineFragment.match(/^[ \t]+/);
      const indentation = indentMatch ? indentMatch[0] : "";
      const insertion = "\n" + indentation;
      
      const newText = text.slice(0, originalStart) + insertion + text.slice(originalEnd);
      const newPositionOriginal = originalStart + insertion.length;
      const newPositionDisplay = convertOriginalToDisplayOffset(newPositionOriginal, newText);
      
      const editStartLine = line + 1;
      const editEndLine = line + 1;
      const linesDelta = 1 - countNewlines(text.slice(originalStart, originalEnd));
      const overlaps = editOverlapWithRegions(editStartLine, editEndLine);
      
      applyLineEditAdjustments(editStartLine, editEndLine, linesDelta, newText, overlaps);
      updateContentViaParent(newText, { start: newPositionDisplay, end: newPositionDisplay }, scrollSnap);
      resolve();
    });
  }

  function doBackspace() {
    return createEditOperation((textEl, scrollSnap, resolve) => {
      const selObj = saveSelection(textareaRef.current);
      if (!selObj) return resolve();
      
      let { start, end } = selObj;
      const originalStart = convertDisplayToOriginalOffset(start);
      const originalEnd = convertDisplayToOriginalOffset(end);
      const original = viewCode;
      
      if (originalStart !== originalEnd) {
        const removed = original.slice(originalStart, originalEnd);
        const updated = original.slice(0, originalStart) + original.slice(originalEnd);
        const newDisplayStart = convertOriginalToDisplayOffset(originalStart, updated);
        
        const startLC = offsetToLineCol(original, originalStart);
        const endLC = offsetToLineCol(original, originalEnd);
        const editStartLine = Math.min(startLC.line, endLC.line) + 1;
        const editEndLine = Math.max(startLC.line, endLC.line) + 1;
        const linesDelta = -countNewlines(removed);
        const overlaps = editOverlapWithRegions(editStartLine, editEndLine);
        
        applyLineEditAdjustments(editStartLine, editEndLine, linesDelta, updated, overlaps);
        updateContentViaParent(updated, { start: newDisplayStart, end: newDisplayStart }, scrollSnap);
      } else if (originalStart > 0) {
        const removedChar = original[originalStart - 1];
        const updated = original.slice(0, originalStart - 1) + original.slice(originalStart);
        const newCaretOriginal = originalStart - 1;
        const newCaretDisplay = convertOriginalToDisplayOffset(newCaretOriginal, updated);
        
        const currLC = offsetToLineCol(original, originalStart);
        const editLine = currLC.line + 1;
        const linesDelta = removedChar === "\n" ? -1 : 0;
        const overlaps = editOverlapWithRegions(editLine, editLine);
        
        applyLineEditAdjustments(editLine, editLine, linesDelta, updated, overlaps);
        updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
      }
      resolve();
    });
  }

  function doDelete() {
    return createEditOperation((textEl, scrollSnap, resolve) => {
      const selObj = saveSelection(textEl);
      if (!selObj) return resolve();
      
      let { start, end } = selObj;
      const originalStart = convertDisplayToOriginalOffset(start);
      const originalEnd = convertDisplayToOriginalOffset(end);
      const original = viewCode;
      
      if (originalStart !== originalEnd) {
        const removed = original.slice(originalStart, originalEnd);
        const updated = original.slice(0, originalStart) + original.slice(originalEnd);
        const newCaretDisplay = convertOriginalToDisplayOffset(originalStart, updated);
        
        const startLC = offsetToLineCol(original, originalStart);
        const endLC = offsetToLineCol(original, originalEnd);
        const editStartLine = Math.min(startLC.line, endLC.line) + 1;
        const editEndLine = Math.max(startLC.line, endLC.line) + 1;
        const linesDelta = -countNewlines(removed);
        const overlaps = editOverlapWithRegions(editStartLine, editEndLine);
        
        applyLineEditAdjustments(editStartLine, editEndLine, linesDelta, updated, overlaps);
        updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
      } else if (originalStart < original.length) {
        const removedChar = original[originalStart];
        const updated = original.slice(0, originalStart) + original.slice(originalStart + 1);
        const newCaretDisplay = convertOriginalToDisplayOffset(originalStart, updated);
        
        const currLC = offsetToLineCol(original, originalStart);
        const editLine = currLC.line + 1;
        const linesDelta = removedChar === "\n" ? -1 : 0;
        const overlaps = editOverlapWithRegions(editLine, editLine);
        
        applyLineEditAdjustments(editLine, editLine, linesDelta, updated, overlaps);
        updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
      }
      resolve();
    });
  }

  function doTab(shiftKey) {
    return new Promise((resolve) => {
      const textEl = textareaRef.current;
      if (!textEl) return resolve();
      
      const selObj = saveSelection(textEl);
      if (!selObj) return resolve();
      
      pushUndoSnapshot();
      const scrollSnap = { top: textEl.scrollTop, left: textEl.scrollLeft };
      
      let { start, end } = selObj;
      if (start > end) [start, end] = [end, start];
      
      const originalStart = convertDisplayToOriginalOffset(start);
      const originalEnd = convertDisplayToOriginalOffset(end);
      const code = viewCode;
      
      if (originalStart === originalEnd) {
        if (!shiftKey) {
          const updated = code.slice(0, originalStart) + "    " + code.slice(originalStart);
          const newCaretOriginal = originalStart + 4;
          const newCaretDisplay = convertOriginalToDisplayOffset(newCaretOriginal, updated);
          previousCodeRef.current = updated;
          updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
        } else {
          let backtrack = 0;
          let idx = originalStart - 1;
          while (backtrack < 4 && idx >= 0 && code[idx] === " ") { 
            idx--; 
            backtrack++; 
          }
          if (backtrack > 0) {
            const updated = code.slice(0, originalStart - backtrack) + code.slice(originalStart);
            const newCaretOriginal = originalStart - backtrack;
            const newCaretDisplay = convertOriginalToDisplayOffset(newCaretOriginal, updated);
            previousCodeRef.current = updated;
            updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
          }
        }
      } else {
        const startLC = offsetToLineCol(code, originalStart);
        const endLC = offsetToLineCol(code, originalEnd);
        const startLine = Math.min(startLC.line, endLC.line);
        const endLine = Math.max(startLC.line, endLC.line);
        const lines = code.split("\n");
        
        for (let i = startLine; i <= endLine; i++) {
          if (!shiftKey) lines[i] = "    " + lines[i];
          else if (lines[i].startsWith("    ")) lines[i] = lines[i].slice(4);
          else if (lines[i].startsWith("\t")) lines[i] = lines[i].slice(1);
        }
        
        const updated = lines.join("\n");
        const shiftAmount = shiftKey ? -4 : 4;
        let newStartLC = { ...startLC };
        let newEndLC = { ...endLC };
        newStartLC.col = Math.max(0, newStartLC.col + shiftAmount);
        newEndLC.col = Math.max(0, newEndLC.col + shiftAmount);
        
        const newSelStartOriginal = lineColToOffset(updated, newStartLC.line, newStartLC.col);
        const newSelEndOriginal = lineColToOffset(updated, newEndLC.line, newEndLC.col);
        const newSelStartDisplay = convertOriginalToDisplayOffset(newSelStartOriginal, updated);
        const newSelEndDisplay = convertOriginalToDisplayOffset(newSelEndOriginal, updated);
        
        previousCodeRef.current = updated;
        updateContentViaParent(updated, { start: newSelStartDisplay, end: newSelEndDisplay }, scrollSnap);
      }
      resolve();
    });
  }

  function handleKeyDownInternal(e) {
    const selObj = saveSelection(textareaRef.current);
    if (!selObj) return handleKeyDown(e);
    
    let { start, end } = selObj;
    if (start > end) [start, end] = [end, start];
    
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const keyLower = e.key.toLowerCase();
    
    if (!keyBinds) return handleKeyDown(e);
    
    const keyActions = {
      [keyBinds.undo?.toLowerCase()]: () => doUndo(),
      [keyBinds.redo?.toLowerCase()]: () => doRedo(),
      [keyBinds.paste?.toLowerCase()]: () => doPaste(start, end),
      [keyBinds.cut?.toLowerCase()]: () => doCut(start, end),
      [keyBinds.copy?.toLowerCase()]: () => doCopy(start, end),
      [keyBinds.selectAll?.toLowerCase()]: () => doSelectAll(),
    };
    
    const specialKeys = {
      "Enter": () => doEnter(),
      "Backspace": () => doBackspace(),
      "Delete": () => doDelete(),
      "Tab": () => doTab(e.shiftKey),
    };
    
    if (isCtrlOrCmd && keyActions[keyLower]) {
      e.preventDefault();
      queueCommand(keyActions[keyLower]);
    } else if (specialKeys[e.key]) {
      e.preventDefault();
      queueCommand(specialKeys[e.key]);
    } else {
      handleKeyDown(e);
    }
  }

  const handleTextAreaChange = useCallback(
    (event) => {
      if (!isInternalOperationRef.current) {
        isEditingRef.current = true;
        const newDisplayValue = event.target.value || "";
        handleInput({ target: { value: newDisplayValue } });
        previousCodeRef.current = newDisplayValue;
        setTimeout(() => { isEditingRef.current = false; }, 0);
      }
    },
    [handleInput]
  );

  function handleContextMenu(e) {
    e.preventDefault();
    const menuWidth = 120;
    const menuHeight = 180;
    let x = e.clientX;
    let y = e.clientY;
    
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight;
    
    setContextMenuState({ visible: true, x, y });
  }

  function ensureVisible(lineNumber) {
    if (!containerRef.current) return;
    
    let displayLineNum = null;
    for (const [displayLine, originalLine] of lineMapping.entries()) {
      if (originalLine === lineNumber) { 
        displayLineNum = displayLine; 
        break; 
      }
    }
    
    if (displayLineNum) {
      const lineEl = containerRef.current.querySelector(`[data-line-number="${displayLineNum}"]`);
      if (lineEl) lineEl.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function handleKeyUp() {}

  const contextMenuActions = {
    copy: () => {
      const sel = saveSelection(textareaRef.current);
      if (!sel) return;
      
      let { start, end } = sel;
      if (start > end) [start, end] = [end, start];
      
      if (start !== end) {
        const originalStart = convertDisplayToOriginalOffset(start);
        const originalEnd = convertDisplayToOriginalOffset(end);
        const selectedText = viewCode.slice(originalStart, originalEnd);
        navigator.clipboard.writeText(selectedText);
      } else {
        navigator.clipboard.writeText(viewCode);
      }
    },
    paste: () => {
      const selObj = saveSelection(textareaRef.current);
      if (!selObj) return;
      
      let { start, end } = selObj;
      if (start > end) [start, end] = [end, start];
      
      navigator.clipboard.readText().then((clipText) => {
        queueCommand(async () => {
          pushUndoSnapshot();
          const textEl = textareaRef.current;
          if (!textEl) return;
          
          const scrollSnap = { top: textEl.scrollTop, left: textEl.scrollLeft };
          const originalStart = convertDisplayToOriginalOffset(start);
          const originalEnd = convertDisplayToOriginalOffset(end);
          const original = viewCode;
          const removed = original.slice(originalStart, originalEnd);
          
          let updated = original.slice(0, originalStart) + original.slice(originalEnd);
          updated = updated.slice(0, originalStart) + clipText + updated.slice(originalStart);
          
          const newCaretOriginal = originalStart + clipText.length;
          const newCaretDisplay = convertOriginalToDisplayOffset(newCaretOriginal, updated);
          
          const startLC = offsetToLineCol(original, originalStart);
          const endLC = offsetToLineCol(original, originalEnd);
          const editStartLine = Math.min(startLC.line, endLC.line) + 1;
          const editEndLine = Math.max(startLC.line, endLC.line) + 1;
          const linesDelta = countNewlines(clipText) - countNewlines(removed);
          const overlaps = editOverlapWithRegions(editStartLine, editEndLine);
          
          applyLineEditAdjustments(editStartLine, editEndLine, linesDelta, updated, overlaps);
          updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
        });
      });
    },
    cut: () => {
      const selObj = saveSelection(textareaRef.current);
      if (!selObj) return;
      
      let { start, end } = selObj;
      if (start !== end) queueCommand(() => doCut(start, end));
    },
    undo: () => queueCommand(() => doUndo()),
    redo: () => queueCommand(() => doRedo()),
  };

  useLayoutEffect(() => {
    measureGutter();
  }, [measureGutter]);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      if (pendingScrollRef.current) {
        const { top, left } = pendingScrollRef.current;
        textareaRef.current.scrollTop = top;
        textareaRef.current.scrollLeft = left;
        pendingScrollRef.current = null;
      }
      if (lastSavedSelRef.current) {
        restoreSelection(textareaRef.current, lastSavedSelRef.current);
        lastSavedSelRef.current = null;
      }
    }
    if (isInternalOperationRef.current) isInternalOperationRef.current = false;
  }, [displayCode]);

  useEffect(() => {
    if (isFoldingRef.current) return;
    if (foldableRegions.length === 0 && foldedRegions.size > 0) setFoldedRegions(new Set());
  }, [foldableRegions, foldedRegions]);

  useEffect(() => {
    const hideContextMenu = () => setContextMenuState({ visible: false, x: 0, y: 0 });
    window.addEventListener("click", hideContextMenu);
    return () => window.removeEventListener("click", hideContextMenu);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    
    function handleCopyOrCut(e) {
      e.preventDefault();
      const sel = saveSelection(el);
      if (!sel) return;
      
      let { start, end } = sel;
      if (start > end) [start, end] = [end, start];
      
      const originalStart = convertDisplayToOriginalOffset(start);
      const originalEnd = convertDisplayToOriginalOffset(end);
      const selectedText = viewCode.slice(originalStart, originalEnd);
      
      if (selectedText.length > 0) {
        e.clipboardData.setData("text/plain", selectedText);
        if (e.type === "cut") queueCommand(() => doCut(start, end));
      }
    }
    
    el.addEventListener("copy", handleCopyOrCut);
    el.addEventListener("cut", handleCopyOrCut);
    
    return () => {
      el.removeEventListener("copy", handleCopyOrCut);
      el.removeEventListener("cut", handleCopyOrCut);
    };
  }, [viewCode, displayCode, convertDisplayToOriginalOffset]);

  useEffect(() => {
    const ro = new ResizeObserver(() => measureGutter());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measureGutter);
    
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureGutter);
    };
  }, [measureGutter]);

  useEffect(() => {
    const host = document.createElement("div");
    host.className = "minimapPortalHost";
    document.body.appendChild(host);
    setMinimapHost(host);
    
    return () => { 
      if (document.body.contains(host)) {
        document.body.removeChild(host); 
      }
    };
  }, []);

  useEffect(() => {
    updateMinimapRect();
    const ro = new ResizeObserver(() => {
      updateMinimapRect();
      requestAnimationFrame(() => {
        syncMinimapViewport();
        syncMinimapContent();
      });
    });
    
    if (containerRef.current) ro.observe(containerRef.current);
    
    const onWin = () => {
      updateMinimapRect();
      requestAnimationFrame(() => {
        syncMinimapViewport();
        syncMinimapContent();
      });
    };
    
    window.addEventListener("resize", onWin, { passive: true });
    window.addEventListener("scroll", onWin, { passive: true });
    
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin);
    };
  }, [updateMinimapRect, syncMinimapViewport, syncMinimapContent]);

  useEffect(() => {
    if (!minimapReady) return;
    renderMinimapContent();
  }, [minimapReady, renderMinimapContent]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleAnyScroll, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleAnyScroll);
      }
    };
  }, [handleAnyScroll]);

  useEffect(() => {
    if (!highlightRef.current) return;
    
    const splitted = displayHighlightedCode.split(/\r\n|\r|\n/);
    const highlightLines = splitted.map((line) => (line.trim() === "" ? "\u200B" : line));
    let finalHTML = "";
    
    for (let i = 0; i < highlightLines.length; i++) {
      if (highlightLines[i] === "\u200B") finalHTML += `<span class="hlLine">\u200B<br></span>`;
      else finalHTML += `<span class="hlLine">${highlightLines[i]}\n</span>`;
    }
    
    highlightRef.current.innerHTML = finalHTML;
  }, [displayHighlightedCode]);

  const splitted = displayHighlightedCode.split(/\r\n|\r|\n/);
  const lines = splitted.map((l) => (l === "" ? "\u200B" : l));

  const lineElements = lines.map((lineHtml, i) => {
    const displayLineNumber = i + 1;
    const originalLineNumber = lineMapping.get(displayLineNumber);
    const hasError = lintErrors.some((e) => e.line === originalLineNumber);
    const canFold = originalLineNumber ? canFoldLine(originalLineNumber) : false;
    const isFolded = originalLineNumber ? isLineFolded(originalLineNumber) : false;
    const showFoldIndicator = !!(originalLineNumber && isFolded);
    const showErrorIndicator = !!hasError;
    const showBreakpoint = originalLineNumber ? hasBreakpoint(originalLineNumber) : false;
    
    return (
      <div
        key={`line-${displayLineNumber}-${editorId}`}
        data-line-number={displayLineNumber}
        data-original-line={originalLineNumber}
        className={`codeLine${hasError ? " errorHighlight" : ""}${isFolded ? " foldedLine" : ""}`}
        style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` }}
      >
        {isFolded && <div className="foldedGuide" style={{ height: `${lineHeight}px` }} />}
        <div 
          className={`lineNumberMarginWrapper${showBreakpoint ? " hasBreakpoint" : ""}`}
          onClick={() => originalLineNumber && toggleBreakpoint(originalLineNumber)}
          style={{ 
            cursor: originalLineNumber ? "pointer" : "default",
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeight}px`,
            display: "flex",
            alignItems: "center",
            gap: `${Math.max(2, fontSize * 0.15)}px`,
            paddingLeft: `${Math.max(2, fontSize * 0.1)}px`,
            paddingRight: `${Math.max(2, fontSize * 0.1)}px`
          }}
        >
          <span style={{ 
            fontSize: `${fontSize}px`,
            minWidth: `${Math.max(20, fontSize * 1.5)}px`,
            textAlign: "right"
          }}>
            {originalLineNumber || displayLineNumber}
          </span>
          {canFold ? (
            <span
              className="foldChevron"
              onClick={(e) => {
                e.stopPropagation();
                originalLineNumber && toggleFold(originalLineNumber);
              }}
              aria-label={isFolded ? "Expand" : "Collapse"}
              title={isFolded ? "Expand" : "Collapse"}
              style={{ fontSize: `${Math.max(10, fontSize * 0.9)}px` }}
            >
              <FontAwesomeIcon 
                icon={isFolded ? faChevronRight : faChevronDown} 
                style={{ fontSize: `${Math.max(10, fontSize * 0.9)}px` }}
              />
            </span>
          ) : (
            <span className="chevronSpacer" style={{ fontSize: `${fontSize}px` }} />
          )}
          <span className="indicatorCluster" style={{ fontSize: `${Math.max(8, fontSize * 0.6)}px` }}>
            {(showErrorIndicator && !showFoldIndicator) && <span title="Lint error" aria-label="Lint error" className="errorIndicatorDot" />}
            {showFoldIndicator && <span title="Folded block" aria-label="Folded block" className="foldIndicatorDot" />}
            
          </span>
        </div>
        <div 
          className="lineEditorWrapper" 
          dangerouslySetInnerHTML={{ __html: lineHtml + "\n" }}
          style={{ paddingLeft: `${fontSize * 0.5}px` }}
        />
      </div>
    );
  });

  useImperativeHandle(ref, () => ({
    selectAll() { doSelectAll(); },
    pasteAtCursor(text) {
      const selObj = saveSelection(textareaRef.current);
      if (!selObj) return;
      pushUndoSnapshot();
      queueCommand(async () => {
        const textEl = textareaRef.current;
        if (!textEl) return;
        const scrollSnap = { top: textEl.scrollTop, left: textEl.scrollLeft };
        let { start, end } = selObj;
        if (start > end) [start, end] = [end, start];
        const originalStart = convertDisplayToOriginalOffset(start);
        const originalEnd = convertDisplayToOriginalOffset(end);
        const original = viewCode;
        const removed = original.slice(originalStart, originalEnd);
        let updated = original.slice(0, originalStart) + original.slice(originalEnd);
        updated = updated.slice(0, originalStart) + text + updated.slice(originalStart);
        const newCaretOriginal = originalStart + text.length;
        const newCaretDisplay = convertOriginalToDisplayOffset(newCaretOriginal, updated);
        const startLC = offsetToLineCol(original, originalStart);
        const endLC = offsetToLineCol(original, originalEnd);
        const editStartLine = Math.min(startLC.line, endLC.line) + 1;
        const editEndLine = Math.max(startLC.line, endLC.line) + 1;
        const linesDelta = countNewlines(text) - countNewlines(removed);
        const overlaps = editOverlapWithRegions(editStartLine, editEndLine);
        applyLineEditAdjustments(editStartLine, editEndLine, linesDelta, updated, overlaps);
        updateContentViaParent(updated, { start: newCaretDisplay, end: newCaretDisplay }, scrollSnap);
      });
    },
    getCodeContent() { return viewCode; },
    jumpToLine(lineNum) { ensureVisible(lineNum); },
    ensureVisible(lineNum) { ensureVisible(lineNum); },
    doUndo, 
    doRedo, 
    doPasteAtCursor() {
      const sel = saveSelection(textareaRef.current);
      if (!sel) return;
      queueCommand(() => doPaste(sel.start, sel.end));
    },
    doCutSelection() {
      const sel = saveSelection(textareaRef.current);
      if (!sel) return;
      let { start, end } = sel;
      if (start !== end) queueCommand(() => doCut(start, end));
    },
    doCopySelection() {
      const sel = saveSelection(textareaRef.current);
      if (!sel) return;
      let { start, end } = sel;
      if (start < end) queueCommand(() => doCopy(start, end));
    },
    doSelectAll,
    toggleFold,
    foldAll() {
      const allFoldableLines = foldableRegions.map((region) => region.startLine);
      setFoldedRegions(new Set(allFoldableLines));
    },
    unfoldAll() { setFoldedRegions(new Set()); },
    toggleBreakpoint(lineNum) { toggleBreakpoint(lineNum); },
    addBreakpoint(lineNum) { 
      setBreakpoints(prev => new Set([...prev, lineNum])); 
    },
    removeBreakpoint(lineNum) { 
      setBreakpoints(prev => {
        const newSet = new Set(prev);
        newSet.delete(lineNum);
        return newSet;
      }); 
    },
    clearAllBreakpoints() { setBreakpoints(new Set()); },
    getBreakpoints() { return Array.from(breakpoints); },
    hasBreakpoint(lineNum) { return breakpoints.has(lineNum); },
  }));

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onScroll={handleAnyScroll}
        className="scriptEditorContainer"
        style={{ "--gutter": `${gutterPx}px`, "--minimapW": `${minimapWidthPx}px` }}
      >
        <div className="scriptEditorSubContainer">
          {lineElements}
          <pre
            ref={highlightRef}
            style={{ 
              fontSize: `${fontSize}px`, 
              lineHeight: `${lineHeight}px`,
              paddingLeft: `${fontSize * 0.5}px`
            }}
          />
          <textarea
            ref={textareaRef}
            value={displayCode || ""}
            onChange={handleTextAreaChange}
            onKeyDown={handleKeyDownInternal}
            onKeyUp={handleKeyUp}
            spellCheck={false}
            wrap="off"
            style={{ 
              fontSize: `${fontSize}px`, 
              lineHeight: `${lineHeight}px`,
              paddingLeft: `${fontSize * 0.5}px`
            }}
            disabled={disableFocus}
          />
        </div>
        {contextMenuState.visible && (
          <ul
            className="dinolabsContextMenu"
            style={{ top: contextMenuState.y, left: contextMenuState.x }}
          >
            {Object.entries({
              Copy: contextMenuActions.copy,
              Paste: contextMenuActions.paste,
              Cut: contextMenuActions.cut,
              Undo: contextMenuActions.undo,
              Redo: contextMenuActions.redo,
            }).map(([label, action]) => (
              <li
                key={label}
                onClick={(e) => {
                  e.stopPropagation();
                  action();
                  setContextMenuState({ visible: false, x: 0, y: 0 });
                }}
                className="dinolabsContextMenuItem"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {minimapHost &&
        createPortal(
          <div
            className="minimapContainer"
            ref={minimapWrapperRef}
            style={{
              position: "fixed",
              top: `${minimapRect.top}px`,
              left: `${minimapRect.left}px`,
              width: `${minimapRect.width}px`,
              height: `${minimapRect.height}px`,
            }}
            onMouseDown={(e) => { isMinimapDraggingRef.current = true; minimapDragToScroll(e); }}
            onMouseMove={(e) => { if (isMinimapDraggingRef.current) minimapDragToScroll(e); }}
            onMouseUp={() => { isMinimapDraggingRef.current = false; }}
            onMouseLeave={() => { isMinimapDraggingRef.current = false; }}
          >
            <div className="minimapContent" ref={minimapContentRef} />
            <div className="minimapViewport" ref={minimapViewportRef} />
          </div>,
          minimapHost
        )}
    </>
  );
});

export default DinoLabsMirror;