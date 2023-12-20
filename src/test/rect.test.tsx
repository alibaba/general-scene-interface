import { useEffect, useRef } from 'react'

import { useSize2 } from '../demo/hooks'
import { Scene } from '../lib/core'
import { drawRect } from '../lib/draw/drawRect'
import { editRect } from '../lib/edit/editRect'
import { addAxis, autoFPS, scenePointerControl } from '../lib/extra'
import { randomColor } from '../lib/utils/misc'
import Info from './Info'

import styles from './Test.module.css'

/**
 * @test_name 矩形绘制
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

		let cancelEdit: () => void
		const cancel = drawRect(scene, (e) => {
			const rect = e.target

			cancelEdit = editRect(rect, undefined, undefined, 5, {
				stroke: true,
				strokeStyle: 'white',
			})

			const seed = Math.random()

			rect.styles.fillStyle = randomColor(0.5, seed)
			rect.styles.stroke = true
			rect.styles.lineWidth = 4

			rect.hoverStyles.fillStyle = randomColor(1, seed)

			rect.activeStyles.strokeStyle = 'red'
		})

		return () => {
			cancel()
			cancelEdit?.()
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
					<div style={{ fontSize: '1.1em', fontWeight: '500' }}> 🖌️ 绘制矩形：</div>
					<ul>
						<li>点击空白处并拖动，增加矩形</li>
						<li>拖动矩形或顶点，调整矩形</li>
					</ul>
				</Info>
			</main>
		</div>
	)
}
