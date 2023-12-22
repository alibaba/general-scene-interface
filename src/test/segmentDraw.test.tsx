import { useEffect, useRef } from 'react'

import { useSize2 } from '../demo/hooks'
import { Scene } from '../lib/core'
import { drawSegment } from '../lib/draw/drawSegment'
import { editSegment } from '../lib/edit/editSegment'
import { addAxis, autoFPS, scenePointerControl } from '../lib/extra'
import { randomColor } from '../lib/utils/misc'
import Info from './Info'

import styles from './Test.module.css'

/**
 * @test_name 线段绘制
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

		let cancelEdit = () => {}
		const cancel = drawSegment(scene, (e) => {
			const seg = e.target

			seg.style.lineCap = 'round'
			seg.style.lineWidth = 20
			seg.style.strokeStyle = randomColor()

			cancelEdit = editSegment(seg)
		})

		return () => {
			cancel()
			cancelEdit()
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
					<div style={{ fontSize: '1.1em', fontWeight: '500' }}> 🖌️ 绘制线段：</div>
					<ul>
						<li>点击空白处并拖动，增加线段</li>
						<li>拖动边或顶点，调整线段</li>
					</ul>
				</Info>
			</main>
		</div>
	)
}
