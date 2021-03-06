/**
 *
 * Due to the fact that
 * - Lerna will ignore all your filters(no-private/no-optional/ignore/scope) during bootstrap
 * - Yarn --ignore-optional/--no-optional simply doesn't work
 * - Neither of them plan to fix those problems
 *
 * The simplest way to workaround is to
 * - backup the original package.json -> package.json.bac.[id]
 * - change the package.json
 * - call lerna or yarn
 * - restore package.json.bac.[id] -> package.json
 *
 * Usage
 * - node backup.mjs --id=1234
 * - node restore.mjs --id=1234
 *
 */
/*eslint-env node*/
import { argv } from 'process'
import { constants, fstat } from 'fs'
import { readFile, writeFile, copyFile, access, rename, unlink } from 'fs/promises'
import path from 'path'

import { execSync, spawn, exec, execFileSync } from 'child_process'

// console.log(argv)
// console.log(process.env.PWD)

const idArgv = argv.filter((str) => str.includes('--id='))[0]
const hasId = !!idArgv
const id = hasId ? idArgv.split('=')[1] : null

const useVerbose = !!argv.filter((str) => str === '-v')[0]

if (hasId) {
	console.log('ID is ', id)
} else {
	console.warn(
		'It is recommended to pass an id like --id=123 to make sure you can restore package.json-s correctly if the process failed.'
	)
}

function getBackupName() {
	return hasId ? `package.json.bac.${id}` : 'package.json.bac'
}

const packagesJSON = execSync('npx lerna ls --json --all').toString()
const packageALL = JSON.parse(packagesJSON)

console.log(
	'\x1b[36m%s\x1b[0m',
	`
******************************************
*                                        *
* restore package.json-s ${hasId ? 'with ID ' + id + '\t' : 'without a id '} *
*                                        *
******************************************
`
)

try {
	await Promise.all(
		packageALL.map(async (pkg) => {
			const pjsonPath = path.resolve(pkg.location, 'package.json')
			const pjsonBacPath = path.resolve(pkg.location, getBackupName())
			if (useVerbose) {
				console.log(
					'restore package.json: ',
					path.relative(process.env.PWD, pjsonBacPath),
					'->',
					path.relative(process.env.PWD, pjsonPath)
				)
			}

			try {
				await access(pjsonBacPath, constants.F_OK)
			} catch (error) {
				console.warn(
					`Can not access file ${getBackupName()} in dir ${pkg.location}. Will ignore this package.`
				)

				return
			}

			await unlink(pjsonPath)
			await rename(pjsonBacPath, pjsonPath)
		})
	)
} catch (error) {
	console.error(error)
	console.warn(
		`You need to restore package.json manually! Call packageJsonRestore.mjs with the same id.`
	)
}

// for (const pkg of packageALL) {
// 	console.log(pkg)
// }
