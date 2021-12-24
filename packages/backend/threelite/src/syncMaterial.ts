import {
	MatrBaseDataType,
	isTexture,
	isCubeTexture,
	MatrPbrDataType,
	MatrUnlitDataType,
	MatrPointDataType,
	MatrSpriteDataType,
	Texture,
} from '@gs.i/schema-scene'
import {
	Material,
	Texture as ThreeTexture,
	FrontSide,
	BackSide,
	DoubleSide,
	NoBlending,
	NormalBlending,
	AdditiveBlending,
	ShaderMaterial,
} from 'three-lite'
import { box3Equals, convDefines, elementsEquals, sphereEquals, SupportedExtensions } from './utils'

/**
 * sync material parameters from gsi IR to three material
 * @note these parameters only sync when the material needs update. NOT EVERY FRAME!
 */
export function syncMaterial(
	gsiMatr: MatrBaseDataType,
	/** it's actually ShaderMaterial but three.js ShaderMaterial type declaration is kinda funky. won't rely on it anyway*/
	threeMatr: Material,
	cache: WeakMap<Texture, ThreeTexture>
): void {
	threeMatr.name = threeMatr.name || gsiMatr.name || 'GSI-three-Matr'
	threeMatr.visible = gsiMatr.visible

	// face culling
	switch (gsiMatr.side) {
		case 'front':
			threeMatr.side = FrontSide
			break
		case 'back':
			threeMatr.side = BackSide
			break
		case 'double':
			threeMatr.side = DoubleSide
			break
		default:
			throw new Error('Unsupported value of GSI::Matr.side: ' + gsiMatr.side)
	}

	// trans / blending / depth
	switch (gsiMatr.alphaMode) {
		case 'OPAQUE':
			threeMatr.transparent = false
			threeMatr.depthTest = true
			threeMatr.depthWrite = true
			threeMatr.blending = NoBlending
			break
		case 'MASK':
			threeMatr.transparent = false
			threeMatr.depthTest = true
			threeMatr.depthWrite = true
			threeMatr.blending = NoBlending
			threeMatr.alphaTest = gsiMatr.opacity
			// threeMatr.alphaToCoverage = true // ?
			break
		case 'BLEND':
			threeMatr.transparent = true
			threeMatr.depthTest = true
			threeMatr.depthWrite = false
			threeMatr.blending = NormalBlending
			threeMatr.opacity = gsiMatr.opacity
			break
		case 'BLEND_ADD':
			threeMatr.transparent = true
			threeMatr.depthTest = true
			threeMatr.depthWrite = false
			threeMatr.blending = AdditiveBlending
			threeMatr.opacity = gsiMatr.opacity
			break
		default:
			throw new Error('Unsupported value of GSI::Matr.alphaMode: ' + gsiMatr.alphaMode)
	}

	// advanced controls
	{
		const extAdvanced = gsiMatr.extensions?.EXT_matr_advanced
		if (extAdvanced) {
			// TODO check which is better
			// threeMatr.depthTest = extAdvanced.depthTest ?? threeMatr.depthTest
			if (extAdvanced.depthTest !== undefined) threeMatr.depthTest = extAdvanced.depthTest

			if (extAdvanced.depthWrite !== undefined) threeMatr.depthWrite = extAdvanced.depthWrite

			if (extAdvanced.depthFunc !== undefined) threeMatr.depthFunc = extAdvanced.depthFunc

			if (extAdvanced.polygonOffset !== undefined)
				threeMatr.polygonOffset = extAdvanced.polygonOffset

			if (extAdvanced.polygonOffsetFactor !== undefined)
				threeMatr.polygonOffsetFactor = extAdvanced.polygonOffsetFactor

			if (extAdvanced.polygonOffsetUnits !== undefined)
				threeMatr.polygonOffsetUnits = extAdvanced.polygonOffsetUnits
		}
	}

	// defines
	const extProgramable = gsiMatr.extensions?.EXT_matr_programmable
	{
		if (extProgramable?.defines) {
			threeMatr.defines = convDefines(threeMatr.defines, extProgramable.defines)
		}
	}

	// uniforms
	{
		if (extProgramable?.uniforms) {
			// it should be a shaderMaterial
			const threeUniforms = threeMatr['uniforms'] || {}
			threeMatr['uniforms'] = threeUniforms

			const uniforms = extProgramable.uniforms

			Object.keys(uniforms).forEach((key) => {
				const uniform = uniforms[key]

				if (threeUniforms[key] === undefined) threeUniforms[key] = {}

				if (isTexture(uniform.value)) {
					// it should be cached before
					const threeTexture = cache.get(uniform.value) as ThreeTexture
					threeUniforms[key].value = threeTexture
				} else if (isCubeTexture(uniform.value)) {
					// 👀
					throw 'CUBE TEXTURE UNIFORM NOT IMPLEMENTED'
				} else {
					// @note No need to transform value into three.js classes
					// 		three.js and GL2 do not care the Type of uniform values.
					// 		uniform types are decided by the compiled shaders.
					// 		uploader functions do accept basic data type as values.
					// 		as long as matrices are arrays, vectors are xyz\rgb\arrays,
					// 		it will be fine.

					threeUniforms[key].value = uniform.value
				}
			})
		}
	}
}
