/* eslint-disable no-inner-declarations */
export {}

const depth = 200
const width = 200

type Node = { children: Set<Node>; parent?: Node }

const mkOne = () => {
	return { children: new Set() } as Node
}

/**
 *                root
 * { leaves } - branch
 * { leaves } - branch
 * { leaves } - branch
 */
const mkAll = () => {
	const root = mkOne()
	let currBranch = root
	for (let i = 0; i < depth; i++) {
		const level = mkOne()
		currBranch.children.add(level)
		currBranch = level
		for (let j = 0; j < width; j++) {
			const leaf = mkOne()
			level.children.add(leaf)
		}
	}

	return root
}

const tree = mkAll()

console.log(tree)
const MAX_NODE_COUNT = 1024 * 1024 * 1024

{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any, parent?: Node) {
		if (node === undefined || node === null) return

		handler(node, parent)

		// @note a little bit faster
		if (node.children)
			for (const child of node.children) {
				traverse(child, handler, node)
			}
	}

	function flatten(node: Node) {
		const result = [] as Node[]
		traverse(node, (node) => result.push(node))

		return result
	}

	console.time('flatten (traverse)')
	const flat = flatten(tree)
	flatten(tree)
	flatten(tree)
	flatten(tree)
	console.timeEnd('flatten (traverse)')

	// console.log(flat)
}

{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any, parent?: Node) {
		if (node === undefined || node === null) return

		handler(node, parent)

		// @note a little bit faster
		if (node.children.size)
			for (const child of node.children) {
				traverse(child, handler, node)
			}
	}

	function flatten(node: Node) {
		const result = [] as Node[]
		traverse(node, (node) => result.push(node))

		return result
	}

	console.time('flatten (traverse) (check size)')
	const flat = flatten(tree)
	flatten(tree)
	flatten(tree)
	flatten(tree)
	console.timeEnd('flatten (traverse) (check size)')

	// console.log(flat)
}
{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any, parent?: Node) {
		if (node === undefined || node === null) return

		handler(node, parent)

		// @note a little bit faster
		if (node.children.size)
			for (const child of node.children) {
				traverse(child, handler, node)
			}
	}

	function flatten(node: Node) {
		const result = [] as Node[]
		let count = 0

		const set = new WeakSet<Node>()

		traverse(node, (node) => {
			if (set.has(node)) {
				console.error(node)
				throw new Error('Loop detected during traversal.')
			}

			if (count++ > MAX_NODE_COUNT)
				throw new Error('Max node count exceeded. Make sure you are not in a infinite loop.')

			result.push(node)
			set.add(node)
		})

		return result
	}

	console.time('flatten safe (traverse) (check size) (weakset)')
	const flat = flatten(tree)
	flatten(tree)
	flatten(tree)
	flatten(tree)
	console.timeEnd('flatten safe (traverse) (check size) (weakset)')

	// console.log(flat)
}
{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any, parent?: Node) {
		if (node === undefined || node === null) return

		handler(node, parent)

		// @note a little bit faster
		if (node.children.size)
			for (const child of node.children) {
				traverse(child, handler, node)
			}
	}

	function flatten(node: Node) {
		const result = [] as Node[]
		let count = 0

		const set = new Set<Node>()

		traverse(node, (node) => {
			if (set.has(node)) {
				console.error(node)
				throw new Error('Loop detected during traversal.')
			}

			if (count++ > MAX_NODE_COUNT)
				throw new Error('Max node count exceeded. Make sure you are not in a infinite loop.')

			result.push(node)
			set.add(node)
		})

		return result
	}

	console.time('flatten safe (traverse) (check size) (set)')
	const flat = flatten(tree)
	flatten(tree)
	flatten(tree)
	flatten(tree)
	console.timeEnd('flatten safe (traverse) (check size) (set)')

	// console.log(flat)
}

{
	function flatten(node: Node) {
		const result = [node] as Node[]

		let pointer = 0

		while (pointer < result.length) {
			const curr = result[pointer]
			const children = curr.children
			if (children) {
				for (const child of children) {
					result.push(child)
				}
			}

			pointer++
		}
		return result
	}

	console.time('flatten (non-rec)')
	const flat = flatten(tree)
	flatten(tree)
	flatten(tree)
	flatten(tree)
	console.timeEnd('flatten (non-rec)')

	// console.log(flat)
}

{
	function flatten(node: Node) {
		const result = [node] as Node[]

		let pointer = 0

		while (pointer < result.length) {
			const curr = result[pointer]
			const children = curr.children
			if (children.size > 0) {
				for (const child of children) {
					result.push(child)
				}
			}

			pointer++
		}
		return result
	}

	console.time('flatten (non-rec) (check size)')
	const flat = flatten(tree)
	flatten(tree)
	flatten(tree)
	flatten(tree)
	console.timeEnd('flatten (non-rec) (check size)')

	// console.log(flat)
}

{
	function flatten(node: Node) {
		const result = [node] as Node[]

		const set = new WeakSet<Node>()

		let pointer = 0

		while (pointer < result.length) {
			const curr = result[pointer]
			const children = curr.children
			if (children.size > 0) {
				for (const child of children) {
					if (set.has(child)) {
						console.error(child)
						throw new Error('Loop detected during traversal.')
					}

					result.push(child)
					set.add(child)
				}
			}

			pointer++

			if (pointer > MAX_NODE_COUNT)
				throw new Error('Max node count exceeded. Make sure you are not in a infinite loop.')
		}
		return result
	}

	console.time('flatten safe (non-rec) (check size) (weakset)')
	const flat = flatten(tree)
	flatten(tree)
	flatten(tree)
	flatten(tree)
	console.timeEnd('flatten safe (non-rec) (check size) (weakset)')

	// console.log(flat)
}

{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any, parent?: Node) {
		if (node === undefined || node === null) return

		handler(node, parent)

		// @note a little bit faster
		// if (node.children !== undefined && node.children.size > 0)
		if (node.children.size > 0)
			for (const child of node.children) {
				traverse(child, handler, node)
			}
	}

	console.time('direct traverse (for of) (check size)')
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	console.timeEnd('direct traverse (for of) (check size)')
}

{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any, parent?: Node) {
		if (node === undefined || node === null) return

		handler(node, parent)

		// @note a little bit faster
		if (node.children)
			for (const child of node.children) {
				traverse(child, handler, node)
			}
	}

	console.time('direct traverse (for of)')
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	console.timeEnd('direct traverse (for of)')
}

{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any, parent?: Node) {
		if (node === undefined || node === null) return

		handler(node, parent)

		// @note a little bit faster
		if (node.children) node.children.forEach((child) => traverse(child, handler, node))
	}

	console.time('direct traverse (forEach)')
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	console.timeEnd('direct traverse (forEach)')
}

{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any) {
		if (node === undefined || node === null) return

		handler(node)

		if (!node.children) return

		const queue = [node.children] as Set<Node>[]

		while (queue.length > 0) {
			const length = queue.length
			for (let i = 0; i < length; i++) {
				const currChildren = queue[i]
				for (const child of currChildren) {
					handler(child)
					if (child.children) queue.push(child.children)
				}
			}
			for (let i = 0; i < length; i++) {
				queue.shift()
			}
		}
	}

	console.time('direct traverse (non-recursive)')
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	console.timeEnd('direct traverse (non-recursive)')
}
{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any) {
		const result = [node] as Node[]

		let pointer = 0

		while (pointer < result.length) {
			const curr = result[pointer]
			const children = curr.children
			if (children.size > 0) {
				for (const child of children) {
					result.push(child)
					handler(node, curr)
				}
			}

			pointer++
		}
		return result
	}

	console.time('direct traverse (non-recursive) (opt)')
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	console.timeEnd('direct traverse (non-recursive) (opt)')
}

// buffer
{
	function traverse(node: Node, handler: (node: Node, parent?: Node) => any) {
		if (node === undefined || node === null) return

		handler(node)

		if (!node.children) return

		const queue = [node.children] as Set<Node>[]

		while (queue.length > 0) {
			const length = queue.length
			for (let i = 0; i < length; i++) {
				const currChildren = queue[i]
				for (const child of currChildren) {
					handler(child)
					if (child.children) queue.push(child.children)
				}
			}
			for (let i = 0; i < length; i++) {
				queue.shift()
			}
		}
	}

	console.time('buffer')
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	traverse(tree, () => {})
	console.timeEnd('buffer')
}
