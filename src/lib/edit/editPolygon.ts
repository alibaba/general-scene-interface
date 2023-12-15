import { ShapeGroup } from '../core'
import { draggable } from '../extra'
import { CircleShape, PolygonShape, PolylineShape } from '../shapes'
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
): ShapeGroup<PolylineShape | CircleShape> {
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
	shadowPolyline.x = polygon.x
	shadowPolyline.y = polygon.y

	polygon.addEventListener('beforeDraw', (e) => {
		polygon.x = shadowPolyline.x
		polygon.y = shadowPolyline.y
	})

	const onChange = () => {
		const event = {
			type: 'beforePolygonEdit',
			target: polygon,
			currentTarget: polygon,
		} as const

		onBeforeEdit?.(event)

		shadowPolyline.x = polygon.x
		shadowPolyline.y = polygon.y

		onEdit?.(PolygonEditEvent)
	}

	const controller = editPolyline(
		shadowPolyline,
		undefined,
		onChange,
		pointRadius,
		pointStyles,
		pointHoverStyles,
		pointActiveStyles
	) as ShapeGroup<PolylineShape | CircleShape>

	controller.add(shadowPolyline)
	controller.children.unshift(controller.children.pop() as PolylineShape)

	draggable(
		polygon,
		(e) => {
			shadowPolyline.x = e.x
			shadowPolyline.y = e.y
		},
		onChange
	)

	return controller
}
