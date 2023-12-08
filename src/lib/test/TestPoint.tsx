import { useEffect, useRef } from 'react'

import { useSize2 } from '../../utils/hooks'
import { randomColor } from '../../utils/misc'
import { Scene } from '../core'
import { drawPoint } from '../draw/drawPoint'
import { addAxis, draggable, scenePointerControl } from '../extra'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)

		const cancel = drawPoint(
			scene,
			(e) => {
				const point = e.target

				console.log(point)

				const seed = Math.random()
				point.styles.fillStyle = randomColor(0.5, seed)
				point.styles.strokeStyle = randomColor(1, seed)
				point.styles.lineWidth = 4
				point.styles.stroke = true

				point.radius = 10

				draggable(point)
			},
			10
		)

		return () => {
			cancel()
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
			<footer className={styles.footer}>
				🔔
				<div>绘制：空白区域左键加点；左键拖动图形</div>
				<div>画布：滚轮缩放；右键平移</div>
			</footer>
		</div>
	)
}
