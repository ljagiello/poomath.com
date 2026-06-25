import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Deployed on Vercel — the Vercel adapter matches the project's framework
		// preset. Every route is prerendered (see src/routes/+layout.ts), so the
		// site ships as static assets. The runtime is pinned because Vercel
		// functions don't support Node 24 (the build's Node version); 22.x is the
		// newest supported function runtime.
		adapter: adapter({ runtime: 'nodejs22.x' })
	}
};

export default config;
