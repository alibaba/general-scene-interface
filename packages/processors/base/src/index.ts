import { MeshDataType } from '@gs.i/schema-scene'
import { Processor as IProcessor, TraverseType } from '@gs.i/schema-processor'
import { traverse } from '@gs.i/utils-traverse'

export class Processor implements IProcessor {
	traverseType = TraverseType.ANY
	type = 'Processor'
	canEditNode = false
	canEditTree = false

	protected cache = new WeakMap()

	constructor() {}

	process(mesh: MeshDataType) {
		if (this.traverseType === TraverseType.PRE_ORDER || this.traverseType === TraverseType.ANY) {
			traverse(mesh, this.processNode.bind(this))
		} else if (this.traverseType === TraverseType.NONE) {
			console.warn(`This processor (${this.type}) does not traverse, skipped`)
		} else {
			throw 'NOT IMPLEMENTED traverseType: ' + this.traverseType
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
