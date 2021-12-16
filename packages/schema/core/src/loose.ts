/**
 * A loose version of scene graph interfaces
 * @NOTE this file will break esm tree shaking, luckily, it's type-only
 * @TODO may cause circular importing, should be fine but still not good-looking
 */

import { GeomDataType, AttributeDataType } from './Geom'

import {
	MatrSpriteDataType,
	MatrPointDataType,
	MatrUnlitDataType,
	MatrPbrDataType,
	MatrBaseDataType,
} from './Matr'

import { TextureType, CubeTextureType, ImageDataType, SamplerDataType } from './Texture'

import { MeshDataType, RenderableMesh, Node } from './Mesh'
// geometry -------------------------------------

/**
 * @see {@link AttributeDataType}
 */
export type LooseAttribute = OnlyRequire<AttributeDataType, 'array'>

// const test: LooseAttributeDataType = {}

/**
 * @see {@link GeomDataType}
 */
// export type LooseGeomDataType = Partial<Omit<GeomDataType, 'attributes' | 'indices'>> & LooseAttributes
export type LooseGeomDataType = Replace<
	GeomDataType,
	{
		/**
		 * attributes data
		 */
		attributes: {
			[name: string]: LooseAttribute
		}
		/**
		 * index
		 */
		indices?: LooseAttribute
	}
>

// const test: LooseGeomDataType = {
// 	attributes: {
// 		a: {
// 			array: new Float32Array(10),
// 		},
// 	},
// 	indices: {}
// }

// texture -------------------------------------

export type LooseSamplerDataType = Partial<SamplerDataType>
export type LooseImageDataType = Partial<ImageDataType>
export type LooseTextureType = Replace<
	TextureType,
	{ image: LooseImageDataType; sampler: Partial<SamplerDataType> | undefined }
>

// const text : LooseTextureType = {
// 	image: {}
// }

// material -------------------------------------

type _LooseTextures = {
	metallicRoughnessTexture?: LooseTextureType
	baseColorTexture?: LooseTextureType
	emissiveTexture?: LooseTextureType
	normalTexture?: LooseTextureType
	occlusionTexture?: LooseTextureType
}

export type LooseMatrBase = OnlyRequire<MatrBaseDataType, 'type'>
export type LooseMatrPbrDataType = OnlyRequire<
	ReplaceShared<MatrPbrDataType, _LooseTextures>,
	'type'
>
export type LooseMatrUnlitDataType = OnlyRequire<
	ReplaceShared<MatrUnlitDataType, _LooseTextures>,
	'type'
>
export type LooseMatrPointDataType = OnlyRequire<
	ReplaceShared<MatrPointDataType, _LooseTextures>,
	'type'
>
export type LooseMatrSpriteDataType = OnlyRequire<
	ReplaceShared<MatrSpriteDataType, _LooseTextures>,
	'type'
>

// const test: LooseMatrPbrDataType = {
// 	type: 'pbr',
// 	metallicRoughnessTexture: { image: {} },
// }

// mesh -------------------------------------

export type LooseNode = Partial<Node>
export type LooseRenderableMesh = OnlyRequire<RenderableMesh, 'geometry' | 'material'>
export type LooseMeshDataType = LooseRenderableMesh | LooseNode

// helper -------------------------------------

//
type OnlyRequire<T extends object, K extends keyof T> = Partial<Omit<T, K>> & Required<Pick<T, K>>

/**
 * delete keys from T, make the rest optional, then add keys from M
 */
type Replace<T extends object, M extends object> = Partial<Omit<T, keyof M>> & M

type ReplaceShared<T extends object, M extends object> = Partial<
	Omit<T, Extract<keyof T, keyof M>>
> &
	Pick<M, Extract<keyof T, keyof M>>

// export type Replace<T extends object, K extends keyof T = keyof T, N extends object> =

// const test: LooseAttributeDataType = {}
