// LandingPage Component - High-Performance SaaS Landing Page

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
  FileText 
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';

export default function LandingPage() {
  const [typedSnippet, setTypedSnippet] = useState('');

  // Interactive Typing Preview Effect
  useEffect(() => {
    const sentences = [
      "Keystrokes sync seamlessly across distributed browser sessions.",
      "Operational Transformation resolves overlapping edits deterministically.",
      "Google Gemini mediates semantic collisions when multiple minds write at once.",
      "Fast, distraction-free document editing built for high-performance teams."
    ];
    let sIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const interval = setInterval(() => {
      const sentence = sentences[sIndex];
      if (!isDeleting) {
        charIndex++;
        if (charIndex >= sentence.length) {
          isDeleting = true;
          return;
        }
      } else {
        charIndex--;
        if (charIndex <= 0) {
          isDeleting = false;
          sIndex = (sIndex + 1) % sentences.length;
        }
      }
      setTypedSnippet(sentence.slice(0, charIndex));
    }, 60);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar mode="landing" />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-8 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Operational Transformation & Gemini 2.0 Flash Integration</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-950 tracking-tight leading-tight max-w-4xl mb-6">
          Real-Time Collaborative Writing,<br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Engineered from First Principles.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed mb-10">
          Experience concurrent multi-user editing with mathematical convergence. Powered by custom Operational Transformation, sub-50ms WebSocket synchronization, and AI-mediated semantic conflict resolution.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center gap-2 text-base"
          >
            <span>Start Writing</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors text-base"
          >
            Explore Architecture
          </a>
        </div>
      </section>

      {/* Interactive Editor Window Preview */}
      <div className="max-w-5xl w-full mx-auto px-6 mb-24">
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Mock Window Header */}
          <div className="bg-gray-100 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            </div>
            <span className="text-xs font-medium text-gray-600">
              Getting Started with CollabAI — Live OT Workspace
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              2 Collaborators Active
            </span>
          </div>

          {/* Mock Editor Canvas */}
          <div className="bg-gray-100/60 p-8 flex justify-center">
            <div className="google-doc-page rounded p-8 sm:p-12 min-h-64 text-left w-full max-w-2xl bg-white shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Distributed Collaboration Systems</h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                CollabAI transforms keystrokes into positional insert/delete vectors: "{typedSnippet}"
                <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse align-middle"></span>
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-600 text-white align-super">
                  Alex Rivera
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section className="py-20 bg-white border-t border-gray-200" id="features">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 block">
              Core Capabilities
            </span>
            <h2 className="text-3xl font-bold text-gray-950 mb-4">
              Designed for Concurrency and Intelligence
            </h2>
            <p className="text-gray-600 text-base leading-relaxed">
              Every architectural layer is engineered to handle real-world collaboration challenges: concurrency races, network jitter, and semantic overlapping edits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">Custom OT Engine</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                From-scratch Operational Transformation supporting multi-character insert and delete diffing across client and server histories.
              </p>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">Gemini AI Assistant</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Integrated Google Gemini 2.0 Flash streams real-time typo fixes and stylistic refinements directly into an interactive review panel.
              </p>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">Conflict Mediator</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                When users edit nearby text within seconds, Gemini automatically evaluates semantic collisions and recommends clean merges.
              </p>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">Redis & MongoDB</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Low-latency in-memory cache for hot-path keystroke reads and instant session revocations, with durable checkpoints flushed to MongoDB.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Deep Dive */}
      <section className="py-20 bg-gray-50 border-t border-gray-200" id="architecture">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 block">
              Distributed Protocol
            </span>
            <h2 className="text-3xl font-bold text-gray-950 mb-4">
              How Keystrokes Traverse the System
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-gray-200 rounded-lg space-y-2">
              <div className="text-xs font-bold text-blue-600 uppercase">Step 1</div>
              <h4 className="font-semibold text-gray-900 text-base">Prefix/Suffix Diff</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                On each local keystroke, the client computes minimal positional delete and insert operations against its previous snapshot.
              </p>
            </div>
            <div className="p-5 bg-white border border-gray-200 rounded-lg space-y-2">
              <div className="text-xs font-bold text-blue-600 uppercase">Step 2</div>
              <h4 className="font-semibold text-gray-900 text-base">History Transform</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                The server transforms the incoming operation against any edits made since the client's baseVersion.
              </p>
            </div>
            <div className="p-5 bg-white border border-gray-200 rounded-lg space-y-2">
              <div className="text-xs font-bold text-blue-600 uppercase">Step 3</div>
              <h4 className="font-semibold text-gray-900 text-base">Broadcast & Ack</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                The server sends operation-ack to the sender while broadcasting the transformed operation payload to peers.
              </p>
            </div>
            <div className="p-5 bg-white border border-gray-200 rounded-lg space-y-2">
              <div className="text-xs font-bold text-blue-600 uppercase">Step 4</div>
              <h4 className="font-semibold text-gray-900 text-base">Caret Retention</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Peers apply the remote operation and shift their active caret position mathematically, preventing cursor jumping.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 bg-white border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>CollabAI — Modern Real-Time Document Editor</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Workspace</Link>
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#architecture" className="hover:text-blue-600 transition-colors">Architecture</a>
        </div>
      </footer>
    </div>
  );
}
