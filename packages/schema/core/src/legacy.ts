/**
 * legacy type naming alias
 */

import {
	AttributeBase,
	CubeTexture,
	Geometry,
	Texture,
	Attribute,
	Vec3Attribute,
	Vec2Attribute,
	ScalarAttribute,
	Vec4Attribute,
	Image,
	Sampler,
	Uniform,
	PointMaterial,
	UnlitMaterial,
	PbrMaterial,
	MaterialBase,
	LooseGeom,
	LooseSampler,
	LooseImage,
	LooseMaterialBase,
	LoosePbrMaterial,
	LooseUnlitMaterial,
	LoosePointMaterial,
	isMatrPbr,
	isMatrUnlit,
	isMatrPoint,
	LooseTexture,
	isRenderable,
	NodeLike,
	RenderableNode,
	LooseNodeLike,
	LooseRenderableNode,
	LooseBaseNode,
	LooseLuminousNode,
	BaseNode,
	LuminousNode,
} from './IR'

/**
 * @deprecated use {@link Geom} as `IR.Geom` instead
 */
export type GeomDataType = Geometry

/**
 * @deprecated use {@link AttributeBase} as `IR.AttributeBase` instead
 */
export type AttributeBaseDataType = AttributeBase

/**
 * @deprecated use Texture instead
 * @alias Texture
 */
export type TextureData = Texture
/**
 * @deprecated use Texture instead
 * @alias Texture
 */
export type TextureDataType = Texture
/**
 * @deprecated use Texture instead
 * @alias Texture
 */
export type TextureType = Texture

/**
 * @deprecated use CubeTexture instead
 * @alias CubeTexture
 */
export type CubeTextureType = CubeTexture

/**
 * @deprecated use {@link Attribute} as `IR.Attribute` instead
 * @alias Attribute
 */
export type AttributeDataType = Attribute
/**
 * @deprecated use {@link Vec3Attribute} as `IR.Vec3Attribute` instead
 * @alias Vec3Attribute
 */
export type AttributeVec3DataType = Vec3Attribute
/**
 * @deprecated use {@link Vec2Attribute} as `IR.Vec2Attribute` instead
 * @alias Vec2Attribute
 */
export type AttributeVec2DataType = Vec2Attribute
/**
 * @deprecated use {@link ScalarAttribute} as `IR.ScalarAttribute` instead
 * @alias ScalarAttribute
 */
export type AttributeScalarDataType = ScalarAttribute
/**
 * @deprecated use {@link Vec4Attribute} as `IR.Vec4Attribute` instead
 * @alias Vec4Attribute
 */
export type AttributeVec4DataType = Vec4Attribute

/**
 * @deprecated use {@link Image} as `IR.Image` instead
 * @alias Image
 */
export type ImageDataType = Image
/**
 * @deprecated use {@link Sampler} as `IR.Sampler` instead
 * @alias Sampler
 */
export type SamplerDataType = Sampler

/**
 * @deprecated use {@link Uniform} as `IR.Uniform` instead
 * @alias Uniform
 */
export type UniformDataType = Uniform

/**
 * @deprecated use {@link MatrPoint} as `IR.MatrPoint` instead
 * @alias MatrPoint
 */
export type MatrPointDataType = PointMaterial
/**
 * @deprecated use {@link MatrUnlit} as `IR.MatrUnlit` instead
 * @alias MatrUnlit
 */
export type MatrUnlitDataType = UnlitMaterial
/**
 * @deprecated use {@link PbrMaterial} as `IR.PbrMaterial` instead
 * @alias PbrMaterial
 */
export type MatrPbrDataType = PbrMaterial
/**
 * @deprecated use {@link MaterialBase} as `IR.MaterialBase` instead
 * @alias MaterialBase
 */
export type MatrBaseDataType = MaterialBase

/**
 * @deprecated use {@link NodeLike} as `IR.NodeLike` instead
 * @alias NodeLike
 */
export type MeshDataType = NodeLike

//

/**
 * @deprecated use {@link RenderableNode} as `IR.RenderableNode` instead
 * @alias RenderableNode
 */
export type RenderableMesh = RenderableNode
/**
 * @deprecated use {@link BaseNode} as `IR.BaseNode` instead
 * @alias BaseNode
 */
export type Node = BaseNode
/**
 * @deprecated use {@link LuminousNode} as `IR.LuminousNode` instead
 * @alias LuminousNode
 */
export type Luminous = LuminousNode

//

/**
 * @deprecated use {@link LooseGeom} as `IR.LooseGeom` instead
 * @alias LooseGeom
 */
export type LooseGeomDataType = LooseGeom
/**
 * @deprecated use {@link LooseSampler} as `IR.LooseSampler` instead
 * @alias LooseSampler
 */
export type LooseSamplerDataType = LooseSampler
/**
 * @deprecated use {@link LooseImage} as `IR.LooseImage` instead
 * @alias LooseImage
 */
export type LooseImageDataType = LooseImage
/**
 * @deprecated use {@link LooseTexture} as `IR.LooseTexture` instead
 * @alias LooseTexture
 */
export type LooseTextureType = LooseTexture
/**
 * @deprecated use {@link LoosePbrMaterial} as `IR.LoosePbrMaterial` instead
 * @alias LoosePbrMaterial
 */
export type LooseMatrPbrDataType = LoosePbrMaterial
/**
 * @deprecated use {@link LooseUnlitMaterial} as `IR.LooseUnlitMaterial` instead
 * @alias LooseUnlitMaterial
 */
export type LooseMatrUnlitDataType = LooseUnlitMaterial
/**
 * @deprecated use {@link LoosePointMaterial} as `IR.LoosePointMaterial` instead
 * @alias LoosePointMaterial
 */
export type LooseMatrPointDataType = LoosePointMaterial

/**
 * @deprecated use {@link LooseRenderableNode} as `IR.LooseRenderableNode` instead
 * @alias LooseRenderableNode
 */
export type LooseRenderableMesh = LooseRenderableNode
/**
 * @deprecated use {@link LooseBaseNode} as `IR.LooseBaseNode` instead
 * @alias LooseBaseNode
 */
export type LooseNode = LooseBaseNode
/**
 * @deprecated use {@link LooseNodeLike} as `IR.LooseNodeLike` instead
 * @alias LooseNodeLike
 */
export type LooseMeshDataType = LooseNodeLike
/**
 * @deprecated use {@link LooseLuminousNode} as `IR.LooseLuminousNode` instead
 * @alias LooseLuminousNode
 */
export type LooseLuminous = LooseLuminousNode

//

/**
 * @deprecated use {@link isMatrPbr} as `IR.isMatrPbr` instead
 * @alias isMatrPbr
 */
export const isMatrPbrDataType = isMatrPbr
/**
 * @deprecated use {@link isMatrUnlit} as `IR.isMatrUnlit` instead
 * @alias isMatrUnlit
 */
export const isMatrUnlitDataType = isMatrUnlit
/**
 * @deprecated use {@link isMatrPoint} as `IR.isMatrPoint` instead
 * @alias isMatrPoint
 */
export const isMatrPointDataType = isMatrPoint
/**
 * @deprecated use {@link isRenderable} as `IR.isRenderable` instead
 * @alias isRenderable
 */
export const isRenderableMesh = isRenderable
