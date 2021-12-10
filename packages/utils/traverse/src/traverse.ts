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

	if (!node.children) return

	if (node.children.size > 0) {
		node.children.forEach((child) => traverse(child, handler, node))
	}
}

export const traversePreOrder = traverse

/**
 * flatten a DAG in to array
 * @param node
 * @returns
 */
export function flatten(node: MeshDataType) {
	const result = [] as MeshDataType[]

	traverse(node, (_node, parent) => {
		_node.parent = parent
		result.push(_node)
	})

	return result
}
