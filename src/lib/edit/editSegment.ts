import { ShapeGroup } from '../core'
import { draggable } from '../extra'
import { CircleShape, SegmentShape } from '../shapes'
import type { CanvasStyles, ExtendedCanvasStyles } from '../styles'

type BeforeSegmentEditEvent = {
	type: 'beforeSegmentEdit'
	target: SegmentShape
	currentTarget: SegmentShape
}

type SegmentEditEvent = {
	type: 'segmentEdit'
	target: SegmentShape
	currentTarget: SegmentShape
}

/**
 * 生成两个控制点，编辑线段
 */
export function editSegment(
	segment: SegmentShape,
	onBeforeEdit?: (e: BeforeSegmentEditEvent) => void,
	onEdit?: (e: SegmentEditEvent) => void,
	// control point styles
	pointRadius = 10,
	pointStyles: Partial<ExtendedCanvasStyles> = {},
	pointHoverStyles: Partial<CanvasStyles> = {},
	pointActiveStyles: Partial<CanvasStyles> = {}
): ShapeGroup<CircleShape> {
	const segmentEditEvent = Object.freeze({
		type: 'segmentEdit',
		target: segment,
		currentTarget: segment,
	} as const)
	const onChange = () => {
		const event = {
			type: 'beforeSegmentEdit',
			target: segment,
			currentTarget: segment,
		} as const

		onBeforeEdit?.(event)
		onEdit?.(segmentEditEvent)
	}

	const x = segment.x
	const y = segment.y

	const dx = segment.dx
	const dy = segment.dy

	const startPoint = new CircleShape(x, y, pointRadius)
	startPoint.fixedRadius = true
	startPoint.radius = pointRadius
	Object.assign(startPoint.styles, pointStyles)
	Object.assign(startPoint.hoverStyles, pointHoverStyles)
	Object.assign(startPoint.activeStyles, pointActiveStyles)

	const endPoint = new CircleShape(x + dx, y + dy, pointRadius)
	endPoint.fixedRadius = true
	endPoint.radius = pointRadius
	Object.assign(endPoint.styles, pointStyles)
	Object.assign(endPoint.hoverStyles, pointHoverStyles)
	Object.assign(endPoint.activeStyles, pointActiveStyles)

	draggable(
		startPoint,
		(e) => {
			segment.dx -= e.x - segment.x
			segment.dy -= e.y - segment.y

			segment.x = e.x
			segment.y = e.y
		},
		onChange
	)

	draggable(
		endPoint,
		(e) => {
			segment.dx = e.x - segment.x
			segment.dy = e.y - segment.y
		},
		onChange
	)

	draggable(segment, undefined, onChange)

	segment.addEventListener('beforeDraw', (e) => {
		startPoint.x = segment.x
		startPoint.y = segment.y

		endPoint.x = segment.x + segment.dx
		endPoint.y = segment.y + segment.dy
	})

	return new ShapeGroup([startPoint, endPoint])
}
