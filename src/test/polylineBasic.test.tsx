import { useEffect, useRef } from 'react'

import { useSize2 } from '../demo/hooks'
import { Scene } from '../lib/core'
import { addAxis, autoFPS, draggable, scenePointerControl } from '../lib/extra'
import { PolylineShape } from '../lib/shapes'
import { randomColor } from '../lib/utils/misc'

import styles from './Test.module.css'

/**
 * @test_name 折线
 * @test_category shapes
 */
export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)
		autoFPS(scene, 5)

		const polyline = new PolylineShape(200, 200, [
			{ x: 0, y: 0 },
			{ x: 10, y: 100 },
			{ x: 100, y: 10 },
			{ x: 100, y: 100 },
		])

		polyline.style.strokeStyle = randomColor()
		polyline.style.lineWidth = 10
		polyline.style.lineCap = 'round'
		polyline.style.lineJoin = 'round'

		polyline.hoverStyle.strokeStyle = 'red'
		polyline.hoverStyle.lineWidth = 12

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
