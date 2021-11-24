/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { OptimizePass } from './OptimizePass'
import { Box3, Euler, Matrix4, Sphere, Vector3, Quaternion, Frustum } from '@gs.i/utils-math'
import {
	MeshDataType,
	__GSI_MESH_INTERNAL_PROP_KEY_0__,
	__GSI_MESH_INTERNAL_PROP_0__,
	__defaultMeshInternalProp,
} from '@gs.i/schema'
import { computeBBox, computeBSphere } from '@gs.i/utils-geometry'
import { transformEquals } from '@gs.i/utils-transform'

const DEG2RAD = Math.PI / 180

export interface GSIRefinerConfig {
	frustumCulling: boolean
	updateWorldMatrix: boolean
	// glsl300to100: boolean
}

export const DefaultConfig: GSIRefinerConfig = {
	frustumCulling: true,
	updateWorldMatrix: true,
	// glsl300to100: true,
}

export type UpdateParams = {
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

type UpdateInfo = {
	mesh: MeshDataType
	observ: ObservableMesh
	options: { [key: string]: any }
}

type UpdateOpts = {
	worldMatrixNeedsUpdate: boolean
}

/**
 * 检查gsi-scene中的参数是否需要更新或补全
 */
export class GSIRefiner implements OptimizePass {
	get type() {
		return 'OptimizePass-Refiner'
	}

	config: Partial<GSIRefinerConfig>

	info = { culledCount: 0 }

	/**
	 * Task queue
	 */
	private _queue: UpdateInfo[] = []

	/**
	 * Params cache, update upon each call
	 */
	private _updateParams: UpdateParams

	/**
	 * Cache map for storing scene observables
	 */
	private _observSceneMap: WeakMap<MeshDataType, ObservableMesh> = new WeakMap()

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
	// private infinityBox = new Box3().set(
	// 	new Vector3(-Infinity, -Infinity, -Infinity),
	// 	new Vector3(+Infinity, +Infinity, +Infinity)
	// )
	// private infinitySphere = new Sphere(new Vector3(0, 0, 0), Infinity)

	constructor(config: Partial<GSIRefinerConfig> = {}) {
		const _config = {
			...DefaultConfig,
			...config,
		}
		this.config = _config
	}

	/**
	 * 检查并补全和更新需要更新的数据
	 * @param group
	 */
	update(group: MeshDataType, params: UpdateParams) {
		// this.timer = 0

		this._updateParams = params

		// Frustum set
		this.updateFrustum()

		// optimize recurrsive options object
		const options: UpdateOpts = {
			worldMatrixNeedsUpdate: false,
		}

		if (!this._observSceneMap.has(group)) {
			// Make an observable mesh of scene tree
			this._observSceneMap.set(group, new ObservableMesh(group))
		}

		this.updateMeshNonRecurr(group, options)
	}

	private updateMeshNonRecurr(mesh: MeshDataType, options: UpdateOpts) {
		// const queue: UpdateInfo[] = []
		this._queue.length = 0

		const initial: UpdateInfo = {
			mesh: mesh,
			observ: this._observSceneMap.get(mesh) as ObservableMesh,
			options: options,
		}
		this._queue.push(initial)

		while (this._queue.length > 0) {
			const info = this._queue.pop()
			if (info === undefined) {
				continue
			}
			const mesh = info.mesh
			const observ = info.observ
			const opt = info.options

			//  Data completion
			this.completeMeshProps(mesh)

			// Check for any states to be updated by refiner
			this.checkMeshStatesChange(mesh, observ, opt)

			// Update worldMatrix
			if (opt.worldMatrixNeedsUpdate) {
				this.updateWorldMatrix(mesh, observ)
			}

			// Check & update boundingInfo
			if (this.config.frustumCulling) {
				if ((mesh.geometry && !observ.geomBBoxEquals(mesh)) || !observ.geomBSphereEquals(mesh)) {
					observ.updateBoundingInfos(mesh)
				}
			}

			this.frustumTest(mesh, observ)

			/**
			 * Children node checks
			 */
			// Handle added child mesh
			mesh.children.forEach((child) => {
				/** @Quanxin 优化这一步的耗时，From: ~10ms per frame -> ~0.5 ms per frame */
				const isJustAdded = observ.children.has(child)
				if (!isJustAdded) {
					// child was added just now in last frame
					observ.children.set(child, new ObservableMesh(child))
				}
			})

			/**
			 * Traverse children and do check, update
			 */
			mesh.children.forEach((child) => {
				this._queue.push({
					mesh: child,
					observ: observ.children.get(child) as ObservableMesh,
					options: Object.assign({}, opt),
				})
			})
		}
	}

	// private updateMeshRecurr(mesh: MeshDataType, observ: ObservableMesh, opt: UpdateOpts) {
	// 	/**
	// 	 * Data completion
	// 	 */
	// 	this.completeMeshProps(mesh)

	// 	this.checkMeshStates(mesh, observ, opt)

	// 	/**
	// 	 * Update
	// 	 */
	// 	if (opt.worldMatrixNeedsUpdate) {
	// 		this.updateWorldMatrix(mesh, observ)
	// 	}

	// 	this.frustumTest(mesh, observ)

	// 	/**
	// 	 * Child node checks
	// 	 */

	// 	// Handle added child mesh
	// 	mesh.children.forEach((child) => {
	// 		/**
	// 		 * @Quanxin 优化这一步的耗时，From ~10ms per frame -> ~0.5 ms per frame
	// 		 */
	// 		const isJustAdded = !observ.children.has(child)
	// 		if (isJustAdded) {
	// 			// child was added just now in last frame
	// 			observ.children.set(child, new ObservableMesh(child))
	// 		}
	// 	})

	// 	/**
	// 	 * Traverse children and do check, update
	// 	 */
	// 	mesh.children.forEach((child) => {
	// 		// Opt for each child recurrsive should be independent
	// 		this.updateMeshRecurr(
	// 			child,
	// 			observ.children.get(child) as ObservableMesh,
	// 			Object.assign({}, opt)
	// 		)
	// 	})
	// }

	private updateFrustum() {
		this.info.culledCount = 0
		if (this.config.frustumCulling) {
			const params = this._updateParams
			this._camPosition.set(
				params.cameraPosition.x,
				params.cameraPosition.y,
				params.cameraPosition.z
			)
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

			this._projMat.makePerspective(
				left,
				left + width,
				top,
				top - height,
				near,
				this._updateParams.cameraFar
			)
			this._frustum.setFromProjectionMatrix(this._projMat.multiply(this._viewMat))
		}
	}

	/**
	 * 补全mesh的一些必要信息
	 *
	 * @private
	 * @param {MeshDataType} mesh
	 * @memberof GsiRefiner
	 */
	private completeMeshProps(mesh: MeshDataType) {
		const geom = mesh.geometry

		// BBox
		if (geom && !geom.boundingBox) {
			geom.boundingBox = computeBBox(geom)
		}
		// BSphere
		if (geom && !geom.boundingSphere) {
			geom.boundingSphere = computeBSphere(geom)
		}

		// Internal props
		if (!mesh[__GSI_MESH_INTERNAL_PROP_KEY_0__]) {
			mesh[__GSI_MESH_INTERNAL_PROP_KEY_0__] = __defaultMeshInternalProp()
		}

		// Conversion of GLSL300 to GLSL100
		// if (this.config.glsl300to100 && mesh.material && mesh.material.type === 'programmable') {
		// 	const matr = mesh.material as PrgMatrDataType

		// 	const attributes = matr.attributes
		// 	const varyings = matr.varyings
		// 	if (attributes) {
		// 		matr.attributes = attributes
		// 			.split('\n')
		// 			.map((str) => {
		// 				if (str.trim() !== '') {
		// 					str.replace(/attribute /g, '')
		// 					return 'attribute ' + str
		// 				}
		// 			})
		// 			.join('\n')
		// 	}
		// 	if (varyings) {
		// 		matr.varyings = varyings
		// 			.split('\n')
		// 			.map((str) => {
		// 				if (str.trim() !== '') {
		// 					str.replace(/varying /g, '')
		// 					return 'varying ' + str
		// 				}
		// 			})
		// 			.join('\n')
		// 	}
		// }
	}

	/**
	 * 检查mesh的各项信息对比上一次是否已变更，变更flag写入到opt对象中
	 *
	 * @private
	 * @param {MeshDataType} mesh
	 * @param {ObservableMesh} observ
	 * @param {{ [key: string]: any }} opt
	 * @memberof GsiRefiner
	 */
	private checkMeshStatesChange(
		mesh: MeshDataType,
		observ: ObservableMesh,
		opt: { [key: string]: any }
	) {
		/**
		 * Check
		 * @TODO More check rules
		 */
		// If transform has changed since last check
		if (this.config.updateWorldMatrix && !observ.transformEquals(mesh)) {
			// Set update flat to true, recalc worldMatrix recurrsively
			opt.worldMatrixNeedsUpdate = true
		}
	}

	private updateWorldMatrix(mesh: MeshDataType, observ: ObservableMesh | undefined) {
		updateMeshTransform(mesh)

		// Update observable
		if (observ) {
			if (!observ.transform.worldMatrix) {
				observ.transform.worldMatrix = []
			}
			// Assign new value - matrix
			const m = mesh.transform.matrix
			const w = mesh.transform.worldMatrix ?? []
			const mt = mesh.transform
			for (let i = 0; i < 16; i++) {
				observ.transform.matrix[i] = m[i]
				observ.transform.worldMatrix[i] = w[i]
			}

			if (mt.position) {
				observ.transform.position.x = mt.position.x
				observ.transform.position.y = mt.position.y
				observ.transform.position.z = mt.position.z
			}

			if (mt.rotation) {
				observ.transform.rotation.x = mt.rotation.x
				observ.transform.rotation.y = mt.rotation.y
				observ.transform.rotation.z = mt.rotation.z
				observ.transform.rotation.order = mt.rotation.order
			}

			if (mt.scale) {
				observ.transform.scale.x = mt.scale.x
				observ.transform.scale.y = mt.scale.y
				observ.transform.scale.z = mt.scale.z
			}

			// Update bbox/bsphere
			if (this.config.frustumCulling && mesh.geometry) {
				observ.updateBoundingInfos(mesh)
			}
		}
	}

	private frustumTest(mesh: MeshDataType, observ: ObservableMesh) {
		const internal = mesh[__GSI_MESH_INTERNAL_PROP_KEY_0__] as __GSI_MESH_INTERNAL_PROP_0__

		if (this.config.frustumCulling && mesh.visible && mesh.geometry && mesh.material) {
			// Disable frustum test for sprite geoms
			if (mesh.geometry.mode === 'SPRITE') return

			if (observ.meshBSphere) {
				internal._frustumCulled = !this._frustum.intersectsSphere(observ.meshBSphere)
			}
			if (!internal._frustumCulled) {
				internal._frustumCulled = !this._frustum.intersectsBox(observ.meshBBox)
			}
			if (internal._frustumCulled) {
				this.info.culledCount++
			}
		}

		if (!this.config.frustumCulling && internal._frustumCulled === true) {
			internal._frustumCulled = false
			return
		}
	}
}

/**
 * 生成mesh的observable对象，保存所需的变量状态，用于下一次update时进行脏对比
 * children采用WeakMap形式缓存，确保mesh和observable之间的对应关系的同时，不用去关心removed obj等销毁问题
 * 在生成observable之前会先对mesh的transform进行更新以保证第一次获得各项数据的是正确的结果
 * @class ObservableMesh
 */
class ObservableMesh {
	/**
	 * Mesh transform observable
	 */
	transform: {
		position: Vector3
		rotation: Euler
		scale: Vector3
		matrix: number[]
		worldMatrix: number[]
	}

	/**
	 * Geom bbox observable
	 */
	geomBBox = new Box3()

	/**
	 * Geom bsphere observable
	 */
	geomBSphere = new Sphere()

	/**
	 * Mesh bbox observable
	 */
	meshBBox = new Box3()

	/**
	 * Mesh bsphere observable
	 */
	meshBSphere = new Sphere()

	/**
	 * Mesh children observable
	 */
	children: WeakMap<MeshDataType, ObservableMesh>

	/**
	 * Local vars
	 */
	private _Mat4 = new Matrix4()
	private _emptyVec3 = new Vector3()
	private _emptyEuler = new Euler()

	constructor(src?: MeshDataType) {
		if (src) {
			// Update worldMatrix first and clone the correct matrices to observable
			updateMeshTransform(src)

			this.transform = {
				position: new Vector3().copy((src.transform.position ?? this._emptyVec3) as Vector3),
				rotation: new Euler().copy((src.transform.rotation ?? this._emptyEuler) as Euler),
				scale: new Vector3().copy((src.transform.scale ?? this._emptyVec3) as Vector3),
				matrix: Array.from(src.transform.matrix),
				worldMatrix: Array.from(src.transform.worldMatrix || []),
			}

			// Compute & clone bbox/bsphere
			this.updateBoundingInfos(src)

			this.children = new WeakMap<MeshDataType, ObservableMesh>()

			src.children.forEach((child) => {
				// Patch for wrong child.parent pointer
				if (!child.parent || child.parent !== src) {
					child.parent = src
				}
				this.children.set(child, new ObservableMesh(child))
			})
		}
	}

	updateBoundingInfos(mesh: MeshDataType) {
		if (mesh.geometry) {
			const geom = mesh.geometry
			// World matrix
			this._Mat4.fromArray(this.transform.worldMatrix)
			// BBox
			if (!geom.boundingBox) {
				geom.boundingBox = computeBBox(geom)
				this.geomBBox.min.copy(geom.boundingBox.min as Vector3)
				this.geomBBox.max.copy(geom.boundingBox.max as Vector3)
			}
			// BSphere
			if (!geom.boundingSphere) {
				geom.boundingSphere = computeBSphere(geom)
				this.geomBSphere.center.copy(geom.boundingSphere.center as Vector3)
				this.geomBSphere.radius = geom.boundingSphere.radius
			}
			if (geom.boundingSphere) {
				this.geomBSphere.copy(geom.boundingSphere as Sphere)
				this.meshBSphere.copy(geom.boundingSphere as Sphere).applyMatrix4(this._Mat4)
			}
			if (geom.boundingBox) {
				this.geomBBox.copy(geom.boundingBox as Box3)
				this.meshBBox.copy(geom.boundingBox as Box3).applyMatrix4(this._Mat4)
			}
		}
	}

	/**
	 * Returns if the mesh transform is equal to this observable's.
	 *
	 * @param {MeshDataType} mesh
	 * @return {*}
	 * @memberof ObservableMesh
	 */
	transformEquals(mesh: MeshDataType): boolean {
		return transformEquals(this.transform, mesh.transform)
	}

	/**
	 * Returns if the mesh's geometry bbox is equal to this observable's.
	 *
	 * @param {MeshDataType} mesh
	 * @return {*}
	 * @memberof ObservableMesh
	 */
	geomBBoxEquals(mesh: MeshDataType): boolean {
		if (mesh.geometry && mesh.geometry.boundingBox) {
			const geom = mesh.geometry
			if (geom.boundingBox) {
				return (
					geom.boundingBox.min.x === this.geomBBox.min.x &&
					geom.boundingBox.min.y === this.geomBBox.min.y &&
					geom.boundingBox.min.z === this.geomBBox.min.z &&
					geom.boundingBox.max.x === this.geomBBox.max.x &&
					geom.boundingBox.max.y === this.geomBBox.max.y &&
					geom.boundingBox.max.z === this.geomBBox.max.z
				)
			}
		}
		return false
	}

	/**
	 * Returns if the mesh's geometry bsphere is equal to this observable's.
	 *
	 * @param {MeshDataType} mesh
	 * @return {*}
	 * @memberof ObservableMesh
	 */
	geomBSphereEquals(mesh: MeshDataType): boolean {
		if (mesh.geometry && mesh.geometry.boundingSphere) {
			const geom = mesh.geometry
			if (geom.boundingSphere) {
				return (
					geom.boundingSphere.center.x === this.geomBSphere.center.x &&
					geom.boundingSphere.center.y === this.geomBSphere.center.y &&
					geom.boundingSphere.center.z === this.geomBSphere.center.z &&
					geom.boundingSphere.radius === this.geomBSphere.radius
				)
			}
		}
		return false
	}
}

function updateMeshTransform(mesh: MeshDataType) {
	if (!mesh[__GSI_MESH_INTERNAL_PROP_KEY_0__]) {
		mesh[__GSI_MESH_INTERNAL_PROP_KEY_0__] = __defaultMeshInternalProp()
	}

	const internal = mesh[__GSI_MESH_INTERNAL_PROP_KEY_0__] as __GSI_MESH_INTERNAL_PROP_0__

	if (!internal._selfMat) {
		internal._selfMat = new Matrix4()
		internal._parentMat = new Matrix4()
		internal._worldMat = new Matrix4()
	}

	// Assume parent's worldMatrix is update to date,
	// since the process starts from the root
	const tf = mesh.transform
	if (!tf.worldMatrix) {
		tf.worldMatrix = Array.from(tf.matrix)
	}
	const _parent = mesh.parent
	if (_parent) {
		// self matrix
		internal._selfMat.fromArray(tf.matrix)
		if (!_parent.transform.worldMatrix) {
			_parent.transform.worldMatrix = Array.from(_parent.transform.matrix)
		}
		// parent's worldMatrix
		internal._parentMat.fromArray(_parent.transform.worldMatrix)
		// self matrix multiply parent's matrixWorld
		internal._worldMat
			.multiplyMatrices(internal._parentMat, internal._selfMat)
			.toArray(tf.worldMatrix)
	}
}
