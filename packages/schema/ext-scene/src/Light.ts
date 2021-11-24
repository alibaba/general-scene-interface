/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ColorLike, Vec3 } from '@gs.i/schema'

/**
 * @NOTE
 * gltf2 标准中 lighting 支持非常有限，而且没有把全局光放到光源插件里
 * 因此这里不采用gltf2一致的接口
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual}
 */
export interface GLTFLight {
	// type: 'point' | 'directional' | 'spot'
	name?: string
	color?: ColorLike | string
	intensity?: number
}

export type AmbientLight = GLTFLight

export interface DirLight extends GLTFLight {
	// GLTF中把 DirLight 定义为 从 -z 方向射来的无限远的光
	// 旋转的工作被放在了 node 定义阶段
	// 这里不采用
	position: Vec3
}

export interface PointLight extends GLTFLight {
	// gltf中把 PointLight 定义为 在原点，physically correct
	// 这里只采用 physically correct
	// decay?: 2
	position: Vec3
	range?: number
}
