import IR from '@gs.i/schema-scene'
import {
	Texture as ThreeTexture,
	NearestFilter,
	LinearFilter,
	NearestMipMapNearestFilter,
	LinearMipMapNearestFilter,
	ClampToEdgeWrapping,
	MirroredRepeatWrapping,
	RepeatWrapping,
	NearestMipMapLinearFilter,
	LinearMipMapLinearFilter,
	sRGBEncoding,
	LinearEncoding,
} from 'three-lite'

/**
 * sync texture parameters from gsi IR to three texture
 */
export function syncTexture(gsiTexture: IR.Texture, threeTexture: ThreeTexture): void {
	const sampler = gsiTexture.sampler
	switch (sampler.magFilter) {
		case 'NEAREST':
			threeTexture.magFilter = NearestFilter
			break
		case 'LINEAR':
			threeTexture.magFilter = LinearFilter
			break
		default:
			threeTexture.magFilter = NearestFilter
	}

	// Set mipmaps to false first
	threeTexture.generateMipmaps = false

	switch (sampler.minFilter) {
		case 'NEAREST':
			threeTexture.minFilter = NearestFilter
			break
		case 'LINEAR':
			threeTexture.minFilter = LinearFilter
			break
		case 'NEAREST_MIPMAP_NEAREST':
			threeTexture.minFilter = NearestMipMapNearestFilter
			// WebGL generateMipmaps
			if (!threeTexture.generateMipmaps) threeTexture.generateMipmaps = true
			break
		case 'LINEAR_MIPMAP_NEAREST':
			threeTexture.minFilter = LinearMipMapNearestFilter
			// WebGL generateMipmaps
			if (!threeTexture.generateMipmaps) threeTexture.generateMipmaps = true
			break
		case 'NEAREST_MIPMAP_LINEAR':
			threeTexture.minFilter = NearestMipMapLinearFilter
			// WebGL generateMipmaps
			if (!threeTexture.generateMipmaps) threeTexture.generateMipmaps = true
			break
		case 'LINEAR_MIPMAP_LINEAR':
			threeTexture.minFilter = LinearMipMapLinearFilter
			// WebGL generateMipmaps
			if (!threeTexture.generateMipmaps) threeTexture.generateMipmaps = true
			break
		default:
			throw 'Invalid value for minFilter'
			threeTexture.minFilter = NearestFilter
	}

	switch (sampler.wrapS) {
		case 'CLAMP_TO_EDGE':
			threeTexture.wrapS = ClampToEdgeWrapping
			break
		case 'MIRRORED_REPEAT':
			threeTexture.wrapS = MirroredRepeatWrapping
			break
		case 'REPEAT':
			threeTexture.wrapS = RepeatWrapping
			break
		default:
			throw 'Invalid value for wrapS'
			threeTexture.wrapS = ClampToEdgeWrapping
	}

	switch (sampler.wrapT) {
		case 'CLAMP_TO_EDGE':
			threeTexture.wrapT = ClampToEdgeWrapping
			break
		case 'MIRRORED_REPEAT':
			threeTexture.wrapT = MirroredRepeatWrapping
			break
		case 'REPEAT':
			threeTexture.wrapT = RepeatWrapping
			break
		default:
			throw 'Invalid value for wrapT'
			threeTexture.wrapT = ClampToEdgeWrapping
	}

	// anisotropy
	threeTexture.anisotropy = sampler.anisotropy

	// flipY
	threeTexture.flipY = gsiTexture.image.extensions?.EXT_image_flipY ?? true

	// encoding
	threeTexture.encoding =
		gsiTexture.image.extensions?.EXT_image_encoding === 'SRGB' ? sRGBEncoding : LinearEncoding

	// @TODO transform
}
