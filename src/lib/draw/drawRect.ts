import { Scene } from '../core'
import type { PointerEvents } from '../events'
import { RectShape } from '../shapes'
import type { ExtendedCanvasStyles } from '../styles'

type RectCreationEvent = {
	type: 'rectCreation'
	target: RectShape
	currentTarget: Scene
}
/**
 * 鼠标在空白处按下时，绘制一个矩形，鼠标移动时改变矩形大小，鼠标松开时结束绘制
 * @return 取消监听函数
 */

export function drawRect(
	scene: Scene,
	onAdd?: (e: RectCreationEvent) => void,
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

		// console.log(x, y)
		const rect = new RectShape(0, 0, 0, 0)

		rect.x = startX
		rect.y = startY
		rect.width = 0
		rect.height = 0
		Object.assign(rect.styles, styles)

		scene.add(rect)

		const handlePointerMove = (event: PointerEvents['pointermove']) => {
			const e = event.srcEvent

			const x = (e.clientX - left - scene.translate.x) / scene.scale
			const y = (e.clientY - top - scene.translate.y) / scene.scale

			rect.width = x - startX
			rect.height = y - startY
		}

		const handlePointerUp = (event: PointerEvents['pointerup']) => {
			scene.removeEventListener('pointermove', handlePointerMove)
			scene.removeEventListener('pointerup', handlePointerUp)

			// 纠正方向
			if (rect.width < 0) rect.width = -rect.width
			if (rect.height < 0) rect.height = -rect.height

			if (rect.width === 0 || rect.height === 0) {
				scene.remove(rect)
				return
			}

			onAdd?.({
				type: 'rectCreation',
				target: rect,
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
