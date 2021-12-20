/**
 * 原则上，package depends 中的本地 package 和 tsconfig 中的 references 应该是一一对应的。
 * 如果两者不同，则应该检查并修复
 */

import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access } from 'fs/promises'
import path from 'path'

import { execSync } from 'child_process'

// console.log(argv)
// console.log(process.env.PWD)

const packagesJSON = execSync('npx lerna ls --toposort --json').toString()
const packageALL = JSON.parse(packagesJSON)

const pjsonPath = path.resolve(process.env.PWD, 'packages/utils/umbrella/package.json')

console.log(pjsonPath)

const pjsonText = (await readFile(pjsonPath)).toString()
const pjson = JSON.parse(pjsonText)
pjson.dependencies = {}
packageALL.forEach((p) => {
	// 避免循环依赖
	if (p.name !== '@gs.i/all') {
		pjson.dependencies[p.name] = `^${p.version}`
	}
})

await writeFile(pjsonPath, JSON.stringify(pjson, undefined, '\t'))
