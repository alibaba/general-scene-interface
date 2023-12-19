import { useEffect, useRef } from 'react'

import { RectShape, autoFPS } from '..'
import { useSize2 } from '../../demo/hooks'
import { Scene } from '../core'
import { drawRect } from '../draw/drawRect'
import { editRect } from '../edit/editRect'
import { addAxis, scenePointerControl } from '../extra'
import { constrainRect, randomColor } from '../utils/misc'
import Info from './Info'

import styles from './Test.module.css'

/**
 * @test_name 限制区域矩形绘制
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

		let cancelEdit = () => {}
		const cancel = drawRect(scene, (e) => {
			constrainRect(e.target, [100, 100, 700, 500])

			const rect = e.target

			cancelEdit = editRect(
				rect,
				(e) => {
					constrainRect(e.target, [100, 100, 700, 500])
				},
				undefined,
				5,
				{
					stroke: true,
					strokeStyle: 'white',
				}
			)

			const seed = Math.random()

			rect.styles.fillStyle = randomColor(0.5, seed)
			rect.styles.stroke = true
			rect.styles.lineWidth = 4

			rect.hoverStyles.fillStyle = randomColor(1, seed)

			rect.activeStyles.strokeStyle = 'red'
		})

		// constrain area
		{
			const rect = new RectShape()
			rect.styles.zIndex = -1
			rect.styles.fillStyle = 'rgba(0, 0, 0, 0.1)'
			rect.styles.pointerEvents = 'none'
			rect.x = 100
			rect.y = 100
			rect.width = 600
			rect.height = 400
			scene.add(rect)
		}

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
