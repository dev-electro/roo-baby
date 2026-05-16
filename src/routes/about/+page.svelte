<svelte:head>
	<title>About Us | ROO Baby</title>
</svelte:head>

<div class="legal-page">
	<div class="legal-header">
		<h1>About ROO</h1>
		<p>Understanding your baby's needs through AI</p>
	</div>

	<div class="legal-content">
		<h2>Our Mission</h2>
		<p>
			ROO was created with a simple mission: to help parents understand what their baby is trying to tell them. 
			We know that the first few months of parenthood can be overwhelming. When your baby cries, it can be 
			stressful trying to guess whether they are hungry, tired, or in pain.
		</p>
		
		<h2>How It Works</h2>
		<p>
			ROO uses advanced multimodal AI (powered by Gemma 4) to analyze both the acoustic features of a baby's cry 
			and their facial expressions. By combining these signals—just as a human would—we provide real-time, 
			science-backed insights into why your baby might be crying.
		</p>
		<p>
			Our analysis is rooted in the widely studied Dunstan Baby Language framework and pediatric acoustic research, 
			which identifies universal phonetic reflexes in infant cries before they learn to babble.
		</p>

		<h2>Built for Parents, By Parents</h2>
		<p>
			We designed ROO to be entirely "one-handed." We know you are probably holding a crying baby while using this app, 
			so everything from the large buttons to the high-contrast UI is built to be used effortlessly in stressful, low-light situations.
		</p>

		<h2>Try ROO Live</h2>
		<p>
			ROO is free to use with no account required. Open it on your phone right now:
		</p>
		<div class="link-row">
			<a href="https://roo.risingranks.in" target="_blank" rel="noopener" class="demo-link primary">
				🌐 roo.risingranks.in
			</a>
			<a href="https://roo-baby.pages.dev" target="_blank" rel="noopener" class="demo-link">
				roo-baby.pages.dev
			</a>
		</div>
		<p class="challenge-note">
			Built for the <a href="https://dev.to/challenges/google-gemma-2026-05-06" target="_blank" rel="noopener">DEV × Gemma 4 Challenge</a> · Powered by Google Gemma 4 VLM.
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
	.link-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
	.demo-link {
		display: inline-flex; align-items: center; padding: 10px 18px;
		border-radius: var(--r-md); font-size: .9rem; font-weight: 800;
		text-decoration: none; transition: all .15s;
		background: var(--surface-2); border: 1px solid var(--border); color: var(--text-2);
	}
	.demo-link.primary { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 4px 14px var(--accent-glow); }
	.demo-link:hover { transform: translateY(-1px); opacity: .9; }
	.challenge-note { font-size: .8rem; color: var(--text-3); }
	.challenge-note a { color: var(--accent); text-decoration: underline; }
</style>
