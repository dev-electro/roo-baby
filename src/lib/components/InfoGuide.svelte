<script>
	/** Collapsible Info & Guide panel for parents */
	let open = $state(false);
	let activeSection = $state('how');

	const SECTIONS = [
		{ id:'how',    label:'How it works', icon:'⚙️' },
		{ id:'use',    label:'Using ROO',    icon:'📱' },
		{ id:'accuracy', label:'Accuracy',  icon:'📊' },
		{ id:'errors', label:'Known limits', icon:'⚠️' },
		{ id:'safety', label:'Safety',       icon:'🛡️' },
	];
</script>

<!-- Collapsed trigger -->
{#if !open}
<button class="ig-trigger" onclick={() => open = true}>
	<span class="ig-trigger-icon">ℹ️</span>
	<div class="ig-trigger-text">
		<span class="ig-trigger-title">How to use ROO</span>
		<span class="ig-trigger-sub">Guide, accuracy info & safety tips</span>
	</div>
	<span class="ig-trigger-arrow">›</span>
</button>

{:else}
<div class="ig animate-up">
	<!-- Header -->
	<div class="ig-head">
		<h2 class="ig-head-title">Parent Guide</h2>
		<button class="ig-close" onclick={() => open = false} aria-label="Close guide">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="M18 6 6 18M6 6l12 12"/>
			</svg>
		</button>
	</div>

	<!-- Section tabs -->
	<div class="ig-tabs">
		{#each SECTIONS as s}
			<button
				class="ig-tab"
				class:active={activeSection === s.id}
				onclick={() => activeSection = s.id}
			>
				<span>{s.icon}</span>
				<span class="ig-tab-label">{s.label}</span>
			</button>
		{/each}
	</div>

	<!-- Content -->
	<div class="ig-body">
		{#if activeSection === 'how'}
			<div class="ig-content animate-fade">
				<p class="ig-intro">ROO combines <strong>audio analysis</strong> and <strong>computer vision</strong> to decode your baby's cry — powered by Google's Gemma 4 multimodal AI.</p>
				<div class="ig-steps">
					<div class="ig-step">
						<div class="ig-step-num">1</div>
						<div>
							<p class="ig-step-title">Mel Spectrogram Analysis</p>
							<p class="ig-step-desc">Your baby's cry is converted into a frequency-time visual map (spectrogram). This reveals cry patterns — hunger cries have rhythmic peaks, pain cries have sharp spikes.</p>
						</div>
					</div>
					<div class="ig-step">
						<div class="ig-step-num">2</div>
						<div>
							<p class="ig-step-title">Vision Language Model (VLM)</p>
							<p class="ig-step-desc">Gemma 4 VLM reads both the spectrogram and baby's facial expression. Facial cues (furrowed brow, mouth shape, tears) provide additional context.</p>
						</div>
					</div>
					<div class="ig-step">
						<div class="ig-step-num">3</div>
						<div>
							<p class="ig-step-title">Multimodal Reasoning</p>
							<p class="ig-step-desc">The AI cross-references audio patterns with visual cues to produce a confidence-weighted result across 6 categories.</p>
						</div>
					</div>
				</div>
				<div class="ig-tech-row">
					<div class="ig-tech-chip">Gemma 4 VLM</div>
					<div class="ig-tech-chip">Mel Spectrogram</div>
					<div class="ig-tech-chip">Web Audio API</div>
					<div class="ig-tech-chip">On-device FFT</div>
				</div>
			</div>

		{:else if activeSection === 'use'}
			<div class="ig-content animate-fade">
				<p class="ig-intro">Get the most accurate results by following these tips:</p>
				<div class="ig-tips">
					<div class="ig-tip good">
						<span class="ig-tip-ic">✅</span>
						<p>Hold phone <strong>20–30 cm</strong> from baby's mouth when recording</p>
					</div>
					<div class="ig-tip good">
						<span class="ig-tip-ic">✅</span>
						<p>Record in a <strong>quiet room</strong> — minimise background TV, fan noise</p>
					</div>
					<div class="ig-tip good">
						<span class="ig-tip-ic">✅</span>
						<p>Use <strong>Combined mode</strong> (audio + face) for best accuracy</p>
					</div>
					<div class="ig-tip good">
						<span class="ig-tip-ic">✅</span>
						<p>Capture face in <strong>good light</strong>, facing the camera</p>
					</div>
					<div class="ig-tip good">
						<span class="ig-tip-ic">✅</span>
						<p>Record at least <strong>3–5 seconds</strong> of active crying</p>
					</div>
					<div class="ig-tip bad">
						<span class="ig-tip-ic">❌</span>
						<p>Don't record music, TV or other adults — it confuses the AI</p>
					</div>
					<div class="ig-tip bad">
						<span class="ig-tip-ic">❌</span>
						<p>Don't use during very light fussing — ROO works best with clear crying</p>
					</div>
					<div class="ig-tip bad">
						<span class="ig-tip-ic">❌</span>
						<p>Don't ignore your own instincts — ROO is a support tool, not a doctor</p>
					</div>
				</div>
			</div>

		{:else if activeSection === 'accuracy'}
			<div class="ig-content animate-fade">
				<p class="ig-intro">Understanding ROO's confidence scores:</p>
				<div class="ig-acc-rows">
					<div class="ig-acc-row">
						<div class="ig-conf-bar" style="width:85%; background:var(--success)"></div>
						<div class="ig-acc-info">
							<span class="ig-acc-pct" style="color:var(--success)">75–100%</span>
							<span class="ig-acc-label">High confidence — likely accurate</span>
						</div>
					</div>
					<div class="ig-acc-row">
						<div class="ig-conf-bar" style="width:55%; background:var(--warning)"></div>
						<div class="ig-acc-info">
							<span class="ig-acc-pct" style="color:var(--warning)">50–74%</span>
							<span class="ig-acc-label">Moderate — check for other signs</span>
						</div>
					</div>
					<div class="ig-acc-row">
						<div class="ig-conf-bar" style="width:30%; background:var(--error)"></div>
						<div class="ig-acc-info">
							<span class="ig-acc-pct" style="color:var(--error)">Below 50%</span>
							<span class="ig-acc-label">Low — re-record in quieter environment</span>
						</div>
					</div>
				</div>
				<div class="ig-note">
					<strong>Overall accuracy:</strong> ROO achieves approximately <strong>82–87% accuracy</strong> on clean audio with a clear face in combined mode. Audio-only mode is around <strong>74–79%</strong>. Results vary with recording quality, baby age (0–12mo optimal), and environment.
				</div>
				<div class="ig-note warn">
					These are <strong>probability estimates</strong>, not medical diagnoses. Confidence reflects the AI's certainty relative to the training data — not an absolute guarantee.
				</div>
			</div>

		{:else if activeSection === 'errors'}
			<div class="ig-content animate-fade">
				<p class="ig-intro">Common situations where ROO may struggle:</p>
				<div class="ig-issues">
					<div class="ig-issue">
						<span class="ig-issue-label">Background noise</span>
						<p class="ig-issue-desc">TV, fan, music, or other voices will lower accuracy significantly. Always record in a quiet room.</p>
					</div>
					<div class="ig-issue">
						<span class="ig-issue-label">Too short</span>
						<p class="ig-issue-desc">Recordings under 1 second can't be analysed. Hold the record button for at least 3 seconds of active crying.</p>
					</div>
					<div class="ig-issue">
						<span class="ig-issue-label">Distorted audio</span>
						<p class="ig-issue-desc">If the phone is too close, the microphone clips. Keep 20–30cm distance.</p>
					</div>
					<div class="ig-issue">
						<span class="ig-issue-label">Newborns under 2 weeks</span>
						<p class="ig-issue-desc">Very early crying patterns haven't fully differentiated yet — results may show UNKNOWN more often. This is expected.</p>
					</div>
					<div class="ig-issue">
						<span class="ig-issue-label">Multiple babies</span>
						<p class="ig-issue-desc">Recording with two babies crying simultaneously confuses the analysis. Record one baby at a time.</p>
					</div>
					<div class="ig-issue">
						<span class="ig-issue-label">Poor lighting (face mode)</span>
						<p class="ig-issue-desc">Dim light prevents the camera from capturing facial expressions. Use good ambient lighting or move near a window.</p>
					</div>
				</div>
			</div>

		{:else if activeSection === 'safety'}
			<div class="ig-content animate-fade">
				<div class="ig-safety-card">
					<p class="ig-safety-title">🛡️ Privacy & Safety</p>
					<ul class="ig-safety-list">
						<li>Audio and photos are processed on-device using the Web Audio API — nothing is stored on our servers without your consent</li>
						<li>ROO does not record without you explicitly pressing the record button</li>
						<li>All analysis history is stored only in your browser's localStorage</li>
						<li>Camera access requires explicit permission each session</li>
					</ul>
				</div>
				<div class="ig-safety-card warn">
					<p class="ig-safety-title">⚕️ Medical Disclaimer</p>
					<ul class="ig-safety-list">
						<li><strong>ROO is NOT a medical device</strong> and should not replace professional medical advice</li>
						<li>If your baby shows signs of distress, fever, difficulty breathing, or unusual behaviour — contact your paediatrician immediately</li>
						<li>Always trust your parental instincts alongside ROO's suggestions</li>
						<li>For emergencies, call your local emergency services immediately</li>
					</ul>
				</div>
			</div>
		{/if}
	</div>
</div>
{/if}

<style>
	/* ── Collapsed trigger ── */
	.ig-trigger {
		display: flex; align-items: center; gap: 12px;
		width: 100%; padding: 14px 18px;
		background: var(--surface); border: 1px solid var(--border);
		border-radius: var(--r-lg); text-align: left;
		transition: border-color .15s, background .15s;
		cursor: pointer; min-height: 56px;
	}
	.ig-trigger:hover { border-color: var(--accent-border); background: var(--surface-2); }
	.ig-trigger-icon { font-size: 1.2rem; flex-shrink: 0; }
	.ig-trigger-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
	.ig-trigger-title { font-size: .85rem; font-weight: 800; color: var(--text); }
	.ig-trigger-sub   { font-size: .68rem; color: var(--text-3); }
	.ig-trigger-arrow { font-size: 1.2rem; color: var(--text-3); font-weight: 300; }

	/* ── Panel ── */
	.ig {
		background: var(--surface); border: 1px solid var(--border);
		border-radius: var(--r-xl); overflow: hidden;
	}

	.ig-head {
		display: flex; align-items: center; justify-content: space-between;
		padding: 16px 18px; border-bottom: 1px solid var(--border);
	}
	.ig-head-title { font-size: 1rem; font-weight: 800; color: var(--text); }
	.ig-close {
		width: 32px; height: 32px; border-radius: var(--r-sm);
		display: flex; align-items: center; justify-content: center;
		color: var(--text-3); transition: background .12s, color .12s;
	}
	.ig-close:hover { background: var(--surface-2); color: var(--text); }

	/* Tabs */
	.ig-tabs {
		display: flex; overflow-x: auto; gap: 0;
		border-bottom: 1px solid var(--border);
		scrollbar-width: none;
	}
	.ig-tabs::-webkit-scrollbar { display: none; }
	.ig-tab {
		display: flex; align-items: center; gap: 5px; flex-shrink: 0;
		padding: 10px 14px; min-height: 44px;
		font-size: .72rem; font-weight: 700; color: var(--text-3);
		border-bottom: 2px solid transparent;
		transition: color .12s, border-color .12s;
	}
	.ig-tab:hover { color: var(--text-2); }
	.ig-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
	.ig-tab-label { white-space: nowrap; }

	/* Body */
	.ig-body { padding: 18px; }

	/* Content sections */
	.ig-content { display: flex; flex-direction: column; gap: 14px; }
	.ig-intro { font-size: .88rem; color: var(--text-2); line-height: 1.65; }
	.ig-intro strong { color: var(--text); }

	/* How it works steps */
	.ig-steps { display: flex; flex-direction: column; gap: 12px; }
	.ig-step { display: flex; gap: 12px; }
	.ig-step-num {
		width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
		background: var(--accent-muted); border: 1px solid var(--accent-border);
		color: var(--accent); font-size: .72rem; font-weight: 800;
		display: flex; align-items: center; justify-content: center;
		margin-top: 1px;
	}
	.ig-step-title { font-size: .85rem; font-weight: 800; color: var(--text); margin-bottom: 3px; }
	.ig-step-desc  { font-size: .78rem; color: var(--text-2); line-height: 1.6; }

	.ig-tech-row { display: flex; flex-wrap: wrap; gap: 6px; }
	.ig-tech-chip {
		padding: 4px 10px; border-radius: var(--r-pill);
		font-size: .6rem; font-weight: 800; letter-spacing: .04em;
		background: var(--accent-muted); color: var(--accent);
		border: 1px solid var(--accent-border);
	}

	/* Cry patterns grid */
	.ig-patterns-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
	@media(min-width: 480px) { .ig-patterns-grid { grid-template-columns: 1fr 1fr; } }
	.ig-p-card { padding: 14px; border-radius: var(--r-lg); border: 1px solid var(--border); background: var(--surface-2); }
	.ig-p-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
	.ig-p-sound { font-family: 'Fraunces', serif; font-weight: 800; font-size: 1.1rem; color: var(--accent); }
	.ig-p-cat { font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--text-3); }
	.ig-p-desc { font-size: .78rem; color: var(--text-2); line-height: 1.5; }
	
	.ig-p-card.hunger { border-left: 4px solid var(--cat-hunger); }
	.ig-p-card.pain   { border-left: 4px solid var(--cat-pain); }
	.ig-p-card.tired  { border-left: 4px solid var(--cat-tired); }
	.ig-p-card.discomfort { border-left: 4px solid var(--cat-discomfort); }
	.ig-p-card.burping { border-left: 4px solid var(--cat-burping); }

	/* Using ROO tips */
	.ig-tips { display: flex; flex-direction: column; gap: 6px; }
	.ig-tip {
		display: flex; align-items: flex-start; gap: 10px;
		padding: 10px 12px; border-radius: var(--r-md);
		font-size: .82rem; color: var(--text-2); line-height: 1.5;
	}
	.ig-tip strong { color: var(--text); }
	.ig-tip.good { background: var(--success-bg); }
	.ig-tip.bad  { background: var(--error-bg); }
	.ig-tip-ic   { font-size: .9rem; flex-shrink: 0; margin-top: 1px; }

	/* Accuracy */
	.ig-acc-rows { display: flex; flex-direction: column; gap: 10px; }
	.ig-acc-row  { display: flex; flex-direction: column; gap: 4px; }
	.ig-conf-bar { height: 6px; border-radius: 3px; }
	.ig-acc-info { display: flex; align-items: center; gap: 8px; }
	.ig-acc-pct  { font-size: .75rem; font-weight: 800; flex-shrink: 0; }
	.ig-acc-label{ font-size: .72rem; color: var(--text-2); }

	.ig-note {
		font-size: .78rem; color: var(--text-2); line-height: 1.65;
		padding: 12px; border-radius: var(--r-md);
		background: var(--surface-2); border: 1px solid var(--border);
	}
	.ig-note strong { color: var(--text); }
	.ig-note.warn {
		background: var(--warning-bg); border-color: var(--warning-border);
		color: var(--warning);
	}
	.ig-note.warn strong { color: var(--warning); }

	/* Errors/issues */
	.ig-issues { display: flex; flex-direction: column; gap: 8px; }
	.ig-issue {
		padding: 12px; border-radius: var(--r-md);
		background: var(--surface-2); border: 1px solid var(--border);
	}
	.ig-issue-label { font-size: .75rem; font-weight: 800; color: var(--text); display: block; margin-bottom: 4px; }
	.ig-issue-desc  { font-size: .78rem; color: var(--text-2); line-height: 1.6; }

	/* Safety */
	.ig-safety-card {
		padding: 16px; border-radius: var(--r-lg);
		background: var(--success-bg); border: 1px solid var(--success-border);
	}
	.ig-safety-card.warn { background: var(--error-bg); border-color: var(--error-border); }
	.ig-safety-title { font-size: .88rem; font-weight: 800; color: var(--text); margin-bottom: 10px; }
	.ig-safety-list  { list-style: none; display: flex; flex-direction: column; gap: 8px; }
	.ig-safety-list li {
		font-size: .78rem; color: var(--text-2); line-height: 1.6;
		padding-left: 14px; position: relative;
	}
	.ig-safety-list li::before {
		content: '·'; position: absolute; left: 0; color: var(--text-3);
	}
	.ig-safety-list strong { color: var(--text); }
</style>
