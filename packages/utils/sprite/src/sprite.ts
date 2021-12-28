/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable array-element-newline */
import {
	GeomDataType,
	isDISPOSED,
	TypedArray,
	AttributeDataType,
	MatrSpriteDataType,
} from '@gs.i/schema-scene'
import { Box3, Sphere, Vector2, Vector3 } from '@gs.i/utils-math'

const sqrt2 = 1.414214
const infinityBox = new Box3().set(
	new Vector3(-Infinity, -Infinity, -Infinity),
	new Vector3(+Infinity, +Infinity, +Infinity)
)

/**
 * @deprecated
 */
export function generateGsiSpriteInfo(
	geom: GeomDataType,
	matr: MatrSpriteDataType | undefined
): void {
	if (geom.mode !== 'SPRITE' || !matr) {
		console.error('Geometry type is not `SPRITE` or Material is not valid, do nothing')
		return
	}

	/* @FIXME @浅寻 检查这个判断的必要性
	if (matr.useAttrSize && geom.attributes.size === undefined) {
		console.error(
			'Detected Matr.useAttrSize property is true but geometry has no `size` attribute, do nothing'
		)
		return
	}
	*/

	const box = new Box3()
	const sphere = new Sphere()

	const position = geom.attributes.position
	if (!position || isDISPOSED(position.array)) {
		return
	}

	// Custom attrs
	const attrNames = Object.keys(geom.attributes)
	for (let i = attrNames.length; i >= 0; i--) {
		const attr = attrNames[i]
		if (attr === 'position' || !geom.attributes[attr] || isDISPOSED(geom.attributes[attr].array)) {
			attrNames.splice(i, 1)
		}
	}

	const length = position.array.length
	const count = length / 3

	/* @FIXME @浅寻 transform 应该在 shader 中做
	const centerDist =
		_v20.subVectors(matr.center as Vector2, new Vector2(0.5, 0.5)).length() + sqrt2 / 2
	*/
	const centerDist = sqrt2 / 2

	// const size = matr.size

	// const size = geom.attributes.size
	// if (size && size.array.length !== (length / 3) * 2) {
	// 	console.warn('Sprite attribute `size` length should be equal to 2/3 * sprite count')
	// }

	// const rotation = geom.attributes.rotation
	// if (rotation && rotation.array.length !== length / 3) {
	// 	console.warn('Sprite attribute `rotation` length should be equal to sprite count')
	// }

	// Generate sprite triangles
	// Total bytes for one sprite:
	// 4 + 12 * 4 = 52 bytes
	const posArr = position.array
	const corner = new Int8Array(count * 4)
	const spritepos = new Float32Array(3 * count * 4)
	const indices = 6 * count > 65535 ? new Uint32Array(6 * count) : new Uint16Array(6 * count)
	const customAttrs = attrNames.map((name) => {
		const constructor = Object.getPrototypeOf(geom.attributes[name].array).constructor
		if (!constructor) {
			console.error('GL2Converter::SpriteGeometry cannot get custom attribute array constructor')
			return
		}
		const itemSize = geom.attributes[name].itemSize
		return {
			name: name,
			itemSize: itemSize,
			array: new constructor(count * itemSize * 4) as TypedArray,
			normalized: geom.attributes[name].normalized,
			usage: geom.attributes[name].usage,
		}
	})
	for (let i = 0; i < count; i++) {
		// Center position
		const i03 = i * 3
		const px = posArr[i03 + 0]
		const py = posArr[i03 + 1]
		const pz = posArr[i03 + 2]

		// New sprite world position, to be processed in vs
		const i12 = i * 12
		spritepos[i12 + 0] = px
		spritepos[i12 + 1] = py
		spritepos[i12 + 2] = pz
		spritepos[i12 + 3] = px
		spritepos[i12 + 4] = py
		spritepos[i12 + 5] = pz
		spritepos[i12 + 6] = px
		spritepos[i12 + 7] = py
		spritepos[i12 + 8] = pz
		spritepos[i12 + 9] = px
		spritepos[i12 + 10] = py
		spritepos[i12 + 11] = pz

		/* @FIXME @浅寻 这样算出来的 bbox 是不准确的，position 在 shader 里会被动态修改
		box.expandByPoint(_v30.set(px + centerDist, py + centerDist, pz + centerDist))
		box.expandByPoint(_v30.set(px - centerDist, py - centerDist, pz - centerDist))
		*/

		// New indices, 6 index per quad
		const i06 = i * 6
		const offset = i * 4
		indices[i06 + 0] = offset + 0
		indices[i06 + 1] = offset + 1
		indices[i06 + 2] = offset + 2
		indices[i06 + 3] = offset + 0
		indices[i06 + 4] = offset + 2
		indices[i06 + 5] = offset + 3

		// New corner attribute, indicates quad corners
		corner[offset + 0] = 0
		corner[offset + 1] = 1
		corner[offset + 2] = 2
		corner[offset + 3] = 3

		// Custom attrs
		for (let attrIdx = 0; attrIdx < customAttrs.length; attrIdx++) {
			const attr = customAttrs[attrIdx]
			if (attr === undefined) continue

			const { name, itemSize, array } = attr
			const itemOffset = i * itemSize
			const vertexOffset = itemOffset * 4

			const values = new Array(itemSize)
			for (let j = 0; j < itemSize; j++) {
				values[j] = geom.attributes[name].array[itemOffset + j]
			}

			for (let icorner = 0; icorner < 4; icorner++) {
				values.forEach((v, index) => {
					array[vertexOffset + icorner * itemSize + index] = v
				})
			}
		}
	}

	const attributes: { [key: string]: AttributeDataType } = {}

	attributes.position = {
		array: spritepos,
		itemSize: 3,
		count: count * 4,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable: true,
	}

	attributes.corner = {
		array: corner,
		itemSize: 1,
		count: count * 4,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable: true,
	}

	for (let i = 0; i < customAttrs.length; i++) {
		const attr = customAttrs[i]
		if (attr === undefined) continue
		attributes[attr.name] = {
			array: attr.array,
			itemSize: attr.itemSize,
			count: count * 4,
			normalized: attr.normalized,
			usage: attr.usage,
			version: 0,
			disposable: true,
		}
	}

	// if (size) attributes.size = size
	// if (rotation) attributes.rotation = rotation

	geom.attributes = attributes

	geom.indices = {
		array: indices,
		itemSize: 1,
		count: 6 * count,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable: true,
	}

	geom.extensions = geom.extensions || {}
	geom.extensions.EXT_geometry_bounds = { box: infinityBox.clone() }
	// if (matr.sizeAttenuation) {
	// 	// geom.boundingBox = box
	// 	// geom.boundingSphere = box.getBoundingSphere(sphere)
	// 	geom.boundingBox = infinityBox.clone()
	// 	geom.boundingSphere = infinitySphere.clone()
	// } else {
	// 	geom.boundingBox = infinityBox.clone()
	// 	geom.boundingSphere = infinitySphere.clone()
	// }

	/* @FIXME @浅寻 使用插槽做这个事情，不定义为特殊属性
	if (matr.useAttrSize) {
		matr.defines = matr.defines || {}
		matr.defines.GSI_USE_ATTR_SIZE = true
		matr.attributes = matr.attributes || {}
		matr.attributes.size = 'vec2'
	}
	*/
}
