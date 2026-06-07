"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import WebcamPanel from "./WebcamPanel";

interface Question {
  id: number;
  questionIndex: number;
  title: string;
  difficulty: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  testCases: Array<{ input: string; expected_output: string; is_hidden: boolean }>;
  starterCode: Record<string, string>;
}

interface SessionData {
  uid: string;
  companyName: string;
  role: string;
  duration: number;
  status: string;
  startedAt: string | null;
}

interface SubmissionResult {
  test_case_index: number;
  passed: boolean;
  output: string;
  expected?: string;
  time_ms: number;
  memory_kb: number;
}

interface WebcamEvent {
  timestamp: number;
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
}

interface WarningToast {
  id: number;
  message: string;
  severity: string;
  exiting: boolean;
}

export default function InterviewClient({
  session,
  questions,
}: {
  session: SessionData;
  questions: Question[];
}) {
  const router = useRouter();
  const [isStarted, setIsStarted] = useState(session.status === "in_progress");
  const [qIdx, setQIdx] = useState(0);
  const [lang, setLang] = useState("python");
  const [codes, setCodes] = useState<Record<string, Record<string, string>>>({});
  const [startError, setStartError] = useState("");
  const [timeLeft, setTimeLeft] = useState(session.duration * 60);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [output, setOutput] = useState("");
  const [tab, setTab] = useState<"desc" | "tests" | "subs">("desc");
  const [showConsole, setShowConsole] = useState(false);
  const [verdicts, setVerdicts] = useState<Record<number, string>>({});
  const [endModal, setEndModal] = useState(false);
  const [warns, setWarns] = useState(0);
  const [toasts, setToasts] = useState<WarningToast[]>([]);
  const [mobPanel, setMobPanel] = useState<"problem" | "code" | "webcam">("problem");
  const [camGlow, setCamGlow] = useState(false);

  const evtsRef = useRef<WebcamEvent[]>([]);
  const toastId = useRef(0);

  const q = questions[qIdx];

  useEffect(() => {
    const init: Record<string, Record<string, string>> = {};
    questions.forEach((q) => { init[q.id] = { ...q.starterCode }; });
    setCodes(init);
  }, [questions]);

  useEffect(() => {
    if (session.startedAt && isStarted) {
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      setTimeLeft(Math.max(0, session.duration * 60 - elapsed));
    }
  }, [session.startedAt, session.duration, isStarted]);

  useEffect(() => {
    if (!isStarted) return;
    const id = setInterval(() => {
      setTimeLeft((p) => { if (p <= 1) { clearInterval(id); endSession(); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted]);

  const onWarning = useCallback((msg: string, sev: "low" | "medium" | "high", _t: string) => {
    setWarns((c) => c + 1);
    setCamGlow(true);
    setTimeout(() => setCamGlow(false), 1200);
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, message: msg, severity: sev, exiting: false }]);
    setTimeout(() => setToasts((p) => p.map((t) => t.id === id ? { ...t, exiting: true } : t)), 3500);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const onEvts = useCallback((e: WebcamEvent[]) => { evtsRef.current = e; }, []);

  const startSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${session.uid}/start`, { method: "POST" });
      if (res.ok) {
        setIsStarted(true);
        setStartError("");
      } else {
        const data = await res.json();
        setStartError(data.error || "Failed to start session");
        console.error("Start session error:", data);
      }
    } catch (e) {
      console.error(e);
      setStartError("Network error while starting session");
    }
  };

  const endSession = useCallback(async () => {
    if (evtsRef.current.length > 0) {
      try { await fetch(`/api/sessions/${session.uid}/webcam-log`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: evtsRef.current }) }); } catch { /* */ }
    }
    try { await fetch(`/api/sessions/${session.uid}/complete`, { method: "POST" }); router.push(`/results/${session.uid}`); } catch { /* */ }
  }, [session.uid, router]);

  const runCode = async () => {
    if (!q) return;
    setRunning(true); setShowConsole(true); setOutput("Running…\n");
    try {
      const res = await fetch(`/api/sessions/${session.uid}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, language: lang, code: codes[q.id]?.[lang] || "", submissionType: "run" }),
      });
      const data = await res.json();
      if (data.results) {
        let o = "";
        (data.results as SubmissionResult[]).forEach((r, i) => {
          o += `Case ${i + 1}: ${r.passed ? "PASS" : "FAIL"}\n  out: ${r.output}\n${r.expected ? `  exp: ${r.expected}\n` : ""}  ${r.time_ms}ms · ${(r.memory_kb / 1024).toFixed(1)}MB\n\n`;
        });
        o += `${data.totalPassed}/${data.totalTests} passed`;
        setOutput(o);
      }
    } catch { setOutput("Error"); } finally { setRunning(false); }
  };

  const submitCode = async () => {
    if (!q) return;
    setSubmitting(true); setShowConsole(true); setOutput("Submitting…\n");
    try {
      const res = await fetch(`/api/sessions/${session.uid}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, language: lang, code: codes[q.id]?.[lang] || "", submissionType: "submit" }),
      });
      const data = await res.json();
      if (data.results) {
        let o = `VERDICT: ${data.verdict}\n\n`;
        (data.results as SubmissionResult[]).forEach((r, i) => {
          o += `Case ${i + 1}: ${r.passed ? "PASS" : "FAIL"} · ${r.time_ms}ms\n`;
        });
        o += `\n${data.totalPassed}/${data.totalTests} passed`;
        setOutput(o);
        setVerdicts((p) => ({ ...p, [q.id]: data.verdict }));
      }
    } catch { setOutput("Error"); } finally { setSubmitting(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Pre-start
  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-4">Ready</p>
          <h1 className="font-serif text-3xl text-white mb-2">{session.companyName}</h1>
          <p className="text-neutral-500 mb-8">{session.role} · {session.duration} min · {questions.length} questions</p>

          <div className="border border-neutral-900 rounded-lg p-4 mb-6 space-y-2 font-mono text-xs text-neutral-500">
            <div className="flex justify-between"><span>Languages</span><span className="text-neutral-300">Python, C++, Java, JS</span></div>
            <div className="flex justify-between"><span>Webcam</span><span className="text-neutral-300">Behavioral analysis</span></div>
          </div>

          <button onClick={startSession}
            disabled={session.status !== "ready" || isStarted}
            className="w-full bg-white text-black font-mono text-sm py-3 rounded hover:bg-neutral-200 transition-colors disabled:opacity-50">
            Start →
          </button>
          {startError && (<p className="mt-2 text-xs text-red-500">{startError}</p>)}
          {session.status !== "ready" && (
            <p className="mt-2 text-xs text-neutral-400">Session not ready. Please wait...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-900 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-[11px] text-neutral-600 hidden sm:block truncate">
            {session.companyName} · {session.role}
          </span>
          <div className="flex gap-0.5">
            {questions.map((question, i) => (
              <button key={question.id} onClick={() => setQIdx(i)}
                className={`font-mono text-[10px] px-2 py-1 rounded transition-colors ${
                  i === qIdx ? "bg-white text-black"
                  : verdicts[question.id] === "Accepted" ? "bg-neutral-800 text-neutral-300"
                  : verdicts[question.id] ? "bg-neutral-900 text-neutral-500"
                  : "bg-neutral-900 text-neutral-600 hover:text-neutral-400"
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {warns > 0 && (
            <span className="font-mono text-[10px] text-neutral-500">{warns} warn{warns !== 1 ? "s" : ""}</span>
          )}
          <span className={`font-mono text-sm font-medium ${timeLeft < 300 ? "text-white timer-warning" : "text-neutral-400"}`}>
            {fmt(timeLeft)}
          </span>
          <button onClick={() => setEndModal(true)}
            className="font-mono text-[10px] text-neutral-600 hover:text-white border border-neutral-800 hover:border-neutral-600 px-2.5 py-1 rounded transition-colors">
            End
          </button>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="flex md:hidden border-b border-neutral-900 shrink-0">
        {(["problem", "code", "webcam"] as const).map((t) => (
          <button key={t} onClick={() => setMobPanel(t)}
            className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              mobPanel === t ? "text-white border-b border-white" : "text-neutral-600"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Problem */}
        <div className={`${mobPanel === "problem" ? "flex" : "hidden"} md:flex flex-col w-full md:w-[45%] border-r border-neutral-900 overflow-hidden`}>
          <div className="flex border-b border-neutral-900 shrink-0">
            {([{ k: "desc" as const, l: "Problem" }, { k: "tests" as const, l: "Tests" }, { k: "subs" as const, l: "Submissions" }]).map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`px-4 py-2 font-mono text-[11px] transition-colors ${
                  tab === t.k ? "text-white border-b border-white" : "text-neutral-600 hover:text-neutral-400"
                }`}>
                {t.l}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {tab === "desc" && q && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="font-serif text-xl text-white">{q.questionIndex + 1}. {q.title}</h2>
                  <span className="font-mono text-[10px] text-neutral-500 uppercase">{q.difficulty}</span>
                </div>
                {q.description.split("\n").map((line, i) => (
                  <p key={i} className="text-neutral-400 text-sm leading-relaxed mb-2">{line}</p>
                ))}
                <div className="mt-6 space-y-3">
                  {q.examples.map((ex, i) => (
                    <div key={i} className="border border-neutral-900 rounded-lg p-4">
                      <p className="font-mono text-[10px] text-neutral-600 uppercase mb-2">Example {i + 1}</p>
                      <div className="font-mono text-xs space-y-1">
                        <div><span className="text-neutral-600">Input: </span><span className="text-neutral-300">{ex.input}</span></div>
                        <div><span className="text-neutral-600">Output: </span><span className="text-neutral-300">{ex.output}</span></div>
                        {ex.explanation && <p className="text-neutral-600 mt-1">{ex.explanation}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "tests" && q && (
              <div className="space-y-3">
                {q.testCases.map((tc, i) => (
                  <div key={i} className="border border-neutral-900 rounded-lg p-3 font-mono text-xs">
                    <p className="text-neutral-600 text-[10px] uppercase mb-1">Case {i + 1}</p>
                    <div className="space-y-0.5">
                      <div><span className="text-neutral-600">In: </span><span className="text-neutral-400">{tc.input}</span></div>
                      <div><span className="text-neutral-600">Exp: </span><span className="text-neutral-400">{tc.expected_output}</span></div>
                    </div>
                  </div>
                ))}
                <p className="font-mono text-[10px] text-neutral-700 text-center py-2">+ hidden cases on submit</p>
              </div>
            )}
            {tab === "subs" && (
              <p className="text-neutral-700 text-sm text-center py-12 font-mono">Submit code to see results</p>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className={`${mobPanel === "code" ? "flex" : "hidden"} md:flex flex-col w-full md:flex-1 overflow-hidden`}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-900 shrink-0">
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              className="bg-transparent border border-neutral-800 rounded px-2 py-1 font-mono text-xs text-neutral-400 focus:outline-none">
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="javascript">JS</option>
            </select>
            <div className="flex gap-1.5">
              <button onClick={runCode} disabled={running || submitting}
                className="font-mono text-[11px] border border-neutral-800 hover:border-neutral-600 disabled:opacity-30 px-3 py-1 rounded text-neutral-400 hover:text-white transition-colors">
                {running ? "…" : "Run"}
              </button>
              <button onClick={submitCode} disabled={running || submitting}
                className="font-mono text-[11px] bg-white text-black hover:bg-neutral-200 disabled:opacity-30 px-3 py-1 rounded transition-colors">
                {submitting ? "…" : "Submit"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden">
              <textarea
                value={codes[q?.id]?.[lang] || ""}
                onChange={(e) => {
                  if (!q) return;
                  setCodes((p) => ({ ...p, [q.id]: { ...p[q.id], [lang]: e.target.value } }));
                }}
                className="w-full h-full bg-neutral-950 text-neutral-300 font-mono text-xs p-4 resize-none focus:outline-none leading-6 caret-white"
                spellCheck={false}
                placeholder="// write your solution"
              />
            </div>
            {showConsole && (
              <div className="h-36 border-t border-neutral-900 flex flex-col shrink-0">
                <div className="flex items-center justify-between px-3 py-1 border-b border-neutral-900">
                  <span className="font-mono text-[10px] text-neutral-600">output</span>
                  <button onClick={() => setShowConsole(false)} className="font-mono text-[10px] text-neutral-700 hover:text-neutral-400">×</button>
                </div>
                <pre className="flex-1 overflow-y-auto p-3 font-mono text-[11px] text-neutral-400 whitespace-pre-wrap">{output}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Webcam */}
        <div className={`${mobPanel === "webcam" ? "flex" : "hidden"} md:flex flex-col w-full md:w-[200px] lg:w-[220px] border-l border-neutral-900 p-2.5 gap-2.5 overflow-y-auto`}>
          <div className={`transition-shadow rounded-lg ${camGlow ? "webcam-glow" : ""}`}>
            <WebcamPanel isStarted={isStarted} onEventsUpdate={onEvts} onWarning={onWarning} />
          </div>
          <div className="border border-neutral-900 rounded-lg p-2.5">
            <p className="font-mono text-[9px] text-neutral-700 uppercase tracking-wider mb-2">Behavior</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-neutral-600">Warnings</span>
              <span className="font-mono text-[10px] text-neutral-400">{warns}</span>
            </div>
            <div className="w-full bg-neutral-900 rounded-full h-1">
              <div className="h-1 rounded-full bg-neutral-500 transition-all" style={{ width: `${Math.min(100, warns * 10)}%` }} />
            </div>
          </div>
          <div className="border border-neutral-900 rounded-lg p-2.5">
            <p className="font-mono text-[9px] text-neutral-700 uppercase tracking-wider mb-2">Alerts</p>
            {evtsRef.current.length === 0 ? (
              <p className="font-mono text-[10px] text-neutral-800">None yet</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {evtsRef.current.slice(-6).reverse().map((evt, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="mt-1 w-1 h-1 rounded-full bg-neutral-600 shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] text-neutral-500">{evt.message}</p>
                      <p className="font-mono text-[8px] text-neutral-800">{new Date(evt.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed top-12 right-3 z-50 flex flex-col gap-1.5 pointer-events-none" style={{ maxWidth: 280 }}>
        {toasts.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto font-mono text-xs px-3 py-2 rounded border transition-all ${
              t.exiting ? "opacity-0 translate-y-[-4px]" : "webcam-warning"
            } ${
              t.severity === "high" ? "bg-white text-black border-white warning-shake"
              : "bg-neutral-900 text-neutral-300 border-neutral-800"
            }`}>
            {t.message}
          </div>
        ))}
      </div>

      {/* End modal */}
      {endModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6 max-w-sm w-full">
            <p className="font-serif text-xl text-white mb-2">End session?</p>
            <p className="text-neutral-500 text-sm mb-6">You won&apos;t be able to submit any more code.</p>
            <div className="flex gap-2">
              <button onClick={() => setEndModal(false)}
                className="flex-1 font-mono text-xs border border-neutral-800 hover:border-neutral-600 py-2 rounded text-neutral-400 transition-colors">
                Continue
              </button>
              <button onClick={endSession}
                className="flex-1 font-mono text-xs bg-white text-black py-2 rounded hover:bg-neutral-200 transition-colors">
                End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
