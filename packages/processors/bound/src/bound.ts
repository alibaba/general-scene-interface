/* eslint-disable @typescript-eslint/ban-types */
import { MeshDataType, GeomDataType, Int, BBox, BSphere } from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'

import type { MatProcessor } from '@gs.i/processor-matrix'
import { traverseBFSBottomUp } from '@gs.i/utils-traverse'

import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'

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

	private _cacheGeomBBox = new WeakMap<GeomDataType, BBoxCache>()
	private _cacheGeomBSphere = new WeakMap<GeomDataType, BSphereCache>()
	private _cachedBounds = new WeakMap<GeomDataType, BoundsCache>()

	matrixProcessor?: MatProcessor

	override processNode(node: MeshDataType, parent?: MeshDataType) {
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

	getGeomBoundingBox(geom: GeomDataType): BBox {
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

	getGeomBoundingSphere(geom: GeomDataType): BSphere {
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
	 * get all bounding volumes
	 */
	getBounds(geom: GeomDataType): BoundsCache {
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
	 * @unfinished @TODO
	 */
	updateBVH(root: MeshDataType) {}
	/**
	 * get **cached** BVH bounds
	 * @unfinished @TODO
	 */
	getBVHBounds(node: MeshDataType) {}
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
