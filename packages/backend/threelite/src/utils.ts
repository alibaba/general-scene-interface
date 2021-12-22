/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Box3, Sphere, Object3D, Vector3, Euler, Quaternion, Matrix4 } from 'three-lite'
import { BBox, BSphere } from '@gs.i/schema-scene'

export function box3Equals(b1: Box3 | BBox, b2: Box3 | BBox): boolean {
	return (
		b1.min.x === b2.min.x &&
		b1.min.y === b2.min.y &&
		b1.min.z === b2.min.z &&
		b1.max.x === b2.max.x &&
		b1.max.y === b2.max.y &&
		b1.max.z === b2.max.z
	)
}

export function sphereEquals(s1: Sphere | BSphere, s2: Sphere | BSphere): boolean {
	return (
		s1.center.x === s2.center.x &&
		s1.center.y === s2.center.y &&
		s1.center.z === s2.center.z &&
		s1.radius === s2.radius
	)
}

export function elementsEquals(e1: number[], e2: number[]): boolean {
	if (e1.length !== e2.length) {
		return false
	}
	for (let i = 0, l = e1.length; i < l; i++) {
		if (e1[i] !== e2[i]) {
			return false
		}
	}
	return true
}

export function convDefines(gl2Defines = {}, defines = {}) {
	const d = gl2Defines
	for (const key in defines) {
		if (defines[key] !== undefined && defines[key] !== null && defines[key] !== false) {
			defines[key] !== d[key] && (d[key] = defines[key])
		} else {
			delete gl2Defines[key]
		}
	}
	// Check if define flag has been deleted
	for (const key in gl2Defines) {
		if (defines[key] === undefined || defines[key] === null || defines[key] === false) {
			delete gl2Defines[key]
			console.error(
				'GSI::GL2Converter Material defines has been changed, this will not take effects because shaders re-compilation is not supported in GL2Converter. Please reconstruct a new material instead. '
			)
		}
	}
	return d
}

export const DefaultVertexShader = `
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`
export const DefaultFragmentShader = `
void main() {
    gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`

/** not necessary any more
 * 
export type PreShaderCodes = {
	attributes: string
	varyingsVert: string
	varyingsFrag: string
	uniforms: string
}
// 自动过滤掉three自带的几个attr名称
const DEFAULT_ATTR_NAMES = ['position', 'normal', 'uv']
export function genPreShaderCode(matr: MatrBaseDataType): PreShaderCodes {
	const codes: PreShaderCodes = {
		attributes: '',
		varyingsVert: '',
		varyingsFrag: '',
		uniforms: '',
	}

	const attributes = matr.attributes
	const varyings = matr.varyings
	const uniforms = matr.uniforms
	if (attributes) {
		for (const key in attributes) {
			// Filtering
			if (DEFAULT_ATTR_NAMES.indexOf(key) > -1) {
				continue
			}
			codes.attributes += `attribute ${attributes[key]} ${key};\n`
		}
	}
	if (varyings) {
		for (const key in varyings) {
			codes.varyingsVert += `varying ${varyings[key]} ${key};\n`
			codes.varyingsFrag += `varying ${varyings[key]} ${key};\n`
		}
	}
	if (uniforms) {
		for (const key in uniforms) {
			if (uniforms[key] === undefined || uniforms[key] === null) {
				continue
			}
			if (Array.isArray(uniforms[key].value)) {
				// Array uniforms
				const arr = uniforms[key].value as any[]
				const type = uniforms[key].type
				if (arr.every((v) => !Array.isArray(v))) {
					// 如果Array内没有Array，就是一个普通的array uniform
					if (type === 'mat3' || type === 'mat4') {
						// 普通的matrix
						codes.uniforms += `uniform ${uniforms[key].type} ${key};\n`
					} else {
						codes.uniforms += `uniform ${uniforms[key].type} ${key}[${arr.length}];\n`
					}
				} else {
					codes.uniforms += `uniform ${uniforms[key].type} ${key}[${arr.length}];\n`
				}
			} else {
				codes.uniforms += `uniform ${uniforms[key].type} ${key};\n`
			}
		}
	}
	return codes
}

 */

export const SupportedExtensions = (function checkExts() {
	const flags = {
		derivatives: true,
		fragDepth: true,
		drawBuffers: true,
		shaderTextureLOD: true,
	}

	// Check webgl extensions
	const _canvas = document.createElement('canvas')
	const _gl = _canvas.getContext('webgl') // WebGL 1.0
	if (!_gl) {
		throw new Error('Environment does not support webgl. ')
	}

	// 1. OES_standard_derivatives
	// 2. EXT_shader_texture_lod
	const ext1 = 'OES_standard_derivatives'
	if (!_gl.getExtension(ext1)) {
		console.error(`GSI::ThreeLiteConverter - WebGL Extension not supported: ${ext1}`)
		flags.derivatives = false
	}

	const ext2 = 'EXT_shader_texture_lod'
	if (!_gl.getExtension(ext2)) {
		console.error(`GSI::ThreeLiteConverter - WebGL Extension not supported: ${ext2}`)
		flags.shaderTextureLOD = false
	}

	const ext3 = 'EXT_frag_depth'
	if (!_gl.getExtension(ext3)) {
		console.error(`GSI::ThreeLiteConverter - WebGL Extension not supported: ${ext3}`)
		flags.fragDepth = false
	}

	const ext4 = 'WEBGL_draw_buffers'
	if (!_gl.getExtension(ext4)) {
		console.error(`GSI::ThreeLiteConverter - WebGL Extension not supported: ${ext4}`)
		flags.drawBuffers = false
	}

	// Force lose context after usage
	// const loseContext = _gl.getExtension('WEBGL_lose_context')
	// if (loseContext) {
	// 	loseContext.loseContext()
	// }

	Object.freeze(flags)

	return flags
})()

/**
 * - prevent user from using three.js Object3D's transformation and matrix-calculation
 * - prevent three.js renderer from updating matrix automatically
 */
export function sealTransform(threeMesh: Object3D) {
	Object.defineProperty(threeMesh, 'matrixAutoUpdate', {
		// value: false,
		// writable: false,
		get: () => {
			return false
		},
		set: (v) => {
			if (v)
				console.error(
					`matrixAutoUpdate can not be set to true,` +
						`because this object3D's matrix is managed by gsi processor`
				)
		},
	})

	Object.defineProperty(threeMesh, 'matrixWorldNeedsUpdate', {
		// value: false,
		get: () => {
			return false
		},
		set: (v) => {
			if (v)
				console.error(
					`matrixWorldNeedsUpdate can not be set to true,` +
						`because this object3D's matrix is managed by gsi processor`
				)
		},
	})

	Object.defineProperty(threeMesh, 'position', {
		get: () => {
			console.warn(
				`position will always be 0,0,0` +
					`because this object3D's matrix is managed by gsi processor`
			)
			return new Vector3()
		},
	})

	Object.defineProperty(threeMesh, 'rotation', {
		get: () => {
			console.warn(
				`rotation will always be 0,0,0` +
					`because this object3D's matrix is managed by gsi processor`
			)
			return new Euler()
		},
	})

	Object.defineProperty(threeMesh, 'quaternion', {
		get: () => {
			console.warn(
				`quaternion will always be default value` +
					`because this object3D's matrix is managed by gsi processor`
			)
			return new Quaternion()
		},
	})

	Object.defineProperty(threeMesh, 'scale', {
		get: () => {
			console.warn(
				`scale will always be 1` + `because this object3D's matrix is managed by gsi processor`
			)
			return new Vector3()
		},
	})

	Object.defineProperty(threeMesh, 'matrix', {
		get: () => {
			console.warn(
				`matrix will always be identical, use .worldMatrix instead.` +
					`because this object3D's matrix is managed by gsi processor`
			)
			return new Matrix4()
		},
	})

	threeMesh.updateMatrix = () =>
		console.error(
			`updateMatrix will not work, ` + `because this object3D's matrix is managed by gsi processor`
		)

	threeMesh.updateMatrixWorld = () =>
		console.error(
			`updateMatrixWorld will not work, ` +
				`because this object3D's matrix is managed by gsi processor`
		)
}
