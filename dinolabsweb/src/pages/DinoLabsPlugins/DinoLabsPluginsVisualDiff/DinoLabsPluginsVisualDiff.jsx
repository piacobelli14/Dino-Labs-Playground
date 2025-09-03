import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowsLeftRight, faCode, faFileCode, faFileLines, faImage, faVideo, faFileAudio,
  faSquareCheck, faSquareXmark, faCommentDots, faWandMagicSparkles, faSliders,
  faEye, faEyeSlash, faLayerGroup, faMaximize, faUpload, faFileExport, faMagnifyingGlass,
  faCircleHalfStroke, faWandMagic, faPen, faHighlighter
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/DinoLabsNav";
import "../../../styles/helperStyles/Slider.css";
import "../../../styles/helperStyles/Checkbox.css";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsVisualDiff/DinoLabsPluginsVisualDiff.css";

const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const bytesToMB = (n)=>+(n/(1024*1024)).toFixed(2);
const fmtPct = (n)=> (isFinite(n) ? `${(n*100).toFixed(1)}%` : "—");
const pretty = (n)=> (n ?? n === 0 ? n.toLocaleString() : "—");

const loadBitmap = async (fileOrBlob) => {
  try { return await createImageBitmap(fileOrBlob); }
  catch {
    const url = URL.createObjectURL(fileOrBlob);
    try {
      const img = new Image(); img.decoding="async";
      await new Promise((ok,err)=>{ img.onload=ok; img.onerror=err; img.src=url; });
      const c=document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight;
      const ctx=c.getContext("2d"); ctx.drawImage(img,0,0);
      const bmp = await createImageBitmap(c);
      URL.revokeObjectURL(url);
      return bmp;
    } catch(e){ URL.revokeObjectURL(url); throw e; }
  }
};

const drawToCanvas = (bmp, maxW, maxH) => {
  const r = Math.min(maxW/bmp.width, maxH/bmp.height, 1);
  const W = Math.max(1, Math.floor(bmp.width*r));
  const H = Math.max(1, Math.floor(bmp.height*r));
  const c = document.createElement("canvas"); c.width=W; c.height=H;
  c.getContext("2d").drawImage(bmp,0,0,W,H);
  return c;
};

const encodeCanvas = (canvas, mime="image/png", q=0.92) =>
  new Promise((res,rej)=>canvas.toBlob((b)=>b?res(b):rej(new Error("encode failed")), mime, q));

const CRC_TABLE = (() => {
  const t=new Uint32Array(256);
  for (let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = (c&1)? (0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; }
  return t;
})();
const crc32 = (u8)=>{ let c=~0; for (let i=0;i<u8.length;i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (~c)>>>0; };
const strU8 = (s)=> new TextEncoder().encode(s);
const dosDateTime = (d=new Date())=>{
  const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | (Math.floor(d.getSeconds()/2) & 31);
  const date = (((d.getFullYear()-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31);
  return {time,date};
};
async function buildZip(files) {
  const local=[]; const central=[]; let offset=0;
  const {time,date} = dosDateTime();
  for (const f of files) {
    const nameU8 = strU8(f.name); const crc=crc32(f.u8); const sz=f.u8.length;
    const loc = new Uint8Array(30+nameU8.length+sz);
    let p=0; const w16=(v)=>{loc[p++]=v&255;loc[p++]=(v>>>8)&255;}; const w32=(v)=>{w16(v&65535);w16((v>>>16)&65535);};
    w32(0x04034b50); w16(20); w16(0); w16(0); w16(time); w16(date); w32(crc); w32(sz); w32(sz); w16(nameU8.length); w16(0);
    loc.set(nameU8,p); p+=nameU8.length; loc.set(f.u8,p);
    local.push(loc);

    const cen = new Uint8Array(46+nameU8.length);
    p=0; const c16=(v)=>{cen[p++]=v&255;cen[p++]=(v>>>8)&255;}; const c32=(v)=>{c16(v&65535);c16((v>>>16)&65535);};
    c32(0x02014b50); c16(0x031E); c16(20); c16(0); c16(0); c16(time); c16(date); c32(crc); c32(sz); c32(sz);
    c16(nameU8.length); c16(0); c16(0); c16(0); c16(0); c32(0); c32(offset); cen.set(nameU8, p);
    central.push(cen);
    offset += loc.length;
  }
  const cenSize = central.reduce((s,a)=>s+a.length,0);
  const cenOffset = offset;
  const end = new Uint8Array(22); let q=0; const e16=(v)=>{end[q++]=v&255; end[q++]=(v>>>8)&255;}; const e32=(v)=>{e16(v&65535);e16((v>>>16)&65535);};
  e32(0x06054b50); e16(0); e16(0); e16(files.length); e16(files.length); e32(cenSize); e32(cenOffset); e16(0);
  return new Blob([...local, ...central, end], {type:"application/zip"});
}

function diffLines(aStr, bStr) {
  const A = aStr.split("\n"), B = bStr.split("\n");
  const n=A.length, m=B.length;
  const dp = Array(n+1).fill(0).map(()=>Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) dp[i][j] = A[i]===B[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const hunks=[]; let i=0,j=0; let cur=[];
  const pushCur = ()=>{ if(cur.length){ hunks.push(cur); cur=[]; } };
  while(i<n && j<m){
    if (A[i]===B[j]) { cur.push({type:"ctx", a:i, b:j, text:A[i]}); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) { cur.push({type:"del", a:i, text:A[i]}); i++; }
    else { cur.push({type:"add", b:j, text:B[j]}); j++; }
    if (cur.length>200) pushCur();
  }
  while(i<n){ cur.push({type:"del", a:i, text:A[i]}); i++; if (cur.length>200) pushCur(); }
  while(j<m){ cur.push({type:"add", b:j, text:B[j]}); j++; if (cur.length>200) pushCur(); }
  pushCur();
  return hunks;
}
const stableStringify = (v) => {
  const seen=new WeakSet();
  const recur=(x)=>{
    if (x && typeof x==="object") {
      if (seen.has(x)) return "[Circular]";
      seen.add(x);
      if (Array.isArray(x)) return `[${x.map(recur).join(",")}]`;
      const keys = Object.keys(x).sort();
      return `{${keys.map(k=>JSON.stringify(k)+":"+recur(x[k])).join(",")}}`;
    } else return JSON.stringify(x);
  };
  return recur(v);
};

const downsampleWave = (audioBuffer, targetPoints=1200) => {
  const ch = Math.min(2, audioBuffer.numberOfChannels);
  const L = audioBuffer.length;
  const step = Math.ceil(L / targetPoints);
  const out = [];
  for (let i=0;i<L;i+=step) {
    let min=1, max=-1;
    for (let k=0;k<step && i+k<L;k++){
      for (let c=0;c<ch;c++){
        const v = audioBuffer.getChannelData(c)[i+k];
        min=Math.min(min,v); max=Math.max(max,v);
      }
    }
    out.push({min, max});
  }
  return out;
};

const drawWave = (canvas, data, color="#7fd5ff") => {
  const W=canvas.width, H=canvas.height, mid=H/2; const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,W,H); ctx.fillStyle=color;
  const step = W / data.length;
  for (let i=0;i<data.length;i++){
    const {min,max} = data[i];
    const y1 = mid + min*mid, y2 = mid + max*mid;
    ctx.fillRect(Math.round(i*step), Math.round(y1), Math.max(1,Math.ceil(step)), Math.max(1, Math.round(y2-y1)));
  }
};

function makePixelDiff(aCtx, bCtx, W, H, thresh=0.1, mode="heat") {
  const a = aCtx.getImageData(0,0,W,H).data;
  const b = bCtx.getImageData(0,0,W,H).data;
  const outC = document.createElement("canvas"); outC.width=W; outC.height=H;
  const octx = outC.getContext("2d");
  const out = octx.createImageData(W,H);
  let changed=0;
  for (let i=0;i<a.length;i+=4){
    const dr = Math.abs(a[i]-b[i]);
    const dg = Math.abs(a[i+1]-b[i+1]);
    const db = Math.abs(a[i+2]-b[i+2]);
    const da = Math.abs(a[i+3]-b[i+3]);
    const d = (dr+dg+db+da)/1020;
    let r=0,g=0,bl=0,alpha=255;
    if (d > thresh) {
      changed++;
      if (mode==="heat") { r=255; g=Math.max(0, 255 - Math.round(d*255)); bl=0; alpha=200; }
      else if (mode==="xor") { r=dr; g=dg; bl=db; alpha=255; }
      else { r=255; g=255; bl=255; alpha=255; }
    } else {
      if (mode==="heat") { r=0; g=0; bl=0; alpha=0; }
      else if (mode==="xor") { r=0; g=0; bl=0; alpha=0; }
      else { r=0; g=0; bl=0; alpha=0; }
    }
    out.data[i]=r; out.data[i+1]=g; out.data[i+2]=bl; out.data[i+3]=alpha;
  }
  octx.putImageData(out,0,0);
  return { canvas: outC, ratio: changed/(W*H) };
}

async function videoThumbnails(file, count=12, maxW=320, maxH=180) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src=url; video.muted=true; video.playsInline=true; video.preload="metadata";
  await new Promise((ok,err)=>{ video.onloadedmetadata=ok; video.onerror=err; });
  const dur = Math.max(0.01, video.duration || 0);
  const thumbs=[];
  const c=document.createElement("canvas");
  const r = Math.min(maxW/video.videoWidth, maxH/video.videoHeight, 1);
  c.width = Math.max(1, Math.floor(video.videoWidth*r));
  c.height= Math.max(1, Math.floor(video.videoHeight*r));
  const ctx=c.getContext("2d");
  for (let i=0;i<count;i++){
    const t = (dur * i)/(count-1 || 1);
    video.currentTime = t;
    await new Promise((ok)=> video.onseeked = ok);
    ctx.drawImage(video,0,0,c.width,c.height);
    const blob = await new Promise((res)=> c.toBlob(res, "image/jpeg", 0.8));
    thumbs.push({ t, blob, url: URL.createObjectURL(blob) });
  }
  URL.revokeObjectURL(url);
  return { thumbs, width:c.width, height:c.height, duration:dur };
}

const DinoLabsPluginsVisualDiff = () => {
  const [mode, setMode] = useState("image");
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [isJSON, setIsJSON] = useState(false);

  const [diffMode, setDiffMode] = useState("heat");
  const [viewMode, setViewMode] = useState("side");
  const [threshold, setThreshold] = useState(10);
  const [blink, setBlink] = useState(false);
  const [swipe, setSwipe] = useState(50);

  const leftImgRef = useRef(null);
  const rightImgRef = useRef(null);
  const diffCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const swipeRef = useRef(null);
  const [imgStats, setImgStats] = useState({ changedRatio: null, width: null, height: null });

  const [leftThumbs, setLeftThumbs] = useState(null);
  const [rightThumbs, setRightThumbs] = useState(null);
  const [vidIndex, setVidIndex] = useState(0);
  const [frameDiff, setFrameDiff] = useState(null);

  const [leftWave, setLeftWave] = useState(null);
  const [rightWave, setRightWave] = useState(null);

  const [leftHTML, setLeftHTML] = useState("<h1>Hello A</h1>");
  const [rightHTML, setRightHTML] = useState("<h1>Hello B</h1>");
  const [leftURL, setLeftURL] = useState("");
  const [rightURL, setRightURL] = useState("");
  const leftIframeRef = useRef(null);
  const rightIframeRef = useRef(null);
  const [domReport, setDomReport] = useState({ added:0, removed:0, changed:0, samples:[] });
  const [selectedPath, setSelectedPath] = useState(null);
  const [styleDiff, setStyleDiff] = useState(null);

  const [hunks, setHunks] = useState([]);
  const [comments, setComments] = useState([]);
  const [approval, setApproval] = useState("pending");

  const fileInputLeft = useRef(null);
  const fileInputRight = useRef(null);

  const resetAll = () => {
    setImgStats({changedRatio:null,width:null,height:null});
    setLeftThumbs(null); setRightThumbs(null); setVidIndex(0); setFrameDiff(null);
    setLeftWave(null); setRightWave(null);
    setDomReport({added:0,removed:0,changed:0,samples:[]}); setSelectedPath(null); setStyleDiff(null);
    setHunks([]); setComments([]); setApproval("pending");
  };

  useEffect(()=>{ resetAll(); }, [mode]);

  const drawImageDiff = useCallback(async ()=>{
    if (!left || !right) return;
    const lb = await loadBitmap(left), rb = await loadBitmap(right);
    const W = Math.max(lb.width, rb.width), H = Math.max(lb.height, rb.height);
    const la = document.createElement("canvas"); la.width=W; la.height=H; const lctx=la.getContext("2d");
    const ra = document.createElement("canvas"); ra.width=W; ra.height=H; const rctx=ra.getContext("2d");
    lctx.drawImage(lb,0,0); rctx.drawImage(rb,0,0);
    const t = threshold/100;
    const { canvas:diffC, ratio } = makePixelDiff(lctx, rctx, W, H, t, diffMode);
    setImgStats({ changedRatio: ratio, width: W, height: H });
    const dRef = diffCanvasRef.current; if (dRef) { dRef.width=W; dRef.height=H; dRef.getContext("2d").drawImage(diffC,0,0); }
    const oRef = overlayCanvasRef.current; if (oRef) { oRef.width=W; oRef.height=H; const octx=oRef.getContext("2d");
      octx.clearRect(0,0,W,H); octx.drawImage(lb,0,0); octx.globalAlpha=0.6; octx.drawImage(rb,0,0); octx.globalAlpha=1;
    }
    const li = leftImgRef.current; const ri = rightImgRef.current;
    if (li) { li.width = lb.width; li.height = lb.height; li.getContext("2d").drawImage(lb,0,0); }
    if (ri) { ri.width = rb.width; ri.height = rb.height; ri.getContext("2d").drawImage(rb,0,0); }
  }, [left, right, threshold, diffMode]);

  useEffect(()=>{ if (mode==="image") drawImageDiff(); }, [drawImageDiff]);

  useEffect(()=>{ 
    let id=null;
    if (blink && mode==="image" && overlayCanvasRef.current && left && right){
      let showA=true;
      id = setInterval(()=>{
        const o=overlayCanvasRef.current, ctx=o.getContext("2d");
        const li=leftImgRef.current, ri=rightImgRef.current;
        if (li && ri) { ctx.clearRect(0,0,o.width,o.height); ctx.globalAlpha=1; ctx.drawImage(showA?li:ri,0,0); showA=!showA; }
      }, 600);
    }
    return ()=> id && clearInterval(id);
  }, [blink, mode, left, right]);

  const generateThumbs = async (side) => {
    const file = side==="left" ? left : right;
    if (!file) return;
    const pack = await videoThumbnails(file, 12, 280, 160);
    (side==="left" ? setLeftThumbs : setRightThumbs)(pack);
  };
  useEffect(()=>{ if (mode==="video" && left) generateThumbs("left"); }, [mode,left]);
  useEffect(()=>{ if (mode==="video" && right) generateThumbs("right"); }, [mode,right]);

  useEffect(()=>{
    const idx = vidIndex;
    if (!leftThumbs || !rightThumbs || !leftThumbs.thumbs[idx] || !rightThumbs.thumbs[idx]) { setFrameDiff(null); return; }
    (async ()=>{
      const la = await loadBitmap(leftThumbs.thumbs[idx].blob);
      const ra = await loadBitmap(rightThumbs.thumbs[idx].blob);
      const W = Math.max(la.width, ra.width), H = Math.max(la.height, ra.height);
      const lc=document.createElement("canvas"); lc.width=W; lc.height=H; lc.getContext("2d").drawImage(la,0,0);
      const rc=document.createElement("canvas"); rc.width=W; rc.height=H; rc.getContext("2d").drawImage(ra,0,0);
      const { canvas, ratio } = makePixelDiff(lc.getContext("2d"), rc.getContext("2d"), W, H, threshold/100, "heat");
      setFrameDiff({ canvas, ratio, W, H });
    })();
  }, [vidIndex, leftThumbs, rightThumbs, threshold]);

  const loadAudio = async (file, side) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const buf = await file.arrayBuffer();
    const audio = await ac.decodeAudioData(buf.slice(0));
    const wave = downsampleWave(audio, 1200);
    await ac.close();
    side==="left"?setLeftWave(wave):setRightWave(wave);
  };
  useEffect(()=>{ if (mode==="audio" && left) loadAudio(left,"left"); }, [mode,left]);
  useEffect(()=>{ if (mode==="audio" && right) loadAudio(right,"right"); }, [mode,right]);

  useEffect(()=>{
    if (mode!=="audio") return;
    const leftC=document.getElementById("waveLeft"), rightC=document.getElementById("waveRight"), diffC=document.getElementById("waveDiff");
    if (leftC && leftWave){ leftC.width=900; leftC.height=160; drawWave(leftC, leftWave, "#86d1ff"); }
    if (rightC && rightWave){ rightC.width=900; rightC.height=160; drawWave(rightC, rightWave, "#ffd386"); }
    if (diffC && leftWave && rightWave){
      const N=Math.min(leftWave.length, rightWave.length);
      const delta = Array.from({length:N},(_,i)=>({min: Math.min(0,leftWave[i].min - rightWave[i].min), max: Math.max(0,leftWave[i].max - rightWave[i].max)}));
      diffC.width=900; diffC.height=120; drawWave(diffC, delta, "#ff7f9a");
    }
  }, [mode, leftWave, rightWave]);

  const toBlobURL = (html) => {
    const blob = new Blob([html], {type: "text/html"});
    return URL.createObjectURL(blob);
  };

  const buildDOMReport = () => {
    const li = leftIframeRef.current, ri = rightIframeRef.current;
    if (!li || !ri) return;
    const L = li.contentDocument, R = ri.contentDocument;
    if (!L || !R) return;
    const walk = (root) => {
      const out=[];
      const dfs=(node,path=[])=>{
        if (node.nodeType===1) {
          const el=node; const id=el.id?`#${el.id}`:"";
          const cls=el.className&&typeof el.className==="string" ? "."+el.className.trim().split(/\s+/).join(".") : "";
          const step = `${el.tagName.toLowerCase()}${id}${cls}`;
          const cur=[...path, step];
          out.push({path:cur.join(" > "), tag:el.tagName.toLowerCase(), attrs:[...el.attributes].map(a=>[a.name,a.value])});
          for (const ch of el.children) dfs(ch, cur);
        }
      };
      for (const ch of root.children) dfs(ch, []);
      return out;
    };
    const A = walk(L.body), B = walk(R.body);
    const setA = new Map(A.map(x=>[x.path, x]));
    const setB = new Map(B.map(x=>[x.path, x]));
    let added=0, removed=0, changed=0;
    const samples=[];
    for (const [p, a] of setA){
      if (!setB.has(p)) removed++;
      else {
        const b=setB.get(p);
        const attrsA=new Map(a.attrs), attrsB=new Map(b.attrs);
        const keys = new Set([...attrsA.keys(), ...attrsB.keys()]);
        for (const k of keys){
          if ((attrsA.get(k)||"") !== (attrsB.get(k)||"")) { changed++; samples.push({path:p, attr:k, a:attrsA.get(k)||"", b:attrsB.get(k)||""}); }
        }
      }
    }
    for (const [p] of setB) if (!setA.has(p)) added++;
    setDomReport({added, removed, changed, samples:samples.slice(0,50)});
  };

  const refreshIframes = () => {
    if (leftURL) URL.revokeObjectURL(leftURL);
    if (rightURL) URL.revokeObjectURL(rightURL);
    const lu = toBlobURL(leftHTML), ru = toBlobURL(rightHTML);
    setLeftURL(lu); setRightURL(ru);
    setTimeout(buildDOMReport, 100);
  };

  useEffect(()=>{ if (mode==="html") refreshIframes(); }, [mode]);
  useEffect(()=>{ if (mode==="html") { const id=setTimeout(refreshIframes, 200); return ()=>clearTimeout(id); }}, [leftHTML, rightHTML]);

  const pathFromElement = (el) => {
    if (!el) return null;
    const steps=[];
    while (el && el.nodeType===1 && el.tagName.toLowerCase()!=="html"){
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className && typeof el.className==="string" ? "."+el.className.trim().split(/\s+/).join(".") : "";
      steps.unshift(el.tagName.toLowerCase()+id+cls);
      el = el.parentElement;
    }
    return steps.join(" > ");
  };

  const handlePickElement = (side, evt) => {
    evt.preventDefault(); evt.stopPropagation();
    const doc = side==="left" ? leftIframeRef.current?.contentDocument : rightIframeRef.current?.contentDocument;
    if (!doc) return;
    const onClick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const p = pathFromElement(e.target);
      setSelectedPath(p);
      compareStylesForPath(p);
      doc.removeEventListener("click", onClick, true);
    };
    doc.addEventListener("click", onClick, true);
  };

  const compareStylesForPath = (path) => {
    const L = leftIframeRef.current?.contentDocument, R = rightIframeRef.current?.contentDocument;
    if (!L || !R || !path) return;
    const q = (doc) => {
      const last = path.split(" > ").pop();
      const list = Array.from(doc.querySelectorAll(last.split("#")[0].split(".")[0]));
      let best=null, bestScore=-1;
      for (const el of list) {
        const pp = pathFromElement(el);
        const score = pp && pp.endsWith(last) ? pp.length : 0;
        if (score>bestScore){best=el;bestScore=score;}
      }
      return best;
    };
    const a=q(L), b=q(R);
    if (!a && !b){ setStyleDiff(null); return; }
    const ca=a? getComputedStyle(a) : null, cb=b? getComputedStyle(b) : null;
    const keys = new Set();
    if (ca) for (const k of ca) keys.add(k);
    if (cb) for (const k of cb) keys.add(k);
    const diffs=[];
    for (const k of keys) {
      const va= ca? ca.getPropertyValue(k):"", vb= cb? cb.getPropertyValue(k):"";
      if (va!==vb) diffs.push([k, va, vb]);
    }
    setStyleDiff({ path, a:!!a, b:!!b, diffs:diffs.slice(0,120) });
  };

  const computeTextDiff = () => {
    let A = leftText, B = rightText;
    if (isJSON) {
      try { A = JSON.stringify(JSON.parse(A), null, 2); } catch {}
      try { B = JSON.stringify(JSON.parse(B), null, 2); } catch {}
      try { A = JSON.stringify(JSON.parse(A), (k,v)=>v, 2); A = JSON.parse(stableStringify(JSON.parse(A))); A = JSON.stringify(A,null,2);} catch{}
      try { B = JSON.stringify(JSON.parse(B), (k,v)=>v, 2); B = JSON.parse(stableStringify(JSON.parse(B))); B = JSON.stringify(B,null,2);} catch{}
    }
    const h = diffLines(A, B);
    setHunks(h);
  };
  useEffect(()=>{ if (mode==="text") computeTextDiff(); }, [mode]);
  useEffect(()=>{ if (mode==="text") { const id=setTimeout(computeTextDiff, 250); return ()=>clearTimeout(id); }}, [leftText, rightText, isJSON]);

  const addComment = (anchor, text) => {
    setComments((C)=>[{ id: uid(), mode, anchor, text, status:"open", ts: Date.now() }, ...C].slice(0,200));
  };
  const setCommentStatus = (id, status) => setComments((C)=>C.map(c=>c.id===id?{...c,status}:c));

  const exportBundle = async () => {
    const files = [];
    const manifest = {
      createdAt: new Date().toISOString(),
      mode,
      imgStats, frameDiff: frameDiff?{ratio:frameDiff.ratio, W:frameDiff.W, H:frameDiff.H}:null,
      domReport, styleDiff,
      text: { isJSON, comments, approval },
    };
    const snapCanvas = async (canvas, name) => {
      if (!canvas) return;
      const blob = await encodeCanvas(canvas, "image/png", 0.92);
      const u8 = new Uint8Array(await blob.arrayBuffer());
      files.push({ name: `visual/${name}`, u8 });
    };
    await snapCanvas(diffCanvasRef.current, "pixel-diff.png");
    await snapCanvas(overlayCanvasRef.current, "overlay.png");
    await snapCanvas(document.getElementById("waveLeft"), "wave-left.png");
    await snapCanvas(document.getElementById("waveRight"), "wave-right.png");
    await snapCanvas(document.getElementById("waveDiff"), "wave-diff.png");
    const addThumbs = async (pack, side) => {
      if (!pack) return;
      for (let i=0;i<pack.thumbs.length;i++){
        const u8 = new Uint8Array(await pack.thumbs[i].blob.arrayBuffer());
        files.push({ name: `video/${side}-thumb-${i}.jpg`, u8 });
      }
    };
    await addThumbs(leftThumbs, "left");
    await addThumbs(rightThumbs, "right");
    files.push({ name:"dom/left.html", u8: strU8(leftHTML) });
    files.push({ name:"dom/right.html", u8: strU8(rightHTML) });
    files.push({ name:"text/left.txt", u8: strU8(leftText) });
    files.push({ name:"text/right.txt", u8: strU8(rightText) });
    files.push({ name:"manifest.json", u8: strU8(JSON.stringify(manifest, null, 2)) });
    const zip = await buildZip(files);
    const url = URL.createObjectURL(zip);
    const a=document.createElement("a"); a.href=url; a.download="visual-diff-review.zip"; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const onPick = (side) => (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    side==="left" ? setLeft(f) : setRight(f);
  };
  const onDrop = (side) => (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0]; if (!f) return;
    side==="left" ? setLeft(f) : setRight(f);
  };

  const changedPct = imgStats.changedRatio!=null ? fmtPct(imgStats.changedRatio) : "—";

  return (
    <div className="dinolabsVisualDiffApp" tabIndex={0}>
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsVisualDiffContainer">
        <aside className="dinolabsVisualDiffSidebar">
          <section className="dinolabsVisualDiffSection">
            <header className="dinolabsVisualDiffSectionTitle">
              <FontAwesomeIcon icon={faCircleHalfStroke} />
              <span>Visual Diff And Version Reviewer</span>
            </header>

            <div className="dinolabsVisualDiffTabs">
              <button className={`dinolabsVisualDiffTab ${mode==="image"?"on":""}`} onClick={()=>setMode("image")}><FontAwesomeIcon icon={faImage}/> Images</button>
              <button className={`dinolabsVisualDiffTab ${mode==="video"?"on":""}`} onClick={()=>setMode("video")}><FontAwesomeIcon icon={faVideo}/> Video</button>
              <button className={`dinolabsVisualDiffTab ${mode==="audio"?"on":""}`} onClick={()=>setMode("audio")}><FontAwesomeIcon icon={faFileAudio}/> Audio</button>
              <button className={`dinolabsVisualDiffTab ${mode==="html"?"on":""}`} onClick={()=>setMode("html")}><FontAwesomeIcon icon={faCode}/> DOM/CSS</button>
              <button className={`dinolabsVisualDiffTab ${mode==="text"?"on":""}`} onClick={()=>setMode("text")}><FontAwesomeIcon icon={faFileLines}/> Text/JSON</button>
            </div>

            <div className="dinolabsVisualDiffPickers">
              <div className="dinolabsVisualDiffPicker" onDrop={onDrop("left")} onDragOver={(e)=>e.preventDefault()}>
                <div className="dinolabsVisualDiffLabel">Left (A)</div>
                <div className="dinolabsVisualDiffDrop" onClick={()=>fileInputLeft.current?.click()}>
                  <FontAwesomeIcon icon={faUpload}/>
                  <div>{left ? left.name : "Drop Or Click To Choose."}</div>
                  <input ref={fileInputLeft} type="file" hidden onChange={onPick("left")} />
                </div>
                {left && <div className="dinolabsVisualDiffMeta">{left.type || "(unknown)"} · {bytesToMB(left.size)} MB</div>}
              </div>
              <div className="dinolabsVisualDiffPicker" onDrop={onDrop("right")} onDragOver={(e)=>e.preventDefault()}>
                <div className="dinolabsVisualDiffLabel">Right (B)</div>
                <div className="dinolabsVisualDiffDrop" onClick={()=>fileInputRight.current?.click()}>
                  <FontAwesomeIcon icon={faUpload}/>
                  <div>{right ? right.name : "Drop Or Click To Choose."}</div>
                  <input ref={fileInputRight} type="file" hidden onChange={onPick("right")} />
                </div>
                {right && <div className="dinolabsVisualDiffMeta">{right.type || "(unknown)"} · {bytesToMB(right.size)} MB</div>}
              </div>
            </div>
          </section>

          {mode==="image" && (
            <section className="dinolabsVisualDiffSection">
              <header className="dinolabsVisualDiffSectionTitle"><FontAwesomeIcon icon={faSliders}/><span>Image Diff Controls</span></header>
              <div className="dinolabsVisualDiffField">
                <label>Visualization</label>
                <div className="dinolabsVisualDiffChips">
                  {["side","overlay","swipe","blink"].map(v=>(
                    <button key={v} className={`dinolabsVisualDiffChip ${viewMode===v?"on":""}`} onClick={()=>setViewMode(v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div className="dinolabsVisualDiffField">
                <label>Pixel-Diff Mode</label>
                <div className="dinolabsVisualDiffChips">
                  {["heat","xor"].map(v=>(
                    <button key={v} className={`dinolabsVisualDiffChip ${diffMode===v?"on":""}`} onClick={()=>setDiffMode(v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div className="dinolabsVisualDiffField">
                <label>Threshold</label>
                <div className="dinolabsVisualDiffRow">
                  <input type="range" min="0" max="100" value={threshold} onChange={(e)=>setThreshold(parseInt(e.target.value,10))} className="dinolabsSettingsSlider"/>
                  <div className="dinolabsVisualDiffMono">{threshold}%</div>
                </div>
              </div>
              <div className="dinolabsVisualDiffRow">
                <label className="dinolabsVisualDiffRow"><input type="checkbox" checked={blink} onChange={(e)=>setBlink(e.target.checked)} className="dinolabsSettingsCheckbox"/> Blink A/B</label>
              </div>
              <div className="dinolabsVisualDiffStats">
                <Chip label="Changed Pixels" value={changedPct}/>
                <Chip label="Width" value={imgStats.width||"—"}/>
                <Chip label="Height" value={imgStats.height||"—"}/>
              </div>
            </section>
          )}

          {mode==="video" && (
            <section className="dinolabsVisualDiffSection">
              <header className="dinolabsVisualDiffSectionTitle"><FontAwesomeIcon icon={faSliders}/><span>Video Diff Controls</span></header>
              <div className="dinolabsVisualDiffField">
                <label>Frame Index</label>
                <div className="dinolabsVisualDiffRow">
                  <input type="range" min={0} max={Math.max(0,(leftThumbs?.thumbs.length||1)-1, (rightThumbs?.thumbs.length||1)-1)} value={vidIndex} onChange={(e)=>setVidIndex(parseInt(e.target.value,10))} className="dinolabsSettingsSlider"/>
                  <div className="dinolabsVisualDiffMono">{vidIndex}</div>
                </div>
              </div>
              <div className="dinolabsVisualDiffField">
                <label>Threshold</label>
                <div className="dinolabsVisualDiffRow">
                  <input type="range" min="0" max="100" value={threshold} onChange={(e)=>setThreshold(parseInt(e.target.value,10))} className="dinolabsSettingsSlider"/>
                  <div className="dinolabsVisualDiffMono">{threshold}%</div>
                </div>
              </div>
              <div className="dinolabsVisualDiffStats">
                <Chip label="Frame Diff" value={frameDiff?fmtPct(frameDiff.ratio):"—"}/>
                <Chip label="A Thumbs" value={leftThumbs?.thumbs.length||0}/>
                <Chip label="B Thumbs" value={rightThumbs?.thumbs.length||0}/>
              </div>
            </section>
          )}

          {mode==="audio" && (
            <section className="dinolabsVisualDiffSection">
              <header className="dinolabsVisualDiffSectionTitle"><FontAwesomeIcon icon={faSliders}/><span>Audio Diff Controls</span></header>
              <div className="dinolabsVisualDiffHint">Waveforms show min and max bars. The difference view displays A minus B.</div>
            </section>
          )}

          {mode==="html" && (
            <section className="dinolabsVisualDiffSection">
              <header className="dinolabsVisualDiffSectionTitle"><FontAwesomeIcon icon={faSliders}/><span>DOM/CSS Controls</span></header>
              <div className="dinolabsVisualDiffRow dinolabsVisualDiffRowWrap">
                <button className="dinolabsVisualDiffBtn" onClick={buildDOMReport}><FontAwesomeIcon icon={faWandMagic}/> Recompute Diffs</button>
                <button className="dinolabsVisualDiffBtn subtle" onClick={()=>handlePickElement("left", new Event("noop"))}><FontAwesomeIcon icon={faHighlighter}/> Pick In Left</button>
                <button className="dinolabsVisualDiffBtn subtle" onClick={()=>handlePickElement("right", new Event("noop"))}><FontAwesomeIcon icon={faHighlighter}/> Pick In Right</button>
              </div>
              <div className="dinolabsVisualDiffStats">
                <Chip label="Added" value={domReport.added}/>
                <Chip label="Removed" value={domReport.removed}/>
                <Chip label="Attribute Changes" value={domReport.changed}/>
              </div>
              {styleDiff && (
                <div className="dinolabsVisualDiffStyleDiff">
                  <div className="dinolabsVisualDiffStylePath">{styleDiff.path}</div>
                  <div className="dinolabsVisualDiffStyleTable">
                    <div>Property</div><div>A</div><div>B</div>
                    {styleDiff.diffs.map(([k,a,b],i)=>(
                      <React.Fragment key={i}><div className="dinolabsVisualDiffMono">{k}</div><div className="dinolabsVisualDiffMono">{a}</div><div className="dinolabsVisualDiffMono">{b}</div></React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {mode==="text" && (
            <section className="dinolabsVisualDiffSection">
              <header className="dinolabsVisualDiffSectionTitle"><FontAwesomeIcon icon={faSliders}/><span>Text/JSON Review</span></header>
              <div className="dinolabsVisualDiffRow dinolabsVisualDiffRowWrap">
                <label className="dinolabsVisualDiffRow"><input type="checkbox" checked={isJSON} onChange={(e)=>setIsJSON(e.target.checked)} className="dinolabsSettingsCheckbox"/> JSON Mode</label>
                <div className="dinolabsVisualDiffChips">
                  {["pending","approved","changes"].map(s=>(
                    <button key={s} className={`dinolabsVisualDiffChip ${approval===s?"on":""}`} onClick={()=>setApproval(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="dinolabsVisualDiffHint">Add inline comments on diff lines in the main panel.</div>
            </section>
          )}

          <section className="dinolabsVisualDiffSection">
            <header className="dinolabsVisualDiffSectionTitle"><FontAwesomeIcon icon={faFileExport}/><span>Export</span></header>
            <button className="dinolabsVisualDiffBtn" onClick={exportBundle}><FontAwesomeIcon icon={faFileExport}/> Download ZIP Report</button>
          </section>
        </aside>

        <main className="dinolabsVisualDiffMain">
          {mode==="image" && (
            <section className="dinolabsVisualDiffCard">
              <header className="dinolabsVisualDiffCardTitle"><FontAwesomeIcon icon={faImage}/><span>Image Diff</span></header>
              <div className={`dinolabsVisualDiffImageStage ${viewMode}`}>
                <div className="dinolabsVisualDiffPane">
                  <canvas ref={leftImgRef} className="dinolabsVisualDiffImgCanvas" />
                  <div className="dinolabsVisualDiffPaneLabel">A</div>
                </div>
                <div className="dinolabsVisualDiffPane">
                  <canvas ref={rightImgRef} className="dinolabsVisualDiffImgCanvas" />
                  <div className="dinolabsVisualDiffPaneLabel">B</div>
                </div>
                <div className="dinolabsVisualDiffPane dinolabsVisualDiffPaneDiff">
                  <canvas ref={diffCanvasRef} className="dinolabsVisualDiffImgCanvas" />
                  <div className="dinolabsVisualDiffPaneLabel">Δ</div>
                </div>
                <div className="dinolabsVisualDiffPane dinolabsVisualDiffPaneOverlay">
                  <canvas ref={overlayCanvasRef} className="dinolabsVisualDiffImgCanvas" />
                  <div className="dinolabsVisualDiffPaneLabel">Overlay</div>
                </div>
                {viewMode==="swipe" && (
                  <input ref={swipeRef} className="dinolabsVisualDiffSwipe dinolabsSettingsSlider" type="range" min={0} max={100} value={swipe} onChange={(e)=>setSwipe(parseInt(e.target.value,10))}/>
                )}
              </div>
              <div className="dinolabsVisualDiffHint">Side-by-side, diff heatmap, overlay, swipe, and blink views.</div>
            </section>
          )}

          {mode==="video" && (
            <section className="dinolabsVisualDiffCard">
              <header className="dinolabsVisualDiffCardTitle"><FontAwesomeIcon icon={faVideo}/><span>Video Thumbs And Frame Diff</span></header>
              <div className="dinolabsVisualDiffThumbsRow">
                <div className="dinolabsVisualDiffThumbCol">
                  <div className="dinolabsVisualDiffThumbTitle">A Thumbnails</div>
                  <div className="dinolabsVisualDiffThumbStrip">
                    {leftThumbs?.thumbs.map((t,i)=>(
                      <img key={i} src={t.url} className={`dinolabsVisualDiffThumb ${vidIndex===i?"sel":""}`} onClick={()=>setVidIndex(i)} />
                    )) || <div className="dinolabsVisualDiffEmpty">No Thumbnails Yet.</div>}
                  </div>
                </div>
                <div className="dinolabsVisualDiffThumbCol">
                  <div className="dinolabsVisualDiffThumbTitle">B Thumbnails</div>
                  <div className="dinolabsVisualDiffThumbStrip">
                    {rightThumbs?.thumbs.map((t,i)=>(
                      <img key={i} src={t.url} className={`dinolabsVisualDiffThumb ${vidIndex===i?"sel":""}`} onClick={()=>setVidIndex(i)} />
                    )) || <div className="dinolabsVisualDiffEmpty">No Thumbnails Yet.</div>}
                  </div>
                </div>
                <div className="dinolabsVisualDiffThumbCol">
                  <div className="dinolabsVisualDiffThumbTitle">Δ Frame {vidIndex}</div>
                  <div className="dinolabsVisualDiffFrameDiff">
                    {frameDiff ? <canvas width={frameDiff.W} height={frameDiff.H} ref={(el)=>{ if (el) el.getContext("2d").drawImage(frameDiff.canvas,0,0); }} /> : <div className="dinolabsVisualDiffEmpty">Pick A Matching Frame Index.</div>}
                    <div className="dinolabsVisualDiffMono">{frameDiff?fmtPct(frameDiff.ratio):"—"}</div>
                  </div>
                </div>
              </div>
              <div className="dinolabsVisualDiffHint">Thumbnails are sampled across the duration. The per-index heat-diff is shown on the right.</div>
            </section>
          )}

          {mode==="audio" && (
            <section className="dinolabsVisualDiffCard">
              <header className="dinolabsVisualDiffCardTitle"><FontAwesomeIcon icon={faFileAudio}/><span>Audio Waveform Diff</span></header>
              <div className="dinolabsVisualDiffWaves">
                <div className="dinolabsVisualDiffWaveCol">
                  <div className="dinolabsVisualDiffThumbTitle">A</div>
                  <canvas id="waveLeft" />
                </div>
                <div className="dinolabsVisualDiffWaveCol">
                  <div className="dinolabsVisualDiffThumbTitle">B</div>
                  <canvas id="waveRight" />
                </div>
              </div>
              <div className="dinolabsVisualDiffWaveCol">
                <div className="dinolabsVisualDiffThumbTitle">Δ (A − B)</div>
                <canvas id="waveDiff" />
              </div>
              <div className="dinolabsVisualDiffHint">For precise review, align sources beforehand. This view compares amplitude envelopes.</div>
            </section>
          )}

          {mode==="html" && (
            <section className="dinolabsVisualDiffCard">
              <header className="dinolabsVisualDiffCardTitle"><FontAwesomeIcon icon={faCode}/><span>DOM/HTML Inputs</span></header>
              <div className="dinolabsVisualDiffGrid2">
                <textarea className="dinolabsVisualDiffTextarea" rows={10} value={leftHTML} onChange={(e)=>setLeftHTML(e.target.value)} placeholder="Paste HTML for A…"/>
                <textarea className="dinolabsVisualDiffTextarea" rows={10} value={rightHTML} onChange={(e)=>setRightHTML(e.target.value)} placeholder="Paste HTML for B…"/>
              </div>
            </section>
          )}
          {mode==="html" && (
            <section className="dinolabsVisualDiffCard">
              <header className="dinolabsVisualDiffCardTitle"><FontAwesomeIcon icon={faLayerGroup}/><span>Rendered DOM And Style Diff</span></header>
              <div className="dinolabsVisualDiffGrid2">
                <iframe title="left" ref={leftIframeRef} className="dinolabsVisualDiffFrame" src={leftURL} />
                <iframe title="right" ref={rightIframeRef} className="dinolabsVisualDiffFrame" src={rightURL} />
              </div>
              <div className="dinolabsVisualDiffAttrTable">
                <div>Path</div><div>Attribute</div><div>A</div><div>B</div>
                {domReport.samples.map((s,i)=>(
                  <React.Fragment key={i}>
                    <div className="dinolabsVisualDiffMono">{s.path}</div><div className="dinolabsVisualDiffMono">{s.attr}</div><div className="dinolabsVisualDiffMono">{s.a}</div><div className="dinolabsVisualDiffMono">{s.b}</div>
                  </React.Fragment>
                ))}
              </div>
              <div className="dinolabsVisualDiffHint">Click “Pick In Left” or “Pick In Right” to select an element. We will diff computed styles.</div>
            </section>
          )}

          {mode==="text" && (
            <>
              <section className="dinolabsVisualDiffCard">
                <header className="dinolabsVisualDiffCardTitle"><FontAwesomeIcon icon={faFileCode}/><span>Text Or JSON Inputs</span></header>
                <div className="dinolabsVisualDiffGrid2">
                  <textarea className="dinolabsVisualDiffTextarea dinolabsVisualDiffMono" rows={14} value={leftText} onChange={(e)=>setLeftText(e.target.value)} placeholder="Paste Left (A) text or JSON…"/>
                  <textarea className="dinolabsVisualDiffTextarea dinolabsVisualDiffMono" rows={14} value={rightText} onChange={(e)=>setRightText(e.target.value)} placeholder="Paste Right (B) text or JSON…"/>
                </div>
              </section>

              <section className="dinolabsVisualDiffCard">
                <header className="dinolabsVisualDiffCardTitle"><FontAwesomeIcon icon={faWandMagicSparkles}/><span>Diff And Review</span></header>
                {hunks.length===0 ? <div className="dinolabsVisualDiffEmpty">No Diff Computed Yet.</div> :
                  hunks.map((h,hi)=>(
                    <div className="dinolabsVisualDiffHunk" key={hi}>
                      {h.map((line,li)=>{
                        const key = `${hi}:${li}`;
                        const cls = line.type==="add"?"add": line.type==="del"?"del":"ctx";
                        return (
                          <div key={key} className={`dinolabsVisualDiffLine ${cls}`}>
                            <div className="dinolabsVisualDiffLn">{line.a!=null?line.a+1:""}</div>
                            <div className="dinolabsVisualDiffLn">{line.b!=null?line.b+1:""}</div>
                            <pre className="dinolabsVisualDiffCode">{line.text||"\u00A0"}</pre>
                            <button className="dinolabsVisualDiffBtn tiny" onClick={()=>addComment({hunk:hi,line:li,type:line.type}, prompt("Comment:")||"")}><FontAwesomeIcon icon={faCommentDots}/> Comment</button>
                          </div>
                        );
                      })}
                    </div>
                  ))
                }
                <div className="dinolabsVisualDiffComments">
                  <div className="dinolabsVisualDiffCommentsTitle">Comments</div>
                  {comments.length===0 ? <div className="dinolabsVisualDiffEmpty">No Comments Yet.</div> :
                    comments.map((c)=>(
                      <div key={c.id} className="dinolabsVisualDiffComment">
                        <div className="meta">
                          <span className={`status ${c.status}`}>{c.status}</span>
                          <span className="anchor">#{c.anchor?.hunk}:{c.anchor?.line} ({c.anchor?.type})</span>
                          <span className="time">{new Date(c.ts).toLocaleString()}</span>
                        </div>
                        <div className="text">{c.text}</div>
                        <div className="actions">
                          <button className="dinolabsVisualDiffBtn tiny" onClick={()=>setCommentStatus(c.id,"resolved")}><FontAwesomeIcon icon={faSquareCheck}/> Resolve</button>
                          <button className="dinolabsVisualDiffBtn tiny subtle" onClick={()=>setCommentStatus(c.id,"open")}><FontAwesomeIcon icon={faPen}/> Reopen</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <style>{viewMode==="swipe" ? `
        .dinolabsVisualDiffImageStage.swipe .dinolabsVisualDiffPane:nth-child(1){ clip-path: inset(0 ${100-swipe}% 0 0); }
        .dinolabsVisualDiffImageStage.swipe .dinolabsVisualDiffPane:nth-child(2){ clip-path: inset(0 0 0 ${swipe}%); }
      `: ""}</style>
    </div>
  );
};

const Chip = ({label, value}) => (
  <div className="dinolabsVisualDiffChipStat">
    <div className="dinolabsVisualDiffChipValue">{value}</div>
    <div className="dinolabsVisualDiffChipLabel">{label}</div>
  </div>
);

export default DinoLabsPluginsVisualDiff;
