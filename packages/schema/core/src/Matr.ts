/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ColorRGB, Double, Transform2, Versioned } from './basic'
import { TextureType } from './Texture'
import { Programable, ProgramablePbr } from './Programable'
/**
 * billboard / sprite 材质
 * - gltf 中没有相关定义
 * - three 和 Babylon 中使用了完全不同的接口
 * - pixijs 中的设计更完善
 * @todo
 * .useAttrRotation
 * .useAttrCenter
 */
export interface MatrSpriteDataType extends MatrBaseDataType {
	readonly type: 'sprite'

	sizeAttenuation: boolean

	/**
	 * 使用Attr.size(vec2)来指定每个sprite的size，默认false
	 * 开启此选项会忽略Matr.size属性
	 */
	/**
	 * 在vertex shader用attribute修改size
	 * @delete use Programable.vertGeometry or Programable.vertOutput instead
	 */
	// useAttrSize?: boolean

	/**
	 * shape of the sprite
	 * - size * scale
	 * - rotation
	 * - offset/position
	 */
	transform: Transform2

	/**
	 * @default {r:1, g:1, b: 1}
	 */
	baseColorFactor: ColorRGB
	baseColorTexture?: TextureType

	extensions?: {
		EXT_matr_programmable_sprite?: {
			vertSpriteGeometry?: string
		}
		/**
		 * alias to standard per-sprite transformation attributes
		 * - set all three of them if you want to specify transformation for each sprite
		 * - follow the standard transformation order
		 * 	- scale, then rotate, then offset
		 * 	- matrix = offset * rotation * scale
		 * - @see https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#transformations
		 */
		EXT_sprite_attributes?: {
			/**
			 * name of the attribute that controls the offset of each sprite
			 * - should be an attribute of `vec2`
			 * - avoid using name `POSITION` which is actually the center of the sprite
			 */
			offset?: string
			/**
			 * name of the attribute that controls the scale of each sprite
			 * - should be an attribute of `vec2`
			 */
			scale?: string
			/**
			 * name of the attribute that controls the rotation of each sprite
			 * - should be an attribute of `float`
			 */
			rotation?: string
		}
	} & MatrBaseDataType['extensions']
}

/**
 * ### point 材质
 * gltf 中没有相关定义
 * {@link https://threejs.org/docs/#api/zh/materials/PointsMaterial}
 */
export interface MatrPointDataType extends MatrBaseDataType {
	readonly type: 'point'

	/**
	 * @default 10
	 */
	size: Double
	/**
	 * @default false
	 */
	sizeAttenuation: boolean

	/**
	 * 在vertex shader阶段对pointSize做最终修改
	 * @param float pointSize
	 * @delete use Programable.vertGeometry or Programable.vertOutput instead
	 */
	// vertPointSize?: string

	/**
	 * @default {r:1, g:1, b: 1}
	 */
	baseColorFactor: ColorRGB
	baseColorTexture?: TextureType

	extensions?: {
		EXT_matr_programmable_point?: {
			vertPointGeometry?: string
		}
	} & MatrBaseDataType['extensions']
}

/**
 * ### unlit 材质
 * @基于 glTF2 extension KHR_materials_unlit
 * @兼容 THREE.MeshBasicMaterial
 * 其实直接用 PBR 材质也能实现相同的效果，但是会浪费一些性能
 *
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_unlit/README.md}
 */
export interface MatrUnlitDataType extends MatrBaseDataType {
	readonly type: 'unlit'

	/**
	 * @default {r:1, g:1, b: 1}
	 */
	baseColorFactor: ColorRGB
	baseColorTexture?: TextureType
}

/**
 * ### PBR 材质
 * @基于 glTF2 标准
 * @兼容 THREE.MeshStandardMaterial
 *
 * @model PBR metallic-roughness
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#reference-pbrmetallicroughness}
 * {@link https://threejs.org/docs/#api/en/materials/MeshStandardMaterial}
 */
export interface MatrPbrDataType extends MatrBaseDataType {
	readonly type: 'pbr'

	// pbr

	/**
	 * @default {r:1, g:1, b: 1}
	 */
	baseColorFactor: ColorRGB
	/**
	 * @default {r:0, g:0, b: 0}
	 */
	emissiveFactor: ColorRGB
	/**
	 * @default 0.5
	 */
	metallicFactor: Double
	/**
	 * @default 0.5
	 */
	roughnessFactor: Double

	/**
	 * @todo three 中没有这个贴图，需要 conv 主动实现
	 */
	metallicRoughnessTexture?: TextureType
	baseColorTexture?: TextureType
	emissiveTexture?: TextureType
	normalTexture?: TextureType
	occlusionTexture?: TextureType

	extensions?: {
		EXT_matr_programmable_pbr?: ProgramablePbr
	} & MatrBaseDataType['extensions']
}

// let a = {} as MatrPbrDataType
// a.extensions?.EXT_matr_advanced
// a.extensions?.EXT_matr_programmable
// a.extensions?.EXT_matr_programmable_pbr

/**
 * 材质数据
 *
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials}
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#material}
 */
export interface MatrBaseDataType extends Versioned {
	readonly type: string

	/**
	 * for readability only
	 */
	name: string

	/**
	 * @default true
	 */
	visible: boolean

	/**
	 * general rendering setting
	 * @default front
	 */
	side: 'front' | 'back' | 'double'

	/**
	 * ### indicate the kind of transparency
	 * - It's quite hard to set {transparent alpha blending depth} properly
	 * * De-dramatize it instead of exposing everything
	 * -
	 * - 底层实现差距太大，不能全部暴漏出来给用户
	 * - 提供几种组合模式，来替代复杂的配置项,
	 * - 这里扩展 glTF2 的 alphaMode 来实现
	 * @default 'OPAQUE'
	 */
	alphaMode:
		| 'OPAQUE' // 不透明 & depth on
		| 'MASK' // alphatest & depth on
		// Support for this mode varies.
		// There is no perfect and fast solution that works for all cases.
		| 'BLEND' // depth test on & depth write off & alpha blend
		| 'BLEND_ADD' // depth test on & depth write off & alpha add blend

	// alphaTest?: number

	/**
	 * @delete use value of opacity
	 */
	// alphaCutoff: number

	/**
	 * ### the degree of opaque
	 * - if alphaMode set to MASK. this will represent alphaCutoff.
	 * - three 的 color 是 rgb，gltf 是 rgba，考虑到与 alphaCutoff 相似
	 * @default 1
	 */
	opacity: Double

	/**
	 * @default {}
	 */
	extensions?: {
		/**
		 * advanced material render control.
		 * - **will override parameters set above.**
		 * - **do not use unless you know what you are doing**
		 */
		EXT_matr_advanced?: {
			/**
			 * depth
			 */
			depthTest?: boolean
			depthWrite?: boolean
			depthFunc?: number
			polygonOffset?: boolean
			polygonOffsetFactor?: number
			polygonOffsetUnits?: number

			/**
			 * blending
			 */
			// blending?: number
			// blendSrc?: number
			// blendSrcAlpha?: number
			// blendDst?: number
			// blendDstAlpha?: number
			// blendEquation?: number
			// blendEquationAlpha?: number
			// blendingMode: 'no' | 'normal' | 'add' | 'multi'

			/**
			 * 暂定删除这些 three 中存在 gltf 中不存在的控制项
			 * 由解释器和引擎选择最正常的方案
			 * 出现问题再添加
			 */
			// precision?: 'highp' | 'mediump' | 'lowp' | null
			// shadowSide?: 'front' | 'back' | 'double'
			// toneMapped?: boolean // pbr 中不需要这个

			/**
			 * @delete flatShading?: boolean
			 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes}
			 * 自动判断是否存在 attributes.normal
			 * Implementation note: When normals are not specified, client implementations should calculate flat normals.
			 */

			/**
			 * @delete vertexColors?: boolean
			 * 自动判断是否存在 attributes.color_0
			 */

			/**
			 * @delete dithering?: boolean
			 * 在支持的情况下总应该开启
			 */

			/**
			 * @delete premultipliedAlpha?: boolean
			 * glTF2 中没有允许这个
			 * glTF2.TEXTURE: The stored texels must not be premultiplied.
			 * 输出时 premultipliedAlpha 是个很古怪的举动，
			 * >> 自动选择最正常的方案 <<
			 */

			/**
			 * @delete colorWrite?: boolean
			 * 只应该出现在特定的 material 中，不通用
			 */

			/**
			 * @delete stencil
			 */

			stencil?: {
				// stencilWrite?: boolean
				// stencilFunc?: number
				// stencilRef?: number
				// stencilMask?: number
				// stencilFail?: number
				// stencilZFail?: number
				// stencilZPass?: number
			}
		}
		EXT_matr_programmable?: Programable
		[key: string]: any
	}

	/**
	 * @default {}
	 */
	extras?: any
}
