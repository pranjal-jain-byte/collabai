// Landing Page Component - High Performance SaaS with Motion Graphics & Real-Time Interactive Visualizations

import { ICONS } from '../icons.js';
import { store } from '../state.js';

export class LandingPage {
    constructor(container) {
        this.container = container;
        this.typingInterval = null;
        this.animTimeouts = [];
    }

    mount() {
        this.render();
        this._startInteractivePreview();
        this._attachPipelineSimulation();
    }

    unmount() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
        for (const t of this.animTimeouts) {
            clearTimeout(t);
        }
        this.animTimeouts = [];
    }

    render() {
        this.container.innerHTML = `
            <div class="landing-container">
                <!-- Hero Section with Motion Backdrop -->
                <section class="hero">
                    <!-- Ambient Dynamic Mesh / Glowing Motion Orbs -->
                    <div class="hero-motion-backdrop" aria-hidden="true">
                        <div class="motion-orb orb-1"></div>
                        <div class="motion-orb orb-2"></div>
                        <div class="motion-orb orb-3"></div>
                        <div class="motion-grid-overlay"></div>
                    </div>

                    <!-- Top Pill Link with GitHub repo tag -->
                    <a href="https://github.com/pranjal-jain-byte/collabai" target="_blank" rel="noopener" class="hero-github-pill" title="View Source on GitHub">
                        ${ICONS.github}
                        <span class="hero-github-repo">pranjal-jain-byte/collabai</span>
                        <span class="hero-github-stars">★ Star on GitHub</span>
                    </a>

                    <div class="hero-pill">
                        <span class="hero-pill-sparkle">${ICONS.sparkle}</span>
                        <span>Engineered with Operational Transformation & Gemini 2.0 Flash</span>
                    </div>

                    <h1 class="hero-title">
                        Real-Time Collaborative Writing,<br />
                        <span class="hero-title-highlight">Engineered from First Principles.</span>
                    </h1>

                    <p class="hero-subtitle">
                        Experience concurrent multi-user editing with mathematical convergence. Powered by a custom Operational Transformation algorithm, sub-50ms WebSocket synchronization, and AI-mediated semantic conflict resolution.
                    </p>

                    <div class="hero-cta-group">
                        <a href="#/dashboard" class="btn btn-primary hero-cta-primary">
                            <span>Start Writing</span>
                            ${ICONS.arrowRight}
                        </a>
                        <a href="https://github.com/pranjal-jain-byte/collabai" target="_blank" rel="noopener" class="btn btn-github hero-cta-github" title="Open GitHub Repository">
                            ${ICONS.github}
                            <span>GitHub Code</span>
                            ${ICONS.externalLink}
                        </a>
                        <a href="#architecture" class="btn btn-secondary hero-cta-secondary">
                            <span>Explore Architecture</span>
                        </a>
                    </div>
                </section>

                <!-- Interactive Document Motion Graphic Preview -->
                <div class="hero-preview-wrapper">
                    <div class="hero-preview-window">
                        <div class="preview-window-header">
                            <div class="preview-window-dots">
                                <span class="preview-dot red"></span>
                                <span class="preview-dot yellow"></span>
                                <span class="preview-dot green"></span>
                            </div>
                            <div class="preview-window-title">CollabAI Canvas — Multi-Collaborator OT Concurrency Active</div>
                            <div class="preview-window-metrics">
                                <div class="preview-metric-chip">
                                    <span class="ping-dot"></span>
                                    <span>2 Peers Active</span>
                                </div>
                                <div class="preview-metric-chip">
                                    <span class="metric-val" id="preview-latency">14ms</span>
                                    <span>Sync RTT</span>
                                </div>
                                <div class="preview-metric-chip">
                                    <span class="metric-val" id="preview-version">v28</span>
                                    <span>OT Version</span>
                                </div>
                            </div>
                        </div>

                        <div class="preview-window-content">
                            <div class="preview-doc-canvas">
                                <div class="preview-doc-h1">Sprint 24 — Distributed Collaborative Engine</div>
                                <div class="preview-doc-body" id="preview-doc-body">
                                    <p class="preview-lead-text">
                                        CollabAI decomposes keystrokes into character-level insert and delete vectors. 
                                        When multiple team members type at the same time:
                                    </p>
                                    <div class="preview-live-stream" id="preview-live-stream">
                                        <!-- Real-time multi-collaborator animated typing & highlighting stream -->
                                    </div>
                                </div>

                                <!-- Floating Live OT Telemetry Toast -->
                                <div class="preview-ot-toast" id="preview-ot-toast">
                                    <span class="ot-badge">OT STREAM</span>
                                    <span class="ot-msg" id="preview-ot-msg">Diff Engine Active: Multi-character convergence</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Features Section -->
                <section class="features-section" id="features">
                    <div class="section-header">
                        <div class="section-tag">Core Capabilities</div>
                        <h2 class="section-title">Designed for Concurrency and Intelligence</h2>
                        <p class="section-subtitle">
                            Every architectural layer was engineered to handle real-world collaboration challenges: race conditions, network jitter, and semantic overlapping edits.
                        </p>
                    </div>

                    <div class="features-grid">
                        <div class="feature-card feature-card-animated">
                            <div class="feature-card-glow"></div>
                            <div class="feature-icon-wrapper icon-blue">${ICONS.zap}</div>
                            <h3 class="feature-title">Custom OT Algorithm</h3>
                            <p class="feature-desc">
                                From-scratch Operational Transformation supporting multi-character insert and delete diffing. Operations are transformed against server histories so edits converge reliably.
                            </p>
                        </div>

                        <div class="feature-card feature-card-animated">
                            <div class="feature-card-glow"></div>
                            <div class="feature-icon-wrapper icon-purple">${ICONS.sparkle}</div>
                            <h3 class="feature-title">Gemini AI Writing Engine</h3>
                            <p class="feature-desc">
                                Integrated Google Gemini 2.0 Flash streams real-time typo corrections and stylistic improvements directly into an interactive review panel without blocking document typing.
                            </p>
                        </div>

                        <div class="feature-card feature-card-animated">
                            <div class="feature-card-glow"></div>
                            <div class="feature-icon-wrapper icon-amber">${ICONS.robot}</div>
                            <h3 class="feature-title">Semantic Conflict Mediator</h3>
                            <p class="feature-desc">
                                OT ensures structural validity, but cannot understand meaning. When users edit overlapping sentences within seconds, our AI mediator suggests a harmonious merge.
                            </p>
                        </div>

                        <div class="feature-card feature-card-animated">
                            <div class="feature-card-glow"></div>
                            <div class="feature-icon-wrapper icon-green">${ICONS.cloud}</div>
                            <h3 class="feature-title">Redis & MongoDB Persistence</h3>
                            <p class="feature-desc">
                                Hot-path reads and session revocations run through Redis in-memory caches, with periodic asynchronous checkpoints flushed to MongoDB for durability.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Architecture & Motion Graphic OT Pipeline Section -->
                <section class="architecture-section" id="architecture">
                    <div class="section-header">
                        <div class="section-tag">Interactive Architecture</div>
                        <h2 class="section-title">Operational Transformation Circuit</h2>
                        <p class="section-subtitle">
                            Visualizing how concurrent operations travel, resolve race conditions, and synchronize across distributed clients without locking.
                        </p>
                    </div>

                    <!-- Interactive Motion Graphic Pipeline Diagram -->
                    <div class="ot-motion-pipeline" id="ot-pipeline-box">
                        <div class="ot-pipeline-header">
                            <div class="ot-pipeline-title">
                                ${ICONS.gitBranch}
                                <span>Real-Time Concurrency Vector Engine</span>
                            </div>
                            <div class="ot-pipeline-actions">
                                <button class="btn btn-secondary btn-sm" id="btn-simulate-collision" title="Trigger simultaneous edits to see OT transform vectors">
                                    ${ICONS.zap}
                                    <span>Simulate Concurrent Race Condition</span>
                                </button>
                                <span class="ot-pipeline-badge" id="pipeline-status-badge">Engine Ready • Listening on ws://</span>
                            </div>
                        </div>

                        <!-- Motion Graphic Circuit Grid -->
                        <div class="ot-pipeline-grid">
                            <!-- Node 1: Client A (London) -->
                            <div class="pipeline-node node-client" id="node-client-a">
                                <div class="node-badge" style="background:#8b5cf6;">Client A (Alex)</div>
                                <div class="node-loc">London • RTT 18ms</div>
                                <div class="node-state-box">
                                    <span class="state-label">Local Op:</span>
                                    <code class="state-code" id="client-a-op">insert("Fast", 12)</code>
                                </div>
                            </div>

                            <!-- Data Laser Stream 1 -->
                            <div class="pipeline-connector">
                                <div class="packet-chip" id="packet-chip-a">OpA(v28)</div>
                                <div class="pulse-beam" id="beam-a"></div>
                            </div>

                            <!-- Central Server Node (OT Engine + Redis) -->
                            <div class="pipeline-node node-hub" id="node-server-hub">
                                <div class="node-badge" style="background:#2563eb;">OT Server Core</div>
                                <div class="node-loc">Frankfurt • Redis Hot Cache</div>
                                <div class="hub-radar">
                                    <div class="radar-core"></div>
                                    <div class="radar-ring"></div>
                                </div>
                                <div class="node-state-box" style="margin-top:12px;">
                                    <span class="state-label">Vector Matrix:</span>
                                    <code class="state-code text-cyan" id="hub-matrix-state">transform(OpA, OpB)</code>
                                </div>
                            </div>

                            <!-- Data Laser Stream 2 -->
                            <div class="pipeline-connector">
                                <div class="packet-chip" id="packet-chip-b">OpB'(v29)</div>
                                <div class="pulse-beam beam-reverse" id="beam-b"></div>
                            </div>

                            <!-- Node 2: Client B (Tokyo) -->
                            <div class="pipeline-node node-client" id="node-client-b">
                                <div class="node-badge" style="background:#10b981;">Client B (Sarah)</div>
                                <div class="node-loc">Tokyo • RTT 42ms</div>
                                <div class="node-state-box">
                                    <span class="state-label">Converged:</span>
                                    <code class="state-code text-green" id="client-b-op">caret += 4 (stable)</code>
                                </div>
                            </div>
                        </div>

                        <!-- Real-Time Log Ticker -->
                        <div class="ot-pipeline-ticker" id="pipeline-ticker">
                            <span class="ticker-dot"></span>
                            <span class="ticker-text" id="ticker-text">Operational Transformation Engine online. Sub-50ms deterministic convergence active.</span>
                        </div>
                    </div>

                    <!-- Technical Steps -->
                    <div class="arch-cards-container">
                        <div class="arch-card">
                            <div class="arch-step-num">Step 1</div>
                            <h4 class="arch-step-title">Prefix/Suffix Diffing</h4>
                            <p class="arch-step-desc">On every local keystroke, the client computes a minimal diff against the previous version, emitting insert/delete operations with character positions.</p>
                        </div>

                        <div class="arch-card">
                            <div class="arch-step-num">Step 2</div>
                            <h4 class="arch-step-title">Server History Transform</h4>
                            <p class="arch-step-desc">The server checks the client's baseVersion against opHistory. Any concurrent operations are transformed sequentially to calculate true offsets.</p>
                        </div>

                        <div class="arch-card">
                            <div class="arch-step-num">Step 3</div>
                            <h4 class="arch-step-title">Acknowledge & Broadcast</h4>
                            <p class="arch-step-desc">The sender receives operation-ack with the latest version number, while peers receive the transformed operation payload over WebSockets.</p>
                        </div>

                        <div class="arch-card">
                            <div class="arch-step-num">Step 4</div>
                            <h4 class="arch-step-title">Caret Retention</h4>
                            <p class="arch-step-desc">Remote edits transform local cursor positions mathematically, preventing collaborator edits from disrupting your active cursor or text selection.</p>
                        </div>
                    </div>
                </section>

                <!-- Footer with GitHub Repository Link -->
                <footer class="landing-footer">
                    <div class="footer-brand-note">
                        <div class="brand-icon" style="width:24px;height:24px;font-size:12px;">${ICONS.logo}</div>
                        <strong>CollabAI</strong> — Modern Real-Time Document Editor
                    </div>
                    <div class="footer-links">
                        <a href="#/dashboard">Launch App</a>
                        <a href="https://github.com/pranjal-jain-byte/collabai" target="_blank" rel="noopener" class="footer-github-link">
                            ${ICONS.github}
                            <span>GitHub</span>
                        </a>
                        <a href="#architecture">Architecture</a>
                    </div>
                </footer>
            </div>
        `;
    }

    _startInteractivePreview() {
        const streamContainer = this.container.querySelector('#preview-live-stream');
        const otMsg = this.container.querySelector('#preview-ot-msg');
        const versionDisplay = this.container.querySelector('#preview-version');
        const latencyDisplay = this.container.querySelector('#preview-latency');
        if (!streamContainer) return;

        let cycle = 0;
        const cycles = [
            {
                author1: 'Alex Rivera',
                color1: '#8b5cf6',
                text1: 'Operational Transformation resolves overlapping edits',
                author2: 'Sarah Chen',
                color2: '#10b981',
                text2: ' with zero data collisions.',
                highlight: 'zero data collisions',
                otEvent: 'Transformed insertOp(len: 26, pos: 54) against rev 28 ➔ Broadcast v29'
            },
            {
                author1: 'Sarah Chen',
                color1: '#10b981',
                text1: 'Google Gemini 2.0 Flash checks grammar and style',
                author2: 'Alex Rivera',
                color2: '#8b5cf6',
                text2: ' asynchronously without typing delay.',
                highlight: 'without typing delay',
                otEvent: 'AI Assistant Stream: 3 suggestions calculated in 210ms ➔ Clean OT Merge'
            },
            {
                author1: 'Alex Rivera',
                color1: '#8b5cf6',
                text1: 'Redis in-memory caching guarantees sub-50ms sync',
                author2: 'Sarah Chen',
                color2: '#10b981',
                text2: ' with durable MongoDB revisions.',
                highlight: 'durable MongoDB revisions',
                otEvent: 'Checkpoint Snapshot: Flushed version 45 to MongoDB collection ➔ 0ms delay'
            }
        ];

        const runCycle = () => {
            const current = cycles[cycle % cycles.length];
            cycle++;

            let index1 = 0;
            let index2 = 0;
            const fullText1 = current.text1;
            const fullText2 = current.text2;

            if (otMsg) otMsg.innerText = current.otEvent;
            if (versionDisplay) versionDisplay.innerText = `v${28 + cycle}`;
            if (latencyDisplay) latencyDisplay.innerText = `${12 + Math.floor(Math.random() * 8)}ms`;

            // Phase 1: Alex Rivera types
            const t1 = setInterval(() => {
                index1++;
                const slice1 = fullText1.slice(0, index1);
                streamContainer.innerHTML = `
                    <span class="stream-text">${slice1}</span>
                    <span class="preview-collaborator-tag" style="background:${current.color1}">${current.author1}</span>
                    <span class="preview-cursor" style="background:${current.color1}"></span>
                `;

                if (index1 >= fullText1.length) {
                    clearInterval(t1);

                    // Phase 2: Sarah Chen joins and types concurrently
                    const t2 = setTimeout(() => {
                        const t3 = setInterval(() => {
                            index2++;
                            const slice2 = fullText2.slice(0, index2);
                            streamContainer.innerHTML = `
                                <span class="stream-text">${fullText1}</span>
                                <span class="stream-text-highlight" style="color:#059669;font-weight:600;">${slice2}</span>
                                <span class="preview-collaborator-tag" style="background:${current.color2}">${current.author2}</span>
                                <span class="preview-cursor" style="background:${current.color2}"></span>
                            `;

                            if (index2 >= fullText2.length) {
                                clearInterval(t3);

                                // Phase 3: Pause and show both collaborator carets resting
                                const t4 = setTimeout(() => {
                                    streamContainer.innerHTML = `
                                        <span class="stream-text">${fullText1} </span>
                                        <span class="stream-highlight-box" style="background:rgba(16, 185, 129, 0.15);border-bottom:2px solid #10b981;">
                                            <b>${current.highlight}</b>
                                            <span class="preview-collaborator-tag" style="background:${current.color2}">${current.author2}</span>
                                        </span>
                                        <span class="preview-collaborator-tag" style="background:${current.color1};margin-left:8px;">${current.author1}</span>
                                        <span class="preview-cursor" style="background:${current.color1}"></span>
                                    `;

                                    // Phase 4: Wait before next cycle
                                    const t5 = setTimeout(() => {
                                        runCycle();
                                    }, 2800);
                                    this.animTimeouts.push(t5);
                                }, 1200);
                                this.animTimeouts.push(t4);
                            }
                        }, 45);
                    }, 400);
                    this.animTimeouts.push(t2);
                }
            }, 35);
        };

        runCycle();
    }

    _attachPipelineSimulation() {
        const btn = this.container.querySelector('#btn-simulate-collision');
        const ticker = this.container.querySelector('#ticker-text');
        const badge = this.container.querySelector('#pipeline-status-badge');
        const chipA = this.container.querySelector('#packet-chip-a');
        const chipB = this.container.querySelector('#packet-chip-b');
        const hubMatrix = this.container.querySelector('#hub-matrix-state');
        const nodeHub = this.container.querySelector('#node-server-hub');

        if (!btn) return;

        btn.addEventListener('click', () => {
            btn.disabled = true;
            btn.innerHTML = `${ICONS.zap} <span>Simulating Race Condition...</span>`;

            if (badge) {
                badge.innerText = 'CONCURRENT COLLISION DETECTED';
                badge.style.color = '#f59e0b';
                badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
            }
            if (ticker) {
                ticker.innerText = 'Step 1: Simultaneous insertOp from London and deleteOp from Tokyo arrived within 1.4ms window...';
            }

            // Animate packets firing toward central hub
            if (chipA) chipA.classList.add('packet-traveling-a');
            if (chipB) chipB.classList.add('packet-traveling-b');

            setTimeout(() => {
                if (nodeHub) nodeHub.classList.add('hub-pulse-glow');
                if (hubMatrix) hubMatrix.innerText = 'T(Ins, Del) ➔ Offset Adjusted +6';
                if (ticker) {
                    ticker.innerText = 'Step 2: Operational Transformation matrix computed: transformed OpB count against OpA position.';
                }
            }, 600);

            setTimeout(() => {
                if (badge) {
                    badge.innerText = 'CONVERGENCE VERIFIED • ZERO CONFLICT';
                    badge.style.color = '#10b981';
                    badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                }
                if (ticker) {
                    ticker.innerText = 'Step 3: Transformed operations broadcasted to all peers. Document state converged mathematically with zero data loss.';
                }
            }, 1400);

            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `${ICONS.zap} <span>Simulate Concurrent Race Condition</span>`;
                if (chipA) chipA.classList.remove('packet-traveling-a');
                if (chipB) chipB.classList.remove('packet-traveling-b');
                if (nodeHub) nodeHub.classList.remove('hub-pulse-glow');
                if (hubMatrix) hubMatrix.innerText = 'transform(OpA, OpB)';
            }, 3200);
        });
    }
}
