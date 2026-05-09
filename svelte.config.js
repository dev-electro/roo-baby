import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$components: 'src/lib/components',
			$utils: 'src/lib/utils',
			$state: 'src/lib/state'
		}
	}
};
