import { Scene } from '../core'
import type { PointerEvents } from '../events'
import { CircleShape } from '../shapes'
import type { ExtendedCanvasStyles } from '../styles'

type PointCreationEvent = {
	type: 'pointCreation'
	target: CircleShape
	currentTarget: Scene
}

/**
 * 鼠标在空白处按下时，绘制一个点（圆形），鼠标移动时改变点位置，鼠标松开时结束绘制
 * @return 取消监听函数
 */

export function drawPoint(
	scene: Scene,
	onAdd?: (e: PointCreationEvent) => void,
	radius = 5,
	styles: Partial<ExtendedCanvasStyles> = {}
) {
	const handlePointerDown = (event: PointerEvents['pointerdown']) => {
		const e = event.srcEvent

		if (event.target !== event.currentTarget) return
		if (e.button !== 0) return

		const { left, top } = scene.canvas.getBoundingClientRect() || { left: 0, top: 0 }

		const x = (e.clientX - left - scene.translate.x) / scene.scale
		const y = (e.clientY - top - scene.translate.y) / scene.scale

		const startX = x
		const startY = y

		const point = new CircleShape()

		point.x = startX
		point.y = startY
		point.radius = radius
		point.fixedRadius = true // 圆形变为点
		Object.assign(point.styles, styles)

		scene.add(point)

		const handlePointerMove = (event: PointerEvents['pointermove']) => {
			const e = event.srcEvent

			const x = (e.clientX - left - scene.translate.x) / scene.scale
			const y = (e.clientY - top - scene.translate.y) / scene.scale

			point.x = x
			point.y = y
		}

		const handlePointerUp = (event: PointerEvents['pointerup']) => {
			scene.removeEventListener('pointermove', handlePointerMove)
			scene.removeEventListener('pointerup', handlePointerUp)

			onAdd?.({
				type: 'pointCreation',
				target: point,
				currentTarget: scene,
			})
		}

		scene.addEventListener('pointermove', handlePointerMove)
		scene.addEventListener('pointerup', handlePointerUp)
	}

	scene.addEventListener('pointerdown', handlePointerDown)

	return function cancelDraw() {
		scene.removeEventListener('pointerdown', handlePointerDown)
	}
}
