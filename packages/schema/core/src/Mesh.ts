/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * 通用可渲染对象
 * 定义一种跨平台的场景树节点，能高效地实时转换为不同渲染引擎中对应的概念
 * @参照
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes glTF2}
 * {@link https://github.com/alibaba/dimbin/blob/master/geom-tuple/GeomTuple.ts GeomTuple}
 * {@link https://threejs.org/docs/#api/zh/core/Object3D three.Object3D}
 * {@link https://threejs.org/docs/#api/zh/objects/Mesh three.Mesh}
 * {@link https://github.com/BabylonJS/Babylon.js/blob/master/src/Meshes/mesh.ts BabylonJS.Mesh}
 * {@link https://developers.google.com/sceneform/reference/com/google/ar/sceneform/rendering/Renderable google Sceneform.Renderable}
 * {@link http://weber.itn.liu.se/~karlu20/tmp/OpenSceneGraph/classosg_1_1Group.html OpenSceneGraph.Group}
 *
 * TODO naming is kinda confusing
 */

import { MaterialBase } from './Matr'
import { Geometry } from './Geom'
import { Int, Transform3 } from './basic'
import { LuminousEXT } from './Luminous'

/**
 * A GSI scene is structured as a classic scene graph.
 * Every object in a scene is a node. All nodes form into a tree.
 * Transformations and visibilities are inherited down from the root to leaf nodes.
 *
 * The tree must meet the following constraints:
 * - N-ary (多叉树). A node can have multiple children.
 * - directed (有向). From the root to leaves.
 * - acyclic (无环). No loop. There is one and only one path to every node.
 * - rooted/oriented (有单一根). Every node has a single parent. Every scene has a single root.
 *
 * Also you can not re-use a removed node or change its position.
 *
 * @note When adding a node to a `parent.children`. It is necessary to set the `node.parent` too.
 */
export interface BaseNode {
	/**
	 * 物体名，调试使用
	 * - For readability only
	 */
	name: string

	/**
	 * @default true
	 */
	visible: boolean

	/**
	 * 将 transform 定义在 node 中，和 mesh 节点分离
	 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#transformations}
	 *
	 * the transformation of this mesh
	 */
	transform: Transform3

	/**
	 * children of this node
	 */
	children: Set<NodeLike>

	/**
	 * * parent reference should be set once put in a tree,
	 * * root nodes don't have a parent
	 * * circular reference is not allowed
	 */
	parent?: NodeLike

	extras?: any

	extensions?: {
		/**
		 * @experimental
		 *
		 * A direct reference to a threejs object3D.
		 * - Used for bypassing GSI converter.
		 * - When represented, the converter should use this object as result without modification. Other properties should be ignored.
		 * - Fallback to a normal node if this extension is not supported.
		 *
		 * @note Referenced three objects should not traverse up the parent tree.
		 * @note Root node can not use this extension.
		 * @note You may have to call `updateMatrixWorld(true)` on your referenced objects.
		 * @note Must enable `keepTopology`.
		 * @note When using this extension, you are responsible for managing this threejs object's lifecycle.
		 *
		 * @note This will break compatibility for different backends.
		 * @note This extension only affect certain converters.
		 */
		EXT_ref_threejs?: any

		[key: string]: any
	}
}

/**
 * renderable nodes with geometries and materials
 */
export interface RenderableNode extends BaseNode {
	// geometry / mesh
	geometry: Geometry

	// material
	material: MaterialBase

	extensions?: {
		/**
		 * User intervened render-order.
		 * @description
		 * Not Yet Well Designed. May Change In The Future.
		 *
		 * It is very hard to specify the 'order' of a 3d object.
		 * Since there is already a natural order by it's position in 3d space.
		 * And an internal order for the renderer to implement transparent or ray-tracing.
		 *
		 * To make it harder. Every render engine has its own definition for this.
		 * - three.js has `renderOrder`
		 * - Unreal has `Render Priority` and `Translucent Sort Priority`
		 * - Babylon has `renderingGroupId` and extra control for sort functions
		 * - Inheriting is not specified in most engines.
		 */
		EXT_mesh_order?: {
			/**
			 * three.js mesh.renderOrder
			 * - do not inherit from parent node
			 * @note only works for three.js compatibility backends.
			 * @see https://threejs.org/docs/#api/en/core/Object3D.renderOrder
			 */
			renderOrder?: Int
		}

		/**
		 * advanced control for mesh rendering techniques.
		 */
		EXT_mesh_advanced?: {
			/**
			 * Whether to enable camera frustum culling.
			 *
			 * set this to false to disable frustum culling for this renderable object.
			 *
			 * - do not inherit from parent node
			 * @default true
			 */
			frustumCulling?: boolean
		}

		/**
		 * advanced control for mesh shadow rendering.
		 * @note
		 * - Shadow control is NOT a part of the scene graph. But a part of renderer technique.
		 * - In the realistic world. All visible objects should be able to cast and receive shadows. Unless its very luminous or transparent.
		 * - But in the real-time rendering. Most shadows will look wrong.
		 * - This extension should only effect supported backends.
		 */
		EXT_mesh_shadow?: {
			receiveShadow?: boolean
			castShadow?: boolean
		}
	} & BaseNode['extensions']
}

export interface LuminousNode extends BaseNode {
	extensions: { EXT_luminous?: LuminousEXT } & BaseNode['extensions']
}

/**
 * Mesh object for scene tree construction
 */
export type NodeLike = RenderableNode | BaseNode | LuminousNode
