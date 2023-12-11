import { useEffect, useRef } from 'react'

import { RectShape } from '..'
import { useSize2 } from '../../demo/hooks'
import { Scene } from '../core'
import { drawRect } from '../draw/drawRect'
import { editRect } from '../edit/editRect'
import { addAxis, scenePointerControl } from '../extra'
import { constrainRect, randomColor } from '../utils/misc'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)

		const cancel = drawRect(scene, (e) => {
			constrainRect(e.target, [100, 100, 700, 500])

			const rect = e.target

			const controlPoints = editRect(
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

			scene.add(controlPoints)
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
				<div>绘制：空白区域按下左键开始绘制；松开左键结束绘制；左键拖动图形</div>
				<div>画布：滚轮缩放；右键平移</div>
			</footer>
		</div>
	)
}
