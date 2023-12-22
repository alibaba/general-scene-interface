import { Shape } from '../core'
import { PathShape } from '../shapes'
import { ExtendedCanvasStyles } from '../styles'

export function parseSVG(svg: SVGElement, style?: Partial<ExtendedCanvasStyles>, scale = 1): Shape {
	const group = new Shape()

	for (const child of svg.children) {
		if (child instanceof SVGPathElement) {
			const shape = svgPathToPathShape(child, style, scale)
			group.add(shape)
		} else if (child instanceof SVGGElement) {
			const styles = svgStyleToCanvasStyle(child)

			const subGroup = parseSVG(child, styles, scale)
			group.add(subGroup)
		}
	}

	return group
}

function svgPathToPathShape(
	path: SVGPathElement,
	styles?: Partial<ExtendedCanvasStyles>,
	scale = 1
): PathShape {
	const m = document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGMatrix()
	const t = m.scale(scale, scale)

	const path2D = new Path2D()

	const d = path.getAttribute('d')
	if (d) path2D.addPath(new Path2D(d), t)

	const shape = new PathShape(path2D)

	Object.assign(shape.style, svgStyleToCanvasStyle(path, styles))

	return shape
}

function svgStyleToCanvasStyle(node: SVGElement, style?: Partial<ExtendedCanvasStyles>) {
	const canvasStyle: Partial<ExtendedCanvasStyles> = style || {
		fill: true,
		fillStyle: 'black',
		stroke: false,
	}

	const fill = node.getAttribute('fill') || node.style.fill
	if (fill === 'none') {
		canvasStyle.fill = false
	} else if (fill) {
		canvasStyle.fill = true
		canvasStyle.fillStyle = fill
	}

	const fillOpacity = node.getAttribute('fill-opacity') || node.style.fillOpacity
	if (fillOpacity) {
		canvasStyle.fillOpacity = parseFloat(fillOpacity)
	}

	const stroke = node.getAttribute('stroke') || node.style.stroke
	if (stroke && stroke !== 'none') {
		canvasStyle.stroke = true
		canvasStyle.strokeStyle = stroke
	}

	const strokeWidth = node.getAttribute('stroke-width') || node.style.strokeWidth
	if (strokeWidth) {
		canvasStyle.lineWidth = parseFloat(strokeWidth)
	}

	const strokeOpacity = node.getAttribute('stroke-opacity') || node.style.strokeOpacity
	if (strokeOpacity) {
		canvasStyle.strokeOpacity = parseFloat(strokeOpacity)
	}

	return canvasStyle
}
