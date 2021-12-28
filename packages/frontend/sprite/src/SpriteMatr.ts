import { MatrUnlit } from '@gs.i/frontend-sdk'
import { ColorRGB, Texture, Vec2 } from '@gs.i/schema-scene'

export interface SpriteMatrConfig {
	useAttributeTransform: boolean
	baseColorFactor: ColorRGB
	baseColorTexture?: Texture
	uniformOffset?: Vec2
	uniformScale?: Vec2
	uniformRotation?: number
	sizeAttenuation?: boolean
	depthTest?: boolean
	depthWrite?: boolean
}

export const defaultConfig: SpriteMatrConfig = {
	useAttributeTransform: false,
	baseColorFactor: { r: 1.0, g: 1.0, b: 1.0 },
	sizeAttenuation: false,
	depthTest: true,
	depthWrite: true,
}

export class SpriteMatr extends MatrUnlit {
	config: SpriteMatrConfig

	/**
	 * object to store offset/scale/rotation attribute names used in the sprite mesh
	 */
	spriteAttributes: {
		[name: string]: string
	} = {}

	constructor(config: Partial<SpriteMatrConfig>) {
		super()
		this.config = {
			...defaultConfig,
			...config,
		}
		const extensions = this.extensions

		// set properties
		this.baseColorFactor = this.config.baseColorFactor
		this.baseColorTexture = this.config.baseColorTexture

		if (this.config.useAttributeTransform) {
			this.spriteAttributes.offset = 'aOffset'
			this.spriteAttributes.scale = 'aScale'
			this.spriteAttributes.rotation = 'aRotation'
			extensions.EXT_matr_programmable.defines.GSI_USE_ATTR_TRANS = true
		} else {
			const { uniformOffset, uniformScale, uniformRotation } = this.config
			extensions.EXT_matr_programmable.uniforms.uOffset = { value: uniformOffset ?? { x: 0, y: 0 } }
			extensions.EXT_matr_programmable.uniforms.uScale = { value: uniformScale ?? { x: 1, y: 1 } }
			extensions.EXT_matr_programmable.uniforms.uRotation = { value: uniformRotation ?? 0 }
			extensions.EXT_matr_programmable.global = `
            uniform vec2 uOffset;
            uniform vec2 uScale;
            uniform float uRotation;
            `
		}

		if (this.config.sizeAttenuation) {
			extensions.EXT_matr_programmable.defines.GSI_USE_SIZE_ATTENUATION = true
		}

		// advanced props
		extensions.EXT_matr_advanced.depthTest = this.config.depthTest
		extensions.EXT_matr_advanced.depthWrite = this.config.depthWrite

		// shader codes
		extensions.EXT_matr_programmable.vertGlobal = `
        attribute float corner;
        attribute vec2 aOffset;
        attribute vec2 aScale;
        attribute float aRotation;
        `
		extensions.EXT_matr_programmable.vertGeometry = `
        if (corner == 0.0) { uv = vec2( 0.0, 0.0 ); }
        if (corner == 1.0) { uv = vec2( 1.0, 0.0 ); }
        if (corner == 2.0) { uv = vec2( 1.0, 1.0 ); }
        if (corner == 3.0) { uv = vec2( 0.0, 1.0 ); }
        `
		extensions.EXT_matr_programmable.vertOutput = `
        vec2 vert;
        if (corner == 0.0) { vert = vec2( -0.5, -0.5 ); }
        if (corner == 1.0) { vert = vec2( 0.5, -0.5 ); }
        if (corner == 2.0) { vert = vec2( 0.5, 0.5 ); }
        if (corner == 3.0) { vert = vec2( -0.5, 0.5 ); }

        #ifdef GSI_USE_ATTR_TRANS
            vec2 scale = aScale;
            vec2 offset = aOffset;
            float rotation = aRotation;
        #else
            vec2 scale = uScale;
            vec2 offset = uOffset;
            float rotation = uRotation;
        #endif

        #ifndef GSI_USE_SIZE_ATTENUATION
            bool isPerspective = projectionMatrix[ 2 ][ 3 ] == - 1.0;
            if ( isPerspective ) scale *= - modelViewPosition.z;
        #endif

        vec2 alignedPosition = ( vert.xy + offset ) * scale;
        vec2 rotatedPosition;
        float sinVal = sin( rotation );
        float cosVal = cos( rotation );
	    rotatedPosition.x = cosVal * alignedPosition.x - sinVal * alignedPosition.y;
	    rotatedPosition.y = sinVal * alignedPosition.x + cosVal * alignedPosition.y;
        modelViewPosition.xy += rotatedPosition;
        `
		extensions.EXT_matr_programmable.fragOutput = `
        // fragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);
        `
	}
}
