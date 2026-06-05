"use client";

import { useEffect, useRef } from "react";

interface QuestionResult {
  title: string;
  difficulty: string;
  attempted: boolean;
  verdict: string;
  passed: number;
  total: number;
}

interface WebcamEvent {
  timestamp: number;
  type: string;
  message: string;
  severity: string;
}

interface Props {
  questionResults: QuestionResult[];
  postureScore: number;
  gazeScore: number;
  totalWarnings: number;
  passRate: number;
  webcamEvents: WebcamEvent[];
}

export default function ResultsCharts({ questionResults, postureScore, gazeScore, totalWarnings, passRate, webcamEvents }: Props) {
  const doughnutRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (doughnutRef.current) drawDoughnut(doughnutRef.current, questionResults);
    if (radarRef.current) drawRadar(radarRef.current, postureScore, gazeScore, totalWarnings);
    if (lineRef.current) drawTimeline(lineRef.current, webcamEvents);
    if (barRef.current) drawBar(barRef.current, questionResults);
  }, [questionResults, postureScore, gazeScore, totalWarnings, webcamEvents, passRate]);

  return (
    <>
      <div className="border border-neutral-900 rounded-lg p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mb-4">Performance</p>
        <div className="flex justify-center"><canvas ref={doughnutRef} width={220} height={220} /></div>
      </div>
      <div className="border border-neutral-900 rounded-lg p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mb-4">Behavioral</p>
        <div className="flex justify-center"><canvas ref={radarRef} width={220} height={220} /></div>
      </div>
      <div className="border border-neutral-900 rounded-lg p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mb-4">Per Question</p>
        <div className="flex justify-center"><canvas ref={barRef} width={380} height={180} /></div>
      </div>
      <div className="border border-neutral-900 rounded-lg p-5">
        <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mb-4">Timeline</p>
        <div className="flex justify-center"><canvas ref={lineRef} width={380} height={180} /></div>
      </div>
    </>
  );
}

function drawDoughnut(canvas: HTMLCanvasElement, results: QuestionResult[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const acc = results.filter((q) => q.verdict === "Accepted").length;
  const wrong = results.filter((q) => q.attempted && q.verdict !== "Accepted").length;
  const none = results.filter((q) => !q.attempted).length;
  const total = results.length || 1;
  const data = [
    { value: acc, color: "#e5e5e5" },
    { value: wrong, color: "#525252" },
    { value: none, color: "#1a1a1a" },
  ];
  const cx = 110, cy = 110, r = 80, ir = 55;
  let start = -Math.PI / 2;
  ctx.clearRect(0, 0, 220, 220);
  data.forEach((s) => {
    if (s.value === 0) return;
    const angle = (s.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.arc(cx, cy, ir, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    start += angle;
  });
  ctx.fillStyle = "#e5e5e5";
  ctx.font = "600 22px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${acc}/${total}`, cx, cy - 6);
  ctx.fillStyle = "#525252";
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.fillText("solved", cx, cy + 14);
}

function drawRadar(canvas: HTMLCanvasElement, posture: number, gaze: number, warnings: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, 220, 220);
  const cx = 110, cy = 105, mr = 70;
  const cats = [
    { l: "Posture", v: posture },
    { l: "Gaze", v: gaze },
    { l: "Focus", v: Math.max(0, 100 - warnings * 5) },
    { l: "Stillness", v: Math.max(0, 100 - warnings * 3) },
    { l: "Confidence", v: Math.round((posture + gaze) / 2) },
  ];
  const n = cats.length, step = (Math.PI * 2) / n;
  for (let lv = 1; lv <= 4; lv++) {
    const r = (mr * lv) / 4;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i * step - Math.PI / 2;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#1a1a1a";
    ctx.stroke();
  }
  ctx.beginPath();
  cats.forEach((c, i) => {
    const a = i * step - Math.PI / 2;
    const r = (c.v / 100) * mr;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(229,229,229,0.08)";
  ctx.fill();
  ctx.strokeStyle = "#525252";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  cats.forEach((c, i) => {
    const a = i * step - Math.PI / 2;
    const r = (c.v / 100) * mr;
    ctx.beginPath();
    ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 2, 0, Math.PI * 2);
    ctx.fillStyle = "#737373";
    ctx.fill();
  });
  ctx.fillStyle = "#525252";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  cats.forEach((c, i) => {
    const a = i * step - Math.PI / 2;
    const lr = mr + 16;
    ctx.fillText(c.l, cx + lr * Math.cos(a), cy + lr * Math.sin(a) + 4);
  });
}

function drawTimeline(canvas: HTMLCanvasElement, events: WebcamEvent[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (events.length === 0) {
    ctx.fillStyle = "#262626";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("No events", canvas.width / 2, canvas.height / 2);
    return;
  }
  const pad = { t: 15, r: 20, b: 30, l: 30 };
  const w = canvas.width - pad.l - pad.r, h = canvas.height - pad.t - pad.b;
  const t0 = events[0].timestamp;
  const buckets: Record<number, number> = {};
  events.forEach((e) => { const m = Math.floor((e.timestamp - t0) / 60000); buckets[m] = (buckets[m] || 0) + 1; });
  const maxM = Math.max(...Object.keys(buckets).map(Number), 1);
  const maxC = Math.max(...Object.values(buckets), 1);
  ctx.strokeStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + h);
  ctx.lineTo(pad.l + w, pad.t + h);
  ctx.stroke();
  const pts: [number, number][] = [];
  for (let m = 0; m <= maxM; m++) {
    const x = pad.l + (m / maxM) * w;
    const y = pad.t + h - ((buckets[m] || 0) / maxC) * h;
    pts.push([x, y]);
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = "#525252";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.lineTo(pad.l + w, pad.t + h);
  ctx.lineTo(pad.l, pad.t + h);
  ctx.closePath();
  ctx.fillStyle = "rgba(82,82,82,0.1)";
  ctx.fill();
  pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fillStyle = "#737373"; ctx.fill(); });
}

function drawBar(canvas: HTMLCanvasElement, results: QuestionResult[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (results.length === 0) return;
  const pad = { t: 15, r: 15, b: 30, l: 30 };
  const w = canvas.width - pad.l - pad.r, h = canvas.height - pad.t - pad.b;
  const maxT = Math.max(...results.map((q) => q.total), 1);
  const bw = Math.min(30, w / results.length / 2 - 4);
  const gap = (w - bw * 2 * results.length) / (results.length + 1);
  ctx.strokeStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + h);
  ctx.lineTo(pad.l + w, pad.t + h);
  ctx.stroke();
  results.forEach((q, i) => {
    const x = pad.l + gap * (i + 1) + bw * 2 * i;
    const th = (q.total / maxT) * h;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x, pad.t + h - th, bw, th);
    const ph = (q.passed / maxT) * h;
    ctx.fillStyle = q.verdict === "Accepted" ? "#737373" : "#333";
    ctx.fillRect(x + bw + 2, pad.t + h - ph, bw, ph);
    ctx.fillStyle = "#404040";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`Q${i + 1}`, x + bw, pad.t + h + 14);
  });
}
