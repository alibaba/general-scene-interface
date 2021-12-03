/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ColorLike } from './basic'
import { PrgBaseDataType } from './ProgrammableMatr'
import { TextureType } from './Texture'

/**
 * @important
 * billborad / sprite 材质
 * gltf 中没有相关定义
 * three 和 Babylon 中使用了完全不同的接口
 * pixijs 中的设计更完善
 */
export interface MatrSpriteDataType extends PrgBaseDataType, MatrBaseDataType {
	readonly type: 'sprite'

	center: { x: number; y: number }
	size: { x: number; y: number }
	sizeAttenuation: boolean
	rotation: number // in radians

	baseColorFactor: ColorLike | string
	opacity: number
	baseColorTexture?: TextureType

	/**
	 * 使用Attr.size(vec2)来指定每个sprite的size，默认false
	 * 开启此选项会忽略Matr.size属性
	 */
	useAttrSize?: boolean

	/**
	 * @todo
	 * .useAttrRotation
	 * .useAttrCenter
	 */

	/**
	 * 在fragment shader阶段对颜色做最终的修改
	 * @param vec4 fragColor
	 */
	fragColor?: string
}

/**
 * @todo line 材质
 * 不应该用到
 */

/**
 * point 材质
 * gltf 中没有相关定义
 * {@link https://threejs.org/docs/#api/zh/materials/PointsMaterial}
 */
export interface MatrPointDataType extends MatrBaseDataType, PrgBaseDataType {
	readonly type: 'point'

	size: number
	sizeAttenuation: boolean

	baseColorFactor: ColorLike | string
	opacity: number // three 的 color 是 rgb，gltf 是 rgba
	baseColorTexture?: TextureType

	/**
	 * @section Custom Shader
	 */
	/**
	 * 在vertex shader阶段对pointSize做最终修改
	 * @param float pointSize
	 */
	vertPointSize?: string

	/**
	 * 在fragment shader阶段对颜色做最终的修改
	 * @param vec4 fragColor
	 */
	fragColor?: string
}
export function isMatrPointDataType(a: MatrBaseDataType): a is MatrPointDataType {
	return a.type === 'point'
}

/**
 * unlit 材质
 * @基于 glTF2 extension KHR_materials_unlit
 * @兼容 THREE.MeshBasicMaterial
 * 其实直接用 PBR 材质也能实现相同的效果，但是会浪费一些性能
 *
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_unlit/README.md}
 */
export interface MatrUnlitDataType extends MatrBaseDataType, PrgBaseDataType {
	readonly type: 'unlit'

	baseColorFactor: ColorLike | string
	opacity: number // three 的 color 是 rgb，gltf 是 rgba
	baseColorTexture?: TextureType

	/**
	 * @section Custom Shader
	 */
	/**
	 * 在fragment shader阶段对fragColor颜色做最终的修改
	 * @param vec4 fragColor
	 */
	fragColor?: string
}
export function isMatrUnlitDataType(a: MatrBaseDataType): a is MatrUnlitDataType {
	return a.type === 'unlit'
}

/**
 * PBR 材质
 * @基于 glTF2 标准
 * @兼容 THREE.MeshStandardMaterial
 *
 * @model PBR metallic-roughness
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#reference-pbrmetallicroughness}
 * {@link https://threejs.org/docs/#api/en/materials/MeshStandardMaterial}
 */
export interface MatrPbrDataType extends MatrBaseDataType, PrgBaseDataType {
	readonly type: 'pbr'

	// pbr
	baseColorFactor: ColorLike | string
	opacity: number // three 的 color 是 rgb，gltf 是 rgba
	emissiveFactor: ColorLike | string
	metallicFactor: number
	roughnessFactor: number

	/**
	 * @todo three 中没有这个贴图
	 */
	metallicRoughnessTexture?: TextureType
	baseColorTexture?: TextureType
	emissiveTexture?: TextureType
	normalTexture?: TextureType
	occlusionTexture?: TextureType

	/**
	 * @section Custom Shader
	 * 理论上，对所有 PBR 的输入参数进行 编程控制
	 * 就可以实现所有 PBR 场景中需要的渲染效果
	 * 而不应该对渲染管线本身做修改（这样的修改都是不可跨引擎、跨版本使用的）
	 */
	/**
	 * @delete
	 * 在内置逻辑 diffuse 获取之后插入，可以对得到的 diffuse 做修改
	 * @param vec4 diffuse 漫反射颜色
	 */
	// fragDiffuse?: string

	/**
	 * @delete
	 * 在fragment shader内置逻辑 emissive 获取之后插入，可以对得到的 emissive 做修改
	 * @param vec3 emissive 自发光色
	 */
	// fragEmissive?: string

	/**
	 * @delete
	 * 可以对得到的 metalness 做修改
	 * @param float metalness 金属度
	 */
	// fragMetalness?: string

	/**
	 * @delete
	 * 可以对得到的 roughness 做修改
	 * @param float roughness 粗糙度
	 */
	// fragRoughness?: string

	/**
	 * 在内置PBR材质渲染流程前对材质参数 diffuse emissive metalness roughness 进行最后修改
	 * @param vec4 diffuse 漫反射颜色
	 * @param vec3 emissive 自发光色
	 * @param float metalness 金属度
	 * @param float roughness 粗糙度
	 */
	preLighting?: string

	/**
	 * fragment shader main 函数中 光照计算之前
	 * 在此处插入代码可对 modelViewPosition 和 normal 进行修改，注意：normal在输出前需经过归一化
	 * @param vec3 modelViewPosition 模型和视图变换后的空间位置
	 * @param vec3 normal 法向量
	 */
	fragGeometry?: string
}

export function isMatrPbrDataType(a: MatrBaseDataType): a is MatrPbrDataType {
	return a.type === 'pbr'
}

/**
 * 材质数据
 * 几乎不可能在不同引擎的材质定义中找到平衡
 * 因此只能以 gltf 的 pbr 和 ext 为基准 进行扩展
 * 并增加编程插槽，用于插入数据
 *
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials}
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#material}
 */
export interface MatrBaseDataType {
	readonly type: string
	name: string
	visible: boolean

	// general rendering setting
	side?: 'front' | 'back' | 'double'

	/**
	 * transparent alpha belding depth
	 * 总会给开发造成困扰
	 * 应该提供几种模式，来替代复杂的配置项,
	 * 这里扩展 glTF2 的 alphaMode 来实现
	 * de-dramalize
	 */

	alphaMode:
		| 'OPAQUE' // 不透明 & depth on
		| 'MASK' // alphatest & depth on
		// Support for this mode varies.
		// There is no perfect and fast solution that works for all cases.
		| 'BLEND' // depth test on & depth write off & alpha blend
		| 'BLEND_ADD' // depth test on & depth write off & alpha add blend

	// 排序使用
	// transparent?: boolean

	// alphaTest?: number
	alphaCutoff: number

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
	 * depth
	 * 实际上并不能自由组合，而且容易出错
	 * 应该合并成几种模式
	 */
	// depthFunc?: number
	depthTest?: boolean
	// depthWrite?: boolean
	// polygonOffset?: boolean
	// polygonOffsetFactor?: number
	// polygonOffsetUnits?: number

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
	// stencilWrite?: boolean
	// stencilFunc?: number
	// stencilRef?: number
	// stencilMask?: number
	// stencilFail?: number
	// stencilZFail?: number
	// stencilZPass?: number

	extensions?: { [key: string]: any }
	extras?: any
}
