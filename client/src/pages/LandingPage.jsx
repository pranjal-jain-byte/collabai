// LandingPage.jsx — Premium AI-Native Collaborative Workspace Landing Page
// Features interactive 3D perspective hero visual, real-time collaborator simulations, and complete feature highlights

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Sparkles, 
  Bot, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  FileText,
  History,
  ListTodo,
  FileSearch,
  ShieldCheck,
  Users,
  Check,
  MousePointer2,
  Github
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';

export default function LandingPage() {
  const [typedSnippet, setTypedSnippet] = useState('');
  const [activeCursorPos, setActiveCursorPos] = useState({ x: 42, y: 38 });

  // Restrained typing simulation inside the 3D hero document
  useEffect(() => {
    const sentences = [
      "Operational Transformation mathematically converges concurrent edits without conflicts.",
      "AI Review Mode evaluates 7 distinct dimensions: clarity, contradictions, and structural flow.",
      "Extract actionable tasks, assignees, and confirmed deadlines directly into project workflows.",
      "Ask Your Document grounds answers strictly in verified source sections without hallucinations."
    ];
    let sIdx = 0;
    let cIdx = 0;
    let deleting = false;

    const interval = setInterval(() => {
      const sentence = sentences[sIdx];
      if (!deleting) {
        cIdx++;
        if (cIdx >= sentence.length) {
          deleting = true;
          return;
        }
      } else {
        cIdx--;
        if (cIdx <= 0) {
          deleting = false;
          sIdx = (sIdx + 1) % sentences.length;
        }
      }
      setTypedSnippet(sentence.slice(0, cIdx));
    }, 55);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden">
      {/* Top Navigation */}
      <header className="h-16 border-b border-slate-800/80 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">CollabAI</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            SaaS Workspace
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <a href="#features" className="text-xs font-medium text-slate-400 hover:text-white transition-colors hidden sm:inline">
            Features
          </a>
          <a href="#architecture" className="text-xs font-medium text-slate-400 hover:text-white transition-colors hidden sm:inline">
            Architecture
          </a>
          <a href="#security" className="text-xs font-medium text-slate-400 hover:text-white transition-colors hidden sm:inline">
            Security
          </a>
          <a
            href="https://github.com/pranjal-jain-byte/collabai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <Link
            to="/dashboard"
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            Launch Workspace
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-6xl mx-auto text-center flex flex-col items-center relative">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-blue-600/10 blur-[120px] pointer-events-none -z-10 rounded-full" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 text-xs font-medium mb-8 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Next-Generation Collaborative Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mb-6">
          Great ideas happen <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
            together.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-400 max-w-2xl leading-relaxed mb-10">
          Write together in real time. Let AI sharpen your thinking. Turn collaborative documents into meaningful action.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
          <Link
            to="/dashboard"
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 text-sm cursor-pointer"
          >
            <span>Start collaborating</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/pranjal-jain-byte/collabai"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-md hover:-translate-y-0.5"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repo</span>
          </a>
          <a
            href="#features"
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-800 transition-colors text-sm cursor-pointer"
          >
            Explore features
          </a>
        </div>

        {/* 3D-INSPIRED INTERACTIVE COLLABORATION VISUAL STAGE */}
        <div className="w-full max-w-5xl mx-auto px-4 [perspective:1400px]">
          <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl p-4 sm:p-8 transform transition-transform duration-700 hover:[transform:rotateX(2deg)_rotateY(-2deg)] [transform-style:preserve-3d]">
            
            {/* Top Workspace Header Simulation */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                <span className="ml-2 font-mono text-slate-400">collabai.io/doc/distributed-systems</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  3 Collaborators Live
                </span>
                <div className="flex items-center -space-x-2">
                  <span className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-slate-900" title="Alex Rivera">A</span>
                  <span className="w-6 h-6 rounded-full bg-[#9333ea] text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-slate-900" title="Priya Sharma">P</span>
                  <span className="w-6 h-6 rounded-full bg-[#ea580c] text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-slate-900" title="Sarah Chen">S</span>
                </div>
              </div>
            </div>

            {/* Central Workspace Multi-Layer Canvas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
              
              {/* Document Page Card (Left / Center) */}
              <div className="lg:col-span-8 bg-white text-slate-900 rounded-xl p-8 sm:p-10 shadow-xl relative min-h-[340px] flex flex-col justify-between border border-slate-200">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-600">Product Engineering Specification v4</span>
                    <span className="font-mono">OT Version 24</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
                    High-Throughput Collaborative Architecture
                  </h3>

                  <p className="text-sm text-slate-700 leading-relaxed font-normal">
                    {typedSnippet}
                    <span className="inline-block w-2 h-4.5 bg-[#1a73e8] ml-1 animate-pulse align-middle" />
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#1a73e8] text-white align-super shadow-xs">
                      Alex Rivera
                    </span>
                  </p>
                </div>

                {/* Secondary Simulated Collaborator Cursor (Sarah Chen) */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#ea580c] inline-block animate-pulse" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ea580c] text-white">
                      Sarah Chen
                    </span>
                    <span className="text-slate-400 italic">Editing section 3.2...</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Zero merge collisions</span>
                </div>
              </div>

              {/* Floating Layered Intelligence Cards (Right) */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Layer 1: AI Review Card */}
                <div className="p-4 bg-slate-900/90 border border-indigo-500/30 rounded-xl shadow-lg backdrop-blur-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                      <FileSearch className="w-3.5 h-3.5" />
                      <span>AI Review Mode</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      Clarity Fix
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                    <span className="text-emerald-400 font-bold block mb-0.5">+ Suggested Replacement:</span>
                    &ldquo;Mathematically converges concurrent edits without conflicts.&rdquo;
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer">
                      <Check className="w-3 h-3" /> Accept Fix
                    </button>
                    <button className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded text-[11px] cursor-pointer">
                      Reject
                    </button>
                  </div>
                </div>

                {/* Layer 2: Action Items Card */}
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg backdrop-blur-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <ListTodo className="w-3.5 h-3.5" />
                      <span>Extracted Action Items</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">2 of 2 Done</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">Rewrite OT engine core</span>
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Sarah</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">Deploy Redis cluster</span>
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Alex</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-24 bg-slate-900/50 border-t border-slate-800/80" id="features">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 block">
              Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Where Teams Think, Write, and Build Together
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Every tool is unified into one calm, responsive workspace designed for long engineering sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/40 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-lg">Real-Time OT Collaboration</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sub-50ms keystroke diffing with mathematical Operational Transformation. Remote colored cursors and selection ranges adjust automatically across concurrent edits.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/40 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-lg">AI Document Review Mode</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Deep structured analysis across 7 dimensions: Clarity, Grammar, Structure, Contradictions, Missing Info, Unsupported Claims, and Redundancy. Apply suggestions safely via OT.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/40 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-lg">Ask Your Document</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Document-aware conversational assistant. Ask questions grounded strictly in the document text, verify key architectural decisions, and extract citations with zero hallucinations.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/40 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-lg">Durable Version History</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Persistent revision snapshots with visual diff comparison. Restoring an earlier version creates a clean new revision via OT without erasing subsequent editing history.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/40 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ListTodo className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-lg">Turn Documents into Actions</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                AI extracts concrete action items, responsible assignees, deadlines, and dependencies into an interactive checklist with real-time status tracking.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/40 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-lg">Dual-Tier Persistence</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Low-latency in-memory and Redis hot-path cache for instant typing responsiveness, combined with durable MongoDB transactional checkpointing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Reliability Section */}
      <section className="py-20 border-t border-slate-800/80 bg-slate-950" id="security">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Enterprise Security & Data Protection</span>
          </div>

          <h2 className="text-3xl font-bold text-white">
            Engineered for Security, Isolation & Zero Leaks
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase">Document Room Isolation</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict Socket.IO document boundaries prevent cursor leakage or edit bleed across document spaces.
              </p>
            </div>
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase">Backend Secret Isolation</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                All AI keys and tokens are restricted to server-side memory. Zero API secrets are bundled in the frontend.
              </p>
            </div>
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase">Deterministic Recovery</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Server restarts gracefully reconstruct state from MongoDB and Redis without dropping document content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-16 px-6 bg-gradient-to-b from-indigo-950/40 to-slate-950 border-t border-slate-800 text-center space-y-4">
        <h3 className="text-2xl sm:text-3xl font-bold text-white">
          Ready to experience modern collaborative writing?
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Create a blank document or start from an engineering sync template with instant real-time synchronization.
        </p>
        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md transition-colors cursor-pointer"
          >
            <span>Start Collaborating Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 sm:px-12 border-t border-slate-900 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-4 bg-slate-950">
        <div className="flex items-center gap-2 font-medium text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>CollabAI — Where teams think, write, and build together.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="hover:text-slate-300 transition-colors">Workspace</Link>
          <a
            href="https://github.com/pranjal-jain-byte/collabai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
          <a href="#security" className="hover:text-slate-300 transition-colors">Security</a>
        </div>
      </footer>
    </div>
  );
}
