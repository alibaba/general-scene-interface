import { generateScene } from '@gs.i/utils-random-scene'
import { Converter } from '@gs.i/backend-three'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
// import { traverseBFS } from '@gs.i/utils-traverse'

import * as THREE from 'three'

/**
 * 场景
 */
export const threeScene = new THREE.Scene()
threeScene.matrixAutoUpdate = false
threeScene.matrixWorldAutoUpdate = false

import {
	renderer,
	timeline,
	camera,
	cameraControl,
	cameraProxy,
	WIDTH,
	HEIGHT,
	CamConfig,
} from '../__utils/ThreeRenderer'
import { specifyGeometry, specifyMaterial, specifyNode } from '@gs.i/utils-specify'
import { buildBox } from '@gs.i/utils-geom-builders'
import { Color } from 'three'

console.log(cameraProxy)
cameraProxy.setStatesCode('0|0.000|0.000|0.000|2.240|-3.120|21.602')

// gsi 物体
const scene = specifyNode({ name: 'gsi scene' })
const gsiThreeWrapper = specifyNode({ name: 'gsi three wrapper' })
scene.children.add(gsiThreeWrapper)
gsiThreeWrapper.parent = scene

// three 物体
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_lights_rectarealight.html
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'

init()

function init() {
	// camera.position.set(0, 5, -15)
	// camera.updateMatrix()
	// camera.updateMatrixWorld(true)

	const group = new THREE.Group()

	gsiThreeWrapper.extensions = {
		EXT_ref_threejs: group,
	}

	RectAreaLightUniformsLib.init()

	const rectLight1 = new THREE.RectAreaLight(0xff0000, 5, 4, 10)
	rectLight1.position.set(-5, 5, 5)
	group.add(rectLight1)
	// rectLight1.updateMatrix()
	// rectLight1.updateWorldMatrix(false, false)

	const rectLight2 = new THREE.RectAreaLight(0x00ff00, 5, 4, 10)
	rectLight2.position.set(0, 5, 5)
	group.add(rectLight2)
	// rectLight2.updateMatrix()
	// rectLight2.updateWorldMatrix(false, false)

	const rectLight3 = new THREE.RectAreaLight(0x0000ff, 5, 4, 10)
	rectLight3.position.set(5, 5, 5)
	group.add(rectLight3)
	// rectLight3.updateMatrix()
	// rectLight3.updateWorldMatrix(false, false)

	group.add(new RectAreaLightHelper(rectLight1))
	group.add(new RectAreaLightHelper(rectLight2))
	group.add(new RectAreaLightHelper(rectLight3))

	const geoFloor = new THREE.BoxGeometry(2000, 0.1, 2000)
	const matStdFloor = new THREE.MeshStandardMaterial({
		color: 0xbcbcbc,
		roughness: 0.1,
		metalness: 0,
	})
	const mshStdFloor = new THREE.Mesh(geoFloor, matStdFloor)
	group.add(mshStdFloor)

	const geoKnot = new THREE.TorusKnotGeometry(1.5, 0.5, 200, 16)
	const matKnot = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: 0 })
	const meshKnot = new THREE.Mesh(geoKnot, matKnot)
	meshKnot.position.set(0, 5, 0)
	group.add(meshKnot)
}

{
	const conv = new Converter({ overrideFrustumCulling: false, keepTopology: true })

	const threeMesh = conv.convert(scene)
	threeScene.add(threeMesh)

	// debugger

	timeline.add({
		duration: Infinity,
		onUpdate: () => {
			// scene.transform.version++

			// TODO should check if this needs to be updated
			// conv.cullingProcessor.updateFrustum({
			// 	cameraPosition: camera.position,
			// 	cameraRotation: camera.rotation,
			// 	cameraNear: camera.near,
			// 	cameraFar: camera.far,
			// 	cameraFOV: camera.fov,
			// 	cameraAspect: camera.aspect,
			// })

			conv.convert(scene)
			renderer.render(threeScene, camera)
		},
	})

	timeline.play()
}

console.log(threeScene)

export {}
