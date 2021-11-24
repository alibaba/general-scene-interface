import { THREE } from 'gl2'
import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import * as SDK from '@gs.i/frontend-sdk'
import { buildSphere } from '@gs.i/utils-geom-builders'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'
import { Raycaster } from '@gs.i/utils-raycast'

// 标准之外
import { camera, renderer, timeline, HEIGHT } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

/**
 * 使用 ts frontend 和 geomBuilder 构建 gsi，并使用transform做动画
 */

const image =
	'https://img.alicdn.com/imgextra/i3/O1CN01RbMgmM1DWAzg60GCD_!!6000000000223-0-tps-1024-1024.jpg'

// Raycast indicator
const text = document.createElement('div')
text.style.position = 'absolute'
text.style.top = HEIGHT + 10 + 'px'
text.style.fontSize = '30px'
document.body.appendChild(text)

// Cam center dot
const dot = document.createElement('div')
dot.style.background = '#fff'
dot.style.zIndex = '9999'
dot.style.width = '2px'
dot.style.height = '2px'
dot.style.position = 'absolute'
dot.style.left = '450px'
dot.style.top = '350px'
document.body.appendChild(dot)

// Scene
const group = new SDK.Mesh()

// Mesh
const mesh = new SDK.Mesh({ name: 'Box' })
const geom = buildSphere({ widthSegments: 100, heightSegments: 50 })
const matr = new SDK.MatrUnlit({ baseColorFactor: { r: 1, g: 0, b: 1 } })

mesh.material = matr
mesh.geometry = geom
mesh.transform.scale.setScalar(5)
mesh.transform.position.set(10, 10, 10)

group.add(mesh)

// Line
const line = new SDK.Mesh({ name: 'Line' })
const lineGeom = new SDK.Geom({
	mode: 'LINES',
	attributes: {
		position: new SDK.Attr(new Float32Array([20, 20, 0, 0, 0, 20]), 3),
	},
	boundingBox: undefined,
	boundingSphere: undefined,
})
const lineMatr = new SDK.MatrUnlit({ baseColorFactor: { r: 0.2, g: 0.6, b: 1 } })
line.material = lineMatr
line.geometry = lineGeom

group.add(line)

// Sprite with attenuation
const count = 5
const pos: number[] = []
const sizes: number[] = []
for (let i = 0; i < count * 3; i++) {
	pos[i] = Math.random() * 20
}
for (let i = 0; i < count * 2; i++) {
	sizes[i] = 5 + Math.random() * 5
}

const sprite1 = new SDK.Mesh({ name: 'sprite-attenuation' })
sprite1.geometry = new SDK.Geom({
	mode: 'SPRITE',
	attributes: {
		position: {
			array: new Float32Array(pos),
			itemSize: 3,
			count: count,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
		},
		size: {
			array: new Float32Array(sizes),
			itemSize: 2,
			count: count,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
		},
	},
})
const material1 = new SDK.MatrSprite({
	alphaMode: 'BLEND',
	baseColorTexture: {
		image: { uri: image },
		sampler: {},
	},
	baseColorFactor: { r: 0.5, g: 1.0, b: 0.5 },
	sizeAttenuation: true,
	// center: { x: 0.0, y: 0.0 },
	// size: { x: 1, y: 1 },
	useAttrSize: true,
	opacity: 1.0,
})
sprite1.material = material1
group.add(sprite1)

// Sprite without attenuation
const sprite2 = new SDK.Mesh({ name: 'sprite-no-attenuation' })
sprite2.geometry = new SDK.Geom({
	mode: 'SPRITE',
	attributes: {
		position: {
			array: new Float32Array([10, 10, 10, 15, 15, 0]),
			itemSize: 3,
			count: 2,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
		},
	},
})
const material2 = new SDK.MatrSprite({
	alphaMode: 'BLEND',
	baseColorTexture: {
		image: { uri: image, flipY: true },
		sampler: {},
	},
	baseColorFactor: { r: 1, g: 1, b: 1 },
	sizeAttenuation: false,
	size: { x: 0.05, y: 0.05 },
	rotation: Math.PI / 4,
	opacity: 0.6,
})
sprite2.material = material2
sprite2.transform.position.x = 10
sprite2.transform.position.y = 10
sprite2.transform.rotation.x = Math.PI / 4
sprite2.transform.rotation.y = Math.PI / 4
group.add(sprite2)

// Mesh animations
timeline.addTrack({
	id: '',
	duration: 2000,
	loop: true,
	onUpdate: (t, p) => {
		const spriteMatr1 = sprite1.material as SDK.MatrSprite
		const spriteMatr2 = sprite2.material as SDK.MatrSprite
		// spriteMatr1.size.x = 2 + Math.sin(Math.PI * 2 * p) * 2
		// spriteMatr1.size.y = 2 + Math.cos(Math.PI * 2 * p) * 2
		spriteMatr2.rotation += 0.01
		mesh.transform.position.x = Math.sin(2 * Math.PI * p) * 20
		mesh.transform.position.y = Math.cos(2 * Math.PI * p) * 20
	},
})

// Axes helper
group.add(new AxesHelper({ length: 10000 }))

// Raycaster
const raycaster = new Raycaster()
raycaster.near = camera.near
raycaster.far = camera.far

const _v = new THREE.Vector3()
timeline.addTrack({
	id: 'Raycast',
	duration: Infinity,
	onUpdate: (t, p) => {
		raycaster.set(camera.position.toArray(), camera.getWorldDirection(_v).toArray())

		text.innerHTML = 'NOT HIT'

		if (raycaster.intersectTriangleMesh(mesh).hit) {
			text.innerHTML = 'HIT - Mesh'
			return
		}

		if (raycaster.intersectLineMesh(line, 0.5).hit) {
			text.innerHTML = 'HIT - Line'
			return
		}

		const pos = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
		const rot = {
			x: camera.rotation.x,
			y: camera.rotation.y,
			z: camera.rotation.z,
			order: camera.rotation.order,
		}

		const res1 = raycaster.intersectSpriteMesh(sprite1, pos, rot, true, true)

		if (res1.hit) {
			text.innerHTML = 'HIT - Sprite1 - ' + res1.intersections[0].index
			return
		}

		const res2 = raycaster.intersectSpriteMesh(sprite2, pos, rot, true, true)
		if (res2.hit) {
			text.innerHTML = 'HIT - Sprite2 - ' + res2.intersections[0].index
			return
		}
	},
})

// 渲染逻辑
const converter = new GL2Converter(GL2ConvConfig)
const refiner = new GSIRefiner(RefinerConfig)

scene.add(converter.convert(group))

timeline.addTrack({
	id: '绘制循环',
	duration: Infinity,
	onUpdate: (t, p) => {
		refiner.update(group, {
			cameraPosition: camera.position,
			cameraRotation: camera.rotation,
			cameraNear: camera.near,
			cameraAspect: camera.aspect,
			cameraFOV: camera.fov,
			cameraFar: camera.far,
		})
		converter.convert(group)
		renderer.render(scene, camera)
	},
})

timeline.play()

window['mesh'] = mesh
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['refiner'] = refiner
window['THREE'] = THREE
window['raycaster'] = raycaster
