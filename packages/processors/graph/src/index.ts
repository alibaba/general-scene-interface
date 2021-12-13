import { MeshDataType, Int } from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'
import { traverse, flatten } from '@gs.i/utils-traverse'

/**
 * a string representing the structure of a tree.
 * - **only used for comparison**
 * @note comparable only if generated by **the same processor**
 */
type TreeHash = string | Int

/**
 * a string representing a position in a tree.
 * - **only used for comparison**
 * @note comparable only if generated by **the same processor**
 */
type PositionHash = string | Int

/**
 * @note PURE FUNCTIONS. this process will modify the object you input
 * @note CACHED
 */
export class GraphProcessor extends Processor {
	traverseType = TraverseType.None
	type = 'GraphProcessor'
	canEditNode = false
	canEditTree = false

	/**
	 * 这个计数器配合 WeakMap 一起使用作为 **局部**唯一ID，可以避免多个实例存在时的撞表问题。
	 *
	 * 所有 id 都从 WeakMap 得到，一个 key 在一个实例中的 id 是唯一的
	 */
	private _counter = 0
	private _ids = new WeakMap<object, Int>()

	getID(o: object): Int {
		let id = this._ids.get(o)
		if (id === undefined) {
			id = this._counter++
			this._ids.set(o, id)
		}
		if (id >= 9007199254740990) throw 'ID exceeds MAX_SAFE_INTEGER'
		return id
	}

	/**
	 * hash the sub tree of the given node
	 * - used for checking if the tree structure changed
	 */
	hash(root: MeshDataType): TreeHash {
		let result = ''
		let currParent: MeshDataType | undefined = undefined
		traverse(root, (node, parent) => {
			if (parent === currParent) {
				// same parent
				result += this.getID(node) + ','
			} else {
				// parent change
				currParent = parent
				result += ((parent ? this.getID(parent) : '_') /* root */ as string) + '/'

				result + this.getID(node) + ','
			}
		})

		return result
	}

	/**
	 * hash the position of the given node
	 * - used for checking if the node position changed
	 */
	hashPosition(node: MeshDataType): PositionHash {
		const upstreamPath = [this.getID(node)]

		let curr: MeshDataType = node
		while (curr.parent) {
			upstreamPath.push(this.getID(curr.parent))
		}

		let result = upstreamPath.reverse().join(',')
		return result
	}

	/**
	 * take a snapshot of the tree structure
	 * - used to find out which parts of the tree changed
	 */
	snapshot(root: MeshDataType, keepRef = false): SnapShot {
		const result: SnapShot = {
			values: new Set(),
			references: new Map(),
			positions: new Map(),
		}

		traverse(root, (node, parent) => {
			const id = this.getID(node)
			result.values.add(id)
			result.positions.set(id, this.hashPosition(node))

			if (keepRef) {
				result.references.set(id, node)
			}
		})

		return result
	}

	diff(a: SnapShot, b: SnapShot): ChangeList {
		return diffTrees(a, b)
	}

	/**
	 * @note did not sort children, kept the order of adding
	 */
	flatten(root: MeshDataType): MeshDataType[] {
		return flatten(root)
	}
}

/**
 *
 */
export interface FlattenedTree<ValueType = number> {
	/**
	 * flattened nodes
	 */
	values: Set<ValueType>
	references: Map<ValueType, any>
	// parent: Map<ValueType, ValueType>
	positions: Map<ValueType, PositionHash>
}

/**
 *
 */
function diffTrees(a: FlattenedTree, b: FlattenedTree): ChangeList {
	const added = diffSets(b.values, a.values)
	const removed = diffSets(a.values, b.values)

	const intersection = intersect(a.values, b.values)
	const moved = new Set() as typeof a.values // not my fault
	intersection.forEach((valueA, valueB) => {
		if (a.positions.get(valueA) !== b.positions.get(valueB)) {
			moved.add(valueA)
		}
	})

	return {
		added,
		removed,
		kept: intersection,
		moved,
	}
}

/**
 *
 */
export interface SnapShot extends FlattenedTree {}

/**
 *
 */
export interface ChangeList<ValueType = number> {
	/**
	 * b - a
	 */
	added: Set<ValueType>
	/**
	 * a - b
	 */
	removed: Set<ValueType>
	/**
	 * insect(a,b)
	 */
	kept: Set<ValueType>
	/**
	 * insect(a,b).filter(positionChanged)
	 */
	moved: Set<ValueType>
}

/**
 * a - b
 */
function diffSets<T>(a: Set<T>, b: Set<T>): Set<T> {
	const difference = new Set(a)
	for (const elem of b) {
		difference.delete(elem)
	}
	return difference
}

function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
	const intersection = new Set<T>()
	for (const elem of b) {
		if (a.has(elem)) {
			intersection.add(elem)
		}
	}
	return intersection
}
