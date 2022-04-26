/**
 * 拼装 shader lib ，便于修改
 *
 * 放在 three/src/renderers/shaders 目录下，运行 node assemble.mjs，即过在 assembled 文件夹中
 *
 * 查看结果时可以用 cmd+k then 2 折叠所有 include
 */

import { ShaderChunk } from './ShaderChunk.js'

// Resolve Includes

const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm

function resolveIncludes(string) {
	return string.replace(includePattern, includeReplacer)
}

// replace all
function includeReplacer(match, include) {
	const string = ShaderChunk[include]

	if (string === undefined) {
		throw new Error('Can not resolve #include <' + include + '>')
	}

	const deco = `// ${match.trim()} ->
 ${string}
 // ${match.trim()} <-
 `
	//   const deco = `// #region ${match.replace("#include", "").trim()}
	// ${string}
	// // #endregion ${match.replace("#include", "").trim()}
	// `;

	return resolveIncludes(deco)
}

// only replace first depth with special vars

function resolveIncludesPartial(string) {
	return string.replace(includePattern, includeReplacerPartial)
}
const whitelist = [
	'vec3 transformed',
	'vec3 objectNormal',
	'vec2 vUv',
	'mat4 modelMatrix',
	'mat4 modelViewMatrix',
	'mat4 projectionMatrix',
	'mat3 normalMatrix',
	'vec4 mvPosition',
]

function check(string) {
	for (let i = 0; i < whitelist.length; i++) {
		const keyword = whitelist[i]
		if (string.includes(keyword)) {
			return true
		}
	}
	return false
}
function includeReplacerPartial(match, include) {
	const string = ShaderChunk[include]

	if (string === undefined) {
		throw new Error('Can not resolve #include <' + include + '>')
	}

	if (check(string)) {
		const deco = `
 // ${match.trim()} ->
 ${string}
 // ${match.trim()} <-
   `
		//   const deco = `// #region ${match.replace("#include", "").trim()}
		// ${string}
		// // #endregion ${match.replace("#include", "").trim()}
		// `;

		return deco
	} else {
		return match
	}
}

import path, { dirname } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))

console.log(__dirname)
const files = fs.readdirSync(path.resolve(__dirname, 'ShaderLib'))
console.log(files)

{
	const distDir = path.resolve(__dirname, 'assembled')
	if (!fs.existsSync(distDir)) {
		console.log('dist folder does not exist: ' + distDir + '. -> mkdir-ing...')
		fs.mkdirSync(distDir, { recursive: true })
	}
}
{
	const distDir = path.resolve(__dirname, 'assembled_partial')
	if (!fs.existsSync(distDir)) {
		console.log('dist folder does not exist: ' + distDir + '. -> mkdir-ing...')
		fs.mkdirSync(distDir, { recursive: true })
	}
}

files.forEach((filename) => {
	const filePath = path.resolve(__dirname, 'ShaderLib', filename)

	fs.readFile(filePath, 'utf-8', (err, text) => {
		if (err) {
			console.error(err)
			return
		}

		{
			const transContent = resolveIncludes(text)

			const targetFilePath = path.resolve(__dirname, 'assembled', filename)
			fs.writeFile(targetFilePath, transContent, (err) => {
				if (err) {
					console.error(err)
					return
				}
				console.log('\x1b[32m%s\x1b[0m', `[glsl-processor] - ${filePath}`)
			})
		}
		{
			const transContent = resolveIncludesPartial(text)

			const targetFilePath = path.resolve(__dirname, 'assembled_partial', filename)
			fs.writeFile(targetFilePath, transContent, (err) => {
				if (err) {
					console.error(err)
					return
				}
				console.log('\x1b[32m%s\x1b[0m', `[glsl-processor] - ${filePath}`)
			})
		}
	})
})
