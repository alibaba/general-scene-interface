import { generateScene } from '@gs.i/utils-random-scene'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
// import { traverseBFS } from '@gs.i/utils-traverse'

import {
	renderer,
	timeline,
	camera,
	cameraControl,
	cameraProxy,
	WIDTH,
	HEIGHT,
} from '../__utils/LiteRenderer'
import { scene as threeScene } from '../__utils/LiteScene'

{
	const scene = generateScene({
		// scale: 10000,
		count: 64,
		depth: 10,
		useAnimation: true,
		resolution: [WIDTH, HEIGHT],
	})
	console.log(scene)

	const indicator = new IndicatorProcessor({
		// hideOriginal: true,
		useBBox: true,
		useBSphere: true,
		// useWireframe: true,
	})
	indicator.traverse(scene)

	const conv = new ThreeLiteConverter({ overrideFrustumCulling: true })
	console.log(conv)
	window['conv'] = conv

	// traverseBFS(scene, () => {})

	setInterval(() => {
		const v = Math.sin(performance.now() * 0.001) * 0.5 + 1.0
		// scene.transform.scale.x = v
		// scene.transform.scale.y = v
		// scene.transform.scale.z = v

		// let m = Array.from(scene.children.values())[0]
		// m = Array.from(m.children.values())[0]
		// m = Array.from(m.children.values())[0]
		// m = Array.from(m.children.values())[0]

		// console.log('Local', conv.config.matrixProcessor.getLocalMatrix(m))
		// console.log('World', conv.config.matrixProcessor.getWorldMatrix(m))
	}, 30)

	// debugger
	const threeMesh = conv.convert(scene)
	console.log(threeMesh)

	// console.log(cameraControl)

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

	window['cameraProxy'] = cameraProxy
}

export {}
