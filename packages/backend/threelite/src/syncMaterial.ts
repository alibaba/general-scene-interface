import { MaterialBase } from '@gs.i/schema-scene'
import {
	Material,
	FrontSide,
	BackSide,
	DoubleSide,
	NoBlending,
	NormalBlending,
	AdditiveBlending,
} from 'three'
import { convDefines } from './utils'

/**
 * sync material parameters from gsi IR to three material
 * @note these parameters only sync when the material needs update. NOT EVERY FRAME!
 */
export function syncMaterial(
	gsiMatr: MaterialBase,
	/** it's actually ShaderMaterial but three.js ShaderMaterial type declaration is kinda funky. won't rely on it anyway*/
	threeMatr: Material
): void {
	threeMatr.name = threeMatr.name || gsiMatr.name || 'GSI-three-Matr'

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
			// threeMatr.alphaToCoverage = true // ?
			break
		case 'BLEND':
			threeMatr.transparent = true
			threeMatr.depthTest = true
			threeMatr.depthWrite = false
			threeMatr.blending = NormalBlending
			break
		case 'BLEND_ADD':
			threeMatr.transparent = true
			threeMatr.depthTest = true
			threeMatr.depthWrite = false
			threeMatr.blending = AdditiveBlending
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
}
