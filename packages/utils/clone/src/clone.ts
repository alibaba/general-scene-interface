import IR from '@gs.i/schema-scene'
import { traverse } from '@gs.i/utils-traverse'

/**
 * clone a texture, including its image data and sampler.
 * @param t
 * @returns
 */
export function cloneTexture(t: IR.Texture): IR.Texture {
	const result = {
		extensions: { ...(t.extensions || {}) },
		extras: { ...(t.extras || {}) },
	} as IR.Texture

	result.image = cloneImage(t.image)
	result.sampler = cloneSampler(t.sampler)

	if (t.transform !== undefined) result.transform = Array.from(t.transform)

	return result
}

export function cloneImage(i: IR.Image): IR.Image {
	const result = {
		...i,
	} as IR.Image
	if (i.data) {
		if (IR.isTypedArray(i.data)) {
			result.data = i.data.slice(0)
		} else {
			// @todo clone data view?
		}
	}

	// @todo how to clone HTMLImage?

	if (i.version === undefined) i.version = 0
	return result
}

export function cloneSampler(s: IR.Sampler): IR.Sampler {
	const result = {
		...s,
		extensions: { ...(s.extensions || {}) },
		extras: { ...(s.extras || {}) },
	}
	return result
}

/**
 * clone transform
 */
export function cloneTransform3(transform: IR.Transform3) {
	const result = {} as IR.Transform3

	if (IR.isTransform3Matrix(transform)) {
		result.matrix = Array.from(transform.matrix)
	} else {
		if (transform.position !== undefined) result.position = { ...transform.position }
		if (transform.rotation !== undefined) result.rotation = { ...transform.rotation }
		if (transform.quaternion !== undefined) result.quaternion = { ...transform.quaternion }
		if (transform.scale !== undefined) result.scale = { ...transform.scale }
	}

	result.version = transform.version
	return result
}

// =======
// helpers
// =======

class SchemaNotValid extends TypeError {
	constructor(msg?: string) {
		super('GSI:SchemaNotValid: ' + (msg || ''))
	}
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
