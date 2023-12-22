import { Scene } from '../core'
import type { PointerEvents } from '../events'
import { SegmentShape } from '../shapes'
import type { ExtendedCanvasStyles } from '../styles'

type SegmentCreationEvent = {
	type: 'createSegment'
	target: SegmentShape
	currentTarget: Scene
}

/**
 * 鼠标在空白处按下时，绘制一个矩形，鼠标移动时改变矩形大小，鼠标松开时结束绘制
 * @return 取消监听函数
 */

export function drawSegment(
	scene: Scene,
	onAdd?: (e: SegmentCreationEvent) => void,
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

		const segment = new SegmentShape(0, 0, 0, 0)

		segment.x = startX
		segment.y = startY
		Object.assign(segment.style, styles)

		scene.add(segment)

		const handlePointerMove = (event: PointerEvents['pointermove']) => {
			const e = event.srcEvent

			const x = (e.clientX - left - scene.translate.x) / scene.scale
			const y = (e.clientY - top - scene.translate.y) / scene.scale

			segment.dx = x - startX
			segment.dy = y - startY
		}

		const handlePointerUp = (event: PointerEvents['pointerup']) => {
			scene.removeEventListener('pointermove', handlePointerMove)
			scene.removeEventListener('pointerup', handlePointerUp)

			// 删除没有长度的
			if (segment.dx === 0 && segment.dy === 0) {
				scene.remove(segment)
				return
			}

			onAdd?.({
				type: 'createSegment',
				target: segment,
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
