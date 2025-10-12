import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxesStacked, faUpload, faWandMagicSparkles, faFileArchive, faDownload, faCopy,
  faGears, faCircleCheck, faCircleHalfStroke, faCamera, faFont
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav";
import "../../../styles/mainStyles/DinoLabsPlugins/DinoLabsPluginsAssetOptimizer/DinoLabsPluginsAssetOptimizer.css";
import "../../../styles/helperStyles/Slider.css";
import "../../../styles/helperStyles/Checkbox.css";

export default function DinoLabsPluginsAssetOptimizer() {

  const IMAGE_TYPES = new Set(["image/png","image/jpeg","image/webp","image/avif","image/gif","image/svg+xml"]);

  const VIDEO_TYPES = new Set(["video/mp4","video/webm","video/ogg","video/quicktime","video/x-matroska"]);

  const AUDIO_TYPES = new Set(["audio/wav","audio/x-wav","audio/mpeg","audio/mp3","audio/ogg","audio/flac","audio/aac","audio/x-aac","audio/mp4"]);

  const FONT_TYPES  = new Set(["font/ttf","font/otf","font/woff","font/woff2","application/x-font-ttf","application/x-font-opentype","application/font-woff","application/font-woff2"]);

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n=0; n<256; n++) {
      let c=n; for (let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1);
      t[n]=c>>>0;
    }
    return t;
  })();

  const uid = () => Math.random().toString(36).slice(2, 9);

  const bytesToMB = (n) => +(n / (1024 * 1024)).toFixed(2);

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  const pretty = (n) => (n ?? n === 0 ? n.toLocaleString() : "—");

  const withTimeout = (promise, ms, errorMsg) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
    ]);
  };

  const guessKind = (f) => {
    const t = (f.type || "").toLowerCase();
    if (IMAGE_TYPES.has(t)) return "image";
    if (VIDEO_TYPES.has(t)) return "video";
    if (AUDIO_TYPES.has(t)) return "audio";
    if (FONT_TYPES.has(t) || /\.(ttf|otf|woff2?)$/i.test(f.name)) return "font";
    return "other";
  };

  const isValidFile = (f) => {
    if (!f || !f.size || !f.type) return false;
    const kind = guessKind(f);
    return kind !== "other" && f.size < 1024 * 1024 * 100;
  };

  const canCanvasEncode = async (mime) =>
    await withTimeout(
      new Promise((res) => {
        const c = document.createElement("canvas"); c.width = 1; c.height = 1;
        c.toBlob((b) => res(!!b), mime, 0.8);
      }),
      5000,
      "Canvas encoding check timed out."
    );

  const toBitmap = async (fileOrBlob) => {
    try {
      return await withTimeout(
        createImageBitmap(fileOrBlob),
        10000,
        `Bitmap creation timed out for ${fileOrBlob.name || "unknown"}.`
      );
    } catch {
      const url = URL.createObjectURL(fileOrBlob);
      try {
        const img = new Image();
        img.decoding = "async";
        await withTimeout(
          new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = url; }),
          10000,
          `Image loading timed out for ${fileOrBlob.name || "unknown"}.`
        );
        const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
        const b = await withTimeout(
          createImageBitmap(c),
          10000,
          `Bitmap creation from canvas timed out for ${fileOrBlob.name || "unknown"}.`
        );
        URL.revokeObjectURL(url);
        return b;
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
    }
  };

  const drawScaled = (bmp, maxW, maxH) => {
    const r = Math.min(maxW / bmp.width, maxH / bmp.height, 1);
    const W = Math.max(1, Math.floor(bmp.width * r));
    const H = Math.max(1, Math.floor(bmp.height * r));
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    c.getContext("2d").drawImage(bmp, 0, 0, W, H);
    return c;
  };

  const encodeCanvas = (canvas, mime, quality) =>
    withTimeout(
      new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Encode failed."))), mime, quality)),
      10000,
      "Canvas encoding timed out."
    );

  const canPlayVideo = async (file) => {
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement("video");
      video.src = url;
      await withTimeout(
        new Promise((ok, err) => { video.onloadedmetadata = ok; video.onerror = err; }),
        5000,
        `Video validation failed for ${file.name}: Metadata load timed out.`
      );
      const canPlay = video.canPlayType(file.type);
      return canPlay === "probably" || canPlay === "maybe";
    } catch {
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const snapshotPoster = useCallback(async (file, ts = 0.2, maxW=1280, maxH=720) => {
    addLog(`Starting poster snapshot for ${file.name}.`);
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement("video");
      video.src = url; video.muted = true; video.playsInline = true; video.preload = "metadata";
      await withTimeout(
        new Promise((ok, err) => { video.onloadedmetadata = ok; video.onerror = err; }),
        30000,
        `Video metadata load for poster timed out for ${file.name}.`
      );
      video.currentTime = Math.min(ts * (video.duration || 1), (video.duration || 1));
      await withTimeout(
        new Promise((ok) => video.onseeked = ok),
        10000,
        `Video seek for poster timed out for ${file.name}.`
      );
      const r = Math.min(maxW / video.videoWidth, maxH / video.videoHeight, 1);
      const W = Math.max(2, Math.floor(video.videoWidth * r));
      const H = Math.max(2, Math.floor(video.videoHeight * r));
      const c = document.createElement("canvas"); c.width=W; c.height=H;
      c.getContext("2d").drawImage(video, 0, 0, W, H);
      const blob = await encodeCanvas(c, "image/jpeg", 0.85);
      const name = file.name.replace(/\.[^.]+$/, "") + "_poster.jpg";
      addLog(`Completed poster snapshot for ${file.name}.`);
      return new File([blob], name, { type: "image/jpeg" });
    } catch (error) {
      throw new Error(`Poster snapshot failed for ${file.name}: ${error.message}.`);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const encodeWAVFromAudioBuffer = (buf) => {
    const numCh = buf.numberOfChannels;
    const rate = buf.sampleRate;
    const length = buf.length;
    const dataLen = length * numCh * 2;
    const totalLen = 44 + dataLen;
    const out = new DataView(new ArrayBuffer(totalLen));
    let p=0;
    const w8 = (n)=>out.setUint8(p++, n);
    const w16 = (n)=>{ out.setUint16(p, n, true); p+=2; };
    const w32 = (n)=>{ out.setUint32(p, n, true); p+=4; };
    w8(0x52);w8(0x49);w8(0x46);w8(0x46); w32(36+dataLen);
    w8(0x57);w8(0x41);w8(0x56);w8(0x45);
    w8(0x66);w8(0x6d);w8(0x74);w8(0x20); w32(16);
    w16(1);
    w16(numCh);
    w32(rate);
    w32(rate * numCh * 2);
    w16(numCh * 2);
    w16(16);
    w8(0x64);w8(0x61);w8(0x74);w8(0x61); w32(dataLen);
    const chans = Array.from({length:numCh},(_,i)=>buf.getChannelData(i));
    for (let i=0;i<length;i++){
      for (let c=0;c<numCh;c++){
        const s = Math.max(-1, Math.min(1, chans[c][i]));
        const v = s < 0 ? s * 0x8000 : s * 0x7FFF;
        out.setInt16(p, v, true); p+=2;
      }
    }
    return new Blob([out.buffer], { type: "audio/wav" });
  };

  const crc32 = (u8) => {
    let c=~0; for (let i=0;i<u8.length;i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (~c)>>>0;
  };

  const strToU8 = (s) => new TextEncoder().encode(s);

  const dosDateTime = (d=new Date()) => {
    const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((Math.floor(d.getSeconds()/2)) & 31);
    const date = (((d.getFullYear()-1980) & 127) << 9) | (((d.getMonth()+1)&15) << 5) | (d.getDate() & 31);
    return { time, date };
  };

  const buildZip = async (files) => {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const { time, date } = dosDateTime();
    for (const f of files) {
      const nameU8 = strToU8(f.name);
      const crc = crc32(f.u8);
      const compSize = f.u8.length;
      const uncomp = f.u8.length;
      const local = new Uint8Array(30 + nameU8.length + compSize);
      let p = 0;
      const w16 = (v) => { local[p++] = v & 255; local[p++] = (v>>>8) & 255; };
      const w32 = (v) => { w16(v & 65535); w16((v>>>16) & 65535); };
      w32(0x04034b50);
      w16(20);
      w16(0);
      w16(0);
      w16(time); w16(date);
      w32(crc);
      w32(compSize);
      w32(uncomp);
      w16(nameU8.length);
      w16(0);
      local.set(nameU8, p); p += nameU8.length;
      local.set(f.u8, p);   p += compSize;
      localParts.push(local);
      const cent = new Uint8Array(46 + nameU8.length);
      p = 0;
      const c16 = (v) => { cent[p++] = v & 255; cent[p++] = (v>>>8) & 255; };
      const c32 = (v) => { c16(v & 65535); c16((v>>>16) & 65535); };
      c32(0x02014b50);
      c16(0x031E);
      c16(20);
      c16(0);
      c16(0);
      c16(time); c16(date);
      c32(crc);
      c32(compSize);
      c32(uncomp);
      c16(nameU8.length);
      c16(0);
      c16(0);
      c16(0);
      c16(0);
      c32(0);
      c32(offset);
      cent.set(nameU8, p); p += nameU8.length;
      centralParts.push(cent);
      offset += local.length;
    }
    const centralSize = centralParts.reduce((s,a)=>s+a.length,0);
    const centralOffset = offset;
    const end = new Uint8Array(22);
    let q = 0;
    const e16 = (v) => { end[q++] = v & 255; end[q++] = (v>>>8) & 255; };
    const e32 = (v) => { e16(v & 65535); e16((v>>>16) & 65535); };
    e32(0x06054b50);
    e16(0); e16(0);
    e16(files.length); e16(files.length);
    e32(centralSize);
    e32(centralOffset);
    e16(0);
    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
  };

  const packShelves = (items, maxW, maxH, padding=2) => {
    const rects = items.map((it)=>({ w:it.w+padding*2, h:it.h+padding*2, item:it }));
    rects.sort((a,b)=>b.h-a.h);
    let x=0,y=0,rowH=0, W=0,H=0;
    const placed=[];
    for (const r of rects) {
      if (x + r.w > maxW) { x=0; y+=rowH; rowH=0; }
      if (y + r.h > maxH) return null;
      r.x = x; r.y = y; x += r.w; rowH = Math.max(rowH, r.h);
      W = Math.max(W, x); H = Math.max(H, y + r.h);
      placed.push(r);
    }
    return {W,H,rects:placed,padding};
  };

  const [files, setFiles] = useState([]);

  const [imageOpts, setImageOpts] = useState({ webp:true, avif:true, jpeg:false, quality:82, maxW:4096, maxH:4096 });

  const [videoOpts, setVideoOpts] = useState({ enable:true, mime:"video/webm;codecs=vp9", fps:30, maxW:1920, maxH:1080 });

  const [audioOpts, setAudioOpts] = useState({ wav:true, opus:true, normalize:true });

  const [spriteOpts, setSpriteOpts] = useState({ enabled:false, padding:2, maxW:2048, maxH:2048, pow2:false, extrude:false });

  const [fontCssRanges, setFontCssRanges] = useState("U+0020-007E, U+00A0-00FF");

  const [fontFamilyName, setFontFamilyName] = useState("BrandSans");

  const [jobs, setJobs] = useState([]);

  const [log, setLog] = useState([]);

  const [support, setSupport] = useState({ webp:false, avif:false, mrVideo:false, mrAudio:false });

  const [videoProgress, setVideoProgress] = useState({});

  const [isOptimizing, setIsOptimizing] = useState(false);

  const [overallProgress, setOverallProgress] = useState(0);

  const addLog = (m) => setLog((L)=>[m, ...L].slice(0,500));

  useEffect(() => {
    (async () => {
      try {
        addLog("Checking browser support.");
        const webp = await canCanvasEncode("image/webp");
        const avif = await canCanvasEncode("image/avif");
        const mrVideo = typeof MediaRecorder !== "undefined" &&
          (MediaRecorder.isTypeSupported?.("video/webm;codecs=vp9") || MediaRecorder.isTypeSupported?.("video/webm;codecs=vp8"));
        const mrAudio = typeof MediaRecorder !== "undefined" &&
          (MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus") || MediaRecorder.isTypeSupported?.("audio/webm"));
        setSupport({ webp, avif, mrVideo, mrAudio });
        setImageOpts((o)=>({ ...o, avif: avif && o.avif, webp: webp && o.webp }));
        setVideoOpts((o)=>({ ...o, mime: mrVideo && MediaRecorder.isTypeSupported?.("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm;codecs=vp8" }));
        setAudioOpts((o)=>({ ...o, opus: mrAudio && o.opus }));
        addLog(`Browser support: WebP=${webp}, AVIF=${avif}, MediaRecorder Video=${mrVideo}, MediaRecorder Audio=${mrAudio}, Browser=${navigator.userAgent}.`);
      } catch (error) {
        addLog(`Error checking browser support: ${error.message}.`);
      }
    })();
  }, []);

  const addFiles = (list) => {
    const arr = Array.from(list || []);
    const validFiles = arr.filter(isValidFile);
    if (validFiles.length < arr.length) {
      addLog(`Skipped ${arr.length - validFiles.length} invalid or unsupported files.`);
    }
    setFiles((prev)=>[
      ...prev,
      ...validFiles.map((f)=>({ id: uid(), file: f, name: f.name, sizeMB: bytesToMB(f.size), kind: guessKind(f) }))
    ]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  };

  const transcodeImage = useCallback(async (file, fmt, q, maxW, maxH) => {
    addLog(`Starting image transcoding for ${file.name} to ${fmt}.`);
    try {
      const bmp = await toBitmap(file);
      const canvas = drawScaled(bmp, maxW, maxH);
      const mime = fmt === "jpeg" ? "image/jpeg" : fmt === "avif" ? "image/avif" : "image/webp";
      const blob = await encodeCanvas(canvas, mime, clamp(q/100, 0, 1));
      const name = file.name.replace(/\.[^.]+$/, "") + (fmt==="jpeg" ? ".jpg" : `.${fmt}`);
      addLog(`Completed image transcoding for ${file.name} to ${fmt}.`);
      return new File([blob], name, { type: blob.type });
    } catch (error) {
      throw new Error(`Image transcoding failed for ${file.name} to ${fmt}: ${error.message}.`);
    }
  }, []);

  const transcodeVideoWebM = useCallback(async (file, { mime, fps, maxW, maxH, onProgress }) => {
    if (!support.mrVideo) throw new Error("MediaRecorder not supported for video on this browser.");
    addLog(`Starting video transcoding for ${file.name}.`);
    const canPlay = await canPlayVideo(file);
    if (!canPlay) {
      addLog(`Video ${file.name} cannot be played by this browser, attempting to include original file.`);
      return file; 
    }
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement("video");
      video.src = url; video.muted = true; video.playsInline = true; video.preload = "metadata";
      await withTimeout(
        new Promise((ok, err) => { video.onloadedmetadata = ok; video.onerror = err; }),
        30000,
        `Video metadata load timed out for ${file.name}.`
      );
      addLog(`Video ${file.name} metadata: ${video.videoWidth}x${video.videoHeight}, duration=${video.duration}s.`);
      await withTimeout(
        video.play().catch(() => {}),
        10000,
        `Video playback initiation timed out for ${file.name}.`
      );
      const r = Math.min(maxW / video.videoWidth, maxH / video.videoHeight, 1);
      const W = Math.max(2, Math.floor(video.videoWidth * r));
      const H = Math.max(2, Math.floor(video.videoHeight * r));
      const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(fps || 30);
      const mrType = MediaRecorder.isTypeSupported?.(mime) ? mime : "video/webm";
      if (!MediaRecorder.isTypeSupported?.(mrType)) {
        addLog(`MediaRecorder does not support ${mrType} for ${file.name}, attempting to include original file.`);
        return file;
      }
      const rec = new MediaRecorder(stream, { mimeType: mrType });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const duration = video.duration || 0;
      let rafId = null;
      const draw = () => {
        ctx.drawImage(video, 0, 0, W, H);
        if (!video.paused && !video.ended) {
          onProgress?.(video.currentTime / (duration || 1));
          rafId = requestAnimationFrame(draw);
        }
      };
      await new Promise((ok) => setTimeout(ok, 0));
      rec.start(250);
      video.currentTime = 0;
      await withTimeout(
        video.play(),
        30000,
        `Video playback timed out for ${file.name}.`
      );
      draw();
      await withTimeout(
        new Promise((ok) => video.onended = ok),
        60000,
        `Video playback completion timed out for ${file.name}.`
      );
      cancelAnimationFrame(rafId);
      rec.stop();
      await withTimeout(
        new Promise((ok) => rec.onstop = ok),
        10000,
        `MediaRecorder stop timed out for ${file.name}.`
      );
      const blob = new Blob(chunks, { type: mrType });
      const out = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webm", { type: mrType });
      addLog(`Completed video transcoding for ${file.name}.`);
      return out;
    } catch (error) {
      throw new Error(`Video transcoding failed for ${file.name}: ${error.message}.`);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [support.mrVideo]);

  const transcodeAudio = useCallback(async (file, { wav, opus, normalize }) => {
    addLog(`Starting audio transcoding for ${file.name}.`);
    try {
      const out = [];
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await withTimeout(
        file.arrayBuffer(),
        10000,
        `Audio buffer load timed out for ${file.name}.`
      );
      const audioBuffer = await withTimeout(
        ac.decodeAudioData(buf.slice(0)),
        10000,
        `Audio decoding timed out for ${file.name}.`
      );
      let target = audioBuffer;
      if (normalize) {
        const chs = audioBuffer.numberOfChannels;
        let peak = 0;
        for (let c=0;c<chs;c++){
          const data = audioBuffer.getChannelData(c);
          for (let i=0;i<data.length;i++) peak = Math.max(peak, Math.abs(data[i]));
        }
        if (peak > 0 && peak < 0.99) {
          const gain = 0.99 / peak;
          const dest = ac.createBuffer(chs, audioBuffer.length, audioBuffer.sampleRate);
          for (let c=0;c<chs;c++){
            const src = audioBuffer.getChannelData(c);
            const dst = dest.getChannelData(c);
            for (let i=0;i<src.length;i++) dst[i] = clamp(src[i]*gain, -1, 1);
          }
          target = dest;
        }
      }
      if (wav) {
        const blob = encodeWAVFromAudioBuffer(target);
        out.push(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".wav", { type: "audio/wav" }));
      }
      if (opus && support.mrAudio) {
        const off = new OfflineAudioContext(target.numberOfChannels, target.length, target.sampleRate);
        const src = off.createBufferSource(); src.buffer = target;
        const dest = off.createMediaStreamDestination?.();
        if (dest) {
          src.connect(dest); src.start();
          const mr = new MediaRecorder(dest.stream, { mimeType: "audio/webm;codecs=opus" });
          const chunks = [];
          mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          mr.start(200);
          await withTimeout(
            off.startRendering(),
            30000,
            `Audio rendering timed out for ${file.name}.`
          );
          mr.stop();
          await withTimeout(
            new Promise((ok) => mr.onstop = ok),
            10000,
            `MediaRecorder stop timed out for ${file.name}.`
          );
          const blob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
          out.push(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webm", { type: blob.type }));
        }
      }
      await ac.close();
      addLog(`Completed audio transcoding for ${file.name}.`);
      return out;
    } catch (error) {
      throw new Error(`Audio transcoding failed for ${file.name}: ${error.message}.`);
    }
  }, [support.mrAudio]);

  const buildSpriteAtlas = useCallback(async (items, opt) => {
    addLog("Starting sprite atlas creation.");
    try {
      const bitmaps = [];
      for (const it of items) {
        const bmp = await toBitmap(it.file);
        bitmaps.push({ id: it.id, name: it.name, w: bmp.width, h: bmp.height, bmp });
      }
      const pack = packShelves(bitmaps, opt.maxW, opt.maxH, opt.padding);
      if (!pack) throw new Error("Images do not fit max atlas size.");
      let W = pack.W, H = pack.H;
      if (opt.pow2) {
        const nextPow2 = (n) => 1 << (32 - Math.clz32(n - 1));
        W = nextPow2(W); H = nextPow2(H);
      }
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      const frames = {};
      for (const r of pack.rects) {
        const x = r.x + opt.padding, y = r.y + opt.padding;
        ctx.drawImage(r.item.bmp, x, y);
        if (opt.extrude) {
          ctx.drawImage(r.item.bmp, x-1, y, 1, r.item.h, x-1, y, 1, r.item.h);
          ctx.drawImage(r.item.bmp, x+r.item.w, y, 1, r.item.h, x+r.item.w, y, 1, r.item.h);
          ctx.drawImage(r.item.bmp, x, y-1, r.item.w, 1, x, y-1, r.item.w, 1);
          ctx.drawImage(r.item.bmp, x, y+r.item.h, r.item.w, 1, x, y+r.item.h, r.item.w, 1);
        }
        frames[r.item.name] = { x, y, w: r.item.w, h: r.item.h };
      }
      const png = await encodeCanvas(c, "image/png", 1);
      addLog("Completed sprite atlas creation.");
      return {
        atlasPng: new File([png], "sprite-atlas.png", { type: "image/png" }),
        atlasJson: new File([JSON.stringify({ meta:{ w:W, h:H, padding:opt.padding, pow2:opt.pow2 }, frames }, null, 2)], "sprite-atlas.json", { type: "application/json" })
      };
    } catch (error) {
      throw new Error(`Sprite atlas creation failed: ${error.message}.`);
    }
  }, []);

  const makeFontCss = (file, family, ranges) => {
    addLog(`Generating font CSS for ${file.name}.`);
    try {
      const srcUrl = URL.createObjectURL(file);
      const ext = file.name.split(".").pop()?.toLowerCase();
      const fmt = ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : ext === "otf" ? "opentype" : "truetype";
      const css =
`@font-face{
  font-family:"${family}"; src:url(${JSON.stringify(srcUrl)}) format("${fmt}");
  font-display:swap; unicode-range: ${ranges};
}`;
      addLog(`Completed font CSS for ${file.name}.`);
      return new File([css], file.name.replace(/\.[^.]+$/, ".css"), { type: "text/css" });
    } catch (error) {
      throw new Error(`Font CSS generation failed for ${file.name}: ${error.message}.`);
    }
  };

  const run = async () => {
    if (isOptimizing) {
      addLog("Optimization already in progress, please wait.");
      return;
    }
    if (files.length === 0) {
      addLog("No files to optimize.");
      return;
    }
    setIsOptimizing(true);
    setJobs([]); setLog([]); setOverallProgress(0);
    addLog("Starting optimization.");

    const outputs = [];
    const imgTargets = [
      imageOpts.webp && support.webp ? "webp" : null,
      imageOpts.avif && support.avif ? "avif" : null,
      imageOpts.jpeg ? "jpeg" : null
    ].filter(Boolean);
    const totalFiles = files.length + (spriteOpts.enabled && files.some(x=>x.kind==="image") ? 1 : 0);
    let processedFiles = 0;

    for (const it of files) {
      if (!isValidFile(it.file)) {
        addLog(`Skipping invalid file: ${it.name}.`);
        processedFiles++;
        setOverallProgress((processedFiles / totalFiles) * 100);
        outputs.push({ sourceId: it.id, name: it.name, file: it.file, kind: it.kind, target: "original" });
        continue;
      }
      const f = it.file;
      try {
        addLog(`Processing file: ${f.name} (${it.kind}).`);
        if (it.kind === "image" && imgTargets.length) {
          for (const fmt of imgTargets) {
            try {
              const out = await withTimeout(
                transcodeImage(f, fmt, imageOpts.quality, imageOpts.maxW, imageOpts.maxH),
                30000,
                `Image transcoding timed out for ${f.name} to ${fmt}.`
              );
              outputs.push({ sourceId: it.id, name: out.name, file: out, kind: "image", target: `${fmt}@${imageOpts.quality}%` });
              addLog(`Image ${f.name} → ${out.name}.`);
            } catch (error) {
              addLog(`Image failed: ${f.name} → ${fmt} - ${error.message}.`);
              outputs.push({ sourceId: it.id, name: f.name, file: f, kind: "image", target: "original" });
            }
          }
        }
        if (it.kind === "video" && videoOpts.enable && support.mrVideo) {
          const update = (p) => setVideoProgress((m)=>({ ...m, [it.id]: p }));
          try {
            const out = await withTimeout(
              transcodeVideoWebM(f, { mime: videoOpts.mime, fps: videoOpts.fps, maxW: videoOpts.maxW, maxH: videoOpts.maxH, onProgress: update }),
              60000,
              `Video transcoding timed out for ${f.name}.`
            );
            outputs.push({ sourceId: it.id, name: out.name, file: out, kind: "video", target: out.name.endsWith(".webm") ? "webm" : "original" });
            addLog(`Video ${f.name} → ${out.name}.`);
            try {
              const poster = await withTimeout(
                snapshotPoster(f),
                30000,
                `Poster snapshot timed out for ${f.name}.`
              );
              outputs.push({ sourceId: it.id, name: poster.name, file: poster, kind: "image", target: "poster" });
            } catch (error) {
              addLog(`Poster failed: ${f.name} - ${error.message}.`);
            }
          } catch (error) {
            addLog(`Video failed: ${f.name} - ${error.message}.`);
            outputs.push({ sourceId: it.id, name: f.name, file: f, kind: "video", target: "original" });
          } finally {
            setVideoProgress((m)=>({ ...m, [it.id]: 1 }));
          }
        }
        if (it.kind === "audio") {
          try {
            const outs = await withTimeout(
              transcodeAudio(f, audioOpts),
              30000,
              `Audio transcoding timed out for ${f.name}.`
            );
            for (const o of outs) {
              outputs.push({ sourceId: it.id, name: o.name, file: o, kind: "audio", target: o.type.includes("opus") ? "opus" : "wav" });
              addLog(`Audio ${f.name} → ${o.name}.`);
            }
          } catch (error) {
            addLog(`Audio failed: ${f.name} - ${error.message}.`);
            outputs.push({ sourceId: it.id, name: f.name, file: f, kind: "audio", target: "original" });
          }
        }
        if (it.kind === "font") {
          try {
            const css = makeFontCss(f, fontFamilyName, fontCssRanges);
            outputs.push({ sourceId: it.id, name: css.name, file: css, kind: "font-css", target: "unicode-range-css" });
            addLog(`Font CSS generated for ${f.name}.`);
          } catch (error) {
            addLog(`Font CSS failed: ${f.name} - ${error.message}.`);
            outputs.push({ sourceId: it.id, name: f.name, file: f, kind: "font", target: "original" });
          }
        }
      } catch (error) {
        addLog(`Error on ${it.name}: ${error.message}.`);
        outputs.push({ sourceId: it.id, name: f.name, file: f, kind: it.kind, target: "original" });
      }
      processedFiles++;
      setOverallProgress((processedFiles / totalFiles) * 100);
      addLog(`Progress: ${processedFiles}/${totalFiles} files processed.`);
    }
    if (spriteOpts.enabled) {
      const sprites = files.filter(x=>x.kind==="image");
      if (sprites.length) {
        try {
          const { atlasPng, atlasJson } = await withTimeout(
            buildSpriteAtlas(sprites, spriteOpts),
            60000,
            "Sprite atlas creation timed out."
          );
          outputs.push({ sourceId: "__atlas__", name: atlasPng.name, file: atlasPng, kind: "atlas", target: "png" });
          outputs.push({ sourceId: "__atlas__", name: atlasJson.name, file: atlasJson, kind: "atlas-map", target: "json" });
          addLog("Sprite atlas generated.");
        } catch (error) {
          addLog(`Atlas failed: ${error.message}.`);
        }
      }
      processedFiles++;
      setOverallProgress((processedFiles / totalFiles) * 100);
      addLog(`Progress: ${processedFiles}/${totalFiles} files processed.`);
    }
    setJobs(outputs);
    addLog(`Optimization completed with ${outputs.length} outputs.`);
    setIsOptimizing(false);
  };

  const totals = useMemo(() => {
    const outBy = {}; jobs.forEach(j => { (outBy[j.sourceId] ||= []).push(j); });
    const rows = files.map((f) => {
      const outs = outBy[f.id] || [];
      const best = outs.reduce((acc,o)=> !acc || o.file.size < acc.file.size ? o : acc, null);
      const saved = best ? Math.max(0, f.file.size - best.file.size) : 0;
      return { id:f.id, name:f.name, kind:f.kind, inMB:bytesToMB(f.file.size), bestMB: best?bytesToMB(best.file.size):null, savedMB: bytesToMB(saved), outputs:outs };
    });
    const totalIn = files.reduce((s,f)=>s+f.file.size,0);
    const totalBest = rows.reduce((s,r)=> s + (r.outputs.length ? Math.min(...r.outputs.map(o=>o.file.size)) : r.inMB*1024*1024), 0);
    return { rows, totalInMB: bytesToMB(totalIn), totalOutMB: bytesToMB(totalBest), totalSavedMB: bytesToMB(totalIn - totalBest) };
  }, [files, jobs]);

  const downloadBundle = async () => {
    try {
      const manifest = {
        createdAt: new Date().toISOString(),
        inputs: files.map(f=>({ name:f.name, bytes:f.file.size, kind:f.kind })),
        outputs: jobs.map(j=>({ name:j.name, bytes:j.file.size, kind:j.kind, target:j.target, sourceId:j.sourceId })),
        totals: { inMB: totals.totalInMB, outMB: totals.totalOutMB, savedMB: totals.totalSavedMB },
        notes: "Created in no-dependency mode."
      };
      const zipFiles = [];
      zipFiles.push({ name: "deliverables/manifest.json", u8: strToU8(JSON.stringify(manifest, null, 2)) });
      for (const j of jobs) {
        const buf = new Uint8Array(await j.file.arrayBuffer());
        zipFiles.push({ name: "deliverables/assets/" + j.name, u8: buf });
      }
      const blob = await withTimeout(
        buildZip(zipFiles),
        30000,
        "ZIP creation timed out."
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="deliverables.zip"; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      addLog("Bundle downloaded successfully.");
    } catch (error) {
      addLog(`Download bundle failed: ${error.message}.`);
    }
  };

  const copySnippets = async () => {
    try {
      const imgs = jobs.filter(j=>j.kind==="image");
      const vids = jobs.filter(j=>j.kind==="video" && j.target !== "original"); 
      const atlas = jobs.find(j=>j.name==="sprite-atlas.png");
      const atlasMap = jobs.find(j=>j.name==="sprite-atlas.json");
      const lines = [];
      if (imgs.length) {
        const avif = imgs.find(i=>/\.avif$/i.test(i.name));
        const webp = imgs.find(i=>/\.webp$/i.test(i.name));
        const jpg  = imgs.find(i=>/\.jpe?g$/i.test(i.name)) || imgs[0];
        lines.push("<picture>");
        if (avif) lines.push(`  <source srcset="/assets/${avif.name}" type="image/avif">`);
        if (webp) lines.push(`  <source srcset="/assets/${webp.name}" type="image/webp">`);
        lines.push(`  <img src="/assets/${jpg.name}" alt="">`);
        lines.push("</picture>");
      }
      if (vids.length) {
        const webm = vids[0];
        const poster = imgs.find(i=>/_poster\.jpe?g$/i.test(i.name));
        lines.push(`<video controls preload="metadata"${poster?` poster="/assets/${poster.name}"`:""}>`);
        lines.push(`  <source src="/assets/${webm.name}" type="${webm.file.type}">`);
        lines.push("</video>");
      }
      if (atlas && atlasMap) {
        lines.push(`<canvas id="atlasCanvas"></canvas>`);
        lines.push(`<script>
(async()=>{
  const img = new Image(); img.src = "/assets/${atlas.name}";
  const map = await (await fetch("/assets/${atlasMap.name}")).json();
  await new Promise(r=> img.onload = r);
  const keys = Object.keys(map.frames); if(!keys.length) return;
  const f = map.frames[keys[0]];
  const c = document.getElementById("atlasCanvas"), ctx = c.getContext("2d");
  c.width = f.w; c.height=f.h; ctx.drawImage(img, f.x, f.y, f.w, f.h, 0,0,f.w,f.h);
})();
</script>`);
      }
      await navigator.clipboard.writeText(lines.join("\n"));
      addLog("Snippets copied to clipboard.");
    } catch (error) {
      addLog(`Copy snippets failed: ${error.message}.`);
    }
  };

  const fileInputRef = useRef(null);

  const Chip = ({ label, value }) => (
    <div className="dinolabsAssetOptimizerChip">
      <div className="dinolabsAssetOptimizerChipValue">{value}</div>
      <div className="dinolabsAssetOptimizerChipLabel">{label}</div>
    </div>
  );

  return (
    <div className="dinolabsAssetOptimizerApp" tabIndex={0} onDragOver={(e)=>e.preventDefault()} onDrop={onDrop}>
      <DinoLabsNav activePage="plugins" />
      <div className="dinolabsAssetOptimizerContainer">
        <aside className="dinolabsAssetOptimizerSidebar">
          <section className="dinolabsAssetOptimizerSection">
            <header className="dinolabsAssetOptimizerSectionTitle">
              <FontAwesomeIcon icon={faBoxesStacked} />
              <span>Asset Pipeline Optimizer (No-Deps)</span>
            </header>
            <div className="dinolabsAssetOptimizerDrop" onClick={()=>fileInputRef.current?.click()}>
              <FontAwesomeIcon icon={faUpload} />
              <div>Drop files here or click to add.</div>
              <div className="dinolabsAssetOptimizerSmall">Images, video, audio, fonts. No external libraries.</div>
              <input ref={fileInputRef} type="file" multiple hidden onChange={(e)=>addFiles(e.target.files)} />
            </div>
            <div className="dinolabsAssetOptimizerList">
              {files.length===0 && <div className="dinolabsAssetOptimizerEmpty">No files yet.</div>}
              {files.map((f)=>(
                <div key={f.id} className="dinolabsAssetOptimizerItem">
                  <span className={`dinolabsAssetOptimizerBadge ${f.kind}`}>{f.kind}</span>
                  <span className="dinolabsAssetOptimizerName" title={f.name}>{f.name}</span>
                  <span className="dinolabsAssetOptimizerSize">{f.sizeMB} MB</span>
                </div>
              ))}
            </div>
          </section>

          <section className="dinolabsAssetOptimizerSection">
            <header className="dinolabsAssetOptimizerSectionTitle">
              <FontAwesomeIcon icon={faGears} />
              <span>Settings</span>
            </header>

            <div className="dinolabsAssetOptimizerFieldGroup">
              <div className="dinolabsAssetOptimizerField">
                <label>Images</label>
                <div className="dinolabsAssetOptimizerRow dinolabsAssetOptimizerWrap">
                  <label className={`dinolabsAssetOptimizerPill ${imageOpts.webp ? "dinolabsAssetOptimizerPillOn":""} ${!support.webp?"dinolabsAssetOptimizerPillMuted":""}`}>
                    <input type="checkbox" className="dinolabsSettingsCheckbox" checked={imageOpts.webp} disabled={!support.webp} onChange={(e)=>setImageOpts({...imageOpts, webp:e.target.checked})} /> WebP
                  </label>
                  <label className={`dinolabsAssetOptimizerPill ${imageOpts.avif ? "dinolabsAssetOptimizerPillOn":""} ${!support.avif?"dinolabsAssetOptimizerPillMuted":""}`}>
                    <input type="checkbox" className="dinolabsSettingsCheckbox" checked={imageOpts.avif} disabled={!support.avif} onChange={(e)=>setImageOpts({...imageOpts, avif:e.target.checked})} /> AVIF
                  </label>
                  <label className={`dinolabsAssetOptimizerPill ${imageOpts.jpeg ? "dinolabsAssetOptimizerPillOn":""}`}>
                    <input type="checkbox" className="dinolabsSettingsCheckbox" checked={imageOpts.jpeg} onChange={(e)=>setImageOpts({...imageOpts, jpeg:e.target.checked})} /> JPEG
                  </label>
                </div>
                <div className="dinolabsAssetOptimizerRow">
                  <input type="range" min="40" max="95" value={imageOpts.quality} onChange={(e)=>setImageOpts({...imageOpts, quality:parseInt(e.target.value,10)})} className="dinolabsSettingsSlider" />
                  <span className="dinolabsAssetOptimizerMono">{imageOpts.quality}%</span>
                </div>
                <div className="dinolabsAssetOptimizerRow">
                  <input className="dinolabsAssetOptimizerInput dinolabsAssetOptimizerSmallInput" type="number" value={imageOpts.maxW} onChange={(e)=>setImageOpts({...imageOpts, maxW:parseInt(e.target.value||"0",10)})} />
                  <span>×</span>
                  <input className="dinolabsAssetOptimizerInput dinolabsAssetOptimizerSmallInput" type="number" value={imageOpts.maxH} onChange={(e)=>setImageOpts({...imageOpts, maxH:parseInt(e.target.value||"0",10)})} />
                </div>
              </div>

              <div className="dinolabsAssetOptimizerField">
                <label>Video</label>
                <div className="dinolabsAssetOptimizerRow dinolabsAssetOptimizerWrap">
                  <label className={`dinolabsAssetOptimizerPill ${videoOpts.enable?"dinolabsAssetOptimizerPillOn":""} ${!support.mrVideo?"dinolabsAssetOptimizerPillMuted":""}`}>
                    <input type="checkbox" className="dinolabsSettingsCheckbox" checked={videoOpts.enable} disabled={!support.mrVideo} onChange={(e)=>setVideoOpts({...videoOpts, enable:e.target.checked})} /> Enable
                  </label>
                  <span className="dinolabsAssetOptimizerHint">{support.mrVideo ? "OK." : "Not supported in this browser."}</span>
                </div>
                <div className="dinolabsAssetOptimizerRow">
                  <span>FPS</span>
                  <input className="dinolabsAssetOptimizerInput dinolabsAssetOptimizerSmallInput" type="number" value={videoOpts.fps} onChange={(e)=>setVideoOpts({...videoOpts, fps:parseInt(e.target.value||"0",10)})} />
                </div>
                <div className="dinolabsAssetOptimizerRow">
                  <input className="dinolabsAssetOptimizerInput dinolabsAssetOptimizerSmallInput" type="number" value={videoOpts.maxW} onChange={(e)=>setVideoOpts({...videoOpts, maxW:parseInt(e.target.value||"0",10)})} />
                  <span>×</span>
                  <input className="dinolabsAssetOptimizerInput dinolabsAssetOptimizerSmallInput" type="number" value={videoOpts.maxH} onChange={(e)=>setVideoOpts({...videoOpts, maxH:parseInt(e.target.value||"0",10)})} />
                </div>
              </div>

              <div className="dinolabsAssetOptimizerField">
                <label>Audio</label>
                <div className="dinolabsAssetOptimizerRow dinolabsAssetOptimizerWrap">
                  <label className={`dinolabsAssetOptimizerPill ${audioOpts.wav?"dinolabsAssetOptimizerPillOn":""}`}>
                    <input type="checkbox" className="dinolabsSettingsCheckbox" checked={audioOpts.wav} onChange={(e)=>setAudioOpts({...audioOpts, wav:e.target.checked})} /> WAV
                  </label>
                  <label className={`dinolabsAssetOptimizerPill ${audioOpts.opus?"dinolabsAssetOptimizerPillOn":""} ${!support.mrAudio?"dinolabsAssetOptimizerPillMuted":""}`}>
                    <input type="checkbox" className="dinolabsSettingsCheckbox" checked={audioOpts.opus} disabled={!support.mrAudio} onChange={(e)=>setAudioOpts({...audioOpts, opus:e.target.checked})} /> WebM/Opus
                  </label>
                  <label className={`dinolabsAssetOptimizerPill ${audioOpts.normalize?"dinolabsAssetOptimizerPillOn":""}`}>
                    <input type="checkbox" className="dinolabsSettingsCheckbox" checked={audioOpts.normalize} onChange={(e)=>setAudioOpts({...audioOpts, normalize:e.target.checked})} /> Normalize
                  </label>
                </div>
              </div>

              <div className="dinolabsAssetOptimizerField">
                <label className="dinolabsAssetOptimizerRow">
                  <input type="checkbox" className="dinolabsSettingsCheckbox" checked={spriteOpts.enabled} onChange={(e)=>setSpriteOpts({...spriteOpts, enabled:e.target.checked})}/>
                  Sprite Atlas
                </label>
                {spriteOpts.enabled && (
                  <div className="dinolabsAssetOptimizerGrid2">
                    <div className="dinolabsAssetOptimizerField"><label>Max W</label><input className="dinolabsAssetOptimizerInput dinolabsAssetOptimizerSmallInput" type="number" value={spriteOpts.maxW} onChange={(e)=>setSpriteOpts({...spriteOpts, maxW:parseInt(e.target.value||"0",10)})}/></div>
                    <div className="dinolabsAssetOptimizerField"><label>Max H</label><input className="dinolabsAssetOptimizerInput dinolabsAssetOptimizerSmallInput" type="number" value={spriteOpts.maxH} onChange={(e)=>setSpriteOpts({...spriteOpts, maxH:parseInt(e.target.value||"0",10)})}/></div>
                    <div className="dinolabsAssetOptimizerField"><label>Padding</label><input className="dinolabsAssetOptimizerInput dinolabsAssetOptimizerSmallInput" type="number" value={spriteOpts.padding} onChange={(e)=>setSpriteOpts({...spriteOpts, padding:parseInt(e.target.value||"0",10)})}/></div>
                    <div className="dinolabsAssetOptimizerField dinolabsAssetOptimizerRow dinolabsAssetOptimizerWrap">
                      <label className="dinolabsAssetOptimizerPill"><input type="checkbox" className="dinolabsSettingsCheckbox" checked={spriteOpts.pow2} onChange={(e)=>setSpriteOpts({...spriteOpts, pow2:e.target.checked})}/> Pow-2</label>
                      <label className="dinolabsAssetOptimizerPill"><input type="checkbox" className="dinolabsSettingsCheckbox" checked={spriteOpts.extrude} onChange={(e)=>setSpriteOpts({...spriteOpts, extrude:e.target.checked})}/> Extrude</label>
                    </div>
                  </div>
                )}
              </div>

              <div className="dinolabsAssetOptimizerField">
                <label><FontAwesomeIcon icon={faFont}/> Font Unicode-Range CSS</label>
                <div className="dinolabsAssetOptimizerRow"><input className="dinolabsAssetOptimizerInput" value={fontFamilyName} onChange={(e)=>setFontFamilyName(e.target.value)} placeholder="Font Family Name" /></div>
                <textarea className="dinolabsAssetOptimizerTextarea" rows={3} value={fontCssRanges} onChange={(e)=>setFontCssRanges(e.target.value)} />
                <div className="dinolabsAssetOptimizerHint">Generates @font-face with unicode-range. Advisory only; does not shrink binaries.</div>
              </div>
            </div>

            <div className="dinolabsAssetOptimizerRow dinolabsAssetOptimizerRowSpace">
              <button
                className="dinolabsAssetOptimizerBtn"
                onClick={run}
                disabled={isOptimizing || files.length === 0}
              >
                <FontAwesomeIcon icon={faWandMagicSparkles}/>
                {isOptimizing ? `Optimizing (${Math.round(overallProgress)}%)` : "Optimize"}
              </button>
            </div>
          </section>

          <section className="dinolabsAssetOptimizerSection">
            <header className="dinolabsAssetOptimizerSectionTitle"><FontAwesomeIcon icon={faCamera}/><span>Log</span></header>
            <div className="dinolabsAssetOptimizerLog">
              {log.length===0 ? <div className="dinolabsAssetOptimizerEmpty">No logs yet.</div> : log.map((l,i)=><div key={i} className="dinolabsAssetOptimizerLogLine">{l}</div>)}
            </div>
          </section>
        </aside>

        <main className="dinolabsAssetOptimizerMain">
          <div className="dinolabsAssetOptimizerHeadBar">
            <div className="dinolabsAssetOptimizerHeadTitle"><FontAwesomeIcon icon={faCircleHalfStroke}/><span>Results</span></div>
            <div className="dinolabsAssetOptimizerHeadActions">
              <button className="dinolabsAssetOptimizerBtn dinolabsAssetOptimizerSubtle" onClick={copySnippets}><FontAwesomeIcon icon={faCopy}/> Copy Snippets</button>
              <button className="dinolabsAssetOptimizerBtn" disabled={jobs.length===0} onClick={downloadBundle}><FontAwesomeIcon icon={faFileArchive}/> Download Bundle</button>
            </div>
          </div>

          <div className="dinolabsAssetOptimizerMainInner">
            <section className="dinolabsAssetOptimizerCard">
              <header className="dinolabsAssetOptimizerCardTitle"><FontAwesomeIcon icon={faCircleCheck}/><span>Summary</span></header>
              <div className="dinolabsAssetOptimizerSummaryGrid">
                <Chip label="Inputs" value={files.length}/>
                <Chip label="Outputs" value={jobs.length}/>
                <Chip label="Total In (MB)" value={totals.totalInMB}/>
                <Chip label="Total Out (MB)" value={totals.totalOutMB}/>
                <Chip label="Saved (MB)" value={totals.totalSavedMB}/>
              </div>
            </section>

            <section className="dinolabsAssetOptimizerCard">
              <header className="dinolabsAssetOptimizerCardTitle"><FontAwesomeIcon icon={faGears}/><span>Deltas And Outputs</span></header>
              {totals.rows.length===0 ? <div className="dinolabsAssetOptimizerEmpty">Add files and run optimize.</div> : (
                <div className="dinolabsAssetOptimizerTable">
                  <div className="dinolabsAssetOptimizerTableHead">
                    <div>Name</div><div>Kind</div><div>In (MB)</div><div>Best (MB)</div><div>Saved</div><div>Outputs</div><div>Progress</div>
                  </div>
                  {totals.rows.map((r)=>(
                    <div key={r.id} className="dinolabsAssetOptimizerTableRow">
                      <div className="dinolabsAssetOptimizerPath" title={r.name}>{r.name}</div>
                      <div>{r.kind}</div>
                      <div className="dinolabsAssetOptimizerMono">{pretty(r.inMB)}</div>
                      <div className="dinolabsAssetOptimizerMono">{r.bestMB!=null?pretty(r.bestMB):"—"}</div>
                      <div className="dinolabsAssetOptimizerMono">{pretty(r.savedMB)}</div>
                      <div className="dinolabsAssetOptimizerOutputs">
                        {r.outputs.length===0 ? <span className="dinolabsAssetOptimizerDim">—</span> : r.outputs.map((o,idx)=>(
                          <span key={idx} className="dinolabsAssetOptimizerOutTag">{o.target}</span>
                        ))}
                      </div>
                      <div className="dinolabsAssetOptimizerProg">
                        {r.kind==="video" ? <div className="dinolabsAssetOptimizerBar"><div className="dinolabsAssetOptimizerFill" style={{width:`${Math.round(((videoProgress[r.id]||0))*100)}%`}}/></div> : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dinolabsAssetOptimizerCard">
              <header className="dinolabsAssetOptimizerCardTitle"><FontAwesomeIcon icon={faDownload}/><span>Generated Files</span></header>
              <div className="dinolabsAssetOptimizerOutputsGrid">
                {jobs.length===0 ? <div className="dinolabsAssetOptimizerEmpty">No files generated yet.</div> :
                  jobs.map((j,idx)=>(
                    <div key={idx} className="dinolabsAssetOptimizerOutCard">
                      <div className={`dinolabsAssetOptimizerBadge ${j.kind}`}>{j.kind}</div>
                      <div className="dinolabsAssetOptimizerName">{j.name}</div>
                      <div className="dinolabsAssetOptimizerSize">{bytesToMB(j.file.size)} MB</div>
                      <div className="dinolabsAssetOptimizerDim">{j.target}</div>
                    </div>
                  ))
                }
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}