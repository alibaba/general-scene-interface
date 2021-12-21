import { generateScene } from '@gs.i/utils-random-scene'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'

{
	const scene = generateScene()
	console.log(scene)

	const conv = new ThreeLiteConverter()
	console.log(conv)

	// debugger
	const threeMesh = conv.convert(scene)
	console.log(threeMesh)
}

export {}
