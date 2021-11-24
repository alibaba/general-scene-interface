/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	readonly,
	MatrBaseDataType,
	MatrPbrDataType,
	MatrUnlitDataType,
	MatrPointDataType,
	MatrSpriteDataType,
	PrgBaseDataType,
	UniformDataType,
	ShaderType,
} from '@gs.i/schema'

/**
 * 类 与 默认值
 * 以下 class 的唯一作用是为上面的接口提供默认值，没有任何 method
 * 只是方便，不是必须的
 */

export class MatrBasic implements MatrBaseDataType {
	/**
	 * @note ts 4.0 之后不允许 accessor 继承 property，自动改成了这样
	 */
	// private readonly _type: string
	// public get type(): string {
	// 	return this._type
	// }
	@readonly()
	public get type(): string {
		return 'basic' as const
	}

	name = 'MatrBasic'
	visible = true
	side: 'front' | 'back' | 'double' = 'front'
	alphaMode: 'OPAQUE' | 'MASK' | 'BLEND' | 'BLEND_ADD' = 'OPAQUE'
	alphaCutoff = 0
	depthTest = true
	extensions: { [key: string]: any } = {}
	constructor(params: Partial<MatrBaseDataType> = {}) {
		/**
		 * @note assign 会把 undefined property 覆盖掉 默认值
		 */
		// Object.assign(this, params)
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}

class MatrPrgBasic implements MatrBaseDataType, PrgBaseDataType {
	@readonly()
	public get type(): string {
		return 'prg' as const
	}

	name = 'MatrBasic'
	visible = true
	side: 'front' | 'back' | 'double' = 'front'
	alphaMode: 'OPAQUE' | 'MASK' | 'BLEND' | 'BLEND_ADD' = 'OPAQUE'
	alphaCutoff = 0
	depthTest = true
	extensions: { [key: string]: any } = {}

	/**
	 * @section ShaderLanguage版本
	 */
	language: 'GLSL100' | 'GLSL300' | 'WLSL' = 'GLSL300'

	/**
	 * @section 预处理环节
	 */
	/**
	 * 预处理标示
	 * @glsl #define name value
	 */
	defines: { [name: string]: string | boolean | number | undefined } = {}

	/**
	 * 首行定义，通常用来声明 插件 或者 glsl 版本
	 */
	extension?: string

	/**
	 * @section  数据输入
	 */
	/**
	 * 输入变量，全局变量，每帧自动传入
	 * @glsl
	 * @example { uTime: { value: 0.0, type: 'float' } }
	 */
	uniforms: { [name: string]: UniformDataType } = {}

	/**
	 * 输入变量，每个顶点传入，需与Geom中定义的attribute名称对应
	 * @glsl
	 * @example { aSize: 'float' }
	 */
	attributes: { [name: string]: ShaderType } = {}

	/**
	 * 差值变量，vertex shader 输出，fragment shader 输入
	 * 如果按照glsl300标准写，前面不需要加in/out
	 * @glsl
	 * @example { vHeight: 'float' }
	 */
	varyings: { [name: string]: ShaderType } = {}

	/**
	 * @section vertex shader 通用代码
	 */
	/**
	 * vertex shader main 函数前 插入的 glsl 代码
	 * 用于声明或实现全局变量(uniforms)、全局函数
	 */
	preVert?: string

	/**
	 * 在vertex shader中可以（并且只能）在此处对 position/normal/uv 进行修改
	 * @param vec3 position - [modifiable]
	 * @param vec3 normal - [modifiable]
	 * @param vec2 uv - [modifiable] 如果未使用贴图则uv为(0, 0)
	 * @param mat4 modelMatrix - [readonly]: The mesh's modelMatrix
	 * @param mat4 modelViewMatrix - [readonly]: Equals to viewMatrix * modelMatrix
	 * @param mat4 projectionMatrix - [readonly]
	 * @param mat3 normalMatrix - [readonly]: Equals to inverse transpose of modelViewMatrix
	 */
	vertGeometry?: string

	/**
	 * vertex shader的最终输出结果阶段，可以对gl_Position做最终修改
	 * 若在此处修改了 glPosition (注意没有下划线)，渲染管线会在后续直接使用此处的输出结果
	 * @param vec3 modelViewPosition - [modifiable]
	 * @param mat4 modelViewMatrix - [readonly]
	 * @param mat4 projectionMatrix - [readonly]
	 * @param vec4 glPosition - [modifiable]
	 */
	vertOutput?: string

	/**
	 * vertex shader main 函数 结束前插入的 glsl 代码
	 * 用户在返回前对输出值做最后的修改
	 * @deprecated
	 */
	postVert?: string

	/**
	 * @section fragment shader 通用代码
	 */
	/**
	 * fragment shader main 函数前 插入的 glsl 代码
	 * 用于声明或实现全局变量、全局函数
	 */
	preFrag?: string

	constructor(params: Partial<MatrPrgBasic> = {}) {
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}

export class MatrPbr extends MatrPrgBasic implements MatrPbrDataType {
	@readonly()
	get type() {
		return 'pbr' as const
	}

	// pbr
	name = 'MatrPbr'
	baseColorFactor = { r: 1, g: 1, b: 1 }
	opacity = 1
	emissiveFactor = { r: 0, g: 0, b: 0 }
	metallicFactor = 0.5
	roughnessFactor = 0.5

	/**
	 * @delete
	 * 在fragment阶段对 diffuse 做最终修改
	 * @param vec4 diffuse
	 */
	// fragDiffuse?: string

	/**
	 * @delete
	 * 在fragment阶段对 emissive 做最终修改
	 * @param vec3 emissive
	 */
	// fragEmissive?: string

	/**
	 * @delete
	 * 在fragment阶段对 metalness 做最终修改
	 * @param float metalness
	 */
	// fragMetalness?: string

	/**
	 * @delete
	 * 在fragment阶段对 roughness 做最终修改
	 * @param float roughness
	 */
	// fragRoughness?: string

	/**
	 * 在内置PBR材质渲染流程前对材质参数 diffuse emissive metalness roughness 进行最后修改
	 * @param vec4 diffuse - [modifiable] 漫反射颜色
	 * @param vec3 emissive - [modifiable] 自发光色
	 * @param float metalness - [modifiable] 金属度
	 * @param float roughness - [modifiable] 粗糙度
	 */
	preLighting?: string

	/**
	 * fragment shader main 函数中 光照计算之前
	 * 在此处插入代码可对 modelViewPosition 和 normal 进行修改，注意：normal在输出前需经过归一化
	 * @param vec3 modelViewPosition - [modifiable] 模型和视图变换后的空间位置
	 * @param vec3 normal - [modifiable] 法向量
	 */
	fragGeometry?: string

	constructor(params: Partial<MatrPbrDataType> = {}) {
		super(params)
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}

export class MatrUnlit extends MatrPrgBasic implements MatrUnlitDataType {
	@readonly()
	get type() {
		return 'unlit' as const
	}

	// unlit
	name = 'MatrUnlit'
	baseColorFactor = { r: 1, g: 1, b: 1 }
	opacity = 1

	/**
	 * 在fragment shader阶段对fragColor颜色做最终的修改
	 * @param vec4 fragColor - [modifiable]
	 */
	fragColor?: string

	constructor(params: Partial<MatrUnlitDataType> = {}) {
		super(params)
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}

export class MatrPoint extends MatrPrgBasic implements MatrPointDataType {
	@readonly()
	get type() {
		return 'point' as const
	}

	name = 'MatrPoint'
	size = 5
	sizeAttenuation = false

	baseColorFactor = { r: 1, g: 1, b: 1 }
	opacity = 1

	/**
	 * 在vertex shader阶段对pointSize做最终修改
	 * @param float pointSize - [modifiable]
	 */
	vertPointSize?: string

	/**
	 * 在fragment shader阶段对颜色做最终的修改
	 * @param vec4 fragColor - [modifiable]
	 */
	fragColor?: string

	constructor(params: Partial<MatrPointDataType> = {}) {
		super(params)
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}

//

export class MatrSprite extends MatrPrgBasic implements MatrSpriteDataType {
	@readonly()
	get type() {
		return 'sprite' as const
	}

	name = 'MatrSprite'

	center = { x: 0.5, y: 0.5 }
	size = { x: 1.0, y: 1.0 }
	sizeAttenuation = true
	rotation = 0
	baseColorFactor = { r: 1, g: 1, b: 1 }
	opacity = 1.0
	useAttrSize = false

	/**
	 * 在fragment shader阶段对颜色做最终的修改
	 * @param vec4 fragColor - [modifiable]
	 */
	fragColor?: string

	constructor(params: Partial<MatrSpriteDataType> = {}) {
		super(params)
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}
