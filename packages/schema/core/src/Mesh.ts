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
	 */
	// transform
	transform: Transform3

	// sub
	children: Set<MeshDataType>

	parent?: MeshDataType

	extensions?: {
		EXT_render_order?: {
			renderOrder?: Int
		}
		[key: string]: any
	}

	extras: any
}
