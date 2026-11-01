// Landing Page Component

import { ICONS } from '../icons.js';
import { store } from '../state.js';

export class LandingPage {
    constructor(container) {
        this.container = container;
        this.typingInterval = null;
    }

    mount() {
        this.render();
        this._startInteractivePreview();
    }

    unmount() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.typingInterval = null;
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="landing-container">
                <!-- Hero Section -->
                <section class="hero">
                    <div class="hero-pill">
                        <span class="hero-pill-sparkle">${ICONS.sparkle}</span>
                        <span>Built with Operational Transformation & Gemini 2.0 Flash</span>
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
                        <a href="#features" class="btn btn-secondary hero-cta-secondary">
                            <span>Explore Architecture</span>
                        </a>
                    </div>
                </section>

                <!-- Interactive Document Preview -->
                <div class="hero-preview-wrapper">
                    <div class="hero-preview-window">
                        <div class="preview-window-header">
                            <div class="preview-window-dots">
                                <span class="preview-dot red"></span>
                                <span class="preview-dot yellow"></span>
                                <span class="preview-dot green"></span>
                            </div>
                            <div class="preview-window-title">Getting Started with CollabAI — Live OT Workspace</div>
                            <div class="badge badge-live">
                                <span class="dot"></span>
                                <span>2 Users Syncing</span>
                            </div>
                        </div>

                        <div class="preview-window-content">
                            <div class="preview-doc-canvas">
                                <div class="preview-doc-h1">Distributed Document Systems</div>
                                <p class="preview-doc-p" id="preview-text-p">
                                    CollabAI transforms keystrokes into positional insert/delete vectors, synchronizing concurrent collaborators without overwriting live text.<span class="preview-collaborator-tag">Alex Rivera</span><span class="preview-cursor"></span>
                                </p>
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
                        <div class="feature-card">
                            <div class="feature-icon-wrapper icon-blue">${ICONS.zap}</div>
                            <h3 class="feature-title">Custom OT Algorithm</h3>
                            <p class="feature-desc">
                                From-scratch Operational Transformation supporting multi-character insert and delete diffing. Operations are transformed against server histories so edits converge reliably.
                            </p>
                        </div>

                        <div class="feature-card">
                            <div class="feature-icon-wrapper icon-purple">${ICONS.sparkle}</div>
                            <h3 class="feature-title">Gemini AI Writing Engine</h3>
                            <p class="feature-desc">
                                Integrated Google Gemini 2.0 Flash streams real-time typo corrections and stylistic improvements directly into an interactive review panel without blocking document typing.
                            </p>
                        </div>

                        <div class="feature-card">
                            <div class="feature-icon-wrapper icon-amber">${ICONS.robot}</div>
                            <h3 class="feature-title">Semantic Conflict Mediator</h3>
                            <p class="feature-desc">
                                OT ensures structural validity, but cannot understand meaning. When users edit overlapping sentences within seconds, our AI mediator suggests a harmonious merge.
                            </p>
                        </div>

                        <div class="feature-card">
                            <div class="feature-icon-wrapper icon-green">${ICONS.cloud}</div>
                            <h3 class="feature-title">Redis & MongoDB Persistence</h3>
                            <p class="feature-desc">
                                Hot-path reads and session revocations run through Redis in-memory caches, with periodic asynchronous checkpoints flushed to MongoDB for durability.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Architecture Walkthrough Section -->
                <section class="architecture-section" id="architecture">
                    <div class="section-header">
                        <div class="section-tag">Technical Design</div>
                        <h2 class="section-title">How CollabAI Prevents Collisions</h2>
                        <p class="section-subtitle">
                            A transparent breakdown of how a single keystroke traverses from the browser canvas to the server and out to collaborators.
                        </p>
                    </div>

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

                <!-- Footer -->
                <footer class="landing-footer">
                    <div class="footer-brand-note">
                        <div class="brand-icon" style="width:24px;height:24px;font-size:12px;">${ICONS.logo}</div>
                        <strong>CollabAI</strong> — Modern Real-Time Document Editor
                    </div>
                    <div class="footer-links">
                        <a href="#/dashboard">Launch App</a>
                        <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
                        <a href="#architecture">Architecture</a>
                    </div>
                </footer>
            </div>
        `;
    }

    _startInteractivePreview() {
        const sentences = [
            "Keystrokes sync seamlessly across distributed browser sessions.",
            "Operational Transformation resolves overlapping edits deterministically.",
            "Google Gemini mediates semantic collisions when two minds write at once.",
            "Fast, distraction-free document editing built for high-performance teams."
        ];
        let sIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        const target = this.container.querySelector('#preview-text-p');
        if (!target) return;

        const base = "CollabAI transforms keystrokes into positional insert/delete vectors: ";

        this.typingInterval = setInterval(() => {
            const currentSentence = sentences[sIndex];
            if (!isDeleting) {
                charIndex++;
                if (charIndex >= currentSentence.length) {
                    isDeleting = true;
                    clearInterval(this.typingInterval);
                    setTimeout(() => this._startInteractivePreview(), 2400);
                    return;
                }
            } else {
                charIndex--;
                if (charIndex <= 0) {
                    isDeleting = false;
                    sIndex = (sIndex + 1) % sentences.length;
                }
            }

            const currentSlice = currentSentence.slice(0, charIndex);
            target.innerHTML = `${base}"<strong>${currentSlice}</strong>"<span class="preview-collaborator-tag">Alex Rivera</span><span class="preview-cursor"></span>`;
        }, 65);
    }
}
