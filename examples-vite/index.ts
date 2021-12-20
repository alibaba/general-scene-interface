console.log(123)

// import entries from './entries.json'

// console.log(entries)

async function loadExample(name: string) {
	const { haha } = await import('./init/i')
	haha()
}

await loadExample('123')

export {}
