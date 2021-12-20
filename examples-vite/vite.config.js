const { resolve } = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
	build: {
		lib: {
			entry: 'init/i.ts',
			formats: ['es'],
		},
	},
})
