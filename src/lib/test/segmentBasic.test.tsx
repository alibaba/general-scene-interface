import { useEffect, useRef } from 'react'

import { useSize2 } from '../../demo/hooks'
import { Scene } from '../core'
import { addAxis, autoFPS, draggable, scenePointerControl } from '../extra'
import { SegmentShape } from '../shapes'
import { randomColor } from '../utils/misc'

import styles from './Test.module.css'

/**
 * @test_name 线段
 * @test_category demo
 */
export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)
		autoFPS(scene, 5)

		{
			const seg = new SegmentShape(200, 200, -50, 0)
			seg.styles.strokeStyle = randomColor()
			seg.hoverStyles.strokeStyle = 'red'
			seg.styles.lineWidth = 10
			seg.hoverStyles.lineWidth = 12
			seg.styles.lineCap = 'round'
			draggable(seg)
			scene.add(seg)
		}
		{
			const seg = new SegmentShape(200, 200, 0, -50)
			seg.styles.strokeStyle = randomColor()
			seg.hoverStyles.strokeStyle = 'red'
			seg.styles.lineWidth = 10
			seg.hoverStyles.lineWidth = 12
			seg.styles.lineCap = 'round'
			draggable(seg)
			scene.add(seg)
		}
		{
			const seg = new SegmentShape(100, 100, 100, 100)
			seg.styles.strokeStyle = randomColor()
			seg.hoverStyles.strokeStyle = 'red'
			seg.styles.lineWidth = 10
			seg.hoverStyles.lineWidth = 12
			seg.styles.lineCap = 'round'
			draggable(seg)
			scene.add(seg)
		}

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
