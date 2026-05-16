<svelte:head>
	<title>Privacy Policy | ROO Baby</title>
</svelte:head>

<div class="legal-page">
	<div class="legal-header">
		<h1>Privacy Policy</h1>
		<p>Last updated: May 17, 2026</p>
	</div>

	<div class="legal-content">
		<h2>Your Baby's Privacy is Our Priority</h2>
		<p>
			Because ROO is an application used for infants, we take privacy and data security incredibly seriously. 
			This policy explains exactly what data we process and how we protect it.
		</p>

		<h2>1. Data We Do Not Store</h2>
		<ul>
			<li><strong>No Audio Logging:</strong> We do NOT save, log, or store the audio recordings of your baby's cry on our servers.</li>
			<li><strong>No Photo Logging:</strong> We do NOT save, log, or store the photos of your baby's face on our servers.</li>
			<li><strong>No Personal Identifiable Information (PII):</strong> We do not require you to create an account, nor do we ask for your name, email, or your baby's name.</li>
		</ul>

		<h2>2. How Analysis Works (Transient Processing)</h2>
		<p>
			When you use ROO to analyze a cry or photo:
		</p>
		<ul>
			<li><strong>Audio:</strong> Your device securely converts the audio recording into a visual representation called a "spectrogram" locally. Only this visual spectrogram—not the raw audio file—is sent to our AI engine.</li>
			<li><strong>Photos:</strong> Photos are heavily downscaled locally on your device before being transmitted.</li>
			<li><strong>AI Processing:</strong> The spectrogram and downscaled photo are sent securely to our inference engine (powered by Cloudflare Workers and Google Gemma). The engine analyzes the inputs, returns the result to your device, and immediately discards the files. <strong>The data is transient and never saved to a database.</strong></li>
		</ul>

		<h2>3. Analytics and Usage Data</h2>
		<p>
			To improve the app, we use Google Analytics to track anonymous usage statistics. This includes:
		</p>
		<ul>
			<li>Which analysis modes are most popular (Audio, Photo, or Both).</li>
			<li>Whether users prefer recording live or uploading files.</li>
			<li>The anonymous statistical outcomes of the analysis (e.g., "70% of cries analyzed are Hunger").</li>
			<li>Errors or crashes to help us fix bugs.</li>
		</ul>
		<p>This analytics data is completely anonymized and cannot be linked back to you or your baby.</p>

		<h2>4. Local Storage</h2>
		<p>
			ROO saves your theme preferences, audio autoplay settings, and your 5 most recent analysis results locally on your device using your browser's <code>localStorage</code>. This data never leaves your phone and can be cleared at any time by tapping "Clear all" in your recent sessions history.
		</p>
	</div>
</div>

<style>
	.legal-page { padding: 10px; }
	.legal-header { margin-bottom: 30px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
	h1 { font-family: 'Quicksand', sans-serif; font-size: 2rem; color: var(--accent); margin-bottom: 8px; }
	.legal-header p { font-size: 1rem; color: var(--text-2); font-weight: 600; }
	.legal-content h2 { font-size: 1.3rem; margin: 24px 0 12px; color: var(--text); }
	.legal-content p { font-size: .95rem; line-height: 1.6; color: var(--text-2); margin-bottom: 16px; }
	.legal-content ul { margin-bottom: 16px; padding-left: 20px; }
	.legal-content li { font-size: .95rem; line-height: 1.6; color: var(--text-2); margin-bottom: 8px; }
	.legal-content strong { color: var(--text); }
	code { background: var(--surface-3); padding: 2px 6px; border-radius: 4px; font-size: .85em; }
</style>
