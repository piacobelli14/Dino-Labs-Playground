import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUniversalAccess,
  faClipboardCheck,
  faBug,
  faEye,
  faHeading,
  faKeyboard,
  faWandMagicSparkles,
  faTriangleExclamation,
  faArrowsRotate,
  faDownload,
  faCopy,
  faLink,
  faBroom,
  faChevronDown,
  faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/DinoLabsNav";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsA11yInspector/DinoLabsPluginsA11yInspector.css";

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const toHex = (n) => n.toString(16).padStart(2, "0");
const hex = (r, g, b) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

const parseRGB = (s) => {
  if (!s) return { r: 0, g: 0, b: 0, a: 1 };
  if (s.startsWith("#")) {
    const h = s.slice(1);
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b, a: 1 };
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (!m) return { r: 0, g: 0, b: 0, a: 1 };
  const parts = m[1].split(",").map((t) => t.trim());
  const r = parseFloat(parts[0]);
  const g = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  const a = parts[3] != null ? parseFloat(parts[3]) : 1;
  return { r, g, b, a: isNaN(a) ? 1 : a };
};
const srgb2lin = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminance = (rgb) => 0.2126 * srgb2lin(rgb.r) + 0.7152 * srgb2lin(rgb.g) + 0.0722 * srgb2lin(rgb.b);
const contrastRatio = (fg, bg) => {
  const L1 = luminance(fg), L2 = luminance(bg);
  const [a, b] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
};
const rgbToHsl = ({ r, g, b }) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
};
const hslToRgb = ({ h, s, l }) => {
  h = ((h % 360) + 360) % 360;
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - C / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = C; g1 = X; }
  else if (h < 120) { r1 = X; g1 = C; }
  else if (h < 180) { g1 = C; b1 = X; }
  else if (h < 240) { g1 = X; b1 = C; }
  else if (h < 300) { r1 = X; b1 = C; }
  else { r1 = C; b1 = X; }
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
};
const adjustTextForContrast = (fgHex, bgHex, target = 4.5) => {
  let fg = parseRGB(fgHex), bg = parseRGB(bgHex);
  let hsl = rgbToHsl(fg);
  const startIsLight = luminance(fg) > luminance(bg);
  for (let i = 0; i < 40; i++) {
    const ratio = contrastRatio(fg, bg);
    if (ratio >= target) break;
    hsl.l = clamp(hsl.l + (startIsLight ? -0.03 : 0.03), 0, 1);
    fg = hslToRgb(hsl);
  }
  return hex(fg.r, fg.g, fg.b);
};

const elPath = (el) => {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 6) {
    const tag = node.tagName.toLowerCase();
    const id = node.id ? `#${node.id}` : "";
    const cls = node.className && typeof node.className === "string"
      ? "." + node.className.trim().split(/\s+/).slice(0, 2).join(".")
      : "";
    parts.unshift(`${tag}${id}${cls}`);
    node = node.parentElement;
  }
  return parts.join(" > ");
};
const isVisible = (el) => {
  if (!(el instanceof Element)) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none" || el.getClientRects().length === 0) return false;
  return true;
};
const getEffectiveBg = (el) => {
  let node = el;
  while (node && node instanceof Element) {
    const rgba = parseRGB(getComputedStyle(node).backgroundColor);
    if (rgba.a > 0) return rgba;
    node = node.parentElement;
  }
  return parseRGB("#ffffff");
};
const largeTextAA = (cs) => {
  const size = parseFloat(cs.fontSize);
  const weight = parseInt(cs.fontWeight, 10);
  return size >= 24 || (size >= 18.66 && weight >= 700);
};
const focusableSelector = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[tabindex]",
  "[contenteditable=\"true\"]",
  "summary"
].join(",");

const scanStylesheets = (docLike = document) => {
  let hasKeyframes = false;
  let hasPrefersReduced = false;
  try {
    const base = docLike.styleSheets || (docLike.ownerDocument && docLike.ownerDocument.styleSheets) || document.styleSheets;
    for (const sheet of Array.from(base)) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule.type === CSSRule.MEDIA_RULE && String(rule.media).includes("prefers-reduced-motion")) hasPrefersReduced = true;
        if (rule.type === CSSRule.KEYFRAMES_RULE) hasKeyframes = true;
      }
    }
  } catch {}
  return { hasKeyframes, hasPrefersReduced };
};

const ensureStyle = (id, css, docLike = document) => {
  const root = docLike.head ? docLike : (docLike.ownerDocument ? docLike.ownerDocument : document);
  let el = root.getElementById ? root.getElementById(id) : null;
  if (!el && root.querySelector) el = root.querySelector(`#${id}`);
  if (!el) {
    el = (root.ownerDocument || root).createElement("style");
    el.id = id;
    if (root.head) root.head.appendChild(el);
    else root.appendChild(el);
  }
  el.textContent = css;
};
const removeStyle = (id, docLike = document) => {
  const root = docLike.head ? docLike : (docLike.ownerDocument ? docLike.ownerDocument : document);
  let el = root.getElementById ? root.getElementById(id) : null;
  if (!el && root.querySelector) el = root.querySelector(`#${id}`);
  if (el && el.remove) el.remove();
};

const prepareHtmlForPreview = (raw) => {
  if (!raw) return "";
  let html = String(raw);

  const hasDevBits = /@vite|import\.meta\.hot|vite-plugin-react|__vite__/i.test(html);
  if (hasDevBits) {
    html = html
      .replace(/<script[^>]*src="[^"]*@vite[^"]*"[^>]*>\s*<\/script>/gi, "")
      .replace(/<script[^>]*src="[^"]*__vite__[^"]*"[^>]*>\s*<\/script>/gi, "")
      .replace(/<script[^>]*type="module"[^>]*>[\s\S]*?<\/script>/gi, "");
  }
  if (!/<base\b/i.test(html)) {
    const base = `<base href="${location.origin}/">`;
    html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${base}`);
  }
  return html;
};

const Section = ({ icon, title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="dinolabsQAInspectorCard">
      <button className="dinolabsQAInspectorSectionHeader" onClick={() => setOpen((v) => !v)}>
        <FontAwesomeIcon icon={icon} />
        <span className="dinolabsQAInspectorBtnLabel">{title}</span>
        <FontAwesomeIcon className="dinolabsQAInspectorChevron" icon={open ? faChevronDown : faChevronRight} />
      </button>
      {open && <div className="dinolabsQAInspectorSectionBody">{children}</div>}
    </div>
  );
};

const Chip = ({ label, value, tone }) => (
  <div className={`dinolabsQAInspectorChip ${tone || ""}`}>
    <div className="dinolabsQAInspectorChipValue">{value}</div>
    <div className="dinolabsQAInspectorChipLabel">{label}</div>
  </div>
);

const Row = ({ path, message, tone }) => (
  <div className={`dinolabsQAInspectorRow ${tone || ""}`}>
    <div className="dinolabsQAInspectorRowMsg">{message}</div>
    <div className="dinolabsQAInspectorPath">{path}</div>
  </div>
);

const DinoLabsPluginsA11yInspector = () => {
  const [targetSel, setTargetSel] = useState("document");
  const [report, setReport] = useState(null);
  const [highlightOn, setHighlightOn] = useState(true);
  const [fixCounts, setFixCounts] = useState({});

  const [uploadHtml, setUploadHtml] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const fileRef = useRef(null);

  const rootDoc = useMemo(() => {
    if (targetSel === "document") return document;
    const host = document.querySelector(targetSel);
    if (!host) return document;
    if (host.tagName && host.tagName.toLowerCase() === "iframe" && host.contentDocument) return host.contentDocument;
    return host.shadowRoot || host.ownerDocument || document;
  }, [targetSel]);

  const runScan = useCallback(() => {
    const docLike = rootDoc;

    try {
      ensureStyle(
        "dinolabsQAInspectorMarkers",
        `.dinolabsQAInspectorOutlineBad{outline:2px solid #ff6b6b !important;outline-offset:2px !important;}
         .dinolabsQAInspectorOutlineWarn{outline:2px solid #f0b95d !important;outline-offset:2px !important;}`,
        docLike
      );
    } catch {}

    Array.from(docLike.querySelectorAll(".dinolabsQAInspectorOutlineBad,.dinolabsQAInspectorOutlineWarn")).forEach((el) => {
      el.classList.remove("dinolabsQAInspectorOutlineBad", "dinolabsQAInspectorOutlineWarn");
    });

    const imgs = Array.from(docLike.querySelectorAll("img"));
    const imgIssues = [];
    for (const img of imgs) {
      if (!isVisible(img)) continue;
      const alt = img.getAttribute("alt");
      const role = img.getAttribute("role");
      if (alt == null || alt === "") {
        const decorative = role === "presentation" || img.getAttribute("aria-hidden") === "true";
        if (!decorative) {
          imgIssues.push({ path: elPath(img), src: img.currentSrc || img.src || "", message: "Missing Alt Text." });
          if (highlightOn) img.classList.add("dinolabsQAInspectorOutlineBad");
        }
      }
    }

    const headings = Array.from(docLike.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    const headingOutline = headings.map((h) => ({
      level: parseInt(h.tagName[1], 10),
      text: (h.textContent || "").trim().slice(0, 120),
      path: elPath(h)
    }));
    const headingIssues = [];
    if (headings.length) {
      const h1s = headings.filter((h) => h.tagName.toLowerCase() === "h1");
      if (h1s.length > 1) {
        headingIssues.push({ type: "structure", message: `Multiple H1 (${h1s.length}).`, paths: h1s.map(elPath) });
        if (highlightOn) h1s.forEach((h) => h.classList.add("dinolabsQAInspectorOutlineWarn"));
      }
      let prev = headingOutline[0].level;
      for (let i = 1; i < headingOutline.length; i++) {
        const cur = headingOutline[i].level;
        if (cur - prev > 1) {
          headingIssues.push({ type: "jump", message: `Heading Level Jump ${prev} → ${cur}.`, path: headingOutline[i].path });
          const el = headings[i];
          if (highlightOn) el.classList.add("dinolabsQAInspectorOutlineWarn");
        }
        prev = cur;
      }
    }

    const focusables = Array.from(docLike.querySelectorAll(focusableSelector)).filter((el) => isVisible(el));
    const tabIssues = [];
    const positiveTabIndex = focusables.filter((el) => el.tabIndex > 0);
    for (const el of positiveTabIndex) {
      tabIssues.push({ type: "tabindex", message: `Positive Tabindex (${el.tabIndex}).`, path: elPath(el) });
      if (highlightOn) el.classList.add("dinolabsQAInspectorOutlineWarn");
    }
    const clickableDivs = Array.from(docLike.querySelectorAll("div,span"))
      .filter((el) => isVisible(el) && (el.onclick || el.getAttribute("role") === "button"))
      .filter((el) => !el.hasAttribute("tabindex"));
    for (const el of clickableDivs) {
      tabIssues.push({ type: "keyboard", message: "Clickable Element Missing Keyboard Access.", path: elPath(el) });
      if (highlightOn) el.classList.add("dinolabsQAInspectorOutlineWarn");
    }

    const ariaIssues = [];
    const validAria = new Set([
      "aria-label","aria-labelledby","aria-describedby","aria-hidden","aria-expanded","aria-pressed","aria-current","aria-checked","aria-selected","aria-live","aria-modal","aria-controls","aria-required","aria-invalid","aria-valuenow","aria-valuemin","aria-valuemax","aria-role","role"
    ]);
    const all = Array.from(docLike.querySelectorAll("*"));
    for (const el of all) {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith("aria-") && !validAria.has(attr.name)) {
          ariaIssues.push({ type: "unknown-aria", message: `Unknown ARIA Attribute “${attr.name}”.`, path: elPath(el) });
          if (highlightOn) el.classList.add("dinolabsQAInspectorOutlineWarn");
        }
      }
    }
    const unlabeled = Array.from(docLike.querySelectorAll("button,a[href],input[type=\"button\"],input[type=\"submit\"]"))
      .filter(isVisible)
      .filter((el) => {
        const hasText = (el.textContent || "").trim().length > 0;
        const lab = el.getAttribute("aria-label") || el.getAttribute("title");
        const labelledby = el.getAttribute("aria-labelledby");
        return !hasText && !lab && !labelledby;
      });
    for (const el of unlabeled) {
      ariaIssues.push({ type: "name", message: "Interactive Control Has No Accessible Name.", path: elPath(el) });
      if (highlightOn) el.classList.add("dinolabsQAInspectorOutlineBad");
    }

    const textSelector = "p,span,a,button,input,textarea,select,label,li,small,code,strong,em,blockquote,h1,h2,h3,h4,h5,h6";
    const textNodes = Array.from(docLike.querySelectorAll(textSelector)).filter(isVisible);
    const contrastIssues = [];
    for (const el of textNodes) {
      const cs = getComputedStyle(el);
      const text = (el.textContent || "").trim();
      if (!text) continue;
      const fg = parseRGB(cs.color);
      const bg = getEffectiveBg(el);
      const ratio = +contrastRatio(fg, bg).toFixed(2);
      const target = largeTextAA(cs) ? 3 : 4.5;
      if (isFinite(ratio) && ratio < target) {
        contrastIssues.push({
          type: "contrast",
          ratio,
          threshold: target,
          color: hex(fg.r, fg.g, fg.b),
          background: hex(bg.r, bg.g, bg),
          sample: text.slice(0, 60),
          path: elPath(el)
        });
        if (highlightOn) el.classList.add("dinolabsQAInspectorOutlineBad");
      }
    }

    const styleScan = scanStylesheets(docLike);
    let removesFocusStyle = false;
    try {
      const base = docLike.styleSheets || (docLike.ownerDocument && docLike.ownerDocument.styleSheets) || document.styleSheets;
      for (const sheet of Array.from(base)) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (rule.selectorText && /:focus(?!-within|-visible)/.test(rule.selectorText) && /outline\s*:\s*none|0/i.test(rule.cssText)) {
            removesFocusStyle = true; break;
          }
        }
        if (removesFocusStyle) break;
      }
    } catch {}

    const totals = { images: imgs.length, headings: headings.length, focusables: focusables.length, textNodes: textNodes.length };
    setReport({
      scope: targetSel,
      totals,
      images: { missingAlt: imgIssues.length, issues: imgIssues },
      headings: { outline: headingOutline, issues: headingIssues },
      keyboard: { positives: positiveTabIndex.length, clickDivs: clickableDivs.length, issues: tabIssues },
      aria: { unlabeled: unlabeled.length, issues: ariaIssues },
      contrast: { violations: contrastIssues.length, issues: contrastIssues },
      motion: { hasKeyframes: styleScan.hasKeyframes, hasPrefersReducedMotion: styleScan.hasPrefersReduced },
      focus: { removesFocusStyle },
      timestamp: new Date().toISOString()
    });
  }, [rootDoc, targetSel, highlightOn]);

  useEffect(() => { runScan(); }, []);

  const fixFocusRing = () => {
    ensureStyle("dinolabsQAInspectorFocusRing", `
:where(a,button,input,select,textarea,[tabindex]):focus-visible {
  outline: 2px solid #8ab4f8 !important;
  outline-offset: 2px !important;
  box-shadow: none !important;
}
:where(a,button,input,select,textarea,[tabindex]):focus { outline-color: #8ab4f8 !important; }
`, rootDoc);
  };
  const fixReducedMotion = () => {
    ensureStyle("dinolabsQAInspectorReduceMotion", `
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`, rootDoc);
  };
  const fixPositiveTabIndex = () => {
    const docLike = rootDoc;
    let changed = 0;
    Array.from(docLike.querySelectorAll(focusableSelector)).forEach((el) => {
      if (el.tabIndex > 0) { el.setAttribute("data-qa-prev-tabindex", String(el.tabIndex)); el.tabIndex = 0; changed++; }
    });
    setFixCounts((c) => ({ ...c, fixPositiveTabIndex: changed }));
  };
  const fixUnlabeledControls = () => {
    const docLike = rootDoc;
    let changed = 0;
    Array.from(docLike.querySelectorAll("button,a[href],input[type=\"button\"],input[type=\"submit\"]"))
      .filter(isVisible)
      .forEach((el) => {
        const hasText = (el.textContent || "").trim().length > 0;
        const lab = el.getAttribute("aria-label") || el.getAttribute("title");
        const labelledby = el.getAttribute("aria-labelledby");
        if (!hasText && !lab && !labelledby) {
          const guess = el.getAttribute("title") || el.getAttribute("data-icon") || el.getAttribute("name") || "Button";
          el.setAttribute("aria-label", guess);
          el.setAttribute("data-qa-added-label", "true");
          changed++;
        }
      });
    setFixCounts((c) => ({ ...c, fixUnlabeledControls: changed }));
  };
  const fixMissingAlt = () => {
    const docLike = rootDoc;
    let changed = 0;
    Array.from(docLike.querySelectorAll("img")).forEach((img) => {
      const alt = img.getAttribute("alt");
      const role = img.getAttribute("role");
      const decorative = role === "presentation" || img.getAttribute("aria-hidden") === "true";
      if ((alt == null || alt === "") && !decorative) {
        img.setAttribute("alt", "");
        img.setAttribute("data-qa-added-alt", "true");
        changed++;
      }
    });
    setFixCounts((c) => ({ ...c, fixMissingAlt: changed }));
  };
  const fixContrast = () => {
    const docLike = rootDoc;
    let changed = 0;
    const textSelector = "p,span,a,button,input,textarea,select,label,li,small,code,strong,em,blockquote,h1,h2,h3,h4,h5,h6";
    Array.from(docLike.querySelectorAll(textSelector))
      .filter(isVisible)
      .forEach((el) => {
        const cs = getComputedStyle(el);
        const text = (el.textContent || "").trim();
        if (!text) return;
        const fg = parseRGB(cs.color);
        const bg = getEffectiveBg(el);
        const ratio = contrastRatio(fg, bg);
        const target = largeTextAA(cs) ? 3 : 4.5;
        if (ratio < target) {
          el.setAttribute("data-qa-prev-color", cs.color);
          el.style.color = adjustTextForContrast(hex(fg.r, fg.g, fg.b), hex(bg.r, bg.g, bg), target);
          changed++;
        }
      });
    setFixCounts((c) => ({ ...c, fixContrast: changed }));
  };
  const applyAllFixes = () => { fixFocusRing(); fixReducedMotion(); fixPositiveTabIndex(); fixUnlabeledControls(); fixMissingAlt(); fixContrast(); };
  const resetInjectedFixes = () => {
    removeStyle("dinolabsQAInspectorFocusRing", rootDoc);
    removeStyle("dinolabsQAInspectorReduceMotion", rootDoc);
    const docLike = rootDoc;
    Array.from(docLike.querySelectorAll("[data-qa-prev-color]")).forEach((el) => { el.style.color = el.getAttribute("data-qa-prev-color") || ""; el.removeAttribute("data-qa-prev-color"); });
    Array.from(docLike.querySelectorAll("[data-qa-added-label]")).forEach((el) => { el.removeAttribute("aria-label"); el.removeAttribute("data-qa-added-label"); });
    Array.from(docLike.querySelectorAll("[data-qa-added-alt]")).forEach((el) => { el.removeAttribute("alt"); el.removeAttribute("data-qa-added-alt"); });
    Array.from(docLike.querySelectorAll("[data-qa-prev-tabindex]")).forEach((el) => {
      const prev = parseInt(el.getAttribute("data-qa-prev-tabindex") || "0", 10);
      el.tabIndex = prev; el.removeAttribute("data-qa-prev-tabindex");
    });
    setFixCounts({});
  };

  const jsonReport = useMemo(() => (report ? JSON.stringify(report, null, 2) : "{}"), [report]);
  const mdReport = useMemo(() => {
    if (!report) return "";
    const { images, headings, keyboard, aria, contrast, motion, focus, totals, scope, timestamp } = report;
    const hdr = `# Accessibility And QA Report\nScope: **${scope}**\nWhen: ${timestamp}\n\nTotals: Images ${totals.images}, Headings ${totals.headings}, Focusables ${totals.focusables}, Text Nodes ${totals.textNodes}\n`;
    const section = (title, items, formatter) => (!items || !items.length ? `\n## ${title}\n- No Issues Found.\n` : `\n## ${title}\n${items.map(formatter).join("\n")}\n`);
    const imageSec = section("Images (Alt Text)", images.issues, (i) => `- ${i.message} — \`${i.path}\``);
    const headingSec = section("Headings", headings.issues, (i) => `- ${i.message} — \`${i.path || i.paths?.join(", ")}\``);
    const kbSec = section("Keyboard And Tab Order", keyboard.issues, (i) => `- ${i.message} — \`${i.path}\``);
    const ariaSec = section("ARIA And Names", aria.issues, (i) => `- ${i.message} — \`${i.path}\``);
    const contrastSec = section("Color Contrast", contrast.issues, (i) => `- Ratio **${i.ratio}** (Needs ${i.threshold}) — \`${i.path}\` “${i.sample}”`);
    const motionSec = `\n## Motion And Focus\n- Keyframes Present: **${motion.hasKeyframes ? "Yes" : "No"}**\n- Prefers-Reduced-Motion Styles: **${motion.hasPrefersReducedMotion ? "Yes" : "No"}**\n- Styles Removing Focus Outlines: **${focus.removesFocusStyle ? "Yes" : "No"}**\n`;
    return `${hdr}${imageSec}${headingSec}${kbSec}${ariaSec}${contrastSec}${motionSec}`;
  }, [report]);

  const download = (name, text) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); } catch {} };

  const handleChooseFile = () => fileRef.current?.click();
  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setUploadName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadHtml(prepareHtmlForPreview(String(reader.result || "")));
      setTargetSel("iframe#dinolabsQAUploadFrame");
    };
    reader.readAsText(f);
  };
  const clearUpload = () => {
    setUploadHtml(null);
    setUploadName("");
    setTargetSel("document");
  };
  const useUploadTarget = () => {
    setTargetSel("iframe#dinolabsQAUploadFrame");
    setTimeout(() => runScan(), 0);
  };

  return (
    <div className="dinolabsQAInspectorApp" tabIndex={0}>
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsQAInspectorShell">
        <aside className="dinolabsQAInspectorSidebar">
          <div className="dinolabsQAInspectorPanel">
            <div className="dinolabsQAInspectorPanelTitle">
              <FontAwesomeIcon icon={faUniversalAccess} />
              <span>Accessibility And QA Inspector</span>
            </div>
            <input
              className="dinolabsQAInspectorInput"
              value={targetSel}
              onChange={(e) => setTargetSel(e.target.value)}
              placeholder={"Document Or CSS Selector (e.g., “#app” Or “iframe#preview”)."}
            />
            <div className="dinolabsQAInspectorBtnRow">
              <button className="dinolabsQAInspectorBtn" onClick={runScan}>
                <FontAwesomeIcon icon={faClipboardCheck} />
                <span className="dinolabsQAInspectorBtnLabel">Scan</span>
              </button>
              <button className="dinolabsQAInspectorBtn subtle" onClick={() => setHighlightOn((v) => !v)}>
                <FontAwesomeIcon icon={faEye} />
                <span className="dinolabsQAInspectorBtnLabel">{highlightOn ? "Hide Highlights" : "Show Highlights"}</span>
              </button>
              <button className="dinolabsQAInspectorBtn subtle" onClick={() => setTargetSel("document")}>
                <FontAwesomeIcon icon={faLink} />
                <span className="dinolabsQAInspectorBtnLabel">Use Document</span>
              </button>
            </div>
          </div>

          <div className="dinolabsQAInspectorPanel">
            <div className="dinolabsQAInspectorPanelTitle">
              <FontAwesomeIcon icon={faLink} />
              <span>Upload HTML</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm,text/html,application/xhtml+xml"
              style={{ display: "none" }}
              onChange={handleFile}
            />
            <div className="dinolabsQAInspectorBtnRow">
              <button className="dinolabsQAInspectorBtn" onClick={handleChooseFile}>
                <FontAwesomeIcon icon={faLink} />
                <span className="dinolabsQAInspectorBtnLabel">Choose HTML</span>
              </button>
              {uploadHtml && (
                <>
                  <button className="dinolabsQAInspectorBtn subtle" onClick={useUploadTarget}>
                    <FontAwesomeIcon icon={faEye} />
                    <span className="dinolabsQAInspectorBtnLabel">Use Upload Preview</span>
                  </button>
                  <button className="dinolabsQAInspectorBtn subtle" onClick={clearUpload}>
                    <FontAwesomeIcon icon={faBroom} />
                    <span className="dinolabsQAInspectorBtnLabel">Clear</span>
                  </button>
                </>
              )}
            </div>
            {uploadName && (
              <div className="dinolabsQAInspectorFixCounts">
                <div className="dinolabsQAInspectorFixCountItem">
                  Loaded: <b>{uploadName}</b>
                </div>
              </div>
            )}
          </div>

          <div className="dinolabsQAInspectorPanel">
            <div className="dinolabsQAInspectorPanelTitle">
              <FontAwesomeIcon icon={faWandMagicSparkles} />
              <span>One-Click Fixes</span>
            </div>
            <div className="dinolabsQAInspectorBtnGrid">
              <button className="dinolabsQAInspectorBtn" onClick={fixFocusRing}>
                <FontAwesomeIcon icon={faKeyboard} />
                <span className="dinolabsQAInspectorBtnLabel">Add Focus Rings</span>
              </button>
              <button className="dinolabsQAInspectorBtn" onClick={fixReducedMotion}>
                <FontAwesomeIcon icon={faBroom} />
                <span className="dinolabsQAInspectorBtnLabel">Reduce Motion</span>
              </button>
              <button className="dinolabsQAInspectorBtn" onClick={fixPositiveTabIndex}>
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span className="dinolabsQAInspectorBtnLabel">Normalize Positive Tabindex</span>
              </button>
              <button className="dinolabsQAInspectorBtn" onClick={fixUnlabeledControls}>
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span className="dinolabsQAInspectorBtnLabel">Label Icon-Only Controls</span>
              </button>
              <button className="dinolabsQAInspectorBtn" onClick={fixMissingAlt}>
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span className="dinolabsQAInspectorBtnLabel">Add Empty Alt To Missing</span>
              </button>
              <button className="dinolabsQAInspectorBtn" onClick={fixContrast}>
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span className="dinolabsQAInspectorBtnLabel">Auto-Tune Low Contrast</span>
              </button>
            </div>
            <div className="dinolabsQAInspectorBtnRow">
              <button className="dinolabsQAInspectorBtn" onClick={() => { fixFocusRing(); fixReducedMotion(); fixPositiveTabIndex(); fixUnlabeledControls(); fixMissingAlt(); fixContrast(); }}>
                <FontAwesomeIcon icon={faWandMagicSparkles} />
                <span className="dinolabsQAInspectorBtnLabel">Apply All</span>
              </button>
              <button className="dinolabsQAInspectorBtn subtle" onClick={resetInjectedFixes}>
                <FontAwesomeIcon icon={faArrowsRotate} />
                <span className="dinolabsQAInspectorBtnLabel">Reset Fixes</span>
              </button>
            </div>
            {Object.keys(fixCounts).length > 0 && (
              <div className="dinolabsQAInspectorFixCounts">
                {Object.entries(fixCounts).map(([k, v]) => (
                  <div key={k} className="dinolabsQAInspectorFixCountItem">{k}: <b>{v}</b></div>
                ))}
              </div>
            )}
          </div>

          <div className="dinolabsQAInspectorPanel">
            <div className="dinolabsQAInspectorPanelTitle">
              <FontAwesomeIcon icon={faBug} />
              <span>Export Report</span>
            </div>
            <div className="dinolabsQAInspectorBtnRow">
              <button className="dinolabsQAInspectorBtn" onClick={() => copy(jsonReport)}>
                <FontAwesomeIcon icon={faCopy} />
                <span className="dinolabsQAInspectorBtnLabel">Copy JSON</span>
              </button>
              <button className="dinolabsQAInspectorBtn" onClick={() => download("a11y-report.json", jsonReport)}>
                <FontAwesomeIcon icon={faDownload} />
                <span className="dinolabsQAInspectorBtnLabel">Download JSON</span>
              </button>
            </div>
            <div className="dinolabsQAInspectorBtnRow">
              <button className="dinolabsQAInspectorBtn" onClick={() => copy(mdReport)}>
                <FontAwesomeIcon icon={faCopy} />
                <span className="dinolabsQAInspectorBtnLabel">Copy Markdown</span>
              </button>
              <button className="dinolabsQAInspectorBtn" onClick={() => download("a11y-report.md", mdReport)}>
                <FontAwesomeIcon icon={faDownload} />
                <span className="dinolabsQAInspectorBtnLabel">Download Markdown</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="dinolabsQAInspectorMain">
          <div className="dinolabsQAInspectorTopBar">
            <div className="dinolabsQAInspectorTopTitle">
              <FontAwesomeIcon icon={faClipboardCheck} />
              <span>Results</span>
            </div>
            <button className="dinolabsQAInspectorBtn subtle" onClick={runScan}>
              <FontAwesomeIcon icon={faClipboardCheck} />
              <span className="dinolabsQAInspectorBtnLabel">Re-Scan</span>
            </button>
          </div>

          {uploadHtml && (
            <div className="dinolabsQAInspectorCard">
              <div className="dinolabsQAInspectorPanelTitle">
                <FontAwesomeIcon icon={faEye} />
                <span>Upload Preview</span>
              </div>
              <iframe
                id="dinolabsQAUploadFrame"
                title="Upload Preview"
                srcDoc={uploadHtml}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                style={{ width: "100%", height: "520px", border: "1px solid var(--ua-border-2)", borderRadius: "8px", background: "#ffffff" }}
                onLoad={() => {
                  if (String(targetSel).includes("#dinolabsQAUploadFrame")) runScan();
                }}
              />
            </div>
          )}

          <div className="dinolabsQAInspectorStack">
            {!report && (
              <div className="dinolabsQAInspectorCard">
                <div className="dinolabsQAInspectorEmpty">Run A Scan To See Results.</div>
              </div>
            )}

            {report && (
              <>
                <Section icon={faClipboardCheck} title={"Summary"} defaultOpen>
                  <div className="dinolabsQAInspectorSummaryGrid">
                    <Chip label="Images Missing Alt" value={report.images.missingAlt} tone="bad" />
                    <Chip label="Heading Issues" value={report.headings.issues.length} tone="warn" />
                    <Chip label="Tab Order Issues" value={report.keyboard.issues.length} tone="warn" />
                    <Chip label="ARIA Or Name Issues" value={report.aria.issues.length} tone="bad" />
                    <Chip label="Contrast Violations" value={report.contrast.violations} tone="bad" />
                    <Chip label="Focus Outline Removed" value={report.focus.removesFocusStyle ? 1 : 0} tone="warn" />
                    <Chip label="Prefers-Reduced-Motion Styles Present" value={report.motion.hasPrefersReducedMotion ? "Yes" : "No"} />
                  </div>
                </Section>

                <Section icon={faEye} title={"Images And Alt Text"} defaultOpen>
                  {report.images.issues.length === 0 ? (
                    <div className="dinolabsQAInspectorEmpty">No Missing Alt Text Detected.</div>
                  ) : (
                    <div className="dinolabsQAInspectorList">
                      {report.images.issues.map((i, idx) => (
                        <Row key={idx} path={i.path} message={i.message} tone="bad" />
                      ))}
                    </div>
                  )}
                </Section>

                <Section icon={faHeading} title={"Headings"}>
                  <div className="dinolabsQAInspectorHeadingList">
                    {report.headings.outline.length === 0 ? (
                      <div className="dinolabsQAInspectorEmpty">No Headings Found.</div>
                    ) : (
                      report.headings.outline.map((h, idx) => (
                        <div key={idx} className="dinolabsQAInspectorHeadingItem" style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                          <span className={`dinolabsQAInspectorHBadge h${h.level}`}>H{h.level}</span>
                          <span className="dinolabsQAInspectorHeadingText">{h.text || "(Empty)"}</span>
                          <span className="dinolabsQAInspectorPath">{h.path}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {report.headings.issues.length > 0 && (
                    <div className="dinolabsQAInspectorList">
                      {report.headings.issues.map((i, idx) => (
                        <Row key={idx} path={i.path || (i.paths || []).join(", ")} message={i.message} tone="warn" />
                      ))}
                    </div>
                  )}
                </Section>

                <Section icon={faKeyboard} title={"Keyboard And Tab Order"}>
                  {report.keyboard.issues.length === 0 ? (
                    <div className="dinolabsQAInspectorEmpty">No Keyboard Issues Detected.</div>
                  ) : (
                    <div className="dinolabsQAInspectorList">
                      {report.keyboard.issues.map((i, idx) => (
                        <Row key={idx} path={i.path} message={i.message} tone="warn" />
                      ))}
                    </div>
                  )}
                </Section>

                <Section icon={faBug} title={"ARIA And Names"}>
                  {report.aria.issues.length === 0 ? (
                    <div className="dinolabsQAInspectorEmpty">No ARIA Or Name Issues Detected.</div>
                  ) : (
                    <div className="dinolabsQAInspectorList">
                      {report.aria.issues.map((i, idx) => (
                        <Row key={idx} path={i.path} message={i.message} tone={i.type !== "unknown-aria" ? "warn" : ""} />
                      ))}
                    </div>
                  )}
                </Section>

                <Section icon={faTriangleExclamation} title={"Color Contrast"}>
                  {report.contrast.issues.length === 0 ? (
                    <div className="dinolabsQAInspectorEmpty">No Contrast Violations Detected.</div>
                  ) : (
                    <div className="dinolabsQAInspectorTable">
                      <div className="dinolabsQAInspectorTableHead">
                        <div>Path</div><div>Sample</div><div>Ratio</div><div>Needed</div><div>FG</div><div>BG</div>
                      </div>
                      {report.contrast.issues.map((i, idx) => (
                        <div key={idx} className="dinolabsQAInspectorTableRow">
                          <div className="dinolabsQAInspectorPath">{i.path}</div>
                          <div className="dinolabsQAInspectorSample">“{i.sample}”</div>
                          <div className="dinolabsQAInspectorMono">{i.ratio}</div>
                          <div className="dinolabsQAInspectorMono">{i.threshold}</div>
                          <div className="dinolabsQAInspectorSw fg" style={{ background: i.color }} />
                          <div className="dinolabsQAInspectorSw bg" style={{ background: i.background }} />
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section icon={faBroom} title={"Motion And User Preferences"}>
                  <div className="dinolabsQAInspectorMetaGrid">
                    <div>Keyframes Present: <b>{report.motion.hasKeyframes ? "Yes" : "No"}</b></div>
                    <div>Prefers-Reduced-Motion Styles: <b>{report.motion.hasPrefersReducedMotion ? "Yes" : "No"}</b></div>
                    <div>Styles Removing Focus Outline: <b>{report.focus.removesFocusStyle ? "Yes" : "No"}</b></div>
                  </div>
                </Section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DinoLabsPluginsA11yInspector;
