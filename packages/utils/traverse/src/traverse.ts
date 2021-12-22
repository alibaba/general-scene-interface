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
