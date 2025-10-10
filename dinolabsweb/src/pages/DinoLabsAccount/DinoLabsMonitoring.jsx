import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWifi,
  faBatteryHalf,
  faPlugCircleBolt,
  faDesktop,
  faGlobe,
  faLock,
  faHeadphones,
  faCubes,
  faEarthAmericas,
  faCloud,
  faClipboard,
  faBolt,
  faHardDrive,
  faDownload,
  faRefresh
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../helpers/Nav";
import "../../styles/mainStyles/DinoLabsAccount/DinoLabsMonitoring.css";

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const pct = (x) => `${Math.round(clamp01(x) * 100)}%`;
const B = (v) => (v ? "Yes" : "No");
const fmt = (n, d = 2) =>
  n == null || !isFinite(n) ? "—" : Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(d);
const fmtBytes = (bytes) => {
  if (bytes == null || !isFinite(bytes)) return "—";
  const u = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${fmt(v, v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${u[i]}`;
};
const fmtMs = (ms) => (ms == null || !isFinite(ms)) ? "—" : `${Math.round(ms)} ms`;

const UsageBar = ({ usage = 0, color = "#AD6ADD" }) => (
  <div className="dinolabsMonitoringUsageWrapper">
    <div className="dinolabsMonitoringUsageBar">
      <div
        className="dinolabsMonitoringUsageFill"
        style={{ width: `${clamp01(usage) * 100}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

// Custom hooks remain the same...
const useUiLoadIndex = () => {
  const [load, setLoad] = useState(0);
  useEffect(() => {
    let alive = true;
    let last = performance.now();
    let acc = 0;
    let n = 0;
    const ideal = 1000 / 60;
    const tick = (t) => {
      const dt = t - last;
      last = t;
      const r = clamp01((dt - ideal) / ideal);
      acc += r;
      n++;
      if (n >= 30) {
        setLoad(clamp01(acc / n));
        acc = 0;
        n = 0;
      }
      if (alive) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      alive = false;
    };
  }, []);
  return load;
};

const usePerf = () => {
  const [nav, setNav] = useState(null);
  const [paint, setPaint] = useState({ fp: null, fcp: null });
  const [lcp, setLcp] = useState(null);
  const [cls, setCls] = useState(0);
  const [fid, setFid] = useState(null);

  useEffect(() => {
    const navEntry = performance.getEntriesByType("navigation")[0];
    if (navEntry) setNav(navEntry);

    const paints = performance.getEntriesByType("paint");
    for (const p of paints) {
      if (p.name === "first-paint") setPaint((s) => ({ ...s, fp: p.startTime }));
      if (p.name === "first-contentful-paint") setPaint((s) => ({ ...s, fcp: p.startTime }));
    }

    const poLcp = new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) setLcp(last.renderTime || last.loadTime || last.startTime);
    });
    try {
      poLcp.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}

    let clsSum = 0;
    const poCls = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) clsSum += e.value;
      setCls(clsSum);
    });
    try {
      poCls.observe({ type: "layout-shift", buffered: true });
    } catch {}

    const poFid = new PerformanceObserver((list) => {
      const first = list.getEntries()[0];
      if (first) setFid(first.processingStart - first.startTime);
    });
    try {
      poFid.observe({ type: "first-input", buffered: true });
    } catch {}

    return () => {
      try {
        poLcp.disconnect();
      } catch {}
      try {
        poCls.disconnect();
      } catch {}
      try {
        poFid.disconnect();
      } catch {}
    };
  }, []);

  const ttfb = useMemo(() => (nav ? nav.responseStart - nav.startTime : null), [nav]);
  const dcl = useMemo(() => (nav ? nav.domContentLoadedEventEnd - nav.startTime : null), [nav]);
  const load = useMemo(() => (nav ? nav.loadEventEnd - nav.startTime : null), [nav]);

  return { ttfb, dcl, load, fp: paint.fp, fcp: paint.fcp, lcp, cls, fid };
};

const useNetwork = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [conn, setConn] = useState(() => {
    const c = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    return c
      ? { effectiveType: c.effectiveType, downlink: c.downlink, rtt: c.rtt, saveData: !!c.saveData }
      : null;
  });
  const [ping, setPing] = useState(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const c = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    const onChange = () =>
      c && setConn({ effectiveType: c.effectiveType, downlink: c.downlink, rtt: c.rtt, saveData: !!c.saveData });
    c?.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      c?.removeEventListener?.("change", onChange);
    };
  }, []);

  const runPing = async () => {
    try {
      const t0 = performance.now();
      await fetch("https://www.google.com/generate_204", { mode: "no-cors", cache: "no-store" });
      setPing(Math.round(performance.now() - t0));
    } catch {
      setPing(null);
    }
  };

  return { online, conn, ping, runPing };
};

const useBattery = () => {
  const [bat, setBat] = useState({ level: null, charging: null, chargingTime: null, dischargingTime: null });
  useEffect(() => {
    (async () => {
      if (!navigator.getBattery) return;
      try {
        const b = await navigator.getBattery();
        const push = () =>
          setBat({
            level: b.level,
            charging: b.charging,
            chargingTime: b.chargingTime,
            dischargingTime: b.dischargingTime
          });
        push();
        b.addEventListener("levelchange", push);
        b.addEventListener("chargingchange", push);
        b.addEventListener("chargingtimechange", push);
        b.addEventListener("dischargingtimechange", push);
      } catch {}
    })();
  }, []);
  return bat;
};

const useDisplay = () => {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
  const [scr] = useState({
    w: screen.width,
    h: screen.height,
    aw: screen.availWidth,
    ah: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth
  });
  const [orientation, setOrientation] = useState(() =>
    screen.orientation ? `${screen.orientation.type} (${screen.orientation.angle}°)` : "—"
  );
  useEffect(() => {
    const onR = () => setVp({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
    const onO = () =>
      setOrientation(screen.orientation ? `${screen.orientation.type} (${screen.orientation.angle}°)` : "—");
    window.addEventListener("resize", onR);
    screen.orientation?.addEventListener?.("change", onO);
    return () => {
      window.removeEventListener("resize", onR);
      screen.orientation?.removeEventListener?.("change", onO);
    };
  }, []);
  const mq = (q) => (window.matchMedia ? window.matchMedia(q).matches : null);
  const gamut = mq("(color-gamut: rec2020)") ? "rec2020" : mq("(color-gamut: p3)") ? "p3" : mq("(color-gamut: srgb)") ? "srgb" : "—";
  const hdr = mq("(dynamic-range: high)") ? "High" : mq("(dynamic-range: standard)") ? "Standard" : "—";
  const reducedMotion = mq("(prefers-reduced-motion: reduce)");
  const highContrast = mq("(prefers-contrast: more)");
  const darkMode = mq("(prefers-color-scheme: dark)");
  const pointer = mq("(pointer: coarse)") ? "coarse" : mq("(pointer: fine)") ? "fine" : "—";
  return { vp, scr, orientation, gamut, hdr, reducedMotion, highContrast, darkMode, pointer };
};

const useGraphics = () => {
  const [gl, setGl] = useState({ gl2: false, renderer: "—", vendor: "—", shading: "—", antialias: null });
  const [gpu, setGpu] = useState({ features: [], limits: {} });

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (ctx) {
        const gl2 = !!canvas.getContext("webgl2");
        const ext = ctx.getExtension("WEBGL_debug_renderer_info");
        const renderer = ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "Hidden";
        const vendor = ext ? ctx.getParameter(ext.UNMASKED_VENDOR_WEBGL) : "Hidden";
        const shading = ctx.getParameter(ctx.SHADING_LANGUAGE_VERSION);
        const antialias = ctx.getContextAttributes().antialias;
        setGl({ gl2, renderer, vendor, shading, antialias });
      }
    } catch {}
    (async () => {
      try {
        if (!navigator.gpu) return;
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return;
        const features = Array.from(adapter.features ?? []);
        const limits = adapter.limits ? Object.fromEntries(Object.entries(adapter.limits)) : {};
        setGpu({ features, limits });
      } catch {}
    })();
  }, []);
  return { gl, gpu };
};

const useMedia = () => {
  const [devices, setDevices] = useState([]);
  const [ac, setAc] = useState({ rate: null, state: "—", latency: "—" });

  useEffect(() => {
    const md = navigator.mediaDevices;
    md?.enumerateDevices?.().then((d) => setDevices(d)).catch(() => {});
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        setAc({
          rate: ctx.sampleRate || null,
          state: ctx.state || "—",
          latency: ctx.baseLatency ? `${fmtMs(ctx.baseLatency * 1000)}` : "—"
        });
        ctx.close?.();
      }
    } catch {}
  }, []);

  return { devices, ac };
};

const useStorage = () => {
  const [estimate, setEstimate] = useState({ usage: null, quota: null });
  useEffect(() => {
    (async () => {
      try {
        if (navigator.storage?.estimate) {
          const { usage, quota } = await navigator.storage.estimate();
          setEstimate({ usage: usage ?? null, quota: quota ?? null });
        }
      } catch {}
    })();
  }, []);
  return estimate;
};

const usePerms = () => {
  const [perms, setPerms] = useState({});
  useEffect(() => {
    const names = [
      "geolocation",
      "notifications",
      "camera",
      "microphone",
      "clipboard-read",
      "clipboard-write"
    ];
    (async () => {
      if (!navigator.permissions?.query) return;
      const out = {};
      for (const n of names) {
        try {
          const st = await navigator.permissions.query({ name: n });
          out[n] = st.state;
          st.onchange = () => setPerms((prev) => ({ ...prev, [n]: st.state }));
        } catch {
          out[n] = "—";
        }
      }
      setPerms(out);
    })();
  }, []);
  return perms;
};

const useEnv = () => {
  const ua = navigator.userAgent;
  const lang = navigator.language;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cores = navigator.hardwareConcurrency || null;
  const devMem = navigator.deviceMemory || null;
  const secure = window.isSecureContext;
  const uaCH = navigator.userAgentData || null;
  return { ua, uaCH, lang, tz, cores, devMem, secure };
};

const useSensors = () => {
  const [geo, setGeo] = useState({ granted: null, coords: null, err: null });

  const askGeo = async () => {
    try {
      if (!navigator.geolocation) {
        setGeo({ granted: false, coords: null, err: "No API." });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeo({ granted: true, coords: pos.coords, err: null }),
        (e) => setGeo({ granted: false, coords: null, err: e.message }),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } catch (error) {
      setGeo({ granted: false, coords: null, err: String(error) });
    }
  };

  return { geo, askGeo };
};

const copyText = async (txt) => {
  try {
    await navigator.clipboard?.writeText(txt);
  } catch {}
};

const DinoLabsMonitor = () => {
  const env = useEnv();
  const disp = useDisplay();
  const net = useNetwork();
  const bat = useBattery();
  const perf = usePerf();
  const gfx = useGraphics();
  const med = useMedia();
  const store = useStorage();
  const perms = usePerms();
  const sensors = useSensors();
  const uiLoad = useUiLoadIndex();

  const storageUsage = useMemo(
    () => (store.quota ? clamp01((store.usage || 0) / store.quota) : null),
    [store]
  );
  const heap = performance?.memory
    ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize }
    : null;

  const snapshot = () =>
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        env,
        display: disp,
        network: net,
        battery: bat,
        perf,
        graphics: gfx,
        media: { devices: med.devices, audio: med.ac },
        storage: store,
        permissions: perms,
        heap
      },
      null,
      2
    );

  const exportReport = async () => {
    const text = snapshot();
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `dinolabs-monitor-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    await copyText(text);
  };

  return (
    <div className="dinolabsPageWrapper">
      <DinoLabsNav activePage="monitor" />
      
      <div className="dinolabsHeaderContainer">
        <div className="dinolabsControlFlex">
          <div className="dinolabsMonitoringLeadingPanel">
            <div className="dinolabsMonitoringTopBar">
              <div className="dinolabsMonitoringTitleSection">
                <label className="dinolabsMonitoringTitle">System Monitor</label>
              </div>
              <div className="dinolabsMonitoringActionSection">
                <button className="dinolabsMonitoringButton" onClick={exportReport}>
                  <FontAwesomeIcon icon={faDownload} />
                  Export
                </button>
                <button className="dinolabsMonitoringButton" onClick={net.runPing}>
                  <FontAwesomeIcon icon={faRefresh} />
                  Ping Test
                </button>
              </div>
            </div>

            <div className="dinolabsMonitoringContentStack">
              
              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faGlobe} />
                  <span>Environment</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Platform:</span>
                    <span className="dinolabsMonitoringValue">{env.uaCH?.platform || navigator.platform || "—"}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Language:</span>
                    <span className="dinolabsMonitoringValue">{env.lang}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Time Zone:</span>
                    <span className="dinolabsMonitoringValue">{env.tz || "—"}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Secure Context:</span>
                    <span className="dinolabsMonitoringValue">{B(env.secure)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">CPU Cores:</span>
                    <span className="dinolabsMonitoringValue">{env.cores || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faDesktop} />
                  <span>Display</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Viewport:</span>
                    <span className="dinolabsMonitoringValue">{disp.vp.w}×{disp.vp.h} @ {disp.vp.dpr}x</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Screen:</span>
                    <span className="dinolabsMonitoringValue">{disp.scr.w}×{disp.scr.h}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Color Gamut:</span>
                    <span className="dinolabsMonitoringValue">{disp.gamut}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Dark Mode:</span>
                    <span className="dinolabsMonitoringValue">{B(disp.darkMode)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">UI Load:</span>
                    <span className="dinolabsMonitoringValue">{pct(uiLoad)}</span>
                  </div>
                  <UsageBar usage={uiLoad} color={uiLoad > 0.6 ? "#D7BA7D" : "#AD6ADD"} />
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faWifi} />
                  <span>Network</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Status:</span>
                    <span className="dinolabsMonitoringValue">{net.online ? "Online" : "Offline"}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Type:</span>
                    <span className="dinolabsMonitoringValue">{net.conn?.effectiveType || "—"}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Downlink:</span>
                    <span className="dinolabsMonitoringValue">{net.conn?.downlink ? `${net.conn.downlink} Mbps` : "—"}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Ping:</span>
                    <span className="dinolabsMonitoringValue">{net.ping != null ? `${net.ping} ms` : "—"}</span>
                  </div>
                  <UsageBar usage={net.conn?.downlink ? clamp01(net.conn.downlink / 100) : 0} color="#AD6ADD" />
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faBatteryHalf} />
                  <span>Battery</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Level:</span>
                    <span className="dinolabsMonitoringValue">
                      {bat.level == null ? "—" : `${Math.round(bat.level * 100)}%`}
                      {bat.charging && <FontAwesomeIcon icon={faPlugCircleBolt} />}
                    </span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Charging:</span>
                    <span className="dinolabsMonitoringValue">{B(bat.charging)}</span>
                  </div>
                  <UsageBar usage={bat.level ?? 0} color={bat.level != null && bat.level < 0.2 ? "#D7BA7D" : "#AD6ADD"} />
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faBolt} />
                  <span>Performance</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">TTFB:</span>
                    <span className="dinolabsMonitoringValue">{fmtMs(perf.ttfb)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">DOM Ready:</span>
                    <span className="dinolabsMonitoringValue">{fmtMs(perf.dcl)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Load:</span>
                    <span className="dinolabsMonitoringValue">{fmtMs(perf.load)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">FCP:</span>
                    <span className="dinolabsMonitoringValue">{fmtMs(perf.fcp)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">LCP:</span>
                    <span className="dinolabsMonitoringValue">{fmtMs(perf.lcp)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">CLS:</span>
                    <span className="dinolabsMonitoringValue">{perf.cls != null ? perf.cls.toFixed(3) : "—"}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Heap Used:</span>
                    <span className="dinolabsMonitoringValue">{heap ? fmtBytes(heap.used) : "—"}</span>
                  </div>
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faCubes} />
                  <span>Graphics</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">WebGL 2.0:</span>
                    <span className="dinolabsMonitoringValue">{B(gfx.gl.gl2)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">WebGPU:</span>
                    <span className="dinolabsMonitoringValue">{B(!!navigator.gpu)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Renderer:</span>
                    <span className="dinolabsMonitoringValue">{gfx.gl.renderer}</span>
                  </div>
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faHeadphones} />
                  <span>Media</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Cameras:</span>
                    <span className="dinolabsMonitoringValue">{med.devices.filter((d) => d.kind === "videoinput").length}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Microphones:</span>
                    <span className="dinolabsMonitoringValue">{med.devices.filter((d) => d.kind === "audioinput").length}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Sample Rate:</span>
                    <span className="dinolabsMonitoringValue">{med.ac.rate ? `${med.ac.rate} Hz` : "—"}</span>
                  </div>
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faHardDrive} />
                  <span>Storage</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Used:</span>
                    <span className="dinolabsMonitoringValue">{fmtBytes(store.usage)}</span>
                  </div>
                  <div className="dinolabsMonitoringRow">
                    <span className="dinolabsMonitoringKey">Available:</span>
                    <span className="dinolabsMonitoringValue">{fmtBytes(store.quota)}</span>
                  </div>
                  <UsageBar
                    usage={storageUsage ?? 0}
                    color={storageUsage != null && storageUsage > 0.85 ? "#D7BA7D" : "#AD6ADD"}
                  />
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faLock} />
                  <span>Permissions</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  {Object.entries(perms).map(([k, v]) => (
                    <div key={k} className="dinolabsMonitoringRow">
                      <span className="dinolabsMonitoringKey">{k.replace(/-/g, " ")}:</span>
                      <span className="dinolabsMonitoringValue">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dinolabsMonitoringSection">
                <div className="dinolabsMonitoringSectionHeader">
                  <FontAwesomeIcon icon={faEarthAmericas} />
                  <span>Location</span>
                </div>
                <div className="dinolabsMonitoringSectionContent">
                  <div className="dinolabsMonitoringRow">
                    <button className="dinolabsMonitoringButton" onClick={sensors.askGeo}>
                      <FontAwesomeIcon icon={faEarthAmericas} />
                      Request Location
                    </button>
                  </div>
                  {sensors.geo.coords && (
                    <>
                      <div className="dinolabsMonitoringRow">
                        <span className="dinolabsMonitoringKey">Latitude:</span>
                        <span className="dinolabsMonitoringValue">{sensors.geo.coords.latitude.toFixed(6)}</span>
                      </div>
                      <div className="dinolabsMonitoringRow">
                        <span className="dinolabsMonitoringKey">Longitude:</span>
                        <span className="dinolabsMonitoringValue">{sensors.geo.coords.longitude.toFixed(6)}</span>
                      </div>
                    </>
                  )}
                  {sensors.geo.err && (
                    <div className="dinolabsMonitoringRow">
                      <span className="dinolabsMonitoringKey">Error:</span>
                      <span className="dinolabsMonitoringValue">{sensors.geo.err}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DinoLabsMonitor;