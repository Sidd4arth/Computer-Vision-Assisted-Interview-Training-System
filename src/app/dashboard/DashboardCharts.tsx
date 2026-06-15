"use client";

import { useEffect, useRef } from "react";

interface SessionStat {
  id: number;
  uid: string;
  companyName: string;
  role: string;
  duration: number;
  timeTaken: number;
  createdAt: string;
  completedAt: string | null;
  passRate: number;
  accepted: number;
  totalSubmissions: number;
  postureScore: number;
  gazeScore: number;
  totalWarnings: number;
  focusScore: number;
  score: number;
}

interface Aggregate {
  totalSessions: number;
  avgPassRate: number;
  avgScore: number;
  avgPosture: number;
  avgGaze: number;
  totalWarnings: number;
  totalAccepted: number;
  verdictDist: Record<string, number>;
  companyDist: Record<string, number>;
  langDist: Record<string, number>;
}

interface Props {
  sessions: SessionStat[];
  aggregate: Aggregate;
}

const COLORS = {
  white: "#e5e5e5",
  mid: "#737373",
  dim: "#404040",
  dark: "#1a1a1a",
  bg: "#0a0a0a",
};

export default function DashboardCharts({ sessions, aggregate }: Props) {
  const scoreLineRef = useRef<HTMLCanvasElement>(null);
  const passRateRef = useRef<HTMLCanvasElement>(null);
  const behaviorRef = useRef<HTMLCanvasElement>(null);
  const verdictRef = useRef<HTMLCanvasElement>(null);
  const langRef = useRef<HTMLCanvasElement>(null);
  const timingRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (scoreLineRef.current) drawScoreLine(scoreLineRef.current, sessions);
    if (passRateRef.current) drawPassRateBar(passRateRef.current, sessions);
    if (behaviorRef.current) drawBehaviorLine(behaviorRef.current, sessions);
    if (verdictRef.current) drawVerdictDist(verdictRef.current, aggregate.verdictDist);
    if (langRef.current) drawLangDist(langRef.current, aggregate.langDist);
    if (timingRef.current) drawTimingBar(timingRef.current, sessions);
  }, [sessions, aggregate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Score Trend */}
      <div className="border border-neutral-900 rounded-xl p-5 md:col-span-2 xl:col-span-2">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Overall Score Trend</p>
        <p className="text-xs text-neutral-700 mb-4">Composite score across all sessions</p>
        <canvas ref={scoreLineRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Verdict Distribution */}
      <div className="border border-neutral-900 rounded-xl p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Submission Verdicts</p>
        <p className="text-xs text-neutral-700 mb-4">Distribution of all submission outcomes</p>
        <canvas ref={verdictRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Pass Rate */}
      <div className="border border-neutral-900 rounded-xl p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Pass Rate per Session</p>
        <p className="text-xs text-neutral-700 mb-4">% of test cases passed</p>
        <canvas ref={passRateRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Behavioral */}
      <div className="border border-neutral-900 rounded-xl p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Behavioral Metrics</p>
        <p className="text-xs text-neutral-700 mb-4">Posture, gaze & focus across sessions</p>
        <canvas ref={behaviorRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Time vs Duration */}
      <div className="border border-neutral-900 rounded-xl p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Time Usage</p>
        <p className="text-xs text-neutral-700 mb-4">Time taken vs allotted duration</p>
        <canvas ref={timingRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Language Distribution */}
      <div className="border border-neutral-900 rounded-xl p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mb-1">Languages Used</p>
        <p className="text-xs text-neutral-700 mb-4">Breakdown of coding languages</p>
        <canvas ref={langRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>
    </div>
  );
}

// ─── Canvas Drawing Helpers ────────────────────────────────────────────────────

function getCanvasWidth(canvas: HTMLCanvasElement): number {
  return canvas.clientWidth > 0 ? canvas.clientWidth : canvas.width;
}

function setupCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; W: number; H: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const W = getCanvasWidth(canvas) || canvas.width;
  canvas.width = W;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  return { ctx, W, H };
}

function drawScoreLine(canvas: HTMLCanvasElement, sessions: SessionStat[]) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;

  if (sessions.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 20, r: 20, b: 30, l: 40 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#404040";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(100 - i * 25), pad.l - 5, y + 3);
  }

  const pts = sessions.map((s, i) => ({
    x: pad.l + (sessions.length === 1 ? w / 2 : (i / (sessions.length - 1)) * w),
    y: pad.t + h - (s.score / 100) * h,
    s,
  }));

  // Area fill
  ctx.beginPath();
  pts.forEach(({ x, y }, i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.lineTo(pts[pts.length - 1].x, pad.t + h);
  ctx.lineTo(pts[0].x, pad.t + h);
  ctx.closePath();
  ctx.fillStyle = "rgba(115,115,115,0.07)";
  ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach(({ x, y }, i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = "#737373";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Dots + labels
  pts.forEach(({ x, y, s }, i) => {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#e5e5e5";
    ctx.fill();
    ctx.fillStyle = "#525252";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(s.companyName.slice(0, 6), x, pad.t + h + 16);
    ctx.fillStyle = "#737373";
    ctx.fillText(String(s.score), x, y - 7);
  });
}

function drawPassRateBar(canvas: HTMLCanvasElement, sessions: SessionStat[]) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;

  if (sessions.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 20, r: 10, b: 30, l: 35 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const bw = Math.min(28, w / sessions.length - 6);
  const gap = (w - bw * sessions.length) / (sessions.length + 1);

  // Y axis
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#404040";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(100 - i * 25) + "%", pad.l - 3, y + 3);
  }

  sessions.forEach((s, i) => {
    const x = pad.l + gap * (i + 1) + bw * i;
    const bh = (s.passRate / 100) * h;
    const y = pad.t + h - bh;

    // Bar background
    ctx.fillStyle = "#111";
    ctx.fillRect(x, pad.t, bw, h);

    // Bar fill
    const alpha = 0.4 + 0.6 * (s.passRate / 100);
    ctx.fillStyle = `rgba(115,115,115,${alpha})`;
    ctx.fillRect(x, y, bw, bh);

    // Label
    ctx.fillStyle = "#525252";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(s.companyName.slice(0, 5), x + bw / 2, pad.t + h + 14);
    ctx.fillStyle = "#737373";
    ctx.fillText(s.passRate + "%", x + bw / 2, Math.max(y - 4, pad.t + 10));
  });
}

function drawBehaviorLine(canvas: HTMLCanvasElement, sessions: SessionStat[]) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;

  if (sessions.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 20, r: 20, b: 30, l: 35 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;

  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#404040";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(100 - i * 25), pad.l - 3, y + 3);
  }

  const lines = [
    { key: "postureScore" as const, color: "#737373", label: "Posture" },
    { key: "gazeScore" as const, color: "#525252", label: "Gaze" },
    { key: "focusScore" as const, color: "#404040", label: "Focus" },
  ];

  lines.forEach(({ key, color, label }, li) => {
    const pts = sessions.map((s, i) => ({
      x: pad.l + (sessions.length === 1 ? w / 2 : (i / (sessions.length - 1)) * w),
      y: pad.t + h - (s[key] / 100) * h,
    }));

    ctx.beginPath();
    pts.forEach(({ x, y }, i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    pts.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Legend
    ctx.fillStyle = color;
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`— ${label}`, pad.l + li * 60, pad.t - 6);
  });
}

function drawVerdictDist(canvas: HTMLCanvasElement, dist: Record<string, number>) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;

  const entries = Object.entries(dist);
  if (entries.length === 0) { drawEmpty(ctx, W, H); return; }

  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 20;
  const ir = r * 0.55;
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const shades = ["#e5e5e5", "#a3a3a3", "#737373", "#525252", "#404040", "#2a2a2a"];

  let start = -Math.PI / 2;
  entries.forEach(([label, val], i) => {
    const angle = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.arc(cx, cy, ir, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = shades[i % shades.length];
    ctx.fill();

    // Label on segment
    const midAngle = start + angle / 2;
    const lx = cx + (r + ir) / 2 * Math.cos(midAngle);
    const ly = cy + (r + ir) / 2 * Math.sin(midAngle);
    if (angle > 0.3) {
      ctx.fillStyle = i === 0 ? "#0a0a0a" : "#e5e5e5";
      ctx.font = "bold 8px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(val), lx, ly);
    }

    start += angle;
  });

  // Legend below chart
  const legendY = H - 5;
  let lx = 8;
  entries.forEach(([label], i) => {
    ctx.fillStyle = shades[i % shades.length];
    ctx.fillRect(lx, legendY - 8, 6, 6);
    ctx.fillStyle = "#525252";
    ctx.font = "7px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label.slice(0, 8), lx + 8, legendY - 5);
    lx += label.slice(0, 8).length * 5 + 20;
    if (lx > W - 30) { lx = 8; }
  });
}

function drawLangDist(canvas: HTMLCanvasElement, dist: Record<string, number>) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;

  const entries = Object.entries(dist);
  if (entries.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 15, r: 10, b: 10, l: 70 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const bh = Math.min(22, h / entries.length - 4);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  entries.forEach(([lang, val], i) => {
    const y = pad.t + i * (bh + 6);
    const bw = (val / maxVal) * w;

    // Background
    ctx.fillStyle = "#111";
    ctx.fillRect(pad.l, y, w, bh);

    // Fill
    const alpha = 0.35 + 0.65 * (val / maxVal);
    ctx.fillStyle = `rgba(115,115,115,${alpha})`;
    ctx.fillRect(pad.l, y, bw, bh);

    // Label
    ctx.fillStyle = "#737373";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(lang, pad.l - 5, y + bh / 2);

    // Count
    ctx.fillStyle = "#525252";
    ctx.textAlign = "left";
    ctx.fillText(String(val), pad.l + bw + 5, y + bh / 2);
  });
}

function drawTimingBar(canvas: HTMLCanvasElement, sessions: SessionStat[]) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;

  if (sessions.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 20, r: 10, b: 30, l: 35 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const pairW = w / sessions.length;
  const bw = Math.min(14, pairW / 3);

  const maxDur = Math.max(...sessions.map((s) => s.duration), 1);

  // Y axis
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#404040";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(maxDur - (i / 4) * maxDur)) + "m", pad.l - 3, y + 3);
  }

  sessions.forEach((s, i) => {
    const cx = pad.l + (i + 0.5) * pairW;

    // Duration bar (total allotted)
    const dh = (s.duration / maxDur) * h;
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(cx - bw - 2, pad.t + h - dh, bw, dh);

    // Time taken bar
    const th = (Math.min(s.timeTaken, s.duration) / maxDur) * h;
    const ratio = s.timeTaken / s.duration;
    ctx.fillStyle = ratio > 0.9 ? "#525252" : "#737373";
    ctx.fillRect(cx + 2, pad.t + h - th, bw, th);

    ctx.fillStyle = "#404040";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(s.companyName.slice(0, 5), cx, pad.t + h + 14);
  });

  // Legend
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(pad.l, pad.t - 14, 8, 8);
  ctx.fillStyle = "#404040";
  ctx.font = "8px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText("Allotted", pad.l + 11, pad.t - 8);
  ctx.fillStyle = "#737373";
  ctx.fillRect(pad.l + 70, pad.t - 14, 8, 8);
  ctx.fillStyle = "#404040";
  ctx.fillText("Used", pad.l + 83, pad.t - 8);
}

function drawEmpty(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "#262626";
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("No data yet", W / 2, H / 2);
}
