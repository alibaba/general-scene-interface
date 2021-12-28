import { Geom, Attr } from '@gs.i/frontend-sdk'
import { BBox, BSphere, isDISPOSED, GeomDataType } from '@gs.i/schema-scene'

export interface SpriteGeomConfig {
	/**
	 * Dynamic attributes
	 */
	dynamic: boolean
	/**
	 * Whether to use offset/scale/rotation attributes
	 */
	transformAttributes: boolean
	/**
	 * { key: attribute name, value: item size per vertex }
	 * @TODO
	 */
	customAttributes: {
		[name: string]: number
	}
}

export const defaultConfig: SpriteGeomConfig = {
	dynamic: false,
	transformAttributes: false,
	customAttributes: {},
}

export type SpriteData = {
	// vec3
	positions: number[]
	// vec2
	offsets?: number[]
	// vec2
	scales?: number[]
	// float
	rotations?: number[]
}

export class SpriteGeom extends Geom {
	readonly config: SpriteGeomConfig
	readonly VERTICES_PER_SPRITE = 4

	indices: Attr
	attributes: {
		position: Attr
		corner: Attr
		aOffset?: Attr
		aScale?: Attr
		aRotation?: Attr
	} & Geom['attributes']
	extensions: Exclude<GeomDataType['extensions'], undefined> = {
		EXT_geometry_bounds: {
			box: {
				min: { x: -Infinity, y: -Infinity, z: -Infinity },
				max: { x: Infinity, y: Infinity, z: Infinity },
			},
			sphere: {
				center: { x: 0, y: 0, z: 0 },
				radius: Infinity,
			},
		},
	}

	private _spritesInfo: {
		count: number
		maxIndex: number
		initialized: boolean
	}

	constructor(config: Partial<SpriteGeomConfig>) {
		super()
		this.config = {
			...defaultConfig,
			...config,
		}
	}

	updateData(
		data: SpriteData,
		bounds: {
			box?: BBox
			sphere?: BSphere
		} = {}
	) {
		this._initSpritesInfo(data)
		this._createAttributes()
		this.updateSubData(data, 0, this._spritesInfo.count, bounds)
		this._spritesInfo.initialized = true
	}

	updateSubData(
		data: Partial<SpriteData>,
		/**
		 * sprite count offset
		 */
		offset: number,
		/**
		 * sprite count length
		 */
		length: number,
		/**
		 * user input bounds
		 */
		bounds: {
			box?: BBox
			sphere?: BSphere
		} = {}
	) {
		if (offset < 0) {
			length += offset
			offset = 0
		}
		if (length < 1) {
			return
		}
		if (length + offset > this._spritesInfo.count) {
			console.error('GSI::Sprite - buffer length overflow')
			return
		}

		const { count, maxIndex, initialized } = this._spritesInfo
		const { dynamic, transformAttributes } = this.config
		const { positions, offsets, scales, rotations } = data

		if ((offsets || scales || rotations) && !transformAttributes) {
			throw new Error(
				'GSI::Sprite - Cannot update transforms data with config.transformAttributes set to false'
			)
		}

		const posAttr = this.attributes.position
		const offsetAttr = this.attributes.aOffset
		const scaleAttr = this.attributes.aScale
		const rotationAttr = this.attributes.aRotation

		const posArr = positions ? posAttr.array : undefined
		const offsetArr = offsets && offsetAttr ? offsetAttr.array : undefined
		const scaleArr = scales && scaleAttr ? scaleAttr.array : undefined
		const rotationArr = rotations && rotationAttr ? rotationAttr.array : undefined
		const indices = initialized ? undefined : this.indices.array
		const corners = initialized ? undefined : this.attributes.corner.array

		if (
			(posArr && isDISPOSED(posArr)) ||
			(offsetArr && isDISPOSED(offsetArr)) ||
			(scaleArr && isDISPOSED(scaleArr)) ||
			(rotationArr && isDISPOSED(rotationArr)) ||
			(indices && isDISPOSED(indices)) ||
			(corners && isDISPOSED(corners))
		) {
			throw new Error('GSI::Sprite - Array has been disposed')
		}

		for (let i = offset, il = offset + length; i < il; i++) {
			const i02 = i * 2
			const i04 = i * 4
			const i08 = i * 8

			if (positions && posArr) {
				const i03 = i * 3
				const i12 = i * 12

				// sprite world position
				const x = positions[i03 + 0]
				const y = positions[i03 + 1]
				const z = positions[i03 + 2]

				posArr[i12 + 0] = x
				posArr[i12 + 1] = y
				posArr[i12 + 2] = z
				posArr[i12 + 3] = x
				posArr[i12 + 4] = y
				posArr[i12 + 5] = z
				posArr[i12 + 6] = x
				posArr[i12 + 7] = y
				posArr[i12 + 8] = z
				posArr[i12 + 9] = x
				posArr[i12 + 10] = y
				posArr[i12 + 11] = z
			}

			if (indices && corners) {
				const i06 = i * 6

				// sprite indices, 6 index per quad
				indices[i06 + 0] = i04 + 0
				indices[i06 + 1] = i04 + 1
				indices[i06 + 2] = i04 + 2
				indices[i06 + 3] = i04 + 0
				indices[i06 + 4] = i04 + 2
				indices[i06 + 5] = i04 + 3

				// corner attribute to indicate quad corners
				corners[i04 + 0] = 0
				corners[i04 + 1] = 1
				corners[i04 + 2] = 2
				corners[i04 + 3] = 3
			}

			if (offsets && offsetArr) {
				const offsetX = offsets[i02 + 0]
				const offsetY = offsets[i02 + 1]
				offsetArr[i08 + 0] = offsetX
				offsetArr[i08 + 1] = offsetY
				offsetArr[i08 + 2] = offsetX
				offsetArr[i08 + 3] = offsetY
				offsetArr[i08 + 4] = offsetX
				offsetArr[i08 + 5] = offsetY
				offsetArr[i08 + 6] = offsetX
				offsetArr[i08 + 7] = offsetY
			}

			if (scales && scaleArr) {
				const scaleX = scales[i02 + 0]
				const scaleY = scales[i02 + 1]
				scaleArr[i08 + 0] = scaleX
				scaleArr[i08 + 1] = scaleY
				scaleArr[i08 + 2] = scaleX
				scaleArr[i08 + 3] = scaleY
				scaleArr[i08 + 4] = scaleX
				scaleArr[i08 + 5] = scaleY
				scaleArr[i08 + 6] = scaleX
				scaleArr[i08 + 7] = scaleY
			}

			if (rotations && rotationArr) {
				const rotation = rotations[i]
				rotationArr[i04 + 0] = rotation
				rotationArr[i04 + 1] = rotation
				rotationArr[i04 + 2] = rotation
				rotationArr[i04 + 3] = rotation
			}

			// Custom attrs
			// for (let attrIdx = 0; attrIdx < customAttrs.length; attrIdx++) {
			// 	const attr = customAttrs[attrIdx]
			// 	if (attr === undefined) continue

			// 	const { name, itemSize, array } = attr
			// 	const itemOffset = i * itemSize
			// 	const vertexOffset = itemOffset * 4

			// 	const values = new Array(itemSize)
			// 	for (let j = 0; j < itemSize; j++) {
			// 		values[j] = geom.attributes[name].array[itemOffset + j]
			// 	}

			// 	for (let icorner = 0; icorner < 4; icorner++) {
			// 		values.forEach((v, index) => {
			// 			array[vertexOffset + icorner * itemSize + index] = v
			// 		})
			// 	}
			// }
		}

		if (!this.extensions.EXT_geometry_bounds) {
			this.extensions.EXT_geometry_bounds = {}
		}

		if (bounds.box) {
			this.extensions.EXT_geometry_bounds.box = bounds.box
		}

		if (bounds.sphere) {
			this.extensions.EXT_geometry_bounds.sphere = bounds.sphere
		}
	}

	private _initSpritesInfo(data: SpriteData) {
		const count = data.positions.length
		const maxIndex = count * this.VERTICES_PER_SPRITE
		this._spritesInfo = {
			count,
			maxIndex,
			initialized: false,
		}
	}

	private _createAttributes() {
		const { count, maxIndex } = this._spritesInfo
		const { dynamic, transformAttributes } = this.config
		const vertices = count * this.VERTICES_PER_SPRITE

		const positions = new Float32Array(vertices * 3)
		this.attributes.position = new Attr(
			positions,
			3,
			false,
			dynamic ? 'DYNAMIC_DRAW' : 'STATIC_DRAW'
		)

		const corners = new Float32Array(vertices)
		this.attributes.corner = new Attr(corners, 1, false, dynamic ? 'DYNAMIC_DRAW' : 'STATIC_DRAW')

		let indicesConstructor
		if (maxIndex > 65535) {
			indicesConstructor = Uint32Array
		} else if (maxIndex > 255) {
			indicesConstructor = Uint16Array
		} else {
			indicesConstructor = Uint8Array
		}

		const indices = new indicesConstructor(count * 6)
		this.indices = new Attr(indices, 1, false, dynamic ? 'DYNAMIC_DRAW' : 'STATIC_DRAW')

		if (transformAttributes) {
			const offsets = new Float32Array(vertices * 2)
			const scales = new Float32Array(vertices * 2)
			const rotations = new Float32Array(vertices)
			this.attributes.aOffset = new Attr(
				offsets,
				2,
				false,
				dynamic ? 'DYNAMIC_DRAW' : 'STATIC_DRAW'
			)
			this.attributes.aScale = new Attr(scales, 2, false, dynamic ? 'DYNAMIC_DRAW' : 'STATIC_DRAW')
			this.attributes.aRotation = new Attr(
				rotations,
				1,
				false,
				dynamic ? 'DYNAMIC_DRAW' : 'STATIC_DRAW'
			)
		}
	}
}
