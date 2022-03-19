/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { THREE } from 'gl2'
import { BBox, BSphere, PrgBaseDataType } from '@gs.i/schema'

export function box3Equals(b1: THREE.Box3 | BBox, b2: THREE.Box3 | BBox): boolean {
	return (
		b1.min.x === b2.min.x &&
		b1.min.y === b2.min.y &&
		b1.min.z === b2.min.z &&
		b1.max.x === b2.max.x &&
		b1.max.y === b2.max.y &&
		b1.max.z === b2.max.z
	)
}

export function sphereEquals(s1: THREE.Sphere | BSphere, s2: THREE.Sphere | BSphere): boolean {
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

export function convDefines(gl2Defines, defines) {
	const d = gl2Defines || {}
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

export type PreShaderCodes = {
	attributes: string
	varyingsVert: string
	varyingsFrag: string
	uniforms: string
}
// 自动过滤掉three自带的几个attr名称
const DEFAULT_ATTR_NAMES = ['position', 'normal', 'uv']
export function genPreShaderCode(matr: PrgBaseDataType): PreShaderCodes {
	const codes = {
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
			codes.attributes += `in ${attributes[key]} ${key};\n`
		}
	}
	if (varyings) {
		for (const key in varyings) {
			codes.varyingsVert += `out ${varyings[key]} ${key};\n`
			codes.varyingsFrag += `in ${varyings[key]} ${key};\n`
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
