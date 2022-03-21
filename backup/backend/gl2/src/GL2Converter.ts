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
import { THREE } from 'gl2'
import { generateGsiSpriteInfo } from '@gs.i/utils-geometry'
import { box3Equals, convDefines, elementsEquals, sphereEquals } from './utils'
import { Euler, Vector3 } from '@gs.i/utils-math'
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
export class RenderableObject3D extends THREE.Object3D {
	isMesh?: boolean
	isPoints?: boolean
	isLine?: boolean
	isLineSegments?: boolean
	isSprite?: boolean

	// Sprite需要这个属性
	center?: THREE.Vector2

	// THREE.TrianglesDrawMode / THREE.TriangleStripDrawMode / THREE.TriangleFanDrawMode
	drawMode?: number

	geometry?: THREE.BufferGeometry
	material?: THREE.Material

	// transform缓存，用来和gsi2Mesh做比对
	_tfPos?: Vector3
	_tfRot?: Euler
	_tfScl?: Vector3

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
const texLoader = new THREE.TextureLoader()
// texLoader.setCrossOrigin('')

/**
 * 生成GL2Scene的Converter
 *
 * @export
 * @class GL2Converter
 * @implements {Converter}
 * @QianXun
 * @limit 由于CachedMap缓存机制，同一个converter不能同时作用于多个gsiMesh，否则可能会造成意外的GPU对象被dispose
 * @note 若任何对象从输入的gsiMesh上remove，会立即被Converter进行回收和dispose GPU resources
 */
export class GL2Converter implements Converter {
	/**
	 * type
	 */
	readonly type = 'GL2'

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
	private _matrMap = new Map<MatrBaseDataType, THREE.Material>()
	private _geomMap = new Map<GeomDataType, THREE.BufferGeometry>()
	private _attrMap = new Map<AttributeDataType, THREE.BufferAttribute>()
	private _textureMap = new Map<TextureType, THREE.Texture>()

	/**
	 * HashSet to store all resources used by the scene
	 * Used to check if resource should be disposed
	 */
	private _usedResources = new Set<
		| THREE.Material
		| THREE.BufferGeometry
		| THREE.BufferAttribute
		| THREE.Texture
		| RenderableObject3D
	>()

	/**
	 * Temp vars
	 */
	private _infinityBox: THREE.Box3
	private _infinitySphere: THREE.Sphere
	private _emptyVec3: Vector3
	private _emptyEuler: Euler
	private _disposedArray: any[]

	constructor(params: Partial<DefaultConverterConfig> = {}) {
		this.config = {
			...DefaultConfig,
			...params,
		}

		this._infinityBox = new THREE.Box3().set(
			new THREE.Vector3(-Infinity, -Infinity, -Infinity),
			new THREE.Vector3(+Infinity, +Infinity, +Infinity)
		)
		this._infinitySphere = new THREE.Sphere(new THREE.Vector3(), Infinity)
		this._emptyVec3 = new Vector3()
		this._emptyEuler = new Euler()
		this._disposedArray = []
	}

	/**
	 * 将输入的GSIMesh及子节点转换为GL2RenderableObject3D，请在每一帧渲染前（或更新数据后）调用这个方法，以获得最新的GL2场景数据
	 *
	 * @param {MeshDataType} gsiMesh
	 * @return {*}  {RenderableObject3D}
	 * @memberof GL2Converter
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
	 * @memberof GL2Converter
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
					res['drawMode'] = THREE.TrianglesDrawMode
					break

				case 'SPRITE':
					res['isMesh'] = true
					// res['isSprite'] = true
					res['drawMode'] = THREE.TrianglesDrawMode
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

			this.info.renderablesCount++
		} else {
			res.geometry = undefined
		}

		/**
		 * Matr
		 */
		if (gsiMesh.material) {
			const gl2Matr = this.convMatr(this._matrMap.get(gsiMesh.material), gsiMesh.material, {
				geomType: gsiMesh.geometry?.mode,
			})
			res.material = gl2Matr

			// if (!this._matrMap.has(gsiMesh.material)) {
			this._matrMap.set(gsiMesh.material, gl2Matr)
			// }

			// Mark as used resource
			this._usedResources.add(gl2Matr)
		} else {
			res.material = undefined
		}

		/**
		 * A container only
		 */
		// if (gsiMesh.name === 'RenderableMesh' && !gsiMesh.geometry && !gsiMesh.material) {
		// 	res.name = 'GSI-Group'
		// }

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
						res['drawMode'] = THREE.TrianglesDrawMode
						break

					case 'SPRITE':
						// Use the adv sprite mesh
						res['isMesh'] = true
						// res['isSprite'] = true
						res['drawMode'] = THREE.TrianglesDrawMode
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

				const gl2Matr = this.convMatr(this._matrMap.get(gsiMatr), gsiMatr, {
					geomType: _gsiMesh.geometry?.mode,
				})
				res.material = gl2Matr

				// if (!this._matrMap.has(_gsiMatr)) {
				this._matrMap.set(gsiMatr, gl2Matr)
				// }

				// Mark as used resource
				this._usedResources.add(gl2Matr)

				this.info.renderablesCount++
			} else {
				res.material = undefined
			}

			/**
			 * A container only
			 */
			if (_gsiMesh.name === 'RenderableMesh' && !_gsiMesh.geometry && !_gsiMesh.material) {
				res.name = 'GSI-Group'
			}

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
		gl2Mesh: RenderableObject3D | undefined,
		gsiMesh: MeshDataType,
		opt: { [key: string]: any } = {}
	): RenderableObject3D {
		if (gl2Mesh === undefined) {
			// Init GL2Mesh
			gl2Mesh = new RenderableObject3D()
			gl2Mesh.frustumCulled = false
		}

		// Create internal prop
		if (!gsiMesh[__GSI_MESH_INTERNAL_PROP_KEY_0__]) {
			gsiMesh[__GSI_MESH_INTERNAL_PROP_KEY_0__] = __defaultMeshInternalProp()
		}
		const internal = gsiMesh[__GSI_MESH_INTERNAL_PROP_KEY_0__] as __GSI_MESH_INTERNAL_PROP_0__

		// Assign properties when they are different
		if (gl2Mesh.name !== gsiMesh.name) gl2Mesh.name = gsiMesh.name ?? 'GSI-Mesh'
		if (gl2Mesh.renderOrder !== gsiMesh.renderOrder) gl2Mesh.renderOrder = gsiMesh.renderOrder
		if (this.config.meshFrustumCulling && gsiMesh.visible !== undefined) {
			gl2Mesh.visible = gsiMesh.visible && internal._frustumCulled === false ? true : false
		} else {
			gl2Mesh.visible = gsiMesh.visible === false ? false : true
		}

		if (gl2Mesh.visible === true) {
			this.info.visibleCount++
		}

		/** @todo 避免transform.matrix每次请求都会计算的问题 */
		/** @QianXun 现在将worldMatrix的更新交给Observer去监测和更新 */
		// Set transform when they are different
		if (!this.transformEquals(gl2Mesh, gsiMesh)) {
			gl2Mesh.matrix.fromArray(gsiMesh.transform.matrix)
		}

		if (!gsiMesh.transform.worldMatrix) {
			gsiMesh.transform.worldMatrix = Transform3.identityArray()
		}
		if (!matrix4Equals(gl2Mesh.matrixWorld.elements, gsiMesh.transform.worldMatrix)) {
			gl2Mesh.matrixWorld.fromArray(gsiMesh.transform.worldMatrix)
		}

		// Add to cache map
		// if (!this._meshMap.has(gsiMesh)) {
		this._meshMap.set(gsiMesh, gl2Mesh)
		// }
		this._usedResources.add(gl2Mesh)

		return gl2Mesh
	}

	private convGeom(
		geom: THREE.BufferGeometry | undefined,
		gsiMesh: MeshDataType,
		opt: { [key: string]: any } = {}
	): THREE.BufferGeometry {
		const gsiGeom = gsiMesh.geometry as GeomDataType

		if (!geom) {
			// Generate sprite data before initialize GL2BufferGeometry
			if (gsiGeom.mode === 'SPRITE') {
				generateGsiSpriteInfo(gsiGeom, gsiMesh.material as MatrSpriteDataType)
			}

			geom = new THREE.BufferGeometry()
		}

		// Assign gsi attributes
		for (const key in gsiGeom.attributes) {
			const gsiAttr = gsiGeom.attributes[key]
			const attr = this.convAttr(this._attrMap.get(gsiAttr), gsiAttr, opt)

			if (!geom.attributes[key]) {
				// First time to set
				geom.addAttribute(key, attr)
			} else if (geom.attributes[key] !== attr) {
				//
				delete geom.attributes[key]
				geom.addAttribute(key, attr)
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
			geom.boundingBox = new THREE.Box3(
				new THREE.Vector3().copy(bbox.min as THREE.Vector3),
				new THREE.Vector3().copy(bbox.max as THREE.Vector3)
			)
		}

		// BSphere
		if (!geom.boundingSphere || !sphereEquals(geom.boundingSphere, bsphere)) {
			geom.boundingSphere = new THREE.Sphere(
				new THREE.Vector3().copy(bsphere.center as THREE.Vector3),
				bsphere.radius
			)
		}

		//

		return geom
	}

	private convAttr(
		attr: THREE.BufferAttribute | undefined,
		gsiAttr: AttributeDataType,
		opt: { [key: string]: any } = {}
	): THREE.BufferAttribute {
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
			attr = new THREE.BufferAttribute(gsiAttr.array, gsiAttr.itemSize, gsiAttr.normalized)

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
					// Default value - from three.js, BufferAttribute.js
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
				attr.usage = THREE.StaticDrawUsage || GL_STATIC_DRAW
				break
			case 'DYNAMIC_DRAW':
				attr.usage = THREE.DynamicDrawUsage || GL_DYNAMIC_DRAW
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
		gl2Matr: THREE.Material | undefined,
		gsiMatr: MatrBaseDataType,
		opt: { [key: string]: any }
	): THREE.Material {
		if (gl2Matr === undefined) {
			switch (gsiMatr.type) {
				case 'basic':
					console.error('Use MatrUnlit instead of MatrBasic')
					gl2Matr = new PrgBasicMaterial(gsiMatr as MatrUnlitDataType)
					break
				case 'point':
					gl2Matr = new PrgPointMaterial(gsiMatr as MatrPointDataType)
					break
				case 'unlit':
					gl2Matr = new PrgBasicMaterial(gsiMatr as MatrUnlitDataType)
					break
				case 'pbr':
					gl2Matr = new PrgStandardMaterial(gsiMatr as MatrPbrDataType)
					break
				case 'sprite':
					gl2Matr = new PrgSpriteMaterial(gsiMatr as MatrSpriteDataType)
					break
				default:
					console.error('Unsupported GSI::Material Type: ' + gsiMatr.type)
					gl2Matr = new PrgBasicMaterial(gsiMatr as MatrUnlitDataType)
			}
		}

		gl2Matr.name = gsiMatr.name || 'GSI-GL2-Matr'
		gl2Matr.visible = gsiMatr.visible

		// face culling
		switch (gsiMatr.side) {
			case 'front':
				gl2Matr.side = THREE.FrontSide
				break
			case 'back':
				gl2Matr.side = THREE.BackSide
				break
			case 'double':
				gl2Matr.side = THREE.DoubleSide
				break
			default:
				throw new Error('Unsupported value of GSI::Matr.side: ' + gsiMatr.side)
		}

		// trans / blending
		switch (gsiMatr.alphaMode) {
			case 'OPAQUE':
				gl2Matr.transparent = false
				gl2Matr.depthTest = true
				gl2Matr.depthWrite = true
				gl2Matr.blending = THREE.NoBlending
				break
			case 'MASK':
				gl2Matr.transparent = false
				gl2Matr.depthTest = true
				gl2Matr.depthWrite = true
				gl2Matr.blending = THREE.NoBlending
				gl2Matr.alphaTest = gsiMatr.alphaCutoff
				break
			case 'BLEND':
				gl2Matr.transparent = true
				gl2Matr.depthTest = true
				gl2Matr.depthWrite = false
				gl2Matr.blending = THREE.NormalBlending
				break
			case 'BLEND_ADD':
				gl2Matr.transparent = true
				gl2Matr.depthTest = true
				gl2Matr.depthWrite = false
				gl2Matr.blending = THREE.AdditiveBlending
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
				gl2Matr['defines'] = convDefines(gl2Matr['defines'], matr.defines)
				gl2Matr['uniforms'] = this.convUniforms(gl2Matr['uniforms'], matr.uniforms)
				this.assignPbrParams(gl2Matr, matr)
				break
			}

			case 'unlit': {
				const matr = gsiMatr as MatrUnlitDataType
				gl2Matr.opacity = matr.opacity
				gl2Matr['color'] = this.convColor(gl2Matr['color'], matr.baseColorFactor)
				gl2Matr['map'] = this.convTexture(gl2Matr['map'], matr.baseColorTexture, true)
				gl2Matr['defines'] = convDefines(gl2Matr['defines'], matr.defines)
				gl2Matr['uniforms'] = this.convUniforms(gl2Matr['uniforms'], matr.uniforms)
				break
			}

			case 'point': {
				const matr = gsiMatr as MatrPointDataType
				gl2Matr.opacity = matr.opacity
				gl2Matr['size'] = matr.size
				gl2Matr['sizeAttenuation'] = matr.sizeAttenuation
				gl2Matr['color'] = this.convColor(gl2Matr['color'], matr.baseColorFactor)
				gl2Matr['map'] = this.convTexture(gl2Matr['map'], matr.baseColorTexture, true)
				gl2Matr['defines'] = convDefines(gl2Matr['defines'], matr.defines)
				gl2Matr['uniforms'] = this.convUniforms(gl2Matr['uniforms'], matr.uniforms)
				break
			}

			case 'sprite': {
				const threeM = gl2Matr as THREE.ShaderMaterial
				const matr = gsiMatr as MatrSpriteDataType
				threeM.uniforms.opacity.value = matr.opacity
				threeM.opacity = matr.opacity
				threeM.uniforms['uCenter'].value.copy(matr.center)
				threeM.uniforms['uSize'].value.copy(matr.size)
				threeM.uniforms['uRotation'].value = matr.rotation
				threeM.uniforms['diffuse'].value = this.convColor(threeM['color'], matr.baseColorFactor)
				threeM.uniforms['map'].value = this.convTexture(threeM['map'], matr.baseColorTexture, true)
				threeM.defines['USE_SIZEATTENUATION'] = !!matr.sizeAttenuation
				threeM.defines['USE_MAP'] = !!matr.baseColorTexture
				break
			}

			default:
				throw new Error('Unsupported value of GSI::Matr.type: ' + gsiMatr.type)
		}

		gl2Matr.depthTest = gsiMatr.depthTest ? true : false

		return gl2Matr
	}

	/**
	 * @todo 缓存
	 * @param gl2Color
	 * @param gsiColor
	 */
	private convColor(gl2Color: THREE.Color | undefined, gsiColor: ColorLike | string): THREE.Color {
		if (gl2Color === undefined) {
			if (typeof gsiColor === 'string') {
				gl2Color = new THREE.Color(gsiColor)
			} else {
				gl2Color = new THREE.Color(gsiColor.r, gsiColor.g, gsiColor.b)
			}
		} else {
			if (typeof gsiColor === 'string') {
				gl2Color.set(gsiColor)
			} else {
				gl2Color.setRGB(gsiColor.r, gsiColor.g, gsiColor.b)
			}
		}
		return gl2Color
	}

	private convTexture(
		gl2Texture: THREE.Texture | undefined,
		gsiTexture: TextureType | undefined,
		resourceCache = true
	): THREE.Texture | null {
		if (!gsiTexture) return null

		const texture = this._textureMap.get(gsiTexture)

		gl2Texture = texture

		if (!gl2Texture) {
			/**
			 * @QianXun @limit ImageData必须是Non-Texture-Shared
			 */
			const imgData = gsiTexture.image

			// Create Texture via various image types
			if (imgData.image) {
				if (imgData.image instanceof HTMLElement) {
					// HTMLElement
					if (imgData.image instanceof HTMLCanvasElement) {
						gl2Texture = new THREE.CanvasTexture(imgData.image)
					} else if (imgData.image instanceof HTMLVideoElement) {
						/** @TODO 在GL2中需先解决每次uploadTexture都会创建一个 `dispose` listener 的问题 */
						console.warn(
							'GSI::Texture::image - type `HTMLVideoElement` is not supported, use normal texture instead. '
						)
						gl2Texture = new THREE.VideoTexture(imgData.image)
						const tex = gl2Texture as THREE.VideoTexture
						imgData.image.addEventListener('play', () => {
							tex.needsUpdate = true
						})

						// gl2Texture = new THREE.VideoTexture(imgData.image)
						// console.log('gl2Texture', gl2Texture)
						// const tex = gl2Texture as THREE.VideoTexture
						// imgData.image.addEventListener('play', () => {
						// 	tex['interval'] = setInterval(() => {
						// 		tex.needsUpdate = true
						// 	}, 16)
						// 	tex.addEventListener('dispose', () => {
						// 		clearInterval(tex['interval'])
						// 	})
						// })
					} else {
						gl2Texture = new THREE.Texture(imgData.image)
					}
				} else if (isTypedArray(imgData.image)) {
					// TypedArray, must have .width & .height properties
					if (!imgData.width || !imgData.height) {
						console.warn(
							'GSI::Texture - image missing .width & .height property, using 256 * 256 instead'
						)
						imgData.width = imgData.height = 256
					}
					gl2Texture = new THREE.DataTexture(
						imgData.image as TypedArray,
						imgData.width,
						imgData.height
					)
				} else if (imgData.image instanceof DataView) {
					console.error('GSI::Texture::image - type `DataView` is not supported')
					gl2Texture = new THREE.Texture()
				} else {
					console.error('GSI::Texture - invalid image type', gsiTexture)
					gl2Texture = new THREE.Texture()
				}
			} else if (imgData.uri) {
				// URI
				gl2Texture = texLoader.load(imgData.uri)
			} else {
				console.error(
					'GSI::Texture - image has no .uri or .image property, use default texture instead',
					gsiTexture
				)
				gl2Texture = new THREE.Texture()
			}
		}

		// Assign properties
		if (!gsiTexture.sampler) {
			console.warn('GSI::Texture - sampler property is missing, use default instead')
			gsiTexture.sampler = {}
		}

		const sampler = gsiTexture.sampler
		switch (sampler.magFilter) {
			case 'NEAREST':
				gl2Texture.magFilter = THREE.NearestFilter
				break
			case 'LINEAR':
				gl2Texture.magFilter = THREE.LinearFilter
				break
			default:
				gl2Texture.magFilter = THREE.NearestFilter
		}

		// Set mipmaps to false first
		gl2Texture.generateMipmaps = false

		switch (sampler.minFilter) {
			case 'NEAREST':
				gl2Texture.minFilter = THREE.NearestFilter
				break
			case 'LINEAR':
				gl2Texture.minFilter = THREE.LinearFilter
				break
			case 'NEAREST_MIPMAP_NEAREST':
				gl2Texture.minFilter = THREE.NearestMipMapNearestFilter
				// WebGL generateMipmaps
				if (!gl2Texture.generateMipmaps) gl2Texture.generateMipmaps = true
				break
			case 'LINEAR_MIPMAP_NEAREST':
				gl2Texture.minFilter = THREE.LinearMipMapNearestFilter
				// WebGL generateMipmaps
				if (!gl2Texture.generateMipmaps) gl2Texture.generateMipmaps = true
				break
			case 'NEAREST_MIPMAP_LINEAR':
				gl2Texture.minFilter = THREE.NearestMipMapLinearFilter
				// WebGL generateMipmaps
				if (!gl2Texture.generateMipmaps) gl2Texture.generateMipmaps = true
				break
			case 'LINEAR_MIPMAP_LINEAR':
				gl2Texture.minFilter = THREE.LinearMipMapLinearFilter
				// WebGL generateMipmaps
				if (!gl2Texture.generateMipmaps) gl2Texture.generateMipmaps = true
				break
			default:
				// throw new Error('Invalid value of GSISampler.minFilter: ' + sampler.minFilter)
				gl2Texture.minFilter = THREE.NearestFilter
		}

		switch (sampler.wrapS) {
			case 'CLAMP_TO_EDGE':
				gl2Texture.wrapS = THREE.ClampToEdgeWrapping
				break
			case 'MIRRORED_REPEAT':
				gl2Texture.wrapS = THREE.MirroredRepeatWrapping
				break
			case 'REPEAT':
				gl2Texture.wrapS = THREE.RepeatWrapping
				break
			default:
				// throw new Error('Invalid value of GSISampler.wrapS: ' + sampler.wrapS)
				gl2Texture.wrapS = THREE.ClampToEdgeWrapping
		}

		switch (sampler.wrapT) {
			case 'CLAMP_TO_EDGE':
				gl2Texture.wrapT = THREE.ClampToEdgeWrapping
				break
			case 'MIRRORED_REPEAT':
				gl2Texture.wrapT = THREE.MirroredRepeatWrapping
				break
			case 'REPEAT':
				gl2Texture.wrapT = THREE.RepeatWrapping
				break
			default:
				// throw new Error('Invalid value of GSISampler.wrapT: ' + sampler.wrapT)
				gl2Texture.wrapT = THREE.ClampToEdgeWrapping
		}

		// anisotropy
		if (sampler.anisotropy === undefined) sampler.anisotropy = 1

		if (gl2Texture.anisotropy !== sampler.anisotropy) gl2Texture.anisotropy = sampler.anisotropy

		// flipY
		gl2Texture.flipY = gsiTexture.image.flipY || false

		// transform

		// Add to cached map
		// if (!this._textureMap.has(gsiTexture)) {
		this._textureMap.set(gsiTexture, gl2Texture)
		// }

		// Mark as used resource
		if (resourceCache) this._usedResources.add(gl2Texture)

		return gl2Texture
	}

	private convUniforms(
		gl2Uniforms: { [name: string]: any } | undefined,
		gsiUniforms: { [name: string]: UniformDataType } | undefined
	): any {
		if (gl2Uniforms === undefined) gl2Uniforms = {}

		if (gsiUniforms === undefined) return gl2Uniforms

		for (const key in gsiUniforms) {
			const elem = gsiUniforms[key]
			if (elem !== undefined) {
				this.assignUniformVals(gl2Uniforms, key, elem)
			}
		}
		return gl2Uniforms
	}

	private assignPbrParams(gl2Matr: THREE.Material, gsiMatr: MatrPbrDataType) {
		gl2Matr.opacity = (gsiMatr as MatrPbrDataType).opacity
		gl2Matr['color'] = this.convColor(
			gl2Matr['color'],
			(gsiMatr as MatrPbrDataType).baseColorFactor
		)
		gl2Matr['emissive'] = this.convColor(
			gl2Matr['emissive'],
			(gsiMatr as MatrPbrDataType).emissiveFactor
		)
		gl2Matr['metalness'] = (gsiMatr as MatrPbrDataType).metallicFactor
		gl2Matr['roughness'] = (gsiMatr as MatrPbrDataType).roughnessFactor

		/**
		 * @todo metallicRoughnessTexture 需要对 three 的 PBR 做一些修改
		 * @QianXun 根据three的gltf loader实现，暂时将这个texture同时附给两个属性
		 * https://threejs.org/examples/?q=gltf#webgl_loader_gltf_extensions
		 */
		gl2Matr['metalnessMap'] = this.convTexture(
			gl2Matr['metalnessMap'],
			(gsiMatr as MatrPbrDataType).metallicRoughnessTexture,
			true
		)
		gl2Matr['roughnessMap'] = this.convTexture(
			gl2Matr['roughnessMap'],
			(gsiMatr as MatrPbrDataType).metallicRoughnessTexture,
			true
		)
		gl2Matr['map'] = this.convTexture(
			gl2Matr['map'],
			(gsiMatr as MatrPbrDataType).baseColorTexture,
			true
		)
		gl2Matr['emissiveMap'] = this.convTexture(
			gl2Matr['emissiveMap'],
			(gsiMatr as MatrPbrDataType).emissiveTexture,
			true
		)
		gl2Matr['normalMap'] = this.convTexture(
			gl2Matr['normalMap'],
			(gsiMatr as MatrPbrDataType).normalTexture,
			true
		)
		gl2Matr['aoMap'] = this.convTexture(
			gl2Matr['aoMap'],
			(gsiMatr as MatrPbrDataType).occlusionTexture,
			true
		)
	}

	private assignUniformVals(
		gl2Uniforms: { [name: string]: any },
		key: string,
		gsiUniform: UniformDataType
	) {
		const val = gsiUniform.value as any
		const type = gsiUniform.type
		if (val === undefined) {
			return
		}
		if (typeof val === 'number') {
			if (gl2Uniforms[key] === undefined) {
				gl2Uniforms[key] = { value: val }
			} else {
				gl2Uniforms[key].value = val
			}
		} else if (Array.isArray(val)) {
			if (type === 'float') {
				// 识别到普通的float array
				if (gl2Uniforms[key] === undefined) {
					gl2Uniforms[key] = { value: val }
				} else {
					gl2Uniforms[key].value = val
				}
			} else if (gl2Uniforms[key] === undefined) {
				gl2Uniforms[key] = { value: this.arrayToGL2(undefined, val) }
			} else {
				gl2Uniforms[key].value = this.arrayToGL2(gl2Uniforms[key].value, val)
			}
		} else if (val['w'] !== undefined) {
			if (gl2Uniforms[key] === undefined) {
				gl2Uniforms[key] = { value: new THREE.Vector4().copy(val) }
			} else {
				;(gl2Uniforms[key].value as THREE.Vector4).copy(val)
			}
		} else if (val['z'] !== undefined) {
			if (gl2Uniforms[key] === undefined) {
				gl2Uniforms[key] = { value: new THREE.Vector3().copy(val) }
			} else {
				;(gl2Uniforms[key].value as THREE.Vector3).copy(val)
			}
		} else if (val['y'] !== undefined) {
			if (gl2Uniforms[key] === undefined) {
				gl2Uniforms[key] = { value: new THREE.Vector2().copy(val) }
			} else {
				;(gl2Uniforms[key].value as THREE.Vector2).copy(val)
			}
		} else if (val['r'] !== undefined) {
			if (gl2Uniforms[key] === undefined) {
				gl2Uniforms[key] = { value: new THREE.Color().copy(val) }
			} else {
				;(gl2Uniforms[key].value as THREE.Color).copy(val)
			}
		} else if (val.image) {
			if (gl2Uniforms[key] === undefined) {
				gl2Uniforms[key] = { value: this.convTexture(undefined, val as TextureType, true) }
			} else {
				gl2Uniforms[key].value = this.convTexture(gl2Uniforms[key].value, val as TextureType, true)
			}
		} else if (val.position && val.rotation && val.scale) {
			/**
			 * @note @performance 这里每一帧计算matrix会消耗性能
			 */
			const elements = val.matrix
			if (
				gl2Uniforms[key] === undefined ||
				!elementsEquals(gl2Uniforms[key].value.elements, elements)
			) {
				let mat
				if (elements.length === 9) {
					mat = new THREE.Matrix3().fromArray(elements)
				} else if (elements.length === 16) {
					mat = new THREE.Matrix4().fromArray(elements)
				} else {
					throw new Error('Invalid Matrix elements length')
				}
				gl2Uniforms[key] = { value: mat }
			}
		} else {
			console.error(`GSI::PrgMatr::Uniforms unsupported uniform type ${val}`)
		}
	}

	private arrayToGL2(
		src: any[] | THREE.Matrix3 | THREE.Matrix4 | undefined,
		val: any[]
	): any[] | THREE.Matrix3 | THREE.Matrix4 {
		const l = val.length
		let result
		if (l === 9 && val.every((v) => typeof v === 'number')) {
			// 	Matrix3数组
			if (src === undefined) {
				result = new THREE.Matrix3().fromArray(val)
			} else {
				result = (src as THREE.Matrix3).fromArray(val)
			}
			return result
		}
		if (l === 16 && val.every((v) => typeof v === 'number')) {
			// Matrix4数组
			if (src === undefined) {
				result = new THREE.Matrix4().fromArray(val)
			} else {
				result = (src as THREE.Matrix4).fromArray(val)
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
							result[i] = new THREE.Matrix3().fromArray(v)
						} else {
							s.fromArray(v)
						}
						break
					case 16:
						if (s === undefined) {
							result[i] = new THREE.Matrix4().fromArray(v)
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
					result[i] = new THREE.Vector4().copy(v)
				} else {
					s.copy(v)
				}
			} else if (v.z !== undefined) {
				if (s === undefined) {
					result[i] = new THREE.Vector3().copy(v)
				} else {
					s.copy(v)
				}
			} else if (v.y !== undefined) {
				if (s === undefined) {
					result[i] = new THREE.Vector2().copy(v)
				} else {
					s.copy(v)
				}
			} else if (v.r !== undefined) {
				if (s === undefined) {
					result[i] = new THREE.Color().copy(v)
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

	private transformEquals(gl2Mesh: RenderableObject3D, gsiMesh: MeshDataType): boolean {
		if (gl2Mesh._tfPos === undefined) {
			gl2Mesh._tfPos = new Vector3().copy(
				(gsiMesh.transform.position ?? this._emptyVec3) as Vector3
			)
		}
		if (gl2Mesh._tfRot === undefined) {
			gl2Mesh._tfRot = new Euler().copy((gsiMesh.transform.rotation ?? this._emptyEuler) as Euler)
		}
		if (gl2Mesh._tfScl === undefined) {
			gl2Mesh._tfScl = new Vector3().copy((gsiMesh.transform.scale ?? this._emptyVec3) as Vector3)
		}

		if (!gsiMesh.transform.position || !gsiMesh.transform.rotation || !gsiMesh.transform.scale) {
			return matrix4Equals(gl2Mesh.matrix.elements, gsiMesh.transform.matrix)
		}

		const p1 = gl2Mesh._tfPos
		const p2 = gsiMesh.transform.position
		const e1 = gl2Mesh._tfRot
		const e2 = gsiMesh.transform.rotation
		const s1 = gl2Mesh._tfScl
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
