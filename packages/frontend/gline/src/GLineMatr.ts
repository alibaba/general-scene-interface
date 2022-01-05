/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable @typescript-eslint/no-this-alias */
import { MatrUnlit, MatrPoint } from '@gs.i/frontend-sdk'
import vsPreVert from './lv24.preVert.glsl'
import vsVertOutput from './lv24.vertOutput.glsl'
import nativeVertGeometry from './lv1.vertGeometry.glsl'
import pointsVertGeometry from './lv0.vertGeometry.glsl'
import FS from './fs.glsl'
import { ColorRGB, Vec2, Texture } from '@gs.i/schema-scene'

export interface GLineMatrConfig {
	/**
	 * GLine实现方式等级
	 * 4倍点、2倍点、native GL line、native GL point
	 */
	level: 0 | 1 | 2 | 4

	opacity: number

	lineWidth: number

	usePerspective?: boolean

	/**
	 * 如果有colors，此项会被忽略
	 */
	color?: ColorRGB

	/**
	 * 画布分辨率
	 */
	resolution: Vec2

	useColors: boolean

	transparent?: boolean

	texture?: Texture

	pointSize?: number

	/**
	 * NOTE: 用于判断一个点是否被废弃
	 * 由于GLSL中没有Infinity这样的常量，因此只能手工指定一个值
	 */
	infinity: number

	/**
	 * 是否进行深度测试
	 */
	depthTest?: boolean

	/**
	 * alpha截断
	 */
	alphaTest?: number
}

export const DefaultMatrConfig: GLineMatrConfig = {
	level: 4,
	opacity: 1.0,
	lineWidth: 10.0,
	color: { r: 1, g: 0.4, b: 0.1 },
	resolution: { x: 500, y: 500 },
	usePerspective: false,
	useColors: false,
	texture: undefined,
	pointSize: 5,
	infinity: 99999999.999,
	depthTest: true,
	alphaTest: 0,
}

const UniformsProps = {
	color: 'uColor',
	lineWidth: 'lineWidth',
	resolution: 'resolution',
	pointSize: 'pointSize',
	// texture: 'TEX',
	alphaTest: 'alphaTest',
}
const DefinesProps = {
	level: 'LEVEL',
	infinity: 'INFINITY',
	usePerspective: 'USE_PERSPECTIVE',
	useColors: 'USE_COLORS',
	texture: 'USE_TEXTURE',
}
const MatrProps = {
	opacity: 'opacity',
	depthTest: 'depthTest',
}

/**
 * GLineMaterial
 */
export class GLineMatr extends MatrUnlit {
	name = 'GLineMatr'

	/**
	 * 外界需要更改任何Matr属性时，务必在config中修改
	 */
	config: any = {}

	constructor(props: Partial<GLineMatrConfig> = {}) {
		super()

		const _config = {
			...DefaultMatrConfig,
			...props,
		}

		// Cannot be changed once created
		this.opacity = _config.opacity

		this.extensions.EXT_matr_programmable = {
			language: 'GLSL100',
			extension: '',
			defines: {
				// 禁止修改
				LEVEL: _config.level,
				INFINITY: _config.infinity,
				// 可以修改
				USE_PERSPECTIVE: _config.usePerspective ?? false,
				USE_COLORS: _config.useColors ?? false,
				USE_TEXTURE: _config.texture && true,
				// USE_ALPHA_TEST: _config.alphaTest !== undefined && _config.alphaTest > 0,
			},
			uniforms: {
				uColor: { value: _config.color ?? { x: 0.5, y: 0.5, z: 0.5 } },
				lineWidth: { value: _config.lineWidth },
				resolution: { value: _config.resolution },
			},
		}

		if (_config.texture) {
			this.extensions.EXT_matr_programmable.uniforms.TEX = {
				value: _config.texture,
			}
		}

		if (_config.level === 0) {
			this.extensions.EXT_matr_programmable.uniforms.pointSize = { value: _config.pointSize ?? 1 }
		}

		// this.defines = {
		// 	// 禁止修改
		// 	LEVEL: _config.level,
		// 	INFINITY: _config.infinity,
		// 	// 可以修改
		// 	USE_PERSPECTIVE: _config.usePerspective ?? false,
		// 	USE_COLORS: _config.useColors ?? false,
		// 	USE_TEXTURE: _config.texture && true,
		// 	USE_ALPHA_TEST: _config.alphaTest !== undefined && _config.alphaTest > 0,
		// }

		switch (_config.level) {
			case 4:
			case 2:
				// this.attributes = {
				// 	curr: 'vec3',
				// 	prev: 'vec3',
				// 	next: 'vec3',
				// 	side: 'float',
				// 	u: 'float',
				// 	color: 'vec4',
				// }
				this.extensions.EXT_matr_programmable.vertGlobal = `
				attribute vec3 curr;
				attribute vec3 prev;
				attribute vec3 next;
				attribute float side;
				attribute float u;
				attribute vec4 color;
				`
				this.extensions.EXT_matr_programmable.global = `
				varying vec4 vColor4;
				uniform vec3 uColor;
				uniform float lineWidth;
				uniform vec2 resolution;
				uniform sampler2D TEX;
				`
				break
			case 1:
			case 0:
				// this.attributes = {
				// 	curr: 'vec3',
				// 	u: 'float',
				// 	color: 'vec4',
				// }
				this.extensions.EXT_matr_programmable.vertGlobal = `
				attribute vec3 curr;
				attribute float u;
				attribute vec4 color;
				`
				this.extensions.EXT_matr_programmable.global = `
				varying vec4 vColor4;
				uniform vec3 uColor;
				uniform float lineWidth;
				uniform vec2 resolution;
				uniform sampler2D TEX;
				`
				break
		}

		// this.varyings = {
		// 	vUv: 'vec2',
		// 	vColor4: 'vec4',
		// }

		if (_config.transparent !== undefined) {
			this.alphaMode = _config.transparent ? 'BLEND' : 'OPAQUE'
		} else if (_config.opacity < 1.0 || _config.useColors) {
			this.alphaMode = 'BLEND'
		} else {
			this.alphaMode = 'OPAQUE'
		}

		this.depthTest = !!_config.depthTest

		// Uniforms change listeners
		const uniforms = this.uniforms
		const defines = this.defines
		for (const key in UniformsProps) {
			Object.defineProperty(this.config, key, {
				configurable: false,
				enumerable: true,
				get() {
					return _config[key]
				},
				set(val) {
					const uniform = uniforms[UniformsProps[key]]
					if (uniform) uniform.value = val
					_config[key] = val
				},
			})
		}

		// Defines change listeners
		for (const key in DefinesProps) {
			if (key === 'texture') {
				Object.defineProperty(this.config, key, {
					configurable: false,
					enumerable: true,
					get() {
						return _config[key]
					},
					set(val) {
						if (val) {
							if (uniforms['TEX']) uniforms['TEX'].value = val
							defines[DefinesProps[key]] = !!val
						} else {
							delete uniforms[key]
							defines[DefinesProps[key]] = !!val
						}
						_config[key] = val
					},
				})
			} else {
				Object.defineProperty(this.config, key, {
					configurable: false,
					enumerable: true,
					get() {
						return _config[key]
					},
					set(val) {
						if (val) {
							defines[DefinesProps[key]] = val
							_config[key] = val
						} else {
							delete defines[DefinesProps[key]]
							_config[key] = val
						}
					},
				})
			}
		}

		// MatrProps
		const _this = this
		Object.defineProperty(this.config, 'opacity', {
			configurable: false,
			enumerable: true,
			get() {
				return _config['opacity']
			},
			set(val) {
				_this['opacity'] = val
				_config['opacity'] = val
				if (_config.transparent !== undefined) {
					this.alphaMode = _config.transparent ? 'BLEND' : 'OPAQUE'
				} else if (_config.opacity < 1.0 || _config.useColors) {
					this.alphaMode = 'BLEND'
				} else {
					this.alphaMode = 'OPAQUE'
				}
			},
		})

		Object.defineProperty(this.config, 'transparent', {
			configurable: false,
			enumerable: true,
			get() {
				return _config['transparent']
			},
			set(val) {
				_config['transparent'] = val
				if (_config.transparent !== undefined) {
					this.alphaMode = _config.transparent ? 'BLEND' : 'OPAQUE'
				} else if (_config.opacity < 1.0 || _config.useColors) {
					this.alphaMode = 'BLEND'
				} else {
					this.alphaMode = 'OPAQUE'
				}
			},
		})

		Object.defineProperty(this.config, 'depthTest', {
			configurable: false,
			enumerable: true,
			get() {
				return _config['depthTest']
			},
			set(val) {
				_this['depthTest'] = val
				_config['depthTest'] = val
			},
		})

		const vs = getVS(_config.level)
		const fs = getFS(_config.level)

		this.extensions.EXT_matr_programmable.vertGlobal += '\n' + (vs.preVert || '')
		this.extensions.EXT_matr_programmable.vertGeometry = vs.vertGeometry
		this.extensions.EXT_matr_programmable.vertOutput = vs.vertOutput
		this.extensions.EXT_matr_programmable.fragGlobal = fs.preFrag || ''
		this.extensions.EXT_matr_programmable.fragOutput = fs.fragColor
	}
}

export class GLinePointMatr extends MatrPoint {
	name = 'GLineMatr'

	config: any = {}

	constructor(props: Partial<GLineMatrConfig> = {}) {
		super()

		const _config = {
			...DefaultMatrConfig,
			...props,
		}

		// Cannot be changed once created
		this.opacity = _config.opacity
		this.size = _config.pointSize || 5
		this.sizeAttenuation = !!_config.usePerspective

		this.extensions.EXT_matr_programmable = {
			language: 'GLSL100',
			extension: '',
			defines: {
				// 禁止修改
				LEVEL: _config.level,
				INFINITY: _config.infinity,
				// 可以修改
				USE_COLORS: _config.useColors || false,
				USE_TEXTURE: _config.texture && true,
			},
			uniforms: {
				uColor: { value: _config.color ?? { x: 0.5, y: 0.5, z: 0.5 } },
				lineWidth: { value: _config.lineWidth },
				resolution: { value: _config.resolution },
			},
			vertGlobal: `
				attribute vec3 curr;
				attribute float u;
				attribute vec4 color;
				varying vec2 vUv;
				varying vec4 vColor4;
				`,
			fragGlobal: `
				varying vec2 vUv;
				varying vec4 vColor4;
				uniform vec3 uColor;
				uniform float lineWidth;
				uniform vec2 resolution;
				uniform sampler2D TEX;
				`,
		}

		if (_config.texture) {
			this.uniforms.TEX = { value: _config.texture }
		}

		// this.defines = {
		// 	// 禁止修改
		// 	LEVEL: _config.level,
		// 	INFINITY: _config.infinity,
		// 	// 可以修改
		// 	USE_COLORS: _config.useColors || false,
		// 	USE_TEXTURE: _config.texture && true,
		// }

		// this.attributes = {
		// 	curr: 'vec3',
		// 	u: 'float',
		// 	color: 'vec4',
		// }

		// this.varyings = {
		// 	vUv: 'vec2',
		// 	vColor4: 'vec4',
		// }

		if (_config.transparent !== undefined) {
			this.alphaMode = _config.transparent ? 'BLEND' : 'OPAQUE'
		} else if (_config.opacity < 1.0 || _config.useColors) {
			this.alphaMode = 'BLEND'
		} else {
			this.alphaMode = 'OPAQUE'
		}

		this.depthTest = !!_config.depthTest

		// Uniforms change listeners
		const uniforms = this.uniforms
		const defines = this.defines
		for (const key in UniformsProps) {
			Object.defineProperty(this.config, key, {
				configurable: false,
				enumerable: true,
				get() {
					return _config[key]
				},
				set(val) {
					const uniform = uniforms[UniformsProps[key]]
					if (uniform) uniform.value = val
					_config[key] = val
				},
			})
		}

		// Defines change listeners
		for (const key in DefinesProps) {
			if (key === 'texture') {
				Object.defineProperty(this.config, key, {
					configurable: false,
					enumerable: true,
					get() {
						return _config[key]
					},
					set(val) {
						if (val) {
							if (uniforms['TEX']) uniforms['TEX'].value = val
							defines[DefinesProps[key]] = !!val
						} else {
							delete uniforms[key]
							defines[DefinesProps[key]] = !!val
						}
						_config[key] = val
					},
				})
			} else {
				Object.defineProperty(this.config, key, {
					configurable: false,
					enumerable: true,
					get() {
						return _config[key]
					},
					set(val) {
						defines[DefinesProps[key]] = val
						_config[key] = val
					},
				})
			}
		}

		// MatrProps
		const _this = this
		Object.defineProperty(this.config, 'opacity', {
			configurable: false,
			enumerable: true,
			get() {
				return _config['opacity']
			},
			set(val) {
				_this['opacity'] = val
				_config['opacity'] = val
				if (_config.transparent !== undefined) {
					this.alphaMode = _config.transparent ? 'BLEND' : 'OPAQUE'
				} else if (_config.opacity < 1.0 || _config.useColors) {
					this.alphaMode = 'BLEND'
				} else {
					this.alphaMode = 'OPAQUE'
				}
			},
		})

		Object.defineProperty(this.config, 'transparent', {
			configurable: false,
			enumerable: true,
			get() {
				return _config['transparent']
			},
			set(val) {
				_config['transparent'] = val
				if (_config.transparent !== undefined) {
					this.alphaMode = _config.transparent ? 'BLEND' : 'OPAQUE'
				} else if (_config.opacity < 1.0 || _config.useColors) {
					this.alphaMode = 'BLEND'
				} else {
					this.alphaMode = 'OPAQUE'
				}
			},
		})

		Object.defineProperty(this.config, 'depthTest', {
			configurable: false,
			enumerable: true,
			get() {
				return _config['depthTest']
			},
			set(val) {
				_this['depthTest'] = val
				_config['depthTest'] = val
			},
		})

		const vs = getVS(_config.level)
		const fs = getFS(_config.level)

		this.vertGlobal += '\n' + (vs.preVert || '')
		this.vertGeometry = vs.vertGeometry
		this.vertOutput = vs.vertOutput
		this.fragGlobal = fs.preFrag || ''
		this.fragOutput = fs.fragColor
	}
}

function getVS(level) {
	if (level === 4 || level === 2) {
		return {
			preVert: vsPreVert,
			vertGeometry: '',
			vertOutput: vsVertOutput,
		}
	} else if (level === 1) {
		return {
			preVert: '',
			vertGeometry: nativeVertGeometry,
			vertOutput: '',
		}
	} else if (level === 0) {
		return {
			preVert: '',
			vertGeometry: pointsVertGeometry,
			vertOutput: '',
		}
	} else {
		throw new Error(`Level must be 0, 1, 2 or 4. Unsupported level: ${level}`)
	}
}

function getFS(level) {
	return {
		preFrag: '',
		fragColor: FS,
	}
}
