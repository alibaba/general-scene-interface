import {
	MeshDataType,
	RenderableMesh,
	MatrBaseDataType,
	// MatrUnlitDataType,
	// MatrPbrDataType,
	// MatrPointDataType,
	// MatrSpriteDataType,
	Texture,
	ImageDataType,
	SamplerDataType,
	GeomDataType,
	AttributeDataType,
	Transform3,
	Transform2,
	DISPOSED,

	// loose types
	LooseMatrBase,
	LooseMatrPbrDataType,
	LooseMatrUnlitDataType,
	LooseMatrPointDataType,
	LooseMatrSpriteDataType,
	LooseAttribute,
	LooseGeomDataType,
	LooseSamplerDataType,
	LooseImageDataType,
	LooseTextureType,
	// LooseNode,
	// LooseRenderableMesh,
	LooseMeshDataType,

	//
	isTransform3Matrix,
	// isTransform3TRS,
	// isTransform2Matrix,
	// isTransform2TRS,
} from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'

/**
 * specify all the optional properties of an interface or a scene graph
 * Input Loose types and output strict types
 * @note NOT PURE FUNCTIONS. this process will modify the object you input
 */
export class Specifier extends Processor<LooseMeshDataType> {
	traverseType = TraverseType.Any
	type = 'Specifier'
	canEditNode = true
	canEditTree = false

	/**
	 * specify a mesh node and all descendants
	 * @param node
	 * @param parent
	 */
	processNode(node: LooseMeshDataType, parent?: LooseMeshDataType) {
		specifyMesh(node, parent)
	}
}

/**
 * specify a mesh node by filling all the default values, transform a loose mesh into strict mesh
 * - includes its material and geometry,
 * - **not** includes its children.
 * - **not** includes its children.
 * - **not** includes its children.
 * @param LooseMesh
 */
export function specifyMesh(node: LooseMeshDataType, parent?: LooseMeshDataType): MeshDataType {
	// const cached = this.cache.get(node)
	// if (cached) return cached

	if (parent) node.parent = parent as MeshDataType | undefined

	if (node.visible === undefined) node.visible = true
	if (node.name === undefined) node.name = 'unnamed mesh'
	if (node.children === undefined) node.children = new Set()
	if (node.extensions === undefined) node.extensions = {}
	if (node.extras === undefined) node.extras = {}

	if (node.transform === undefined) node.transform = genDefaultTransform3()
	specifyTransform3(node.transform)

	if (isRenderableMesh(node)) {
		specifyMaterial(node.material)
		specifyGeometry(node.geometry)
	}

	return node as MeshDataType
}

/**
 * specify a material, including its standard textures, not including custom textures in programable ext.
 * @param matr
 * @returns
 */
export function specifyMaterial(matr: LooseMatrBase): MatrBaseDataType {
	/**
	 * common
	 */
	if (matr.name === undefined) matr.name = 'unnamed matr'
	if (matr.visible === undefined) matr.visible = true
	if (matr.side === undefined) matr.side = 'front'
	if (matr.alphaMode === undefined) matr.alphaMode = 'OPAQUE'
	if (matr.opacity === undefined) matr.opacity = 1
	if (matr.extensions === undefined) matr.extensions = {}
	if (matr.extras === undefined) matr.extras = {}

	/**
	 * Programable extension
	 */

	if (matr.extensions.EXT_matr_programmable) {
		const p = matr.extensions.EXT_matr_programmable

		if (p.language === undefined) p.language = 'GLSL300'
		if (p.extension === undefined) p.extension = ''
		if (p.defines === undefined) p.defines = {}
		if (p.uniforms === undefined) p.uniforms = {}
		// if (p.attributes === undefined) p.attributes = {}
		// if (p.varyings === undefined) p.varyings = {}
	}

	/**
	 * material specific
	 */
	if (isMatrPbrDataType(matr)) {
		if (matr.baseColorFactor === undefined) matr.baseColorFactor = { r: 1, g: 1, b: 1 }
		if (matr.emissiveFactor === undefined) matr.emissiveFactor = { r: 0, g: 0, b: 0 }
		if (matr.metallicFactor === undefined) matr.metallicFactor = 0.5
		if (matr.roughnessFactor === undefined) matr.roughnessFactor = 0.5

		if (matr.baseColorTexture) specifyTexture(matr.baseColorTexture)
		if (matr.metallicRoughnessTexture) specifyTexture(matr.metallicRoughnessTexture)
		if (matr.emissiveTexture) specifyTexture(matr.emissiveTexture)
		if (matr.normalTexture) specifyTexture(matr.normalTexture)
		if (matr.occlusionTexture) specifyTexture(matr.occlusionTexture)

		// return matr as MatrBaseDataType
	}

	if (isMatrUnlitDataType(matr)) {
		if (matr.baseColorFactor === undefined) matr.baseColorFactor = { r: 1, g: 1, b: 1 }

		if (matr.baseColorTexture) specifyTexture(matr.baseColorTexture)

		// return matr as MatrBaseDataType
	}

	if (isMatrPointDataType(matr)) {
		if (matr.baseColorFactor === undefined) matr.baseColorFactor = { r: 1, g: 1, b: 1 }
		if (matr.size === undefined) matr.size = 10
		if (matr.sizeAttenuation === undefined) matr.sizeAttenuation = false

		if (matr.baseColorTexture) specifyTexture(matr.baseColorTexture)

		// return matr as MatrBaseDataType
	}

	if (isMatrSpriteDataType(matr)) {
		if (matr.baseColorFactor === undefined) matr.baseColorFactor = { r: 1, g: 1, b: 1 }
		// if (matr.size === undefined) matr.size = 10
		if (matr.sizeAttenuation === undefined) matr.sizeAttenuation = false
		if (matr.transform === undefined) matr.transform = genDefaultTransform2()

		if (matr.baseColorTexture) specifyTexture(matr.baseColorTexture)

		// return matr as MatrBaseDataType
	}

	// un-recognized matr type

	return matr as MatrBaseDataType
}

/**
 * specify a geometry, including all the attributes.
 * @param geom
 * @returns
 */
export function specifyGeometry(geom: LooseGeomDataType): GeomDataType {
	if (geom.mode === undefined) geom.mode = 'TRIANGLES'
	if (geom.extensions === undefined) geom.extensions = {}

	if (geom.attributes === undefined)
		throw new SchemaNotValid(`geom.attributes can not be undefined`)

	const keys = Object.keys(geom.attributes) // @note Object.keys throw if undefined

	// @note Alow user to use this before adding any attributes
	// if (keys.length === 0) throw new SchemaNotValid(`geom.attributes needs at least one attribute`)

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		const attribute = geom.attributes[key]

		specifyAttribute(attribute, key)
	}

	return geom as GeomDataType
}

export function specifyAttribute(attribute: LooseAttribute, name = ''): AttributeDataType {
	if (attribute.array === undefined)
		throw new SchemaNotValid(`attribute[${name}] .array can not be undefined`)

	if (attribute.itemSize === undefined)
		throw new SchemaNotValid(`attribute[${name}] .itemSize can not be undefined`)

	if (attribute.count === undefined) {
		if (attribute.array === DISPOSED)
			throw new SchemaNotValid(`attribute[${name}] .array can not be DISPOSED before actually used`)

		attribute.count = attribute.array.length / attribute.itemSize
	}

	if (attribute.normalized === undefined) attribute.normalized = false
	if (attribute.usage === undefined) attribute.usage = 'STATIC_DRAW'
	if (attribute.version === undefined) attribute.version = 0
	if (attribute.disposable === undefined) attribute.disposable = true

	if (attribute.extensions === undefined) attribute.extensions = {}

	return attribute as AttributeDataType
}

/**
 * specify a texture, including its image data and sampler.
 * @param t
 * @returns
 */
export function specifyTexture(t: LooseTextureType): Texture {
	if (t.image === undefined) throw new SchemaNotValid(`texture.image can not be undefined`)

	specifyImage(t.image)

	if (t.sampler === undefined) t.sampler = {}

	specifySampler(t.sampler)

	if (t.transform === undefined) t.transform = [1, 0, 0, 0, 1, 0, 0, 0, 1]
	if (t.extensions === undefined) t.extensions = {}
	if (t.extras === undefined) t.extras = {}

	return t as Texture
}

export function specifyImage(i: LooseImageDataType): ImageDataType {
	if (i.version === undefined) i.version = 0

	// verify image data source

	if (i.data !== undefined) {
		// use buffer as image data

		// width and height will be necessary

		if (i.width === undefined)
			throw new SchemaNotValid('texture.image.width is necessary when using texture.image.data')
		if (i.height === undefined)
			throw new SchemaNotValid('texture.image.height is necessary when using texture.image.data')

		// shall not use other data sources

		if (i.uri !== undefined)
			throw new SchemaNotValid('texture.image.uri is conflict to texture.image.data')

		if (i.extensions?.EXT_image?.HTMLImage !== undefined)
			throw new SchemaNotValid(
				'texture.image.extensions.EXT_image.HTMLImage is conflict to texture.image.data'
			)
	} else if (i.uri !== undefined) {
		// use uri as image data

		// shall not use other data sources
		if (i.extensions?.EXT_image?.HTMLImage !== undefined)
			throw new SchemaNotValid(
				'texture.image.extensions.EXT_image.HTMLImage is conflict to texture.image.data'
			)

		// width and height will not work
		if (i.width !== undefined)
			throw new SchemaNotValid(
				'texture.image.width can not be assigned when using uri as image data source'
			)
		if (i.height !== undefined)
			throw new SchemaNotValid(
				'texture.image.height can not be assigned when using uri as image data source'
			)
	} else if (i.extensions?.EXT_image?.HTMLImage === undefined) {
		// not using any image data
		throw new SchemaNotValid(`texture.image doesn't have any image data source`)
	}

	return i as ImageDataType
}

export function specifySampler(s: LooseSamplerDataType): SamplerDataType {
	if (s.magFilter === undefined) s.magFilter = 'NEAREST'
	if (s.minFilter === undefined) s.minFilter = 'NEAREST'
	if (s.wrapS === undefined) s.wrapS = 'CLAMP_TO_EDGE'
	if (s.wrapT === undefined) s.wrapT = 'CLAMP_TO_EDGE'
	if (s.anisotropy === undefined) s.anisotropy = 0
	if (s.extensions === undefined) s.extensions = {}
	if (s.extras === undefined) s.extras = {}
	return s as SamplerDataType
}

/**
 * specify transform
 */
export function specifyTransform3(transform: Transform3) {
	if (isTransform3Matrix(transform)) {
		if (transform.position || transform.quaternion || transform.rotation || transform.scale) {
			throw new SchemaNotValid(
				'mesh.transform either has .matrix or TRS(.position .rotation etc.), can not have both.'
			)
		}
	} else {
		if (transform.position === undefined) transform.position = { x: 0, y: 0, z: 0 }
		if (transform.rotation === undefined && transform.quaternion === undefined)
			transform.quaternion = { x: 0, y: 0, z: 0, w: 1 }
		if (transform.scale === undefined) transform.scale = { x: 1, y: 1, z: 1 }
	}

	if (transform.version === undefined) transform.version = -1
}

// =======
// helpers
// =======

class SchemaNotValid extends TypeError {
	constructor(msg?: string) {
		super('GSI:SchemaNotValid: ' + (msg || ''))
	}
}

function genDefaultTransform3() {
	return {
		version: -1,
		matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
	} as Transform3
}
function genDefaultTransform2() {
	return {
		version: -1,
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
	} as Transform2
}

export function isMatrPbrDataType(v: LooseMatrBase): v is LooseMatrPbrDataType {
	return v.type === 'pbr'
}

export function isMatrUnlitDataType(v: LooseMatrBase): v is LooseMatrUnlitDataType {
	return v.type === 'unlit'
}

export function isMatrPointDataType(v: LooseMatrBase): v is LooseMatrPointDataType {
	return v.type === 'point'
}

export function isMatrSpriteDataType(v: LooseMatrBase): v is LooseMatrSpriteDataType {
	return v.type === 'sprite'
}

export function isRenderableMesh(v: LooseMeshDataType): v is RenderableMesh {
	return v['geometry'] && v['material']
}
