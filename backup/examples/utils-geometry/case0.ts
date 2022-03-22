import { THREE } from 'gl2'
import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import { Mesh, MatrUnlit } from '@gs.i/frontend-sdk'
import { buildBox, buildTorus, buildSphere, buildCircle } from '@gs.i/utils-geom-builders'
import { genBBoxWireframe, genBSphereWireframe, genGeomWireframe } from '@gs.i/utils-geometry'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'

// 标准之外
import { camera, renderer, timeline } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

/**
 * 使用 ts frontend 和 geomBuilder 构建 gsi，并使用transform做动画
 */

const group = new Mesh()

group.add(new AxesHelper())

// Mesh
const mesh = new Mesh({ name: 'Box' })
mesh.geometry = buildTorus()
mesh.material = new MatrUnlit({ baseColorFactor: { r: 0.1, g: 0.1, b: 0.1 } })
mesh.transform.scale.setScalar(10)
group.add(mesh)

// Wireframe
const wireframe = new Mesh({
	name: 'wireframe',
	geometry: genGeomWireframe(mesh.geometry),
	material: new MatrUnlit(),
})
wireframe.transform.matrix = Array.from(mesh.transform.matrix)
// group.add(wireframe)

// BSphere helper
if (mesh.geometry.boundingSphere) {
	const sphereHelper = new Mesh({
		name: 'sphereHelper',
		geometry: genBSphereWireframe(mesh.geometry.boundingSphere),
		material: new MatrUnlit(),
	})
	sphereHelper.transform.matrix = Array.from(mesh.transform.matrix)
	group.add(sphereHelper)
}

// BBox helper
if (mesh.geometry.boundingBox) {
	const boxHelper = new Mesh({
		name: 'boxHelper',
		geometry: genBBoxWireframe(mesh.geometry.boundingBox),
		material: new MatrUnlit({ baseColorFactor: { r: 0.1, g: 1, b: 0.1 } }),
	})
	boxHelper.transform.matrix = Array.from(mesh.transform.matrix)
	group.add(boxHelper)
}

const converter = new GL2Converter(GL2ConvConfig)
const refiner = new GSIRefiner(RefinerConfig)

// 渲染逻辑
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
window['wireframe'] = wireframe
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['refiner'] = refiner
window['THREE'] = THREE
