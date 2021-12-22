/* eslint-disable @typescript-eslint/ban-types */
/**
 * @note moved from @gs.i/utils-optimize
 */

import { MeshDataType, isRenderableMesh, Int, BBox, RenderableMesh } from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'
import { Frustum, Euler, Quaternion, Vector3, Matrix4, Box3 } from '@gs.i/utils-math'

// type only imports
// @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export
import type { BoundingProcessor } from '@gs.i/processor-bound'
import type { MatProcessor } from '@gs.i/processor-matrix'

const DEG2RAD = Math.PI / 180

const Culled = true
const NotCulled = false
type isCulled = boolean

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
	private _meshWorldMatrix = new Matrix4()

	/**
	 * 这个计数器配合 WeakMap 一起使用作为 **局部**唯一ID，可以避免多个 MatProcessor 实例存在时的撞表问题。
	 *
	 * 所有 id 都从 WeakMap 得到，一个 key 在一个实例中的 id 是唯一的
	 */
	private _counter = 0
	private _ids = new WeakMap<object, Int>()

	constructor(params: { boundingProcessor: BoundingProcessor; matrixProcessor: MatProcessor }) {
		super()
		this.boundingProcessor = params.boundingProcessor
		this.matrixProcessor = params.matrixProcessor
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

	updateFrustum(params: FrustumParams): void {
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
	 * @note this do not consider children
	 * @todo how to deal with non-leaf nodes
	 * @param mesh
	 * @returns true if culled (shouldn't render)
	 */
	frustumTest(mesh: RenderableMesh): isCulled {
		if (isRenderableMesh(mesh)) {
			// if user specified to skip culling, return not culled
			if (mesh.extensions?.EXT_mesh_advanced?.frustumCulling === false) {
				return NotCulled
			}

			const worldMatrix = this.matrixProcessor.getWorldMatrix(mesh)
			this._meshWorldMatrix.fromArray(worldMatrix)

			const bbox = this.boundingProcessor.getGeomBoundingBox(mesh.geometry)
			this._box.set(bbox.min as Vector3, bbox.max as Vector3) // safe here
			this._box.applyMatrix4(this._meshWorldMatrix)

			if (this._frustum.intersectsBox(this._box)) {
				return NotCulled
			} else {
				return Culled
			}
		} else {
			console.warn('this method only handle renderable meshes')
			return false
		}
	}
}

class SchemaNotValid extends TypeError {
	constructor(msg?: string) {
		super('GSI:SchemaNotValid: ' + (msg || ''))
	}
}
