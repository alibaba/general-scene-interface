import { draggable } from '../extra'
import { CircleShape, RectShape } from '../shapes'
import type { CanvasStyles, ExtendedCanvasStyles } from '../styles'
import { fixRect } from '../utils/misc'

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
): () => void {
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

		fixRect(rect)

		onBeforeEdit?.(event)
		onEdit?.(rectEditEvent)
	}

	const ltPoint = new CircleShape(0, 0, pointRadius)
	ltPoint.fixedRadius = true

	// ltPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(ltPoint.style, pointStyles)
	Object.assign(ltPoint.hoverStyle, pointHoverStyles)
	Object.assign(ltPoint.activeStyle, pointActiveStyles)

	draggable(
		ltPoint,
		(e) => {
			rect.x += e.dx
			rect.y += e.dy

			rect.width -= e.dx
			rect.height -= e.dy

			e.x = 0
			e.y = 0
		},
		onChange
	)

	const rtPoint = new CircleShape(rect.width, 0, pointRadius)
	rtPoint.fixedRadius = true

	rtPoint.style.zIndex = rect.style.zIndex
	Object.assign(rtPoint.style, pointStyles)
	Object.assign(rtPoint.hoverStyle, pointHoverStyles)
	Object.assign(rtPoint.activeStyle, pointActiveStyles)

	draggable(
		rtPoint,
		(e) => {
			rect.width += e.dx
			rect.height -= e.dy

			rect.y += e.dy

			e.y = 0
		},
		onChange
	)

	const lbPoint = new CircleShape(0, rect.height, pointRadius)
	lbPoint.fixedRadius = true

	lbPoint.style.zIndex = rect.style.zIndex
	Object.assign(lbPoint.style, pointStyles)
	Object.assign(lbPoint.hoverStyle, pointHoverStyles)
	Object.assign(lbPoint.activeStyle, pointActiveStyles)

	draggable(
		lbPoint,
		(e) => {
			rect.width -= e.dx
			rect.height += e.dy

			rect.x += e.dx

			e.x = 0
		},
		onChange
	)

	const rbPoint = new CircleShape(rect.width, rect.height, pointRadius)
	rbPoint.fixedRadius = true

	rbPoint.style.zIndex = rect.style.zIndex
	Object.assign(rbPoint.style, pointStyles)
	Object.assign(rbPoint.hoverStyle, pointHoverStyles)
	Object.assign(rbPoint.activeStyle, pointActiveStyles)

	draggable(
		rbPoint,
		(e) => {
			rect.width += e.dx
			rect.height += e.dy
		},
		onChange
	)

	const cancelDrag = draggable(rect, undefined, onChange)

	const onBeforeRender = () => {
		ltPoint.x = 0
		ltPoint.y = 0

		rtPoint.x = rect.width
		rtPoint.y = 0

		lbPoint.x = 0
		lbPoint.y = rect.height

		rbPoint.x = rect.width
		rbPoint.y = rect.height
	}

	rect.addEventListener('beforeRender', onBeforeRender)

	rect.add([ltPoint, rtPoint, lbPoint, rbPoint])

	rect.userData.__controllers = [ltPoint, rtPoint, lbPoint, rbPoint]

	const cancel = () => {
		rect.remove([ltPoint, rtPoint, lbPoint, rbPoint])
		rect.removeEventListener('beforeRender', onBeforeRender)
		cancelDrag()

		rect.userData.__controllers = []
	}

	rect.userData.__cancelEdit = cancel

	return cancel
}
