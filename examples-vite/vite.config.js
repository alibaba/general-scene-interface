/*eslint-env node*/
const path = require('path')
const fs = require('fs')
const { defineConfig } = require('vite')

module.exports = defineConfig({
	define: {
		entries: getDemoEntries(),
	},
	server: {
		open: true,
		host: '0.0.0.0',
		cors: true,
		force: true,
		watch: {
			// without this, vite will watch all files in node_modules
			ignored: ['!**/node_modules/@gs.i/**'],
		},
	},
})

function getDemoEntries() {
	const dirPath = path.resolve(__dirname, './')
	const entries = []
	const pageDir = fs.readdirSync(dirPath) || []

	for (let j = 0; j < pageDir.length; j++) {
		const filePath = path.resolve(dirPath, pageDir[j])
		const fileStat = fs.statSync(filePath)
		const filename = path.basename(filePath)

		if (
			filename === 'node_modules' ||
			filename === 'typings' ||
			filename === 'proxy' ||
			filename.startsWith('__')
		) {
			continue
		}

		if (fileStat.isDirectory() && !filename.startsWith('_')) {
			entries.push(pageDir[j])
		}
	}
	return entries
}
