import { useEffect, useRef } from 'react'

import { useSize2 } from '../demo/hooks'
import { Scene } from '../lib/core'
import { drawPoint } from '../lib/draw/drawPoint'
import { addAxis, autoFPS, draggable, scenePointerControl } from '../lib/extra'
import { randomColor } from '../lib/utils/misc'
import Info from './Info'

import styles from './Test.module.css'

/**
 * @test_name 点绘制
 * @test_category drawer
 */
export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)
		autoFPS(scene, 5)

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

				<Info>
					<div style={{ fontSize: '1.1em', fontWeight: '500' }}> 📷 画布：</div>
					<ul>
						<li>右键拖动，滚轮缩放</li>
					</ul>
					<div style={{ fontSize: '1.1em', fontWeight: '500' }}> 🖌️ 绘制点：</div>
					<ul>
						<li>点击空白处增加点</li>
						<li>拖动点可改变位置</li>
					</ul>
				</Info>
			</main>
		</div>
	)
}
