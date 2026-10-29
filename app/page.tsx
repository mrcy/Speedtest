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
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("viera-speedtest-history") || localStorage.getItem("viera-speedtest-history") || "[]";
      setHistory(JSON.parse(saved));
      localStorage.setItem("viera-speedtest-history", saved);
    } catch {}
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => { setIsInstalled(true); setInstallPrompt(null); });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function startTest() {
    if (status === "running") return;
    setStatus("running");
    setPhase("Loading public LibreSpeed servers");
    setError("");
    setDownload(null); setUpload(null); setPing(null); setJitter(null); setSamples([]);

    type LibreServer = {
      name: string; server: string; id?: number;
      dlURL: string; ulURL: string; pingURL: string; getIpURL: string;
      sponsorName?: string; sponsorURL?: string;
    };
    type LibreUpdate = {
      dlStatus?: string; ulStatus?: string; pingStatus?: string; jitterStatus?: string;
      dlProgress?: number; ulProgress?: number; testState?: number;
      clientIp?: string; server?: LibreServer;
    };
    type LibreEngine = {
      addTestPoint: (point: LibreServer) => void;
      selectServer: (callback: (server: LibreServer | null) => void) => void;
      start: () => void;
      abort: () => void;
      onupdate: (data: LibreUpdate) => void;
      onend: (aborted: boolean) => void;
    };
    const win = window as Window & { Speedtest?: new () => LibreEngine };
    const loadEngine = async () => {
      if (win.Speedtest) return;
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-nova-librespeed="true"]');
        if (existing) {
          if (win.Speedtest) return resolve();
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("LibreSpeed engine could not load.")), { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = "/librespeed/speedtest.js";
        script.async = true;
        script.dataset.novaLibrespeed = "true";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("LibreSpeed engine could not load. Check your connection and try again."));
        document.head.appendChild(script);
      });
      if (!win.Speedtest) throw new Error("LibreSpeed engine loaded, but its API was not found.");
    };

    try {
      await loadEngine();
      setPhase("Finding the best available public server");
      const response = await fetch("/librespeed/server-list.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the public server list.");
      const points = await response.json() as LibreServer[];
      const usable = points.filter((point) => point.server && point.dlURL && point.ulURL && point.pingURL && point.getIpURL);
      if (!usable.length) throw new Error("No public LibreSpeed servers were returned.");
      const Engine = win.Speedtest;
      if (!Engine) throw new Error("LibreSpeed engine is unavailable.");
      const engine = new Engine();
      usable.forEach((point) => engine.addTestPoint(point));
      let measuredDownload: number | null = null;
      let measuredUpload: number | null = null;
      let measuredPing: number | null = null;
      let measuredJitter: number | null = null;
      const done = new Promise<void>((resolve, reject) => {
        let selectedName = "";
        let finished = false;
        const finish = (aborted: boolean) => {
          if (finished) return;
          finished = true;
          if (aborted) reject(new Error("The speed test was interrupted."));
          else resolve();
        };
        const timeout = window.setTimeout(() => {
          engine.abort();
          if (!finished) {
            finished = true;
            reject(new Error("The test took too long. Try again in a moment."));
          }
        }, 45000);
        engine.onupdate = (data) => {
          const d = Number(data.dlStatus);
          const u = Number(data.ulStatus);
          const p = Number(data.pingStatus);
          const j = Number(data.jitterStatus);
          if (Number.isFinite(d) && data.dlStatus) { measuredDownload = d; setDownload(d); setSamples(old => [...old.slice(-39), d]); }
          if (Number.isFinite(u) && data.ulStatus) { measuredUpload = u; setUpload(u); }
          if (Number.isFinite(p) && data.pingStatus) { measuredPing = p; setPing(p); }
          if (Number.isFinite(j) && data.jitterStatus) { measuredJitter = j; setJitter(j); }
          if (data.server?.name && data.server.name !== selectedName) {
            selectedName = data.server.name;
            setPhase("Testing with " + selectedName);
          } else if (data.testState === 1) setPhase("Measuring ping and jitter");
          else if (data.testState === 2) setPhase("Measuring download");
          else if (data.testState === 3) setPhase("Measuring upload");
        };
        engine.onend = (aborted) => {
          window.clearTimeout(timeout);
          finish(Boolean(aborted));
        };
        engine.selectServer((server) => {
          if (!server) {
            window.clearTimeout(timeout);
            if (!finished) { finished = true; reject(new Error("No public test server responded. Please retry.")); }
            return;
          }
          setPhase("Connected to " + server.name + ". Starting test");
          engine.start();
        });
      });
      await done;
      setStatus("done");
      setPhase("Test complete · public LibreSpeed server");
      const item: Result = {
        date: new Date().toISOString(),
        download: measuredDownload ?? 0,
        upload: measuredUpload ?? 0,
        ping: measuredPing ?? 0,
        jitter: measuredJitter ?? 0
      };
      const old = JSON.parse(localStorage.getItem("nova-speedtest-history") || "[]");
      const next = [item, ...old].slice(0, 10);
      localStorage.setItem("viera-speedtest-history", JSON.stringify(next));
      setHistory(next);
    } catch (e) {
      setStatus("error"); setPhase("Test failed");
      setError(e instanceof Error ? e.message : "Unable to complete the public speed test.");
    }
  }

  function clearHistory() { localStorage.removeItem("viera-speedtest-history"); localStorage.removeItem("nova-speedtest-history"); setHistory([]); }
  async function share() {
    const text = `My internet speed: Download ${fmt(download)} Mbps, Upload ${fmt(upload)} Mbps, Ping ${fmt(ping)} ms, Jitter ${fmt(jitter)} ms`;
    try {
      if (navigator.share) await navigator.share({ title: "Viera Speedtest result", text });
      else { await navigator.clipboard.writeText(text); setPhase("Result copied to clipboard"); }
    } catch {}
  }

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">V</span><span>VIERA<span className="brand-light">SPEED</span></span></a>
      <div className="top-pill"><span className="live-dot" /> INTERNET PERFORMANCE LAB</div>
      <div className="header-actions">
        {!isInstalled && <button className="install-button" onClick={async () => {
          if (installPrompt && "prompt" in installPrompt) {
            const promptEvent = installPrompt as Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
            await promptEvent.prompt();
            setInstallPrompt(null);
          } else setShowInstallHelp(v => !v);
        }}>{installPrompt ? "↓ INSTALL APP" : "＋ ADD TO PHONE"}</button>}
        <a className="github-link" href="https://github.com/librespeed/speedtest/blob/master/server-list.json" target="_blank" rel="noreferrer">PUBLIC NODES ↗</a>
      </div>
    </header>
    <section className="hero">
      {showInstallHelp && <div className="install-help"><strong>Install Viera on your phone</strong><p>Android: open the browser menu ⋮ and choose <b>Install app</b> or <b>Add to Home screen</b>. iPhone: tap Share, then <b>Add to Home Screen</b>. If this option is missing, wait for the latest deployment and reload the site over HTTPS.</p><button onClick={() => setShowInstallHelp(false)}>GOT IT ×</button></div>}
      <div className="eyebrow"><span className="eyebrow-line" /> CONNECTION DIAGNOSTICS</div>
      <h1>Know your <span>real speed.</span></h1>
      <p className="subtitle">A browser-based speed test using public LibreSpeed servers.</p>
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
          <div className="gauge-foot"><span>TEST ENGINE</span><strong>LibreSpeed public network</strong></div>
        </div>
        <div className="metrics-column">
          <div className="metric-card"><div className="metric-heading"><span className="metric-icon down">↓</span><span>DOWNLOAD</span><span className="metric-live">Mbps</span></div><div className="metric-value">{fmt(download)} <small>Mbps</small></div><div className="mini-bars">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+((i*17+(samples.length?Math.round(samples[samples.length-1]):7))%70)}%`}} />)}</div><p>Receiving data from selected public server</p></div>
          <div className="metric-card"><div className="metric-heading"><span className="metric-icon up">↑</span><span>UPLOAD</span><span className="metric-live">Mbps</span></div><div className="metric-value">{fmt(upload)} <small>Mbps</small></div><div className="mini-bars upload-bars">{Array.from({length:24},(_,i)=><i key={i} style={{height:`${12+((i*13+19)%64)}%`}} />)}</div><p>Sending data to selected public server</p></div>
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
    <footer><span>© {new Date().getFullYear()} VIERA SPEEDTEST</span><span>PUBLIC TEST SERVERS · RESULTS DEPEND ON SERVER & NETWORK</span><button onClick={share} disabled={status !== "done"}>SHARE LAST RESULT ↗</button></footer>
  </main>;
}
