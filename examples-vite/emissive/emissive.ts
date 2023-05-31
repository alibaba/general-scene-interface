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
} from '../__utils/ThreeRenderer'
import { specifyGeometry, specifyMaterial, specifyNode } from '@gs.i/utils-specify'
import { buildBox } from '@gs.i/utils-geom-builders'
import { Color } from 'three'

{
	const conv = new Converter({ overrideFrustumCulling: true })

	const geometry = buildBox({ width: 100, height: 100, depth: 100 })
	const material = specifyMaterial({ type: 'pbr', emissiveFactor: new Color('red') })
	console.log(material)

	// const material = specifyMaterial({ type: 'unlit', baseColorFactor: new Color('red') })
	const scene = specifyNode({ geometry, material })

	const threeMesh = conv.convert(scene)
	threeScene.add(threeMesh)

	timeline.add({
		duration: Infinity,
		onUpdate: () => {
			// scene.transform.version++

			// TODO should check if this needs to be updated
			conv.cullingProcessor.updateFrustum({
				cameraPosition: camera.position,
				cameraRotation: camera.rotation,
				cameraNear: camera.near,
				cameraFar: camera.far,
				cameraFOV: camera.fov,
				cameraAspect: camera.aspect,
			})

			conv.convert(scene)
			renderer.render(threeScene, camera)
		},
	})

	timeline.play()
}

export {}
