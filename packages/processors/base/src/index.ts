import { MeshDataType } from '@gs.i/schema-scene'
import { Processor as IProcessor, TraverseOrder } from '@gs.i/schema-processor'
import { traverse } from '@gs.i/utils-traverse'

export class Processor implements IProcessor {
	traverseOrder = TraverseOrder.ANY
	type = 'Processor'
	canEditNode = false
	canEditTree = false

	protected cache = new WeakMap()

	constructor() {}

	process(mesh: MeshDataType) {
		if (
			this.traverseOrder === TraverseOrder.PRE_ORDER ||
			this.traverseOrder === TraverseOrder.ANY
		) {
			traverse(mesh, this.processNode.bind(this))
		} else {
			throw 'NOT IMPLEMENTED traverseOrder: ' + this.traverseOrder
		}
	}

	processNode(mesh: MeshDataType, parent?: MeshDataType) {}

	clearCache() {
		// @note WeakMap.clear method was removed
		// @link https://esdiscuss.org/topic/removal-of-weakmap-weakset-clear
		// @todo needs to check if this actually frees the values of map
		this.cache = new WeakMap()
	}

	dispose() {
		this.clearCache()
	}
}

// export
