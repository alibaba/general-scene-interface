/* eslint-disable @typescript-eslint/ban-types */
import {
	MeshDataType,
	GeomDataType,
	Int,
	BBox,
	BSphere,
	isRenderableMesh,
	ColorRGB,
} from '@gs.i/schema-scene'
import { Processor, TraverseType } from '@gs.i/processor-base'

import { genBBoxWireframe, genBSphereWireframe, genGeomWireframe } from '@gs.i/utils-wireframe'
import { MatrUnlit, Mesh } from '@gs.i/frontend-sdk'
import { BoundingProcessor } from '@gs.i/processor-bound'

const defaultConfig = {
	/**
	 * whether to hide original meshes
	 */
	hideOriginal: false,

	/**
	 * whether to add visible wire frame
	 */
	useWireframe: false,
	/**
	 * whether to add visible BBox
	 */
	useBBox: false,
	/**
	 * whether to add visible BSphere
	 */
	useBSphere: false,

	/**
	 * boundingProcessor
	 * @note safe to share but better input one that used by the convertor
	 */
	boundingProcessor: new BoundingProcessor(),

	// /**
	//  * animate color
	//  * @deprecated will cause mem leak
	//  * @note animation will never stop, use carefully
	//  */
	// colorAnimation: false,
}

type Config = Partial<typeof defaultConfig>

/**
 * @note NON_PURE FUNCTIONS, will modify your input
 * @note NOT CACHED
 * @note slow, do not call frequently
 */
export class IndicatorProcessor extends Processor {
	// must children first, or dead loop
	traverseType = TraverseType.PostOrder
	type = 'Indicator'
	canEditNode = true
	canEditTree = true

	config: Required<Config>

	constructor(config: Config = {}) {
		super()
		this.config = {
			...defaultConfig,
			...config,
		}
	}

	override processNode(mesh: MeshDataType, parent?: MeshDataType) {
		if (isRenderableMesh(mesh)) {
			const geometry = mesh.geometry
			if (this.config.useBBox) {
				const indicator = new Mesh()
				indicator.name = 'Indicator:BBox'
				indicator.geometry = genBBoxWireframe(
					this.config.boundingProcessor.getGeomBoundingBox(geometry)
				)
				indicator.material = new MatrUnlit({
					baseColorFactor: HSVtoRGB(Math.random(), 1, 1),
				})
				mesh.children.add(indicator)
			}
			if (this.config.useBSphere) {
				const indicator = new Mesh()
				indicator.name = 'Indicator:BSphere'
				indicator.geometry = genBSphereWireframe(
					this.config.boundingProcessor.getGeomBoundingSphere(geometry),
					12
				)
				indicator.material = new MatrUnlit({
					baseColorFactor: HSVtoRGB(Math.random(), 1, 1),
				})
				mesh.children.add(indicator)
			}
			if (this.config.useWireframe) {
				const indicator = new Mesh()
				indicator.name = 'Indicator:Wireframe'
				indicator.geometry = genGeomWireframe(geometry)
				indicator.material = new MatrUnlit({
					baseColorFactor: HSVtoRGB(Math.random(), 1, 1),
				})
				mesh.children.add(indicator)
			}

			if (this.config.hideOriginal) {
				const original = new Mesh()
				original.visible = false
				original.name = 'Indicator:HiddenOriginal'
				original.geometry = mesh.geometry
				original.material = mesh.material
				mesh.children.add(original)
				;(mesh as any)['geometry'] = undefined
				;(mesh as any)['material'] = undefined
			}
		}
	}
}

class SchemaNotValid extends TypeError {
	constructor(msg?: string) {
		super('GSI:SchemaNotValid: ' + (msg || ''))
	}
}

/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR
 * h, s, v
 */
function HSVtoRGB(h, s, v) {
	let r, g, b
	if (arguments.length === 1) {
		;(s = h.s), (v = h.v), (h = h.h)
	}
	const i = Math.floor(h * 6)
	const f = h * 6 - i
	const p = v * (1 - s)
	const q = v * (1 - f * s)
	const t = v * (1 - (1 - f) * s)
	switch (i % 6) {
		case 0:
			;(r = v), (g = t), (b = p)
			break
		case 1:
			;(r = q), (g = v), (b = p)
			break
		case 2:
			;(r = p), (g = v), (b = t)
			break
		case 3:
			;(r = p), (g = q), (b = v)
			break
		case 4:
			;(r = t), (g = p), (b = v)
			break
		case 5:
			;(r = v), (g = p), (b = q)
			break
	}
	return { r, g, b }
}
