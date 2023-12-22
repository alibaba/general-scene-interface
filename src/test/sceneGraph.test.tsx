import { useEffect, useRef } from 'react'

import { CircleShape, RectShape, SegmentShape, draggable, randomColor } from '..'
import { useSize2 } from '../demo/hooks'
import { Scene, Shape } from '../lib/core'
import { addAxis, scenePointerControl } from '../lib/extra'
import Info from './Info'

import styles from './Test.module.css'

/**
 * @test_name 场景树
 * @test_category shapes
 */
export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)
		// autoFPS(scene, 5)

		// root

		const root = new CircleShape()
		root.x = 100
		root.y = 30
		root.fixedRadius = true
		root.styles.zIndex = 10
		root.radius = 10
		root.styles.fillStyle = randomColor()
		draggable(root)

		// l1
		const l1 = new CircleShape()
		l1.fixedRadius = true
		l1.styles.zIndex = 9
		l1.radius = 10
		l1.styles.fillStyle = randomColor()
		l1.y = 50
		root.add(l1)
		draggable(l1)

		const seg01 = new SegmentShape()
		scene.addEventListener('beforeRender', () => {
			seg01.dx = l1.x
			seg01.dy = l1.y
		})
		root.add(seg01)

		for (let i = 1; i < 4; i++) {
			const l1 = new CircleShape()
			l1.fixedRadius = true
			l1.styles.zIndex = 8
			l1.radius = 10
			l1.styles.fillStyle = randomColor()
			l1.y = 50
			l1.x = i * 30
			root.add(l1)
			draggable(l1)

			const seg01 = new SegmentShape()
			scene.addEventListener('beforeRender', () => {
				seg01.dx = l1.x
				seg01.dy = l1.y
			})
			root.add(seg01)
		}

		// l2
		const l2 = new CircleShape()
		l2.fixedRadius = true
		l2.styles.zIndex = 7
		l2.radius = 10
		l2.styles.fillStyle = randomColor()
		l2.y = 50
		l1.add(l2)
		draggable(l2)

		const seg12 = new SegmentShape()
		scene.addEventListener('beforeRender', () => {
			seg12.dx = l2.x
			seg12.dy = l2.y
		})
		l1.add(seg12)

		for (let i = 1; i < 4; i++) {
			const l2 = new CircleShape()
			l2.fixedRadius = true
			l2.styles.zIndex = 6
			l2.radius = 10
			l2.styles.fillStyle = randomColor()
			l2.y = 50
			l2.x = i * 30
			l1.add(l2)
			draggable(l2)

			const seg12 = new SegmentShape()
			scene.addEventListener('beforeRender', () => {
				seg12.dx = l2.x
				seg12.dy = l2.y
			})
			l1.add(seg12)
		}

		const group = new Shape()
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

		l2.add(group)

		draggable(rect)
		draggable(point)

		group.scale = 2

		let id = 0
		const startTime = performance.now()
		const animate = () => {
			const time = performance.now()
			group.scale = Math.sin((time - startTime) * 0.005) * 0.5 + 1
			id = requestAnimationFrame(animate)
		}

		id = requestAnimationFrame(animate)

		scene.add(root)

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
