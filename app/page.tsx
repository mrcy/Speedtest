"use client";

import { useEffect, useRef, useState } from "react";

declare global { interface Window { Speedtest?: new () => any; } }
type Result = { date: string; download: number; upload: number; ping: number; jitter: number };
const fmt = (n: number | null) => n === null || !Number.isFinite(n) ? "—" : n.toFixed(n >= 100 ? 0 : 1);
const ENGINE_URL = "https://cdn.jsdelivr.net/gh/librespeed/speedtest@master/speedtest.js";

// Public community test nodes. These are third-party servers, not Vercel infrastructure.
const TEST_POINTS = [
  { name: "Frankfurt, Germany · Clouvider", server: "https://fra.speedtest.clouvider.net/backend/", dlURL: "garbage.php", ulURL: "empty.php", pingURL: "empty.php", getIpURL: "getIP.php" },
  { name: "Amsterdam, Netherlands · Clouvider", server: "https://ams.speedtest.clouvider.net/backend/", dlURL: "garbage.php", ulURL: "empty.php", pingURL: "empty.php", getIpURL: "getIP.php" },
  { name: "London, United Kingdom · Clouvider", server: "https://lon.speedtest.clouvider.net/backend/", dlURL: "garbage.php", ulURL: "empty.php", pingURL: "empty.php", getIpURL: "getIP.php" },
  { name: "Nuremberg, Germany · LibreSpeed", server: "https://de4.backend.librespeed.org/", dlURL: "garbage.php", ulURL: "empty.php", pingURL: "empty.php", getIpURL: "getIP.php" },
  { name: "Prague, Czech Republic · CESNET", server: "https://speedtest.cesnet.cz/", dlURL: "backend/garbage.php", ulURL: "backend/empty.php", pingURL: "backend/empty.php", getIpURL: "backend/getIP.php" },
  { name: "Tehran, Iran · Faraso", server: "https://st.bardia.tech/", dlURL: "backend/garbage.php", ulURL: "backend/empty.php", pingURL: "backend/empty.php", getIpURL: "backend/getIP.php" },
  { name: "Qom, Iran · Amin IDC", server: "https://fastme.ir/", dlURL: "backend/garbage.php", ulURL: "backend/empty.php", pingURL: "backend/empty.php", getIpURL: "backend/getIP.php" }
];

function loadLibreSpeed(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser required"));
  if (window.Speedtest) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-nova-librespeed="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load LibreSpeed engine.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = ENGINE_URL; script.async = true; script.dataset.novaLibrespeed = "true";
    script.onload = () => window.Speedtest ? resolve() : reject(new Error("LibreSpeed engine did not initialize."));
    script.onerror = () => reject(new Error("Could not load LibreSpeed engine. Check your connection and try again."));
    document.head.appendChild(script);
  });
}

export default function Home() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [phase, setPhase] = useState("Ready to test");
  const [download, setDownload] = useState<number | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [ping, setPing] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [samples, setSamples] = useState<number[]>([]);
  const [error, setError] = useState("");
  const engine = useRef<any>(null);
  const latest = useRef({ download: null as number | null, upload: null as number | null, ping: null as number | null, jitter: null as number | null });

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("nova-speedtest-history") || "[]")); } catch {}
    return () => { try { engine.current?.abort?.(); } catch {} };
  }, []);

  async function startTest() {
    if (status === "running") return;
    setStatus("running"); setPhase("Connecting to test node"); setError("");
    setDownload(null); setUpload(null); setPing(null); setJitter(null); setSamples([]);
    latest.current = { download: null, upload: null, ping: null, jitter: null };
    try {
      await loadLibreSpeed();
      if (!window.Speedtest) throw new Error("LibreSpeed engine is unavailable.");
      const test = new window.Speedtest();
      engine.current = test;
      test.setParameter("time_dl", 12);
      test.setParameter("time_ul", 12);
      test.setParameter("time_ping", 10);
      TEST_POINTS.forEach(point => test.addTestPoint(point));
      test.onupdate = (data: any) => {
        const d = Number(data.dlStatus), u = Number(data.ulStatus), p = Number(data.pingStatus), j = Number(data.jitterStatus);
        if (Number.isFinite(d) && d >= 0 && data.dlStatus !== "") {
          latest.current.download = d; setDownload(d);
          if (data.testState === 1) { setPhase("Measuring download"); setSamples(old => [...old.slice(-39), d]); }
        }
        if (Number.isFinite(u) && u >= 0 && data.ulStatus !== "") {
          latest.current.upload = u; setUpload(u);
          if (data.testState === 3) setPhase("Measuring upload");
        }
        if (Number.isFinite(p) && p >= 0 && data.pingStatus !== "") { latest.current.ping = p; setPing(p); }
        if (Number.isFinite(j) && j >= 0 && data.jitterStatus !== "") { latest.current.jitter = j; setJitter(j); }
        if (data.testState === 2) setPhase("Measuring latency");
        if (data.testState === 3) setPhase("Measuring upload");
      };
      test.onend = (aborted: boolean) => {
        if (aborted) { setStatus("error"); setPhase("Test stopped"); setError("The test was interrupted. Please try again."); return; }
        const v = latest.current;
        setDownload(v.download); setUpload(v.upload); setPing(v.ping); setJitter(v.jitter);
        setStatus("done"); setPhase("Test complete");
        const item: Result = { date: new Date().toISOString(), download: v.download ?? 0, upload: v.upload ?? 0, ping: v.ping ?? 0, jitter: v.jitter ?? 0 };
        const old = JSON.parse(localStorage.getItem("nova-speedtest-history") || "[]");
        const next = [item, ...old].slice(0, 10);
        localStorage.setItem("nova-speedtest-history", JSON.stringify(next)); setHistory(next);
      };
      setPhase("Selecting the nearest test node");
      test.selectServer((server: any) => {
        if (!server) {
          setStatus("error"); setPhase("Test node unavailable");
          setError("Could not reach the available test nodes. Some public nodes may be offline or block browser requests. Please try again.");
          return;
        }
        setPhase("Starting test"); test.start();
      });
    } catch (e) {
      setStatus("error"); setPhase("Test failed");
      setError(e instanceof Error ? e.message : "Unable to start speed test.");
    }
  }

  function clearHistory() { localStorage.removeItem("nova-speedtest-history"); setHistory([]); }
  async function share() {
    const text = `My internet speed: Download ${fmt(download)} Mbps, Upload ${fmt(upload)} Mbps, Ping ${fmt(ping)} ms, Jitter ${fmt(jitter)} ms`;
    try {
      if (navigator.share) await navigator.share({ title: "NOVA Speedtest result", text });
      else { await navigator.clipboard.writeText(text); setPhase("Result copied to clipboard"); }
    } catch {}
  }

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">N</span><span>NOVA<span className="brand-light">SPEED</span></span></a>
      <div className="top-pill"><span className="live-dot" /> INTERNET PERFORMANCE LAB</div>
      <a className="github-link" href="https://github.com/librespeed/speedtest" target="_blank" rel="noreferrer">ENGINE ↗</a>
    </header>
    <section className="hero">
      <div className="eyebrow"><span className="eyebrow-line" /> CONNECTION DIAGNOSTICS</div>
      <h1>Know your <span>real speed.</span></h1>
      <p className="subtitle">A browser-based connection test powered by LibreSpeed and community-hosted test nodes.</p>
      <div className="test-layout">
        <div className="gauge-card">
          <div className="card-top"><span>LIVE THROUGHPUT</span><span className={`status-tag ${status}`}>● {status === "running" ? "TEST RUNNING" : status === "done" ? "COMPLETE" : status === "error" ? "ERROR" : "READY"}</span></div>
          <div className={`gauge ${status === "running" ? "active" : ""}`}>
            <div className="gauge-orbit orbit-one" /><div className="gauge-orbit orbit-two" />
            <div className="gauge-center"><span className="gauge-label">{status === "running" ? phase.toUpperCase() : "YOUR CONNECTION"}</span><strong>{fmt(download)}</strong><span className="unit">Mbps <span className="unit-divider">/</span> DOWNLOAD</span></div>
          </div>
          <button className="start-button" onClick={startTest} disabled={status === "running"}><span>{status === "running" ? "TEST IN PROGRESS" : status === "done" ? "↻ RUN AGAIN" : "▶ START SPEED TEST"}</span><span className="button-arrow">↗</span></button>
          <div className="phase-line"><span className={status === "running" ? "pulse" : ""} />{phase}</div>
          {error && <p className="error-message">{error}</p>}
          <div className="gauge-foot"><span>TEST ENGINE</span><strong>LibreSpeed</strong></div>
        </div>
        <div className="metrics-column">
          <div className="metric-card"><div className="metric-heading"><span className="metric-icon down">↓</span><span>DOWNLOAD</span><span className="metric-live">Mbps</span></div><div className="metric-value">{fmt(download)} <small>Mbps</small></div><div className="mini-bars">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+((i*17+(samples.length?Math.round(samples[samples.length-1]):7))%70)}%`}} />)}</div><p>Receiving data from the test node</p></div>
          <div className="metric-card"><div className="metric-heading"><span className="metric-icon up">↑</span><span>UPLOAD</span><span className="metric-live">Mbps</span></div><div className="metric-value">{fmt(upload)} <small>Mbps</small></div><div className="mini-bars upload-bars">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+((i*13+19)%64)}%`}} />)}</div><p>Sending data to the test node</p></div>
          <div className="latency-grid">
            <div className="latency-card"><div><span className="latency-symbol">◷</span> PING</div><strong>{fmt(ping)}<small>ms</small></strong><span className="metric-caption">Idle latency</span></div>
            <div className="latency-card"><div><span className="latency-symbol jitter-symbol">∿</span> JITTER</div><strong>{fmt(jitter)}<small>ms</small></strong><span className="metric-caption">Latency variation</span></div>
          </div>
        </div>
      </div>
    </section>
    <section className="history-section">
      <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR DATA</div><h2>Test history<span>.</span></h2></div><button className="clear-button" onClick={clearHistory} disabled={!history.length}>CLEAR HISTORY ×</button></div>
      {history.length ? <div className="history-table"><div className="history-row history-header"><span>DATE & TIME</span><span>DOWNLOAD</span><span>UPLOAD</span><span>PING</span><span>JITTER</span></div>{history.map((h,i)=><div className="history-row" key={h.date+i}><span>{new Date(h.date).toLocaleString()}</span><b>{fmt(h.download)} <small>Mbps</small></b><b>{fmt(h.upload)} <small>Mbps</small></b><span>{fmt(h.ping)} ms</span><span>{fmt(h.jitter)} ms</span></div>)}</div> : <div className="empty-history"><span className="empty-icon">⌁</span><div><strong>No test data yet</strong><p>Run your first speed test. Your last 10 results will appear here.</p></div></div>}
    </section>
    <footer><span>© {new Date().getFullYear()} NOVA SPEEDTEST</span><span>LIBRESPEED COMMUNITY NODES · RESULTS DEPEND ON SERVER CAPACITY</span><button onClick={share} disabled={status !== "done"}>SHARE LAST RESULT ↗</button></footer>
  </main>;
}
