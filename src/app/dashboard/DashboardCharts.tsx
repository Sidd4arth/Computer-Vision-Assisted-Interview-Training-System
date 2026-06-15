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

const C = {
  indigo:  "#818cf8", // light indigo
  cyan:    "#22d3ee", // light cyan
  emerald: "#34d399", // light emerald
  amber:   "#fbbf24", // light amber
  purple:  "#a78bfa", // light purple
  pink:    "#f472b6", // light pink
  orange:  "#fb923c",
  text:    "#e5e5e5",
  dim:     "#737373", // neutral-500
  grid:    "rgba(255,255,255,0.03)",
  pie: ["#818cf8", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#a78bfa"],
};

export default function DashboardCharts({ sessions, aggregate }: Props) {
  const scoreLineRef  = useRef<HTMLCanvasElement>(null);
  const passRateRef   = useRef<HTMLCanvasElement>(null);
  const behaviorRef   = useRef<HTMLCanvasElement>(null);
  const verdictRef    = useRef<HTMLCanvasElement>(null);
  const langRef       = useRef<HTMLCanvasElement>(null);
  const timingRef     = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (scoreLineRef.current)  drawScoreLine(scoreLineRef.current, sessions);
    if (passRateRef.current)   drawPassRateBar(passRateRef.current, sessions);
    if (behaviorRef.current)   drawBehaviorLine(behaviorRef.current, sessions);
    if (verdictRef.current)    drawVerdictDist(verdictRef.current, aggregate.verdictDist);
    if (langRef.current)       drawLangDist(langRef.current, aggregate.langDist);
    if (timingRef.current)     drawTimingBar(timingRef.current, sessions);
  }, [sessions, aggregate]);

  const cardStyle = {
    borderRadius: 12,
    padding: 20,
    background: "#000000",
    border: "1px solid #171717",
  } as const;

  const labelStyle = {
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: 10,
    color: "#a3a3a3", // neutral-400
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    marginBottom: 2,
  };

  const sublabelStyle = {
    fontSize: 11,
    color: "#525252", // neutral-600
    marginBottom: 14,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Score Trend */}
      <div style={{ ...cardStyle, gridColumn: "span 2" }} className="md:col-span-2">
        <p style={labelStyle}>Overall Score Trend</p>
        <p style={sublabelStyle}>Composite score across all sessions</p>
        <canvas ref={scoreLineRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Verdict Distribution */}
      <div style={cardStyle}>
        <p style={labelStyle}>Submission Verdicts</p>
        <p style={sublabelStyle}>Distribution of all outcomes</p>
        <canvas ref={verdictRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Pass Rate */}
      <div style={cardStyle}>
        <p style={labelStyle}>Pass Rate per Session</p>
        <p style={sublabelStyle}>% of test cases passed</p>
        <canvas ref={passRateRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Behavioral */}
      <div style={cardStyle}>
        <p style={labelStyle}>Behavioral Metrics</p>
        <p style={sublabelStyle}>Posture, gaze & focus trends</p>
        <canvas ref={behaviorRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Time vs Duration */}
      <div style={cardStyle}>
        <p style={labelStyle}>Time Usage</p>
        <p style={sublabelStyle}>Time taken vs allotted duration</p>
        <canvas ref={timingRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>

      {/* Language Distribution */}
      <div style={cardStyle}>
        <p style={labelStyle}>Languages Used</p>
        <p style={sublabelStyle}>Breakdown of coding languages</p>
        <canvas ref={langRef} className="w-full" height={160} style={{ display: "block" }} />
      </div>
    </div>
  );
}

// ─── Canvas helpers ────────────────────────────────────────────────────────────

function getCanvasWidth(canvas: HTMLCanvasElement): number {
  return canvas.clientWidth > 0 ? canvas.clientWidth : canvas.width;
}

function setupCanvas(
  canvas: HTMLCanvasElement
): { ctx: CanvasRenderingContext2D; W: number; H: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const W = getCanvasWidth(canvas) || canvas.width;
  canvas.width = W;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  return { ctx, W, H };
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  pad: { t: number; r: number; b: number; l: number },
  W: number,
  H: number,
  steps = 4,
  maxVal = 100,
  unit = ""
) {
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  for (let i = 0; i <= steps; i++) {
    const y = pad.t + (i / steps) * h;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = C.dim;
    ctx.font = "9px 'JetBrains Mono',monospace";
    ctx.textAlign = "right";
    const val = Math.round(maxVal - (i / steps) * maxVal);
    ctx.fillText(String(val) + unit, pad.l - 5, y + 3);
  }
}

// Score trend line chart
function drawScoreLine(canvas: HTMLCanvasElement, sessions: SessionStat[]) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;
  if (sessions.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 20, r: 20, b: 30, l: 42 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;

  drawGridLines(ctx, pad, W, H);

  const pts = sessions.map((s, i) => ({
    x: pad.l + (sessions.length === 1 ? w / 2 : (i / (sessions.length - 1)) * w),
    y: pad.t + h - (s.score / 100) * h,
    s,
  }));

  // Clean, thin fill gradient
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
  grad.addColorStop(0, "rgba(129,138,248,0.05)");
  grad.addColorStop(1, "rgba(129,138,248,0.00)");

  ctx.beginPath();
  pts.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.lineTo(pts[pts.length - 1].x, pad.t + h);
  ctx.lineTo(pts[0].x, pad.t + h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = C.indigo;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Dots + labels
  pts.forEach(({ x, y, s }) => {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = C.indigo;
    ctx.fill();

    ctx.fillStyle = C.dim;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";
    ctx.fillText(s.companyName.slice(0, 6), x, pad.t + h + 16);
    ctx.fillStyle = C.text;
    ctx.fillText(String(s.score), x, y - 8);
  });
}

// Pass rate bar chart
function drawPassRateBar(canvas: HTMLCanvasElement, sessions: SessionStat[]) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;
  if (sessions.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 20, r: 10, b: 30, l: 38 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const bw = Math.min(24, w / sessions.length - 6);
  const gap = (w - bw * sessions.length) / (sessions.length + 1);

  drawGridLines(ctx, pad, W, H, 4, 100, "%");

  sessions.forEach((s, i) => {
    const x = pad.l + gap * (i + 1) + bw * i;
    const bh = (s.passRate / 100) * h;
    const y = pad.t + h - bh;

    // Solid minimalist bar
    ctx.fillStyle = C.emerald;
    ctx.beginPath();
    ctx.rect(x, y, bw, bh);
    ctx.fill();

    ctx.fillStyle = C.dim;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";
    ctx.fillText(s.companyName.slice(0, 5), x + bw / 2, pad.t + h + 14);
    ctx.fillStyle = C.text;
    ctx.fillText(s.passRate + "%", x + bw / 2, Math.max(y - 4, pad.t + 10));
  });
}

// Behavioral multi-line chart
function drawBehaviorLine(canvas: HTMLCanvasElement, sessions: SessionStat[]) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;
  if (sessions.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 20, r: 20, b: 30, l: 38 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;

  drawGridLines(ctx, pad, W, H);

  const lines = [
    { key: "postureScore" as const, color: C.cyan,   label: "Posture" },
    { key: "gazeScore"   as const, color: C.purple, label: "Gaze"    },
    { key: "focusScore"  as const, color: C.amber,  label: "Focus"   },
  ];

  lines.forEach(({ key, color, label }, li) => {
    const pts = sessions.map((s, i) => ({
      x: pad.l + (sessions.length === 1 ? w / 2 : (i / (sessions.length - 1)) * w),
      y: pad.t + h - (s[key] / 100) * h,
    }));

    ctx.beginPath();
    pts.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    pts.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Legend item (square + label)
    ctx.fillStyle = color;
    ctx.fillRect(pad.l + li * 65, pad.t - 12, 6, 6);
    ctx.fillStyle = C.text;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, pad.l + li * 65 + 10, pad.t - 9);
  });
}

// Verdict donut chart
function drawVerdictDist(
  canvas: HTMLCanvasElement,
  dist: Record<string, number>
) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;

  const entries = Object.entries(dist);
  if (entries.length === 0) { drawEmpty(ctx, W, H); return; }

  const cx = W / 2, cy = (H - 18) / 2 + 8;
  const r = Math.min(W / 2, (H - 18) / 2) - 16;
  const ir = r * 0.70; // clean thinner ring
  const total = entries.reduce((a, [, v]) => a + v, 0);

  let start = -Math.PI / 2;
  entries.forEach(([label, val], i) => {
    const angle = (val / total) * Math.PI * 2;
    const color = C.pie[i % C.pie.length];

    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.arc(cx, cy, ir, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    start += angle;
  });

  // Legend at bottom
  const legendY = H - 5;
  let lx = 8;
  ctx.textBaseline = "middle";
  entries.forEach(([label], i) => {
    const color = C.pie[i % C.pie.length];
    ctx.fillStyle = color;
    ctx.fillRect(lx, legendY - 6, 6, 6);
    ctx.fillStyle = C.dim;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.textAlign = "left";
    ctx.fillText(label.slice(0, 8), lx + 10, legendY - 3);
    lx += label.slice(0, 8).length * 5.5 + 22;
    if (lx > W - 30) lx = 8;
  });
}

// Language horizontal bar chart
function drawLangDist(
  canvas: HTMLCanvasElement,
  dist: Record<string, number>
) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;

  const entries = Object.entries(dist);
  if (entries.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 15, r: 12, b: 10, l: 60 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const bh = Math.min(18, h / entries.length - 4);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const barColors = [C.indigo, C.cyan, C.emerald, C.purple, C.amber, C.pink];

  entries.forEach(([lang, val], i) => {
    const y = pad.t + i * (bh + 6);
    const bw = (val / maxVal) * w;
    const color = barColors[i % barColors.length];

    // Solid bar
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.rect(pad.l, y, bw, bh);
    ctx.fill();

    ctx.fillStyle = C.text;
    ctx.font = "9px 'JetBrains Mono',monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(lang, pad.l - 6, y + bh / 2);

    ctx.fillStyle = C.dim;
    ctx.textAlign = "left";
    ctx.fillText(String(val), pad.l + bw + 6, y + bh / 2);
  });
}

// Timing paired bar chart
function drawTimingBar(canvas: HTMLCanvasElement, sessions: SessionStat[]) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, W, H } = setup;
  if (sessions.length === 0) { drawEmpty(ctx, W, H); return; }

  const pad = { t: 20, r: 10, b: 30, l: 38 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const pairW = w / sessions.length;
  const bw = Math.min(12, pairW / 3);

  const maxDur = Math.max(...sessions.map((s) => s.duration), 1);

  drawGridLines(ctx, pad, W, H, 4, maxDur, "m");

  sessions.forEach((s, i) => {
    const cx = pad.l + (i + 0.5) * pairW;

    // Allotted bar (gray/dark)
    const dh = (s.duration / maxDur) * h;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.rect(cx - bw - 2, pad.t + h - dh, bw, dh);
    ctx.fill();

    // Time taken bar (emerald / orange if high)
    const th = (Math.min(s.timeTaken, s.duration) / maxDur) * h;
    const ratio = s.timeTaken / s.duration;
    const tColor = ratio > 0.9 ? C.orange : C.emerald;
    ctx.fillStyle = tColor;
    ctx.beginPath();
    ctx.rect(cx + 2, pad.t + h - th, bw, th);
    ctx.fill();

    ctx.fillStyle = C.dim;
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.companyName.slice(0, 5), cx, pad.t + h + 14);
  });

  // Legend
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(pad.l, pad.t - 14, 6, 6);
  ctx.fillStyle = C.dim;
  ctx.font = "8px 'JetBrains Mono',monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Allotted", pad.l + 10, pad.t - 10);

  ctx.fillStyle = C.emerald;
  ctx.fillRect(pad.l + 68, pad.t - 14, 6, 6);
  ctx.fillStyle = C.dim;
  ctx.fillText("Used", pad.l + 78, pad.t - 10);
}

function drawEmpty(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = C.dim;
  ctx.font = "11px 'JetBrains Mono',monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("No data yet", W / 2, H / 2);
}
