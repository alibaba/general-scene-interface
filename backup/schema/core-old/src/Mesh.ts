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
import { __GSI_MESH_INTERNAL_PROP_KEY_0__, __GSI_MESH_INTERNAL_PROP_0__ } from './basic'

/**
 * Mesh object for scene tree construction
 * @limit 单 geometry，单 material
 */

export interface MeshDataType {
	/**
	 * 物体名，调试使用
	 * @see three.mesh
	 */
	name?: string

	/**
	 * 内部ID，在一些情况下可能被用于判断相等性
	 * @todo 删掉，不安全接口
	 * @deprecated
	 */
	id?: string

	/**
	 * 可见性
	 */
	visible?: boolean

	// geometry / mesh
	geometry?: GeomDataType

	// material
	material?: MatrBaseDataType

	// render control
	renderOrder: number

	/**
	 * glTF2 中将 transform 定义在 node 中，和 mesh 节点分离
	 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#transformations}
	 */
	// transform
	transform: TransformDataType

	// sub
	children: Set<MeshDataType>

	parent?: MeshDataType

	extras?: { [key: string]: any }

	// interval props store
	[__GSI_MESH_INTERNAL_PROP_KEY_0__]?: __GSI_MESH_INTERNAL_PROP_0__

	/**
	 * converter
	 * @todo 响应式，主动通知 conv 更新数据
	 * @note 如果没有实现响应式更新，就删掉这个接口
	 * @deprecated
	 */
	// converter?: any
}

export interface TransformDataType {
	position?: { x: number; y: number; z: number }
	rotation?: { x: number; y: number; z: number; order: string }
	scale?: { x: number; y: number; z: number }
	matrix: number[]
	worldMatrix?: number[]
}
