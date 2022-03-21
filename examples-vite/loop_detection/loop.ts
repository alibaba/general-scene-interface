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
import { specifyNode } from '@gs.i/utils-specify'

{
	const conv = new ThreeLiteConverter({ overrideFrustumCulling: true })
	console.log(conv)
	window['conv'] = conv
	try {
		const root = specifyNode({})
		const inode = specifyNode({})
		const leaf = specifyNode({})

		root.children.add(inode)
		inode.children.add(leaf)
		leaf.children.add(inode)

		// debugger
		const threeMesh = conv.convert(root)
		console.log(threeMesh)
	} catch (error) {
		console.log(error)
		console.log('succeed')
	}
	try {
		const root = specifyNode({})
		const inode = specifyNode({})
		const leaf = specifyNode({})

		root.children.add(inode)
		inode.children.add(leaf)
		root.children.add(leaf)

		// debugger
		const threeMesh = conv.convert(root)
		console.log(threeMesh)
	} catch (error) {
		console.log(error)
		console.log('succeed')
	}
}

export {}
