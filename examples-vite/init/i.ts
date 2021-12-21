import { generateScene } from '@gs.i/utils-random-scene'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'

import { renderer, timeline, camera, cameraControl } from '../__utils/LiteRenderer'
import { scene as threeScene } from '../__utils/LiteScene'

{
	const scene = generateScene({
		scale: 10000,
	})
	console.log(scene)

	const conv = new ThreeLiteConverter()
	console.log(conv)

	// debugger
	const threeMesh = conv.convert(scene)
	console.log(threeMesh)

	// console.log(cameraControl)

	threeScene.add(threeMesh)
	timeline.add({
		duration: Infinity,
		onUpdate: () => {
			conv.convert(scene)
			renderer.render(threeScene, camera)
		},
	})

	timeline.play()
}

export {}
