import { Scene } from '../core'
import type { PointerEvents } from '../events'
import { CircleShape, MaskShape, PolylineShape } from '../shapes'
import type { ExtendedCanvasStyles } from '../styles'

type PolylineCreationEvent = {
	type: 'createPolyline'
	target: PolylineShape
	currentTarget: Scene
}

/**
 * @return 取消监听函数
 */
export function drawPolyline(
	scene: Scene,
	onAdd?: (e: PolylineCreationEvent) => void,
	styles: Partial<ExtendedCanvasStyles> = {},
	pointStyles: Partial<ExtendedCanvasStyles> = {}
) {
	/**
	 * 如果没有 inited，click 时开始第一个点
	 * 如果已经 inited，click 时向尾部增加点
	 */
	let inited = false

	let polyline: PolylineShape | null = null
	let startPoint: CircleShape | null = null
	let endPoint: CircleShape | null = null
	let mask: MaskShape | null = null

	const cancel = () => {
		console.log('drawPolyline: cancel')

		scene.remove(startPoint!)
		scene.remove(endPoint!)
		scene.remove(mask!)
		scene.remove(polyline!)

		startPoint = null
		endPoint = null
		mask = null
		polyline = null

		inited = false
	}

	const onClick = (event: PointerEvents['pointerup']) => {
		const e = event.srcEvent

		if (e.button !== 0) {
			inited && cancel()
			return
		}

		if (!inited) {
			if (event.target !== event.currentTarget) return

			console.log('drawPolyline: click(init)')

			inited = true

			const x = (e.offsetX - scene.translate.x) / scene.scale
			const y = (e.offsetY - scene.translate.y) / scene.scale

			const startX = x
			const startY = y

			polyline = new PolylineShape()

			polyline.x = startX
			polyline.y = startY
			polyline.points.push({ x: 0, y: 0 })

			Object.assign(polyline.style, styles)

			// 增加 mask 盖住其他所有物体，来避免误操作
			mask = new MaskShape()
			mask.style.fillStyle = 'blue'
			mask.style.fillOpacity = 0.1
			scene.add(mask)
			mask.style.zIndex = 1000

			polyline.style.zIndex = 1001

			scene.add(polyline)

			startPoint = new CircleShape(startX, startY, 5)
			Object.assign(startPoint.style, pointStyles)
			startPoint.fixedRadius = true
			startPoint.style.zIndex = 1002
			scene.add(startPoint)

			endPoint = new CircleShape(startX, startY, 5)
			Object.assign(endPoint.style, pointStyles)
			endPoint.fixedRadius = true
			endPoint.style.zIndex = 1003
			scene.add(endPoint)
		} else {
			let finished = false

			if (event.target === startPoint) {
				console.log('drawPolyline: click on startPoint')
				polyline!.closed = true
				finished = true
			}

			if (event.target === endPoint) {
				console.log('drawPolyline: click on endPoint')
				finished = true
			}

			if (finished) {
				console.log('drawPolyline: finished')

				scene.remove(startPoint!)
				scene.remove(endPoint!)
				scene.remove(mask!)

				polyline!.style.zIndex = styles.zIndex

				startPoint = null
				endPoint = null
				mask = null

				inited = false

				if (polyline!.points.length) {
					onAdd?.({
						type: 'createPolyline',
						target: polyline!,
						currentTarget: scene,
					})
				} else {
					scene.remove(polyline!)
					console.log('drawPolyline: remove polyline')
				}

				polyline = null

				return
			} else {
				console.log('drawPolyline: add-point')

				const x = (e.offsetX - scene.translate.x) / scene.scale
				const y = (e.offsetY - scene.translate.y) / scene.scale

				polyline!.points.push({ x: x - polyline!.x, y: y - polyline!.y })

				endPoint!.x = x
				endPoint!.y = y
			}
		}
	}

	scene.addEventListener('pointerup', onClick)

	const onEsc = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			if (inited) {
				cancel()
			}
		}
	}
	document.addEventListener('keydown', onEsc)

	return function cancelDraw() {
		scene.removeEventListener('pointerup', onClick)
		document.removeEventListener('keydown', onEsc)
	}
}
