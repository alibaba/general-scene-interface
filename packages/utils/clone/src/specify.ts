import IR, { LooseNodeLike } from '@gs.i/schema-scene'

import { traverse } from '@gs.i/utils-traverse'

export function specifyTree(root: IR.LooseNodeLike): IR.NodeLike {
	traverse(root as IR.NodeLike, (node) => {
		specifyNode(node)
	})

	return root as IR.NodeLike
}

/**
 * specify a mesh node by filling all the default values, transform a loose mesh into strict mesh
 * - includes its material and geometry,
 * - **not** includes its children.
 * - **not** includes its children.
 * - **not** includes its children.
 * @param LooseMesh
 */
export function specifyNode(node: IR.LooseNodeLike, parent?: IR.LooseNodeLike): IR.NodeLike {
	// export function specifyNode(node: IR.LooseNodeLike, parent?: IR.LooseNodeLike): IR.NodeLike
	// export function specifyNode(node: IR.LooseLuminousNode, parent?: IR.LooseNodeLike): IR.LuminousNode
	// export function specifyNode( node: IR.LooseRenderableNode, parent?: IR.LooseNodeLike ): IR.RenderableNode
	// export function specifyNode(node: IR.LooseBaseNode, parent?: IR.LooseNodeLike): IR.BaseNode
	// export function specifyNode<T extends IR.LooseBaseNode>( node: T, parent?: IR.LooseNodeLike ): T extends IR.LooseRenderableNode ? IR.RenderableNode : T extends IR.LooseLuminousNode ? IR.LuminousNode : IR.BaseNode {
	// const cached = this.cache.get(node)
	// if (cached) return cached

	if (parent) node.parent = parent as IR.NodeLike | undefined

	if (node.name === undefined) node.name = 'unnamed mesh'
	if (node.extensions === undefined) node.extensions = {}
	if (node.extras === undefined) node.extras = {}
	if (node.visible === undefined) node.visible = true
	if (node.children === undefined) node.children = new Set()

	if (node.transform === undefined) node.transform = genDefaultTransform3()
	specifyTransform3(node.transform)

	if (isRenderable(node)) {
		specifyMaterial(node.material)
		specifyGeometry(node.geometry)

		return node as IR.RenderableNode
	} else if (isLuminousNode(node)) {
		const l = node.extensions.EXT_luminous as IR.LuminousEXT
		if (l.type === undefined) throw new SchemaNotValid('EXT_luminous.type is necessary.')
		if (l.name === undefined) l.name = 'untitled-luminous'
		if (l.color === undefined) l.color = { r: 1, g: 1, b: 1 }
		if (l.intensity === undefined) l.intensity = 1
		if (l.range === undefined) l.range = Infinity

		return node as IR.LuminousNode
	}

	return node as IR.BaseNode
}

/**
 * @deprecated use specifyNode instead
 */
export const specifyMesh = specifyNode

/**
 * specify a material, including its standard textures, not including custom textures in programable ext.
 * @param matr
 * @returns
 */
export function specifyMaterial(matr: IR.LooseMaterialBase): IR.MaterialBase {
	/**
	 * common
	 */
	if (matr.name === undefined) matr.name = 'unnamed matr'
	if (matr.extensions === undefined) matr.extensions = {}
	if (matr.extras === undefined) matr.extras = {}
	if (matr.visible === undefined) matr.visible = true
	if (matr.side === undefined) matr.side = 'front'
	if (matr.alphaMode === undefined) matr.alphaMode = 'OPAQUE'
	if (matr.opacity === undefined) matr.opacity = 1
	if (matr.version === undefined) matr.version = 0

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

	// un-recognized matr type

	return matr as IR.MaterialBase
}

/**
 * specify a geometry, including all the attributes.
 * @param geom
 * @returns
 */
export function specifyGeometry(geom: IR.LooseGeom): IR.Geometry {
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

		if (attribute) specifyAttribute(attribute, key)
	}

	if (geom.indices) {
		specifyAttribute(geom.indices, 'indices')
	}

	return geom as IR.Geometry
}

export function specifyAttribute(attribute: IR.LooseAttribute, name = ''): IR.Attribute {
	if (attribute.array === undefined)
		throw new SchemaNotValid(`attribute[${name}] .array can not be undefined`)

	if (attribute.itemSize === undefined)
		throw new SchemaNotValid(`attribute[${name}] .itemSize can not be undefined`)

	if (attribute.count === undefined) {
		if (attribute.array === IR.DISPOSED)
			throw new SchemaNotValid(`attribute[${name}] .array can not be DISPOSED before actually used`)

		attribute.count = attribute.array.length / attribute.itemSize
	}

	if (attribute.normalized === undefined) attribute.normalized = false
	if (attribute.usage === undefined) attribute.usage = 'STATIC_DRAW'
	if (attribute.version === undefined) attribute.version = 0
	if (attribute.disposable === undefined) attribute.disposable = true

	if (attribute.extensions === undefined) attribute.extensions = {}

	return attribute as IR.Attribute
}

/**
 * specify a texture, including its image data and sampler.
 * @param t
 * @returns
 */
export function specifyTexture(t: IR.LooseTexture): IR.Texture {
	if (t.image === undefined) throw new SchemaNotValid(`texture.image can not be undefined`)

	specifyImage(t.image)

	if (t.sampler === undefined) t.sampler = {}

	specifySampler(t.sampler)

	if (t.extensions === undefined) t.extensions = {}
	if (t.extras === undefined) t.extras = {}

	return t as IR.Texture
}

export function specifyImage(i: IR.LooseImage): IR.Image {
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

		if (i.extensions?.EXT_image_HTML !== undefined)
			throw new SchemaNotValid(
				'texture.image.extensions.EXT_imag_HTML is conflict to texture.image.data'
			)
	} else if (i.uri !== undefined) {
		// use uri as image data

		// shall not use other data sources
		if (i.extensions?.EXT_image_HTML !== undefined)
			throw new SchemaNotValid(
				'texture.image.extensions.EXT_imag_HTML is conflict to texture.image.data'
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
	} else if (i.extensions?.EXT_image_HTML === undefined) {
		// not using any image data
		throw new SchemaNotValid(`texture.image doesn't have any image data source`)
	}

	return i as IR.Image
}

export function specifySampler(s: IR.LooseSampler): IR.Sampler {
	if (s.magFilter === undefined) s.magFilter = 'NEAREST'
	if (s.minFilter === undefined) s.minFilter = 'NEAREST'
	if (s.wrapS === undefined) s.wrapS = 'CLAMP_TO_EDGE'
	if (s.wrapT === undefined) s.wrapT = 'CLAMP_TO_EDGE'
	if (s.anisotropy === undefined) s.anisotropy = 0
	if (s.extensions === undefined) s.extensions = {}
	if (s.extras === undefined) s.extras = {}
	return s as IR.Sampler
}

/**
 * specify transform
 */
export function specifyTransform3(transform: IR.Transform3) {
	if (IR.isTransform3Matrix(transform)) {
		// @note this seems unnecessary. matrix will always be preferred
		// if (transform.position || transform.quaternion || transform.rotation || transform.scale) {
		// 	throw new SchemaNotValid(
		// 		'mesh.transform either has .matrix or TRS(.position .rotation etc.), can not have both.'
		// 	)
		// }
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
	} as IR.Transform3
}
function genDefaultTransform2() {
	return {
		version: -1,
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
	} as IR.Transform2
}

export function isMatrPbrDataType(v: IR.LooseMaterialBase): v is IR.LoosePbrMaterial {
	return v.type === 'pbr'
}

export function isMatrUnlitDataType(v: IR.LooseMaterialBase): v is IR.LooseUnlitMaterial {
	return v.type === 'unlit'
}

export function isMatrPointDataType(v: IR.LooseMaterialBase): v is IR.LoosePointMaterial {
	return v.type === 'point'
}

export function isRenderable(v: IR.LooseNodeLike): v is IR.RenderableNode {
	return v['geometry'] && v['material']
}
export function isLuminousNode(v: IR.LooseNodeLike): v is IR.LuminousNode {
	return v.extensions?.EXT_luminous !== undefined
}
