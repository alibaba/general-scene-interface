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

	const ltX = rect.x - rect.width / 2
	const ltY = rect.y - rect.height / 2

	const ltPoint = new CircleShape(ltX, ltY, pointRadius)
	ltPoint.fixedRadius = true

	// ltPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(ltPoint.styles, pointStyles)
	Object.assign(ltPoint.hoverStyles, pointHoverStyles)
	Object.assign(ltPoint.activeStyles, pointActiveStyles)

	draggable(
		ltPoint,
		(e) => {
			const r = rect.x + rect.width / 2
			const b = rect.y + rect.height / 2

			rect.width = r - e.x
			rect.height = b - e.y

			rect.x = r - rect.width / 2
			rect.y = b - rect.height / 2
		},
		onChange
	)

	const rtX = rect.x + rect.width / 2
	const rtY = rect.y - rect.height / 2

	const rtPoint = new CircleShape(rtX, rtY, pointRadius)
	rtPoint.fixedRadius = true

	rtPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(rtPoint.styles, pointStyles)
	Object.assign(rtPoint.hoverStyles, pointHoverStyles)
	Object.assign(rtPoint.activeStyles, pointActiveStyles)

	draggable(
		rtPoint,
		(e) => {
			const l = rect.x - rect.width / 2
			const b = rect.y + rect.height / 2

			rect.width = e.x - l
			rect.height = b - e.y

			rect.x = l + rect.width / 2
			rect.y = b - rect.height / 2
		},
		onChange
	)

	const lbX = rect.x - rect.width / 2
	const lbY = rect.y + rect.height / 2

	const lbPoint = new CircleShape(lbX, lbY, pointRadius)
	lbPoint.fixedRadius = true

	lbPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(lbPoint.styles, pointStyles)
	Object.assign(lbPoint.hoverStyles, pointHoverStyles)
	Object.assign(lbPoint.activeStyles, pointActiveStyles)

	draggable(
		lbPoint,
		(e) => {
			const r = rect.x + rect.width / 2
			const t = rect.y - rect.height / 2

			rect.width = r - e.x
			rect.height = e.y - t

			rect.x = r - rect.width / 2
			rect.y = t + rect.height / 2
		},
		onChange
	)

	const rbX = rect.x + rect.width / 2
	const rbY = rect.y + rect.height / 2

	const rbPoint = new CircleShape(rbX, rbY, pointRadius)
	rbPoint.fixedRadius = true

	rbPoint.styles.zIndex = rect.styles.zIndex
	Object.assign(rbPoint.styles, pointStyles)
	Object.assign(rbPoint.hoverStyles, pointHoverStyles)
	Object.assign(rbPoint.activeStyles, pointActiveStyles)

	draggable(
		rbPoint,
		(e) => {
			const l = rect.x - rect.width / 2
			const t = rect.y - rect.height / 2

			rect.width = e.x - l
			rect.height = e.y - t

			rect.x = l + rect.width / 2
			rect.y = t + rect.height / 2
		},
		onChange
	)

	draggable(rect, undefined, onChange)

	rect.addEventListener('beforeDraw', (e) => {
		ltPoint.x = rect.x - rect.width / 2
		ltPoint.y = rect.y - rect.height / 2

		rtPoint.x = rect.x + rect.width / 2
		rtPoint.y = rect.y - rect.height / 2

		lbPoint.x = rect.x - rect.width / 2
		lbPoint.y = rect.y + rect.height / 2

		rbPoint.x = rect.x + rect.width / 2
		rbPoint.y = rect.y + rect.height / 2
	})

	return new ShapeGroup([ltPoint, rtPoint, lbPoint, rbPoint])
}
