/**
 * legacy type naming alias
 */

import {
	AttributeBase,
	CubeTexture,
	Geom,
	Texture,
	Attribute,
	AttributeVec3,
	AttributeVec2,
	AttributeScalar,
	AttributeVec4,
	Image,
	Sampler,
	Uniform,
	MatrPoint,
	MatrUnlit,
	MatrPbr,
	MatrBase,
	LooseGeom,
	LooseSampler,
	LooseImage,
	LooseMatrPbr,
	LooseMatrUnlit,
	LooseMatrPoint,
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
export type GeomDataType = Geom

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
 * @deprecated use {@link AttributeVec3} as `IR.AttributeVec3` instead
 * @alias AttributeVec3
 */
export type AttributeVec3DataType = AttributeVec3
/**
 * @deprecated use {@link AttributeVec2} as `IR.AttributeVec2` instead
 * @alias AttributeVec2
 */
export type AttributeVec2DataType = AttributeVec2
/**
 * @deprecated use {@link AttributeScalar} as `IR.AttributeScalar` instead
 * @alias AttributeScalar
 */
export type AttributeScalarDataType = AttributeScalar
/**
 * @deprecated use {@link AttributeVec4} as `IR.AttributeVec4` instead
 * @alias AttributeVec4
 */
export type AttributeVec4DataType = AttributeVec4

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
export type MatrPointDataType = MatrPoint
/**
 * @deprecated use {@link MatrUnlit} as `IR.MatrUnlit` instead
 * @alias MatrUnlit
 */
export type MatrUnlitDataType = MatrUnlit
/**
 * @deprecated use {@link MatrPbr} as `IR.MatrPbr` instead
 * @alias MatrPbr
 */
export type MatrPbrDataType = MatrPbr
/**
 * @deprecated use {@link MatrBase} as `IR.MatrBase` instead
 * @alias MatrBase
 */
export type MatrBaseDataType = MatrBase

/**
 * @deprecated use {@link Node} as `IR.Node` instead
 * @alias Node
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
 * @deprecated use {@link LooseMatrPbr} as `IR.LooseMatrPbr` instead
 * @alias LooseMatrPbr
 */
export type LooseMatrPbrDataType = LooseMatrPbr
/**
 * @deprecated use {@link LooseMatrUnlit} as `IR.LooseMatrUnlit` instead
 * @alias LooseMatrUnlit
 */
export type LooseMatrUnlitDataType = LooseMatrUnlit
/**
 * @deprecated use {@link LooseMatrPoint} as `IR.LooseMatrPoint` instead
 * @alias LooseMatrPoint
 */
export type LooseMatrPointDataType = LooseMatrPoint

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
