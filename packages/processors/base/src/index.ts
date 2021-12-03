import { MeshDataType } from '@gs.i/schema-scene'
import { traverse } from '@gs.i/utils-traverse'

export interface IProcessor {
	readonly type: string

	/**
	 * @section hints for Processor combiner
	 * 如果 多个 processor 使用一次遍历处理整棵树，需要指明每个processor会对树做什么
	 * @TODO 可能过度设计
	 */

	/**
	 * traverse setting
	 * @default 'PRE_ORDER'
	 */
	readonly traverseType: TraverseType

	/**
	 * indicate if this processor can edit node members
	 * @default false
	 */
	readonly canEditNode: boolean

	/**
	 * indicate if this processor can change the shape of the tree
	 * @default false
	 */
	readonly canEditTree: boolean
}

export class Processor implements IProcessor {
	type = 'Processor'

	/**
	 * @section hints for Processor combiner
	 * 如果 多个 processor 使用一次遍历处理整棵树，需要指明每个processor会对树做什么
	 * @TODO 可能过度设计
	 */

	/**
	 * traverse setting
	 * @default 'PRE_ORDER'
	 */
	traverseType = TraverseType.ANY
	/**
	 * indicate if this processor can edit node members
	 * @default false
	 */
	canEditNode = false
	/**
	 * indicate if this processor can change the shape of the tree
	 * @default false
	 */
	canEditTree = false

	protected cache = new WeakMap()

	constructor() {}

	/**
	 * process the node and all its children (the whole sub DAG)
	 */
	traverse(mesh: MeshDataType) {
		if (this.traverseType === TraverseType.PRE_ORDER || this.traverseType === TraverseType.ANY) {
			traverse(mesh, this.handleNode.bind(this))
		} else if (this.traverseType === TraverseType.NONE) {
			console.warn(`This processor (${this.type}) does not traverse, skipped`)
		} else {
			throw 'NOT IMPLEMENTED traverseType: ' + this.traverseType
		}
	}

	/**
	 * process the node only. ignore it's children
	 */
	handleNode(mesh: MeshDataType, parent?: MeshDataType) {
		console.warn(`processor (${this.type}) .handleNode is not implemented.`)
	}

	/**
	 * clear cache manually
	 * this should not be necessary
	 */
	clearCache() {
		// @note WeakMap.clear method was removed
		// @link https://esdiscuss.org/topic/removal-of-weakmap-weakset-clear
		// @todo needs to check if this actually frees the values of map
		this.cache = new WeakMap()
	}

	/**
	 * 手动销毁
	 * @TODO clearCache 之后这个是不是没有必要了？
	 */
	dispose() {
		this.clearCache()
	}
}

/**
 * Traverse Order
 */
export enum TraverseType {
	/**
	 * do not traverse
	 * this processor will not traverse the scene graph.
	 */
	NONE = 'NONE',
	/**
	 * Any Order is ok
	 * Every node is handled independently
	 */
	ANY = 'ANY',
	/**
	 * depth-first + pre-order (NLR)
	 */
	PRE_ORDER = 'PRE_ORDER',
	/**
	 * Breadth-first
	 */
	LEVEL_ORDER = 'LEVEL_ORDER',
}
