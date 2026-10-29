"use client";

import { useEffect, useState } from "react";

type Result = { date: string; download: number; upload: number; ping: number; jitter: number };
const fmt = (n: number | null) => n === null || !Number.isFinite(n) ? "—" : n.toFixed(n >= 100 ? 0 : 1);

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

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("nova-speedtest-history") || "[]")); } catch {}
  }, []);

  async function startTest() {
    if (status === "running") return;
    setStatus("running"); setPhase("Measuring latency on this Vercel deployment"); setError("");
    setDownload(null); setUpload(null); setPing(null); setJitter(null); setSamples([]);
    const timedFetch = async (url: string, init?: RequestInit) => {
      const start = performance.now();
      const response = await fetch(url, { cache: "no-store", ...init });
      if (!response.ok) throw new Error("Vercel test endpoint returned " + response.status);
      return { response, ms: performance.now() - start };
    };
    try {
      const pings: number[] = [];
      for (let i = 0; i < 6; i++) {
        const result = await timedFetch("/api/speedtest/ping?nonce=" + crypto.randomUUID());
        await result.response.arrayBuffer(); pings.push(result.ms);
      }
      pings.sort((a,b)=>a-b);
      const pingValue = pings[Math.floor(pings.length / 2)];
      const jitterValue = pings.slice(1).reduce((sum, value, i) => sum + Math.abs(value - pings[i]), 0) / (pings.length - 1);
      setPing(pingValue); setJitter(jitterValue);
      setPhase("Measuring download from this Vercel deployment");
      let downloaded = 0;
      const downloadStart = performance.now();
      const downloadDeadline = downloadStart + 5000;
      while (performance.now() < downloadDeadline) {
        const result = await timedFetch("/api/speedtest/download?size=1000000&nonce=" + crypto.randomUUID());
        const data = await result.response.arrayBuffer(); downloaded += data.byteLength;
        const elapsed = (performance.now() - downloadStart) / 1000;
        if (elapsed > 0.35) { const rate = downloaded * 8 / elapsed / 1000000; setDownload(rate); setSamples(old => [...old.slice(-39), rate]); }
      }
      const downloadMbps = downloaded * 8 / ((performance.now() - downloadStart) / 1000) / 1000000;
      setDownload(downloadMbps);
      setPhase("Measuring upload to this Vercel deployment");
      let uploaded = 0;
      const payload = new Uint8Array(512 * 1024); payload.fill(0x5a);
      const uploadStart = performance.now();
      const uploadDeadline = uploadStart + 5000;
      while (performance.now() < uploadDeadline) {
        const result = await timedFetch("/api/speedtest/upload?nonce=" + crypto.randomUUID(), { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: payload });
        const data = await result.response.json(); uploaded += Number(data.receivedBytes || 0);
        const elapsed = (performance.now() - uploadStart) / 1000;
        if (elapsed > 0.35) setUpload(uploaded * 8 / elapsed / 1000000);
      }
      const uploadMbps = uploaded * 8 / ((performance.now() - uploadStart) / 1000) / 1000000;
      setUpload(uploadMbps); setStatus("done"); setPhase("Test complete · measured against Vercel");
      const item: Result = { date: new Date().toISOString(), download: downloadMbps, upload: uploadMbps, ping: pingValue, jitter: jitterValue };
      const old = JSON.parse(localStorage.getItem("nova-speedtest-history") || "[]");
      const next = [item, ...old].slice(0, 10); localStorage.setItem("nova-speedtest-history", JSON.stringify(next)); setHistory(next);
    } catch (e) { setStatus("error"); setPhase("Test failed"); setError(e instanceof Error ? e.message : "Unable to complete the Vercel-hosted speed test."); }
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
      <a className="github-link" href="/api/speedtest/ping" target="_blank" rel="noreferrer">SELF-HOSTED ↗</a>
    </header>
    <section className="hero">
      <div className="eyebrow"><span className="eyebrow-line" /> CONNECTION DIAGNOSTICS</div>
      <h1>Know your <span>real speed.</span></h1>
      <p className="subtitle">A browser-based connection test measured against this Vercel deployment.</p>
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
          <div className="gauge-foot"><span>TEST ENGINE</span><strong>Vercel endpoints</strong></div>
        </div>
        <div className="metrics-column">
          <div className="metric-card"><div className="metric-heading"><span className="metric-icon down">↓</span><span>DOWNLOAD</span><span className="metric-live">Mbps</span></div><div className="metric-value">{fmt(download)} <small>Mbps</small></div><div className="mini-bars">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+((i*17+(samples.length?Math.round(samples[samples.length-1]):7))%70)}%`}} />)}</div><p>Receiving data from this Vercel deployment</p></div>
          <div className="metric-card"><div className="metric-heading"><span className="metric-icon up">↑</span><span>UPLOAD</span><span className="metric-live">Mbps</span></div><div className="metric-value">{fmt(upload)} <small>Mbps</small></div><div className="mini-bars upload-bars">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+((i*13+19)%64)}%`}} />)}</div><p>Sending data to this Vercel deployment</p></div>
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
    <footer><span>© {new Date().getFullYear()} NOVA SPEEDTEST</span><span>VERCEL SERVERLESS ENDPOINTS · RESULTS DEPEND ON REGION & PLAN</span><button onClick={share} disabled={status !== "done"}>SHARE LAST RESULT ↗</button></footer>
  </main>;
}
