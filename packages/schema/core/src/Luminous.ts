/**
 * description of luminous objects
 *
 * @note
 * This is the schema to define objects in the scene graph that radiate
 * and light up near-by objects.
 * Not the lights applied on the scene as environment or background.
 *
 * Thus all these lights have specific effective ranges.
 * And be attached to an node in the scene.
 *
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual}
 */

import { ColorRGB } from './basic'

/**
 * @see [gltf2-KHR_lights_punctual](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_lights_punctual#light-shared-properties)
 */
export interface LightBase {
	type: 'point' | 'spot' // | 'rect'
	/**
	 * for readability
	 */
	name?: string
	/**
	 * @default {r:1, g:1, b:1}
	 */
	color: ColorRGB
	/**
	 * @default 1
	 */
	intensity: number
	/**
	 * a hint for renderers to filter the objects that will affected by this light
	 *
	 * set this to a reasonable value (smallest possible) for performance opt
	 *
	 * @default infinity
	 */
	range: number
}

export interface PointLight extends LightBase {
	type: 'point'
}

/**
 * direction to -z axis
 * @see [gltf2-KHR_lights_punctual](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_lights_punctual#spot)
 */
export interface SpotLight extends LightBase {
	type: 'spot'
	/**
	 * falloff begin
	 * @range [0, outerConeAngle]
	 * @default 0
	 */
	innerConeAngle: number
	/**
	 * falloff end
	 * @range [innerConeAngle, PI/2]
	 * @default PI/4
	 */
	outerConeAngle: number
}

export type LuminousEXT = LightBase
