/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { PrgStandardMaterial } from './PrgStandardMaterial'
import { PrgBasicMaterial } from './PrgBasicMaterial'
import { PrgPointMaterial } from './PrgPointMaterial'

import {
	MeshDataType,
	GeomDataType,
	Texture,
	CubeTexture,
	AttributeDataType,
	MatrPbrDataType,
	MatrUnlitDataType,
	MatrPointDataType,
	MatrSpriteDataType,
	MatrBaseDataType,
	ColorRGB,
	GL_STATIC_DRAW,
	GL_DYNAMIC_DRAW,
	Int,
	//
	DISPOSED,
	isTexture,
	isCubeTexture,
	isTypedArray,
	isRenderableMesh,
	isDISPOSED,
} from '@gs.i/schema-scene'

import type { Converter } from '@gs.i/schema-converter'
import { MatProcessor } from '@gs.i/processor-matrix'
import { BoundingProcessor } from '@gs.i/processor-bound'
import { diffSetsFast, diffSetsFastAndToArray, GraphProcessor } from '@gs.i/processor-graph'
import { specifyMesh, specifyTexture } from '@gs.i/processor-specify'
import { traverse, flatten } from '@gs.i/utils-traverse'

import { syncMaterial } from './syncMaterial'
import { syncTexture } from './syncTexture'

// import * as THREE from 'three-lite'
import {
	Object3D,
	BufferGeometry,
	Material,
	TextureLoader,
	Box3,
	Sphere,
	Texture as ThreeTexture,
	BufferAttribute,
	TrianglesDrawMode,
	StaticDrawUsage,
	DynamicDrawUsage,
	Color,
	CanvasTexture,
	DataTexture,
} from 'three-lite'
import { PrgSpriteMaterial } from './PrgSpriteMaterial'
import { sealTransform } from './utils'

export const DefaultConfig = {
	/**
	 * 是否启用Mesh frustumCulled属性，以及隐藏被视锥体剔除的Mesh
	 * @deprecated
	 * @note should be done by render engine or upstream processors. not here
	 */
	// meshFrustumCulling: true,

	/**
	 * #### whether to decompose matrix into {position,quaternion,scale}
	 * - if you don't transform the converted THREE.Object3D, you should leave this disabled
	 *
	 * #### if you keep this disabled (by default):
	 * - Object3D.{position,quaternion,scale} will be initial values (0,0,0 or 1,1,1) and should not be used
	 * - Object3D.matrix will be calculated from gsi-matrix-processor
	 * - Object3D.matrixAutoUpdate will be set to `false`, so that three.js won't automatically update the matrix from initial values.
	 * - if you use `Object3D.updateMatrixWorld(true)` (force update), all matrices will be wrong
	 * - if you use `Object3D.updateMatrix()` (manual update), that matrix will be wrong
	 *
	 * #### if you enable this:
	 * - Object3D.{position,quaternion,scale} will be set correctly
	 * - Object3D.matrix will be left undefined
	 * - everything else will be handled by three the usual way.
	 *
	 * #### so:
	 * - if you want to transform the converted Object3D, you should enable this
	 * - then three.js will compose the matrix again (backwards)
	 * - it is more efficient to use the matrix directly without decompose-compose
	 *
	 * @default false
	 */
	decomposeMatrix: false,

	/**
	 * #### whether to use GSI frustum culling instead of three.js
	 * - three.js uses BoundingSphere to do frustum culling
	 * - but the generation of BoundingSphere is not efficient
	 * - also you have to update the bounding sphere manually every time you changed the geometry
	 *
	 * #### if enabled:
	 * - all converted `Object3D.frustumCulled` will be set to `false`, so that three.js will skip checking
	 * - converter will use processor-culling to check every time `convert` is called
	 * - if mesh culled, the converted `Object3D.visible` will be set to `false`
	 */
	overrideFrustumCulling: false,

	/**
	 * automatic dispose three.js objects if the GSI counterpart is removed from the tree
	 *
	 * @TODO @FIXME this is not right
	 *
	 * #### if enabled
	 * - the converter will assume you always convert the same scene-graph (with the same root node)
	 * - every time you convert the tree, converter will find out resources you removed from that tree.
	 * - and call the `.dispose()` method of the converted object.
	 *
	 * #### if disabled: @TODO not implemented
	 * - you can pass any mesh, tree, sub-tree to `.convert` anytime. old resources won't be affected
	 * - you should dispose the converted three.js object manually if it's not used anymore
	 * - all gsi objects will be store as weak reference because we only care about added ones not removed ones.
	 */
	autoDisposeThreeObject: true,

	/**
	 * @note safe to share globally @simon
	 */
	matrixProcessor: new MatProcessor(),
	/**
	 * @note safe to share globally @simon
	 */
	boundingProcessor: new BoundingProcessor(),
	/**
	 * @note safe to share globally @simon
	 */
	graphProcessor: new GraphProcessor(),
}

export type ConverterConfig = Partial<typeof DefaultConfig>

/**
 * 生成Three Lite Scene的Converter
 * @authors @Simon @QianXun
 * @note 底层渲染器通常需要用户主动资源回收，单向数据流中，用户只看到数据变化不看到底层资源的增减，因此可以提供自动回收机制
 */
export class ThreeLiteConverter implements Converter {
	/**
	 * type
	 */
	readonly type = 'ThreeLiteConverter'

	/**
	 * config
	 */
	config: Required<ConverterConfig>

	/**
	 * Scene info
	 */
	info = {
		renderableCount: 0,
	}

	// #region id generator

	/**
	 * 这个计数器配合 WeakMap 一起使用作为**局部**唯一ID，可以避免多个实例存在时的撞表问题。
	 *
	 * 所有 id 都从 WeakMap 得到，一个 key 在一个实例中的 id 是唯一的
	 *
	 * conv 需要保存上一次的输入结构，以及 conv 结果，但是不需要保存输入的对象
	 */
	private _counter = 0
	private _ids = new WeakMap<any, Int>()

	/**
	 * get a local id for the given object
	 * - this id is comparable **only** if generated by the same instance
	 */
	getID(o: Record<string, unknown>): Int {
		let id = this._ids.get(o)
		if (id === undefined) {
			id = this._counter++
			this._ids.set(o, id)
		}

		if (id >= 9007199254740990) throw 'ID exceeds MAX_SAFE_INTEGER'

		return id
	}

	// #endregion

	// #region local caches

	/**
	 * handled resources (GSI side) from last convert call
	 *
	 * @note refresh every `convert`
	 */
	private _cachedResources = getResourcesFlat([]) // init with a empty node
	// private _ar0 = []
	// private _ar1 = []
	// private _ar2 = []
	// private _ar3 = []
	// private _cachedSnapshot: SnapShot

	/**
	 * @note
	 * 		Separate type for better v8 performance.
	 * 		although it looks no difference in test?
	 * @todo test if this is necessary, maybe change to back to one single weakmap
	 */
	// @note optimize for hidden classes
	// private _threeObjects = new WeakMap<any, any>()
	// TODO separate renderable mesh and node for performance
	// private _threeObject3ds = new WeakMap<MeshDataType, Object3D>()
	private _threeMesh = new WeakMap<MeshDataType, RenderableObject3D | Object3D>()
	private _threeGeom = new WeakMap<GeomDataType, BufferGeometry>()
	private _threeAttr = new WeakMap<AttributeDataType, BufferAttribute>()
	private _threeTex = new WeakMap<Texture | CubeTexture, ThreeTexture>()
	// TODO use GsiMatr instead because MatrBaseDataType can not be used alone
	private _threeMatr = new WeakMap<GsiMatr | MatrBaseDataType, Material>()
	private _threeColor = new WeakMap<ColorRGB, Color>()

	// private _committedVersions = new WeakMap<any, number>()
	private _committedAttr = new WeakMap<AttributeDataType, Int>()
	// private _committedMatr = new WeakMap<GsiMatr | MatrBaseDataType, Int>()
	// private _committedTex = new WeakMap<Texture | CubeTexture, Int>()

	// #endregion

	constructor(config: ConverterConfig = {}) {
		this.config = {
			...config,
			...DefaultConfig,
		}

		// this._cachedSnapshot = this.config.graphProcessor.snapshot() // init with a empty node
	}

	convert(root: MeshDataType): Object3D {
		/**
		 * @note It is not the most efficient way to get all the changed components and pre-handle them
		 * 		 It is quicker to just handle everything during one traversal
		 * 		 But that will make this process unlikely to be re-used to a different backend
		 *		 Also worth to notice that these components can be used multiple times in a tree
		 */

		// @note
		// 		optimize with flatten tree
		// 		it's quite expensive to traverse a tree multiple times
		const flatScene = flatten(root)

		// check resources that require special handling
		// #resource-stage

		{
			// const resources = getResources(root)
			const resources = getResourcesFlat(flatScene)

			// @note not necessary to check added resources,
			// 		 because it's not practical to separate the creating and updating of resources

			// const added = {
			// 	materials: diffSetsFast(resources.materials, this._cachedResources.materials),
			// 	geometries: diffSetsFast(resources.geometries, this._cachedResources.geometries),
			// 	attributes: diffSetsFast(resources.attributes, this._cachedResources.attributes),
			// 	textures: diffSetsFast(resources.textures, this._cachedResources.textures),
			// }

			// const removed = {
			// 	materials: diffSetsFast(this._cachedResources.materials, resources.materials),
			// 	geometries: diffSetsFast(this._cachedResources.geometries, resources.geometries),
			// 	attributes: diffSetsFast(this._cachedResources.attributes, resources.attributes),
			// 	textures: diffSetsFast(this._cachedResources.textures, resources.textures),
			// }

			// const materials = this._ar0
			// const geometries = this._ar1
			// const attributes = this._ar2
			// const textures = this._ar3
			// materials.length = 0
			// geometries.length = 0
			// attributes.length = 0
			// textures.length = 0

			// const removed = {
			// 	materials: diffSetsFastAndToArray(
			// 		this._cachedResources.materials,
			// 		resources.materials,
			// 		this._ar0
			// 	),
			// 	geometries: diffSetsFastAndToArray(
			// 		this._cachedResources.geometries,
			// 		resources.geometries,
			// 		this._ar1
			// 	),
			// 	attributes: diffSetsFastAndToArray(
			// 		this._cachedResources.attributes,
			// 		resources.attributes,
			// 		this._ar2
			// 	),
			// 	textures: diffSetsFastAndToArray(
			// 		this._cachedResources.textures,
			// 		resources.textures,
			// 		this._ar3
			// 	),
			// }

			const removed = {
				materials: this._cachedResources.materials,
				geometries: this._cachedResources.geometries,
				attributes: this._cachedResources.attributes,
				textures: this._cachedResources.textures,
			}

			// create newly added resources
			// &
			// update resources
			// &
			// put everything in cache

			// for (let i = 0; i < textures.length; i++) {
			// 	const texture = textures[i]
			// 	if (isCubeTexture(texture)) throw 'CubeTexture not implemented yet'
			// 	this.convTexture(texture)
			// }
			// for (let i = 0; i < attributes.length; i++) {
			// 	this.convAttr(attributes[i])
			// }
			// for (let i = 0; i < geometries.length; i++) {
			// 	this.convGeom(geometries[i])
			// }
			// for (let i = 0; i < materials.length; i++) {
			// 	this.convMatr(materials[i])
			// }

			resources.textures.forEach((texture) => {
				if (isCubeTexture(texture)) throw 'CubeTexture not implemented yet'
				this.convTexture(texture)
				removed.textures.delete(texture)
			})
			resources.attributes.forEach((attribute) => {
				this.convAttr(attribute)
				removed.attributes.delete(attribute)
			})
			resources.geometries.forEach((geometry) => {
				this.convGeom(geometry)
				removed.geometries.delete(geometry)
			})
			resources.materials.forEach((material) => {
				this.convMatr(material)
				removed.materials.delete(material)
			})

			// auto dispose

			if (this.config.autoDisposeThreeObject) {
				removed.textures.forEach((texture) => {
					this._threeTex.get(texture)?.dispose()
				})
				// @note three only dispose geom
				// removed.attributes.forEach((attribute) => {
				// 	this._threeAttr.get(attribute)?.dispose()
				// })
				removed.geometries.forEach((geometry) => {
					this._threeGeom.get(geometry)?.dispose()
				})
				removed.materials.forEach((material) => {
					this._threeMatr.get(material)?.dispose()
				})
			} else {
				console.warn(
					'autoDisposeThreeObject=false is not tested yet, may cause memory overflow, set it true for now'
				)
			}

			// update cache
			this._cachedResources = resources
		}

		// check the tree
		// @note it seems unnecessary to handle any nodes change before assemble it
		// 		 since we don't need to take care of any changed stuff here

		{
			//
			// const snapshot = this.config.graphProcessor.snapshot(root, true)
			// const changed = this.config.graphProcessor.diff(this._cachedSnapshot, snapshot)
			//
			// const nodes = flatten(root) // array
			// const added = diffWeakSets(nodes, this._cachedNodes)
			//
			// create newly added Object3D
			// ignore removed objects (no needs to recovery)
			// ignore moved objects
			// copy all the matrix? maybe check transform version first?
			// if moved or transform changed, set matrixWorldNeedsUpdate to true?
			// or maybe just let matrixProcessor handle it.
			// reset all the matrix worldMatrix visible extensions
			// update cache (delete reference)
		}

		// assemble the tree
		// - handle all the nodes separately and add their children
		// - use post-order traversal to make sure all the children are created before added
		// or
		// - handle all the nodes separately and add them to their parent
		// - use pre-order traversal to make sure all the parents are created before added to

		{
			const rootThree = this.convMesh(root)
			rootThree.children = []
			// pre-order traversal, parents are handled before children
			// traverse(root, (node, parent) => {
			// 	// console.log('handle node')
			// 	// skip root node
			// 	if (parent) {
			// 		// @note parent is cached before
			// 		const parentThree = this._threeMesh.get(parent) as Object3D
			// 		const currentThree = this.convMesh(node)
			// 		// clear current children to handle removed nodes
			// 		currentThree.children = []
			// 		parentThree.children.push(currentThree)
			// 	}
			// })

			for (let i = 0; i < flatScene.length; i++) {
				const node = flatScene[i]
				const parent = node.parent
				// skip root node
				if (parent) {
					// @note parent is cached before
					const parentThree = this._threeMesh.get(parent) as Object3D
					const currentThree = this.convMesh(node)
					// clear current children to handle removed nodes
					currentThree.children = []
					parentThree.children.push(currentThree)
				}
			}

			return rootThree
		}
	}

	// #region object converters

	/**
	 * @note run after all the geometries and materials are cached
	 */
	private convMesh(gsiMesh: MeshDataType): RenderableObject3D | Object3D {
		let threeMesh = this._threeMesh.get(gsiMesh) as RenderableObject3D | Object3D

		// create
		if (!threeMesh) {
			if (isRenderableMesh(gsiMesh)) {
				threeMesh = new RenderableObject3D()

				// Assign mode
				switch (gsiMesh.geometry.mode) {
					case 'TRIANGLES':
						threeMesh['isMesh'] = true
						threeMesh['drawMode'] = TrianglesDrawMode
						break

					case 'SPRITE':
						threeMesh['isMesh'] = true
						threeMesh['drawMode'] = TrianglesDrawMode
						break

					case 'POINTS':
						threeMesh['isPoints'] = true
						break

					case 'LINES':
						threeMesh['isLine'] = true
						threeMesh['isLineSegments'] = true
						break

					default:
						throw 'Invalid value for GSIGeom.mode: ' + gsiMesh.geometry.mode
				}
				this.info.renderableCount++
			} else {
				threeMesh = new Object3D()
			}

			if (!this.config.decomposeMatrix) {
				// @note avoid user mistakes, if matrix is handled by gsi processor, three.js methods should be disabled
				sealTransform(threeMesh)
			} else {
				// TODO implement this!
				// decompose the matrix at creation, or just set TRS if given
				// do not update matrix anymore, only async TRS if given
				// let three.js do all the job
				throw 'decomposeMatrix is not implemented yet'
			}

			// update cache
			this._threeMesh.set(gsiMesh, threeMesh)
		}
		// sync
		{
			if (isRenderableMesh(gsiMesh)) {
				// threeMesh is a RenderableObject3D

				const geometry = this._threeGeom.get(gsiMesh.geometry) as BufferGeometry
				const material = this._threeMatr.get(gsiMesh.material) as Material

				threeMesh['material'] = material
				threeMesh['geometry'] = geometry

				if (gsiMesh.geometry.attributes.uv) {
					// @note it's safe to assume `defines` was created above
					;(material['defines'] as any).GSI_USE_UV = true
				}
			}

			// @note three doesn't use localMatrix at all. it's only for generating worldMatrix
			// threeMesh.matrix.elements = this.config.matrixProcessor.getLocalMatrix(gsiMesh)
			threeMesh.matrixWorld.elements = this.config.matrixProcessor.getWorldMatrix(gsiMesh)
		}

		return threeMesh
	}

	/**
	 * @note run after all the attributes are cached
	 */
	private convGeom(gsiGeom: GeomDataType): BufferGeometry {
		let threeGeometry = this._threeGeom.get(gsiGeom) as BufferGeometry

		// create
		if (!threeGeometry) {
			threeGeometry = new BufferGeometry()

			// @note override three.js bounding logic.
			// 		 three don't have default bounding and will compute bounding the first time used
			// 		 GSI will always update the latest bounding
			threeGeometry.boundingBox = new Box3()
			threeGeometry.boundingSphere = new Sphere()

			// TODO sprite, maybe only accept generated geom here. move generation out?

			// update cache
			this._threeGeom.set(gsiGeom, threeGeometry)
		}
		// sync
		{
			// Assign gsi attributes

			// fast clear so that threeGeometry won't keep attributes that deleted from gsi
			threeGeometry.attributes = {}
			threeGeometry.index = null

			// re-assign
			for (const key in gsiGeom.attributes) {
				const gsiAttr = gsiGeom.attributes[key]
				// @note it is safe to assume that attributes were handled during #resource-stage
				const threeAttribute = this._threeAttr.get(gsiAttr) as BufferAttribute

				threeGeometry.attributes[key] = threeAttribute
			}

			if (gsiGeom.indices) {
				const threeAttribute = this._threeAttr.get(gsiGeom.indices) as BufferAttribute
				threeGeometry.index = threeAttribute
			} else {
				threeGeometry.index = null
			}

			// drawRange

			if (
				gsiGeom.extensions?.EXT_geometry_range?.drawRange?.start !== undefined &&
				gsiGeom.extensions.EXT_geometry_range.drawRange.count !== undefined
			) {
				threeGeometry.setDrawRange(
					gsiGeom.extensions.EXT_geometry_range.drawRange.start,
					gsiGeom.extensions.EXT_geometry_range.drawRange.count
				)
			}

			// bounding

			if (gsiGeom.extensions?.EXT_geometry_bounds?.box) {
				// user custom bounds override internal bounds
				// TODO three.js only use boundingSphere for frustumCulling
				// 		so maybe we should generate a *baggy* bsphere from bbox
				const bbox = gsiGeom.extensions.EXT_geometry_bounds.box
				const threeBbox = threeGeometry.boundingBox as Box3
				threeBbox.min.x = bbox.min.x
				threeBbox.min.y = bbox.min.y
				threeBbox.min.z = bbox.min.z
				threeBbox.max.x = bbox.max.x
				threeBbox.max.y = bbox.max.y
				threeBbox.max.z = bbox.max.z
			} else if (gsiGeom.extensions?.EXT_geometry_bounds?.sphere) {
				// user custom bounds override internal bounds
				const bsphere = gsiGeom.extensions.EXT_geometry_bounds.sphere
				const threeBsphere = threeGeometry.boundingSphere as Sphere
				threeBsphere.center.x = bsphere.center.x
				threeBsphere.center.y = bsphere.center.y
				threeBsphere.center.z = bsphere.center.z
				threeBsphere.radius = bsphere.radius
			} else {
				// @note three will use bsphere but may not use bbox so...
				const bsphere = this.config.boundingProcessor.getGeomBoundingSphere(gsiGeom)
				const threeBsphere = threeGeometry.boundingSphere as Sphere
				threeBsphere.center.x = bsphere.center.x
				threeBsphere.center.y = bsphere.center.y
				threeBsphere.center.z = bsphere.center.z
				threeBsphere.radius = bsphere.radius
			}
		}

		// not versioning for three because we don't have control to VAOs

		return threeGeometry
	}

	private convAttr(gsiAttr: AttributeDataType): BufferAttribute {
		let threeAttribute = this._threeAttr.get(gsiAttr) as BufferAttribute
		let committedVersion = this._committedAttr.get(gsiAttr) as Int

		// create
		if (!threeAttribute) {
			// 类型检查
			if (isDISPOSED(gsiAttr.array))
				throw 'This attribute is already disposed. Can not create a new threejs object from it.'
			if (!isTypedArray(gsiAttr.array)) throw 'GSI::Attribute.array must be a TypedArray'

			// Basics
			threeAttribute = new BufferAttribute(gsiAttr.array, gsiAttr.itemSize, gsiAttr.normalized)

			// releaseOnUpload
			if (gsiAttr.disposable) {
				// gsi 释放 array 用内置类型
				gsiAttr.array = DISPOSED

				// 底层渲染器释放 array 的方案各有不同，用支持的即可
				threeAttribute.onUploadCallback = function () {
					threeAttribute.array = []
				}
			}

			committedVersion = gsiAttr.version

			// update cache
			this._threeAttr.set(gsiAttr, threeAttribute)
			this._committedAttr.set(gsiAttr, committedVersion)
		}

		// sync
		{
			// TODO disable changing these values
			// TODO itemSize normalized ...
			switch (gsiAttr.usage) {
				case 'STATIC_DRAW':
					threeAttribute.usage = StaticDrawUsage || GL_STATIC_DRAW
					break
				case 'DYNAMIC_DRAW':
					threeAttribute.usage = DynamicDrawUsage || GL_DYNAMIC_DRAW
					break
				default:
					throw 'Invalid value for GSI::Attribute.usage: ' + gsiAttr.usage
			}
		}

		// update
		if (committedVersion !== gsiAttr.version || gsiAttr.version === -1) {
			// @note new object will always be uploaded by three,
			// 		 no needs to set needsUpdate for newly created object

			if (isDISPOSED(gsiAttr.array))
				throw 'This attribute is already disposed. Can not update its data. If its needs to be updated. Do not mark it `disposable`'

			threeAttribute.needsUpdate = true

			// Update process, with limitations by STATIC_DRAW or DYNAMIC_DRAW
			if (gsiAttr.usage === 'STATIC_DRAW') {
				// If the gsiAttr.array is new, update attribute by resending array to GPU
				if (gsiAttr.extensions?.EXT_buffer_partial_update?.updateRanges?.length) {
					console.warn('GSI::Attribute.updateRanges is not supported in `STATIC_DRAW` usage')
				}
				// Overwrite array
				threeAttribute.array = gsiAttr.array
			} else if (gsiAttr.usage === 'DYNAMIC_DRAW') {
				// TODO: it should be okay to use a different array ?
				// if (threeAttribute.array !== gsiAttr.array) {
				// 	throw new Error(
				// 		'GSI::Attribute.array: changing array itself is not permitted when attribute usage is `DYNAMIC_DRAW`'
				// 	)
				// }

				// Merge and set .updateRanges
				if (gsiAttr.extensions?.EXT_buffer_partial_update?.updateRanges?.length) {
					const updateRanges = gsiAttr.extensions.EXT_buffer_partial_update.updateRanges
					const mergedRange = { start: Infinity, end: -Infinity }
					for (let i = 0; i < updateRanges.length; i++) {
						const range = updateRanges[i]
						const start = range.start
						const end = start + range.count
						if (start < mergedRange.start) mergedRange.start = start
						if (end > mergedRange.end) mergedRange.end = end
					}
					threeAttribute.updateRange.offset = mergedRange.start
					threeAttribute.updateRange.count = mergedRange.end - mergedRange.start
				} else {
					// @note @Simon no needs tp warn, this means to update the whole array
					// console.warn('GSI::Attribute: needs update data but no updateRanges are provided')
					// Default value - from BufferAttribute.js
					threeAttribute.updateRange = { offset: 0, count: -1 }
				}
			} else {
				throw new Error('Invalid value of GSI::Attribute.usage')
			}

			// update cache
			committedVersion = gsiAttr.version
			this._committedAttr.set(gsiAttr, committedVersion)
		}

		return threeAttribute
	}

	/**
	 * @note run after all the textures are cached
	 */
	private convMatr(gsiMatr: GsiMatr) {
		let threeMatr = this._threeMatr.get(gsiMatr) as Material
		// let committedVersion = this._committedMatr.get(gsiMatr) as Int

		// create
		if (!threeMatr) {
			switch (gsiMatr.type) {
				// @note just throw
				// case 'basic':
				// 	console.error('Use MatrUnlit instead of MatrBasic')
				// 	threeMatr = new PrgBasicMaterial(gsiMatr as MatrUnlitDataType)
				// 	break
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
					throw 'Unsupported GSI::Material Type: ' + gsiMatr['type']
				// threeMatr = new PrgBasicMaterial(gsiMatr as MatrUnlitDataType)
			}

			// @note better performance to just sync threeMatr.version
			// committedVersion = gsiMatr.version

			// update cache
			this._threeMatr.set(gsiMatr, threeMatr)
			// this._committedMatr.set(gsiMatr, committedVersion)

			syncMaterial(gsiMatr, threeMatr, this._threeTex)
		}

		/**
		 * @NOTE these parameters are pipeline related. only update when version bumped
		 */
		// sync
		// syncMaterial(gsiMatr, threeMatr, this._threeTex)

		// material type specified parameters
		// @note
		// 		these parameters needs to be updated every time
		// @note
		// 		color parameters on THREE.Material must be THREE.Color
		// 		@see THREEJS/renderers/webgl/WebGLMaterials :: refreshUniformsCommon
		switch (gsiMatr.type) {
			// @note there is no material type === basic, let it throw
			// case 'basic':
			// 	break

			case 'pbr': {
				const pbrThreeMatr = threeMatr as PrgStandardMaterial

				pbrThreeMatr.color = this.convColor(gsiMatr.baseColorFactor)
				pbrThreeMatr.emissive = this.convColor(gsiMatr.emissiveFactor)
				pbrThreeMatr.metalness = gsiMatr.metallicFactor
				pbrThreeMatr.roughness = gsiMatr.roughnessFactor

				/**
				 * @todo metallicRoughnessTexture 需要对 three 的 PBR 做一些修改
				 * @QianXun 根据three的gltf loader实现，暂时将这个texture同时附给两个属性
				 * https://threejs.org/examples/?q=gltf#webgl_loader_gltf_extensions
				 * @note it is safe to assume that textures have been handled and cached in previews #resourceStage
				 */
				pbrThreeMatr.metalnessMap = gsiMatr.metallicRoughnessTexture
					? (this._threeTex.get(gsiMatr.metallicRoughnessTexture) as ThreeTexture)
					: null
				pbrThreeMatr.roughnessMap = gsiMatr.metallicRoughnessTexture
					? (this._threeTex.get(gsiMatr.metallicRoughnessTexture) as ThreeTexture)
					: null
				pbrThreeMatr.map = gsiMatr.baseColorTexture
					? (this._threeTex.get(gsiMatr.baseColorTexture) as ThreeTexture)
					: null
				pbrThreeMatr.emissiveMap = gsiMatr.emissiveTexture
					? (this._threeTex.get(gsiMatr.emissiveTexture) as ThreeTexture)
					: null
				pbrThreeMatr.normalMap = gsiMatr.normalTexture
					? (this._threeTex.get(gsiMatr.normalTexture) as ThreeTexture)
					: null
				pbrThreeMatr.aoMap = gsiMatr.occlusionTexture
					? (this._threeTex.get(gsiMatr.occlusionTexture) as ThreeTexture)
					: null
				break
			}

			case 'unlit': {
				const unlitThreeMatr = threeMatr as PrgBasicMaterial
				const matr = gsiMatr as MatrUnlitDataType

				unlitThreeMatr.color = this.convColor(matr.baseColorFactor)
				unlitThreeMatr.map = matr.baseColorTexture
					? (this._threeTex.get(matr.baseColorTexture) as ThreeTexture)
					: null
				break
			}

			case 'point': {
				const matr = gsiMatr as MatrPointDataType
				const pointThreeMatr = threeMatr as PrgPointMaterial

				pointThreeMatr.size = matr.size
				pointThreeMatr.sizeAttenuation = matr.sizeAttenuation
				pointThreeMatr.color = this.convColor(matr.baseColorFactor)
				pointThreeMatr.map = matr.baseColorTexture
					? (this._threeTex.get(matr.baseColorTexture) as ThreeTexture)
					: null
				break
			}

			case 'sprite': {
				const threeM = threeMatr as PrgSpriteMaterial
				const matr = gsiMatr as MatrSpriteDataType
				threeM.uniforms.opacity.value = matr.opacity
				// TODO @FIXME redesigned sprite transform
				// threeM.uniforms['uCenter'].value.copy(matr.center as Vector2)
				// threeM.uniforms['uSize'].value.copy(matr.size as Vector2)
				// threeM.uniforms['uRotation'].value = matr.rotation
				threeM.uniforms['diffuse'].value = this.convColor(matr.baseColorFactor)
				threeM.map = matr.baseColorTexture
					? (this._threeTex.get(matr.baseColorTexture) as ThreeTexture)
					: null
				// TODO @浅寻 bad naming
				threeM.defines['USE_SIZEATTENUATION'] = !!matr.sizeAttenuation
				break
			}

			default:
				throw new Error('Unsupported value of GSI::Matr.type: ' + gsiMatr['type'])
		}

		// update
		if (gsiMatr.version === -1) {
			// it can't be right
			// maybe throw an Error?
			console.warn('Material.version set to -1, Will recompile it every time')
			threeMatr.needsUpdate = true
		} else {
			if (threeMatr.version !== gsiMatr.version) {
				// needs update
				syncMaterial(gsiMatr, threeMatr, this._threeTex)
				threeMatr.version = gsiMatr.version
			}
		}

		return threeMatr
	}

	private convTexture(gsiTexture: Texture | undefined | null): ThreeTexture | null {
		if (gsiTexture === undefined || gsiTexture === null) return null

		let threeTexture = this._threeTex.get(gsiTexture) as ThreeTexture
		// let committedVersion = this._committedTex.get(gsiTexture) as Int

		// create
		if (!threeTexture) {
			const imgData = gsiTexture.image

			// Create Texture via various image types
			{
				if (imgData.data !== undefined) {
					if (imgData.data instanceof DataView)
						throw 'GSI::Texture::image - type `DataView` is not supported'

					threeTexture = new DataTexture(
						imgData.data,
						imgData.width as number,
						imgData.height as number
					)
				} else if (imgData.uri !== undefined) {
					threeTexture = texLoader.load(imgData.uri)
				} else if (imgData.extensions?.EXT_image?.HTMLImage !== undefined) {
					const image = imgData.extensions?.EXT_image?.HTMLImage
					if (image instanceof HTMLElement) {
						// HTMLElement
						if (image instanceof HTMLCanvasElement) {
							threeTexture = new CanvasTexture(image)
						} else if (image instanceof HTMLVideoElement) {
							throw 'VIDEO TEXTURE NOT IMPLEMENTED YET!'
							/** @TODO 在three中需先解决每次uploadTexture都会创建一个 `dispose` listener 的问题 */
						} else {
							threeTexture = new ThreeTexture(image)
						}
					} else {
						throw 'HTMLImage must be an HTMLElement'
					}
				} else {
					throw 'GSI::Texture: need at least on image data source!'
				}
			}

			// committedVersion = gsiTexture.image.version
			threeTexture.version = gsiTexture.image.version

			this._threeTex.set(gsiTexture, threeTexture)
			// this._committedTex.set(gsiTexture, committedVersion)
		}

		// version bump
		// if (committedVersion !== gsiTexture.image.version || gsiTexture.image.version === -1) {
		// 	// @note new texture will always be uploaded by three,
		// 	// 		 no needs to set needsUpdate for newly created texture

		// 	threeTexture.needsUpdate = true

		// 	committedVersion = gsiTexture.image.version
		// 	this._committedTex.set(gsiTexture, committedVersion)
		// }
		if (gsiTexture.image.version === -1) {
			threeTexture.needsUpdate = true
		} else {
			threeTexture.version = gsiTexture.image.version
		}

		// sync parameters

		syncTexture(gsiTexture, threeTexture)

		return threeTexture
	}

	private convColor(gsiColor: ColorRGB): Color {
		let color = this._threeColor.get(gsiColor)

		if (color) {
			color.r = gsiColor.r
			color.g = gsiColor.g
			color.b = gsiColor.b
		} else {
			color = new Color(gsiColor.r, gsiColor.g, gsiColor.b)
			this._threeColor.set(gsiColor, color)
		}

		return color
	}

	// #endregion

	// recovery(node: MeshDataType) {}

	dispose() {
		this._cachedResources = getResourcesFlat([]) // init with a empty node
		this._threeMesh = new WeakMap()
		this._threeGeom = new WeakMap()
		this._threeAttr = new WeakMap()
		this._threeTex = new WeakMap()
		// TODO use GsiMatr instead because MatrBaseDataType can not be used alone
		this._threeMatr = new WeakMap()
		this._threeColor = new WeakMap()

		// this._committedVersions = new WeakMap<any, number>()
		this._committedAttr = new WeakMap()
		// this._committedMatr = new WeakMap()
		// this._committedTex = new WeakMap()

		// this._ar0.length = 0
		// this._ar1.length = 0
		// this._ar2.length = 0
		// this._ar3.length = 0

		// this._threeObjects = new WeakMap<ColorRGB, Color>()
	}
}

/**
 * get all the resources that needs to be `allocated` and `freed` manually
 *
 * these resources has underlying gpu objects that can not be GC-ed
 *
 * also it's better to modify remote resources pre-frame than mid-frame to avoid stalling.
 *
 * @deprecated use getResourcesFlat
 */
export function getResources(root?: MeshDataType) {
	// programs
	const materials = new Set<GsiMatr>()
	// vao
	const geometries = new Set<GeomDataType>()
	// buffers
	const attributes = new Set<AttributeDataType>()
	// texture / framebuffer / samplers
	const textures = new Set<Texture | CubeTexture>()

	// @TODO uniform buffers

	if (root) {
		traverse(root, (mesh: MeshDataType) => {
			if (isRenderableMesh(mesh)) {
				materials.add(mesh.material as GsiMatr)
				geometries.add(mesh.geometry)

				// textures

				// standard textures
				if (mesh.material['baseColorTexture']) textures.add(mesh.material['baseColorTexture'])
				if (mesh.material['metallicRoughnessTexture'])
					textures.add(mesh.material['metallicRoughnessTexture'])
				if (mesh.material['emissiveTexture']) textures.add(mesh.material['emissiveTexture'])
				if (mesh.material['normalTexture']) textures.add(mesh.material['normalTexture'])
				if (mesh.material['occlusionTexture']) textures.add(mesh.material['occlusionTexture'])

				// custom textures
				if (mesh.material.extensions?.EXT_matr_programmable?.uniforms) {
					const uniforms = mesh.material.extensions.EXT_matr_programmable.uniforms

					// @note this is a little bit slower than Object.values
					// Object.keys(uniforms).forEach((key) => {
					// 	const uniformValue = uniforms[key].value
					// 	if (isTexture(uniformValue) || isCubeTexture(uniformValue)) {
					// 		textures.add(uniformValue)
					// 	}
					// })

					const values = Object.values(uniforms)
					for (let i = 0; i < values.length; i++) {
						const uniformValue = values[i].value
						if (isTexture(uniformValue) || isCubeTexture(uniformValue)) {
							textures.add(uniformValue)
						}
					}
				}

				// attributes
				{
					// @note this is a little bit slower than Object.values
					// Object.keys(mesh.geometry.attributes).forEach((key) => {
					// 	attributes.add(mesh.geometry.attributes[key])
					// })
					const values = Object.values(mesh.geometry.attributes)
					for (let i = 0; i < values.length; i++) {
						attributes.add(values[i])
					}
					if (mesh.geometry.indices) attributes.add(mesh.geometry.indices)
				}
			}
		})
	}

	return {
		materials,
		geometries,
		attributes,
		textures,
	}
}

/**
 * get all the resources that needs to be `allocated` and `freed` manually
 *
 * these resources has underlying gpu objects that can not be GC-ed
 *
 * also it's better to modify remote resources pre-frame than mid-frame to avoid stalling.
 *
 */
export function getResourcesFlat(flatScene: MeshDataType[]) {
	// programs
	const materials = new Set<GsiMatr>()
	// vao
	const geometries = new Set<GeomDataType>()
	// buffers
	const attributes = new Set<AttributeDataType>()
	// texture / framebuffer / samplers
	const textures = new Set<Texture | CubeTexture>()

	// @TODO uniform buffers

	for (let i = 0; i < flatScene.length; i++) {
		const mesh = flatScene[i]
		if (isRenderableMesh(mesh)) {
			materials.add(mesh.material as GsiMatr)
			geometries.add(mesh.geometry)

			// textures

			// standard textures
			if (mesh.material['baseColorTexture']) textures.add(mesh.material['baseColorTexture'])
			if (mesh.material['metallicRoughnessTexture'])
				textures.add(mesh.material['metallicRoughnessTexture'])
			if (mesh.material['emissiveTexture']) textures.add(mesh.material['emissiveTexture'])
			if (mesh.material['normalTexture']) textures.add(mesh.material['normalTexture'])
			if (mesh.material['occlusionTexture']) textures.add(mesh.material['occlusionTexture'])

			// custom textures
			if (mesh.material.extensions?.EXT_matr_programmable?.uniforms) {
				const uniforms = mesh.material.extensions.EXT_matr_programmable.uniforms

				// @note this is a little bit slower than Object.values
				// Object.keys(uniforms).forEach((key) => {
				// 	const uniformValue = uniforms[key].value
				// 	if (isTexture(uniformValue) || isCubeTexture(uniformValue)) {
				// 		textures.add(uniformValue)
				// 	}
				// })

				const values = Object.values(uniforms)
				for (let i = 0; i < values.length; i++) {
					const uniformValue = values[i].value
					if (isTexture(uniformValue) || isCubeTexture(uniformValue)) {
						textures.add(uniformValue)
					}
				}
			}

			// attributes
			{
				// @note this is a little bit slower than Object.values
				// Object.keys(mesh.geometry.attributes).forEach((key) => {
				// 	attributes.add(mesh.geometry.attributes[key])
				// })
				const values = Object.values(mesh.geometry.attributes)
				for (let i = 0; i < values.length; i++) {
					attributes.add(values[i])
				}
				if (mesh.geometry.indices) attributes.add(mesh.geometry.indices)
			}
		}
	}

	return {
		materials,
		geometries,
		attributes,
		textures,
	}
}
/**
 * get all the resources that needs to be `allocated` and `freed` manually
 *
 * these resources has underlying gpu objects that can not be GC-ed
 *
 * also it's better to modify remote resources pre-frame than mid-frame to avoid stalling.
 */
function getResourcesFlatWidthFastDiff(
	flatScene: MeshDataType[],
	originalResources: ReturnType<typeof getResourcesFlat>
) {
	// programs
	const materials = new Set<GsiMatr>()
	// vao
	const geometries = new Set<GeomDataType>()
	// buffers
	const attributes = new Set<AttributeDataType>()
	// texture / framebuffer / samplers
	const textures = new Set<Texture | CubeTexture>()

	// @TODO uniform buffers

	for (let i = 0; i < flatScene.length; i++) {
		const mesh = flatScene[i]
		if (isRenderableMesh(mesh)) {
			materials.add(mesh.material as GsiMatr) && geometries.add(mesh.geometry)

			// textures

			// standard textures
			if (mesh.material['baseColorTexture']) textures.add(mesh.material['baseColorTexture'])
			if (mesh.material['metallicRoughnessTexture'])
				textures.add(mesh.material['metallicRoughnessTexture'])
			if (mesh.material['emissiveTexture']) textures.add(mesh.material['emissiveTexture'])
			if (mesh.material['normalTexture']) textures.add(mesh.material['normalTexture'])
			if (mesh.material['occlusionTexture']) textures.add(mesh.material['occlusionTexture'])

			// custom textures
			if (mesh.material.extensions?.EXT_matr_programmable?.uniforms) {
				const uniforms = mesh.material.extensions.EXT_matr_programmable.uniforms

				// @note this is a little bit slower than Object.values
				// Object.keys(uniforms).forEach((key) => {
				// 	const uniformValue = uniforms[key].value
				// 	if (isTexture(uniformValue) || isCubeTexture(uniformValue)) {
				// 		textures.add(uniformValue)
				// 	}
				// })

				const values = Object.values(uniforms)
				for (let i = 0; i < values.length; i++) {
					const uniformValue = values[i].value
					if (isTexture(uniformValue) || isCubeTexture(uniformValue)) {
						textures.add(uniformValue)
					}
				}
			}

			// attributes
			{
				// @note this is a little bit slower than Object.values
				// Object.keys(mesh.geometry.attributes).forEach((key) => {
				// 	attributes.add(mesh.geometry.attributes[key])
				// })
				const values = Object.values(mesh.geometry.attributes)
				for (let i = 0; i < values.length; i++) {
					attributes.add(values[i])
				}
				if (mesh.geometry.indices) attributes.add(mesh.geometry.indices)
			}
		}
	}

	return {
		materials,
		geometries,
		attributes,
		textures,
	}
}
/**
 * TODO Maybe generate corresponding THREE.Mesh|Points instead of a kinda union type?
 * 把 three 的 Mesh Points Lines 合并到 父类 Object3D 上，来和 glTF2 保持一致
 */
export class RenderableObject3D extends Object3D {
	isMesh?: boolean
	isPoints?: boolean
	isLine?: boolean
	isLineSegments?: boolean

	// TrianglesDrawMode / TriangleStripDrawMode / TriangleFanDrawMode
	drawMode: number

	geometry: BufferGeometry
	material: Material

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
 * union type of all gsi materials
 * - better use this than MatrBaseDataType to make switch case work
 * @simon
 */
type GsiMatr = MatrSpriteDataType | MatrPointDataType | MatrUnlitDataType | MatrPbrDataType
