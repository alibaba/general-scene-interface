import { useEffect, useRef } from 'react'

import { useSize2 } from '../../demo/hooks'
import { Scene } from '../core'
import { drawPolygon } from '../draw/drawPolygon'
import { editPolygon } from '../edit/editPolygon'
import { addAxis, autoFPS, scenePointerControl } from '../extra'
import { RectShape } from '../shapes'
import { constrainPoly, randomColor } from '../utils/misc'
import Info from './Info'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)
		autoFPS(scene, 5)

		const cancel = drawPolygon(
			scene,
			(e) => {
				constrainPoly(e.target, [100, 100, 700, 500])

				const polygon = e.target

				polygon.styles.fillStyle = randomColor(0.5)
				polygon.styles.lineWidth = 10
				polygon.styles.lineCap = 'round'
				polygon.styles.lineJoin = 'round'

				polygon.hoverStyles.strokeStyle = 'red'

				const controlPoints = editPolygon(polygon, (e) => {
					constrainPoly(e.target, [100, 100, 700, 500])
				})
				scene.add(controlPoints)
			},
			{},
			{ fillStyle: 'green' }
		)

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

				<Info>
					<div style={{ fontSize: '1.1em', fontWeight: '500' }}> 📷 画布：</div>
					<ul>
						<li>右键拖动，滚轮缩放</li>
					</ul>
					<div style={{ fontSize: '1.1em', fontWeight: '500' }}> 🖌️ 绘制多边形：</div>
					<ul>
						<li>开始绘制：点击空白处</li>
						<li>结束绘制：点击尾点结束绘制，或者点击首点结束绘制并标记闭合</li>
						<li>修改位置：拖动任意边</li>
						<li>修改形状：拖动顶点</li>
						<li>添加顶点：按住 meta 或 Ctrl 键，点击边</li>
						<li>删除顶点：按住 meta 或 Ctrl 键，点击顶点</li>
					</ul>
				</Info>
			</main>
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
