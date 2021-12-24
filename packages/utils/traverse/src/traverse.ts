import { MeshDataType } from '@gs.i/schema-scene'

/**
 * traverse a scene graph and process all the nodes
 * 默认使用深度优先前序遍历（最快）
 * Pre-Order Traversal
 * @param node
 * @param handler
 * @param parent
 */
export function traverse(
	node: MeshDataType,
	handler: (node: MeshDataType, parent?: MeshDataType) => any,
	parent?: MeshDataType
) {
	if (node === undefined || node === null) return

	handler(node, parent)

	// if (node.children && node.children.size > 0) {
	// 	node.children.forEach((child) => traverse(child, handler, node))
	// }

	// @note a little bit faster
	if (node.children)
		for (const child of node.children) {
			traverse(child, handler, node)
		}
}

export const traversePreOrder = traverse

export function traversePostOrder(
	node: MeshDataType,
	handler: (node: MeshDataType, parent?: MeshDataType) => any,
	parent?: MeshDataType
) {
	if (node === undefined || node === null) return

	if (node.children && node.children.size > 0) {
		node.children.forEach((child) => traversePostOrder(child, handler, node))
	}

	handler(node, parent)
}

/**
 * parse tree into levels, used by BFS
 */
export function genLevels(root: MeshDataType) {
	const levels = [] as MeshDataType[][]

	// level 0
	let prevLevel = [root] as MeshDataType[]
	levels.push(prevLevel.slice())

	// safe loop
	const MAX_TREE_DEPTH = 2048
	for (let level = 1; level < MAX_TREE_DEPTH; level++) {
		// generate level
		const currLevel = [] as MeshDataType[]
		for (let i = 0; i < prevLevel.length; i++) {
			const node = prevLevel[i]
			node.children.forEach((child) => {
				currLevel.push(child)
			})
		}

		if (currLevel.length === 0) {
			break
		} else {
			prevLevel = currLevel
			levels.push(prevLevel.slice())
		}
	}

	return levels
}

export function traverseBFS(root: MeshDataType, handler: (node: MeshDataType) => any) {
	if (root === undefined || root === null) return

	const levels = genLevels(root)

	// handle

	for (let i = 0; i < levels.length; i++) {
		const level = levels[i]
		for (let k = 0; k < level.length; k++) {
			const node = level[k]
			handler(node)
		}
	}
}

export function traverseBFSBottomUp(root: MeshDataType, handler: (node: MeshDataType) => any) {
	if (root === undefined || root === null) return

	const levels = genLevels(root)

	// handle

	for (let i = levels.length - 1; i >= 0; i--) {
		const level = levels[i]
		for (let k = 0; k < level.length; k++) {
			const node = level[k]
			handler(node)
		}
	}
}

/**
 * flatten a DAG in to array
 * @param node
 * @returns
 */
export function flatten(node?: MeshDataType) {
	const result = [] as MeshDataType[]

	if (node) {
		traverse(node, (_node, parent) => {
			_node.parent = parent
			result.push(_node)
		})
	}

	return result
}
