/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * @note
 *
 * this file describes the global lights (environment lights) for a whole scene,
 * these lights are mean to apply on the whole scene.
 * all the positions and rotations are in absolute world space.
 *
 * the reason to have independent {global lights} other than
 * {lighting objects} in the scene graph is that:
 *
 * - lights can impact the whole scene and the render pipeline.
 * - lighting is a major part of render techniques. can be heavily related to
 * 		shadowing, baking, pp, weather system and other global settings.
 * - even when a light can be converted into its counterparts in different
 * 		underlying engines. they will very likely cause different results.
 *
 * We hope that anything we put in the scene-graph describes what the scene is
 * rather than what the scene should look like.
 *
 * lighting is not only a part of what the scene has (objects that radiate)
 * but also describes the how the scene should be rendered.
 */

import { ColorRGB, Vec3 } from '@gs.i/schema-scene'

type LightTypes = 'point' | 'directional' | 'spot' | 'ambient'

/**
 * @NOTE
 * gltf2 标准中 lighting 支持非常有限，而且没有把全局光放到光源插件里
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual}
 *
 * difference between gsi global lights and gltf2 lights extension:
 * - transformation
 * 	- gltf2 lights don't have position and directions, because gltf2 lights are
 * 		attached to a node, and follow that node's transformation
 * 	- gsi scene lights are not attached to any node in the scene, thus need absolute positions and directions
 */
export interface LightBase<T extends LightTypes = 'ambient'> {
	type: T
	/**
	 * for readability
	 */
	name?: string
	/**
	 * @default {r:1, g:1, b:1}
	 */
	color?: ColorRGB | string
	/**
	 * @default 1
	 */
	intensity?: number

	/**
	 * @default infinity
	 */
	range?: number
}

export type AmbientLight = LightBase<'ambient'>

export interface DirLight extends LightBase<'directional'> {
	// GLTF中把 DirLight 定义为 从 -z 方向射来的无限远的光
	// 旋转的工作被放在了 node 定义阶段
	// 这里不采用
	position?: Vec3
}

export interface PointLight extends LightBase {
	// gltf中把 PointLight 定义为 在原点，physically correct
	// 这里只采用 physically correct
	// decay?: 2
	position: Vec3
	range?: number
}

/**
 * @see [gltf2-KHR_lights_punctual](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_lights_punctual#spot)
 */
export interface SpotLight extends LightBase<'spot'> {
	position?: Vec3

	/**
	 * falloff begin
	 * @range [0, outerConeAngle]
	 * @default 0
	 */
	innerConeAngle?: number
	/**
	 * falloff end
	 * @range [innerConeAngle, PI/2]
	 * @default PI/4
	 */
	outerConeAngle?: number
}
