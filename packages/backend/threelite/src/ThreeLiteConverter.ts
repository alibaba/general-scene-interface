/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { PrgStandardMaterial } from './PrgStandardMaterial'
import { PrgBasicMaterial } from './PrgBasicMaterial'
import { PrgPointMaterial } from './PrgPointMaterial'

import {
	TypedArray,
	MeshDataType,
	MatrBaseDataType,
	GeomDataType,
	Texture,
	CubeTexture,
	AttributeDataType,
	MatrPbrDataType,
	MatrUnlitDataType,
	MatrPointDataType,
	MatrSpriteDataType,
	ColorRGB,
	GL_STATIC_DRAW,
	GL_DYNAMIC_DRAW,
	UniformDataType,
	Int,
	//
	DISPOSED,
	isTexture,
	isCubeTexture,
	isMatrPbrDataType,
	isMatrUnlitDataType,
	isColorRGB,
	isTypedArray,
	isRenderableMesh,
} from '@gs.i/schema-scene'

import type { Converter } from '@gs.i/schema-converter'
import { MatProcessor } from '@gs.i/processor-matrix'
import { BoundingProcessor } from '@gs.i/processor-bound'
import { diffSets, diffWeakSets, intersect, GraphProcessor, SnapShot } from '@gs.i/processor-graph'
import { specifyMesh } from '@gs.i/processor-specify'
import { traverse, flatten } from '@gs.i/utils-traverse'

import { Transform3, matrix4Equals } from '@gs.i/utils-transform'
// import * as THREE from 'three-lite'
import {
	Object3D,
	Vector2,
	Vector3,
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
} from 'three-lite'
import { generateGsiSpriteInfo } from '@gs.i/utils-geometry'
import { box3Equals, convDefines, elementsEquals, sphereEquals, SupportedExtensions } from './utils'
import { Euler, Vector3 as Vec3 } from '@gs.i/utils-math'
import { PrgSpriteMaterial } from './PrgSpriteMaterial'

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

	// // transform缓存，用来和gsi2Mesh做比对
	// _tfPos?: Vec3
	// _tfRot?: Euler
	// _tfScl?: Vec3

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
 * @authors @Simon @QianXun
 * @note 底层渲染器通常需要用户主动资源回收，单向数据流中，用户只看到数据变化不看到底层资源的增减，因此可以提供自动回收机制
 */
export class ThreeLiteConverter implements Converter {
	/**
	 * type
	 */
	readonly type = 'ThreeLite'

	/**
	 * config
	 */
	config: Required<ConverterConfig>

	/**
	 * Scene info
	 */
	info = {
		renderableCount: 0,
		visibleCount: 0,
	}

	/**
	 * 这个计数器配合 WeakMap 一起使用作为**局部**唯一ID，可以避免多个实例存在时的撞表问题。
	 *
	 * 所有 id 都从 WeakMap 得到，一个 key 在一个实例中的 id 是唯一的
	 *
	 * conv 需要保存上一次的输入结构，以及 conv 结果，但是不需要保存输入的对象
	 */
	private _counter = 0
	private _ids = new WeakMap<object, Int>()

	/**
	 * get a local id for the given object
	 * - this id is comparable **only** if generated by the same instance
	 */
	getID(o: object): Int {
		let id = this._ids.get(o)
		if (id === undefined) {
			id = this._counter++
			this._ids.set(o, id)
		}

		if (id >= 9007199254740990) throw 'ID exceeds MAX_SAFE_INTEGER'

		return id
	}

	/**
	 * handled resources (GSI side) from last convert call
	 *
	 * @note refresh every `convert`
	 */
	private _cachedResources = getResources() // init with a empty node
	// private _cachedSnapshot: SnapShot
	// private _cachedNodes = new WeakSet<MeshDataType>()
	private _threeObjects = new WeakMap<any, any>()

	constructor(config: ConverterConfig) {
		this.config = {
			...config,
			...DefaultConfig,
		}

		// this._cachedSnapshot = this.config.graphProcessor.snapshot() // init with a empty node
	}

	convert(node: MeshDataType): Object3D {
		// check resources that require special handling

		{
			const resources = getResources(node)

			const added = {
				materials: diffSets(resources.materials, this._cachedResources.materials),
				geometries: diffSets(resources.geometries, this._cachedResources.geometries),
				attributes: diffSets(resources.attributes, this._cachedResources.attributes),
				textures: diffSets(resources.textures, this._cachedResources.textures),
			}

			const removed = {
				materials: diffSets(this._cachedResources.materials, resources.materials),
				geometries: diffSets(this._cachedResources.geometries, resources.geometries),
				attributes: diffSets(this._cachedResources.attributes, resources.attributes),
				textures: diffSets(this._cachedResources.textures, resources.textures),
			}

			// create newly added resources

			// auto dispose

			// update cache

			this._cachedResources = resources
		}

		// check the tree
		// @note it seems unnecessary to handle any nodes change before assemble it
		// 		 since we don't need to take care of any changed stuff here

		{
			//
			// const snapshot = this.config.graphProcessor.snapshot(node, true)
			// const changed = this.config.graphProcessor.diff(this._cachedSnapshot, snapshot)
			//
			// const nodes = flatten(node) // array
			// const added = diffWeakSets(nodes, this._cachedNodes)
			//
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
		// - handle all the nodes separately and add its children
		// - use post-order traversal to make sure all the children are created before added
	}

	convMesh() {}
	convGeom() {}
	convAttr() {}
	convMatr() {}
	convTexture() {}
	convColor() {}

	recovery(node: MeshDataType) {}
}

/**
 * get all the resources that needs to be `allocated` and `freed` manually
 *
 * these resources has underlying gpu objects that can not be GC-ed
 *
 * also it's better to modify remote resources pre-frame than mid-frame to avoid stalling.
 */
export function getResources(root?: MeshDataType) {
	// programs
	const materials = new Set<MatrBaseDataType>()
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
				materials.add(mesh.material)
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

					Object.keys(uniforms).forEach((key) => {
						const uniformValue = uniforms[key].value
						if (isTexture(uniformValue) || isCubeTexture(uniformValue)) {
							textures.add(uniformValue)
						}
					})
				}

				// attributes

				Object.keys(mesh.geometry.attributes).forEach((key) => {
					attributes.add(mesh.geometry.attributes[key])
				})
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
