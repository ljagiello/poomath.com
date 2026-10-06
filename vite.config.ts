import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			// Deployed on Vercel — the Vercel adapter matches the project's framework
			// preset. Every route is prerendered (see src/routes/+layout.ts), so the
			// site ships as static assets. The function runtime is pinned explicitly
			// rather than inferred from the build's Node version.
			adapter: adapter({ runtime: 'nodejs22.x' })
		})
	]
});
