import { ShapeGroup } from '../core'
import { draggable } from '../extra'
import { CircleShape, RectShape } from '../shapes'
import type { CanvasStyles, ExtendedCanvasStyles } from '../styles'

type BeforeRectEditEvent = {
	type: 'beforeRectEdit'
	target: RectShape
	currentTarget: RectShape
}
type RectEditEvent = {
	type: 'rectEdit'
	target: RectShape
	currentTarget: RectShape
}

/**
 * 生成四个角的编辑点，可以拖拽编辑矩形
 */
export function editRect(
	rect: RectShape,
	onBeforeEdit?: (e: BeforeRectEditEvent) => void,
	onEdit?: (e: RectEditEvent) => void,
	pointRadius = 10,
	pointStyles: Partial<ExtendedCanvasStyles> = {},
	pointHoverStyles: Partial<CanvasStyles> = {},
	pointActiveStyles: Partial<CanvasStyles> = {}
): ShapeGroup {
	const rectEditEvent = Object.freeze({
		type: 'rectEdit',
		target: rect,
		currentTarget: rect,
	} as const)
	const onChange = () => {
		const event = {
			type: 'beforeRectEdit',
			target: rect,
			currentTarget: rect,
		} as const

		onBeforeEdit?.(event)
		onEdit?.(rectEditEvent)
	}

	const ltPoint = new CircleShape(rect.x, rect.y, pointRadius)
	ltPoint.fixedRadius = true

	// ltPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(ltPoint.styles, pointStyles)
	Object.assign(ltPoint.hoverStyles, pointHoverStyles)
	Object.assign(ltPoint.activeStyles, pointActiveStyles)

	draggable(
		ltPoint,
		(e) => {
			rect.width += rect.x - e.x
			rect.height += rect.y - e.y

			rect.x = e.x
			rect.y = e.y
		},
		onChange
	)

	const rtPoint = new CircleShape(rect.x + rect.width, rect.y, pointRadius)
	rtPoint.fixedRadius = true

	rtPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(rtPoint.styles, pointStyles)
	Object.assign(rtPoint.hoverStyles, pointHoverStyles)
	Object.assign(rtPoint.activeStyles, pointActiveStyles)

	draggable(
		rtPoint,
		(e) => {
			rect.width = e.x - rect.x
			rect.height += rect.y - e.y

			rect.y = e.y
		},
		onChange
	)

	const lbPoint = new CircleShape(rect.x, rect.y + rect.height, pointRadius)
	lbPoint.fixedRadius = true

	lbPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(lbPoint.styles, pointStyles)
	Object.assign(lbPoint.hoverStyles, pointHoverStyles)
	Object.assign(lbPoint.activeStyles, pointActiveStyles)

	draggable(
		lbPoint,
		(e) => {
			rect.width += rect.x - e.x
			rect.height = e.y - rect.y

			rect.x = e.x
		},
		onChange
	)

	const rbPoint = new CircleShape(rect.x + rect.width, rect.y + rect.height, pointRadius)
	rbPoint.fixedRadius = true

	rbPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(rbPoint.styles, pointStyles)
	Object.assign(rbPoint.hoverStyles, pointHoverStyles)
	Object.assign(rbPoint.activeStyles, pointActiveStyles)

	draggable(
		rbPoint,
		(e) => {
			rect.width = e.x - rect.x
			rect.height = e.y - rect.y
		},
		onChange
	)

	draggable(rect, undefined, onChange)

	rect.addEventListener('beforeDraw', (e) => {
		ltPoint.x = rect.x
		ltPoint.y = rect.y

		rtPoint.x = rect.x + rect.width
		rtPoint.y = rect.y

		lbPoint.x = rect.x
		lbPoint.y = rect.y + rect.height

		rbPoint.x = rect.x + rect.width
		rbPoint.y = rect.y + rect.height
	})

	return new ShapeGroup([ltPoint, rtPoint, lbPoint, rbPoint])
}
