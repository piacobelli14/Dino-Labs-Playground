import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import {
  faA,
  faArrowDown,
  faArrowUp,
  faCopy,
  faExclamationTriangle,
  faList,
  faMagnifyingGlass,
  faMagnifyingGlassPlus,
  faSquare,
  faTableColumns,
  faXmark,
  faCode,
  faXmarkSquare,
  faTerminal,
  faTrash,
  faSquareCheck,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DinoLabsMirror from "./DinoLabsMirror";
import { syntaxHighlight, escapeRegExp } from "./DinoLabsParser";
import useAuth from "../../UseAuth.jsx";
import { lintPython } from "./DinoLabsLint/DinoLabsLintPython.jsx";
import { lintTypeScript } from "./DinoLabsLint/DinoLabsLintTypeScript.jsx";
import { lintJavaScript } from "./DinoLabsLint/DinoLabsLintJavaScript.jsx";
import { lintBash } from "./DinoLabsLint/DinoLabsLintBash.jsx";
import { lintShell } from "./DinoLabsLint/DinoLabsLintShell.jsx";
import { lintC } from "./DinoLabsLint/DinoLabsLintC.jsx";
import { lintCSharp } from "./DinoLabsLint/DinoLabsLintCSharp.jsx";
import { lintCPP } from "./DinoLabsLint/DinoLabsLintCPP.jsx";
import { lintSwift } from "./DinoLabsLint/DinoLabsLintSwift.jsx";
import { lintPHP } from "./DinoLabsLint/DinoLabsLintPHP.jsx";
import { lintSQL } from "./DinoLabsLint/DinoLabsLintSQL.jsx";
import { lintMonkeyC } from "./DinoLabsLint/DinoLabsLintMonkeyC.jsx";
import { lintRust } from "./DinoLabsLint/DinoLabsLintRust.jsx";
import { lintAssembly } from "./DinoLabsLint/DinoLabsLintAssembly.jsx";
import { lintJSON } from "./DinoLabsLint/DinoLabsLintJSON.jsx";
import { lintCSS } from "./DinoLabsLint/DinoLabsLintCSS.jsx";
import { lintHTML } from "./DinoLabsLint/DinoLabsLintHTML.jsx";
import { lintXML } from "./DinoLabsLint/DinoLabsLintXML.jsx";

const languageImageMap = {
  Javascript: "javascript.svg",
  Typescript: "typescript.svg",
  HTML: "html.svg",
  CSS: "css.svg",
  JSON: "json.svg",
  XML: "xml.svg",
  Python: "python.svg",
  PHP: "php.svg",
  Swift: "swift.svg",
  C: "c.svg",
  "C++": "c++.svg",
  "C#": "csharp.svg",
  "Monkey C": "monkeyc.svg",
  Rust: "rust.svg",
  Bash: "bash.svg",
  Shell: "shell.svg",
  SQL: "sql.svg",
  Dockerfile: "dockerfileExtension.svg",
  Makefile: "makefileExtension.svg",
  Assembly: "assembly.svg",
};

let editorIdCounter = 0;
const generateEditorId = () => {
  editorIdCounter += 1;
  return `dinolabs-editor-${editorIdCounter}`;
};

const SUPPORTED_LANGUAGES = [
  "python", "typescript", "javascript", "react", "express", "node",
  "bash", "shell", "c", "c#", "c++", "swift", "php", "sql",
  "monkey c", "rust", "assembly", "json", "css", "html", "xml"
];

const DinoLabsMarkdown = forwardRef((props, ref) => {
  const {
    fileContent,
    detectedLanguage,
    forceOpen,
    onForceOpen,
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    searchPositions,
    setSearchPositions,
    currentSearchIndex,
    setCurrentSearchIndex,
    onSplit,
    disableSplit,
    paneIndex,
    tabId,
    isSearchOpen,
    isReplaceOpen,
    setTabSearchOpen,
    setTabReplaceOpen,
    onEdit,
    onSave,
    fileHandle,
    isGlobalSearchActive,
    keyBinds,
    colorTheme,
    zoomLevel = 1.0, 
  } = props;

  const { token, userID, organizationID } = useAuth();

  const scrollContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceTimer = useRef(null);
  const lintDebounceTimer = useRef(null);
  const syntaxDebounceTimer = useRef(null);
  const mirrorRef = useRef(null);
  const editorId = useRef(generateEditorId()).current;
  const isInitializedRef = useRef(false);
  const containerRef = useRef(null);
  const isResizingRef = useRef(false);

  const [editorContent, setEditorContent] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState(detectedLanguage || "Unknown");
  
  const [copySuccess, setCopySuccess] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  
  const [isCaseSensitiveSearch, setIsCaseSensitiveSearch] = useState(true);
  const [isSearchOpenInternal, setIsSearchOpenInternal] = useState(isSearchOpen || false);
  const [isReplaceOpenInternal, setIsReplaceOpenInternal] = useState(isReplaceOpen || false);
  const [isSearchBoxFocused, setIsSearchBoxFocused] = useState(false);
  
  const [lineHeight, setLineHeight] = useState(24);
  const [fontSize, setFontSize] = useState(13);
  const [screenSize, setScreenSize] = useState(window.innerWidth);
  
  const [lintErrors, setLintErrors] = useState([]);
  const [mutedLines, setMutedLines] = useState([]);
  
  const [editorGrow, setEditorGrow] = useState(70);
  const [consoleGrow, setConsoleGrow] = useState(30);

  const [highlightedCodeCache, setHighlightedCodeCache] = useState("");

  const dividerHeight = 10;
  const minHeight = 50;

  const visibleLintErrors = useMemo(() => {
    return lintErrors.filter((error) => !mutedLines.includes(error.line));
  }, [lintErrors, mutedLines]);

  const highlightedCode = useMemo(() => {
    if (currentLanguage === "Unknown") {
      return editorContent
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    
    if (syntaxDebounceTimer.current) {
      return highlightedCodeCache || editorContent
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    
    return syntaxHighlight(
      editorContent,
      currentLanguage.toLowerCase(),
      searchTerm,
      isCaseSensitiveSearch
    );
  }, [editorContent, currentLanguage, searchTerm, isCaseSensitiveSearch, highlightedCodeCache]);

  const isLanguageSupported = useMemo(() => {
    const lang = currentLanguage.toLowerCase();
    return SUPPORTED_LANGUAGES.includes(lang);
  }, [currentLanguage]);

  const isSupported = currentLanguage !== "Unknown" || forceOpen;

  const zoomedFontSize = useMemo(() => {
    return Math.round(fontSize * zoomLevel);
  }, [fontSize, zoomLevel]);

  const zoomedLineHeight = useMemo(() => {
    return Math.round(lineHeight * zoomLevel);
  }, [lineHeight, zoomLevel]);

  const handleContentChange = useCallback((newContent) => {
    setEditorContent(newContent);
    onEdit(paneIndex, tabId, { fullCode: editorContent }, { fullCode: newContent });
  }, [paneIndex, tabId, onEdit, editorContent]);

  const handleInput = useCallback((event) => {
    const newValue = event.target.value || "";
    handleContentChange(newValue);
  }, [handleContentChange]);

  const performSearch = useCallback(() => {
    if (!searchTerm) {
      setSearchPositions([]);
      setCurrentSearchIndex(-1);
      return;
    }
    const flags = isCaseSensitiveSearch ? "" : "i";
    const safeTerm = escapeRegExp(searchTerm);

    try {
      const re = new RegExp(safeTerm, flags);
      const lines = editorContent.split("\n");
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          matches.push({ lineNumber: i + 1 });
        }
      }
      setSearchPositions(matches);
      setCurrentSearchIndex(matches.length > 0 ? 0 : -1);
    } catch {
      setSearchPositions([]);
      setCurrentSearchIndex(-1);
    }
  }, [searchTerm, isCaseSensitiveSearch, editorContent, setSearchPositions, setCurrentSearchIndex]);

  const performNextSearch = () => {
    if (searchPositions.length === 0) return;
    let newIndex = currentSearchIndex + 1;
    if (newIndex >= searchPositions.length) {
      newIndex = 0;
    }
    setCurrentSearchIndex(newIndex);
  };

  const performPreviousSearch = () => {
    if (searchPositions.length === 0) return;
    let newIndex = currentSearchIndex - 1;
    if (newIndex < 0) {
      newIndex = searchPositions.length - 1;
    }
    setCurrentSearchIndex(newIndex);
  };

  const performReplace = () => {
    if (currentSearchIndex === -1 || searchPositions.length === 0) return;
    const currentMatch = searchPositions[currentSearchIndex];
    const lineNumber = currentMatch.lineNumber;
    const lines = editorContent.split("\n");
    const lineIndex = lineNumber - 1;

    const regexFlags = isCaseSensitiveSearch ? "" : "i";
    const regex = new RegExp(escapeRegExp(searchTerm), regexFlags);

    lines[lineIndex] = lines[lineIndex].replace(regex, replaceTerm ?? "");
    const updatedCode = lines.join("\n");

    handleContentChange(updatedCode);

    const newPositions = [...searchPositions];
    newPositions.splice(currentSearchIndex, 1);

    let newIdx = currentSearchIndex;
    if (newIdx >= newPositions.length) {
      newIdx = newPositions.length - 1;
    }
    setSearchPositions(newPositions);
    setCurrentSearchIndex(newIdx);
  };

  const performReplaceAll = () => {
    if (searchPositions.length === 0) return;
    const flags = isCaseSensitiveSearch ? "g" : "gi";
    const regex = new RegExp(escapeRegExp(searchTerm), flags);
    const updatedCode = editorContent.replace(regex, replaceTerm ?? "");

    handleContentChange(updatedCode);
    setSearchPositions([]);
    setCurrentSearchIndex(-1);
  };

  const openSearch = () => {
    setIsSearchOpenInternal(true);
    setTabSearchOpen(true);
    setIsReplaceOpenInternal(false);
    setTabReplaceOpen(false);

    if (searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 0);
    }
  };

  const closeSearch = () => {
    setIsSearchOpenInternal(false);
    setTabSearchOpen(false);
    setIsReplaceOpenInternal(false);
    setTabReplaceOpen(false);
    setSearchTerm("");
    setReplaceTerm("");
    setSearchPositions([]);
    setCurrentSearchIndex(-1);
    setIsSearchBoxFocused(false);
    setTimeout(() => {
      mirrorRef.current?.focusEditor();
    }, 0);
  };

  const openReplace = () => {
    setIsReplaceOpenInternal(true);
    setTabReplaceOpen(true);
    setIsSearchOpenInternal(false);
    setTabSearchOpen(false);
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let success = false;
    try {
      success = document.execCommand("copy");
    } catch (error) {}
    document.body.removeChild(textArea);
    return success;
  };

  const copyToClipboard = async () => {
    const text = editorContent;
    let success = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        success = true;
      } else {
        success = fallbackCopyToClipboard(text);
      }
    } catch (error) {
    } finally {
      if (success) {
        setCopySuccess("Copied to Clipboard!");
        setIsCopied(true);
      } else {
        setCopySuccess("Failed to copy!");
      }
      setTimeout(() => {
        setCopySuccess("");
        setIsCopied(false);
      }, 2000);
    }
  };

  const saveFile = async () => {
    if (!fileHandle) {
      setSaveStatus("No file handle available.");
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }
    try {
      setSaveStatus("Saving...");
      const writable = await fileHandle.createWritable();
      await writable.write(editorContent);
      await writable.close();

      await fetch(`${import.meta.env.VITE_API_AUTH_URL}/save-file-edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationID,
          userID,
          language: currentLanguage,
          script_name: fileHandle.name || "unknown_script_name",
          timestamp: new Date().toISOString(),
        }),
      });

      if (onSave) {
        onSave(paneIndex, tabId, editorContent);
      }
      setSaveStatus("Save successful!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch {
      setSaveStatus("Save failed!");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const handleKeyDown = (event) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const modifier = isMac ? event.metaKey : event.ctrlKey;
    if (modifier && keyBinds) {
      const key = event.key.toLowerCase();
      if (key === keyBinds.save?.toLowerCase()) {
        event.preventDefault();
        saveFile();
      } else if (key === keyBinds.search?.toLowerCase()) {
        event.preventDefault();
        openSearch();
      }
    }
  };

  const clickEnterSearch = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performNextSearch();
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizingRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const totalHeight = containerRect.height;
    const offsetTop = containerRect.top;
    let newEditorHeight = e.clientY - offsetTop;
    const effectiveTotal = totalHeight - dividerHeight;
    if (newEditorHeight < minHeight) newEditorHeight = minHeight;
    if (newEditorHeight > effectiveTotal - minHeight) newEditorHeight = effectiveTotal - minHeight;
    const newGrow = (newEditorHeight / effectiveTotal) * 100;
    setEditorGrow(newGrow);
    setConsoleGrow(100 - newGrow);
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleTouchMove = (e) => {
    if (!isResizingRef.current || !containerRef.current) return;
    const touch = e.touches[0];
    const containerRect = containerRef.current.getBoundingClientRect();
    const totalHeight = containerRect.height;
    const offsetTop = containerRect.top;
    let newEditorHeight = touch.clientY - offsetTop;
    const effectiveTotal = totalHeight - dividerHeight;
    if (newEditorHeight < minHeight) newEditorHeight = minHeight;
    if (newEditorHeight > effectiveTotal - minHeight) newEditorHeight = effectiveTotal - minHeight;
    const newGrow = (newEditorHeight / effectiveTotal) * 100;
    setEditorGrow(newGrow);
    setConsoleGrow(100 - newGrow);
  };

  const handleTouchEnd = () => {
    isResizingRef.current = false;
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  };

  const getVirtualizedItemHeight = (size) => {
    if (size < 499) {
      return { lineHeight: 18, fontSize: 12 };
    } else if (size >= 500 && size <= 699) {
      return { lineHeight: 20, fontSize: 12 };
    } else if (size >= 700 && size <= 1299) {
      return { lineHeight: 24, fontSize: 13 };
    } else if (size >= 1300 && size <= 1699) {
      return { lineHeight: 28, fontSize: 15 };
    } else if (size >= 1700 && size <= 2199) {
      return { lineHeight: 35, fontSize: 18 };
    } else if (size >= 2200 && size <= 2599) {
      return { lineHeight: 45, fontSize: 22 };
    } else if (size >= 2600 && size <= 3899) {
      return { lineHeight: 70, fontSize: 30 };
    } else if (size >= 3900 && size <= 5299) {
      return { lineHeight: 80, fontSize: 35 };
    } else {
      return { lineHeight: 18, fontSize: 12 };
    }
  };

  const getLintErrors = (lang, content) => {
    const language = lang.toLowerCase();
    const linters = {
      python: lintPython,
      typescript: lintTypeScript,
      bash: lintBash,
      shell: lintShell,
      c: lintC,
      "c#": lintCSharp,
      "c++": lintCPP,
      swift: lintSwift,
      php: lintPHP,
      sql: lintSQL,
      "monkey c": lintMonkeyC,
      rust: lintRust,
      assembly: lintAssembly,
      json: lintJSON,
      css: lintCSS,
      html: lintHTML,
      xml: lintXML,
    };

    if (["javascript", "react", "express", "node"].includes(language)) {
      return lintJavaScript(content);
    }

    const linter = linters[language];
    return linter ? linter(content) : [];
  };

  useEffect(() => {
    if (fileContent !== undefined && fileContent !== null) {
      const safeContent = String(fileContent || "");
      if (!isInitializedRef.current || safeContent !== editorContent) {
        setEditorContent(safeContent);
        setSearchPositions([]);
        setCurrentSearchIndex(-1);
        isInitializedRef.current = true;
      }
    } else if (!isInitializedRef.current) {
      setEditorContent("");
      isInitializedRef.current = true;
    }
  }, [fileContent, forceOpen]);

  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const { lineHeight, fontSize } = getVirtualizedItemHeight(screenSize);
    setLineHeight(lineHeight);
    setFontSize(fontSize);
  }, [screenSize]);

  useEffect(() => {
    const themeLinkId = "mirror-theme-css";
    let link = document.getElementById(themeLinkId);
    if (!link) {
      link = document.createElement("link");
      link.id = themeLinkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    let themeFile;
    if (colorTheme === "DarkTheme") {
      themeFile = "DarkTheme.css";
    } else if (colorTheme === "LightTheme") {
      themeFile = "LightTheme.css";
    } else {
      themeFile = "DefaultTheme.css";
    }
    link.href = `../styles/mainStyles/MirrorThemes/${themeFile}`;
  }, [colorTheme]);

  useEffect(() => {
    if (lintDebounceTimer.current) {
      clearTimeout(lintDebounceTimer.current);
    }
    
    lintDebounceTimer.current = setTimeout(() => {
      const errors = getLintErrors(currentLanguage, editorContent);
      setLintErrors(errors);
    }, 500); 

    return () => {
      if (lintDebounceTimer.current) {
        clearTimeout(lintDebounceTimer.current);
      }
    };
  }, [editorContent, currentLanguage]);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [editorContent, searchTerm, isCaseSensitiveSearch, performSearch]);

  useEffect(() => {
    if (
      isSearchBoxFocused &&
      currentSearchIndex >= 0 &&
      currentSearchIndex < searchPositions.length
    ) {
      const match = searchPositions[currentSearchIndex];
      mirrorRef.current?.jumpToLine(match.lineNumber);
    }
  }, [currentSearchIndex, searchPositions, isSearchBoxFocused]);

  useEffect(() => {
    setIsSearchOpenInternal(isSearchOpen);
  }, [isSearchOpen]);

  useEffect(() => {
    setIsReplaceOpenInternal(isReplaceOpen);
  }, [isReplaceOpen]);

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (
        isSearchBoxFocused &&
        !isGlobalSearchActive &&
        (e.ctrlKey || e.metaKey) &&
        keyBinds
      ) {
        const keyLower = e.key.toLowerCase();
        if (keyLower === keyBinds.undo?.toLowerCase()) {
          e.preventDefault();
          mirrorRef.current?.doUndo();
        } else if (keyLower === keyBinds.redo?.toLowerCase()) {
          e.preventDefault();
          mirrorRef.current?.doRedo();
        } else if (keyLower === keyBinds.paste?.toLowerCase()) {
          e.preventDefault();
          mirrorRef.current?.doPasteAtCursor();
        } else if (keyLower === keyBinds.cut?.toLowerCase()) {
          e.preventDefault();
          mirrorRef.current?.doCutSelection();
        } else if (keyLower === keyBinds.copy?.toLowerCase()) {
          e.preventDefault();
          mirrorRef.current?.doCopySelection();
        } else if (keyLower === keyBinds.selectAll?.toLowerCase()) {
          e.preventDefault();
          mirrorRef.current?.doSelectAll();
        }
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    }
  }, [isSearchBoxFocused, isGlobalSearchActive, keyBinds]);

  useImperativeHandle(ref, () => ({
    setContent: (newContent) => {
      const safeContent = String(newContent || "");
      setEditorContent(safeContent);
      setSearchPositions([]);
      setCurrentSearchIndex(-1);
      handleContentChange(safeContent);
    },
    jumpToLine: (lineNumber) => {
      mirrorRef.current?.jumpToLine?.(lineNumber);
    },
    selectAll: () => {
      mirrorRef.current?.selectAll?.();
    },
    pasteAtCursor: (text) => {
      mirrorRef.current?.pasteAtCursor?.(text);
    },
  }));

  if (!isInitializedRef.current) {
    return (
      <div className="codeEditorContainer">
         <div className="loading-wrapper">
              <div className="loading-circle" />
              <label className="loading-title">Dino Labs</label>
          </div>
      </div>
    );
  }

  const isSearchVisible = (isSearchOpenInternal || isReplaceOpenInternal) && !isGlobalSearchActive;
  const searchOperationsOpacity = isGlobalSearchActive ? 0.6 : 1.0;
  const searchOperationsCursor = isGlobalSearchActive ? "not-allowed" : "pointer";

  const zoomedTerminalStyle = {
    fontSize: `${Math.round(12 * zoomLevel)}px`,
    lineHeight: `${Math.round(18 * zoomLevel)}px`,
  };

  return (
    <div className="codeEditorContainer">
      <div className="codeEditorLanguageIndicator">
        <div className="codeEditorLanguageFlex">

          {(!isSearchVisible && !isReplaceOpen) && (
          <label className="codeEditorLanguageText">
            {languageImageMap[currentLanguage] ? (
              <img
                src={`/language-images/${languageImageMap[currentLanguage]}`}
                alt={`${currentLanguage} icon`}
                className="language-icon"
              />
            ) : (
              <FontAwesomeIcon icon={faCode} className="language-icon" />
            )}
            <strong>{currentLanguage}</strong>
          </label>
          )}

          {(isSearchVisible) && (
            <div className="codeEditorSearchInputWrapper"> 
              {isSearchVisible && (
                <div className="codeEditorLanguageFlexSupplement">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={clickEnterSearch}
                    ref={searchInputRef}
                    className="codeEditorSearchBox"
                    onFocus={() => setIsSearchBoxFocused(true)}
                    onBlur={() => setIsSearchBoxFocused(false)}
                  />

                  <div className="codeEditorSearchOperationsButtonWrapperMini">
                    <Tippy content="Case Sensitive" theme="tooltip-light">
                      <button
                        type="button"
                        className="codeEditorSearchOperationsButton"
                        onClick={() => setIsCaseSensitiveSearch(!isCaseSensitiveSearch)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <FontAwesomeIcon
                          icon={faA}
                          style={{ color: isCaseSensitiveSearch ? "#AD6ADD" : "" }}
                        />
                      </button>
                    </Tippy>

                    <Tippy content="Next" theme="tooltip-light">
                      <button
                        type="button"
                        className="codeEditorSearchOperationsButton"
                        onClick={performNextSearch}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <FontAwesomeIcon icon={faArrowDown} />
                      </button>
                    </Tippy>

                    <Tippy content="Previous" theme="tooltip-light">
                      <button
                        type="button"
                        className="codeEditorSearchOperationsButton"
                        onClick={performPreviousSearch}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <FontAwesomeIcon icon={faArrowUp} />
                      </button>
                    </Tippy>
                  </div>
                </div>
              )}

              {isReplaceOpenInternal && !isGlobalSearchActive && (
                <div className="codeEditorLanguageFlexSupplement">
                  <input
                    type="text"
                    placeholder="Replace..."
                    value={replaceTerm}
                    onChange={(e) => setReplaceTerm(e.target.value)}
                    className="codeEditorSearchBox"
                    onFocus={() => setIsSearchBoxFocused(true)}
                    onBlur={() => setIsSearchBoxFocused(false)}
                  />

                  <div className="codeEditorSearchOperationsButtonWrapperMini">
                    <Tippy content="Replace Selection" theme="tooltip-light">
                      <button
                        type="button"
                        className="codeEditorSearchOperationsButton"
                        onClick={performReplace}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <FontAwesomeIcon icon={faSquare} />
                      </button>
                    </Tippy>

                    <Tippy content="Replace All Occurrences" theme="tooltip-light">
                      <button
                        type="button"
                        className="codeEditorSearchOperationsButton"
                        onClick={performReplaceAll}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <FontAwesomeIcon icon={faList} />
                      </button>
                    </Tippy>
                  </div>
                </div>
              )}

              {searchPositions.length > 0 && currentSearchIndex >= 0 && (
                <span className="codeEditorSearchMatchIndicator">
                  {currentSearchIndex + 1} of {searchPositions.length} results found
                </span>
              )}
              {searchPositions.length === 0 && (
                <span className="codeEditorSearchMatchIndicator">No matches found</span>
              )}

            </div>
          )}
          
          <div className="codeEditorSearchButtonFlex">
            {isSearchOpenInternal && !isGlobalSearchActive ? (
              <Tippy content="Close" theme="tooltip-light">
                <button
                  type="button"
                  className="codeEditorSearchButton"
                  onClick={closeSearch}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </Tippy>
            ) : (
              <Tippy content="Search" theme="tooltip-light">
                <button
                  type="button"
                  className="codeEditorSearchButton"
                  onClick={() => {
                    if (!isGlobalSearchActive) {
                      openSearch();
                    }
                  }}
                  style={{
                    opacity: searchOperationsOpacity,
                    cursor: searchOperationsCursor,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
              </Tippy>
            )}

            {isReplaceOpenInternal && !isGlobalSearchActive ? (
              <Tippy content="Close" theme="tooltip-light">
                <button
                  type="button"
                  className="codeEditorSearchButton"
                  onClick={closeSearch}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </Tippy>
            ) : (
              <Tippy content="Search & Replace" theme="tooltip-light">
                <button
                  type="button"
                  className="codeEditorSearchButton"
                  onClick={() => {
                    if (!isGlobalSearchActive) {
                      openReplace();
                    }
                  }}
                  style={{
                    opacity: searchOperationsOpacity,
                    cursor: searchOperationsCursor,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                </button>
              </Tippy>
            )}

            <Tippy content={copySuccess || "Copy to Clipboard"} theme="tooltip-light">
              <button
                type="button"
                className="codeEditorSearchButton"
                onClick={copyToClipboard}
                onMouseDown={(e) => e.preventDefault()}
                disabled={isCopied}
                style={{
                  opacity: searchOperationsOpacity,
                  cursor: searchOperationsCursor,
                }}
              >
                <FontAwesomeIcon icon={isCopied ? faSquareCheck : faCopy} />
              </button>
            </Tippy>
            {/*
            <Tippy content="Split Tabs" theme="tooltip-light">
              <button
                type="button"
                className="codeEditorSearchButton"
                onClick={onSplit}
                disabled={disableSplit || isGlobalSearchActive}
                style={{
                  cursor: disableSplit || isGlobalSearchActive ? "not-allowed" : "pointer",
                  opacity: disableSplit || isGlobalSearchActive ? 0.5 : 1,
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <FontAwesomeIcon icon={faTableColumns} />
              </button>
            </Tippy>
            */}
          </div>
        </div>
      </div>

      {isSupported ? (
        <div className="codeEditorSpace" ref={containerRef}>
          <div
            className="codeContentWrapper"
            ref={scrollContainerRef}
            style={{ flexGrow: editorGrow }}
          >
            <DinoLabsMirror
              key="main-editor"
              ref={mirrorRef}
              viewCode={editorContent}
              setViewCode={() => {}}
              handleInput={handleInput}
              handleKeyDown={handleKeyDown}
              highlightedCode={highlightedCode}
              fontSize={zoomedFontSize}
              lineHeight={zoomedLineHeight}
              editorId={editorId}
              disableFocus={isSearchBoxFocused}
              keyBinds={keyBinds}
              lintErrors={visibleLintErrors}
            />
          </div>

          <div
            className="draggableConsoleDivider"
            style={{ flexBasis: dividerHeight }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />

          <div
            className="codeConsoleWrapper"
            style={{ flexGrow: consoleGrow }}
          >
            {isLanguageSupported && (
              <div className="codeConsoleHeader">
                <div className="codeConsoleNavigatorButtonsFlex">
                  <button 
                    className={`codeConsoleNavigatorButton active`}
                  > 
                    Problems
                  </button>
                </div>
                
                  <div className="codeLintErrorWrapper">
                    <label className="codeLintErrorCount">
                      <span>Errors:</span> {lintErrors.length} (Muted: {mutedLines.length})
                    </label>
                    <button
                      className="codeLintMessageMuteButtonMain"
                      onClick={() => setMutedLines([])}
                    >
                      <FontAwesomeIcon icon={faXmarkSquare}/>
                      Unmute
                    </button>
                  </div>
                
              </div>
            )}

            {isLanguageSupported && visibleLintErrors.length > 0 && (
              visibleLintErrors.map((err, idx) => (
                <div
                  className="codeLintMessage"
                  key={idx}
                  style={{ fontSize: `${Math.round(12 * zoomLevel)}px` }}
                >
                  <div
                    onClick={() => mirrorRef.current?.jumpToLine(err.line)}
                  >
                    Line {err.line} - Col {err.col}: {err.message}
                  </div>
                  <button
                    className="codeLintMessageMuteButton"
                    onClick={() => setMutedLines((prev) => [...prev, err.line])}
                  >
                    Mute
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="codeUnsupportedWrapper">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="codeUnsupportedIcon"
          />
          <label className="codeUnsupportedMessage">
            The content of this file type is unsupported.
          </label>
          <button className="codeTryToOpenButton" onClick={onForceOpen}>
            Try to open anyway.
          </button>
        </div>
      )}

      {saveStatus && (
        <div className="codeSaveStatusIndicator">{saveStatus}</div>
      )}
    </div>
  );
});

export default DinoLabsMarkdown;