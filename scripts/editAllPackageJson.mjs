/**
 * 原则上，package depends 中的本地 package 和 tsconfig 中的 references 应该是一一对应的。
 * 如果两者不同，则应该检查并修复
 */

import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access } from 'fs/promises'
import path from 'path'

import { execSync } from 'child_process'

console.log(argv)
console.log(process.env.PWD)

// 不处理的package
import packageBlacklist from './ignore.mjs'

const packagesJSON = execSync('npx lerna ls --json').toString()
const packageALL = JSON.parse(packagesJSON)

// 黑名单过滤掉
const packages = packageALL.filter((pac) => {
	let inBL = false
	packageBlacklist.forEach((rule) => {
		inBL = inBL || pac.location.includes(rule)
	})

	return !inBL
})
console.log(packages)

packages.forEach(async (pkg) => {
	const pjsonPath = path.resolve(pkg.location, 'package.json')

	const pjsonText = (await readFile(pjsonPath)).toString()
	const pjson = JSON.parse(pjsonText)

	/**
	 * edit #start
	 */

	pjson.type = 'module'
	// delete pjson.type

	/**
	 * edit #end
	 */

	await writeFile(pjsonPath, JSON.stringify(pjson, undefined, '\t'))
})
