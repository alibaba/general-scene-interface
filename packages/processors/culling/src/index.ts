/* eslint-disable @typescript-eslint/ban-types */
/**
 * @note moved from @gs.i/utils-optimize
 */

import { MeshDataType, isRenderableMesh, Int, BBox, RenderableMesh } from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'
import { Frustum, Euler, Quaternion, Vector3, Matrix4, Box3, Sphere } from '@gs.i/utils-math'

// type only imports
// @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export
import type { BoundingProcessor } from '@gs.i/processor-bound'
import type { MatProcessor } from '@gs.i/processor-matrix'

const DEG2RAD = Math.PI / 180

const Culled = true
const NotCulled = false

export type FrustumParams = {
	cameraPosition: { x: number; y: number; z: number }
	cameraRotation: { x: number; y: number; z: number; order?: string }
	cameraNear: number
	cameraFar: number
	cameraFOV: number
	cameraAspect: number
	viewOffset?: {
		width: number
		height: number
		offsetX: number
		offsetY: number
		fullWidth: number
		fullHeight: number
	}
}

// TODO add ref to geometry, in case use change the whole geometry
interface CullingCache {
	frustumVersion: Int
	boundsVersion?: Int
	culling: boolean
}

/**
 * @note PURE FUNCTIONS, will not modify your input
 * @note NOT CACHED
 */
export class CullingProcessor extends Processor {
	traverseType = TraverseType.None
	type = 'Culling'
	canEditNode = false
	canEditTree = false

	boundingProcessor: BoundingProcessor
	matrixProcessor: MatProcessor

	/**
	 * Frustum instance
	 */
	private _frustum = new Frustum()

	/**
	 * used for caching
	 */
	private _frustumVersion = 0

	/**
	 * cache
	 */
	private _frustumCache = new WeakMap<RenderableMesh, CullingCache>()

	/**
	 * Helper vars
	 */
	private _viewMat = new Matrix4()
	private _projMat = new Matrix4()
	private _camPosition = new Vector3()
	private _camWorldMatrix = new Matrix4()
	private _camQuaternion = new Quaternion()
	private _camEuler = new Euler()
	private _camScale = new Vector3(1.0, 1.0, 1.0)
	private _box = new Box3()
	private _sphere = new Sphere()
	private _meshWorldMatrix = new Matrix4()

	constructor(params: { boundingProcessor: BoundingProcessor; matrixProcessor: MatProcessor }) {
		super()
		this.boundingProcessor = params.boundingProcessor
		this.matrixProcessor = params.matrixProcessor
	}

	updateFrustum(params: FrustumParams): void {
		this._frustumVersion++

		this._camPosition.set(params.cameraPosition.x, params.cameraPosition.y, params.cameraPosition.z)
		this._camEuler.set(
			params.cameraRotation.x,
			params.cameraRotation.y,
			params.cameraRotation.z,
			params.cameraRotation.order ?? 'XYZ'
		)
		this._camWorldMatrix.compose(
			this._camPosition,
			this._camQuaternion.setFromEuler(this._camEuler),
			this._camScale
		)
		this._viewMat.copy(this._camWorldMatrix).invert()

		const near = params.cameraNear
		let top = near * Math.tan(DEG2RAD * 0.5 * params.cameraFOV)
		let height = 2 * top
		let width = params.cameraAspect * height
		let left = -0.5 * width
		if (params.viewOffset) {
			const view = params.viewOffset
			left += (view.offsetX * width) / view.fullWidth
			top -= (view.offsetY * height) / view.fullHeight
			width *= view.width / view.fullWidth
			height *= view.height / view.fullHeight
		}

		this._projMat.makePerspective(left, left + width, top, top - height, near, params.cameraFar)
		this._frustum.setFromProjectionMatrix(this._projMat.multiply(this._viewMat))
	}

	/**
	 * check if a mesh is culled by the frustum
	 * @note this only handle renderable nodes with geometry
	 * @note this do not check children
	 * @note Sprite should also be able to cull
	 * @todo how to deal with non-leaf nodes
	 * @returns true if Culled (not visible, shouldn't render)
	 */
	isFrustumCulled(mesh: RenderableMesh, worldMatrix?: number[]): boolean {
		if (!isRenderableMesh(mesh)) {
			console.warn('this method only handle visible renderable meshes')
			return NotCulled
		}

		// if user specified to skip culling, return not culled
		if (mesh.extensions?.EXT_mesh_advanced?.frustumCulling === false) {
			return NotCulled
		}

		// check cache
		let init = false
		let cache = this._frustumCache.get(mesh)
		if (!cache) {
			cache = {} as CullingCache
			this._frustumCache.set(mesh, cache)
			init = true
		}

		// const posVersion = mesh.geometry.attributes.position?.version

		const { bbox, bsphere, version } = this.boundingProcessor.getBounds(mesh.geometry)

		if (init || cache.boundsVersion !== version || cache.frustumVersion !== this._frustumVersion) {
			// needs update

			// if no matrix input, get the latest matrix with dirty-checking
			if (!worldMatrix) worldMatrix = this.matrixProcessor.getWorldMatrix(mesh)

			this._meshWorldMatrix.fromArray(worldMatrix)

			this._box.set(bbox.min as Vector3, bbox.max as Vector3) // safe here
			this._box.applyMatrix4(this._meshWorldMatrix)

			this._sphere.set(bsphere.center as Vector3, bsphere.radius) // safe here
			this._sphere.applyMatrix4(this._meshWorldMatrix)

			const result =
				this._frustum.intersectsSphere(this._sphere) && this._frustum.intersectsBox(this._box)
					? NotCulled
					: Culled

			cache.culling = result
			cache.boundsVersion = version
			cache.frustumVersion = this._frustumVersion
		}

		return cache.culling
	}
}

class SchemaNotValid extends TypeError {
	constructor(msg?: string) {
		super('GSI:SchemaNotValid: ' + (msg || ''))
	}
}
