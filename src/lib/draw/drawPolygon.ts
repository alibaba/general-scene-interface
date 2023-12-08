import { Scene } from '../core'
import { PolygonShape } from '../shapes'
import type { ExtendedCanvasStyles } from '../styles'
import { drawPolyline } from './drawPolyline'

type PolygonCreationEvent = {
	type: 'createPolygon'
	target: PolygonShape
	currentTarget: Scene
}

/**
 * @return 取消监听函数
 */
export function drawPolygon(
	scene: Scene,
	onAdd?: (e: PolygonCreationEvent) => void,
	styles: Partial<ExtendedCanvasStyles> = {},
	pointStyles: Partial<ExtendedCanvasStyles> = {}
) {
	const cancel = drawPolyline(
		scene,
		(e) => {
			scene.remove(e.target)

			if (e.target.points.length < 2) return

			const polygon = new PolygonShape()
			polygon.points = e.target.points
			polygon.x = e.target.x
			polygon.y = e.target.y
			Object.assign(polygon.styles, styles)
			scene.add(polygon)

			onAdd?.({
				type: 'createPolygon',
				target: polygon,
				currentTarget: scene,
			})
		},
		styles,
		pointStyles
	)

	return cancel
}
