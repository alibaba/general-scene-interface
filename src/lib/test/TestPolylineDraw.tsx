import { useEffect, useRef } from 'react'

import { useSize2 } from '../../utils/hooks'
import { randomColor } from '../../utils/misc'
import { Scene } from '../core'
import { drawPolyline } from '../draw/drawPolyline'
import { editPolyline } from '../edit/editPolyline'
import { addAxis, scenePointerControl } from '../extra'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		console.log(scene)

		scenePointerControl(scene)
		addAxis(scene)

		const cancel = drawPolyline(
			scene,
			(e) => {
				const polyline = e.target

				polyline.styles.strokeStyle = randomColor()
				polyline.styles.lineWidth = 10
				polyline.styles.lineCap = 'round'
				polyline.styles.lineJoin = 'round'

				polyline.hoverStyles.strokeStyle = 'red'

				const controlPoints = editPolyline(polyline)
				scene.add(controlPoints)
			},
			{},
			{ fillStyle: 'green' }
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
				<div>
					绘制：空白区域左键开始绘制；点击尾部点结束绘制；点击头部点结束绘制并设为闭合图形；meta+点击边可添加顶点；meta点击顶点可删除顶点（头部点不可删除）；左键拖动图形
				</div>
				<div>画布：滚轮缩放；右键平移</div>
			</footer>
		</div>
	)
}
