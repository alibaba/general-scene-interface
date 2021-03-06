/**
 * 原则上，package depends 中的本地 package 和 tsconfig 中的 references 应该是一一对应的。
 * 如果两者不同，则应该检查并修复
 */
/*eslint-env node*/
import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access } from 'fs/promises'
import path from 'path'

import jsonc from 'jsonc-parser'

import { execSync } from 'child_process'

import colors from 'colors/safe.js'

// console.log(argv)
// console.log(process.env.PWD)

// 不处理的package
import packageBlacklist from './ignore.mjs'

const packagesJSON = execSync('npx lerna ls --json --all').toString()
const packageALL = JSON.parse(packagesJSON)

// 黑名单过滤掉
const packages = packageALL.filter((pac) => {
	let inBL = false
	packageBlacklist.forEach((rule) => {
		inBL = inBL || pac.location.includes(rule)
	})

	return !inBL
})
// console.log(packages)

// 所有可link的本地 pkg
const localPkgNames = packages.map((p) => p.name)

const pkgDict = {}
packages.forEach((p) => {
	pkgDict[p.name] = p
})

for (const pkg of packages) {
	const pjsonPath = path.resolve(pkg.location, 'package.json')
	const tsconfigPath = path.resolve(pkg.location, 'tsconfig.json')

	const pjson = await readFile(pjsonPath)
	const dependents = JSON.parse(pjson).dependencies || {}

	// 注意 tsconfig 不一定存在
	try {
		await access(tsconfigPath, constants.F_OK)
	} catch (error) {
		console.warn(`${pkg.name} do not have a tsconfig.json, skip.`)
		continue
	}

	try {
		const tsconfigJson = (await readFile(tsconfigPath)).toString()
		// const errors = []
		// const tsconfig = jsonc.parse(tsconfigJson, errors, {
		// 	disallowComments: false,
		// 	allowEmptyContent: true,
		// 	allowTrailingComma: true,
		// })
		// const references = tsconfig.references || []

		// 过滤 dependents 中的本地包
		const localDepPkgs = Object.keys(dependents)
			.filter((pkgName) => {
				return localPkgNames.includes(pkgName)
			})
			.sort()

		// 生成相对路径

		const pathsShouldBe = []
		localDepPkgs.map((pkgName) => {
			// 被依赖的包
			const depPkg = pkgDict[pkgName]
			// 相对路径
			const depReference = path.relative(pkg.location, depPkg.location)
			pathsShouldBe.push(depReference)
			// tsconfig中是否存在这个reference
			// if (references.map((i) => i.path).includes(depReference)) {
			// } else {
			// 	console.warn('漏掉的 reference ', depReference)
			// }
		})

		const referencesShouldBe = pathsShouldBe.map((ref) => {
			return {
				path: ref,
			}
		})

		// 修改 jsonc
		const editList = jsonc.modify(
			tsconfigJson,
			// NOTE 并不是标准的 json path
			['references'],
			referencesShouldBe,
			{
				formattingOptions: {
					tabSize: 4,
					insertSpaces: false,
				},
				isArrayInsertion: true,
			}
		)
		// console.log(editList)

		const newJson = jsonc.applyEdits(tsconfigJson, editList)
		// console.log(newJson)

		let refText = localDepPkgs.join(', ')
		if (refText.length > 60) {
			refText = refText.slice(0, 60) + '...'
		}
		console.log(
			colors.rainbow('auto_ts_reference'),
			colors.green(pkg.name),
			'->',
			colors.blue(refText)
		)
		await writeFile(tsconfigPath, newJson)
	} catch (error) {
		console.log(error)
		console.log(pkg.name, tsconfigPath)
	}
}
