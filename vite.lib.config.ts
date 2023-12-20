// import react from '@vitejs/plugin-react'
import reactSWC from '@vitejs/plugin-react-swc'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [tsconfigPaths(), dts({ rollupTypes: true }) as any, reactSWC()],

	esbuild: {
		target: 'esnext',
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

	build: {
		outDir: 'lib',
		target: 'esnext',
		sourcemap: true,
		copyPublicDir: false,
		lib: {
			// Could also be a dictionary or array of multiple entry points
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'cubs',
			// the proper extensions will be added
			fileName: 'cubs',
		},
	},
})
