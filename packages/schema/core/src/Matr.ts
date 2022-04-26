/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ColorRGB, Double, Matrix, Versioned } from './basic'
import { Texture } from './Texture'
import { Programable, ProgramablePbr } from './Programable'

/**
 * ### point 材质
 * gltf 中没有相关定义
 * {@link https://threejs.org/docs/#api/zh/materials/PointsMaterial}
 */
export interface PointMaterial extends MaterialBase {
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
	baseColorTexture?: Texture

	extensions?: {
		EXT_matr_programmable_point?: {
			vertPointGeometry?: string
		}
	} & MaterialBase['extensions']
}

/**
 * ### unlit 材质
 * @基于 glTF2 extension KHR_materials_unlit
 * @兼容 THREE.MeshBasicMaterial
 * 其实直接用 PBR 材质也能实现相同的效果，但是会浪费一些性能
 *
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_unlit/README.md}
 */
export interface UnlitMaterial extends MaterialBase {
	readonly type: 'unlit'

	/**
	 * @default {r:1, g:1, b: 1}
	 */
	baseColorFactor: ColorRGB
	baseColorTexture?: Texture
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
export interface PbrMaterial extends MaterialBase {
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
	metallicRoughnessTexture?: Texture
	baseColorTexture?: Texture
	emissiveTexture?: Texture
	normalTexture?: Texture
	occlusionTexture?: Texture

	extensions?: {
		EXT_matr_programmable_pbr?: ProgramablePbr
	} & MaterialBase['extensions']
}

// let a = {} as MatrPbr
// a.extensions?.EXT_matr_advanced
// a.extensions?.EXT_matr_programmable
// a.extensions?.EXT_matr_programmable_pbr

/**
 * 材质数据
 *
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials}
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#material}
 */
export interface MaterialBase extends Versioned {
	readonly type: string

	/**
	 * for readability only
	 * @bumpVersion
	 * @default 'unnamed matr'
	 */
	name: string

	/**
	 * @default true
	 */
	visible: boolean

	/**
	 * general rendering setting
	 * @default front
	 * @bumpVersion
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
	 * @bumpVersion
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
	 * @bumpVersion
	 */
	extensions?: {
		/**
		 * advanced material render control.
		 * - **will override parameters set above.**
		 * - **do not use unless you know what you are doing**
		 * @bumpVersion
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
		/**
		 * material specified uv transformation.
		 */
		EXT_matr_uv_transform?: {
			matrix: Matrix
		}
		EXT_matr_programmable?: Programable
		[key: string]: any
	}

	/**
	 * @default {}
	 */
	extras?: any
}

/**
 * union type of all gsi materials
 * @simon
 */
export type Material = PointMaterial | UnlitMaterial | PbrMaterial
