import { MeshDataType, LooseMeshDataType } from '@gs.i/schema-scene'
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

export class Processor<Input extends LooseMeshDataType = MeshDataType> implements IProcessor {
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
	traverseType = TraverseType.Any
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

	/**
	 * an option to disable this processor manually.
	 *
	 * - only affects combined processors.
	 * - will not affect methods
	 */
	disable = false

	protected cache = new WeakMap()

	constructor() {}

	/**
	 * process the node and all its children (the whole sub DAG)
	 */
	traverse(mesh: Input) {
		if ((this.traverseType & TraverseType.PreOrder) === TraverseType.PreOrder) {
			traverse(mesh as MeshDataType, this.processNode.bind(this))
		} else if (this.traverseType === TraverseType.None) {
			console.warn(`This processor (${this.type}) does not traverse, skipped`)
		} else {
			throw 'NOT IMPLEMENTED traverseType: ' + this.traverseType
		}
	}

	/**
	 * process the node only. ignore it's children
	 */
	processNode(mesh: MeshDataType, parent?: MeshDataType) {
		console.warn(`processor (${this.type}) .processNode is not implemented.`)
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
	None = 0, // 0000

	/**
	 * depth-first + pre-order (NLR)
	 */
	PreOrder = 1 << 0, // 0001
	/**
	 * Breadth-first
	 */
	LevelOrder = 1 << 1, // 0010

	/**
	 * Any Order is ok
	 * Every node is handled independently
	 */
	Any = ~(~0 << 4), // 1111
}
