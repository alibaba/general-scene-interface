/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { createPrgPhysicalMaterial, TPrgPhysicalMaterial } from './materials/PrgPhysicalMaterial'
import { createPrgBasicMaterial, TPrgBasicMaterial } from './materials/PrgBasicMaterial'
import { createPrgPointMaterial, TPrgPointMaterial } from './materials/PrgPointMaterial'

import IR, {
	Texture,
	CubeTexture,
	ColorRGB,
	constants,
	Int,
	//
	DISPOSED,
	isTexture,
	isCubeTexture,
	isTypedArray,
	isRenderable,
	isDISPOSED,
	isLuminous,
	LuminousEXT,
} from '@gs.i/schema-scene'

const { GL_STATIC_DRAW, GL_DYNAMIC_DRAW } = constants

import { MatProcessor } from '@gs.i/processor-matrix'
import { BoundingProcessor } from '@gs.i/processor-bound'
import { CullingProcessor } from '@gs.i/processor-culling'
import { GraphProcessor } from '@gs.i/processor-graph'
import { traverse, flatten } from '@gs.i/utils-traverse'

import { syncMaterial } from './syncMaterial'
import { syncTexture } from './syncTexture'

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
	Light,
	PointLight,
} from 'three'
import { checkProcessorPerformance, sealTransform } from './utils'

/**
 * @note safe to share globally @simon
 */
const defaultMatrixProcessor = new MatProcessor()
/**
 * @note safe to share globally @simon
 */
const defaultBoundingProcessor = new BoundingProcessor({
	matrixProcessor: defaultMatrixProcessor,
})
/**
 * @note safe to share globally @simon
 */
const defaultGraphProcessor = new GraphProcessor()
/**
 * @note safe to share globally @simon
 */
const defaultCullingProcessor = new CullingProcessor({
	boundingProcessor: defaultBoundingProcessor,
	matrixProcessor: defaultMatrixProcessor,
})

export const defaultConfig = {
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
	 * - Object3D.{matrix,position,quaternion,scale} will be initial values (0,0,0 or 1,1,1 or identity matrix) and should not be used
	 * - Object3D.matrixWorld will be calculated from gsi-matrix-processor
	 * - Object3D.matrixAutoUpdate will be set to `false`, so that three.js won't automatically update the matrix from initial values.
	 * - if you use `Object3D.updateMatrixWorld(true)` (force update), all matrices will be wrong
	 * - if you use `Object3D.updateMatrix()` (manual update), that matrix will be wrong
	 *
	 * #### if you enable this:
	 * - Object3D.{position,quaternion,scale} will be set correctly
	 * - Object3D.matrix and Object3D.matrixWorld will be left as initial values
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
	 * - if mesh culled, the converted `Threejs.Object3D.visible` will be set to `false`
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
	 * whether to **try to** keep the shape of output scene graph
	 * - by default the output scene will be flattened and optimized,
	 * 	 useless inode(non-renderable nodes) will be removed from output scene graph
	 * - keep this disabled for best performance
	 * - enabling this doesn't promise the output tree has exactly same shape of input
	 * - TODO: enabling this may change some behavers of bounding and culling
	 * - TODO: disabling this breaks visibility inheritance
	 */
	keepTopology: false,

	/**
	 * whether to do extra checks to make sure the scene is correct.
	 */
	dev: true,

	/**
	 * @note safe to share globally @simon
	 */
	matrixProcessor: defaultMatrixProcessor,
	/**
	 * @note safe to share globally @simon
	 */
	boundingProcessor: defaultBoundingProcessor,
	/**
	 * @note safe to share globally @simon
	 */
	graphProcessor: defaultGraphProcessor,
	/**
	 * @note safe to share globally @simon
	 */
	cullingProcessor: defaultCullingProcessor,
}

export type ConverterConfig = Partial<typeof defaultConfig>

/**
 * 生成Three Lite Scene的Converter
 * @authors @Simon @QianXun
 * @note 底层渲染器通常需要用户主动资源回收，单向数据流中，用户只看到数据变化不看到底层资源的增减，因此可以提供自动回收机制
 */
export class Converter {
	/**
	 * type
	 */
	readonly type = 'ThreeConverter'

	/**
	 * config
	 */
	config: Required<ConverterConfig>

	/**
	 * Scene info
	 */
	info = {
		renderableCount: 0,
		culledCount: 0,
	}

	readonly matrixProcessor: MatProcessor
	readonly boundingProcessor: BoundingProcessor
	readonly graphProcessor: GraphProcessor
	readonly cullingProcessor: CullingProcessor

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
	// private _threeObject3ds = new WeakMap<IR.NodeLike, Object3D>()
	private _threeObject = new WeakMap<IR.NodeLike, RenderableObject3D | Object3D | Light>()
	private _threeGeom = new WeakMap<IR.Geometry, BufferGeometry>()
	private _threeAttr = new WeakMap<IR.Attribute, BufferAttribute>()
	private _threeTex = new WeakMap<Texture | CubeTexture, ThreeTexture>()
	// TODO use IR.Material instead because IR.MatrBase can not be used alone
	private _threeMatr = new WeakMap<
		IR.Material | IR.MaterialBase,
		TPrgPhysicalMaterial | TPrgBasicMaterial | TPrgPointMaterial
	>()
	private _threeColor = new WeakMap<ColorRGB, Color>()

	// private _committedVersions = new WeakMap<any, number>()
	private _committedAttr = new WeakMap<IR.Attribute, Int>()
	// private _committedMatr = new WeakMap<IR.Material | IR.MatrBase, Int>()
	private _committedTex = new WeakMap<Texture | CubeTexture, Int>()

	/**
	 * @experimental
	 */
	readonly results = Object.freeze({
		object3D: this._threeObject,
		geometry: this._threeGeom,
		attribute: this._threeAttr,
		texture: this._threeTex,
		material: this._threeMatr,
	} as const)

	// #endregion

	constructor(config: ConverterConfig = {}) {
		this.config = {
			...defaultConfig,
			...config,
		}

		this.matrixProcessor = this.config.matrixProcessor
		this.boundingProcessor = this.config.boundingProcessor
		this.graphProcessor = this.config.graphProcessor
		this.cullingProcessor = this.config.cullingProcessor

		checkProcessorPerformance(this, defaultConfig)

		// this._cachedSnapshot = this.config.graphProcessor.snapshot() // init with a empty node
	}

	convert(root: IR.NodeLike): Object3D {
		/**
		 * @note It is not the most efficient way to get all the changed components and pre-handle them
		 * 		 It is quicker to just handle everything during one traversal
		 * 		 But that will make this process unlikely to be re-used to a different backend
		 *		 Also worth to notice that these components can be used multiple times in a tree
		 */

		this.info.culledCount = 0
		// this.info.renderableCount = 0

		// @note
		// 		optimize with flatten tree
		// 		it's quite expensive to traverse a tree multiple times
		const flatScene = flatten(root, this.config.dev)
		// const flatScene = flattenBFS(root)

		// update all the matrices
		this.matrixProcessor.updateMatrixFlat(flatScene)

		// update bvh bounds
		// this.boundingProcessor.updateBVHFlat(flatScene)

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

			const removed = {
				materials: this._cachedResources.materials,
				geometries: this._cachedResources.geometries,
				attributes: this._cachedResources.attributes,
				textures: this._cachedResources.textures,
			}

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
			const rootThree = this.convNode(root)

			if (root.extensions?.EXT_ref_threejs) throw new Error('root node cannot be a ref node')
			// pre-order traversal, parents are handled before children

			if (this.config.keepTopology) {
				for (let i = 0; i < flatScene.length; i++) {
					const node = flatScene[i]
					const parent = node.parent
					// skip root node
					if (parent) {
						// @note parent is cached before
						const parentThree = this._threeObject.get(parent) as Object3D
						const currentThree = this.convNode(node)
						parentThree.children.push(currentThree)
						currentThree.parent = parentThree
					}
				}
			} else {
				// skip root node
				for (let i = 1; i < flatScene.length; i++) {
					const node = flatScene[i]
					const currentThree = this.convNode(node)
					// clear current children to handle removed nodes
					if ((isRenderable(node) || isLuminous(node)) && currentThree.visible) {
						rootThree.children.push(currentThree)
						currentThree.parent = rootThree
					}
				}
			}

			return rootThree
		}
	}

	// #region object converters

	/**
	 * @note run after all the geometries and materials are cached
	 * @note require parent to be handled before child, only work for top-down traversal
	 * @note result's children and parent will be unset
	 */
	private convNode(gsiNode: IR.NodeLike): RenderableObject3D | Object3D {
		let threeObject = this._threeObject.get(gsiNode) as RenderableObject3D | Object3D

		// create
		if (!threeObject) {
			if (isRenderable(gsiNode)) {
				threeObject = new RenderableObject3D()

				// Assign mode
				switch (gsiNode.geometry.mode) {
					case 'TRIANGLES':
						threeObject['isMesh'] = true
						threeObject['drawMode'] = TrianglesDrawMode
						break

					case 'POINTS':
						threeObject['isPoints'] = true
						break

					case 'LINES':
						threeObject['isLine'] = true
						threeObject['isLineSegments'] = true
						break

					default:
						throw 'Invalid value for GSIGeom.mode: ' + gsiNode.geometry.mode
				}
				this.info.renderableCount++
			} else if (isLuminous(gsiNode)) {
				const luminousEXT = gsiNode.extensions?.EXT_luminous as LuminousEXT
				if (luminousEXT.type === 'point') {
					threeObject = new PointLight()
					threeObject.name = luminousEXT.name ?? threeObject.name
					threeObject['decay'] = 2 // gltf2: "follow the inverse square law"
				} else {
					throw new Error('three conv:: light type not implemented(' + luminousEXT.type + ')')
				}
			} else {
				threeObject = new Object3D()
			}

			if (!this.config.decomposeMatrix) {
				// @note avoid user mistakes, if matrix is handled by gsi processor, three.js methods should be disabled
				sealTransform(threeObject)
			} else {
				// TODO implement this!
				// decompose the matrix at creation, or just set TRS if given
				// do not update matrix anymore, only async TRS if given
				// let three.js do all the job
				throw 'decomposeMatrix is not implemented yet'
			}

			if (this.config.overrideFrustumCulling) {
				threeObject.frustumCulled = false
			}

			// update cache
			this._threeObject.set(gsiNode, threeObject)
		}
		// changing mesh primitive type is not allowed
		{
			if (isRenderable(gsiNode) !== ((threeObject as any).isRenderableObject3D === true)) {
				throw new Error('Conv:: changing geometry type is not supported')
			}
		}
		// sync
		{
			if (isRenderable(gsiNode)) {
				// threeObject is a RenderableObject3D

				const geometry = this._threeGeom.get(gsiNode.geometry) as BufferGeometry
				const material = this._threeMatr.get(gsiNode.material) as Material

				threeObject['material'] = material
				threeObject['geometry'] = geometry

				// if (gsiNode.geometry.attributes.uv) {
				// @note it's safe to assume `defines` was created above
				// @note three react to `defines` change. no need for bumping version
				// ;(material['defines'] as any).GSI_USE_UV = true
				// }

				if (!gsiNode.geometry.attributes.normal) {
					// @note required by GLTF2 spec
					;(material as any).flatShading = true
				}

				// ext render order
				const renderOrder = gsiNode.extensions?.EXT_mesh_order?.renderOrder
				if (renderOrder !== undefined) threeObject.renderOrder = renderOrder
			} else if (isLuminous(gsiNode)) {
				const luminousEXT = gsiNode.extensions?.EXT_luminous as LuminousEXT

				const threeLight = threeObject as PointLight
				threeLight.color.setRGB(luminousEXT.color.r, luminousEXT.color.g, luminousEXT.color.b) // three 152 color management
				threeLight.intensity = luminousEXT.intensity
				threeLight.distance = luminousEXT.range
			}

			// @TODO: This does not work with flatten output, should resolve visibility properly
			threeObject.visible = gsiNode.visible && (gsiNode.parent?.visible ?? true) // inherit visibility

			// @note three doesn't use localMatrix at all. it's only for generating worldMatrix.
			// // threeObject.matrix.elements = this.config.matrixProcessor.getLocalMatrix(gsiNode)

			// @note use cached matrices instead of dirty-checking every time.
			// // threeObject.matrixWorld.elements = this.config.matrixProcessor.getWorldMatrix(gsiNode)

			const matrix = this.config.matrixProcessor.getCachedWorldMatrix(gsiNode)
			if (matrix) {
				threeObject.matrixWorld.elements = matrix
			} else {
				console.warn(
					`Conv-three:: WorldMatrix of ${gsiNode.name} is not cached. ` +
						`Will fall back to dirty-checking. ` +
						`The scene-graph may have changed during this conversion.`
				)
				threeObject.matrixWorld.elements = this.config.matrixProcessor.getWorldMatrix(gsiNode)
			}

			// unset children and parent, this method only handles one single node
			threeObject.children = []
			threeObject.parent = null

			// EXT_ref_threejs as child of this result
			if (gsiNode.extensions?.EXT_ref_threejs) {
				const ref = gsiNode.extensions.EXT_ref_threejs as Object3D
				threeObject.children.push(ref)
				ref.parent = threeObject
				ref.updateMatrixWorld()
			}
		}

		// culling
		if (
			this.config.overrideFrustumCulling &&
			isRenderable(gsiNode) &&
			// @TODO: should resolve visibility properly
			gsiNode.visible &&
			gsiNode.extensions?.EXT_mesh_advanced?.frustumCulling !== false
		) {
			if (this.config.cullingProcessor.isFrustumCulled(gsiNode)) {
				this.info.culledCount++
				// @TODO: set .visible false will cull all its children
				// 			this can be problematic without BVH
				threeObject.visible = false
			}
		}

		return threeObject
	}

	/**
	 * @note run after all the attributes are cached
	 */
	private convGeom(gsiGeom: IR.Geometry): BufferGeometry {
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
			const keys = Object.keys(gsiGeom.attributes)
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]

				const gsiAttr = gsiGeom.attributes[key]
				if (gsiAttr) {
					// @note it is safe to assume that attributes were handled during #resource-stage
					const threeAttribute = this._threeAttr.get(gsiAttr) as BufferAttribute
					threeGeometry.attributes[key] = threeAttribute
				}
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
			{
				const { bbox, bsphere } = this.config.boundingProcessor.getBounds(gsiGeom)

				const threeBbox = threeGeometry.boundingBox as Box3
				const threeBsphere = threeGeometry.boundingSphere as Sphere

				threeBbox.min.x = bbox.min.x
				threeBbox.min.y = bbox.min.y
				threeBbox.min.z = bbox.min.z
				threeBbox.max.x = bbox.max.x
				threeBbox.max.y = bbox.max.y
				threeBbox.max.z = bbox.max.z

				threeBsphere.center.x = bsphere.center.x
				threeBsphere.center.y = bsphere.center.y
				threeBsphere.center.z = bsphere.center.z
				threeBsphere.radius = bsphere.radius
			}
		}

		// not versioning for three because we don't have control to VAOs

		return threeGeometry
	}

	private convAttr(gsiAttr: IR.Attribute): BufferAttribute {
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
				// 底层渲染器释放 array 的方案各有不同，用支持的即可
				threeAttribute.onUploadCallback = function () {
					threeAttribute.array = []
					// @note this may still be used for generating bounds
					// gsi 释放 array 用内置类型
					gsiAttr.array = DISPOSED
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
	private convMatr(gsiMatr: IR.Material) {
		let threeMatr = this._threeMatr.get(gsiMatr)

		// create
		if (!threeMatr) {
			switch (gsiMatr.type) {
				// @note just throw
				// case 'basic':
				// 	console.error('Use MatrUnlit instead of MatrBasic')
				// 	threeMatr = new PrgBasicMaterial(gsiMatr as IR.MatrUnlit)
				// 	break
				case 'point':
					threeMatr = createPrgPointMaterial(gsiMatr as IR.PointMaterial)
					break
				case 'unlit':
					threeMatr = createPrgBasicMaterial(gsiMatr as IR.UnlitMaterial)
					break
				case 'pbr':
					threeMatr = createPrgPhysicalMaterial(gsiMatr as IR.PbrMaterial)
					break
				default:
					throw 'Unsupported GSI::Material Type: ' + gsiMatr['type']
				// threeMatr = new PrgBasicMaterial(gsiMatr as IR.MatrUnlit)
			}

			// @note better performance to just sync threeMatr.version
			// committedVersion = gsiMatr.version

			// update cache
			this._threeMatr.set(gsiMatr, threeMatr)
			// this._committedMatr.set(gsiMatr, committedVersion)

			syncMaterial(gsiMatr, threeMatr)
		}

		threeMatr.visible = gsiMatr.visible

		if (gsiMatr.alphaMode === 'MASK') threeMatr.alphaTest = gsiMatr.opacity
		else threeMatr.opacity = gsiMatr.opacity

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
				const pbrThreeMatr = threeMatr as TPrgPhysicalMaterial

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
					? this._threeTex.get(gsiMatr.metallicRoughnessTexture)!
					: null
				pbrThreeMatr.roughnessMap = gsiMatr.metallicRoughnessTexture
					? this._threeTex.get(gsiMatr.metallicRoughnessTexture)!
					: null
				pbrThreeMatr.map = gsiMatr.baseColorTexture
					? this._threeTex.get(gsiMatr.baseColorTexture)!
					: null
				pbrThreeMatr.emissiveMap = gsiMatr.emissiveTexture
					? this._threeTex.get(gsiMatr.emissiveTexture)!
					: null
				pbrThreeMatr.normalMap = gsiMatr.normalTexture
					? this._threeTex.get(gsiMatr.normalTexture)!
					: null
				pbrThreeMatr.aoMap = gsiMatr.occlusionTexture
					? this._threeTex.get(gsiMatr.occlusionTexture)!
					: null
				break
			}

			case 'unlit': {
				const unlitThreeMatr = threeMatr as TPrgBasicMaterial
				const matr = gsiMatr as IR.UnlitMaterial

				unlitThreeMatr.color = this.convColor(matr.baseColorFactor)
				unlitThreeMatr.map = matr.baseColorTexture
					? this._threeTex.get(matr.baseColorTexture)!
					: null
				break
			}

			case 'point': {
				const matr = gsiMatr as IR.PointMaterial
				const pointThreeMatr = threeMatr as TPrgPointMaterial

				pointThreeMatr.size = matr.size
				pointThreeMatr.sizeAttenuation = matr.sizeAttenuation
				pointThreeMatr.color = this.convColor(matr.baseColorFactor)
				pointThreeMatr.map = matr.baseColorTexture
					? this._threeTex.get(matr.baseColorTexture)!
					: null
				break
			}

			default:
				throw new Error('Unsupported value of GSI::Matr.type: ' + gsiMatr['type'])
		}

		// @note defensive programming
		if (isNaN(gsiMatr.version)) throw new Error('gsiMatr.version is not a number')

		// update
		if (gsiMatr.version === -1) {
			// it can't be right
			// maybe throw an Error?
			console.warn('Material.version set to -1, Will recompile it every time')
			threeMatr.needsUpdate = true
		} else {
			if (threeMatr.version !== gsiMatr.version) {
				// needs update
				// console.debug('Material.version bumped')
				syncMaterial(gsiMatr, threeMatr)
				threeMatr.version = gsiMatr.version
			}
		}

		// uniforms
		{
			const uniforms = gsiMatr.extensions?.EXT_matr_programmable?.uniforms
			if (uniforms) {
				// it should be a shaderMaterial
				// TODO specify these three material's type, do not use base class
				const threeUniforms = threeMatr['uniforms'] as any

				Object.keys(uniforms).forEach((key) => {
					const uniform = uniforms[key]

					if (!uniform) return

					if (threeUniforms[key] === undefined) threeUniforms[key] = {}

					if (isTexture(uniform.value)) {
						// it should be cached before
						const threeTexture = this._threeTex.get(uniform.value)!
						threeUniforms[key].value = threeTexture
					} else if (isCubeTexture(uniform.value)) {
						// 👀
						throw 'CUBE TEXTURE UNIFORM NOT IMPLEMENTED'
					} else {
						// @note No need to transform value into three.js classes
						// 		three.js and GL2 do not care the Type of uniform values.
						// 		uniform types are decided by the compiled shaders.
						// 		uploader functions do accept basic data type as values.
						// 		as long as matrices are arrays, vectors are xyz\rgb\arrays,
						// 		it will be fine.

						threeUniforms[key].value = uniform.value
					}
				})
			}
		}

		// give a default material.map
		// sync uv transform
		{
			if (!threeMatr.map) {
				threeMatr.map = getDefaultMap(gsiMatr)
			}

			const uvMatrix = gsiMatr.extensions?.EXT_matr_uv_transform?.matrix
			if (uvMatrix) {
				threeMatr.map.matrix.fromArray(uvMatrix)
			}
		}

		return threeMatr
	}

	private convTexture(gsiTexture: Texture | undefined | null): ThreeTexture | null {
		if (gsiTexture === undefined || gsiTexture === null) return null

		if (gsiTexture.extensions?.EXT_ref_threejs) {
			const threeTexture = gsiTexture.extensions?.EXT_ref_threejs as ThreeTexture
			this._threeTex.set(gsiTexture, threeTexture)
			return threeTexture
		}

		let threeTexture = this._threeTex.get(gsiTexture)!
		let committedVersion = this._committedTex.get(gsiTexture) as Int

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

					threeTexture.needsUpdate = true // @note this is required by threejs DataTexture
				} else if (imgData.uri !== undefined) {
					threeTexture = texLoader.load(imgData.uri)
				} else if (imgData.extensions?.EXT_image_HTML !== undefined) {
					const image = imgData.extensions?.EXT_image_HTML
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

			committedVersion = gsiTexture.image.version

			/**
			 * @note threeTexture.version can not be managed directly.
			 * - textureLoader may change it without notice.
			 * - DataTexture must start with 1.
			 */
			// threeTexture.version = gsiTexture.image.version

			this._threeTex.set(gsiTexture, threeTexture)
			this._committedTex.set(gsiTexture, committedVersion)
		}

		// version bump
		if (committedVersion !== gsiTexture.image.version || gsiTexture.image.version === -1) {
			// @note new texture will always be uploaded by three,
			// 		 no needs to set needsUpdate for newly created texture
			// @edit except for DataTexture which must be set needsUpdate manually after created

			threeTexture.needsUpdate = true

			committedVersion = gsiTexture.image.version
			this._committedTex.set(gsiTexture, committedVersion)
		}

		// sync parameters

		syncTexture(gsiTexture, threeTexture)

		return threeTexture
	}

	private convColor(gsiColor: ColorRGB): Color {
		let color = this._threeColor.get(gsiColor)

		if (color) {
			// so that three r152 color management will work
			color.setRGB(gsiColor.r, gsiColor.g, gsiColor.b)
		} else {
			color = new Color(gsiColor.r, gsiColor.g, gsiColor.b)
			this._threeColor.set(gsiColor, color)
		}

		return color
	}

	// #endregion

	// recovery(node: IR.NodeLike) {}

	dispose() {
		this._cachedResources = getResourcesFlat([]) // init with a empty node
		this._threeObject = new WeakMap()
		this._threeGeom = new WeakMap()
		this._threeAttr = new WeakMap()
		this._threeTex = new WeakMap()
		this._threeMatr = new WeakMap()
		this._threeColor = new WeakMap()

		this._committedTex = new WeakMap()
		this._committedAttr = new WeakMap()
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
export function getResources(root?: IR.NodeLike) {
	// programs
	const materials = new Set<IR.Material>()
	// vao
	const geometries = new Set<IR.Geometry>()
	// buffers
	const attributes = new Set<IR.Attribute>()
	// texture / framebuffer / samplers
	const textures = new Set<Texture | CubeTexture>()

	// @TODO uniform buffers

	if (root) {
		traverse(root, (mesh: IR.NodeLike) => {
			if (isRenderable(mesh)) {
				materials.add(mesh.material as IR.Material)
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

					const values = Object.values(uniforms)
					for (let i = 0; i < values.length; i++) {
						const uniformValue = values[i]?.value
						if (uniformValue && (isTexture(uniformValue) || isCubeTexture(uniformValue))) {
							textures.add(uniformValue)
						}
					}
				}

				// attributes
				{
					const values = Object.values(mesh.geometry.attributes)
					for (let i = 0; i < values.length; i++) {
						const attributeValue = values[i]
						if (attributeValue) attributes.add(attributeValue)
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
export function getResourcesFlat(flatScene: IR.NodeLike[]) {
	// programs
	const materials = new Set<IR.Material>()
	// vao
	const geometries = new Set<IR.Geometry>()
	// buffers
	const attributes = new Set<IR.Attribute>()
	// texture / framebuffer / samplers
	const textures = new Set<Texture | CubeTexture>()

	// @TODO uniform buffers

	for (let i = 0; i < flatScene.length; i++) {
		const mesh = flatScene[i]
		if (isRenderable(mesh)) {
			materials.add(mesh.material as IR.Material)
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
					const uniformValue = values[i]?.value
					if (uniformValue && (isTexture(uniformValue) || isCubeTexture(uniformValue))) {
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
					const attributeValue = values[i]
					if (attributeValue) attributes.add(attributeValue)
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
	isRenderableObject3D = true
	declare isMesh?: boolean
	declare isPoints?: boolean
	declare isLine?: boolean
	declare isLineSegments?: boolean

	// TrianglesDrawMode / TriangleStripDrawMode / TriangleFanDrawMode
	declare drawMode: number

	declare geometry: BufferGeometry
	declare material: Material

	constructor(params: Partial<RenderableObject3D> = {}) {
		super()

		// GSI conv 接管了所有 matrix 的计算和更新
		this.matrixAutoUpdate = false
		this.matrixWorldNeedsUpdate = false
		this.matrixWorldAutoUpdate = false

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
 * get a default texture for `.map` property of threejs material
 * @description
 * `THREE.Material.map` is a very special placeholder in threejs renderer.
 * Give it a default empty texture can shim up some internal differences of threejs.
 *
 * - vUv will always be available in vertex and fragment shader.
 * - `material.map.matrix` will always be the uvTransform of the material. {@link https://threejs.org/docs/index.html?q=material#api/en/textures/Texture.offset}
 */
function getDefaultMap(material: IR.Material): ThreeTexture {
	const map = EMPTY_MAPS.get(material)
	if (map) {
		return map
	} else {
		const newMap = new DataTexture(new Uint8Array(4).fill(255), 1, 1)
		newMap.needsUpdate = true

		newMap.matrixAutoUpdate = false // @note important
		EMPTY_MAPS.set(material, newMap)
		return newMap
	}
}

const EMPTY_MAPS = new WeakMap<IR.Material, ThreeTexture>()
