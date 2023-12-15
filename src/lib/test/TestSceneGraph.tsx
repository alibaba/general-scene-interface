import { useEffect, useRef } from 'react'

import { CircleShape, RectShape, draggable, draggableAnchor } from '..'
import { useSize2 } from '../../demo/hooks'
import { Scene, ShapeGroup } from '../core'
import { drawRect } from '../draw/drawRect'
import { editRect } from '../edit/editRect'
import { addAxis, autoFPS, scenePointerControl } from '../extra'
import { randomColor } from '../utils/misc'
import Info from './Info'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)
		// autoFPS(scene, 5)

		const group = new ShapeGroup()
		const rect = new RectShape(0, 0, 100, 200)
		const point = new CircleShape()
		point.fixedRadius = true
		point.styles.zIndex = 999
		point.radius = 10
		point.styles.fillStyle = 'blue'

		point.x = 50
		point.y = 100

		group.add(point)

		group.add(rect)

		const anchor = draggableAnchor(group)
		// draggable(rect)

		group.scale = 2

		let id = 0
		const startTime = performance.now()
		const animate = () => {
			const time = performance.now()
			group.scale = Math.sin((time - startTime) * 0.005) * 0.5 + 1
			id = requestAnimationFrame(animate)
		}

		// id = requestAnimationFrame(animate)

		scene.add(group)
		scene.add(anchor)

		return () => {
			scene.dispose()
			cancelAnimationFrame(id)
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
