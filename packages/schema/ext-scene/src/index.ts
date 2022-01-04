/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { TextureType, CubeTextureType } from '@gs.i/schema-scene'
import { Antialias } from './Antialias'
import { AmbientLight, DirLight, PointLight } from './Light'
import { Postprocessing } from './Postprocessing'

export interface SceneProps {
	/**
	 * 背景
	 * trans | rgba | texture
	 */
	background?:
		| 'transparent'
		| string
		| TextureType
		| CubeTextureType
		| string
		| [string, string, string, string, string, string, string]

	/**
	 * 全局环境贴图
	 * 场景中的 PBR 材质默认使用全局环境光贴图
	 */
	envMap?:
		| TextureType
		| CubeTextureType
		| string
		| [string, string, string, string, string, string, string]

	/**
	 * 光照
	 * three 和 gltf2 中都没有涉及 光源分组，因此所有光源默认都加在全局上
	 */
	lights?: {
		ambientLight?: AmbientLight
		directionalLights?: DirLight[]
		pointLights?: PointLight[]
	}

	/**
	 * 抗锯齿
	 */
	antialias?: Antialias

	/**
	 * @todo
	 * 阴影设置
	 */
	shadows?: false

	/**
	 * @todo
	 * 后期设置
	 * 考虑移到单独的扩展里
	 */
	postprocessing?: false | Postprocessing[]
}
