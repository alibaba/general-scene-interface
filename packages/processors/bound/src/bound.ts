/* eslint-disable @typescript-eslint/ban-types */
import { MeshDataType, GeomDataType, Int, BBox, BSphere } from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'

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

	override processNode(node: MeshDataType, parent?: MeshDataType) {
		// this.getWorldMatrixShallow(node, parent)
	}

	getID(o: object): Int {
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

		const cache = this._cacheGeomBBox.get(geom)
		if (!cache) {
			// 未缓存
			const bbox = computeBBox(geom)
			this._cacheGeomBBox.set(geom, { version: geom.attributes.position?.version ?? -1, bbox })
			return bbox
		} else {
			// 命中缓存
			if (cache.version !== (geom.attributes.position?.version ?? -1)) {
				// 更新缓存版本
				cache.bbox = computeBBox(geom)
				cache.version = geom.attributes.position?.version ?? -1
			}
			return cache.bbox
		}
	}

	/**
	 * @unfinished @TODO
	 * @param geom
	 */
	getGeomBoundingSphere(geom: GeomDataType): BSphere {
		const cache = this._cacheGeomBSphere.get(geom)
		if (!cache) {
			// 未缓存
			const bsphere = computeBSphere(geom)
			this._cacheGeomBSphere.set(geom, {
				version: geom.attributes.position?.version ?? -1,
				bsphere,
			})
			return bsphere
		} else {
			// 命中缓存
			if (cache.version !== (geom.attributes.position?.version ?? -1)) {
				// 更新缓存版本
				cache.bsphere = computeBSphere(geom)
				cache.version = geom.attributes.position?.version ?? -1
			}
			return cache.bsphere
		}
	}

	/**
	 * @unfinished @TODO
	 * @param node
	 * @param force
	 */
	generateBVH(node: MeshDataType, force = false) {}
}

class SchemaNotValid extends TypeError {
	constructor(msg?: string) {
		super('GSI:SchemaNotValid: ' + (msg || ''))
	}
}
