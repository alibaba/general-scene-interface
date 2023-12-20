export type CanvasStyles = CanvasFillStrokeStyles &
	CanvasPathDrawingStyles &
	CanvasShadowStyles &
	CanvasTextDrawingStyles &
	CanvasCompositing & {
		fill: boolean
		stroke: boolean
		cursor: string

		/**
		 * 使用 fillOpacity 和 strokeOpacity 代替
		 */
		globalAlpha: never
	}

export type ExtendedCanvasStyles = CanvasStyles & {
	zIndex: number
	pointerEvents: 'none' | 'auto'
	fillOpacity: number
	strokeOpacity: number
	lineDash: number[]
}

export function getAssignableStyles(styles: Partial<ExtendedCanvasStyles>): Partial<CanvasStyles> {
	const s = { ...styles }
	delete s.fill
	delete s.stroke
	delete s.cursor
	delete s.zIndex
	delete s.pointerEvents
	delete s.fillOpacity
	delete s.strokeOpacity
	delete s.lineDash

	return s
}
