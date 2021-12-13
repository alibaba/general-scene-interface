/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshBasicMaterial, UniformsUtils, Color, Matrix3, Vector2 } from 'three-lite'
import { MatrSpriteDataType } from '@gs.i/schema-scene'
import { genPreShaderCode } from './utils'
import vs from './PrgSpriteMatr.vs.glsl'
import fs from './PrgSpriteMatr.fs.glsl'

export class PrgSpriteMaterial extends MeshBasicMaterial {
	type = 'ShaderMaterial'

	// Add ShaderMaterial flag
	isShaderMaterial = true

	defines: { [name: string]: any } = {}
	uniforms = {
		diffuse: { value: new Color(0xffffff) },
		opacity: { value: 1.0 },
		// center: { value: new THREE.Vector2(0.5, 0.5) },
		// rotation: { value: 0.0 },
		map: { value: null },
		alphaMap: { value: null },
		uvTransform: { value: new Matrix3() },
		uCenter: { value: new Vector2(0.5, 0.5) },
		uSize: { value: new Vector2(1.0, 1.0) },
		uRotation: { value: 0.0 },
	}

	vertexShader = ''
	fragmentShader = ''

	linewidth = 1

	wireframe = false
	wireframeLinewidth = 1

	fog = false // set to use scene fog
	lights = false // set to use scene lights
	clipping = false // set to use user-defined clipping planes

	skinning = false // set to use skinning attribute streams
	morphTargets = false // set to use morph targets
	morphNormals = false // set to use morph normals

	extensions = {
		derivatives: true, // set to use derivatives
		fragDepth: true, // set to use fragment depth values
		drawBuffers: true, // set to use draw buffers
		shaderTextureLOD: true, // set to use shader texture LOD
	}

	// When rendered geometry doesn't include these attributes but the material does,
	// use these default values in WebGL. This avoids errors when buffer data is missing.
	defaultAttributeValues = {
		position: [0, 0, 0],
		normal: [0, 0, 0],
		color: [1, 1, 1],
		uv: [0, 0],
		uv2: [0, 0],
	}

	index0AttributeName = undefined
	uniformsNeedUpdate = false

	glslVersion = null

	constructor(gsiMatr: MatrSpriteDataType) {
		super()
		// this.setValues(gsiMatr as any) // Set parent class parameters

		if (!gsiMatr.language) {
			gsiMatr.language = 'GLSL300'
		} else if (gsiMatr.language !== 'GLSL100' && gsiMatr.language !== 'GLSL300') {
			throw new Error(`GSI::Matr.language type '${gsiMatr.language}' is not supported`)
		}

		// Set shader codes
		const preCodes = genPreShaderCode(gsiMatr)

		this.vertexShader = vs
			.replace(/\$\$GSI_INSERT<Attributes>/g, preCodes.attributes || '')
			.replace(/\$\$GSI_INSERT<Varyings>/g, preCodes.varyingsVert || '')
			.replace(/\$\$GSI_INSERT<Uniforms>/g, preCodes.uniforms || '')
			.replace(/\$\$GSI_INSERT<PreVert>/g, gsiMatr.preVert || '')
			.replace(/\$\$GSI_INSERT<VertGeometry>/g, gsiMatr.vertGeometry || '')
			.replace(/\$\$GSI_INSERT<VertOutput>/g, gsiMatr.vertOutput || '')
			.replace(/\$\$GSI_INSERT<PostVert>/g, gsiMatr.postVert || '')

		this.fragmentShader = fs
			.replace(/\$\$GSI_INSERT<Varyings>/g, preCodes.varyingsFrag || '')
			.replace(/\$\$GSI_INSERT<Uniforms>/g, preCodes.uniforms || '')
			.replace(/\$\$GSI_INSERT<PreFrag>/g, gsiMatr.preFrag || '')
			.replace(/\$\$GSI_INSERT<FragColor>/g, gsiMatr.fragColor || '')

		if (gsiMatr.useAttrSize) {
			this.defines.GSI_USE_ATTR_SIZE = true
		}

		// this.onBeforeCompile = (shader) => {
		// 	shader['extensionDerivatives'] = true
		// 	shader['extensionShaderTextureLOD'] = true
		// }
	}

	copy(source) {
		MeshBasicMaterial.prototype.copy.call(this, source)

		this.fragmentShader = source.fragmentShader
		this.vertexShader = source.vertexShader

		this.uniforms = UniformsUtils.clone(source.uniforms)

		this.defines = Object.assign({}, source.defines)

		this.wireframe = source.wireframe
		this.wireframeLinewidth = source.wireframeLinewidth

		this.lights = source.lights
		this.clipping = source.clipping

		this.skinning = source.skinning

		this.morphTargets = source.morphTargets
		this.morphNormals = source.morphNormals

		this.extensions = Object.assign({}, source.extensions)

		this.glslVersion = source.glslVersion

		return this
	}
}
