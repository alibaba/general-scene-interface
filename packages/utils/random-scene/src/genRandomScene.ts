/**
 * Random scene generator
 */

import {
	LooseMeshDataType,
	MeshDataType,
	Node,
	Int,
	Double,
	Transform3TRS,
	GeomDataType,
	MatrBaseDataType,
} from '@gs.i/schema-scene'
import { Specifier } from '@gs.i/processor-specify'
import {
	AutoVersionTransform3,
	MatrPbr,
	MatrUnlit,
	MatrPoint,
	MatrSprite,
	Mesh,
} from '@gs.i/frontend-sdk'

import {
	buildBox,
	buildCircle,
	buildCylinder,
	buildPlane,
	buildRing,
	buildSphere,
	buildTorus,
	// buildPolyhedron,
} from '@gs.i/utils-geom-builders'

const builderAlias = [
	(scale: Double) =>
		buildBox({ width: scale, height: scale, depth: scale, uv: true, normal: true }),
	(scale: Double) => buildCircle({ radius: scale, uv: true, normal: true }),
	(scale: Double) =>
		buildCylinder({ radiusTop: scale, radiusBottom: scale, height: scale, uv: true, normal: true }),
	(scale: Double) => buildPlane({ width: scale, height: scale, uv: true, normal: true }),
	(scale: Double) =>
		buildRing({ innerRadius: scale * 0.7, outerRadius: scale, uv: true, normal: true }),
	(scale: Double) => buildSphere({ radius: scale, uv: true, normal: true }),
	(scale: Double) => buildTorus({ radius: scale, uv: true, normal: true }),
	// (scale) => buildPolyhedron(),
]

function getRandomBuilder() {
	return builderAlias[Math.floor((builderAlias.length + 0.9) * Math.random())]
}

// @note this processor is safe to be put in global scope
const specifier = new Specifier()

export const defaultConfig = {
	/**
	 * how many meshed to put in the scene
	 */
	count: 9,
	/**
	 * the size of each mesh
	 */
	scale: 100,
	/**
	 * space between 2 meshes
	 */
	space: 100,
	/**
	 * depth of the tree
	 * @note depth of root is 0, must >= 1
	 */
	depth: 1,

	/**
	 * whether to randomly offset the positions of each meshes
	 * @note this will cause meshes to overlay with each other
	 */
	ditherPositions: false,

	/**
	 * whether to randomly disable used options
	 */
	ditherOptions: false,

	// spec options

	useSprite: false,
	usePoint: false,
	useLine: false,

	//

	usePBR: true,
	useTexture: false,
	usePrg: false,
	useTransparency: false,
	useBackSide: false,
	useDoubleSide: false,

	useAnimation: false,
}
export type Config = Partial<typeof defaultConfig>

export function generateScene(config: Config): MeshDataType {
	const c = {
		...config,
		...defaultConfig,
	}
	const root = new Mesh()

	// how to build a tree that has specified depth and leaf count

	const trunk = [root] as Node[]

	const depth = config.depth || 1

	for (let i = 1; i < depth; i++) {
		const branch = new Mesh()
		trunk.push(branch)
	}

	/**
	 * from deep-est branch, add leaves one by one, until root, then back to deepest branch
	 *
	 * time --------->--------->--------->--------->
	 * root			add
	 * |
	 * 1		add
	 * |
	 * 2	add				add
	 * |
	 * 3 add			add
	 */

	let pointer = trunk.length - 1
	let index = 0
	while (index < c.count) {
		const geom = getGeom(c)
		const matr = getMatr(c)
		const mesh = new Mesh()
		mesh.geometry = geom
		mesh.material = matr
		mesh.transform = getTransform(index, c.count, c.scale, c.space, c.ditherPositions)

		const node = trunk[pointer]
		node.children.add(mesh)

		index++
		pointer--
		if (pointer < 0) {
			pointer = trunk.length - 1
		}
	}

	//

	specifier.traverse(root)

	return root as MeshDataType
}

// export function updateScene(root: MeshDataType, config: Config): MeshDataType {}

export function getGeom(config: Config): GeomDataType {
	return getRandomBuilder()(config.scale ?? 1)
}

export function getMatr(config: Config): MatrBaseDataType {
	let usePBR = config.usePBR
	if (usePBR && config.ditherOptions) usePBR = Math.random() > 0.3

	if (usePBR) {
		return new MatrPbr({
			baseColorFactor: {
				r: Math.random(),
				g: Math.random(),
				b: Math.random(),
			},
			emissiveFactor: {
				r: Math.random() * 0.2,
				g: Math.random() * 0.2,
				b: Math.random() * 0.2,
			},
			metallicFactor: 0.1 + Math.random() * 0.8,
			roughnessFactor: 0.1 + Math.random() * 0.8,
		})
	} else {
		return new MatrUnlit({
			baseColorFactor: {
				r: Math.random(),
				g: Math.random(),
				b: Math.random(),
			},
		})
	}
}

/**
 * get a layout-ed transform for a mesh
 */
export function getTransform(
	index: Int,
	count: Int,
	scale: Double,
	space: Double,
	dither: boolean
): AutoVersionTransform3 {
	const transform = new AutoVersionTransform3()

	// width
	const w = Math.ceil(Math.sqrt(count))

	/**
	 * 	   	col	col	col
	 * row 	0 	1 	2
	 * row 	3 	4 	5
	 * row 	6
	 */

	const row = Math.floor(index / w)
	const col = index - row * w

	const width = scale * w + space * (w - 1)

	const x = col * space + col * scale + scale * 0.5 - width / 2
	const y = row * space + row * scale + scale * 0.5 - width / 2

	transform.position.x = x + (dither ? space * (Math.random() - 0.5) : 0) // make it overlay
	transform.position.y = y + (dither ? space * (Math.random() - 0.5) : 0) // make it overlay
	transform.position.z = scale * 0.5 + (dither ? scale * (Math.random() - 0.5) : 0) // don't dither too much

	transform.scale.set(scale, scale, scale)

	return transform
}
