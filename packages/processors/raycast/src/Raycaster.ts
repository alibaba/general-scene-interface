/* eslint-disable @typescript-eslint/ban-types */
/**
 * @note moved from @gs.i/utils-optimize
 */

import {
	Vec3,
	isRenderableMesh,
	BBox,
	RenderableMesh,
	BSphere,
	isDISPOSED,
	TypedArray,
} from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'
import { Ray, Euler, Quaternion, Vector3, Matrix4, Box3, Sphere, Vector2 } from '@gs.i/utils-math'

// type only imports
import type { BoundingProcessor } from '@gs.i/processor-bound'
import type { MatProcessor } from '@gs.i/processor-matrix'

export type RaycastInfo = {
	/**
	 * 射线是否击中物体
	 *
	 * @type {boolean}
	 */
	hit: boolean

	/**
	 * whether this object is hittable
	 *
	 * if this mesh's vertices can be modified in a shader, this mesh will be not hittable
	 */
	hittable?: boolean

	/**
	 * 碰撞信息集合
	 */
	intersections: Array<{
		/**
		 * 射线碰撞点世界坐标
		 *
		 * @type {(Vec3 | undefined)}
		 */
		point: Vec3 | undefined

		/**
		 * 射线碰撞点本地坐标
		 *
		 * @type {(Vec3 | undefined)}
		 */
		pointLocal: Vec3 | undefined

		/**
		 * 射线碰撞点的距离
		 *
		 * @type {(number | undefined)}
		 */
		distance: number | undefined

		/**
		 * 射线碰撞到的三角面/线段的索引
		 *
		 * @type {(number | undefined)}
		 */
		index: number | undefined

		/**
		 * 射线所碰撞到的三角面/线段顶点
		 *
		 * @type {(Vec3[] | undefined)}
		 */
		triangle: Vec3[] | undefined
	}>
}

/**
 * Raycaster
 * @note PURE FUNCTIONS, will not modify your input
 * @note NOT CACHED
 */
export class Raycaster extends Processor {
	traverseType = TraverseType.None // do not traverse
	type = 'Raycast'
	canEditNode = false
	canEditTree = false

	boundingProcessor: BoundingProcessor
	matrixProcessor: MatProcessor

	ray = new Ray()
	near = 0
	far = Infinity

	/**
	 * Private & temp properties
	 */
	private _inverseRay = new Ray()
	private _box = new Box3()
	private _sphere = new Sphere()
	private _mat4 = new Matrix4()
	private _viewMatrix = new Matrix4()
	private _modelMatrix = new Matrix4()
	private _modelMatrixInverse = new Matrix4()
	private _v30 = new Vector3()
	private _v31 = new Vector3()
	private _v32 = new Vector3()
	private _v33 = new Vector3()
	private _center = new Vector2()
	private _scale = new Vector2()
	private _target = new Vector3()
	private _mvPos = new Vector3()
	private _camPosition = new Vector3()
	private _camWorldMatrix = new Matrix4()
	private _camQuaternion = new Quaternion()
	private _camEuler = new Euler()
	private _camScale = new Vector3(1.0, 1.0, 1.0)
	private _modelViewMatrix = new Matrix4()
	private _modelViewMatrixInverse = new Matrix4()

	constructor(params: { boundingProcessor: BoundingProcessor; matrixProcessor: MatProcessor }) {
		super()
		this.boundingProcessor = params.boundingProcessor
		this.matrixProcessor = params.matrixProcessor
	}

	set(origin: Vec3, direction: Vec3, near = 0, far = Infinity): Raycaster {
		this.ray.origin.copy(origin as Vector3)
		this.ray.direction.copy(direction as Vector3)
		this.near = near
		this.far = far
		return this
	}

	/**
	 * @param {boolean} [backfaceCulling=true] Set to false to check both front & back triangles
	 * @param {boolean} [allInters=false] By default the method will stop when first intersection is found, set allInters = true to get all intersections sorted from near to far
	 * @note update this mesh's matrix before calling this
	 */
	raycast(mesh: RenderableMesh, allInters = false): RaycastInfo {
		if (
			!isRenderableMesh(mesh) ||
			mesh.material.extensions?.EXT_matr_programmable?.vertexModified
		) {
			return { hit: false, hittable: false, intersections: [] }
		}

		if (mesh.geometry.mode === 'TRIANGLES') {
			return this.intersectTriangleMesh(mesh, allInters)
			// } else if (mesh.geometry.mode === 'LINES') {
			// 	return this.intersectLineMesh(mesh, allInters)
			// } else if (mesh.geometry.mode === 'POINTS') {
			// 	return this.intersectPointMesh(mesh, allInters)
		} else {
			throw new Error('Unknown geometry mode: ' + mesh.geometry.mode)
		}
	}

	/**
	 * @note world matrix of this mesh should be updated before
	 * @note early stop algorithm 遇到第一个intersect triangle时即返回
	 *
	 * @param {boolean} [allInters=false] By default the method will stop when first intersection is found, set allInters = true to get all intersections sorted from near to far
	 */
	private intersectTriangleMesh(mesh: RenderableMesh, allInters = false): RaycastInfo {
		const result: RaycastInfo = {
			hit: false,
			intersections: [],
		}

		const matrix = this.matrixProcessor.getCachedWorldMatrix(mesh)
		if (!matrix) throw new SchemaNotValid('world matrix is needed to perform a raycast')

		const geom = mesh.geometry

		const bounds = this.boundingProcessor.getBounds(geom)

		// Transform the ray to object space
		this._modelMatrix.fromArray(matrix)
		this._modelMatrixInverse.fromArray(matrix).invert()
		this._inverseRay.copy(this.ray)
		this._inverseRay.applyMatrix4(this._modelMatrixInverse)

		// BBox/BSphere test
		if (!rayIntersectsSphere(this._inverseRay, bounds.bsphere)) return result
		if (!rayIntersectsBox(this._inverseRay, bounds.bbox)) return result

		// auto decide face culling
		const backfaceCulling = mesh.material.side !== 'front'

		const pos = geom.attributes.position?.array as TypedArray

		if (!pos || pos.length === 0)
			throw new SchemaNotValid('Geometry.attributes.position is necessary for raycasting')

		if (isDISPOSED(pos))
			throw new SchemaNotValid('Geometry.attributes.position is disposed before raycasting')

		if (geom.indices) {
			// Indexed geometry
			if (isDISPOSED(geom.indices.array))
				throw new SchemaNotValid('Geometry.indices is disposed before raycasting')

			const indices = geom.indices.array

			for (let i = 0, l = indices.length; i < l; i += 3) {
				const i0 = indices[i + 0]
				const i1 = indices[i + 1]
				const i2 = indices[i + 2]

				this._v30.fromArray(pos, i0 * 3)
				this._v31.fromArray(pos, i1 * 3)
				this._v32.fromArray(pos, i2 * 3)

				const distance = rayIntersectsTriangle(
					this._inverseRay,
					this.near,
					this.far,
					this._v30,
					this._v31,
					this._v32,
					backfaceCulling,
					this._target
				)
				if (distance !== undefined) {
					result.hit = true
					result.intersections.push({
						pointLocal: this._target.clone(),
						point: this._target.clone().applyMatrix4(this._modelMatrix),
						distance,
						index: i / 3,
						triangle: [this._v30.clone(), this._v31.clone(), this._v32.clone()],
					})
					if (!allInters) {
						return result
					}
				}
			}
		} else {
			// Non-indexed geometry
			for (let i = 0, l = pos.length; i < l; i += 9) {
				this._v30.fromArray(pos, i + 0)
				this._v31.fromArray(pos, i + 3)
				this._v32.fromArray(pos, i + 6)

				const distance = rayIntersectsTriangle(
					this._inverseRay,
					this.near,
					this.far,
					this._v30,
					this._v31,
					this._v32,
					backfaceCulling,
					this._target
				)
				if (distance !== undefined) {
					result.intersections.push({
						pointLocal: this._target.clone(),
						point: this._target.clone().applyMatrix4(this._modelMatrix),
						distance,
						index: i / 3,
						triangle: [this._v30.clone(), this._v31.clone(), this._v32.clone()],
					})
					if (!allInters) {
						return result
					}
				}
			}
		}

		if (allInters) {
			// Sort by distance before return
			result.intersections.sort(ascSort)
		}

		return result
	}

	/**
	 * @param {number} threshold The maximum picking distance for this line mesh
	 * @param {boolean} [allInters=false] By default the method will stop when first intersection is found, set allInters = true to get all intersections sorted from near to far
	 */
	private intersectLineMesh(mesh: RenderableMesh, allInters = false): RaycastInfo {
		throw 'NOT IMPLEMENTED'
	}
	/**
	 * @param {number} threshold The maximum picking distance for this line mesh
	 * @param {boolean} [allInters=false] By default the method will stop when first intersection is found, set allInters = true to get all intersections sorted from near to far
	 */
	private intersectPointMesh(mesh: RenderableMesh, allInters = false): RaycastInfo {
		throw 'NOT IMPLEMENTED'
	}
}

const _tmpSphere = new Sphere()
const _tmpBox = new Box3()
const _rayTestVec3 = new Vector3()

function rayIntersectsSphere(ray: Ray, sphere: BSphere, worldMatrix?: Matrix4): boolean {
	if (sphere.radius === Infinity) return true

	_tmpSphere.copy(sphere as Sphere)

	if (worldMatrix !== undefined) {
		_tmpSphere.applyMatrix4(worldMatrix)
	}

	return ray.intersectsSphere(_tmpSphere)
}

function rayIntersectsBox(ray: Ray, box: BBox, worldMatrix?: Matrix4): boolean {
	_tmpBox.copy(box as Box3)
	const size = _tmpBox.getSize(_rayTestVec3)

	if (size.x === Infinity || size.y === Infinity || size.z === Infinity) return true

	if (worldMatrix !== undefined) {
		_tmpBox.applyMatrix4(worldMatrix)
	}

	return ray.intersectsBox(_tmpBox)
}

function rayIntersectsTriangle(
	ray: Ray,
	near: number,
	far: number,
	a: Vector3,
	b: Vector3,
	c: Vector3,
	backfaceCulling: boolean,
	target: Vector3
): number | undefined {
	if (ray.intersectTriangle(a, b, c, backfaceCulling, target)) {
		const distance = ray.origin.distanceTo(target)
		if (distance > near && distance < far) {
			return distance
		}
	}
	return
}

function ascSort(a, b) {
	return a.distance - b.distance
}

//

class SchemaNotValid extends TypeError {
	constructor(msg?: string) {
		super('GSI:Raycaster: ' + (msg || ''))
	}
}
