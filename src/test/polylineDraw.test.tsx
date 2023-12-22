import { useEffect, useRef } from 'react'

import { useSize2 } from '../demo/hooks'
import { Scene } from '../lib/core'
import { drawPolyline } from '../lib/draw/drawPolyline'
import { editPolyline } from '../lib/edit/editPolyline'
import { addAxis, autoFPS, scenePointerControl } from '../lib/extra'
import { randomColor } from '../lib/utils/misc'
import Info from './Info'

import styles from './Test.module.css'

/**
 * @test_name 折线绘制
 * @test_category drawer
 */
export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		console.log(scene)

		scenePointerControl(scene)
		addAxis(scene)
		autoFPS(scene, 5)

		let cancelEdit: () => void

		const cancel = drawPolyline(
			scene,
			(e) => {
				const polyline = e.target

				polyline.styles.strokeStyle = randomColor()
				polyline.styles.lineWidth = 10
				polyline.styles.lineCap = 'round'
				polyline.styles.lineJoin = 'round'

				polyline.hoverStyles.strokeStyle = 'red'

				cancelEdit = editPolyline(polyline)
			},
			{},
			{ fillStyle: 'green' }
		)

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
					<div style={{ fontSize: '1.1em', fontWeight: '500' }}> 🖌️ 绘制折线：</div>
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
