import { draggable } from '../extra'
import { PolygonShape, PolylineShape } from '../shapes'
import type { CanvasStyles, ExtendedCanvasStyles } from '../styles'
import { editPolyline } from './editPolyline'

type BeforePolygonEditEvent = {
	type: 'beforePolygonEdit'
	target: PolygonShape
	currentTarget: PolygonShape
}

type PolygonEditEvent = {
	type: 'polygonEdit'
	target: PolygonShape
	currentTarget: PolygonShape
}

/**
 * 生成两个控制点，编辑线段
 */
export function editPolygon(
	polygon: PolygonShape,
	onBeforeEdit?: (e: BeforePolygonEditEvent) => void,
	onEdit?: (e: PolygonEditEvent) => void,
	// control point styles
	pointRadius = 10,
	pointStyles: Partial<ExtendedCanvasStyles> = {},
	pointHoverStyles: Partial<CanvasStyles> = {},
	pointActiveStyles: Partial<CanvasStyles> = {}
): () => void {
	const PolygonEditEvent = Object.freeze({
		type: 'polygonEdit',
		target: polygon,
		currentTarget: polygon,
	} as const)

	const shadowPolyline = new PolylineShape()
	// shadowPolyline.styles.zIndex = 10
	shadowPolyline.styles.lineWidth = 5
	shadowPolyline.styles.lineDash = [10, 10]
	shadowPolyline.styles.lineJoin = 'bevel'
	shadowPolyline.styles.strokeOpacity = 0.5
	shadowPolyline.closed = true
	shadowPolyline.points = polygon.points

	polygon.add(shadowPolyline)

	const onChange = () => {
		const event = {
			type: 'beforePolygonEdit',
			target: polygon,
			currentTarget: polygon,
		} as const

		onBeforeEdit?.(event)

		onEdit?.(PolygonEditEvent)
	}

	const cancel = editPolyline(
		shadowPolyline,
		undefined,
		onChange,
		pointRadius,
		pointStyles,
		pointHoverStyles,
		pointActiveStyles,
		true
	)

	draggable(polygon, undefined, onChange)

	polygon.userData.__controllers = [shadowPolyline, shadowPolyline.children]

	const c = () => {
		cancel()
		polygon.remove(shadowPolyline)
		polygon.userData.__controllers = []
	}

	polygon.userData.__cancelEdit = c

	return c
}
