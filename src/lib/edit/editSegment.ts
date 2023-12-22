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
): () => void {
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

	const startPoint = new CircleShape(0, 0, pointRadius)
	startPoint.fixedRadius = true
	startPoint.radius = pointRadius
	Object.assign(startPoint.style, pointStyles)
	Object.assign(startPoint.hoverStyle, pointHoverStyles)
	Object.assign(startPoint.activeStyle, pointActiveStyles)

	const endPoint = new CircleShape(segment.dx, segment.dy, pointRadius)
	endPoint.fixedRadius = true
	endPoint.radius = pointRadius
	Object.assign(endPoint.style, pointStyles)
	Object.assign(endPoint.hoverStyle, pointHoverStyles)
	Object.assign(endPoint.activeStyle, pointActiveStyles)

	draggable(
		startPoint,
		(e) => {
			segment.dx -= e.dx
			segment.dy -= e.dy

			segment.x += e.dx
			segment.y += e.dy
		},
		onChange
	)

	draggable(
		endPoint,
		(e) => {
			segment.dx += e.dx
			segment.dy += e.dy
		},
		onChange
	)

	const cancelDrag = draggable(segment, undefined, onChange)

	const onBeforeRender = () => {
		startPoint.x = 0
		startPoint.y = 0

		endPoint.x = segment.dx
		endPoint.y = segment.dy
	}

	segment.addEventListener('beforeRender', onBeforeRender)

	segment.add([startPoint, endPoint])

	segment.userData.__controllers = [startPoint, endPoint]

	const cancel = () => {
		cancelDrag()
		segment.removeEventListener('beforeRender', onBeforeRender)
		segment.remove([startPoint, endPoint])

		segment.userData.__controllers = []
	}

	segment.userData.__cancelEdit = cancel

	return cancel
}
