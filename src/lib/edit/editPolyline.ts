import { Shape } from '../core'
import { draggable } from '../extra'
import { CircleShape, PolylineShape } from '../shapes'
import type { CanvasStyles, ExtendedCanvasStyles } from '../styles'

export type BeforePolylineEditEvent = {
	type: 'beforePolylineEdit'
	target: PolylineShape
	currentTarget: PolylineShape
}

export type PolylineEditEvent = {
	type: 'polylineEdit'
	target: PolylineShape
	currentTarget: PolylineShape
}

/**
 * 生成两个控制点，编辑线段
 * @return 取消函数
 */
export function editPolyline(
	polyline: PolylineShape,
	onBeforeEdit?: (e: BeforePolylineEditEvent) => void,
	onEdit?: (e: PolylineEditEvent) => void,
	// control point styles
	pointRadius = 10,
	pointStyles: Partial<ExtendedCanvasStyles> = {},
	pointHoverStyles: Partial<CanvasStyles> = {},
	pointActiveStyles: Partial<CanvasStyles> = {},
	disableDrag?: boolean
): () => void {
	const PolylineEditEvent = Object.freeze({
		type: 'polylineEdit',
		target: polyline,
		currentTarget: polyline,
	} as const)

	const onChange = () => {
		const event = {
			type: 'beforePolylineEdit',
			target: polyline,
			currentTarget: polyline,
		} as const

		onBeforeEdit?.(event)
		onEdit?.(PolylineEditEvent)
	}

	const controlPoints = new Shape()

	const controlPointsMap = new WeakMap<{ x: number; y: number }, CircleShape>()

	polyline.points.map((point) => {
		const controlPoint = new CircleShape(point.x, point.y, pointRadius)
		controlPoint.fixedRadius = true
		controlPoint.radius = pointRadius
		// controlPoint.styles.zIndex = polyline.styles.zIndex ?? 0 + 1
		Object.assign(controlPoint.styles, pointStyles)
		Object.assign(controlPoint.hoverStyles, pointHoverStyles)
		Object.assign(controlPoint.activeStyles, pointActiveStyles)

		controlPointsMap.set(point, controlPoint)

		draggable(
			controlPoint,
			(e) => {
				point.x = e.x
				point.y = e.y
			},
			onChange
		)

		controlPoints.add(controlPoint)

		// 删除点
		controlPoint.addEventListener('pointerdown', (e) => {
			if (e.srcEvent.ctrlKey || e.srcEvent.metaKey) {
				const index = polyline.points.indexOf(point)
				polyline.points.splice(index, 1)
				controlPoints.remove(controlPoint)
				controlPointsMap.delete(point)
				onChange()
			}
		})
	})

	// 	新增点
	const onPointerDown = (e: any) => {
		if (e.srcEvent.ctrlKey || e.srcEvent.metaKey) {
			const hitResult = e.hitResult

			if (!hitResult) return

			e.srcEvent.preventDefault()
			e.srcEvent.stopPropagation()

			const t = hitResult.t as number
			const index = hitResult.index as number

			const lastPoint = polyline.points[index - 1] || { x: 0, y: 0 }
			const nextPoint = polyline.points[index] || { x: 0, y: 0 }

			const newPoint = {
				x: lastPoint.x + (nextPoint?.x - lastPoint.x) * t,
				y: lastPoint.y + (nextPoint?.y - lastPoint.y) * t,
			}

			polyline.points.splice(index, 0, newPoint)

			const controlPoint = new CircleShape(newPoint.x, newPoint.y, pointRadius)
			controlPoint.fixedRadius = true
			controlPoint.radius = pointRadius
			Object.assign(controlPoint.styles, pointStyles)
			Object.assign(controlPoint.hoverStyles, pointHoverStyles)
			Object.assign(controlPoint.activeStyles, pointActiveStyles)

			controlPointsMap.set(newPoint, controlPoint)

			draggable(
				controlPoint,
				(e) => {
					newPoint.x = e.x - polyline.x
					newPoint.y = e.y - polyline.y
				},
				onChange
			)

			controlPoints.add(controlPoint)

			// 删除点
			controlPoint.addEventListener('pointerdown', (e) => {
				if (e.srcEvent.ctrlKey || e.srcEvent.metaKey) {
					const index = polyline.points.indexOf(newPoint)
					polyline.points.splice(index, 1)
					controlPoints.remove(controlPoint)
					controlPointsMap.delete(newPoint)
					onChange()
				}
			})
		}
	}

	polyline.addEventListener('pointerdown', onPointerDown)

	// 对线的整体拖动
	const cancelDrag = disableDrag ? () => {} : draggable(polyline, undefined, onChange)

	const onBeforeRender = (e: any) => {
		polyline.points.forEach((point) => {
			const controlPoint = controlPointsMap.get(point)!

			controlPoint.x = point.x
			controlPoint.y = point.y
		})
	}
	polyline.addEventListener('beforeRender', onBeforeRender)

	polyline.add(controlPoints)

	polyline.userData.__controllers = controlPoints

	const cancel = () => {
		cancelDrag()
		polyline.removeEventListener('pointerdown', onPointerDown)
		polyline.removeEventListener('beforeRender', onBeforeRender)
		polyline.remove(controlPoints)

		polyline.userData.__controllers = []
	}

	polyline.userData.__cancelEdit = cancel

	return cancel
}
