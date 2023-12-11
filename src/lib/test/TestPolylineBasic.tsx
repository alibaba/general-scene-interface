import { useEffect, useRef } from 'react'

import { useSize2 } from '../../demo/hooks'
import { Scene } from '../core'
import { addAxis, draggable, scenePointerControl } from '../extra'
import { PolylineShape } from '../shapes'
import { randomColor } from '../utils/misc'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)

		const polyline = new PolylineShape(200, 200, [
			{ x: 0, y: 0 },
			{ x: 10, y: 100 },
			{ x: 100, y: 10 },
			{ x: 100, y: 100 },
		])

		polyline.styles.strokeStyle = randomColor()
		polyline.styles.lineWidth = 10
		polyline.styles.lineCap = 'round'
		polyline.styles.lineJoin = 'round'

		polyline.hoverStyles.strokeStyle = 'red'
		polyline.hoverStyles.lineWidth = 12

		draggable(polyline)
		scene.add(polyline)

		return () => {
			scene.dispose()
		}
	}, [])

	// 自适应宽高
	const mainRef = useRef<HTMLDivElement>(null!)
	const [width, height] = useSize2(mainRef)

	return (
		<div className={styles.wrapper}>
			<main className={styles.mainPaper} ref={mainRef}>
				<canvas ref={canvasRef} className={styles.canvas} width={width} height={height} />
			</main>
			<footer className={styles.footer}>🔔 滚轮缩放；右键平移</footer>
		</div>
	)
}
