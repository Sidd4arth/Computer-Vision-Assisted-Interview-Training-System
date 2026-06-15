"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthNav } from "../auth-nav";

export default function CreatePage() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleInvite() {
    setGenerating(true);
    // Generate a unique invite UID
    const uid = crypto.randomUUID();
    const url = `${window.location.origin}/interview/invite/${uid}`;
    setInviteUrl(url);
    setGenerating(false);
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-neutral-900 px-6 py-4 sticky top-0 bg-neutral-950/90 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-mono text-sm text-neutral-500 hover:text-neutral-200 transition-colors">
              MockPrep
            </Link>
            <span className="text-neutral-800">|</span>
            <Link href="/dashboard" className="font-mono text-xs text-neutral-500 hover:text-neutral-200 transition-colors">
              Dashboard
            </Link>
            <span className="text-neutral-800">|</span>
            <span className="font-mono text-xs text-neutral-400">Create</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/new-session"
              className="font-mono text-xs border border-neutral-700 hover:border-neutral-500 px-4 py-2 rounded transition-colors"
            >
              New Session
            </Link>
            <AuthNav />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 border border-neutral-800 rounded-full px-4 py-1.5 mb-12">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
          <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">Coming Soon</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-16 max-w-2xl">
          <h1 className="font-serif text-5xl md:text-7xl text-white leading-[1.05] mb-6">
            COMING<br />
            <span className="italic text-neutral-500">SOON</span>
          </h1>
          <p className="text-neutral-500 text-lg leading-relaxed">
            Invite a real interviewer into a live session — video, audio, and
            collaborative coding, all in one place.
          </p>
        </div>

        {/* Invite Card */}
        <div className="w-full max-w-lg border border-neutral-800 rounded-2xl p-8 bg-neutral-950">
          <p className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-2">Invite System</p>
          <p className="text-neutral-400 text-sm leading-relaxed mb-8">
            Generate a unique invite link you can share with your interviewer. They&apos;ll join a private session room with
            integrated video and audio chat.
          </p>

          {!inviteUrl ? (
            <button
              id="invite-btn"
              onClick={handleInvite}
              disabled={generating}
              className="w-full font-mono text-sm bg-white text-black py-3 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating…" : "Invite Your Interviewer →"}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900/50">
                <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest mb-2">Your Invite Link</p>
                <p className="font-mono text-xs text-neutral-300 break-all leading-relaxed">{inviteUrl}</p>
              </div>
              <div className="flex gap-3">
                <button
                  id="copy-btn"
                  onClick={handleCopy}
                  className="flex-1 font-mono text-sm bg-white text-black py-2.5 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={() => { setInviteUrl(null); setCopied(false); }}
                  className="font-mono text-sm border border-neutral-800 text-neutral-500 px-4 py-2.5 rounded-lg hover:border-neutral-600 hover:text-neutral-300 transition-colors"
                >
                  New
                </button>
              </div>
              <p className="text-xs text-neutral-700 text-center">
                Share this link with your interviewer. The session room is ready when they join.
              </p>
            </div>
          )}
        </div>

        {/* Features preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-neutral-900 rounded-xl overflow-hidden max-w-2xl w-full">
          {[
            {
              icon: "◎",
              title: "Video Chat",
              desc: "HD video and audio powered by WebRTC — no downloads required.",
            },
            {
              icon: "⌘",
              title: "Live Coding",
              desc: "Shared Monaco editor with real-time collaboration and language support.",
            },
            {
              icon: "◈",
              title: "Behavioral Tracking",
              desc: "Gaze and posture analysis runs silently in the background.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-neutral-950 p-6 text-center">
              <div className="text-neutral-600 text-2xl mb-3">{f.icon}</div>
              <h3 className="font-mono text-xs text-neutral-400 uppercase tracking-wider mb-2">{f.title}</h3>
              <p className="text-neutral-700 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-neutral-900 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
          <span>Interview Evaluator Model</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
