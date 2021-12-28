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
	isRenderableMesh,
} from '@gs.i/schema-scene'
import { specifyTree } from '@gs.i/utils-specify'
import {
	AutoVersionTransform3,
	MatrPbr,
	MatrUnlit,
	MatrPoint,
	MatrSprite,
	Mesh,
	TextureData,
	ImageData,
	Sampler,
	Geom,
	Attr,
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

import { GLine } from '@gs.i/frontend-gline'
import { Sprite } from '@gs.i/frontend-sprite'

const builderAlias = [
	(scale: Double, config: Config) =>
		buildBox({
			width: scale,
			height: scale,
			depth: scale,
			uv: true,
			normal: true,
			widthSegments: Math.round(Math.random() * 3 + 1),
			heightSegments: Math.round(Math.random() * 3 + 1),
			depthSegments: Math.round(Math.random() * 3 + 1),
		}),
	(scale: Double, config: Config) =>
		buildCircle({
			radius: scale / 2,
			uv: true,
			normal: true,
			segments: Math.round(Math.random() * 20 + 3),
		}),
	(scale: Double, config: Config) =>
		buildCylinder({
			radiusTop: scale / 2,
			radiusBottom: scale / 2,
			height: scale,
			uv: true,
			normal: true,
			radialSegments: Math.round(Math.random() * 3 + 3),
			heightSegments: Math.round(Math.random() * 3 + 1),
		}),
	(scale: Double, config: Config) =>
		buildPlane({
			width: scale,
			height: scale,
			uv: true,
			normal: true,
			widthSegments: Math.round(Math.random() * 3 + 1),
			heightSegments: Math.round(Math.random() * 3 + 1),
		}),
	(scale: Double, config: any) =>
		buildRing({
			innerRadius: (scale * 0.7) / 2,
			outerRadius: scale / 2,
			uv: true,
			normal: true,
			thetaSegments: Math.round(Math.random() * 10 + 3),
			phiSegments: Math.round(Math.random() * 3 + 1),
		}),
	(scale: Double, config: Config) =>
		buildSphere({
			radius: scale / 2,
			uv: true,
			normal: true,
			widthSegments: Math.round(Math.random() * 10 + 7),
			heightSegments: Math.round(Math.random() * 10 + 7),
		}),

	(scale: Double, config: Config) =>
		buildTorus({
			radius: scale / 2,
			tube: (scale / 2) * 0.5,
			uv: true,
			normal: true,
			radialSegments: Math.round(Math.random() * 10 + 5),
			tubularSegments: Math.round(Math.random() * 20 + 5),
		}),
	// (scale) => buildPolyhedron(),
]

function getRandomBuilder() {
	return builderAlias[Math.floor((builderAlias.length - 0.1) * Math.random())]
}

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
	useGLine: true,
	usePoint: true,
	useLine: false,

	//

	usePBR: true,
	useTexture: false,
	usePrg: false,
	useTransparency: false,
	useBackSide: false,
	useDoubleSide: false,

	useAnimation: false,

	resolution: [1000, 1000],
}
export type Config = Partial<typeof defaultConfig>

export function generateScene(config: Config = {}): Mesh {
	const c = {
		...defaultConfig,
		...config,
	}
	const root = new Mesh()

	const intervalIDs = [] as number[]
	root.extras = {
		intervalIDs,
	}

	// how to build a tree that has specified depth and leaf count

	const trunk = [root] as Node[]

	const depth = config.depth || 1

	for (let i = 1; i < depth; i++) {
		const branch = new Mesh()
		trunk[trunk.length - 1].children.add(branch)
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
		const mesh = getMesh(c)
		mesh.transform = getTransform(index, c.count, c.scale, c.space, c.ditherPositions)

		const node = trunk[pointer]
		node.children.add(mesh)

		if (config.useAnimation) {
			const ran = Math.random()
			if (ran < 0.1) {
				intervalIDs.push(
					setInterval(() => {
						const v = Math.sin(performance.now() * 0.001) * 0.5 + 1.0
						mesh.transform.scale.set(v, v, v)
					}, 30)
				)
			} else if (ran < 0.2) {
				intervalIDs.push(
					setInterval(() => {
						const v = Math.sin(performance.now() * 0.001) + 1.0
						mesh.transform.position.z = v * 0.5 * c.scale
					}, 30)
				)
			} else if (ran < 0.3) {
				intervalIDs.push(
					setInterval(() => {
						mesh.transform.rotation.x = performance.now() * 0.001
					}, 30)
				)
			} else if (ran < 0.4) {
				intervalIDs.push(
					setInterval(() => {
						mesh.transform.rotation.y = performance.now() * 0.001
					}, 30)
				)
			} else if (ran < 0.5) {
				intervalIDs.push(
					setInterval(() => {
						mesh.transform.rotation.z = performance.now() * 0.001
					}, 30)
				)
			}
		}

		index++
		pointer--
		if (pointer < 0) {
			pointer = trunk.length - 1
		}
	}

	//

	specifyTree(root)

	return root as Mesh
}

// export function updateScene(root: MeshDataType, config: Config): MeshDataType {}

export function getMesh(config: Config): Mesh {
	if (config.useGLine && Math.random() < 0.15) {
		return buildGLine({
			scale: config.scale || 100,
			lines: 2,
			linePoints: 6,
			resolution: config.resolution || [1000, 1000],
		})
	}
	if (config.usePoint && Math.random() < 0.15) {
		return buildPoints(config.scale)
	}
	if (config.useSprite && Math.random() < 0.15) {
		return buildSprite({
			scale: config.scale || 100,
			count: 10,
		})
	}

	const geom = getRandomBuilder()(config.scale ?? 1, config)
	const matr = getMatr(config)

	const mesh = new Mesh({
		geometry: geom,
		material: matr,
	})

	return mesh
}

export function getGeom(config: Config): GeomDataType {
	return getRandomBuilder()(config.scale ?? 1, config)
}

export function getMatr(config: Config): MatrBaseDataType {
	let usePBR = config.usePBR
	if (usePBR && config.ditherOptions) usePBR = Math.random() > 0.5

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
			baseColorTexture:
				Math.random() > 0.5
					? new TextureData(
							{
								imageSource:
									'https://img.alicdn.com/imgextra/i3/O1CN01RbMgmM1DWAzg60GCD_!!6000000000223-0-tps-1024-1024.jpg',
							},
							{}
					  )
					: undefined,
		})
	} else {
		return new MatrUnlit({
			baseColorFactor: {
				r: Math.random(),
				g: Math.random(),
				b: Math.random(),
			},
			baseColorTexture:
				Math.random() > 0.5
					? new TextureData(
							{
								imageSource:
									'https://img.alicdn.com/imgextra/i3/O1CN01RbMgmM1DWAzg60GCD_!!6000000000223-0-tps-1024-1024.jpg',
							},
							{}
					  )
					: undefined,
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

	transform.scale.set(1, 1, 1) // scale has affected geometry, do not scale again

	return transform
}

/**
 * generate random GLine segments
 */
function buildGLine(options = { scale: 100, lines: 2, linePoints: 3, resolution: [1000, 1000] }) {
	const { scale, lines, linePoints, resolution } = options
	const gline = new GLine({
		level: Math.random() > 0.5 ? 2 : 4,
		dynamic: true,
		u: true,
		positionsDisposable: true,
		colorsDisposable: true,
		color: { r: Math.random(), g: Math.random(), b: Math.random() },
		transparent: true,
		opacity: 0.2 + Math.random() * 0.8,
		lineWidth: scale / 20.0,
		usePerspective: Math.random() > 0.5,
		resolution: { x: resolution[0], y: resolution[1] },
		useColors: Math.random() > 0.5,
		texture:
			Math.random() > 0.5
				? new TextureData(
						{
							imageSource:
								'https://img.alicdn.com/imgextra/i2/O1CN01ffcMiO1cHr2q8UYnx_!!6000000003576-2-tps-6-968.png',
						},
						{}
				  )
				: undefined,
		pointSize: 10,
		infinity: 99999999.999,
		depthTest: true,
		renderOrder: 0,
	})

	const positions: number[][] = []
	const colors: number[][] = []
	for (let line = 0; line < lines; line++) {
		const linePositions: number[] = []
		const lineColors: number[] = []
		for (let point = 0; point < linePoints; point++) {
			linePositions.push(Math.random() * scale, Math.random() * scale, Math.random() * scale)
			lineColors.push(Math.random(), Math.random(), Math.random(), 0.2 + Math.random() * 0.8)
		}
		positions.push(linePositions)
		colors.push(lineColors)
	}

	gline.updateData({ positions, colors })

	return gline
}

function buildPoints(scale = 100) {
	const count = Math.round(Math.random() * 30)
	const positions: number[] = []
	for (let i = 0; i < count; i++) {
		positions.push(Math.random() * scale - scale / 2)
		positions.push(Math.random() * scale - scale / 2)
		positions.push(Math.random() * scale - scale / 2)
	}

	const points = new Mesh()
	points.geometry = new Geom({ mode: 'POINTS' })
	points.geometry.attributes.position = new Attr(new Float32Array(positions), 3)

	points.material = new MatrPoint({
		size: Math.random() * scale * 0.2 + 1,
		baseColorFactor: {
			r: Math.random(),
			g: Math.random(),
			b: Math.random(),
		},
		baseColorTexture:
			Math.random() > 0.5
				? new TextureData(
						{
							imageSource:
								'https://img.alicdn.com/imgextra/i3/O1CN01RbMgmM1DWAzg60GCD_!!6000000000223-0-tps-1024-1024.jpg',
						},
						{}
				  )
				: undefined,
	})

	return points
}

function buildSprite(config = { scale: 100, count: 10 }) {
	const { scale, count } = config
	const positions: number[] = []
	for (let i = 0; i < count; i++) {
		positions.push(Math.random() * scale - scale / 2)
		positions.push(Math.random() * scale - scale / 2)
		positions.push(Math.random() * scale - scale / 2)
	}

	const offsets: number[] = []
	for (let i = 0; i < count; i++) {
		offsets.push(Math.random(), Math.random())
	}

	const scales: number[] = []
	for (let i = 0; i < count; i++) {
		scales.push(10 + Math.random() * 40)
	}

	const rotations: number[] = []
	for (let i = 0; i < count; i++) {
		rotations.push(Math.random() * Math.PI)
	}

	const useAttributeTransform = Math.random() > 0.5
	const sprite = new Sprite({
		sizeAttenuation: true,
		uniformScale: { x: 50, y: 50 },
		uniformOffset: { x: Math.random(), y: Math.random() },
		uniformRotation: Math.random() * Math.PI,
		useAttributeTransform,
		dynamic: false,
		disposable: false,
		baseColorFactor: {
			r: Math.random(),
			g: Math.random(),
			b: Math.random(),
		},
		baseColorTexture:
			Math.random() > 0.5
				? new TextureData(
						{
							imageSource:
								'https://img.alicdn.com/imgextra/i3/O1CN01RbMgmM1DWAzg60GCD_!!6000000000223-0-tps-1024-1024.jpg',
						},
						{}
				  )
				: undefined,
	})

	sprite.updateData({
		positions,
		offsets,
		scales,
		rotations,
	})

	console.log(sprite)

	return sprite
}
