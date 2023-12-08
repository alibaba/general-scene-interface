import { useEffect, useRef } from 'react'

import { useSize2 } from '../../utils/hooks'
import { constrainPolyline, randomColor } from '../../utils/misc'
import { Scene } from '../core'
import { drawPolygon } from '../draw/drawPolygon'
import { editPolygon } from '../edit/editPolygon'
import { addAxis, scenePointerControl } from '../extra'
import { RectShape } from '../shapes'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)

		const cancel = drawPolygon(
			scene,
			(e) => {
				const polygon = e.target

				polygon.styles.fillStyle = randomColor(0.5)
				polygon.styles.lineWidth = 10
				polygon.styles.lineCap = 'round'
				polygon.styles.lineJoin = 'round'

				polygon.hoverStyles.strokeStyle = 'red'

				const controlPoints = editPolygon(polygon, (e) => {
					constrainPolyline(polygon, [100, 100, 900, 500])
				})
				scene.add(controlPoints)
			},
			{},
			{ fillStyle: 'green' }
		)

		const rect = new RectShape()
		rect.x = 500
		rect.y = 300
		rect.width = 800
		rect.height = 400
		rect.styles.fillStyle = 'rgba(0, 0, 0, 0.2)'
		rect.styles.pointerEvents = 'none'
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
				<div>
					绘制：空白区域左键开始绘制；点击头尾点结束绘制；meta+点击边可添加顶点；meta点击顶点可删除顶点（头部点不可删除）；左键拖动图形
				</div>
				<div>画布：滚轮缩放；右键平移</div>
			</footer>
		</div>
	)
}

const starRaw = [
	[0.95105651629515353, 0.3090169943749474],
	[0.22451398828979272, 0.3090169943749474],
	[-0.95105651629515353, 0.30901699437494751],
	[-0.36327126400268051, -0.11803398874989464],
	[0.58778525229247292, -0.80901699437494756],
	[0.36327126400268039, -0.11803398874989492],
	[0.0, 1.0],
	[-0.22451398828979263, 0.30901699437494745],
	[-0.58778525229247325, -0.80901699437494734],
	[0.0, -0.38196601125010515],
]

const starElement = [1, 2, 7, 8, 3, 4, 9, 10, 5, 6]

const star = starElement
	.map((e) => ({ x: starRaw[e - 1][0], y: starRaw[e - 1][1] }))
	.map((p) => ({ x: p.x * 100 + 200, y: p.y * 100 + 200 }))
