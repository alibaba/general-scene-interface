import {
	MeshDataType,
	Transform3,
	isTransform3Matrix,
	Int,
	Double,
	TypedArray,
} from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'

import { Euler, Quaternion, Vector3, Matrix4 } from '@gs.i/utils-math'
import { traversePreOrder } from '@gs.i/utils-traverse'

interface LocalMatrixCache {
	/**
	 * cached version of local transform
	 */
	version: Int
	/**
	 * cached local matrix
	 */
	matrix: Double[]
}

interface WorldMatrixCache {
	/**
	 * parent ID of this cached transform.
	 * * used to check if scene graph modified.
	 */
	parentID?: Int

	/**
	 * TODO kind of tricky
	 */
	version: Int
	parentVersion?: Int
	localTransformVersion: Int
	/**
	 * cached world matrix
	 */
	matrix: Double[]
}

/**
 * union cache of local and world matrices
 */
// interface MatrixCache {
// 	local?: LocalMatrixCache
// 	world?: WorldMatrixCache
// }

/**
 * @note PURE FUNCTIONS, will not modify your input
 * @note CACHED
 */
export class MatProcessor extends Processor {
	traverseType = TraverseType.Any
	type = 'Matrix'
	canEditNode = false
	canEditTree = false

	/**
	 * 这个计数器配合 WeakMap 一起使用作为 **局部**唯一ID，可以避免多个 MatProcessor 实例存在时的撞表问题。
	 *
	 * 所有 id 都从 WeakMap 得到，一个 key 在一个实例中的 id 是唯一的
	 */
	private _counter = 0
	private _ids = new WeakMap<MeshDataType, Int>()

	private _cacheLocalMatrix = new WeakMap<Transform3, LocalMatrixCache>()
	private _cacheWorldMatrix = new WeakMap<Transform3, WorldMatrixCache>()

	private _path = [] as MeshDataType[]

	/**
	 * get latest world matrix and update cache, with dirty-checking
	 * - this will check parent nodes to the root and update all the dirty parts
	 * - you can always get the correct matrix no matter when or what you did to the scene graph
	 */
	// * be very careful if you want to optimize this method
	getWorldMatrix(node: MeshDataType): number[] {
		// root as a special case

		if (!node.parent) {
			return this.getLocalMatrix(node)
		}

		// path from leaf to root
		// @note path.length >= 2
		const path: MeshDataType[] = this._path
		path.length = 0
		let curr: MeshDataType | undefined = node

		// @note for safety and perf
		// @result a little bit better ?
		const MAX_TREE_DEPTH = 2048
		let i = 0
		for (; i < MAX_TREE_DEPTH && curr !== undefined && curr !== null; i++) {
			path.push(curr)
			curr = curr.parent
		}

		if (i === MAX_TREE_DEPTH) console.warn('scene graph too deep, check for circular link')

		// path from root to leaf
		path.reverse()

		let isDirty = false

		// update every node from root
		const root = path[0]

		let rootWorldMatrixCache = this._cacheWorldMatrix.get(root.transform)

		// because:
		// - only the `current` node is handled in the loop, not the `parent`
		// - loop from the second node
		// so:
		// - the `root` node is never handled
		// handle it here
		if (
			// 如果该节点禁用缓存，则子树永远为脏
			root.transform.version === -1 ||
			// 如果该节点没有处理过，则子树为脏
			rootWorldMatrixCache === undefined ||
			// 如果节点的 local transform 变化，则子树为脏
			rootWorldMatrixCache?.localTransformVersion !== root.transform.version
		) {
			isDirty = true
		}

		// make sure the first `parent` in the loop available
		// @TODO how to cache this ?
		// @NOTE it's not necessary to cache the matrix because it's done by local matrix cache
		// @NOTE but may be should avoid weakMap reset the same value?

		if (isDirty) {
			// root is dirty
			if (rootWorldMatrixCache === undefined) {
				rootWorldMatrixCache = {} as WorldMatrixCache
				this._cacheWorldMatrix.set(root.transform, rootWorldMatrixCache)
			}
			rootWorldMatrixCache.matrix = this.getLocalMatrix(root)
			rootWorldMatrixCache.version = root.transform.version
			rootWorldMatrixCache.localTransformVersion = root.transform.version
		}

		// loop from the second node (skip root)
		// @note this optimize is actually slower
		// let parentWorldMatrixCache = rootMatrixCache?.world as WorldMatrixCache
		for (let i = 1 /* !NOTICE */; i < path.length; i++) {
			const curr = path[i]
			const parent = path[i - 1] // not undefined

			let currWorldMatrixCache = this._cacheWorldMatrix.get(curr.transform)

			// @note safe to assume it exist
			// 由于是从 root 后的第一个节点开始遍历，并提前对 root 做了处理，
			// 所以 parent 的 localMatrixCache 和 worldMatrixCache 都是存在且最新的
			// previous logic made sure that parent worldMatrix is updated

			const parentWorldMatrixCache = this._cacheWorldMatrix.get(
				parent.transform
			) as WorldMatrixCache

			if (
				// 如果处于脏子树中，则跳过后面的检查，直接为脏
				isDirty === true ||
				// 如果该节点禁用缓存，则子树永远为脏
				curr.transform.version === -1 ||
				// 如果该节点没有处理过，则子树为脏
				currWorldMatrixCache === undefined ||
				// currLocalMatrixCache === undefined ||
				// 如果节点的 local transform 变化，则子树为脏
				currWorldMatrixCache.localTransformVersion !== curr.transform.version ||
				// 如果父节点的 world transform 变化，则子树为脏
				currWorldMatrixCache.parentVersion !== parentWorldMatrixCache.version ||
				// 如果这个节点的父节点引用改变，则子树为脏
				currWorldMatrixCache.parentID !== this.getID(parent)
			) {
				isDirty = true
			}

			if (isDirty) {
				const currLocalMatrix = this.getLocalMatrix(curr)
				const currWorldMatrix = multiplyMatrices(parentWorldMatrixCache.matrix, currLocalMatrix)

				if (currWorldMatrixCache === undefined) {
					currWorldMatrixCache = {} as WorldMatrixCache
					this._cacheWorldMatrix.set(curr.transform, currWorldMatrixCache)
				}
				currWorldMatrixCache.parentID = this.getID(parent)
				currWorldMatrixCache.parentVersion = parentWorldMatrixCache.version
				currWorldMatrixCache.localTransformVersion = curr.transform.version
				currWorldMatrixCache.version = (currWorldMatrixCache.version ?? 0) + 1
				currWorldMatrixCache.matrix = currWorldMatrix
			}
		}

		// TODO this weakmap.get is redundant
		return this._cacheWorldMatrix.get(node.transform)?.matrix as number[]
	}

	/**
	 * this will update cached matrices for all the nodes of the sub tree
	 * @param root
	 */
	updateMatrix(root: MeshDataType) {
		traversePreOrder(root, this.updateMatrixShallow.bind(this))
	}

	/**
	 * flat version of {@link updateMatrix}
	 * @note flatScene must be pre-order or BFS, can not be post-order
	 */
	updateMatrixFlat(flatScene: MeshDataType[]) {
		for (let i = 0; i < flatScene.length; i++) {
			const node = flatScene[i]
			const parent = node.parent

			this.updateMatrixShallow(node, parent)
		}
	}

	/**
	 * update a node's matrix and only use itself and direct parent for dirty-checking
	 * @param node
	 * @param parent
	 */
	private updateMatrixShallow(node: MeshDataType, parent?: MeshDataType) {
		if (parent) {
			const curr = node

			let isDirty = false
			let currWorldMatrixCache = this._cacheWorldMatrix.get(curr.transform)

			// @note safe to assume it exist
			// 由于是从 root 后的第一个节点开始遍历，并提前对 root 做了处理，
			// 所以 parent 的 localMatrixCache 和 worldMatrixCache 都是存在且最新的
			// previous logic made sure that parent worldMatrix is updated

			const parentWorldMatrixCache = this._cacheWorldMatrix.get(
				parent.transform
			) as WorldMatrixCache

			if (
				// 如果该节点禁用缓存，则子树永远为脏
				curr.transform.version === -1 ||
				// 如果该节点没有处理过，则子树为脏
				currWorldMatrixCache === undefined ||
				// currLocalMatrixCache === undefined ||
				// 如果节点的 local transform 变化，则子树为脏
				currWorldMatrixCache.localTransformVersion !== curr.transform.version ||
				// 如果父节点的 world transform 变化，则子树为脏
				currWorldMatrixCache.parentVersion !== parentWorldMatrixCache.version ||
				// 如果这个节点的父节点引用改变，则子树为脏
				currWorldMatrixCache.parentID !== this.getID(parent)
			) {
				isDirty = true
			}

			if (isDirty) {
				const currLocalMatrix = this.getLocalMatrix(curr)
				const currWorldMatrix = multiplyMatrices(parentWorldMatrixCache.matrix, currLocalMatrix)

				if (currWorldMatrixCache === undefined) {
					currWorldMatrixCache = {} as WorldMatrixCache
					this._cacheWorldMatrix.set(curr.transform, currWorldMatrixCache)
				}
				currWorldMatrixCache.parentID = this.getID(parent)
				currWorldMatrixCache.parentVersion = parentWorldMatrixCache.version
				currWorldMatrixCache.localTransformVersion = curr.transform.version
				currWorldMatrixCache.version = (currWorldMatrixCache.version ?? 0) + 1
				currWorldMatrixCache.matrix = currWorldMatrix
			}
		} else {
			// this is root

			let isDirty = false
			const root = node
			let rootWorldMatrixCache = this._cacheWorldMatrix.get(root.transform)

			if (
				// 如果该节点禁用缓存，则子树永远为脏
				root.transform.version === -1 ||
				// 如果该节点没有处理过，则子树为脏
				rootWorldMatrixCache === undefined ||
				// 如果节点的 local transform 变化，则子树为脏
				rootWorldMatrixCache?.localTransformVersion !== root.transform.version
			) {
				isDirty = true
			}

			// make sure the first `parent` in the loop available
			// @TODO how to cache this ?
			// @NOTE it's not necessary to cache the matrix because it's done by local matrix cache
			// @NOTE but may be should avoid weakMap reset the same value?

			if (isDirty) {
				// root is dirty
				if (rootWorldMatrixCache === undefined) {
					rootWorldMatrixCache = {} as WorldMatrixCache
					this._cacheWorldMatrix.set(root.transform, rootWorldMatrixCache)
				}
				rootWorldMatrixCache.matrix = this.getLocalMatrix(root)
				rootWorldMatrixCache.version = root.transform.version
				rootWorldMatrixCache.localTransformVersion = root.transform.version
			}
		}
	}

	/**
	 * get cached world matrix
	 * @note only use this if you are sure the tree has been updated and nothing has changed
	 */
	getCachedWorldMatrix(node: MeshDataType): number[] | undefined {
		return this._cacheWorldMatrix.get(node.transform)?.matrix
	}

	/**
	 *
	 * @param node a reference type (Object)
	 * @note typescript baned `object` so there is no proper type to use 😮‍💨
	 * @returns
	 */
	getID(node: MeshDataType): Int {
		let id = this._ids.get(node)
		if (id === undefined) {
			id = this._counter++
			this._ids.set(node, id)
		}
		if (id >= 9007199254740990) throw 'ID exceeds MAX_SAFE_INTEGER'
		return id
	}

	getLocalMatrix(node: MeshDataType): number[] {
		const transform = node.transform

		/**
		 * 缓存判断模版 #start
		 */

		if (transform.version === -1) {
			// 不缓存
			return getMatrix(transform)
		} else {
			// if input a cache (including undefined), use it directly
			// if input null (by default), fetch catch
			const cache = this._cacheLocalMatrix.get(transform)
			if (!cache) {
				// 未缓存
				const matrix = getMatrix(transform)
				this._cacheLocalMatrix.set(transform, { version: transform.version, matrix })
				return matrix
			} else {
				// 命中缓存
				if (cache.version !== transform.version) {
					// 更新缓存版本
					getMatrix(transform, cache.matrix)
					cache.version = transform.version
				}
				return cache.matrix
			}
		}

		/**
		 * 缓存判断模版 #end
		 */
	}
}

class SchemaNotValid extends TypeError {
	constructor(msg?: string) {
		super('GSI:SchemaNotValid: ' + (msg || ''))
	}
}

// reusable objects, refresh all values every time

const _mat4 = new Matrix4()
const _quaternion = new Quaternion()
const _position = new Vector3()
const _scale = new Vector3()
const _rotation = new Euler()

/**
 *
 * @param transform
 * @param target
 * @param offset
 * @returns
 */
function getMatrix<T extends number[] | TypedArray = number[]>(
	transform: Transform3,
	target = [] as unknown as T,
	offset = 0
): T {
	if (isTransform3Matrix(transform)) {
		// always create a new array instead of return the original reference
		for (let i = 0; i < 16; i++) {
			target[i + offset] = transform.matrix[i]
		}
		return target
	} else {
		if (!transform.position)
			throw new SchemaNotValid(
				'transform.position can not be undefined. maybe you need to specify it first'
			)

		_position.set(transform.position.x, transform.position.y, transform.position.z)

		if (!transform.scale)
			throw new SchemaNotValid(
				'transform.scale can not be undefined. maybe you need to specify it first'
			)

		_scale.set(transform.scale.x, transform.scale.y, transform.scale.z)

		// 转换四元数

		if (transform.quaternion) {
			_quaternion.set(
				transform.quaternion.x,
				transform.quaternion.y,
				transform.quaternion.z,
				transform.quaternion.w
			)
		} else {
			if (!transform.rotation)
				throw new SchemaNotValid(
					'transform.quaternion and .rotation can not both be undefined. maybe you need to specify it first'
				)

			_rotation.x = transform.rotation.x
			_rotation.y = transform.rotation.y
			_rotation.z = transform.rotation.z
			_rotation.order = transform.rotation.order.toUpperCase()

			_quaternion.setFromEuler(_rotation)
		}
		// 合成
		// @note 这个函数十分高效，缓存可能不太划算
		_mat4.compose(_position, _quaternion, _scale)
		// 复制
		return _mat4.toArray(target, offset) as T
	}
}

const _mat4Curr = new Matrix4()
const _mat4Parent = new Matrix4()
function multiplyMatrices(parent: number[], curr: number[], target: number[] = []) {
	_mat4Curr.fromArray(curr)
	_mat4Parent.fromArray(parent)
	_mat4Curr.multiplyMatrices(_mat4Parent, _mat4Curr)
	return _mat4Curr.toArray(target)
}

function transformEquals(t1: Transform3, t2: Transform3): boolean {
	if (isTransform3Matrix(t1)) {
		if (isTransform3Matrix(t2)) {
			// 两个 都是 matrix
			return matrix4Equals(t1.matrix, t2.matrix)
		} else {
			// 两个 transform3 的形式不同
			return false
		}
	} else {
		if (isTransform3Matrix(t2)) {
			// 两个 transform3 的形式不同
			return false
		} else {
			// 两个都是 TRS

			const p1 = t1.position
			const p2 = t2.position
			const e1 = t1.rotation
			const e2 = t2.rotation
			const q1 = t1.quaternion
			const q2 = t2.quaternion
			const s1 = t1.scale
			const s2 = t2.scale

			if (
				// pos
				p1?.x === p2?.x &&
				p1?.y === p2?.y &&
				p1?.z === p2?.z &&
				// rotation
				e1?.x === e2?.x &&
				e1?.y === e2?.y &&
				e1?.z === e2?.z &&
				e1?.order === e2?.order &&
				// quaternion
				q1?.x === q2?.x &&
				q1?.y === q2?.y &&
				q1?.z === q2?.z &&
				q1?.w === q2?.w &&
				// scale
				s1?.x === s2?.x &&
				s1?.y === s2?.y &&
				s1?.z === s2?.z
			) {
				return true
			} else {
				return false
			}
		}
	}
}

function matrix4Equals(m1: number[], m2: number[]): boolean {
	if (m1.length !== m2.length) {
		return false
	}

	const length = m1.length
	for (let i = 0; i < length; i++) {
		if (m1[i] !== m2[i]) return false
	}

	return true
}
