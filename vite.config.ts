import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [tsconfigPaths(), react()],

	base: './',

	esbuild: {
		target: 'esnext',
	},

	build: {
		assetsDir: './',
	},

	clearScreen: false,
	optimizeDeps: {
		// force: true,
		esbuildOptions: {
			// splitting: false,
			// external: 'workers/*',
			// bundle: true,
			target: 'esnext',
		},
	},
})
