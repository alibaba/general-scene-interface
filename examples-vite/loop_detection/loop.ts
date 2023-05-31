import { generateScene } from '@gs.i/utils-random-scene'
import { Converter } from '@gs.i/backend-three'
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
} from '../__utils/ThreeRenderer'
import { scene as threeScene } from '../__utils/ThreeScene'
import { specifyNode } from '@gs.i/utils-specify'

{
	const conv = new Converter({ overrideFrustumCulling: true })
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
