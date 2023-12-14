// import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
	esbuild: {
		target: 'esnext',
	},

	clearScreen: false,
	optimizeDeps: {
		esbuildOptions: {
			target: 'esnext',
		},
	},

	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
	},

	build: {
		outDir: 'public',
		target: 'esnext',
		sourcemap: false,
		emptyOutDir: false,
		copyPublicDir: false,
		lib: {
			// Could also be a dictionary or array of multiple entry points
			entry: resolve(__dirname, './sw.mjs'),
			name: 'sw',
			// the proper extensions will be added
			fileName: 'service-worker',
			formats: ['iife'],
		},
	},
})
