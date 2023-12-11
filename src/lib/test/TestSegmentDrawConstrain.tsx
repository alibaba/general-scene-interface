import { useEffect, useRef } from 'react'

import { useSize2 } from '../../demo/hooks'
import { Scene } from '../core'
import { drawSegment } from '../draw/drawSegment'
import { editSegment } from '../edit/editSegment'
import { addAxis, scenePointerControl } from '../extra'
import { RectShape } from '../shapes'
import { constrainSegment, minmax, randomColor } from '../utils/misc'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)

		const cancel = drawSegment(scene, (e) => {
			constrainSegment(e.target, [100, 100, 1000, 500])

			const seg = e.target

			seg.styles.lineCap = 'round'
			seg.styles.lineWidth = 20
			seg.styles.strokeStyle = randomColor()

			const controlPoints = editSegment(seg, (e) => {
				constrainSegment(e.target, [100, 100, 1000, 500])
			})

			scene.add(controlPoints)
		})

		const rect = new RectShape()
		rect.styles.zIndex = -1
		rect.styles.fillStyle = 'rgba(0, 0, 0, 0.1)'
		rect.styles.pointerEvents = 'none'
		rect.x = 100
		rect.y = 100
		rect.width = 900
		rect.height = 400
		scene.add(rect)

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
