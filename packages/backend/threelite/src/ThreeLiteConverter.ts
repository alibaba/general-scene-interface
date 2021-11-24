/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { PrgStandardMaterial } from './PrgStandardMaterial'
import { PrgBasicMaterial } from './PrgBasicMaterial'
import { PrgPointMaterial } from './PrgPointMaterial'
import {
	TypedArray,
	Converter,
	MeshDataType,
	MatrBaseDataType,
	GeomDataType,
	TextureType,
	AttributeDataType,
	MatrPbrDataType,
	MatrUnlitDataType,
	MatrPointDataType,
	MatrSpriteDataType,
	ColorLike,
	isTypedArray,
	DISPOSED,
	GL_STATIC_DRAW,
	GL_DYNAMIC_DRAW,
	UniformDataType,
	__GSI_MESH_INTERNAL_PROP_KEY_0__,
	__GSI_MESH_INTERNAL_PROP_0__,
	__defaultMeshInternalProp,
} from '@gs.i/schema'
import { Transform3, matrix4Equals } from '@gs.i/utils-transform'
// import * as THREE from '@gs.i/three-lite-renderer'
import {
	Object3D,
	Vector2,
	Vector3,
	BufferGeometry,
	Material,
	TextureLoader,
	Box3,
	Sphere,
	Texture,
	BufferAttribute,
	TrianglesDrawMode,
	StaticDrawUsage,
	DynamicDrawUsage,
	FrontSide,
	BackSide,
	DoubleSide,
	NoBlending,
	NormalBlending,
	AdditiveBlending,
	Color,
	CanvasTexture,
	VideoTexture,
	DataTexture,
	NearestFilter,
	LinearFilter,
	NearestMipMapNearestFilter,
	LinearMipMapNearestFilter,
	NearestMipMapLinearFilter,
	LinearMipMapLinearFilter,
	ClampToEdgeWrapping,
	MirroredRepeatWrapping,
	RepeatWrapping,
	Vector4,
	Matrix3,
	Matrix4,
} from '@gs.i/three-lite-renderer'
import { generateGsiSpriteInfo } from '@gs.i/utils-geometry'
import { box3Equals, convDefines, elementsEquals, sphereEquals, SupportedExtensions } from './utils'
import { Euler, Vector3 as Vec3 } from '@gs.i/utils-math'
import { PrgSpriteMaterial } from './PrgSpriteMaterial'

export interface DefaultConverterConfig {
	/**
	 * 是否启用Mesh frustumCulled属性，以及隐藏被视锥体剔除的Mesh
	 */
	meshFrustumCulling: boolean
}

export const DefaultConfig: DefaultConverterConfig = {
	meshFrustumCulling: true,
}

/**
 * 把 three 的 Mesh Points Lines 合并到 父类 Object3D 上，来和 glTF2 保持一致
 */
export class RenderableObject3D extends Object3D {
	isMesh?: boolean
	isPoints?: boolean
	isLine?: boolean
	isLineSegments?: boolean
	isSprite?: boolean

	// Sprite需要这个属性
	center?: Vector2

	// TrianglesDrawMode / TriangleStripDrawMode / TriangleFanDrawMode
	drawMode?: number

	geometry?: BufferGeometry
	material?: Material

	// transform缓存，用来和gsi2Mesh做比对
	_tfPos?: Vec3
	_tfRot?: Euler
	_tfScl?: Vec3

	constructor(params: Partial<RenderableObject3D> = {}) {
		super()
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}

/**
 * @QianXun: Global vars
 */
const texLoader = new TextureLoader()
// texLoader.setCrossOrigin('')

/**
 * 生成Three Lite Scene的Converter
 *
 * @export
 * @class ThreeLiteConverter
 * @implements {Converter}
 * @QianXun
 * @limit 由于CachedMap缓存机制，同一个converter不能同时作用于多个gsiMesh，否则可能会造成意外的GPU对象被dispose
 * @note 若任何对象从输入的gsiMesh上remove，会立即被Converter进行回收和dispose GPU resources
 */
export class ThreeLiteConverter implements Converter {
	/**
	 * type
	 */
	readonly type = 'ThreeLite'

	/**
	 * config
	 */
	config: Partial<DefaultConverterConfig>

	/**
	 * Scene info
	 */
	info = {
		renderablesCount: 0,
		visibleCount: 0,
	}

	/**
	 * Wrapper group as a container for all parsed meshes
	 */
	private _wrapper: MeshDataType = {
		name: 'GSI-Scene-Wrapper',
		renderOrder: 0,
		transform: new Transform3(),
		children: new Set<MeshDataType>(),
		visible: true,
	}

	/**
	 * Maps for cached objects querying
	 */
	private _meshMap = new Map<MeshDataType, RenderableObject3D>()
	private _matrMap = new Map<MatrBaseDataType, Material>()
	private _geomMap = new Map<GeomDataType, BufferGeometry>()
	private _attrMap = new Map<AttributeDataType, BufferAttribute>()
	private _textureMap = new Map<TextureType, Texture>()

	/**
	 * HashSet to store all resources used by the scene
	 * Used to check if resource should be disposed
	 */
	private _usedResources = new Set<
		Material | BufferGeometry | BufferAttribute | Texture | RenderableObject3D
	>()

	/**
	 * WebGL Extensions which will be checked initially,
	 * and turned on if the environment supports.
	 */
	private _extensions: any

	/**
	 * Temp vars
	 */
	private _infinityBox: Box3
	private _infinitySphere: Sphere
	private _emptyVec3: Vector3
	private _emptyEuler: Euler
	private _disposedArray: any[]

	constructor(params: Partial<DefaultConverterConfig> = {}) {
		this.config = {
			...DefaultConfig,
			...params,
		}

		this._infinityBox = new Box3().set(
			new Vector3(-Infinity, -Infinity, -Infinity),
			new Vector3(+Infinity, +Infinity, +Infinity)
		)
		this._infinitySphere = new Sphere(new Vector3(), Infinity)
		this._emptyVec3 = new Vector3()
		this._emptyEuler = new Euler()
		this._disposedArray = []

		this._extensions = SupportedExtensions
	}

	/**
	 * 将输入的GSIMesh及子节点转换为threeRenderableObject3D，请在每一帧渲染前（或更新数据后）调用这个方法，以获得最新的three场景数据
	 *
	 * @param {MeshDataType} gsiMesh
	 * @return {*}  {RenderableObject3D}
	 * @memberof ThreeLiteConverter
	 * @limit 由于CachedMap缓存机制，同一个converter不能同时作用于多个gsiMesh，否则可能会造成意外的GPU对象被dispose
	 * @note 若任何对象从输入的gsiMesh上remove，会立即被Converter进行回收和dispose GPU resources
	 */
	convert(gsiMesh: MeshDataType): RenderableObject3D {
		// Always return the one wrapper (holding everything converted) to prevent user losing scene pointer
		this._wrapper.children.clear()
		this._wrapper.children.add(gsiMesh)
		gsiMesh.parent = this._wrapper

		this.info.renderablesCount = 0
		this.info.visibleCount = 0

		// const res = this.convertMeshRecurrsive(this._wrapper)
		const res = this.convertMeshNonRecurr(this._wrapper)

		// Release unused resources & dispose GPU resources
		this.releaseResources()

		return res
	}

	dispose() {
		// Release unused resources - disposing
		this._attrMap.forEach((attr, dt, map) => {
			attr.array = this._disposedArray
			map.delete(dt)
		})

		this._textureMap.forEach((tex, dt, map) => {
			tex.dispose()
			map.delete(dt)
		})

		this._matrMap.forEach((mat, dt, map) => {
			mat.dispose()
			map.delete(dt)
		})

		this._geomMap.forEach((geom, dt, map) => {
			geom.dispose()
			geom.attributes = {}
			map.delete(dt)
		})

		this._meshMap.forEach((mesh, dt, map) => {
			mesh.geometry = undefined
			mesh.material = undefined
			map.delete(dt)
		})

		this._wrapper.children.clear()
		this._usedResources.clear()
	}

	/**
	 * 内部convert一个Mesh的方法，会递归convert children
	 *
	 * @private
	 * @param {MeshDataType} gsiMesh
	 * @return {*}  {RenderableObject3D}
	 * @memberof ThreeLiteConverter
	 */
	private convertMeshRecurrsive(gsiMesh: MeshDataType): RenderableObject3D {
		/**
		 * Begin conversion
		 */

		/**
		 * Mesh
		 */
		const res = this.convMesh(this._meshMap.get(gsiMesh), gsiMesh, this.config)

		/**
		 * Geom
		 */
		if (gsiMesh.geometry) {
			const bufferGeom = this.convGeom(this._geomMap.get(gsiMesh.geometry), gsiMesh)
			res.geometry = bufferGeom

			// if (!this._geomMap.has(gsiMesh.geometry)) {
			this._geomMap.set(gsiMesh.geometry, bufferGeom)
			// }

			// Mark as used resource
			this._usedResources.add(bufferGeom)

			// Assign mode
			switch (gsiMesh.geometry.mode) {
				case 'TRIANGLES':
					res['isMesh'] = true
					res['drawMode'] = TrianglesDrawMode
					break

				case 'SPRITE':
					// Use the adv sprite mesh
					res['isMesh'] = true
					// res['isSprite'] = true
					res['drawMode'] = TrianglesDrawMode
					break

				case 'POINTS':
					res['isPoints'] = true
					break

				case 'LINES':
					res['isLine'] = true
					res['isLineSegments'] = true
					break

				default:
					throw new Error('Invalid value for GSIGeom.mode: ' + gsiMesh.geometry.mode)
			}
		} else {
			res.geometry = undefined
		}

		/**
		 * Matr
		 */
		if (gsiMesh.material) {
			const threeMatr = this.convMatr(this._matrMap.get(gsiMesh.material), gsiMesh.material, {
				geomType: gsiMesh.geometry?.mode,
			})
			res.material = threeMatr

			// if (!this._matrMap.has(gsiMesh.material)) {
			this._matrMap.set(gsiMesh.material, threeMatr)
			// }

			// Mark as used resource
			this._usedResources.add(threeMatr)

			this.info.renderablesCount++
		} else {
			res.material = undefined
		}

		/**
		 * A container only
		 */
		if (gsiMesh.name === 'RenderableMesh' && !gsiMesh.geometry && !gsiMesh.material) {
			res.name = 'GSI-Group'
		}

		// Remove all children first and add them recurrsively when parsing the GSIMesh tree
		// Solution for not checking structure tree, by creating a new tree every time
		// res.children.forEach((child) => (child.parent = null))
		res.children = []

		// Convert children resurrsively
		gsiMesh.children.forEach((child) => {
			// 现在将worldMatrix的更新交给GsiRefiner去监测和更新
			const childMesh = this.convertMeshRecurrsive(child)
			res.children.push(childMesh)
			childMesh.parent = res
		})

		return res
	}

	private convertMeshNonRecurr(gsiMesh: MeshDataType): RenderableObject3D {
		/**
		 * Begin conversion
		 */
		const queue: MeshDataType[] = []
		queue.push(gsiMesh)

		while (queue.length > 0) {
			const _gsiMesh = queue.pop()
			if (_gsiMesh === undefined) {
				continue
			}

			/**
			 * Mesh
			 */
			const res = this.convMesh(this._meshMap.get(_gsiMesh), _gsiMesh, this.config)

			/**
			 * Geom
			 */
			if (_gsiMesh.geometry && Object.keys(_gsiMesh.geometry.attributes).length > 0) {
				const bufferGeom = this.convGeom(this._geomMap.get(_gsiMesh.geometry), _gsiMesh)
				res.geometry = bufferGeom

				// if (!this._geomMap.has(_gsiMesh.geometry)) {
				this._geomMap.set(_gsiMesh.geometry, bufferGeom)
				// }

				// Mark as used resource
				this._usedResources.add(bufferGeom)

				// Assign mode
				switch (_gsiMesh.geometry.mode) {
					case 'TRIANGLES':
						res['isMesh'] = true
						res['drawMode'] = TrianglesDrawMode
						break

					case 'SPRITE':
						res['isMesh'] = true
						// res['isSprite'] = true
						res['drawMode'] = TrianglesDrawMode
						break

					case 'POINTS':
						res['isPoints'] = true
						break

					case 'LINES':
						res['isLine'] = true
						res['isLineSegments'] = true
						break

					default:
						throw new Error('Invalid value for GSIGeom.mode: ' + _gsiMesh.geometry.mode)
				}

				this.info.renderablesCount++
			} else {
				res.geometry = undefined
			}

			/**
			 * Matr
			 */
			if (_gsiMesh.material) {
				const gsiMatr = _gsiMesh.material

				// Add GSI_USE_UV define to matr
				if (
					_gsiMesh.geometry &&
					_gsiMesh.geometry.attributes &&
					_gsiMesh.geometry.attributes.uv !== undefined &&
					gsiMatr['defines'] &&
					gsiMatr['defines'].GSI_USE_UV === undefined
				) {
					gsiMatr['defines'].GSI_USE_UV = true
				}

				const threeMatr = this.convMatr(this._matrMap.get(gsiMatr), gsiMatr, {
					geomType: _gsiMesh.geometry?.mode,
				})
				res.material = threeMatr

				// if (!this._matrMap.has(_gsiMatr)) {
				this._matrMap.set(gsiMatr, threeMatr)
				// }

				// Mark as used resource
				this._usedResources.add(threeMatr)
			} else {
				res.material = undefined
			}

			/**
			 * A container only
			 */
			// if (_gsiMesh.name === 'RenderableMesh' && !_gsiMesh.geometry && !_gsiMesh.material) {
			// 	res.name = 'GSI-Group'
			// }

			// Remove all children first and add them recurrsively when parsing the GSIMesh tree
			// Solution for not checking structure tree, by creating a new tree every time
			// res.children.forEach((child) => (child.parent = null))
			res.children = []

			// Convert children resurrsively
			_gsiMesh.children.forEach((child) => {
				/** @QianXun 现在将worldMatrix的更新交给GsiRefiner去监测和更新 */
				// 如果childMesh之前的parent不是当前的这个，该child被改变过父节点，需要进行updateMatrixWorld操作
				queue.push(child)
			})

			if (_gsiMesh.parent) {
				const parent = this._meshMap.get(_gsiMesh.parent)
				if (parent !== undefined) {
					parent.children.push(res)
					res.parent = parent
				}
			}
		}

		return this._meshMap.get(gsiMesh) as RenderableObject3D
	}

	private convMesh(
		threeMesh: RenderableObject3D | undefined,
		gsiMesh: MeshDataType,
		opt: { [key: string]: any } = {}
	): RenderableObject3D {
		if (threeMesh === undefined) {
			// Init threeMesh
			threeMesh = new RenderableObject3D()
			threeMesh.frustumCulled = false
		}

		// Create internal prop
		if (!gsiMesh[__GSI_MESH_INTERNAL_PROP_KEY_0__]) {
			gsiMesh[__GSI_MESH_INTERNAL_PROP_KEY_0__] = __defaultMeshInternalProp()
		}
		const internal = gsiMesh[__GSI_MESH_INTERNAL_PROP_KEY_0__] as __GSI_MESH_INTERNAL_PROP_0__

		// Assign properties when they are different
		if (threeMesh.name !== gsiMesh.name) threeMesh.name = gsiMesh.name ?? 'GSI-Mesh'
		if (threeMesh.renderOrder !== gsiMesh.renderOrder) threeMesh.renderOrder = gsiMesh.renderOrder
		if (this.config.meshFrustumCulling && gsiMesh.visible !== undefined) {
			threeMesh.visible = gsiMesh.visible && internal._frustumCulled === false ? true : false
		} else {
			threeMesh.visible = gsiMesh.visible === false ? false : true
		}

		if (threeMesh.visible === true) {
			this.info.visibleCount++
		}

		/** @todo 避免transform.matrix每次请求都会计算的问题 */
		/** @QianXun 现在将worldMatrix的更新交给Observer去监测和更新 */
		// Set transform when they are different
		if (!this.transformEquals(threeMesh, gsiMesh)) {
			threeMesh.matrix.fromArray(gsiMesh.transform.matrix)
		}

		if (!gsiMesh.transform.worldMatrix) {
			gsiMesh.transform.worldMatrix = Transform3.identityArray()
		}
		if (!matrix4Equals(threeMesh.matrixWorld.elements, gsiMesh.transform.worldMatrix)) {
			threeMesh.matrixWorld.fromArray(gsiMesh.transform.worldMatrix)
		}

		// Add to cache map
		// if (!this._meshMap.has(gsiMesh)) {
		this._meshMap.set(gsiMesh, threeMesh)
		// }
		this._usedResources.add(threeMesh)

		return threeMesh
	}

	private convGeom(
		geom: BufferGeometry | undefined,
		gsiMesh: MeshDataType,
		opt: { [key: string]: any } = {}
	): BufferGeometry {
		const gsiGeom = gsiMesh.geometry as GeomDataType

		if (!geom) {
			// Generate sprite data before initialize threeBufferGeometry
			if (gsiGeom.mode === 'SPRITE') {
				generateGsiSpriteInfo(gsiGeom, gsiMesh.material as MatrSpriteDataType)
			}

			geom = new BufferGeometry()
		}

		// Assign gsi attributes
		for (const key in gsiGeom.attributes) {
			const gsiAttr = gsiGeom.attributes[key]
			const attr = this.convAttr(this._attrMap.get(gsiAttr), gsiAttr, opt)

			if (!geom.attributes[key]) {
				// First time to set
				geom.setAttribute(key, attr)
			} else if (geom.attributes[key] !== attr) {
				//
				delete geom.attributes[key]
				geom.setAttribute(key, attr)
			}

			this._attrMap.set(gsiAttr, attr)
		}

		// Remove target's index
		if (geom.index) geom.index = null

		// Assign gsi index
		const gsiIndices = gsiGeom.indices
		if (gsiIndices) {
			const index = this.convAttr(this._attrMap.get(gsiIndices), gsiIndices, opt)

			if (!geom.index) {
				// First time to set
				geom.setIndex(index)
			} else if (geom.index !== index) {
				//
				geom.index = null
				geom.setIndex(index)
			}

			this._attrMap.set(gsiIndices, index)
		}

		if (
			gsiGeom.drawRange &&
			(gsiGeom.drawRange.start !== geom.drawRange.start ||
				gsiGeom.drawRange.count !== geom.drawRange.count)
		) {
			geom.setDrawRange(gsiGeom.drawRange.start, gsiGeom.drawRange.count)
		}

		//

		// @todo 数据可视化中通常都不会出现 bbox 和 bsphere
		// @todo bbox 和 bsphere 通常不会一起使用
		const bbox = gsiGeom.boundingBox || this._infinityBox
		const bsphere = gsiGeom.boundingSphere || this._infinitySphere

		// BBox
		if (!geom.boundingBox || !box3Equals(geom.boundingBox, bbox)) {
			geom.boundingBox = new Box3(
				new Vector3().copy(bbox.min as Vector3),
				new Vector3().copy(bbox.max as Vector3)
			)
		}

		// BSphere
		if (!geom.boundingSphere || !sphereEquals(geom.boundingSphere, bsphere)) {
			geom.boundingSphere = new Sphere(
				new Vector3().copy(bsphere.center as Vector3),
				bsphere.radius
			)
		}

		//

		return geom
	}

	private convAttr(
		attr: BufferAttribute | undefined,
		gsiAttr: AttributeDataType,
		opt: { [key: string]: any } = {}
	): BufferAttribute {
		if (gsiAttr.version === undefined) {
			gsiAttr.version = 0
		}

		if (attr && gsiAttr.version === attr.version) {
			// No need to update
			this._usedResources.add(attr)
			return attr
		}

		if (!attr) {
			// 类型检查
			if (!isTypedArray(gsiAttr.array)) throw new Error('GSI::Attribute.array must be a TypedArray')

			// Basics
			attr = new BufferAttribute(gsiAttr.array, gsiAttr.itemSize, gsiAttr.normalized)

			// .commitedVersion should be equal to .version after creation
			// Backwards compatibility
			attr.version = gsiAttr.commitedVersion = gsiAttr.version

			// .updateRanges is unnecessary when attribute is created first time
			// sAttr.updateRanges
		} else if (gsiAttr.version > ((gsiAttr.commitedVersion as number) || attr.version)) {
			// 类型检查
			if (!isTypedArray(gsiAttr.array)) throw new Error('GSI::Attribute.array must be a TypedArray')

			/**
			 * Update attr array data
			 * @NOTE .version must >= .commitedVersion
			 */
			attr.needsUpdate = true

			// Update process, with limitations by STATIC_DRAW or DYNAMIC_DRAW
			if (gsiAttr.usage === 'STATIC_DRAW') {
				// If the gsiAttr.array is new, update attribute by resending array to GPU
				if (gsiAttr.updateRanges && gsiAttr.updateRanges.length) {
					console.warn('GSI::Attribute.updateRanges is not supported in `STATIC_DRAW` usage')
				}
				// Overwrite array
				attr.array = gsiAttr.array
			} else if (gsiAttr.usage === 'DYNAMIC_DRAW') {
				if (attr.array !== gsiAttr.array) {
					throw new Error(
						'GSI::Attribute.array: changing array itself is not permitted when attribute usage is `DYNAMIC_DRAW`'
					)
				}
				// Merge and set .updateRanges
				if (gsiAttr.updateRanges && gsiAttr.updateRanges.length) {
					const mergedRange = { start: Infinity, end: -Infinity }
					for (let i = 0; i < gsiAttr.updateRanges.length; i++) {
						const range = gsiAttr.updateRanges[i]
						const start = range.start
						const end = start + range.count
						if (start < mergedRange.start) mergedRange.start = start
						if (end > mergedRange.end) mergedRange.end = end
					}
					attr.updateRange.offset = mergedRange.start
					attr.updateRange.count = mergedRange.end - mergedRange.start
				} else {
					console.warn('GSI::Attribute: needs update data but no updateRanges are provided')
					// Default value - from BufferAttribute.js
					attr.updateRange = { offset: 0, count: -1 }
				}
			} else {
				throw new Error('Invalid value of GSI::Attribute.usage')
			}

			// Backwards compatibility
			// .commitedVersion update
			gsiAttr.commitedVersion = gsiAttr.version
			if (gsiAttr.updateRanges) {
				gsiAttr.updateRanges.length = 0
			}
		}

		// .usage
		switch (gsiAttr.usage) {
			case 'STATIC_DRAW':
				attr.usage = StaticDrawUsage || GL_STATIC_DRAW
				break
			case 'DYNAMIC_DRAW':
				attr.usage = DynamicDrawUsage || GL_DYNAMIC_DRAW
				break
			default:
				throw new Error('Invalid value for GSI::Attribute.usage: ' + gsiAttr.usage)
		}

		// releaseOnUpload
		if (gsiAttr.disposable) {
			// gsi 释放 array 用内置类型
			gsiAttr.array = DISPOSED

			// 底层渲染器释放 array 的方案各有不同，用支持的即可
			attr.onUploadCallback = function () {
				this.array = []
			}
		}

		// Mark as used resource
		this._usedResources.add(attr)

		return attr
	}

	private convMatr(
		threeMatr: Material | undefined,
		gsiMatr: MatrBaseDataType,
		opt: { [key: string]: any }
	): Material {
		if (threeMatr === undefined) {
			switch (gsiMatr.type) {
				case 'basic':
					console.error('Use MatrUnlit instead of MatrBasic')
					threeMatr = new PrgBasicMaterial(gsiMatr as MatrUnlitDataType)
					break
				case 'point':
					threeMatr = new PrgPointMaterial(gsiMatr as MatrPointDataType)
					break
				case 'unlit':
					threeMatr = new PrgBasicMaterial(gsiMatr as MatrUnlitDataType)
					break
				case 'pbr':
					threeMatr = new PrgStandardMaterial(gsiMatr as MatrPbrDataType)
					break
				case 'sprite':
					threeMatr = new PrgSpriteMaterial(gsiMatr as MatrSpriteDataType)
					break
				default:
					console.error('Unsupported GSI::Material Type: ' + gsiMatr.type)
					threeMatr = new PrgBasicMaterial(gsiMatr as MatrUnlitDataType)
			}

			for (const key in this._extensions) {
				if (this._extensions[key] === false) {
					threeMatr['extensions'][key] = false
				}
			}
		}

		threeMatr.name = gsiMatr.name || 'GSI-three-Matr'
		threeMatr.visible = gsiMatr.visible

		// face culling
		switch (gsiMatr.side) {
			case 'front':
				threeMatr.side = FrontSide
				break
			case 'back':
				threeMatr.side = BackSide
				break
			case 'double':
				threeMatr.side = DoubleSide
				break
			default:
				throw new Error('Unsupported value of GSI::Matr.side: ' + gsiMatr.side)
		}

		// trans / blending
		switch (gsiMatr.alphaMode) {
			case 'OPAQUE':
				threeMatr.transparent = false
				threeMatr.depthTest = true
				threeMatr.depthWrite = true
				threeMatr.blending = NoBlending
				break
			case 'MASK':
				threeMatr.transparent = false
				threeMatr.depthTest = true
				threeMatr.depthWrite = true
				threeMatr.blending = NoBlending
				threeMatr.alphaTest = gsiMatr.alphaCutoff
				break
			case 'BLEND':
				threeMatr.transparent = true
				threeMatr.depthTest = true
				threeMatr.depthWrite = false
				threeMatr.blending = NormalBlending
				break
			case 'BLEND_ADD':
				threeMatr.transparent = true
				threeMatr.depthTest = true
				threeMatr.depthWrite = false
				threeMatr.blending = AdditiveBlending
				break
			default:
				throw new Error('Unsupported value of GSI::Matr.alphaMode: ' + gsiMatr.alphaMode)
		}

		switch (gsiMatr.type) {
			case 'basic':
				//
				break

			case 'pbr': {
				const matr = gsiMatr as MatrPbrDataType
				threeMatr['defines'] = convDefines(threeMatr['defines'], matr.defines)
				threeMatr['uniforms'] = this.convUniforms(threeMatr['uniforms'], matr.uniforms)
				this.assignPbrParams(threeMatr, matr)
				break
			}

			case 'unlit': {
				const matr = gsiMatr as MatrUnlitDataType
				threeMatr.opacity = matr.opacity
				threeMatr['color'] = this.convColor(threeMatr['color'], matr.baseColorFactor)
				threeMatr['map'] = this.convTexture(threeMatr['map'], matr.baseColorTexture, true)
				threeMatr['defines'] = convDefines(threeMatr['defines'], matr.defines)
				threeMatr['uniforms'] = this.convUniforms(threeMatr['uniforms'], matr.uniforms)
				break
			}

			case 'point': {
				const matr = gsiMatr as MatrPointDataType
				threeMatr.opacity = matr.opacity
				threeMatr['size'] = matr.size
				threeMatr['sizeAttenuation'] = matr.sizeAttenuation
				threeMatr['color'] = this.convColor(threeMatr['color'], matr.baseColorFactor)
				threeMatr['map'] = this.convTexture(threeMatr['map'], matr.baseColorTexture, true)
				threeMatr['defines'] = convDefines(threeMatr['defines'], matr.defines)
				threeMatr['uniforms'] = this.convUniforms(threeMatr['uniforms'], matr.uniforms)
				break
			}

			case 'sprite': {
				const threeM = threeMatr as PrgSpriteMaterial
				const matr = gsiMatr as MatrSpriteDataType
				threeM.uniforms.opacity.value = matr.opacity
				threeM.opacity = matr.opacity
				threeM.uniforms['uCenter'].value.copy(matr.center as Vector2)
				threeM.uniforms['uSize'].value.copy(matr.size as Vector2)
				threeM.uniforms['uRotation'].value = matr.rotation
				threeM.uniforms['diffuse'].value = this.convColor(threeM['color'], matr.baseColorFactor)
				threeM.map = this.convTexture(threeM.map ?? undefined, matr.baseColorTexture, true)
				threeM.defines['USE_SIZEATTENUATION'] = !!matr.sizeAttenuation
				break
			}

			default:
				throw new Error('Unsupported value of GSI::Matr.type: ' + gsiMatr.type)
		}

		threeMatr.depthTest = gsiMatr.depthTest ? true : false

		return threeMatr
	}

	/**
	 * @todo 缓存
	 * @param threeColor
	 * @param gsiColor
	 */
	private convColor(threeColor: Color | undefined, gsiColor: ColorLike | string): Color {
		if (threeColor === undefined) {
			if (typeof gsiColor === 'string') {
				threeColor = new Color(gsiColor)
			} else {
				threeColor = new Color(gsiColor.r, gsiColor.g, gsiColor.b)
			}
		} else {
			if (typeof gsiColor === 'string') {
				threeColor.set(gsiColor)
			} else {
				threeColor.setRGB(gsiColor.r, gsiColor.g, gsiColor.b)
			}
		}
		return threeColor
	}

	private convTexture(
		threeTexture: Texture | undefined,
		gsiTexture: TextureType | undefined,
		resourceCache = true
	): Texture | null {
		if (!gsiTexture) return null

		let cachedTex = this._textureMap.get(gsiTexture)

		if (!cachedTex) {
			/**
			 * @QianXun @limit ImageData必须是Non-Texture-Shared
			 */
			const imgData = gsiTexture.image

			// Create Texture via various image types
			if (imgData.image) {
				if (imgData.image instanceof HTMLElement) {
					// HTMLElement
					if (imgData.image instanceof HTMLCanvasElement) {
						cachedTex = new CanvasTexture(imgData.image)
					} else if (imgData.image instanceof HTMLVideoElement) {
						/** @TODO 在three中需先解决每次uploadTexture都会创建一个 `dispose` listener 的问题 */
						console.warn(
							'GSI::Texture::image - type `HTMLVideoElement` is not supported, use normal texture instead. '
						)
						cachedTex = new VideoTexture(imgData.image)
						const tex = cachedTex as VideoTexture
						imgData.image.addEventListener('play', () => {
							tex.needsUpdate = true
						})

						// threeTexture = new VideoTexture(imgData.image)
						// console.log('threeTexture', threeTexture)
						// const tex = threeTexture as VideoTexture
						// imgData.image.addEventListener('play', () => {
						// 	tex['interval'] = setInterval(() => {
						// 		tex.needsUpdate = true
						// 	}, 16)
						// 	tex.addEventListener('dispose', () => {
						// 		clearInterval(tex['interval'])
						// 	})
						// })
					} else {
						cachedTex = new Texture(imgData.image)
					}
				} else if (isTypedArray(imgData.image)) {
					// TypedArray, must have .width & .height properties
					if (!imgData.width || !imgData.height) {
						console.warn(
							'GSI::Texture - image missing .width & .height property, using 256 * 256 instead'
						)
						imgData.width = imgData.height = 256
					}
					cachedTex = new DataTexture(imgData.image as TypedArray, imgData.width, imgData.height)
				} else if (imgData.image instanceof DataView) {
					console.error('GSI::Texture::image - type `DataView` is not supported')
					cachedTex = new Texture()
				} else {
					console.error('GSI::Texture - invalid image type', gsiTexture)
					cachedTex = new Texture()
				}
			} else if (imgData.uri) {
				// URI
				cachedTex = texLoader.load(imgData.uri)
			} else {
				console.error(
					'GSI::Texture - image has no .uri or .image property, use default texture instead',
					gsiTexture
				)
				cachedTex = new Texture()
			}
		}

		threeTexture = cachedTex as Texture

		// Assign properties
		if (!gsiTexture.sampler) {
			console.warn('GSI::Texture - sampler property is missing, use default instead')
			gsiTexture.sampler = {}
		}

		const sampler = gsiTexture.sampler
		switch (sampler.magFilter) {
			case 'NEAREST':
				threeTexture.magFilter = NearestFilter
				break
			case 'LINEAR':
				threeTexture.magFilter = LinearFilter
				break
			default:
				threeTexture.magFilter = NearestFilter
		}

		// Set mipmaps to false first
		threeTexture.generateMipmaps = false

		switch (sampler.minFilter) {
			case 'NEAREST':
				threeTexture.minFilter = NearestFilter
				break
			case 'LINEAR':
				threeTexture.minFilter = LinearFilter
				break
			case 'NEAREST_MIPMAP_NEAREST':
				threeTexture.minFilter = NearestMipMapNearestFilter
				// WebGL generateMipmaps
				if (!threeTexture.generateMipmaps) threeTexture.generateMipmaps = true
				break
			case 'LINEAR_MIPMAP_NEAREST':
				threeTexture.minFilter = LinearMipMapNearestFilter
				// WebGL generateMipmaps
				if (!threeTexture.generateMipmaps) threeTexture.generateMipmaps = true
				break
			case 'NEAREST_MIPMAP_LINEAR':
				threeTexture.minFilter = NearestMipMapLinearFilter
				// WebGL generateMipmaps
				if (!threeTexture.generateMipmaps) threeTexture.generateMipmaps = true
				break
			case 'LINEAR_MIPMAP_LINEAR':
				threeTexture.minFilter = LinearMipMapLinearFilter
				// WebGL generateMipmaps
				if (!threeTexture.generateMipmaps) threeTexture.generateMipmaps = true
				break
			default:
				// throw new Error('Invalid value of GSISampler.minFilter: ' + sampler.minFilter)
				threeTexture.minFilter = NearestFilter
		}

		switch (sampler.wrapS) {
			case 'CLAMP_TO_EDGE':
				threeTexture.wrapS = ClampToEdgeWrapping
				break
			case 'MIRRORED_REPEAT':
				threeTexture.wrapS = MirroredRepeatWrapping
				break
			case 'REPEAT':
				threeTexture.wrapS = RepeatWrapping
				break
			default:
				// throw new Error('Invalid value of GSISampler.wrapS: ' + sampler.wrapS)
				threeTexture.wrapS = ClampToEdgeWrapping
		}

		switch (sampler.wrapT) {
			case 'CLAMP_TO_EDGE':
				threeTexture.wrapT = ClampToEdgeWrapping
				break
			case 'MIRRORED_REPEAT':
				threeTexture.wrapT = MirroredRepeatWrapping
				break
			case 'REPEAT':
				threeTexture.wrapT = RepeatWrapping
				break
			default:
				// throw new Error('Invalid value of GSISampler.wrapT: ' + sampler.wrapT)
				threeTexture.wrapT = ClampToEdgeWrapping
		}

		// anisotropy
		if (sampler.anisotropy === undefined) sampler.anisotropy = 1

		if (threeTexture.anisotropy !== sampler.anisotropy) threeTexture.anisotropy = sampler.anisotropy

		// flipY
		threeTexture.flipY = gsiTexture.image.flipY || false

		// transform

		// Add to cached map
		// if (!this._textureMap.has(gsiTexture)) {
		this._textureMap.set(gsiTexture, threeTexture)
		// }

		// Mark as used resource
		if (resourceCache) this._usedResources.add(threeTexture)

		return threeTexture
	}

	private convUniforms(
		threeUniforms: { [name: string]: any } | undefined,
		gsiUniforms: { [name: string]: UniformDataType } | undefined
	): any {
		if (threeUniforms === undefined) threeUniforms = {}

		if (gsiUniforms === undefined) return threeUniforms

		for (const key in gsiUniforms) {
			const elem = gsiUniforms[key]
			if (elem !== undefined) {
				this.assignUniformVals(threeUniforms, key, elem)
			}
		}
		return threeUniforms
	}

	private assignPbrParams(threeMatr: Material, gsiMatr: MatrPbrDataType) {
		threeMatr.opacity = (gsiMatr as MatrPbrDataType).opacity
		threeMatr['color'] = this.convColor(
			threeMatr['color'],
			(gsiMatr as MatrPbrDataType).baseColorFactor
		)
		threeMatr['emissive'] = this.convColor(
			threeMatr['emissive'],
			(gsiMatr as MatrPbrDataType).emissiveFactor
		)
		threeMatr['metalness'] = (gsiMatr as MatrPbrDataType).metallicFactor
		threeMatr['roughness'] = (gsiMatr as MatrPbrDataType).roughnessFactor

		/**
		 * @todo metallicRoughnessTexture 需要对 three 的 PBR 做一些修改
		 * @QianXun 根据three的gltf loader实现，暂时将这个texture同时附给两个属性
		 * https://threejs.org/examples/?q=gltf#webgl_loader_gltf_extensions
		 */
		threeMatr['metalnessMap'] = this.convTexture(
			threeMatr['metalnessMap'],
			(gsiMatr as MatrPbrDataType).metallicRoughnessTexture,
			true
		)
		threeMatr['roughnessMap'] = this.convTexture(
			threeMatr['roughnessMap'],
			(gsiMatr as MatrPbrDataType).metallicRoughnessTexture,
			true
		)
		threeMatr['map'] = this.convTexture(
			threeMatr['map'],
			(gsiMatr as MatrPbrDataType).baseColorTexture,
			true
		)
		threeMatr['emissiveMap'] = this.convTexture(
			threeMatr['emissiveMap'],
			(gsiMatr as MatrPbrDataType).emissiveTexture,
			true
		)
		threeMatr['normalMap'] = this.convTexture(
			threeMatr['normalMap'],
			(gsiMatr as MatrPbrDataType).normalTexture,
			true
		)
		threeMatr['aoMap'] = this.convTexture(
			threeMatr['aoMap'],
			(gsiMatr as MatrPbrDataType).occlusionTexture,
			true
		)
	}

	private assignUniformVals(
		threeUniforms: { [name: string]: any },
		key: string,
		gsiUniform: UniformDataType
	) {
		const val = gsiUniform.value as any
		const type = gsiUniform.type
		if (val === undefined) {
			return
		}
		if (typeof val === 'number') {
			if (threeUniforms[key] === undefined) {
				threeUniforms[key] = { value: val }
			} else {
				threeUniforms[key].value = val
			}
		} else if (Array.isArray(val)) {
			if (type === 'float') {
				// 识别到普通的float array
				if (threeUniforms[key] === undefined) {
					threeUniforms[key] = { value: val }
				} else {
					threeUniforms[key].value = val
				}
			} else if (threeUniforms[key] === undefined) {
				threeUniforms[key] = { value: this.arrayTothree(undefined, val) }
			} else {
				threeUniforms[key].value = this.arrayTothree(threeUniforms[key].value, val)
			}
		} else if (val['w'] !== undefined) {
			if (threeUniforms[key] === undefined) {
				threeUniforms[key] = { value: new Vector4().copy(val) }
			} else {
				;(threeUniforms[key].value as Vector4).copy(val)
			}
		} else if (val['z'] !== undefined) {
			if (threeUniforms[key] === undefined) {
				threeUniforms[key] = { value: new Vector3().copy(val) }
			} else {
				;(threeUniforms[key].value as Vector3).copy(val)
			}
		} else if (val['y'] !== undefined) {
			if (threeUniforms[key] === undefined) {
				threeUniforms[key] = { value: new Vector2().copy(val) }
			} else {
				;(threeUniforms[key].value as Vector2).copy(val)
			}
		} else if (val['r'] !== undefined) {
			if (threeUniforms[key] === undefined) {
				threeUniforms[key] = { value: new Color().copy(val) }
			} else {
				;(threeUniforms[key].value as Color).copy(val)
			}
		} else if (val.image) {
			if (threeUniforms[key] === undefined) {
				threeUniforms[key] = { value: this.convTexture(undefined, val as TextureType, true) }
			} else {
				threeUniforms[key].value = this.convTexture(
					threeUniforms[key].value,
					val as TextureType,
					true
				)
			}
		} else if (val.position && val.rotation && val.scale) {
			/**
			 * @note @performance 这里每一帧计算matrix会消耗性能
			 */
			const elements = val.matrix
			if (
				threeUniforms[key] === undefined ||
				!elementsEquals(threeUniforms[key].value.elements, elements)
			) {
				let mat
				if (elements.length === 9) {
					mat = new Matrix3().fromArray(elements)
				} else if (elements.length === 16) {
					mat = new Matrix4().fromArray(elements)
				} else {
					throw new Error('Invalid Matrix elements length')
				}
				threeUniforms[key] = { value: mat }
			}
		} else {
			console.error(`GSI::PrgMatr::Uniforms unsupported uniform type ${val}`)
		}
	}

	private arrayTothree(
		src: any[] | Matrix3 | Matrix4 | undefined,
		val: any[]
	): any[] | Matrix3 | Matrix4 {
		const l = val.length
		let result
		if (l === 9 && val.every((v) => typeof v === 'number')) {
			// 	Matrix3数组
			if (src === undefined) {
				result = new Matrix3().fromArray(val)
			} else {
				result = (src as Matrix3).fromArray(val)
			}
			return result
		}
		if (l === 16 && val.every((v) => typeof v === 'number')) {
			// Matrix4数组
			if (src === undefined) {
				result = new Matrix4().fromArray(val)
			} else {
				result = (src as Matrix4).fromArray(val)
			}
			return result
		}

		// 多维对象数组，依次parse
		result = src || []
		for (let i = 0; i < l; i++) {
			const v = val[i]
			const s = result[i]
			if (v === undefined || v === null) {
				throw new Error('Array element is undefined or null')
			} else if (Array.isArray(v)) {
				switch (v.length) {
					case 9:
						if (s === undefined) {
							result[i] = new Matrix3().fromArray(v)
						} else {
							s.fromArray(v)
						}
						break
					case 16:
						if (s === undefined) {
							result[i] = new Matrix4().fromArray(v)
						} else {
							s.fromArray(v)
						}
						break
					default:
						throw new Error('Invalid array length for uniform')
				}
			} else if (typeof val === 'number' && result[i] !== v) {
				result[i] = v
			} else if (v.w !== undefined) {
				if (s === undefined) {
					result[i] = new Vector4().copy(v)
				} else {
					s.copy(v)
				}
			} else if (v.z !== undefined) {
				if (s === undefined) {
					result[i] = new Vector3().copy(v)
				} else {
					s.copy(v)
				}
			} else if (v.y !== undefined) {
				if (s === undefined) {
					result[i] = new Vector2().copy(v)
				} else {
					s.copy(v)
				}
			} else if (v.r !== undefined) {
				if (s === undefined) {
					result[i] = new Color().copy(v)
				} else {
					s.copy(v)
				}
			} else if (v.image) {
				if (s === undefined) {
					result[i] = this.convTexture(undefined, v as TextureType, true)
				} else {
					result[i] = this.convTexture(result[i], v as TextureType, true)
				}
			} else {
				throw new Error(`Unsupported array item type: ${v}`)
			}
		}
		return result
	}

	private transformEquals(threeMesh: RenderableObject3D, gsiMesh: MeshDataType): boolean {
		if (threeMesh._tfPos === undefined) {
			threeMesh._tfPos = new Vec3().copy((gsiMesh.transform.position ?? this._emptyVec3) as Vec3)
		}
		if (threeMesh._tfRot === undefined) {
			threeMesh._tfRot = new Euler().copy((gsiMesh.transform.rotation ?? this._emptyEuler) as Euler)
		}
		if (threeMesh._tfScl === undefined) {
			threeMesh._tfScl = new Vec3().copy((gsiMesh.transform.scale ?? this._emptyVec3) as Vec3)
		}

		if (!gsiMesh.transform.position || !gsiMesh.transform.rotation || !gsiMesh.transform.scale) {
			return matrix4Equals(threeMesh.matrix.elements, gsiMesh.transform.matrix)
		}

		const p1 = threeMesh._tfPos
		const p2 = gsiMesh.transform.position
		const e1 = threeMesh._tfRot
		const e2 = gsiMesh.transform.rotation
		const s1 = threeMesh._tfScl
		const s2 = gsiMesh.transform.scale
		if (
			p1.x === p2.x &&
			p1.y === p2.y &&
			p1.z === p2.z &&
			e1.x === e2.x &&
			e1.y === e2.y &&
			e1.z === e2.z &&
			e1.order === e2.order &&
			s1.x === s2.x &&
			s1.y === s2.y &&
			s1.z === s2.z
		) {
			return true
		} else {
			return false
		}
	}

	private releaseResources() {
		// Release unused resources - disposing
		this._attrMap.forEach((attr, dt, map) => {
			if (!this._usedResources.has(attr)) {
				// Release ArrayBuffer
				attr.array = this._disposedArray
				map.delete(dt)
			}
		})

		this._textureMap.forEach((tex, dt, map) => {
			if (!this._usedResources.has(tex)) {
				tex.dispose()
				map.delete(dt)
			}
		})

		this._matrMap.forEach((mat, dt, map) => {
			if (!this._usedResources.has(mat)) {
				mat.dispose()
				map.delete(dt)
			}
		})

		this._geomMap.forEach((geom, dt, map) => {
			if (!this._usedResources.has(geom)) {
				geom.dispose()
				// Release attributes
				geom.attributes = {}
				map.delete(dt)
			}
		})

		this._meshMap.forEach((mesh, dt, map) => {
			if (!this._usedResources.has(mesh)) {
				mesh.geometry = undefined
				mesh.material = undefined
				map.delete(dt)
			}
		})

		// Clear used resources marks
		this._usedResources.clear()
	}
}
