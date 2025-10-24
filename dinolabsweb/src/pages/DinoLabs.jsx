import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { FixedSizeList as List } from "react-window";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCode,
  faAngleRight,
  faAngleDown,
  faWandMagicSparkles,
  faPlusSquare,
  faMinusSquare,
  faUserCircle,
  faRetweet,
  faA,
  faMagnifyingGlass,
  faMagnifyingGlassPlus,
  faChevronDown,
  faChevronRight,
  faFolderOpen,
  faPenToSquare,
  faUsersCog,
  faComputer,
  faUserCog
} from "@fortawesome/free-solid-svg-icons";
import { openDB } from "idb";
import { fileTypeMap } from "./DinoLabsFileTypeMap.jsx";
import DinoLabsNav from "../helpers/Nav.jsx";
import DinoLabsNoFileSelected from "./DinoLabsNoFileSelected.jsx";
import DinoLabsLoading from "../helpers/Loading.jsx";
import DinoLabsUnavailable from "../helpers/Unavailable.jsx";
import { showDialog } from "../helpers/Alert.jsx";
import useAuth from "../UseAuth.jsx";
import DinoLabsMarkdown from "./DinoLabsCode/DinoLabsMarkdown.jsx";
import DinoLabsTabularEditor from "./DinoLabsTabular/DinoLabsTabularEditor.jsx";
import DinoLabsRichTextEditor from "./DinoLabsText/DinoLabsRichTextEditor.jsx";
import DinoLabsImageEditor from "./DinoLabsMedia/DinoLabsImageEditor/DinoLabsImageEditor.jsx";
import DinoLabsVideoEditor from "./DinoLabsMedia/DinoLabsVideoEditor/DinoLabsVideoEditor.jsx";
import DinoLabsAudioEditor from "./DinoLabsMedia/DinoLabsAudioEditor/DinoLabsAudioEditor.jsx";
import DinoLabsPDFEditor from "./DinoLabsMedia/DinoLabsPDFEditor/DinoLabsPDFEditor.jsx";
import DinoLabs3DEditor from "./DinoLabsMedia/DinoLabsThreeDEditor/DinoLabsThreeDEditor.jsx";
import DinoLabsAccount from "./DinoLabsAccount/DinoLabsAccount.jsx";
import "../styles/mainStyles/DinoLabs.css";
import "../styles/mainStyles/DinoLabsCode/DinoLabsMarkdown.css";
import "../styles/mainStyles/MirrorThemes/DefaultTheme.css";
import "../styles/mainStyles/MirrorThemes/DarkTheme.css";
import "../styles/mainStyles/MirrorThemes/LightTheme.css";
import "../styles/helperStyles/Tooltip.css";
import "../styles/helperStyles/LoadingSpinner.css";
import "../styles/helperStyles/HighlightKill.css";
const mediaExtensions = { image: ["png", "jpg", "jpeg", "gif", "svg", "bmp"], video: ["mp4", "mkv", "avi", "mov", "webm"], audio: ["mp3", "wav", "flac"], pdf: ["pdf"], threeD: ["stl", "3mf", "obj"] };
const defaultKeyBinds = { save: "s", undo: "z", redo: "y", cut: "x", copy: "c", paste: "v", search: "f", selectAll: "a" };
const MAX_CONCURRENCY = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? Math.max(8, Math.min(128, navigator.hardwareConcurrency * 4)) : 32;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  normalizePath = (p) => p.replace(/\/+/g, "/").replace(/\/$/, ""),
  samePath = (a, b) => normalizePath(a) === normalizePath(b),
  splitPath = (p) => { const parts = p.split("/"); const name = parts.pop(); return { parent: parts.join("/") || "/", name }; },
  prefixPath = (rootDirectoryName, path) => (path.startsWith(rootDirectoryName) ? path : `${rootDirectoryName}/${path}`);
const pLimit = (concurrency = 8) => {
  let active = 0; const queue = [];
  const next = () => {
    if (!queue.length || active >= concurrency) return;
    active++; const { fn, resolve, reject } = queue.shift();
    (async () => {
      try { resolve(await fn()); }
      catch (error) { reject(error); }
      finally { active--; next(); }
    })();
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
};
const pLimiter = pLimit(MAX_CONCURRENCY);
const highlightResultSnippet = (text, searchTerm, isCaseSensitive) => {
  if (!searchTerm) return text;
  const re = new RegExp(`(${escapeRegExp(searchTerm)})`, isCaseSensitive ? "g" : "gi");
  return text.replace(re, "<span class='searchHighlight'>$1</span>");
};
const getFileTypeInfo = (filename) => {
  const lower = filename.toLowerCase();
  let ext;
  if (lower === "dockerfile") ext = "dockerfile";
  else if (lower === "makefile") ext = "makefile";
  else if (lower.startsWith(".git")) ext = "git";
  else {
    const parts = filename.split(".");
    ext = parts.length > 1 ? parts.pop().toLowerCase() : "default";
  }
  return fileTypeMap[ext] || { language: "Unknown", icon: "unknownExtension.svg", category: "other" };
};
const getFileIcon = (filename) => {
  const { icon } = getFileTypeInfo(filename);
  return <img src={`/language-images/${icon || "unknownExtension.svg"}`} alt={`${filename} icon`} className="directoryListItemFileIcon" />;
};
const getVirtualizedItemHeight = (size) => (size < 700 ? 24 : size < 1300 ? 28 : size < 2200 ? 32 : size < 3900 ? 36 : 40);
const isSearchableFile = (filename) => {
  const { category } = getFileTypeInfo(filename);
  return !["image", "video", "audio"].includes(category);
};
const findNode = (nodes, fullPath) => {
  for (const n of nodes) {
    if (n.fullPath === fullPath) return n;
    if (n.type === "directory" && n.files) {
      const res = findNode(n.files, fullPath);
      if (res) return res;
    }
  }
  return null;
};
const findDirNode = (nodes, fullPath) => {
  for (const n of nodes) {
    if (n.type === "directory") {
      if (n.fullPath === fullPath) return n;
      if (n.files) {
        const res = findDirNode(n.files, fullPath);
        if (res) return res;
      }
    }
  }
  return null;
};
const cloneNodeWithNewPrefix = (node, oldPrefix, newPrefix) => {
  const fix = (n) => {
    const newFullPath = n.fullPath.replace(oldPrefix, newPrefix);
    const newName = newFullPath.split("/").pop();
    const next = { ...n, fullPath: newFullPath, name: newName };
    if (n.type === "directory" && Array.isArray(n.files)) next.files = n.files.map(fix);
    return next;
  };
  return fix(node);
};
const removeNodeFromTree = (nodes, targetPath) => {
  let removed = null;
  const recur = (arr) => {
    const out = [];
    for (const n of arr) {
      if (n.fullPath === targetPath) { removed = n; continue; }
      if (n.type === "directory" && n.files) {
        const { next, removedNode } = recur(n.files);
        if (removedNode) removed = removedNode;
        out.push({ ...n, files: next });
      } else out.push(n);
    }
    return { next: out, removedNode: removed };
  };
  const { next } = recur(nodes);
  return { nextTree: next, removedNode: removed };
};
const insertNodeIntoTree = (nodes, parentPath, nodeToInsert) =>
  nodes.map((n) => {
    if (n.type === "directory") {
      if (n.fullPath === parentPath) {
        const files = Array.isArray(n.files) ? n.files.slice() : [];
        files.push(nodeToInsert);
        return { ...n, files };
      }
      if (n.files) return { ...n, files: insertNodeIntoTree(n.files, parentPath, nodeToInsert) };
    }
    return n;
  });
const updateSingleFileNodePath = (node, newFullPath) => ({ ...node, fullPath: newFullPath, name: newFullPath.split("/").pop() });
const insertFileAtParent = insertNodeIntoTree;
const deleteNodeFromTree = (nodes, targetPath) => removeNodeFromTree(nodes, targetPath).nextTree;
const loadDirectoryContents = async (directoryHandle, parentPath) => {
  const results = [];
  for await (const [name, entry] of directoryHandle.entries()) {
    if (entry.kind === "directory") {
      const fullPath = `${parentPath}/${name}`;
      results.push({ name, type: "directory", handle: entry, fullPath, files: undefined });
    } else {
      const fileObj = await entry.getFile();
      const fullPath = `${parentPath}/${fileObj.name}`;
      results.push({ name: fileObj.name, type: "file", handle: entry, fullPath });
    }
  }
  return results;
};
const updateTreeWithDirectoryContents = (tree, targetPath, children) =>
  tree.map((node) => {
    if (node.fullPath === targetPath) return { ...node, files: children };
    if (node.type === "directory" && node.files)
      return { ...node, files: updateTreeWithDirectoryContents(node.files, targetPath, children) };
    return node;
  });
const deepCopyDirectoryFast = async (srcDir, destDir) => {
  const tasks = [];
  const walk = async (s, d) => {
    for await (const [name, entry] of s.entries()) {
      if (entry.kind === "file") {
        tasks.push(
          pLimiter(async () => {
            const file = await entry.getFile();
            const destFile = await d.getFileHandle(name, { create: true });
            const w = await destFile.createWritable();
            await w.write(file);
            await w.close();
          })
        );
      } else {
        const newSub = await d.getDirectoryHandle(name, { create: true });
        tasks.push(pLimiter(async () => walk(entry, newSub)));
      }
    }
  };
  await walk(srcDir, destDir);
  await Promise.all(tasks);
};
const overwriteFileAtomic = async (targetDirHandle, itemName, sourceFile) => {
  const destFileHandle = await targetDirHandle.getFileHandle(itemName, { create: true });
  const w = await destFileHandle.createWritable();
  await w.write(sourceFile);
  await w.close();
};
const overwriteDirectoryAtomic = async (targetDirHandle, itemName, srcDirHandle) => {
  try { await targetDirHandle.removeEntry(itemName, { recursive: true }); } catch { }
  const destHandle = await targetDirHandle.getDirectoryHandle(itemName, { create: true });
  await deepCopyDirectoryFast(srcDirHandle, destHandle);
};
const fsEntryExists = async (dirHandle, name, type) => {
  try { if (type === "file") await dirHandle.getFileHandle(name, { create: false }); else await dirHandle.getDirectoryHandle(name, { create: false }); return true; }
  catch (error) { return error?.name !== "NotFoundError"; }
};
const filterTreeBySearch = (nodes, query) => {
  const q = query.toLowerCase();
  const walk = (list) =>
    list.reduce((acc, n) => {
      if (n.type === "file") {
        if (n.name.toLowerCase().includes(q)) acc.push(n);
      } else if (n.type === "directory") {
        const kids = n.files ? walk(n.files) : [];
        if (n.name.toLowerCase().includes(q) || kids.length) acc.push({ ...n, files: kids });
      }
      return acc;
    }, []);
  return walk(nodes);
};
async function* readLines(file) {
  const stream = file.stream();
  const reader = stream.pipeThrough(new TextDecoderStream("utf-8", { fatal: false })).getReader();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.length > 0) yield buffer;
        return;
      }
      buffer += value;
      let nlIndex;
      while ((nlIndex = buffer.indexOf("\n")) >= 0) {
        yield buffer.slice(0, nlIndex);
        buffer = buffer.slice(nlIndex + 1);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
async function* walkSearchableFiles(dirHandle, path) {
  for await (const [name, entry] of dirHandle.entries()) {
    const full = normalizePath(`${path}/${name}`);
    if (entry.kind === "file") {
      if (isSearchableFile(name)) yield { fullPath: full, handle: entry };
    } else if (entry.kind === "directory") {
      yield* walkSearchableFiles(entry, full);
    }
  }
}
async function countSearchableFiles(dirHandle) {
  let count = 0;
  for await (const [name, entry] of dirHandle.entries()) {
    if (entry.kind === "file") {
      if (isSearchableFile(name)) count++;
    } else if (entry.kind === "directory") {
      count += await countSearchableFiles(entry);
    }
  }
  return count;
}

const DinoLabs = () => {
  const navigate = useNavigate();
  const { token, userID, organizationID, loading } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [screenSize, setScreenSize] = useState(window.innerWidth);
  const [directoryWidth, setDirectoryWidth] = useState(20);
  const [contentWidth, setContentWidth] = useState(80);
  const [paneWidths, setPaneWidths] = useState({ pane1: 50, pane2: 50 });
  const [isDraggingWidth, setIsDraggingWidth] = useState(false);
  const [isDraggingPane, setIsDraggingPane] = useState(false);
  const [repositoryFiles, setRepositoryFiles] = useState([]);
  const [openedDirectories, setOpenedDirectories] = useState({});
  const [rootDirectoryName, setRootDirectoryName] = useState("");
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState(null);
  const [isRootOpen, setIsRootOpen] = useState(false);
  const [panes, setPanes] = useState([{ openedTabs: [], activeTabId: null }]);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [originalContents, setOriginalContents] = useState({});
  const [modifiedContents, setModifiedContents] = useState({});
  const [isNavigatorState, setIsNavigatorState] = useState(true);
  const [isNavigatorLoading, setIsNavigatorLoading] = useState(false);
  const [isSearchState, setIsSearchState] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalReplaceTerm, setGlobalReplaceTerm] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isCaseSensitiveSearch, setIsCaseSensitiveSearch] = useState(true);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  const [isGlobalReplacing, setIsGlobalReplacing] = useState(false);
  const [globalOperationProgress, setGlobalOperationProgress] = useState(null);
  const [isPlotRendered, setIsPlotRendered] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState({});
  const [keyBinds, setKeyBinds] = useState(defaultKeyBinds);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [colorTheme, setColorTheme] = useState("default");
  const [personalUsageByDay, setPersonalUsageByDay] = useState([]);
  const [usageLanguages, setUsageLanguages] = useState([]);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuTarget, setContextMenuTarget] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [copiedItem, setCopiedItem] = useState(null);
  const [pendingHydrate, setPendingHydrate] = useState(false);
  const [fsOpLoading, setFsOpLoading] = useState(false);
  const hasOpenFile = panes.some((pane) => pane.openedTabs.length > 0);
  const debounceRef = useRef(null);
  const panesRef = useRef(panes);
  const directoryRef = useRef(null);
  const contentRef = useRef(null);
  const editorRefs = useRef({});
  const contextMenuRef = useRef(null);
  const repositoryFilesRef = useRef(repositoryFiles);
  const openedDirectoriesRef = useRef(openedDirectories);
  const saveStateDebounceRef = useRef(null);
  const alertInFlightRef = useRef(false);
  const fsOpLoadingRef = useRef(fsOpLoading);
  const searchTokenRef = useRef(0);
  const activeSearchCount = useRef(0);
  const needsSearchRef = useRef(false);
  const dbPromise = openDB("DinoLabsDB", 1, { upgrade(db) { db.createObjectStore("handles", { keyPath: "id" }); } });
  const stateDBPromise = openDB("DinoLabsStateDB", 1, { upgrade(db) { db.createObjectStore("state", { keyPath: "id" }); } });
  const guardedShowDialog = useCallback(async (opts) => {
    while (alertInFlightRef.current) await new Promise((r) => setTimeout(r, 25));
    alertInFlightRef.current = true;
    const wasLoading = fsOpLoadingRef.current;
    if (wasLoading) setFsOpLoading(false);
    try { return await showDialog(opts); }
    finally { if (wasLoading) setFsOpLoading(true); alertInFlightRef.current = false; }
  }, []);
  const saveStateToDB = async (state) => { try { const db = await stateDBPromise; await db.put("state", { id: "state", data: state, savedAt: Date.now() }); } catch { } };
  const loadStateFromDB = async () => { try { const db = await stateDBPromise; const record = await db.get("state", "state"); return record?.data || null; } catch { return null; } };
  const saveHandle = async (id, handle) => { if (!handle) return; const db = await dbPromise; await db.put("handles", { id, handle }); };
  const loadHandle = async (id) => {
    const db = await dbPromise; const item = await db.get("handles", id); if (!item) return null;
    const handle = item.handle; let permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") { permission = await handle.requestPermission({ mode: "readwrite" }); if (permission !== "granted") return null; }
    return handle;
  };
  const saveRootHandle = async () => { if (!rootDirectoryHandle) return; const db = await dbPromise; await db.put("handles", { id: "root", handle: rootDirectoryHandle }); };
  const loadRootHandle = async () => {
    const db = await dbPromise; const item = await db.get("handles", "root"); if (!item) return null;
    const handle = item.handle; let permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") { permission = await handle.requestPermission({ mode: "readwrite" }); if (permission !== "granted") return null; }
    return handle;
  };
  const resolveHandleFromPath = async (rootHandle, relativePath) => {
    if (!rootHandle || !relativePath) return null;
    const parts = relativePath.split("/").filter(Boolean);
    let current = rootHandle;
    for (const part of parts.slice(0, -1)) { try { current = await current.getDirectoryHandle(part); } catch { return null; } }
    const fileName = parts.pop(); if (!fileName) return null;
    try { return await current.getFileHandle(fileName); } catch { return null; }
  };
  const getDirectoryHandleByPath = async (path) => {
    const fullPath = prefixPath(rootDirectoryName, path);
    if (!rootDirectoryHandle || fullPath === rootDirectoryName || fullPath === `${rootDirectoryName}/`) return rootDirectoryHandle;
    const parts = fullPath.replace(`${rootDirectoryName}/`, "").split("/").filter(Boolean);
    let currentHandle = rootDirectoryHandle;
    for (const part of parts) {
      try { currentHandle = await currentHandle.getDirectoryHandle(part, { create: false }); }
      catch { return null; }
    }
    return currentHandle;
  };
  const getFileHandleByPath = async (files, filePath) => {
    const prefixedPath = prefixPath(rootDirectoryName, filePath);
    for (const file of files) {
      if (file.type === "file" && file.fullPath === prefixedPath) return file.handle;
      if (file.type === "directory" && file.files) {
        const handle = await getFileHandleByPath(file.files, filePath);
        if (handle) return handle;
      }
    }
    return null;
  };
  const rescanPaths = async (paths) => {
    if (!rootDirectoryHandle || !rootDirectoryName) return;
    const unique = Array.from(new Set(paths.filter(Boolean)));
    if (!unique.length) return;
    const needFull = unique.some((p) => p === rootDirectoryName);
    let tree = repositoryFilesRef.current; let didFull = false;
    for (const p of unique) {
      if (didFull) break;
      const node = findDirNode(tree, p);
      if (!node || !node.handle) {
        try {
          const full = await loadDirectoryContents(rootDirectoryHandle, rootDirectoryName);
          repositoryFilesRef.current = full; setRepositoryFiles(full);
        } catch { }
        didFull = true; break;
      }
      try {
        const children = await loadDirectoryContents(node.handle, node.fullPath);
        const oldChildrenMap = new Map((node.files || []).map(c => [c.name, c]));
        const enhancedChildren = children.map(child => {
          if (child.type !== "directory") return child;
          const oldChild = oldChildrenMap.get(child.name);
          if (oldChild && oldChild.files !== undefined) {
            return { ...child, files: oldChild.files };
          }
          return child;
        });
        tree = updateTreeWithDirectoryContents(tree, node.fullPath, enhancedChildren);
      } catch {
        try {
          const full = await loadDirectoryContents(rootDirectoryHandle, rootDirectoryName);
          repositoryFilesRef.current = full; setRepositoryFiles(full);
        } catch { }
        didFull = true; break;
      }
    }
    if (!didFull) { repositoryFilesRef.current = tree; setRepositoryFiles(tree); }
  };
  const withFsOverlay = async (fn) => { setFsOpLoading(true); try { return await fn(); } finally { setFsOpLoading(false); } };
  const rescanAndSync = async (affected) => rescanPaths(Array.isArray(affected) ? affected : [affected].filter(Boolean));
  const flattenTree = (files, parentPath = "", level = 0, isParentVisible = true) => {
    const output = [];
    const stack = [];
    for (let i = files.length - 1; i >= 0; i--) {
      stack.push({ item: files[i], level, isParentVisible, parentPath, highlight: false });
    }
    while (stack.length) {
      const { item, level, isParentVisible, parentPath, highlight } = stack.pop();
      const directoryKey = prefixPath("", item.fullPath || `${parentPath}/${item.name}`);
      const isDir = item.type === "directory";
      const isOpen = openedDirectories[directoryKey] || false;
      const isVisible = isParentVisible && (isRootOpen || parentPath === "");
      const shouldHighlight = highlight || (isDir && isOpen);
      output.push({ id: directoryKey, name: item.name, type: item.type, fullPath: directoryKey, level, isVisible, isOpen: isDir ? isOpen : false, handle: item.handle, highlight: shouldHighlight });
      if (isDir && isOpen && item.files && item.files.length > 0) {
        for (let i = item.files.length - 1; i >= 0; i--) {
          stack.push({ item: item.files[i], level: level + 1, isParentVisible: isVisible && isOpen, parentPath: directoryKey, highlight: shouldHighlight });
        }
      }
    }
    return output;
  };
  const flattenSearchResults = (resultsByFile, collapsedMap) => {
    const output = [];
    Object.entries(resultsByFile).forEach(([filePath, results]) => {
      const isCollapsed = collapsedMap[filePath] || false;
      output.push({ type: "directory", fullPath: filePath, level: 0, isVisible: true, isOpen: !isCollapsed });
      if (!isCollapsed)
        results.forEach((res) => output.push({ type: "file", fullPath: filePath, level: 1, isVisible: true, lineNumber: res.lineNumber, lineContent: res.lineContent }));
    });
    return output;
  };
  const tabPatch = (paneIndex, tabId, patch) =>
    setPanes((prev) => {
      const next = [...prev];
      next[paneIndex].openedTabs = next[paneIndex].openedTabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t));
      return next;
    });
  const hydratePathDeep = useCallback(async (path) => {
    if (!rootDirectoryHandle || !rootDirectoryName) return;
    if (!path.startsWith(rootDirectoryName)) return;
    const parts = path.split("/").filter(Boolean);
    if (parts[0] !== rootDirectoryName) return;
    let currentTree = repositoryFilesRef.current;
    const ensureLoaded = async (nodePath) => {
      const node = findDirNode(currentTree, nodePath);
      if (node && node.files === undefined && node.handle) {
        try {
          const children = await loadDirectoryContents(node.handle, node.fullPath);
          currentTree = updateTreeWithDirectoryContents(currentTree, nodePath, children);
          repositoryFilesRef.current = currentTree; setRepositoryFiles(currentTree);
        } catch { }
      }
    };
    await ensureLoaded(rootDirectoryName);
    let currentPath = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const parentPath = currentPath;
      await ensureLoaded(parentPath);
      currentPath = `${currentPath}/${parts[i]}`;
      await ensureLoaded(currentPath);
    }
  }, [rootDirectoryHandle, rootDirectoryName]);
  const hydrateAllOpenedDirectories = useCallback(async () => {
    if (!rootDirectoryHandle || !rootDirectoryName) return;
    const paths = Object.keys(openedDirectoriesRef.current).filter((p) => openedDirectoriesRef.current[p]).sort((a, b) => a.split("/").length - b.split("/").length);
    for (const p of paths) { try { await hydratePathDeep(p); } catch { } }
  }, [rootDirectoryHandle, rootDirectoryName, hydratePathDeep]);
  const flattenedDirectoryList = useMemo(() => {
    if (!rootDirectoryName) return [];
    const filteredTree = searchQuery ? filterTreeBySearch(repositoryFiles, searchQuery) : repositoryFiles;
    return flattenTree(filteredTree);
  }, [repositoryFiles, openedDirectories, isRootOpen, rootDirectoryName, searchQuery]);
  const flattenedSearchList = useMemo(() => {
    if (!globalSearchResults.length) return [];
    const resultsByFile = globalSearchResults.reduce((acc, r) => { (acc[r.filePath] ??= []).push(r); return acc; }, {});
    return flattenSearchResults(resultsByFile, collapsedFiles);
  }, [globalSearchResults, collapsedFiles]);
  useEffect(() => { repositoryFilesRef.current = repositoryFiles; openedDirectoriesRef.current = openedDirectories; fsOpLoadingRef.current = fsOpLoading; panesRef.current = panes; }, [repositoryFiles, openedDirectories, fsOpLoading, panes]);
  useEffect(() => {
    const handleResize = () => {
      setScreenSize(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    if (!loading && token) {
      (async () => {
        try {
          const [userResponse, usageResponse] = await Promise.all([
            fetch(`${import.meta.env.VITE_API_AUTH_URL}/user-info`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ userID, organizationID })
            }),
            fetch(`${import.meta.env.VITE_API_AUTH_URL}/usage-info`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ userID, organizationID })
            })
          ]);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setKeyBinds(userData[0].userkeybinds ? { ...defaultKeyBinds, ...userData[0].userkeybinds } : defaultKeyBinds);
            setZoomLevel(userData[0].userzoomlevel || 1);
            setColorTheme(userData[0].usercolortheme || "default");
          }
          if (usageResponse.ok) {
            setIsPlotRendered(false);
            const usageData = await usageResponse.json();
            setPersonalUsageByDay(usageData.personalUsageInfo.map((i) => ({ day: new Date(i.day), count: +i.usage_count })));
            setUsageLanguages(usageData.usageLanguages.map((i) => ({ language: i.language, count: +i.language_count })));
            setIsPlotRendered(true);
          }
        } catch { }
      })();
    }
  }, [userID, organizationID, loading, token]);

  useEffect(() => {
    (async () => {
      try {
        const savedState = await loadStateFromDB();
        //if (!savedState) { setPanes([{ openedTabs: [], activeTabId: null }]); setIsLoaded(true); return; }
        const rootHandle = await loadRootHandle();
        if (rootHandle && savedState.rootDirectoryName) {
          setRootDirectoryHandle(rootHandle);
          setRootDirectoryName(savedState.rootDirectoryName);
          const os = savedState.openedDirectories || {};
          os[savedState.rootDirectoryName] = true;
          setOpenedDirectories(os);
          setIsRootOpen(true);
          try { const rootFiles = await loadDirectoryContents(rootHandle, savedState.rootDirectoryName); setRepositoryFiles(rootFiles); } catch { }
        }
        setActivePaneIndex(savedState.activePaneIndex || 0);
        if (savedState.panes?.length) {
          const rootHandleLocal = rootHandle;
          const restoredPanes = await Promise.all(
            savedState.panes.map(async (savedPane) => {
              if (!savedPane.openedTabs?.length) return { openedTabs: [], activeTabId: null };
              const restoredTabs = await Promise.all(
                savedPane.openedTabs.map(async (savedTab) => {
                  if (savedTab.id === "account") {
                    return {
                      id: savedTab.id,
                      name: "Account",
                      fileHandle: null,
                      language: "",
                      isMedia: false,
                      content: "",
                      forceOpen: savedTab.forceOpen || false,
                      searchTerm: savedTab.searchTerm || "",
                      replaceTerm: savedTab.replaceTerm || "",
                      searchPositions: savedTab.searchPositions || [],
                      currentSearchIndex: savedTab.currentSearchIndex || -1,
                      isSearchOpen: savedTab.isSearchOpen || false,
                      isReplaceOpen: savedTab.isReplaceOpen || false,
                      isSingleFile: true,
                      isAccount: true
                    };
                  }
                  let fileHandle = null;
                  try {
                    if (savedTab.isSingleFile) fileHandle = await loadHandle(savedTab.id);
                    else if (rootHandleLocal && savedState.rootDirectoryName && savedTab.id.includes("/")) {
                      const rel = savedTab.id.replace(savedState.rootDirectoryName + "/", "");
                      fileHandle = await resolveHandleFromPath(rootHandleLocal, rel);
                    }
                  } catch { }
                  let content = "";
                  if (!savedTab.isMedia) {
                    const hasUnsaved = savedState.unsavedChanges?.[savedTab.id];
                    if (hasUnsaved && savedState.modifiedContents?.[savedTab.id]) {
                      content = savedState.modifiedContents[savedTab.id];
                    } else if (savedTab.content) {
                      content = savedTab.content;
                    } else if (savedState.originalContents?.[savedTab.id]) {
                      content = savedState.originalContents[savedTab.id];
                    }
                    if (fileHandle && !hasUnsaved) {
                      try {
                        const file = await fileHandle.getFile();
                        content = await file.text();
                      } catch { }
                    }
                  }
                  return {
                    id: savedTab.id,
                    name: savedTab.name,
                    fileHandle,
                    language: savedTab.language || "Unknown",
                    isMedia: savedTab.isMedia || false,
                    content,
                    forceOpen: savedTab.forceOpen || false,
                    searchTerm: savedTab.searchTerm || "",
                    replaceTerm: savedTab.replaceTerm || "",
                    searchPositions: savedTab.searchPositions || [],
                    currentSearchIndex: savedTab.currentSearchIndex || -1,
                    isSearchOpen: savedTab.isSearchOpen || false,
                    isReplaceOpen: savedTab.isReplaceOpen || false,
                    isSingleFile: savedTab.isSingleFile || false,
                    isAccount: savedTab.isAccount || false
                  };
                })
              );
              return { openedTabs: restoredTabs, activeTabId: savedPane.activeTabId };
            })
          );
          //setPanes(restoredPanes);
          setOriginalContents(savedState.originalContents || {});
          setUnsavedChanges(savedState.isMedia ? (savedState.unsavedChanges || {}) : {});
          setModifiedContents(savedState.isMedia ? (savedState.modifiedContents || {}) : {});
        } else {
          setPanes([{ openedTabs: [], activeTabId: null }]);
          setOriginalContents({});
          setUnsavedChanges({});
          setModifiedContents({});
        }
        setPendingHydrate(true);
      } catch {
        setPanes([{ openedTabs: [], activeTabId: null }]);
        setOriginalContents({});
        setUnsavedChanges({});
        setModifiedContents({});
      }
      setIsLoaded(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!pendingHydrate || !rootDirectoryHandle || !rootDirectoryName) return;
      if (!repositoryFilesRef.current?.length) return;
      await hydrateAllOpenedDirectories();
      setPendingHydrate(false);
    })();
  }, [pendingHydrate, rootDirectoryHandle, rootDirectoryName, hydrateAllOpenedDirectories]);
  useEffect(() => {
    if (!rootDirectoryHandle || !rootDirectoryName) return;
    if (!repositoryFilesRef.current?.length) return;
    hydrateAllOpenedDirectories();
  }, [openedDirectories]);
  useEffect(() => {
    if (saveStateDebounceRef.current) clearTimeout(saveStateDebounceRef.current);
    saveStateDebounceRef.current = setTimeout(() => {
      const state = {
        rootDirectoryName,
        openedDirectories,
        isRootOpen,
        unsavedChanges,
        originalContents,
        modifiedContents,
        panes: panes.map((pane) => ({
          openedTabs: pane.openedTabs.map((tab) => ({
            id: tab.id,
            name: tab.name,
            language: tab.language,
            isMedia: tab.isMedia,
            forceOpen: tab.forceOpen,
            searchTerm: tab.searchTerm,
            replaceTerm: tab.replaceTerm,
            searchPositions: tab.searchPositions,
            currentSearchIndex: tab.currentSearchIndex,
            isSearchOpen: tab.isSearchOpen,
            isReplaceOpen: tab.isReplaceOpen,
            isSingleFile: !tab.id.includes("/"),
            content: tab.content || "",
            isAccount: tab.isAccount || false
          })),
          activeTabId: pane.activeTabId
        })),
        activePaneIndex
      };
      saveStateToDB(state);
      saveRootHandle();
      panes.forEach((pane) =>
        pane.openedTabs.forEach((tab) => tab.isSingleFile && tab.fileHandle && saveHandle(tab.id, tab.fileHandle))
      );
    }, 500);
  }, [
    rootDirectoryName,
    openedDirectories,
    isRootOpen,
    unsavedChanges,
    originalContents,
    modifiedContents,
    panes,
    activePaneIndex,
    rootDirectoryHandle
  ]);
  useEffect(() => {
    const dir = directoryRef.current, cont = contentRef.current;
    if (!dir || !cont) return;
    let isSyncingDir = false, isSyncingCont = false;
    const onDirScroll = () => { if (isSyncingDir) return (isSyncingDir = false); isSyncingCont = true; cont.scrollTop = dir.scrollTop; };
    const onContScroll = () => { if (isSyncingCont) return (isSyncingCont = false); isSyncingDir = true; dir.scrollTop = cont.scrollTop; };
    dir.addEventListener("scroll", onDirScroll);
    cont.addEventListener("scroll", onContScroll);
    return () => { dir.removeEventListener("scroll", onDirScroll); cont.removeEventListener("scroll", onContScroll); };
  }, []);
  useEffect(() => {
    searchTokenRef.current++;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!globalSearchQuery) {
      setGlobalSearchResults([]);
      setPanes((prev) =>
        prev.map((pane) => ({
          ...pane,
          openedTabs: pane.openedTabs.map((tab) => ({ ...tab, searchTerm: "" }))
        }))
      );
      return;
    }
    debounceRef.current = setTimeout(performGlobalSearch, 500);
    return () => clearTimeout(debounceRef.current);
  }, [globalSearchQuery, isCaseSensitiveSearch]);
  useEffect(() => {
    if (!contextMenuVisible || !contextMenuRef.current) return;
    const menu = contextMenuRef.current;
    const { innerWidth, innerHeight } = window;
    const { x, y } = contextMenuPosition;
    const rect = menu.getBoundingClientRect();
    let newX = Math.max(Math.min(x, innerWidth - rect.width - 10), 10);
    let newY = Math.max(Math.min(y, innerHeight - rect.height - 10), 10);
    if (newX !== x || newY !== y) setContextMenuPosition({ x: newX, y: newY });
    const handleClickOutside = (e) => { if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) setContextMenuVisible(false); };
    const handleEsc = (e) => e.key === "Escape" && contextMenuVisible && setContextMenuVisible(false);
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [contextMenuVisible, contextMenuPosition]);
  const handleLoadRepository = async () => {
    try {
      setIsNavigatorLoading(true);
      const directoryHandle = await window.showDirectoryPicker();
      const rootName = directoryHandle.name;
      setRootDirectoryHandle(directoryHandle);
      setRootDirectoryName(rootName);
      setRepositoryFiles(await loadDirectoryContents(directoryHandle, rootName));
      setIsRootOpen(true);
      setOpenedDirectories((prev) => ({ ...prev, [rootName]: true }));
    } catch { } finally {
      setIsNavigatorLoading(false);
    }
  };
  const handleLoadFile = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({ multiple: false });
      openFile(fileHandle, fileHandle.name);
    } catch { }
  };
  const toggleDirectory = async (directoryKey) => {
    setOpenedDirectories((prev) => ({ ...prev, [directoryKey]: !prev[directoryKey] }));
    if (openedDirectories[directoryKey]) return;
    const findNodeInner = (nodes) => {
      for (let node of nodes) {
        if (node.fullPath === directoryKey) return node;
        if (node.type === "directory" && node.files) {
          const res = findNodeInner(node.files);
          if (res) return res;
        }
      }
      return null;
    };
    const node = findNodeInner(repositoryFiles);
    if (node && node.files === undefined && node.handle) {
      const children = await loadDirectoryContents(node.handle, node.fullPath);
      setRepositoryFiles((prevTree) => updateTreeWithDirectoryContents(prevTree, directoryKey, children));
    }
  };
  const openFile = async (fileHandle, fileName, fullPath = null) => {
    const fileId = fullPath || fileName;
    const { language, category } = getFileTypeInfo(fileName);
    const existingPaneIndex = panes.findIndex((pane) => pane.openedTabs.some((tab) => tab.id === fileId));
    if (existingPaneIndex !== -1) {
      setActivePaneIndex(existingPaneIndex);
      setPanes((prev) => {
        const next = [...prev];
        next[existingPaneIndex].activeTabId = fileId;
        return next;
      });
      return;
    }
    const isMedia = ["image", "video", "audio", "pdf", "threeD"].includes(category);
    let content = null;
    let finalHandle = fileHandle;
    if (!isMedia) {
      try {
        if (!fileHandle) throw new Error("No handle");
        const file = await fileHandle.getFile();
        content = modifiedContents[fileId] || (await file.text());
      } catch {
        content = category === "code" ? "Error reading file content." : "The content of this file type could not be automatically detected. Try to open it anyway.";
        finalHandle = null;
      }
    }
    const newTab = {
      id: fileId,
      name: fileName,
      fileHandle: finalHandle,
      language,
      isMedia,
      content,
      forceOpen: false,
      searchTerm: "",
      replaceTerm: "",
      searchPositions: [],
      currentSearchIndex: -1,
      isSearchOpen: false,
      isReplaceOpen: false,
      isSingleFile: !fileId.includes("/"),
      isAccount: false
    };
    setPanes((prev) => {
      const next = [...prev];
      next[activePaneIndex].openedTabs.push(newTab);
      next[activePaneIndex].activeTabId = newTab.id;
      return next;
    });
    setOriginalContents((p) => ({ ...p, [fileId]: content }));
    setUnsavedChanges((p) => ({ ...p, [fileId]: false }));
    if (!fullPath) saveHandle(fileId, finalHandle);
  };
  const openAccount = () => {
    const fileId = "account";
    const existingPaneIndex = panes.findIndex((pane) => pane.openedTabs.some((tab) => tab.id === fileId));
    if (existingPaneIndex !== -1) {
      setActivePaneIndex(existingPaneIndex);
      setPanes((prev) => {
        const next = [...prev];
        next[existingPaneIndex].activeTabId = fileId;
        return next;
      });
      return;
    }
    const newTab = {
      id: fileId,
      name: "Account",
      fileHandle: null,
      language: "",
      isMedia: false,
      content: "",
      forceOpen: false,
      searchTerm: "",
      replaceTerm: "",
      searchPositions: [],
      currentSearchIndex: -1,
      isSearchOpen: false,
      isReplaceOpen: false,
      isSingleFile: true,
      isAccount: true
    };
    setPanes((prev) => {
      const next = [...prev];
      next[activePaneIndex].openedTabs.push(newTab);
      next[activePaneIndex].activeTabId = newTab.id;
      return next;
    });
  };
  const handleFileClick = (file) => openFile(file.handle, file.name, file.fullPath);
  const closeTab = async (paneIndex, tabId) => {
    if (unsavedChanges[tabId]) {
      const r = await guardedShowDialog({ title: "System Alert", message: "You have unsaved changes in this file. Are you sure you want to close it?", showCancel: true });
      if (r === null) return;
    }
    setPanes((prev) => {
      let next = [...prev];
      const pane = next[paneIndex];
      pane.openedTabs = pane.openedTabs.filter((tab) => tab.id !== tabId);
      if (pane.activeTabId === tabId) pane.activeTabId = pane.openedTabs[0]?.id ?? null;
      if (!pane.openedTabs.length) {
        next.splice(paneIndex, 1);
        if (activePaneIndex >= paneIndex && activePaneIndex > 0) setActivePaneIndex(activePaneIndex - 1);
        if (!next.length) next = [{ openedTabs: [], activeTabId: null }];
        if (next.length === 1) setPaneWidths({ pane1: 100, pane2: 0 });
      }
      return next;
    });
    setUnsavedChanges((p) => { const u = { ...p }; delete u[tabId]; return u; });
    setOriginalContents((p) => { const u = { ...p }; delete u[tabId]; return u; });
    setModifiedContents((p) => { const u = { ...p }; delete u[tabId]; return u; });
  };
  const switchTab = (paneIndex, tabId) => {
    setPanes((prev) => {
      const next = [...prev];
      next[paneIndex].activeTabId = tabId;
      return next;
    });
    setActivePaneIndex(paneIndex);
  };
  const splitTab = () => {
    setPanes((prev) => {
      if (prev.length >= 2) return prev;
      const currentPane = prev[activePaneIndex];
      const currentTabIndex = currentPane.openedTabs.findIndex((t) => t.id === currentPane.activeTabId);
      const currentTab = currentPane.openedTabs[currentTabIndex];
      if (!currentTab) return prev;

      const tabCopy = {
        ...currentTab,
        forceOpen: currentTab.forceOpen || unsavedChanges[currentTab.id]
      };

      const remainingTabs = currentPane.openedTabs.filter((_, index) => index !== currentTabIndex);
      const newActiveTabId = remainingTabs.length > 0
        ? (remainingTabs[Math.min(currentTabIndex, remainingTabs.length - 1)]?.id || remainingTabs[0]?.id)
        : null;

      const updatedCurrentPane = {
        ...currentPane,
        openedTabs: remainingTabs,
        activeTabId: newActiveTabId
      };

      const newPane = {
        openedTabs: [tabCopy],
        activeTabId: tabCopy.id
      };

      setPaneWidths({ pane1: 50, pane2: 50 });

      const updatedPanes = [...prev];
      updatedPanes[activePaneIndex] = updatedCurrentPane;
      updatedPanes.push(newPane);

      return updatedPanes;
    });

    setActivePaneIndex(1);
  };
  const handleForceOpenTab = (paneIndex, tabId) => tabPatch(paneIndex, tabId, { forceOpen: true });
  const handleDragStart = (e, sourcePaneIndex, tabId) => e.dataTransfer.setData("text/plain", JSON.stringify({ sourcePaneIndex, tabId }));
  const handleDrop = (e, targetPaneIndex) => {
    e.preventDefault();
    const { sourcePaneIndex, tabId } = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (sourcePaneIndex === targetPaneIndex) return;
    const currentPanes = panesRef.current;
    const next = [...currentPanes];
    const sourcePane = next[sourcePaneIndex];
    const targetPane = next[targetPaneIndex];
    const tabToMove = sourcePane.openedTabs.find((t) => t.id === tabId);
    if (!tabToMove) return;
    sourcePane.openedTabs = sourcePane.openedTabs.filter((t) => t.id !== tabId);
    if (sourcePane.activeTabId === tabId) sourcePane.activeTabId = sourcePane.openedTabs[0]?.id ?? null;
    const existingTab = targetPane.openedTabs.find((t) => t.id === tabId);
    if (!existingTab) {
      targetPane.openedTabs.push(tabToMove);
      targetPane.activeTabId = tabId;
    } else targetPane.activeTabId = existingTab.id;
    let newActivePaneIndex = activePaneIndex;
    if (!sourcePane.openedTabs.length) {
      next.splice(sourcePaneIndex, 1);
      if (activePaneIndex === sourcePaneIndex)
        newActivePaneIndex = targetPaneIndex < sourcePaneIndex ? targetPaneIndex : targetPaneIndex - 1;
      else if (activePaneIndex > sourcePaneIndex) newActivePaneIndex = activePaneIndex - 1;
      if (next.length === 1) setPaneWidths({ pane1: 100, pane2: 0 });
    }
    if (!next.length) {
      next.push({ openedTabs: [], activeTabId: null });
      setPaneWidths({ pane1: 100, pane2: 0 });
      newActivePaneIndex = 0;
    }
    setPanes(next);
    setActivePaneIndex(newActivePaneIndex);
  };
  const handleEdit = (paneIndex, tabId, _prevState, newState) => {
    const originalContent = originalContents[tabId];
    setUnsavedChanges((p) => ({ ...p, [tabId]: newState.fullCode !== originalContent }));
    tabPatch(paneIndex, tabId, { content: newState.fullCode });
    setModifiedContents((p) => ({ ...p, [tabId]: newState.fullCode }));
  };
  const handleSave = (paneIndex, tabId, newFullCode) => {
    setOriginalContents((p) => ({ ...p, [tabId]: newFullCode }));
    setUnsavedChanges((p) => ({ ...p, [tabId]: false }));
    setModifiedContents((p) => { const u = { ...p }; delete u[tabId]; return u; });
  };
  const performGlobalSearch = async () => {
    if (isGlobalSearching) {
      needsSearchRef.current = true;
      return;
    }
    if (!globalSearchQuery || !rootDirectoryHandle) {
      setGlobalSearchResults([]);
      setPanes((prev) =>
        prev.map((pane) => ({
          ...pane,
          openedTabs: pane.openedTabs.map((tab) => ({ ...tab, searchTerm: "" }))
        }))
      );
      return;
    }
    const myToken = ++searchTokenRef.current;
    activeSearchCount.current++;
    setIsGlobalSearching(true);
    const total = await countSearchableFiles(rootDirectoryHandle);
    if (myToken === searchTokenRef.current) {
      setGlobalOperationProgress({ type: "search", current: 0, total });
    }
    try {
      const results = [];
      const q = isCaseSensitiveSearch ? globalSearchQuery : globalSearchQuery.toLowerCase();
      const progressCounter = { current: 0 };
      const tasks = [];
      for await (const file of walkSearchableFiles(rootDirectoryHandle, rootDirectoryName)) {
        tasks.push(pLimiter(async () => {
          if (myToken !== searchTokenRef.current) return;
          try {
            const hasModified = file.fullPath in modifiedContents;
            if (hasModified) {
              const content = modifiedContents[file.fullPath];
              const lines = content.split("\n");
              lines.forEach((line, idx) => {
                const hay = isCaseSensitiveSearch ? line : line.toLowerCase();
                if (hay.includes(q)) results.push({ filePath: file.fullPath, lineNumber: idx + 1, lineContent: line });
              });
            } else if (file.handle) {
              const fileObj = await file.handle.getFile();
              let lineNum = 1;
              for await (const line of readLines(fileObj)) {
                const hay = isCaseSensitiveSearch ? line : line.toLowerCase();
                if (hay.includes(q)) results.push({ filePath: file.fullPath, lineNumber: lineNum, lineContent: line });
                lineNum++;
              }
            }
          } catch { }
          progressCounter.current++;
          if (myToken === searchTokenRef.current && (progressCounter.current % 10 === 0 || progressCounter.current === total)) {
            setGlobalOperationProgress(p => ({ ...p, current: progressCounter.current }));
          }
        }));
      }
      await Promise.all(tasks);
      if (myToken !== searchTokenRef.current) return;
      results.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.lineNumber - b.lineNumber);
      setGlobalSearchResults(results);
      setPanes((prev) =>
        prev.map((pane) => ({
          ...pane,
          openedTabs: pane.openedTabs.map((tab) => ({ ...tab, searchTerm: globalSearchQuery }))
        }))
      );
    } finally {
      activeSearchCount.current--;
      if (activeSearchCount.current === 0) {
        setIsGlobalSearching(false);
        setGlobalOperationProgress(null);
        if (needsSearchRef.current) {
          needsSearchRef.current = false;
          performGlobalSearch();
        }
      }
    }
  };
  const performGlobalReplace = async () => {
    if (!globalSearchQuery || !rootDirectoryHandle) return;
    setIsGlobalReplacing(true);
    setGlobalOperationProgress({ type: "count", current: 0, total: await countSearchableFiles(rootDirectoryHandle) });
    try {
      const regex = new RegExp(escapeRegExp(globalSearchQuery), isCaseSensitiveSearch ? "g" : "gi");
      let totalMatches = 0;
      let filesWithMatches = 0;
      const progressCounterCount = { current: 0 };
      const countTasks = [];
      for await (const file of walkSearchableFiles(rootDirectoryHandle, rootDirectoryName)) {
        countTasks.push(pLimiter(async () => {
          let count = 0;
          try {
            const hasModified = file.fullPath in modifiedContents;
            if (hasModified) {
              const content = modifiedContents[file.fullPath];
              count = (content.match(regex) || []).length;
            } else if (file.handle) {
              const fileObj = await file.handle.getFile();
              for await (const line of readLines(fileObj)) {
                count += (line.match(regex) || []).length;
              }
            }
            if (count > 0) filesWithMatches++;
            totalMatches += count;
          } catch { }
          progressCounterCount.current++;
          if (progressCounterCount.current % 10 === 0 || progressCounterCount.current === globalOperationProgress.total) {
            setGlobalOperationProgress(p => ({ ...p, current: progressCounterCount.current }));
          }
        }));
      }
      await Promise.all(countTasks);
      if (!totalMatches) return;
      const msg = `Are you sure you want to replace ${totalMatches} ${totalMatches === 1 ? "occurrence" : "occurrences"} of "${globalSearchQuery}" across ${filesWithMatches} ${filesWithMatches === 1 ? "file" : "files"}?`;
      const ok = await guardedShowDialog({ title: "System Alert", message: msg, showCancel: true });
      if (ok === null) return;
      setGlobalOperationProgress({ type: "replace", current: 0, total: globalOperationProgress.total });
      const progressCounterReplace = { current: 0 };
      const replaceTasks = [];
      for await (const file of walkSearchableFiles(rootDirectoryHandle, rootDirectoryName)) {
        replaceTasks.push(pLimiter(async () => {
          const hasModified = file.fullPath in modifiedContents;
          let newContent = null;
          let changed = false;
          try {
            if (hasModified) {
              let content = modifiedContents[file.fullPath];
              newContent = content.replace(regex, globalReplaceTerm);
              changed = newContent !== content;
            } else if (file.handle) {
              const fileObj = await file.handle.getFile();
              const writable = await file.handle.createWritable({ keepExistingData: false });
              changed = false;
              try {
                for await (const line of readLines(fileObj)) {
                  const newLine = line.replace(regex, globalReplaceTerm);
                  if (newLine !== line) changed = true;
                  await writable.write(newLine + "\n");
                }
              } finally {
                await writable.close();
              }
            }
          } catch { }
          progressCounterReplace.current++;
          if (progressCounterReplace.current % 10 === 0 || progressCounterReplace.current === globalOperationProgress.total) {
            setGlobalOperationProgress(p => ({ ...p, current: progressCounterReplace.current }));
          }
          if (changed && hasModified) {
            return { fullPath: file.fullPath, newContent };
          }
          return null;
        }));
      }
      const changedModified = (await Promise.all(replaceTasks)).filter(Boolean);
      const updatedFiles = {};
      changedModified.forEach(c => updatedFiles[c.fullPath] = c.newContent);
      setModifiedContents((p) => ({ ...p, ...updatedFiles }));
      setUnsavedChanges((p) => {
        const next = { ...p };
        for (const path in updatedFiles) next[path] = true;
        return next;
      });
      setPanes((prev) =>
        prev.map((pane) => ({
          ...pane,
          openedTabs: pane.openedTabs.map((tab) => (updatedFiles[tab.id] ? { ...tab, content: updatedFiles[tab.id] } : tab))
        }))
      );
      performGlobalSearch();
    } finally {
      setIsGlobalReplacing(false);
      setGlobalOperationProgress(null);
    }
  };
  const toggleCollapse = (filePath) => setCollapsedFiles((p) => ({ ...p, [filePath]: !p[filePath] }));
  const handleSearchSuggestionClick = async (filePath, lineNumber) => {
    const prefixedFilePath = prefixPath(rootDirectoryName, filePath);
    const targetPaneIndex = panes.findIndex((pane) => pane.openedTabs.some((tab) => tab.id === prefixedFilePath));
    if (targetPaneIndex !== -1) {
      const targetTab = panes[targetPaneIndex].openedTabs.find((t) => t.id === prefixedFilePath);
      setPanes((prev) => {
        const next = [...prev];
        next[targetPaneIndex].openedTabs = next[targetPaneIndex].openedTabs.map((t) =>
          t.id === prefixedFilePath ? { ...t, searchTerm: globalSearchQuery, isSearchOpen: false } : t
        );
        next[targetPaneIndex].activeTabId = targetTab.id;
        return next;
      });
      setActivePaneIndex(targetPaneIndex);
      const ref = editorRefs.current[targetPaneIndex][targetTab.id];
      ref?.current?.jumpToLine?.(lineNumber);
      return;
    }
    try {
      let fileHandle;
      try {
        const rel = prefixedFilePath.replace(`${rootDirectoryName}/`, "");
        fileHandle = await resolveHandleFromPath(rootDirectoryHandle, rel);
      } catch { }
      if (!fileHandle) {
        const [pickedFile] = await window.showOpenFilePicker({ multiple: false, suggestedName: prefixedFilePath.split("/").pop() });
        if (!pickedFile) return;
        fileHandle = pickedFile;
      }
      const fileData = await fileHandle.getFile();
      const content = await fileData.text();
      const fileTypeInfo = getFileTypeInfo(prefixedFilePath);
      const newTabId = prefixedFilePath;
      const existingPaneIndex = panes.findIndex((pane) => pane.openedTabs.some((tab) => tab.id === newTabId));
      if (existingPaneIndex !== -1) {
        const existingTab = panes[existingPaneIndex].openedTabs.find((tab) => tab.id === newTabId);
        setActivePaneIndex(existingPaneIndex);
        setPanes((prev) => {
          const next = [...prev];
          next[existingPaneIndex].openedTabs = next[existingPaneIndex].openedTabs.map((t) =>
            t.id === newTabId ? { ...t, searchTerm: globalSearchQuery, isSearchOpen: false } : t
          );
          next[existingPaneIndex].activeTabId = existingTab.id;
          return next;
        });
        const ref = editorRefs.current[existingPaneIndex][existingTab.id];
        ref?.current?.jumpToLine?.(lineNumber);
        return;
      }
      const newTab = {
        id: newTabId,
        name: prefixedFilePath.split("/").pop(),
        content,
        language: fileTypeInfo.language || "Unknown",
        forceOpen: false,
        searchTerm: globalSearchQuery,
        replaceTerm: "",
        searchPositions: [],
        currentSearchIndex: -1,
        isSearchOpen: false,
        isReplaceOpen: false,
        fileHandle,
        fullPath: prefixedFilePath,
        isMedia: ["image", "video", "audio"].includes(fileTypeInfo.category),
        isAccount: false
      };
      setPanes((prev) => {
        const next = [...prev];
        next[activePaneIndex].openedTabs.push(newTab);
        next[activePaneIndex].activeTabId = newTab.id;
        return next;
      });
      setOriginalContents((p) => ({ ...p, [newTabId]: content }));
      setUnsavedChanges((p) => ({ ...p, [newTabId]: false }));
      setTimeout(() => {
        const ref = editorRefs.current[activePaneIndex][newTab.id];
        ref?.current?.jumpToLine?.(lineNumber);
      }, 100);
    } catch { }
  };
  const copyRelativePathToClipboard = () => {
    if (!contextMenuTarget) return;
    let { path, type } = contextMenuTarget;
    let relativePath = path.replace(rootDirectoryName + "/", "");
    if (relativePath === rootDirectoryName) relativePath = "/";
    if (type === "directory" && !relativePath.endsWith("/")) relativePath += "/";
    navigator.clipboard.writeText(relativePath).finally(() => setContextMenuVisible(false));
  };
  const handleCopy = () => {
    if (!contextMenuTarget) return;
    setCopiedItem({ type: contextMenuTarget.type, path: contextMenuTarget.path });
    setContextMenuVisible(false);
  };
  const pasteOrMoveCommonOptimistic = ({ type, from, toParent, toPath, overwrite }, isMove) => {
    setRepositoryFiles((prev) => {
      let working = prev;
      if (overwrite) working = removeNodeFromTree(working, toPath).nextTree;
      const sourceNode = findNode(working, from);
      if (!sourceNode) return prev;
      const newNode = type === "file"
        ? updateSingleFileNodePath(sourceNode, toPath)
        : cloneNodeWithNewPrefix(sourceNode, from, toPath);
      const inserter = type === "file" ? insertFileAtParent : insertNodeIntoTree;
      let updatedTree = inserter(working, toParent, newNode);
      if (isMove) {
        updatedTree = removeNodeFromTree(updatedTree, from).nextTree;
      }
      return updatedTree;
    });
  };
  const removeOpenedForPath = (path) => {
    setOpenedDirectories(prev => {
      const next = { ...prev };
      const normPath = normalizePath(path);
      const prefix = normPath + "/";
      for (let key in next) {
        const normKey = normalizePath(key);
        if (normKey === normPath || normKey.startsWith(prefix)) {
          delete next[key];
        }
      }
      return next;
    });
  };
  const remapOpenedDirectories = (oldPath, newPath, isCopy) => {
    const oldNorm = normalizePath(oldPath);
    const newNorm = normalizePath(newPath);
    const oldPrefix = oldNorm + "/";
    setOpenedDirectories(prev => {
      const next = { ...prev };
      for (let key in prev) {
        const normKey = normalizePath(key);
        if (normKey === oldNorm || normKey.startsWith(oldPrefix)) {
          const suffix = normKey === oldNorm ? "" : normKey.slice(oldNorm.length + 1);
          const newKey = newNorm + (suffix ? "/" + suffix : "");
          next[newKey] = prev[key];
          if (!isCopy) delete next[key];
        }
      }
      return next;
    });
  };
  const handlePaste = async (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.();
    if (!copiedItem || !contextMenuTarget || !["directory", "navigator"].includes(contextMenuTarget.type)) return;
    if (fsOpLoading) return;
    const targetDirHandle = await getDirectoryHandleByPath(contextMenuTarget.path);
    if (!targetDirHandle) return;
    const itemName = copiedItem.path.split("/").pop();
    const targetPath = normalizePath(`${contextMenuTarget.path}/${itemName}`);
    if (samePath(targetPath, copiedItem.path)) return;
    const exists = await fsEntryExists(targetDirHandle, itemName, copiedItem.type);
    let overwrite = false;
    if (exists) {
      const r = await guardedShowDialog({ title: "Overwrite?", message: `An item named "${itemName}" already exists. Do you want to overwrite it?`, showCancel: true });
      if (r === null) return;
      overwrite = true;
    }
    await withFsOverlay(async () => {
      pasteOrMoveCommonOptimistic({ type: copiedItem.type, from: copiedItem.path, toParent: contextMenuTarget.path, toPath: targetPath, overwrite }, false);
      if (overwrite) removeOpenedForPath(targetPath);
      remapOpenedDirectories(copiedItem.path, targetPath, true);
      try {
        if (copiedItem.type === "file") {
          const src = await getFileHandleByPath(repositoryFilesRef.current, copiedItem.path);
          if (!src) throw new Error("Source file not found");
          const sourceFile = await src.getFile();
          await overwriteFileAtomic(targetDirHandle, itemName, sourceFile);
        } else {
          const sourceDirHandle = await getDirectoryHandleByPath(copiedItem.path);
          if (!sourceDirHandle) throw new Error("Source dir not found");
          if (overwrite) await overwriteDirectoryAtomic(targetDirHandle, itemName, sourceDirHandle);
          else {
            const newDirHandle = await targetDirHandle.getDirectoryHandle(itemName, { create: true });
            await deepCopyDirectoryFast(sourceDirHandle, newDirHandle);
          }
        }
      } catch {
        await guardedShowDialog({ title: "System Alert", message: "An error occurred while pasting the item.", showCancel: false });
      } finally {
        const srcParent = copiedItem.path.split("/").slice(0, -1).join("/") || rootDirectoryName;
        await rescanAndSync([srcParent, contextMenuTarget.path]);
        await hydrateAllOpenedDirectories();
        setContextMenuVisible(false);
      }
    });
  };
  const createNewFile = async () => {
    if (!contextMenuTarget) return;
    const { path, type } = contextMenuTarget;
    const r = await guardedShowDialog({
      title: "Create New File",
      message: "Enter the name of your new file:",
      inputs: [{ name: "fileName", type: "text", label: "", defaultValue: "" }],
      showCancel: true
    });
    let fileName = r?.fileName;
    if (!fileName) return;
    if (!fileName.includes(".")) fileName += ".txt";
    const targetDirPath = type === "file" ? path.split("/").slice(0, -1).join("/") || rootDirectoryName : path;
    const dirHandle = await getDirectoryHandleByPath(targetDirPath);
    if (!dirHandle) return;
    try {
      if (await fsEntryExists(dirHandle, fileName, "file")) {
        await guardedShowDialog({ title: "System Alert", message: `A file named "${fileName}" already exists in this directory.`, showCancel: false });
        return;
      }
      await withFsOverlay(async () => {
        const fullPath = normalizePath(`${targetDirPath}/${fileName}`);
        const newNode = { name: fileName, type: "file", handle: null, fullPath };
        setRepositoryFiles((prev) => insertFileAtParent(prev, targetDirPath, newNode));
        await dirHandle.getFileHandle(fileName, { create: true });
        await rescanAndSync([targetDirPath]);
        setContextMenuVisible(false);
      });
    } catch { }
  };
  const createNewFolder = async () => {
    if (!contextMenuTarget) return;
    const { path } = contextMenuTarget;
    const r = await guardedShowDialog({
      title: "Create New Directory",
      message: "Enter the name of your new directory:",
      inputs: [{ name: "folderName", type: "text", label: "", defaultValue: "" }],
      showCancel: true
    });
    const folderName = r?.folderName;
    if (!folderName) return;
    const dirHandle = await getDirectoryHandleByPath(path);
    if (!dirHandle) return;
    try {
      if (await fsEntryExists(dirHandle, folderName, "directory")) {
        await guardedShowDialog({ title: "System Alert", message: `A folder named "${folderName}" already exists in this directory.`, showCancel: false });
        return;
      }
      await withFsOverlay(async () => {
        const fp = normalizePath(`${path}/${folderName}`);
        const newNode = { name: folderName, type: "directory", handle: null, fullPath: fp, files: [] };
        setRepositoryFiles((prev) => insertNodeIntoTree(prev, path, newNode));
        await dirHandle.getDirectoryHandle(folderName, { create: true });
        await rescanAndSync([path]);
        setContextMenuVisible(false);
      });
    } catch { }
  };
  const renameItem = async () => {
    if (!contextMenuTarget) return;
    const { type: itemType, path } = contextMenuTarget;
    if (path === rootDirectoryName) return;
    const { parent, name: oldName } = splitPath(path);
    const r = await guardedShowDialog({
      title: `Rename ${itemType}`,
      message: `Enter new name for "${oldName}"`,
      inputs: [{ name: "newName", type: "text", label: "", defaultValue: oldName }],
      showCancel: true
    });
    const newName = r?.newName?.trim();
    if (!newName || newName === oldName) return setContextMenuVisible(false);
    const parentDirHandle = await getDirectoryHandleByPath(parent);
    if (!parentDirHandle) return;
    const exists = await fsEntryExists(parentDirHandle, newName, itemType === "directory" ? "directory" : "file");
    let overwrite = false;
    if (exists) {
      const res = await guardedShowDialog({ title: "Overwrite?", message: `An item named "${newName}" already exists here. Overwrite?`, showCancel: true });
      if (res === null) return;
      overwrite = true;
    }
    const newFullPath = normalizePath(`${parent}/${newName}`);
    setRepositoryFiles((prev) => {
      let w = prev;
      if (overwrite) w = deleteNodeFromTree(w, newFullPath);
      if (itemType === "file") {
        const { nextTree, removedNode } = removeNodeFromTree(w, path);
        if (!removedNode) return w;
        return insertFileAtParent(nextTree, parent, updateSingleFileNodePath(removedNode, newFullPath));
      }
      const { nextTree, removedNode } = removeNodeFromTree(w, path);
      if (!removedNode) return w;
      return insertNodeIntoTree(nextTree, parent, cloneNodeWithNewPrefix(removedNode, path, newFullPath));
    });
    if (overwrite) removeOpenedForPath(newFullPath);
    remapOpenedDirectories(path, newFullPath, false);
    await withFsOverlay(async () => {
      try {
        if (itemType === "file") {
          const srcFileHandle = await getFileHandleByPath(repositoryFilesRef.current, path);
          if (!srcFileHandle) throw new Error("Source file not found");
          const srcFile = await srcFileHandle.getFile();
          await overwriteFileAtomic(parentDirHandle, newName, srcFile);
          if (oldName !== newName) {
            try { await parentDirHandle.removeEntry(oldName); } catch { }
          }
        } else {
          const srcDirHandle = await getDirectoryHandleByPath(path);
          if (!srcDirHandle) throw new Error("Source dir not found");
          if (overwrite) await overwriteDirectoryAtomic(parentDirHandle, newName, srcDirHandle);
          else {
            const destDirHandle = await parentDirHandle.getDirectoryHandle(newName, { create: true });
            await deepCopyDirectoryFast(srcDirHandle, destDirHandle);
            if (oldName !== newName) await parentDirHandle.removeEntry(oldName, { recursive: true });
          }
        }
      } catch {
        await guardedShowDialog({ title: "System Alert", message: "Rename failed.", showCancel: false });
      } finally {
        await rescanAndSync([parent]);
        await hydrateAllOpenedDirectories();
        setContextMenuVisible(false);
      }
    });
  };
  const deleteItem = async () => {
    if (!contextMenuTarget) return;
    const { type: itemType, path } = contextMenuTarget;
    const splitted = path.split("/");
    const itemName = splitted.pop();
    const parentPath = splitted.join("/");
    const r = await guardedShowDialog({ title: "Confirm Delete", message: `Are you sure you want to delete the ${itemType} "${itemName}"?`, showCancel: true });
    if (r === null) return;
    const dirHandle = await getDirectoryHandleByPath(parentPath);
    if (!dirHandle) return;
    await withFsOverlay(async () => {
      setRepositoryFiles((prev) => deleteNodeFromTree(prev, path));
      removeOpenedForPath(path);
      try { await dirHandle.removeEntry(itemName, { recursive: itemType === "directory" }); } catch { }
      await rescanAndSync([parentPath]);
      setContextMenuVisible(false);
    });
  };
  const handleContextMenu = (e, target) => {
    e.preventDefault(); e.stopPropagation();
    if (!rootDirectoryName) return;
    setContextMenuVisible(true);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuTarget(target);
  };
  const handleItemDragStart = (e, item) => e.dataTransfer.setData("application/my-app", JSON.stringify({ path: item.fullPath, type: item.type }));
  const handleItemDrop = async (e, targetDirItem) => {
    e.preventDefault(); e.stopPropagation();
    if (fsOpLoading) return;
    const data = e.dataTransfer.getData("application/my-app");
    if (!data) return;
    const { path: sourcePath, type: sourceType } = JSON.parse(data);
    const targetDirHandle = await getDirectoryHandleByPath(targetDirItem.fullPath);
    if (!targetDirHandle) return;
    if (sourceType === "directory" && (targetDirItem.fullPath === sourcePath || targetDirItem.fullPath.startsWith(sourcePath + "/"))) {
      await guardedShowDialog({ title: "System Alert", message: "Cannot move a directory into itself or its subdirectory.", showCancel: false });
      return;
    }
    const itemName = sourcePath.split("/").pop();
    const sourceParentPath = sourcePath.split("/").slice(0, -1).join("/");
    const targetPath = normalizePath(`${targetDirItem.fullPath}/${itemName}`);
    if (samePath(sourcePath, targetPath)) return;
    const exists = await fsEntryExists(targetDirHandle, itemName, sourceType);
    let overwrite = false;
    if (exists) {
      const r = await guardedShowDialog({ title: "Overwrite?", message: `An item named "${itemName}" already exists in the target directory. Do you want to overwrite it?`, showCancel: true });
      if (r === null) return;
      overwrite = true;
    }
    await withFsOverlay(async () => {
      pasteOrMoveCommonOptimistic({ type: sourceType, from: sourcePath, toParent: targetDirItem.fullPath, toPath: targetPath, overwrite }, true);
      if (overwrite) removeOpenedForPath(targetPath);
      remapOpenedDirectories(sourcePath, targetPath, false);
      try {
        if (sourceType === "file") {
          const sourceFileHandle = await getFileHandleByPath(repositoryFilesRef.current, sourcePath);
          if (!sourceFileHandle) throw new Error("Source file handle not found");
          const sourceFile = await sourceFileHandle.getFile();
          await overwriteFileAtomic(targetDirHandle, itemName, sourceFile);
          if (!samePath(sourcePath, targetPath)) {
            const parentDir = await getDirectoryHandleByPath(sourceParentPath);
            try { await parentDir?.removeEntry(itemName); } catch { }
          }
        } else {
          const sourceDirHandle = await getDirectoryHandleByPath(sourcePath);
          if (!sourceDirHandle) throw new Error("Source dir handle not found");
          if (overwrite) await overwriteDirectoryAtomic(targetDirHandle, itemName, sourceDirHandle);
          else {
            const newDirHandle = await targetDirHandle.getDirectoryHandle(itemName, { create: true });
            await deepCopyDirectoryFast(sourceDirHandle, newDirHandle);
          }
          if (!samePath(sourcePath, targetPath)) {
            const parentDir = await getDirectoryHandleByPath(sourceParentPath);
            try { await parentDir?.removeEntry(itemName, { recursive: true }); } catch { }
          }
        }
      } catch {
        await guardedShowDialog({ title: "System Alert", message: "An error occurred while moving the item. Please try again.", showCancel: false });
      } finally {
        await rescanAndSync([sourceParentPath || rootDirectoryName, targetDirItem.fullPath || rootDirectoryName]);
        await hydrateAllOpenedDirectories();
      }
    });
  };
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.1, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.1, 0.5));
  const handleResetZoomLevel = () => setZoomLevel(1);
  const useDragPercent = (isDragging, setIsDragging, calcPct, apply) => ({
    onMouseDown: () => setIsDragging(true),
    onMouseMove: (e) => { if (!isDragging) return; const pct = calcPct(e); apply(pct); },
    onMouseUp: () => setIsDragging(false),
    onMouseLeave: () => setIsDragging(false)
  });
  const widthDrag = useDragPercent(
    isDraggingWidth,
    setIsDraggingWidth,
    (e) => {
      const container = document.querySelector(".dinolabsControlFlex");
      const containerWidth = container.offsetWidth;
      return ((e.clientX - container.getBoundingClientRect().left) / containerWidth) * 100;
    },
    (newDirectoryWidth) => {
      if (newDirectoryWidth > 10 && newDirectoryWidth < 50) {
        setDirectoryWidth(newDirectoryWidth);
        setContentWidth(100 - newDirectoryWidth);
      }
    }
  );
  const paneDrag = useDragPercent(
    isDraggingPane,
    setIsDraggingPane,
    (e) => {
      const container = document.querySelector(".dinolabsMarkdownWrapper");
      const containerWidth = container.offsetWidth;
      return ((e.clientX - container.getBoundingClientRect().left) / containerWidth) * 100;
    },
    (newPaneWidth) => {
      if (newPaneWidth > 25 && newPaneWidth < 75) setPaneWidths({ pane1: newPaneWidth, pane2: 100 - newPaneWidth });
    }
  );
  const renderNavigatorRow = ({ index, style, data }) => {
    const item = data[index];
    if (!item.isVisible) return <div style={{ ...style, display: "none" }} />;
    const indentStyle = { paddingLeft: `${1 + item.level * 1}rem` };
    const baseBg = dragOverId === item.id ? "rgba(255,255,255,0.2)" : item.highlight ? "rgba(255,255,255,0.05)" : undefined;
    const itemClass = `directoryListItem ${item.level > 0 ? "indented" : ""} ${item.level === 0 ? "rootDirectory" : ""} ${unsavedChanges[item.id] ? "dinolabsFileUnsaved" : ""}`;
    if (item.type === "directory") {
      return (
        <div
          style={{ ...style, ...indentStyle, background: baseBg, overflow: "hidden" }}
          className={itemClass}
          draggable
          onDragStart={(e) => handleItemDragStart(e, item)}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setDragOverId(item.id)}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => { setDragOverId(null); handleItemDrop(e, item); }}
          onClick={() => toggleDirectory(item.id)}
          onContextMenu={(e) => handleContextMenu(e, { type: "directory", path: item.id })}
        >
          <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <FontAwesomeIcon icon={item.isOpen ? faAngleDown : faAngleRight} style={{ marginRight: "0.4rem" }} />
            {item.name}
            {unsavedChanges[item.id] && (
              <Tippy content="Unsaved" theme="tooltip-light">
                <span className="dinolabsFileUnsavedDot" />
              </Tippy>
            )}
          </span>
        </div>
      );
    }
    return (
      <div
        style={{ ...style, ...indentStyle, background: baseBg, overflow: "hidden" }}
        className={itemClass}
        draggable
        onDragStart={(e) => handleItemDragStart(e, item)}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => handleFileClick(item)}
        onContextMenu={(e) => handleContextMenu(e, { type: "file", path: item.id })}
      >
        <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
          {unsavedChanges[item.id] && (
            <Tippy content="Unsaved" theme="tooltip-light">
              <span className="dinolabsFileUnsavedDot" />
            </Tippy>
          )}
          {getFileIcon(item.name)}
          {item.name}
        </span>
      </div>
    );
  };
  const renderSearchRow = ({ index, style, data }) => {
    const item = data[index];
    if (!item.isVisible) return <div style={{ ...style, display: "none" }} />;
    const indentStyle = { paddingLeft: `${1 + item.level * 1}rem` };
    const itemClass = `directoryListItem ${item.level > 0 ? "indented" : ""} ${item.level === 0 ? "rootDirectory" : ""}`;
    if (item.type === "directory") {
      return (
        <div style={{ ...style, ...indentStyle, overflow: "hidden" }} className={itemClass} onClick={() => toggleCollapse(item.fullPath)}>
          <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <FontAwesomeIcon icon={item.isOpen ? faAngleDown : faAngleRight} style={{ marginRight: "0.4rem" }} />
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.fullPath}</span>
          </span>
        </div>
      );
    }
    return (
      <div
        style={{ ...style, ...indentStyle, overflow: "hidden" }}
        className={itemClass}
        onClick={() => handleSearchSuggestionClick(item.fullPath, item.lineNumber)}
      >
        <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
          {getFileIcon(item.fullPath.split("/").pop())}
          Line {item.lineNumber}:{" "}
          <span
            style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            dangerouslySetInnerHTML={{ __html: highlightResultSnippet(item.lineContent, globalSearchQuery, isCaseSensitiveSearch) }}
          />
        </span>
      </div>
    );
  };
  const getProgressMessage = () => {
    if (!globalOperationProgress) return "";
    const { type, current, total } = globalOperationProgress;
    const filesStr = total ? `${current}/${total}` : `${current}`;
    if (type === "search") return `Searching ${filesStr} files...`;
    if (type === "count") return `Counting occurrences in ${filesStr} files...`;
    if (type === "replace") return `Replacing in ${filesStr} files...`;
    return "";
  };
  return (
    <div
      className="dinolabsPageWrapper"
      onMouseMove={(e) => { widthDrag.onMouseMove(e); paneDrag.onMouseMove(e); }}
      onMouseUp={() => { widthDrag.onMouseUp(); paneDrag.onMouseUp(); }}
      onMouseLeave={() => { widthDrag.onMouseLeave(); paneDrag.onMouseLeave(); }}
    >
      <DinoLabsNav activePage="dinolabside" />
      {screenSize >= 700 && screenSize <= 5399 && isLoaded ? (
        <div className="dinolabsHeaderContainer">
          <div className="dinolabsControlFlex">
            <div
              className="leadingIDEDirectoryStack"
              style={{ width: `${directoryWidth}%` }}
              ref={directoryRef}
              onContextMenu={(e) => handleContextMenu(e, { type: "navigator", path: rootDirectoryName })}
            >
              <div className="leadingDirectoryTopBar">
                <div className="leadingDirectoryZoomButtonFlex">
                  <Tippy content="Zoom In" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={handleZoomIn} disabled={!rootDirectoryName}>
                      <FontAwesomeIcon icon={faPlusSquare} />
                    </button>
                  </Tippy>
                  <Tippy content="Zoom Out" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={handleZoomOut} disabled={!rootDirectoryName}>
                      <FontAwesomeIcon icon={faMinusSquare} />
                    </button>
                  </Tippy>
                  <Tippy content="Reset View" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={handleResetZoomLevel} disabled={!rootDirectoryName}>
                      <FontAwesomeIcon icon={faRetweet} />
                    </button>
                  </Tippy>
                  <Tippy content="Import a Directory" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={handleLoadRepository}>
                      <FontAwesomeIcon icon={faFolderOpen} />
                    </button>
                  </Tippy>
                  <Tippy content="Import a File" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={handleLoadFile}>
                      <FontAwesomeIcon icon={faCode} />
                    </button>
                  </Tippy>
                </div>
              </div>
              <div className="leadingDirectoryStack">
                <div className="leadingDirectoryTabsWrapper">
                  <button
                    className="leadingDirectoryTabButton"
                    style={{ backgroundColor: isNavigatorState ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.0)" }}
                    onClick={() => { setIsSearchState(!isSearchState); setIsNavigatorState(!isNavigatorState); }}
                  >
                    Navigator
                  </button>
                  <button
                    className="leadingDirectoryTabButton"
                    style={{ backgroundColor: isSearchState ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.0)" }}
                    onClick={() => { setIsSearchState(!isSearchState); setIsNavigatorState(!isNavigatorState); }}
                  >
                    Search
                  </button>
                </div>
                {isNavigatorState && (
                  <div className="leadingDirectorySearchWrapper">
                    <input
                      type="text"
                      className="directorySearchInput"
                      placeholder="Search the directory..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
                {isNavigatorState &&
                  (isNavigatorLoading ? (
                    <div className="leadingDirectoryFilesSupplement" style={{ textAlign: "center" }}>
                      <div className="loading-circle" />
                    </div>
                  ) : (
                    <div className="leadingDirectoryFiles">
                      {rootDirectoryName && (
                        <ul className="leadingDirectoryFileStack">
                          <li className="leadingDirectoryFileStackContent">
                            <div
                              onClick={() => setIsRootOpen(!isRootOpen)}
                              onContextMenu={(e) => handleContextMenu(e, { type: "directory", path: rootDirectoryName })}
                              className="directoryListItemRoot"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleItemDrop(e, { fullPath: rootDirectoryName, type: "directory" })}
                              onDragEnter={() => setDragOverId(rootDirectoryName)}
                              onDragLeave={() => setDragOverId(null)}
                              style={{ background: dragOverId === rootDirectoryName ? "rgba(255,255,255,0.2)" : openedDirectories[rootDirectoryName] ? "rgba(255,255,255,0.05)" : undefined }}
                            >
                              <FontAwesomeIcon icon={isRootOpen ? faAngleDown : faAngleRight} />
                              {rootDirectoryName}
                              {unsavedChanges[rootDirectoryName] && (
                                <Tippy content="Unsaved" theme="tooltip-light">
                                  <span className="dinolabsFileUnsavedDot" />
                                </Tippy>
                              )}
                            </div>
                            {isRootOpen && flattenedDirectoryList.length > 0 && (
                              <div
                                className="nestedDirectoryFileStack"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleItemDrop(e, { fullPath: rootDirectoryName, type: "directory" })}
                                onDragEnter={() => setDragOverId(rootDirectoryName)}
                                onDragLeave={() => setDragOverId(null)}
                              >
                                <List
                                  height={
                                    directoryRef.current
                                      ? directoryRef.current.clientHeight - (100 + (isNavigatorState ? 75 : 0))
                                      : window.innerHeight * 0.4
                                  }
                                  itemCount={flattenedDirectoryList.length}
                                  itemSize={getVirtualizedItemHeight(screenSize)}
                                  width="100%"
                                  itemData={flattenedDirectoryList}
                                  className="nestedDirectoryFileStack"
                                >
                                  {renderNavigatorRow}
                                </List>
                              </div>
                            )}
                          </li>
                        </ul>
                      )}
                    </div>
                  ))}
                {isSearchState && (
                  <div className="leadingDirectoryGlobalSearchWrapper">
                    <div className="leadingDirectoryGlobalSearchFlex">
                      <input
                        type="text"
                        className="leadingDirectoryGlobalSearchInput"
                        placeholder="Search across all files..."
                        value={globalSearchQuery}
                        onChange={(e) => setGlobalSearchQuery(e.target.value)}
                        disabled={isGlobalReplacing}
                      />
                      <div className="leadingDirectoryGlobalSearchTrailingButtons">
                        <Tippy content="Case Sensitive" theme="tooltip-light">
                          <button
                            className="leadingDirectoryGlobalSearchButton"
                            onClick={() => setIsCaseSensitiveSearch(!isCaseSensitiveSearch)}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <FontAwesomeIcon icon={faA} style={{ color: isCaseSensitiveSearch ? "#AD6ADD" : "" }} />
                          </button>
                        </Tippy>
                        <Tippy content="Search Files" theme="tooltip-light">
                          <button className="leadingDirectoryGlobalSearchButton" onClick={performGlobalSearch} disabled={isGlobalSearching || isGlobalReplacing}>
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                          </button>
                        </Tippy>
                      </div>
                    </div>
                    <div className="leadingDirectoryGlobalSearchFlex" style={{ alignItems: "flex-start" }}>
                      <input
                        type="text"
                        className="leadingDirectoryGlobalSearchInput"
                        placeholder="Replace with..."
                        value={globalReplaceTerm}
                        onChange={(e) => setGlobalReplaceTerm(e.target.value)}
                        disabled={isGlobalReplacing}
                      />
                      <div className="leadingDirectoryGlobalSearchTrailingButtons">
                        <Tippy content="Replace Across Files" theme="tooltip-light">
                          <button className="leadingDirectoryGlobalSearchButton" onClick={performGlobalReplace} disabled={!globalSearchQuery || isGlobalSearching || isGlobalReplacing}>
                            <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                          </button>
                        </Tippy>
                      </div>
                    </div>
                  </div>
                )}
                {isSearchState && (
                  <div className="leadingDirectoryFiles">
                    {isGlobalSearching || isGlobalReplacing ? (
                      <div className="leadingDirectoryFilesSupplement" style={{ textAlign: "center" }}>
                        <div className="loading-circle" />
                        <p>{getProgressMessage()}</p>
                      </div>
                    ) : (
                      <List
                        height={directoryRef.current ? directoryRef.current.clientHeight - 250 : window.innerHeight * 0.4}
                        itemCount={flattenedSearchList.length}
                        itemSize={getVirtualizedItemHeight(screenSize)}
                        width="100%"
                        itemData={flattenedSearchList}
                        className="nestedDirectoryFileStack"
                      >
                        {renderSearchRow}
                      </List>
                    )}
                  </div>
                )}
              </div>
              <div className="leadingDirectoryBottomBar">
                <div className="leadingDirectorySettingsButtonFlex" style={{ borderRight: "0.2vh solid rgba(255,255,255,0.1)" }}>
                  <Tippy content="Monitoring" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={() => { navigate("/monitoring"); }}>
                      <FontAwesomeIcon icon={faComputer} style={{ color: "" }} />
                    </button>
                  </Tippy>

                  <Tippy content="Add Ons" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={(() => { navigate("/plugins"); })}>
                      <FontAwesomeIcon icon={faPlusSquare} style={{ color: "" }} />
                    </button>
                  </Tippy>

                  <Tippy content="My Account" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={(() => { navigate("/account"); })}>
                      <FontAwesomeIcon icon={faUserCog} style={{ color: "" }} />
                    </button>
                  </Tippy>

                  <Tippy content="My Team" theme="tooltip-light">
                    <button className="leadingDirectoryZoomButton" onClick={(() => { navigate("/team"); })}>
                      <FontAwesomeIcon icon={faUsersCog} style={{ color: "" }} />
                    </button>
                  </Tippy>
                </div>
              </div>
            </div>

            <div
              className="dinolabsControlStack"
              style={{ width: `${contentWidth}%` }}
              ref={contentRef}
              onMouseDown={widthDrag.onMouseDown}
            >
              <div className="topIDEControlBarWrapper">
                {panes.map((pane, paneIndex) => (
                  <React.Fragment key={`pane-wrapper-${paneIndex}`}>
                    <div
                      className="topIDEControlBar"
                      style={{ height: "100%", width: panes.length > 1 ? `${paneWidths[`pane${paneIndex + 1}`]}%` : "100%" }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, paneIndex)}
                    >
                      {pane.openedTabs.length ? (
                        pane.openedTabs.map((tab) => {
                          editorRefs.current[paneIndex] ??= {};
                          editorRefs.current[paneIndex][tab.id] ??= React.createRef();
                          const cls =
                            pane.activeTabId === tab.id && unsavedChanges[tab.id]
                              ? "activeUnsavedTab"
                              : pane.activeTabId === tab.id
                                ? "activeTab"
                                : unsavedChanges[tab.id]
                                  ? "unsavedTab"
                                  : "";
                          return (
                            <div
                              key={tab.id}
                              className={`dinolabsTabItem ${cls}`}
                              onClick={() => switchTab(paneIndex, tab.id)}
                              draggable
                              onDragStart={(e) => handleDragStart(e, paneIndex, tab.id)}
                              style={{ width: "fit-content" }}
                            >
                              {unsavedChanges[tab.id] && (
                                <Tippy content="Unsaved" theme="tooltip-light">
                                  <span className="dinolabsFileUnsavedDot" />
                                </Tippy>
                              )}

                              {(
                                getFileIcon(tab.name)
                              )}
                              {tab.name}
                              <span
                                className="dinolabsCloseTab"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeTab(paneIndex, tab.id);
                                }}
                              >
                                ×
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="dinolabsTabItem activeTab">
                          <FontAwesomeIcon icon={faWandMagicSparkles} /> Get Started
                        </div>
                      )}
                    </div>
                    {paneIndex < panes.length - 1 && <div className="resizablePaneDivider" />}
                  </React.Fragment>
                ))}
              </div>
              <div
                className="dinolabsMarkdownWrapper"
                onMouseDown={paneDrag.onMouseDown}
              >
                {panes.map((pane, paneIndex) => (
                  <React.Fragment key={`pane-${paneIndex}`}>
                    <div
                      className="dinolabsMarkdownPaneWrapper"
                      style={{ width: panes.length > 1 ? `${paneWidths[`pane${paneIndex + 1}`]}%` : "100%" }}
                      onClick={() => setActivePaneIndex(paneIndex)}
                    >
                      <div className="dinolabsMarkdownPaneFlex">
                        {pane.openedTabs.length ? (
                          pane.openedTabs.map((tab) => (
                            <div key={tab.id} className="dinolabsMarkdownPane" style={{ display: pane.activeTabId === tab.id ? "block" : "none" }}>
                              {tab.isAccount ? (
                                <DinoLabsAccount
                                  onClose={() => closeTab(paneIndex, tab.id)}
                                  keyBinds={keyBinds}
                                  setKeyBinds={setKeyBinds}
                                  zoomLevel={zoomLevel}
                                  setZoomLevel={setZoomLevel}
                                  colorTheme={colorTheme}
                                  setColorTheme={setColorTheme}
                                />
                              ) : tab.isMedia ? (
                                <>
                                  {mediaExtensions.image.includes(tab.fileHandle?.name.split(".").pop()?.toLowerCase() || "") && (
                                    <DinoLabsImageEditor fileHandle={tab.fileHandle} />
                                  )}
                                  {mediaExtensions.video.includes(tab.fileHandle?.name.split(".").pop()?.toLowerCase() || "") && (
                                    <DinoLabsVideoEditor fileHandle={tab.fileHandle} />
                                  )}
                                  {mediaExtensions.audio.includes(tab.fileHandle?.name.split(".").pop()?.toLowerCase() || "") && (
                                    <DinoLabsAudioEditor fileHandle={tab.fileHandle} />
                                  )}
                                  {mediaExtensions.pdf.includes(tab.fileHandle?.name.split(".").pop()?.toLowerCase() || "") && (
                                    <DinoLabsPDFEditor fileHandle={tab.fileHandle} />
                                  )}
                                  {mediaExtensions.threeD.includes(tab.fileHandle?.name.split(".").pop()?.toLowerCase() || "") && (
                                    <DinoLabs3DEditor fileHandle={tab.fileHandle} />
                                  )}
                                </>
                              ) : (
                                <>
                                  {["txt", "md"].includes(tab.fileHandle?.name.split(".").pop()?.toLowerCase() || "") && (
                                    <DinoLabsRichTextEditor fileHandle={tab.fileHandle} keyBinds={keyBinds}
                                      onEdit={(prev, next) => handleEdit(paneIndex, tab.id, prev, next)}
                                      onSave={(newFullCode) => handleSave(paneIndex, tab.id, newFullCode)}
                                    />
                                  )}
                                  {["csv"].includes(tab.fileHandle?.name.split(".").pop()?.toLowerCase() || "") && (
                                    <DinoLabsTabularEditor
                                      fileHandle={tab.fileHandle}
                                      keyBinds={keyBinds}
                                      onEdit={(prev, next) => handleEdit(paneIndex, tab.id, prev, next)}
                                      onSave={(newFullCode) => handleSave(paneIndex, tab.id, newFullCode)}
                                    />
                                  )}


                                  {(!tab.fileHandle ||
                                    !["txt", "md", "csv"].includes(tab.fileHandle.name.split(".").pop()?.toLowerCase() || "")) && (
                                      <DinoLabsMarkdown
                                        fileContent={tab.content}
                                        detectedLanguage={tab.language}
                                        forceOpen={tab.forceOpen}
                                        onForceOpen={() => handleForceOpenTab(paneIndex, tab.id)}
                                        searchTerm={tab.searchTerm}
                                        setSearchTerm={(term) => tabPatch(paneIndex, tab.id, { searchTerm: term })}
                                        replaceTerm={tab.replaceTerm}
                                        setReplaceTerm={(term) => tabPatch(paneIndex, tab.id, { replaceTerm: term })}
                                        searchPositions={tab.searchPositions}
                                        setSearchPositions={(positions) => tabPatch(paneIndex, tab.id, { searchPositions: positions })}
                                        currentSearchIndex={tab.currentSearchIndex}
                                        setCurrentSearchIndex={(index) => tabPatch(paneIndex, tab.id, { currentSearchIndex: index })}
                                        onSplit={splitTab}
                                        disableSplit={panes.length >= 2 || pane.openedTabs.length <= 1 || pane.openedTabs.some((inner) => inner.isMedia || inner.isAccount)}
                                        paneIndex={paneIndex}
                                        tabId={tab.id}
                                        isSearchOpen={tab.isSearchOpen}
                                        isReplaceOpen={tab.isReplaceOpen}
                                        setTabSearchOpen={(isOpen) => tabPatch(paneIndex, tab.id, { isSearchOpen: isOpen })}
                                        setTabReplaceOpen={(isOpen) => tabPatch(paneIndex, tab.id, { isReplaceOpen: isOpen })}
                                        ref={editorRefs.current[paneIndex][tab.id]}
                                        onEdit={(prevState, newState) => handleEdit(paneIndex, tab.id, prevState, newState)}
                                        onSave={(newFullCode) => handleSave(paneIndex, tab.id, newFullCode)}
                                        fileHandle={tab.fileHandle}
                                        isGlobalSearchActive={!!globalSearchQuery}
                                        keyBinds={keyBinds}
                                        colorTheme={colorTheme}
                                        zoomLevel={zoomLevel}
                                      />
                                    )}
                                </>
                              )}
                            </div>
                          ))
                        ) : (
                          <DinoLabsNoFileSelected
                            handleLoadRepository={handleLoadRepository}
                            handleLoadFile={handleLoadFile}
                            isPlotRendered={isPlotRendered}
                            personalUsageByDay={personalUsageByDay}
                            usageLanguages={usageLanguages}
                          />
                        )}
                      </div>
                    </div>
                    {paneIndex < panes.length - 1 && <div className="resizablePaneDivider" onMouseDown={paneDrag.onMouseDown} />}
                  </React.Fragment>
                ))}
              </div>
              <div className="bottomIDEControlBar" />
            </div>
          </div>
        </div>
      ) : !isLoaded ? (
        <DinoLabsLoading />
      ) : (
        <DinoLabsUnavailable screenSize={screenSize} />
      )}
      {fsOpLoading && (
        <div
          style={{
            position: "fixed",
            height: "100vh",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="loading-circle" />
        </div>
      )}
      {screenSize >= 700 && screenSize <= 5399 && contextMenuVisible && (
        <ul className="dinolabsContextMenu" ref={contextMenuRef} style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}>
          <li className="dinolabsContextMenuItem" onClick={createNewFile}>Add File</li>
          <li className="dinolabsContextMenuItem" onClick={createNewFolder}>Add Folder</li>
          {(contextMenuTarget?.type === "file" || contextMenuTarget?.type === "directory") && (
            <li className="dinolabsContextMenuItem" onClick={handleCopy}>Copy</li>
          )}
          {(contextMenuTarget?.type === "directory" || contextMenuTarget?.type === "navigator") && copiedItem && (
            <li className="dinolabsContextMenuItem" onClick={handlePaste}>Paste</li>
          )}
          {(contextMenuTarget?.type === "file" || contextMenuTarget?.type === "directory") && (
            <li className="dinolabsContextMenuItem" onClick={renameItem}>Rename</li>
          )}
          {(contextMenuTarget?.type === "file" || contextMenuTarget?.type === "directory") && (
            <li className="dinolabsContextMenuItem" onClick={deleteItem}>Delete</li>
          )}
          <li className="dinolabsContextMenuItem" style={{ border: "none" }} onClick={copyRelativePathToClipboard}>Copy Relative Path</li>
        </ul>
      )}
    </div>
  );
};
export default DinoLabs;