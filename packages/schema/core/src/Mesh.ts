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

import { MatrBaseDataType } from './Matr'
import { GeomDataType } from './Geom'
import { Int, Transform3 } from './basic'

/**
 * Mesh object for scene tree construction
 * @limit 单 geometry，单 material
 */

export type MeshDataType = RenderableMesh | Node

export interface RenderableMesh extends Node {
	// geometry / mesh
	geometry: GeomDataType

	// material
	material: MatrBaseDataType
}

export interface Node {
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
	children: Set<MeshDataType>

	/**
	 * * parent reference should be set once put in a tree,
	 * * root nodes don't have a parent
	 * * circular reference is not allowed
	 */
	parent?: MeshDataType

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

		[key: string]: any
	}

	extras?: any
}
