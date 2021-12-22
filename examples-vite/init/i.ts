import { generateScene } from '@gs.i/utils-random-scene'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { IndicatorProcessor } from '@gs.i/processor-indicator'

import { renderer, timeline, camera, cameraControl, cameraProxy } from '../__utils/LiteRenderer'
import { scene as threeScene } from '../__utils/LiteScene'

{
	const scene = generateScene({
		// scale: 10000,
		count: 400,
		depth: 10,
	})
	console.log(scene)

	const indicator = new IndicatorProcessor({
		hideOriginal: false,
		useBBox: true,
		useBSphere: true,
		// useWireframe: true,
	})
	indicator.traverse(scene)

	const conv = new ThreeLiteConverter({ overrideFrustumCulling: true })
	console.log(conv)

	// debugger
	const threeMesh = conv.convert(scene)
	console.log(threeMesh)

	// console.log(cameraControl)

	threeScene.add(threeMesh)
	timeline.add({
		duration: Infinity,
		onUpdate: () => {
			scene.transform.version++
			conv.convert(scene)
			renderer.render(threeScene, camera)
		},
	})

	timeline.play()

	window['cameraProxy'] = cameraProxy
}

export {}
