/* eslint-disable @typescript-eslint/ban-types */
/**
 * A loose version of scene graph interfaces
 * @NOTE this file will break esm tree shaking, luckily, it's type-only
 * @TODO may cause circular importing, should be fine but still not good-looking
 */

import { Geometry, Attribute } from './Geom'

import { PointMaterial, UnlitMaterial, PbrMaterial, MaterialBase } from './Matr'

import { Texture, Image, Sampler } from './Texture'

import { RenderableNode, LuminousNode, BaseNode } from './Mesh'
import { LuminousEXT } from './Luminous'
// geometry -------------------------------------

/**
 * @see {@link Attribute}
 */
export type LooseAttribute = OnlyRequire<Attribute, 'array'>

// const test: LooseAttribute = {}

/**
 * @see {@link Geom}
 */
// export type LooseGeom = Partial<Omit<Geom, 'attributes' | 'indices'>> & LooseAttributes
export type LooseGeom = Replace<
	Geometry,
	{
		/**
		 * attributes data
		 */
		attributes: {
			[name: string]: LooseAttribute | undefined
		}
		/**
		 * index
		 */
		indices?: LooseAttribute
	}
>

// const test: LooseGeom = {
// 	attributes: {
// 		a: {
// 			array: new Float32Array(10),
// 		},
// 	},
// 	indices: {}
// }

// texture -------------------------------------

export type LooseSampler = Partial<Sampler>
export type LooseImage = Partial<Image>
export type LooseTexture = Replace<Texture, { image: LooseImage; sampler?: Partial<Sampler> }>

// const text : LooseTexture = {
// 	image: {}
// }

// material -------------------------------------

type _LooseTextures = {
	metallicRoughnessTexture?: LooseTexture
	baseColorTexture?: LooseTexture
	emissiveTexture?: LooseTexture
	normalTexture?: LooseTexture
	occlusionTexture?: LooseTexture
}

export type LooseMaterialBase = OnlyRequire<MaterialBase, 'type'>
export type LoosePbrMaterial = OnlyRequire<ReplaceShared<PbrMaterial, _LooseTextures>, 'type'>
export type LooseUnlitMaterial = OnlyRequire<ReplaceShared<UnlitMaterial, _LooseTextures>, 'type'>
export type LoosePointMaterial = OnlyRequire<ReplaceShared<PointMaterial, _LooseTextures>, 'type'>
export type LooseMaterial = LoosePbrMaterial | LooseUnlitMaterial | LoosePointMaterial

// const test: LooseMatrPbr = {
// 	type: 'pbr',
// 	metallicRoughnessTexture: { image: {} },
// }

// mesh -------------------------------------

export type LooseBaseNode = Replace<
	BaseNode,
	{ parent?: LooseNodeLike; children?: Set<LooseNodeLike> }
>
export type LooseRenderableNode = Replace<
	RenderableNode,
	{
		geometry: LooseGeom
		material: LooseMaterialBase
		parent?: LooseNodeLike
		children?: Set<LooseNodeLike>
	}
>
export type LooseLuminousNode = Replace<
	LuminousNode,
	{
		extensions: { EXT_luminous?: OnlyRequire<LuminousEXT, 'type'> } & BaseNode['extensions']
	}
>
export type LooseNodeLike = LooseRenderableNode | LooseBaseNode | LooseLuminousNode

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

// const test: LooseAttribute = {}
