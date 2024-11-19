import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		'process.env.NODE_DEBUG': 'false',
		'process.env': {},
		global: 'globalThis'
	},
	optimizeDeps: {
		esbuildOptions: {
			target: 'esnext',
			define: {
				global: 'globalThis'
			}
		}
	}
});
