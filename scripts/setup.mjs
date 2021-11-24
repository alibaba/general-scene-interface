import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access, rename, unlink } from 'fs/promises'
import path from 'path'

import { execSync, spawn, exec, execFileSync } from 'child_process'

console.log(argv)
console.log(process.env.PWD)

import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log(__dirname)

// # https://github.com/lerna/lerna/issues/1421
// # ⬆️ bad bad design
// # lerna 的 --ignore 和 --no-private 并不会生效
// # 因此只能自己处理，先把不需要的 package 的 dependents 换成空的，绕开 lerna 的逻辑，然后再恢复

const id = Math.floor(Math.random() * 9999) + ''
console.log(id)

execSync(`node ${path.resolve(__dirname, './packageJsonBackup.mjs')} --id=${id}`, {
	stdio: 'inherit',
})

import blist from './ignore.mjs'

// 不处理的package
const packageBlacklist = [...blist]

const NO_EXAMPLES = argv.includes('--no-examples')

if (NO_EXAMPLES) {
	packageBlacklist.push('examples')
}

const packagesJSON = execSync('npx lerna ls --json --all').toString()
const packageALL = JSON.parse(packagesJSON)

// 黑名单过滤掉
const packages = packageALL.filter((pac) => {
	let inBL = false
	packageBlacklist.forEach((rule) => {
		inBL = inBL || pac.location.includes(rule)
	})

	return inBL
})
console.log(packages)

for (const pkg of packages) {
	console.log('ignore package: ', pkg.name)
	const pjsonPath = path.resolve(pkg.location, 'package.json')

	const pjson = await readFile(pjsonPath)
	const originalJson = JSON.parse(pjson)

	// NOTE can not be {} or yarn will throw
	delete originalJson.scripts
	delete originalJson.dependencies
	delete originalJson.devDependencies
	delete originalJson.peerDependencies
	delete originalJson.bundledDependencies
	delete originalJson.optionalDependencies

	// backup

	try {
		await writeFile(pjsonPath, JSON.stringify(originalJson))
	} catch (error) {
		console.error(error)
		console.log(pkg.name, tsconfigPath)
	}
}

try {
	execSync(`lerna bootstrap -- --force-local`, { stdio: 'inherit' })

	// # https://github.com/lerna/lerna/issues/2352
	// # lerna link is needed
	execSync(`lerna link --force-local`, { stdio: 'inherit' })

	// # should not hoist local packages
	execSync(`rm -rf ./node_modules/@gs.i`, { stdio: 'inherit' })
} catch (error) {
	console.error(error)
}

execSync(`node ${path.resolve(__dirname, './packageJsonRestore.mjs')} --id=${id}`, {
	stdio: 'inherit',
})

console.log('本次安装不会安装以下package的依赖，如果需要，可以自行到文件夹中安装')
console.log(packageBlacklist)
