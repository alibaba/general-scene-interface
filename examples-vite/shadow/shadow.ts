import { Converter } from '@gs.i/backend-three'

import * as THREE from 'three'

/**
 * 场景
 */
export const threeScene = new THREE.Scene()
threeScene.matrixAutoUpdate = false
threeScene.matrixWorldAutoUpdate = false

import { renderer, timeline, camera } from '../__utils/ThreeRenderer'
import { specifyMaterial, specifyNode } from '@gs.i/utils-specify'
import { buildBox, buildPlane } from '@gs.i/utils-geom-builders'
import { Color } from 'three'
import { RenderableNode } from '@gs.i/schema-scene'

renderer.shadowMap.enabled = true

{
	// gsi 部分
	const conv = new Converter({ keepTopology: true })

	const node = specifyNode({})

	const threeMesh = conv.convert(node)
	threeScene.add(threeMesh)

	let box: RenderableNode
	{
		const geometry = buildBox({
			width: 100,
			height: 100,
			depth: 100,
			widthSegments: 100,
			heightSegments: 100,
			depthSegments: 100,
			// @note 没有 normal 的物体在一些浏览器或硬件设备上无法绘制阴影
			normal: true,
			uv: true,
		})
		const material = specifyMaterial({
			type: 'pbr',

			baseColorFactor: new Color('red'),
			roughnessFactor: 0.5,
			metallicFactor: 0.5,
		})

		box = specifyNode({ geometry, material })
		box.extensions = { EXT_mesh_shadow: { castShadow: true } }

		box.transform.matrix = new THREE.Matrix4().makeTranslation(0, 0, 50).elements

		node.children.add(box)
		box.parent = node
	}
	let floor: RenderableNode
	{
		const geometry = buildPlane({
			width: 1000,
			height: 1000,
			widthSegments: 100,
			heightSegments: 100,
			// @note 没有 normal 的物体在一些浏览器或硬件设备上无法绘制阴影
			normal: true,
			uv: true,
		})
		const material = specifyMaterial({
			type: 'pbr',

			baseColorFactor: new Color('blue'),
			roughnessFactor: 0.5,
			metallicFactor: 0.5,
		})

		floor = specifyNode({ geometry, material })
		floor.extensions = { EXT_mesh_shadow: { receiveShadow: true } }

		node.children.add(floor)
		floor.parent = node
	}

	// three 原生部分

	const light = new THREE.SpotLight(0xffffff, 1)
	light.position.set(0, 200, 200)
	light.target.position.set(0, 0, 0)
	light.distance = 100000
	light.intensity = 10
	light.castShadow = true
	light.updateMatrixWorld()
	threeScene.add(light)

	// three 版本阴影

	// {
	// 	const box = new THREE.Mesh(
	// 		new THREE.BoxGeometry(100, 100, 100),
	// 		new THREE.MeshPhysicalMaterial({ color: 0x00ff00, roughness: 0.5 })
	// 	)
	// 	box.position.z = 50
	// 	box.updateMatrixWorld()
	// 	box.castShadow = true
	// 	threeScene.add(box)

	// 	const floor = new THREE.Mesh(
	// 		new THREE.PlaneGeometry(1000, 1000),
	// 		new THREE.MeshPhysicalMaterial({ color: 0x00ff00, roughness: 0.5 })
	// 	)
	// 	floor.updateMatrixWorld()
	// 	floor.receiveShadow = true
	// 	threeScene.add(floor)
	// }

	timeline.add({
		duration: Infinity,
		onUpdate: () => {
			conv.convert(node)
			renderer.render(threeScene, camera)
		},
	})

	timeline.play()

	/**
	 * @note 如果渲染后再添加阴影，阴影不会生效，需要主动通知所有material更新
	 */

	// setTimeout(() => {
	// 	renderer.shadowMap.enabled = true
	// 	// renderer.shadowMap.needsUpdate = true
	// }, 1000)
	// setTimeout(() => {
	// 	box.material.version++
	// 	floor.material.version++
	// }, 2000)
}

export {}
