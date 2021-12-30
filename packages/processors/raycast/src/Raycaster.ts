/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	MeshDataType,
	RenderableMesh,
	AttributeDataType,
	isDISPOSED,
	TypedArray,
	BSphere,
	BBox,
	Vec3,
} from '@gs.i/schema-scene'
import { Ray, Box3, Sphere, Vector2, Vector3, Matrix4, Quaternion, Euler } from '@gs.i/utils-math'

export type RaycastInfo = {
	/**
	 * 射线是否击中物体
	 *
	 * @type {boolean}
	 */
	hit: boolean

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

const _tmpSphere = new Sphere()
const _tmpBox = new Box3()
const _rayTestVec3 = new Vector3()

export class Raycaster {
	/**
	 * Public properties
	 */
	ray: Ray
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

	constructor(
		origin: number[] = [0, 0, 0],
		direction: number[] = [0, 0, 0],
		near = 0,
		far = Infinity
	) {
		this.ray = new Ray()
		this.set(origin, direction)
		this.near = near
		this.far = far
	}

	set(origin: number[], direction: number[]): this {
		this.ray.origin = origin === undefined ? this.ray.origin : new Vector3().fromArray(origin)
		this.ray.direction =
			direction === undefined ? this.ray.direction : new Vector3().fromArray(direction)
		return this
	}

	copy(other: Raycaster): this {
		this.ray.set(other.ray.origin, other.ray.direction)
		this.near = other.near
		this.far = other.far
		return this
	}

	clone(): Raycaster {
		const raycaster = new Raycaster(this.ray.origin.toArray(), this.ray.direction.toArray())
		raycaster.near = this.near
		raycaster.far = this.far
		return raycaster
	}

	/**
	 * @note early stop algorithm 遇到第一个intersect triangle时即返回
	 *
	 * @param {boolean} [backfaceCulling=true] Set to false to check both front & back triangles
	 * @param {boolean} [allInters=false] By default the method will stop when first intersection is found, set allInters = true to get all intersections sorted from near to far
	 * @return {*}  {RaycastInfo}
	 * @memberof Raycaster
	 */
	intersectTriangleMesh(
		mesh: RenderableMesh,
		backfaceCulling = true,
		allInters = false
	): RaycastInfo {
		const result: RaycastInfo = {
			hit: false,
			intersections: [],
		}

		const geom = mesh.geometry
		const matrix = mesh.transform.worldMatrix

		if (!matrix) {
			logError('Mesh.Transform.worldMatrix is needed to perform a raycast test')
			return result
		}

		// Do not raycast on mesh without geometry data
		if (!geom || !isAttrExisting(geom.attributes.position)) {
			logError('Geometry.attributes.position does not exist or has been disposed')
			return result
		}

		if (geom.mode !== 'TRIANGLES') {
			logError('This method only supports `TRIANGLES` geometry mode')
			return result
		}

		// Transform the ray to object space
		this._modelMatrix.fromArray(matrix)
		this._modelMatrixInverse.fromArray(matrix).invert()
		this._inverseRay.copy(this.ray)
		this._inverseRay.applyMatrix4(this._modelMatrixInverse)

		// BBox/BSphere test
		if (
			geom.boundingSphere &&
			!Raycaster.rayIntersectsSphere(this._inverseRay, geom.boundingSphere)
		) {
			return result
		}
		if (geom.boundingBox && !Raycaster.rayIntersectsBox(this._inverseRay, geom.boundingBox)) {
			return result
		}

		const pos = geom.attributes.position.array as TypedArray

		if (geom.indices) {
			// Indexed geometry
			if (isDISPOSED(geom.indices.array)) {
				logError('Mesh.Geometry.indices data must be retained to perform a raycast test')
				return result
			}
			const indices = geom.indices.array

			for (let i = 0, l = indices.length; i < l; i += 3) {
				const i0 = indices[i + 0]
				const i1 = indices[i + 1]
				const i2 = indices[i + 2]

				this._v30.fromArray(pos, i0 * 3)
				this._v31.fromArray(pos, i1 * 3)
				this._v32.fromArray(pos, i2 * 3)

				const distance = Raycaster.rayIntersectsTriangle(
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

				const distance = Raycaster.rayIntersectsTriangle(
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
			result.intersections.sort(distanceSortFn)
		}

		return result
	}

	/**
	 * @FIX 2021-05-27: distance between cam & sprite is not compared correctly.
	 *
	 * @param {MeshDataType} mesh
	 * @param {{ x: number; y: number; z: number }} camPosition
	 * @param {{ x: number; y: number; z: number; order?: string }} camRotation
	 * @param {boolean} [isPerspective=true]
	 * @param {boolean} [allInters=false] By default the method will stop when first intersection is found, set allInters = true to get all intersections sorted from near to far
	 * @return {*}  {RaycastInfo}
	 * @memberof Raycaster
	 */
	intersectSpriteMesh(
		mesh: MeshDataType,
		camPosition: { x: number; y: number; z: number },
		camRotation: { x: number; y: number; z: number; order?: string },
		isPerspective = true,
		allInters = false
	): RaycastInfo {
		const result: RaycastInfo = {
			hit: false,
			intersections: [],
		}

		const geom = mesh.geometry
		const matrix = mesh.transform.worldMatrix
		const matr = mesh.material

		if (!matrix) {
			logError('Mesh.Transform.worldMatrix is needed to perform a raycast test')
			return result
		}

		// Mesh without geometry data
		if (!geom || !isAttrExisting(geom.attributes.position)) {
			logError('Geometry.attributes.position does not exist or has been disposed')
			return result
		}

		if (geom.mode !== 'SPRITE') {
			logError('This method only supports `SPRITE` geometry mode')
			return result
		}

		if (!matr || matr.type !== 'sprite') {
			logError('Mesh.material is not type `sprite`')
			return result
		}

		if (!geom.attributes.corner) {
			// logError('Sprite geometry is not completed, convert it before raycast. ')
			return result
		}

		// Transform the ray to object space
		this._modelMatrix.fromArray(matrix)
		this._modelMatrixInverse.fromArray(matrix).invert()
		this._inverseRay.copy(this.ray)
		this._inverseRay.applyMatrix4(this._modelMatrixInverse)

		// BBox/BSphere test
		if (
			geom.boundingSphere &&
			!Raycaster.rayIntersectsSphere(this._inverseRay, geom.boundingSphere)
		) {
			return result
		}
		if (geom.boundingBox && !Raycaster.rayIntersectsBox(this._inverseRay, geom.boundingBox)) {
			return result
		}

		// Prepare matrices
		this._camPosition.set(camPosition.x, camPosition.y, camPosition.z)
		this._camEuler.set(camRotation.x, camRotation.y, camRotation.z, camRotation.order ?? 'XYZ')
		this._camWorldMatrix.compose(
			this._camPosition,
			this._camQuaternion.setFromEuler(this._camEuler),
			this._camScale
		)
		this._viewMatrix.copy(this._camWorldMatrix).invert()
		this._modelViewMatrix.multiplyMatrices(this._viewMatrix, this._modelMatrix)
		this._modelViewMatrixInverse.copy(this._modelViewMatrix).invert()

		// Sprite properties
		const attenuation = (matr as MatrSpriteDataType).sizeAttenuation
		const uSize = (matr as MatrSpriteDataType).size
		this._center.set((matr as MatrSpriteDataType).center.x, (matr as MatrSpriteDataType).center.y)
		const rotation = (matr as MatrSpriteDataType).rotation
		const useAttrSize = (matr as MatrSpriteDataType).useAttrSize
		const cos = Math.cos(rotation)
		const sin = Math.sin(rotation)

		if (useAttrSize && geom.attributes.size === undefined) {
			console.error(
				'Raycaster::intersectSpriteMesh - Matr.useAttrSize is true but no size attribute found in geometry'
			)
			return result
		}

		// Intersection test
		const pos = geom.attributes.position.array as TypedArray
		const sizes = useAttrSize ? (geom.attributes.size.array as TypedArray) : undefined
		const count = geom.attributes.position.count

		// One sprite <-> 4 positions
		for (let i = 0, l = count; i < l; i += 4) {
			const i3 = i * 3
			const i2 = i * 2

			this._mvPos.set(pos[i3 + 0], pos[i3 + 1], pos[i3 + 2])

			// Distance culling
			const dist = this._mvPos.distanceTo(this._camPosition)
			if (dist < this.near || dist > this.far) {
				// Not in view frustum
				continue
			}

			// mvPosition
			this._mvPos.applyMatrix4(this._modelViewMatrix)

			// Size
			const sizeX = sizes ? sizes[i2 + 0] : uSize.x
			const sizeY = sizes ? sizes[i2 + 1] : uSize.y
			if (isPerspective && !attenuation) {
				this._scale.set(sizeX * -this._mvPos.z, sizeY * -this._mvPos.z)
			} else {
				this._scale.set(sizeX, sizeY)
			}

			// Quad corner positions in view space
			this._v30.set(-0.5, -0.5, 0.0)
			this._v31.set(0.5, -0.5, 0.0)
			this._v32.set(0.5, 0.5, 0.0)
			this._v33.set(-0.5, 0.5, 0.0)

			transformSpriteVertex(
				this._v30,
				this._mvPos,
				this._center,
				this._scale,
				sin,
				cos,
				this._modelViewMatrixInverse
			)
			transformSpriteVertex(
				this._v31,
				this._mvPos,
				this._center,
				this._scale,
				sin,
				cos,
				this._modelViewMatrixInverse
			)
			transformSpriteVertex(
				this._v32,
				this._mvPos,
				this._center,
				this._scale,
				sin,
				cos,
				this._modelViewMatrixInverse
			)

			const distance = Raycaster.rayIntersectsTriangle(
				this._inverseRay,
				this.near,
				this.far,
				this._v30,
				this._v31,
				this._v32,
				true,
				this._target
			)
			if (distance !== undefined) {
				// Hit first triangle
				result.hit = true
				result.intersections.push({
					pointLocal: this._target.clone(),
					point: this._target.clone().applyMatrix4(this._modelMatrix),
					distance: distance,
					index: i / 2 + 0,
					triangle: [this._v30.clone(), this._v31.clone(), this._v32.clone()],
				})
				if (!allInters) {
					return result
				}
			} else {
				transformSpriteVertex(
					this._v33,
					this._mvPos,
					this._center,
					this._scale,
					sin,
					cos,
					this._modelViewMatrixInverse
				)

				const distance = Raycaster.rayIntersectsTriangle(
					this._inverseRay,
					this.near,
					this.far,
					this._v30,
					this._v32,
					this._v33,
					true,
					this._target
				)
				if (distance !== undefined) {
					// Hit second triangle
					result.hit = true
					result.intersections.push({
						pointLocal: this._target.clone(),
						point: this._target.clone().applyMatrix4(this._modelMatrix),
						distance: distance,
						index: i / 2 + 1,
						triangle: [this._v30.clone(), this._v32.clone(), this._v33.clone()],
					})
					if (!allInters) {
						return result
					}
				}
			}
		}

		if (allInters) {
			// Sort by distance before return
			result.intersections.sort(distanceSortFn)
		}

		return result
	}

	/**
	 *
	 *
	 * @param {MeshDataType} mesh
	 * @param {number} threshold The maximum picking distance for this line mesh
	 * @param {boolean} [allInters=false] By default the method will stop when first intersection is found, set allInters = true to get all intersections sorted from near to far
	 * @return {*}  {RaycastInfo}
	 * @memberof Raycaster
	 */
	intersectLineMesh(mesh: MeshDataType, threshold: number, allInters = false): RaycastInfo {
		const result: RaycastInfo = {
			hit: false,
			intersections: [],
		}

		const geom = mesh.geometry
		const matrix = mesh.transform.worldMatrix

		if (!matrix) {
			logError('Mesh.Transform.worldMatrix is needed to perform a raycast test')
			return result
		}

		// Do not raycast on mesh without geometry data
		if (!geom || !isAttrExisting(geom.attributes.position)) {
			logError('Geometry.attributes.position does not exist or has been disposed')
			return result
		}

		if (geom.mode !== 'LINES') {
			logError('This method only supports `LINES` geometry mode')
			return result
		}

		// Transform the ray to object space
		this._modelMatrix.fromArray(matrix)
		this._modelMatrixInverse.fromArray(matrix).invert()

		this._inverseRay.copy(this.ray)
		this._inverseRay.applyMatrix4(this._modelMatrixInverse)

		// BBox/BSphere test
		if (geom.boundingSphere) {
			this._sphere.copy(geom.boundingSphere as Sphere)
			this._sphere.radius += threshold
			if (!this._inverseRay.intersectsSphere(this._sphere)) {
				return result
			}
		}

		if (geom.boundingBox) {
			this._box.copy(geom.boundingBox as Box3)
			this._box.expandByScalar(threshold)
			if (!this._inverseRay.intersectsBox(this._box)) {
				return result
			}
		}

		// Raycasting start
		const pos = geom.attributes.position.array as TypedArray
		const thresSq = threshold * threshold

		if (geom.indices) {
			// Indexed geometry
			if (isDISPOSED(geom.indices.array)) {
				logError('Mesh.Geometry.indices data must be retained to perform a raycast test')
				return result
			}
			const indices = geom.indices.array

			for (let i = 0, l = indices.length; i < l; i += 2) {
				const i0 = indices[i + 0]
				const i1 = indices[i + 1]

				this._v30.fromArray(pos, i0 * 3)
				this._v31.fromArray(pos, i1 * 3)

				const distSq = this._inverseRay.distanceSqToSegment(
					this._v30,
					this._v31,
					this._v32,
					this._target
				) // _v32: interRayPoint, _v33: interSegmentPoint

				if (distSq > thresSq) continue

				this._v32.applyMatrix4(this._modelMatrix)

				const distance = this._inverseRay.origin.distanceTo(this._v32)

				if (distance < this.near || distance > this.far) continue

				// Hit target and return
				result.hit = true
				result.intersections.push({
					pointLocal: this._target.clone(),
					point: this._target.clone().applyMatrix4(this._modelMatrix),
					distance,
					index: i / 2,
					triangle: undefined,
				})

				if (!allInters) {
					return result
				}
			}
		} else {
			// Non-indexed geometry
			for (let i = 0, l = pos.length; i < l; i += 6) {
				this._v30.fromArray(pos, i + 0)
				this._v31.fromArray(pos, i + 3)

				const distSq = this._inverseRay.distanceSqToSegment(
					this._v30,
					this._v31,
					this._v32,
					this._target
				) // _v32: interRayPoint, _v33: interSegmentPoint

				if (distSq > thresSq) continue

				this._v32.applyMatrix4(this._modelMatrix)

				const distance = this._inverseRay.origin.distanceTo(this._v32)

				if (distance < this.near || distance > this.far) continue

				// Hit target and return
				result.hit = true
				result.intersections.push({
					pointLocal: this._target.clone(),
					point: this._target.clone().applyMatrix4(this._modelMatrix),
					distance,
					index: i / 2,
					triangle: undefined,
				})

				if (!allInters) {
					return result
				}
			}
		}

		if (allInters) {
			result.intersections.sort(distanceSortFn)
		}

		return result
	}

	static rayIntersectsSphere(ray: Ray, sphere: BSphere, worldMatrix?: Matrix4): boolean {
		if (sphere.radius === Infinity) return true

		_tmpSphere.copy(sphere as Sphere)

		if (worldMatrix !== undefined) {
			_tmpSphere.applyMatrix4(worldMatrix)
		}

		return ray.intersectsSphere(_tmpSphere)
	}

	static rayIntersectsBox(ray: Ray, box: BBox, worldMatrix?: Matrix4): boolean {
		_tmpBox.copy(box as Box3)
		const size = _tmpBox.getSize(_rayTestVec3)

		if (size.x === Infinity || size.y === Infinity || size.z === Infinity) return true

		if (worldMatrix !== undefined) {
			_tmpBox.applyMatrix4(worldMatrix)
		}

		return ray.intersectsBox(_tmpBox)
	}

	static rayIntersectsTriangle(
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
}

function isAttrExisting(attr: AttributeDataType | undefined) {
	if (!attr) return false
	if (isDISPOSED(attr.array) || attr.count === 0) return false
	return true
}

function logError(msg: string) {
	console.error('GSI::Raycaster - ' + msg)
}

const _alignedPosition = new Vector2()
const _rotatedPosition = new Vector2()
function transformSpriteVertex(
	vertexPosition: Vector3,
	spriteMVPosition: Vector3,
	center: Vector2,
	scale: Vector2,
	sin: number,
	cos: number,
	modelViewMatrixInverse: Matrix4
) {
	// Compute position in camera space
	_alignedPosition
		.set(vertexPosition.x - center.x + 0.5, vertexPosition.y - center.y + 0.5)
		.multiply(scale)

	// Make rotation in view space
	_rotatedPosition.x = cos * _alignedPosition.x - sin * _alignedPosition.y
	_rotatedPosition.y = sin * _alignedPosition.x + cos * _alignedPosition.y

	// View space vertex position
	vertexPosition.set(
		spriteMVPosition.x + _rotatedPosition.x,
		spriteMVPosition.y + _rotatedPosition.y,
		spriteMVPosition.z
	)

	// Transform back to world space
	vertexPosition.applyMatrix4(modelViewMatrixInverse)
}

function distanceSortFn(a, b) {
	return a.distance - b.distance
}
