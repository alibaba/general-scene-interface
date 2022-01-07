/* eslint-disable @typescript-eslint/ban-types */
import IR, { Int, BBox, BSphere, isRenderable } from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'

import type { MatProcessor } from '@gs.i/processor-matrix'
import { traverseBFSBottomUp } from '@gs.i/utils-traverse'

import { computeBBox, computeBSphere, convBox3ToBBox } from '@gs.i/utils-geometry'

import { Box3, Matrix4, Vector3 } from '@gs.i/utils-math'

interface BBoxCache {
	/**
	 * cached version
	 */
	version: Int
	/**
	 * cached
	 */
	bbox: BBox
}
interface BSphereCache {
	/**
	 * cached version
	 */
	version: Int
	/**
	 * cached
	 */
	bsphere: BSphere
}
interface BoundsCache {
	/**
	 * cached version
	 */
	version: Int | undefined
	/**
	 * cached
	 */
	bsphere: BSphere
	bbox: BBox
}
interface BVHCache {
	/**
	 * cached
	 */
	// bsphere: BSphere
	bbox: BBox
}

const _box = new Box3()
const _box2 = new Box3()
const _mat = new Matrix4()

/**
 * @note PURE FUNCTIONS, will not modify your input
 * @note CACHED
 */
export class BoundingProcessor extends Processor {
	traverseType = TraverseType.None
	type = 'Bound'
	canEditNode = false
	canEditTree = false

	/**
	 * 这个计数器配合 WeakMap 一起使用作为 **局部**唯一ID，可以避免多个 MatProcessor 实例存在时的撞表问题。
	 *
	 * 所有 id 都从 WeakMap 得到，一个 key 在一个实例中的 id 是唯一的
	 */
	private _counter = 0
	private _ids = new WeakMap<object, Int>()

	private _cacheGeomBBox = new WeakMap<IR.Geometry, BBoxCache>()
	private _cacheGeomBSphere = new WeakMap<IR.Geometry, BSphereCache>()
	private _cachedBounds = new WeakMap<IR.Geometry, BoundsCache>()
	private _cachedBVH = new WeakMap<IR.NodeLike, BVHCache>()

	matrixProcessor?: MatProcessor

	override processNode(node: IR.NodeLike, parent?: IR.NodeLike) {
		// this.getWorldMatrixShallow(node, parent)
	}

	constructor(
		config: {
			/**
			 * used for generating BVH
			 */
			matrixProcessor?: MatProcessor
		} = {}
	) {
		super()
		this.matrixProcessor = config.matrixProcessor
	}

	private getID(o: object): Int {
		let id = this._ids.get(o)
		if (id === undefined) {
			id = this._counter++
			this._ids.set(o, id)
		}
		if (id >= 9007199254740990) throw 'ID exceeds MAX_SAFE_INTEGER'
		return id
	}

	getGeomBoundingBox(geom: IR.Geometry): BBox {
		// if (!node) throw new SchemaNotValid(`MatProcessor: the node you input does not exist`)
		// if (!node.transform)
		// 	throw new SchemaNotValid(
		// 		`MatProcessor: the node you input does not have .transform member. you need to specify it first`
		// 	)

		// @note if user input custom bounding volume, use it
		const customBBox = geom.extensions?.EXT_geometry_bounds?.box
		if (customBBox !== undefined) return customBBox
		// @note if user only input customBSphere, use it instead of generating from position
		// 		 one reason to use a custom bound is that bounding volume can't be generated right
		const customBSphere = geom.extensions?.EXT_geometry_bounds?.sphere
		if (customBSphere !== undefined) return generateBBoxFromBSphere(customBSphere)

		const cache = this._cacheGeomBBox.get(geom)
		const posVersion = geom.attributes.position?.version ?? 0
		if (!cache) {
			// 未缓存
			const bbox = computeBBox(geom)
			this._cacheGeomBBox.set(geom, { version: posVersion, bbox })
			return bbox
		} else {
			// 命中缓存
			if (cache.version !== posVersion || posVersion === -1) {
				// 更新缓存版本
				cache.bbox = computeBBox(geom)
				cache.version = posVersion
			}
			return cache.bbox
		}
	}

	getGeomBoundingSphere(geom: IR.Geometry): BSphere {
		// @note if user input custom bounding volume, use it
		const customBSphere = geom.extensions?.EXT_geometry_bounds?.sphere
		if (customBSphere !== undefined) return customBSphere
		// @note if user only input customBBox, use it instead of generating from position
		// 		 one reason to use a custom bound is that bounding volume can't be generated right
		const customBBox = geom.extensions?.EXT_geometry_bounds?.box
		if (customBBox !== undefined) return generateBSphereFromBBox(customBBox)

		const cache = this._cacheGeomBSphere.get(geom)
		const posVersion = geom.attributes.position?.version ?? 0
		if (!cache) {
			// 未缓存
			const bsphere = computeBSphere(geom)
			this._cacheGeomBSphere.set(geom, {
				version: posVersion,
				bsphere,
			})
			return bsphere
		} else {
			// 命中缓存
			if (cache.version !== posVersion || posVersion === -1) {
				// 更新缓存版本
				cache.bsphere = computeBSphere(geom)
				cache.version = posVersion
			}
			return cache.bsphere
		}
	}

	/**
	 * get all kinds of bounding volumes
	 */
	getBounds(geom: IR.Geometry): BoundsCache {
		let result = this._cachedBounds.get(geom)
		if (result === undefined) {
			result = {} as BoundsCache
			this._cachedBounds.set(geom, result)
		}

		const customBBox = geom.extensions?.EXT_geometry_bounds?.box
		const customBSphere = geom.extensions?.EXT_geometry_bounds?.sphere

		// @note if user input custom bounding volume, use it
		// @note if user only input on type of custom bound, use it to gen another one
		// 		 one reason to use a custom bound is that bounding volume can't be generated right

		if (customBBox || customBSphere) {
			if (customBBox) {
				result.bbox = customBBox
			} else {
				result.bbox = generateBBoxFromBSphere(customBSphere as BSphere)
			}

			if (customBSphere) {
				result.bsphere = customBSphere
			} else {
				result.bsphere = generateBSphereFromBBox(customBBox as BBox)
			}

			result.version = undefined // useless

			return result
		}

		const posVersion = geom.attributes.position?.version ?? 0

		if (result.version !== posVersion || posVersion === -1) {
			// 更新缓存版本
			result.bbox = computeBBox(geom)
			result.bsphere = computeBSphere(geom)
			result.version = posVersion
		}

		return result
	}

	/**
	 * - traverse lever first bottom up
	 * - all children bounds are ready when used
	 * @note BVH bounds are already transformed into world space. Don't multiply matrix when used
	 * @note WorldMatrix should be cached before calling this
	 */
	updateBVH(root: IR.NodeLike) {
		if (!this.matrixProcessor)
			throw 'BoundingProcessor:: matrixProcessor is needed for generating BVH'

		traverseBFSBottomUp(root, this.updateNodeBVH.bind(this))
	}
	/**
	 * flat version of {@link updateBVH}
	 * @note flatSceneBFS must be generated by {@link flattenBFS}
	 */
	updateBVHFlat(flatSceneBFS: IR.NodeLike[]) {
		if (!this.matrixProcessor)
			throw 'BoundingProcessor:: matrixProcessor is needed for generating BVH'

		for (let i = flatSceneBFS.length - 1; i >= 0; i--) {
			const node = flatSceneBFS[i]
			this.updateNodeBVH(node)
		}
	}

	/**
	 * - matrixProcessor must be specified
	 * - all children bounds must be ready when used
	 * - WorldMatrix should be cached before calling this
	 */
	private updateNodeBVH(node: IR.NodeLike) {
		const matrixProcessor = this.matrixProcessor as MatProcessor

		let cache = this._cachedBVH.get(node)
		if (!cache) {
			cache = {} as BVHCache
			this._cachedBVH.set(node, cache)
		}

		// reset box
		const bvhBox = _box2
		bvhBox.min.x = Infinity
		bvhBox.min.y = Infinity
		bvhBox.min.z = Infinity
		bvhBox.max.x = -Infinity
		bvhBox.max.y = -Infinity
		bvhBox.max.z = -Infinity

		// A. update self mesh-bounds (transformed)

		if (isRenderable(node)) {
			const geometryBBox = this.getBounds(node.geometry).bbox
			const matrix = matrixProcessor.getCachedWorldMatrix(node)

			if (!matrix) {
				throw new Error(
					`BoundingProcessor:: WorldMatrix of ${node.name} is not cached. ` +
						`Will fall back to dirty-checking. ` +
						`The scene-graph may have changed during this conversion.`
				)
			}

			_mat.fromArray(matrix)
			_box.set(geometryBBox.min as Vector3, geometryBBox.max as Vector3) // safe here
			_box.applyMatrix4(_mat)

			bvhBox.union(_box)
		}

		// B. get children bvh-bounds (transformed)

		node.children.forEach((child) => {
			const childBVHBox = this._cachedBVH.get(child)?.bbox
			// @note if a sub tree doesn't have any renderable object in it:
			// 		 - childBVHBox for leaves will be undefined
			// 		 - childBVHBox for non-leaf nodes will be -Infinity
			if (childBVHBox) {
				_box.set(childBVHBox.min as Vector3, childBVHBox.max as Vector3) // safe here
				bvhBox.union(_box)
			}
		})

		// @note disabling frustumCulling should affect parent
		if (node.extensions?.EXT_mesh_advanced?.frustumCulling === false) {
			bvhBox.max.x = Infinity
			bvhBox.max.y = Infinity
			bvhBox.max.z = Infinity
			bvhBox.min.x = -Infinity
			bvhBox.min.y = -Infinity
			bvhBox.min.z = -Infinity
		}

		// C. merge bounds into self bvh-bounds (transformed)
		// D. cache it.
		const bvhBBox = convBox3ToBBox(bvhBox)
		cache.bbox = bvhBBox
	}
	/**
	 * get **cached** BVH bounds
	 * @note there is no efficient way to dirty-check the BVH bounds. You should update the whole scene's bvh before this
	 * @unfinished @TODO
	 */
	getBVHBounds(node: IR.NodeLike) {
		return this._cachedBVH.get(node)
	}
}

/**
 * gen a baggy larger bound volume fast
 */
export function generateBBoxFromBSphere(bsphere: BSphere): BBox {
	return {
		min: {
			x: bsphere.center.x - bsphere.radius,
			y: bsphere.center.y - bsphere.radius,
			z: bsphere.center.z - bsphere.radius,
		},
		max: {
			x: bsphere.center.x + bsphere.radius,
			y: bsphere.center.y + bsphere.radius,
			z: bsphere.center.z + bsphere.radius,
		},
	}
}
/**
 * gen a baggy larger bound volume fast
 */
export function generateBSphereFromBBox(bbox: BBox): BSphere {
	return {
		center: {
			x: (bbox.min.x + bbox.max.x) / 2,
			y: (bbox.min.y + bbox.max.y) / 2,
			z: (bbox.min.z + bbox.max.z) / 2,
		},
		radius: Math.sqrt(
			(bbox.max.x - bbox.min.x) ** 2 +
				(bbox.max.y - bbox.min.y) ** 2 +
				(bbox.max.z - bbox.min.z) ** 2
		),
	}
}
