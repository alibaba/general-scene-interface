import { useEffect, useRef } from 'react'

import { useSize2 } from '../../demo/hooks'
import { Scene } from '../core'
import { editPolygon } from '../edit/editPolygon'
import { addAxis, scenePointerControl } from '../extra'
import { PolygonShape } from '../shapes'
import { randomColor } from '../utils/misc'

import styles from './Test.module.css'

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)

		const polygon = new PolygonShape()

		polygon.x = star[0].x
		polygon.y = star[0].y
		polygon.points = star.map((p) => ({ x: p.x - polygon.x, y: p.y - polygon.y }))

		polygon.styles.fillStyle = randomColor(0.5)
		polygon.styles.stroke = true
		polygon.styles.strokeStyle = randomColor()
		polygon.styles.lineWidth = 3

		polygon.hoverStyles.fillStyle = randomColor()

		scene.add(polygon)

		const cp = editPolygon(polygon)
		scene.add(cp)

		return () => {
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
			<footer className={styles.footer}>🔔 滚轮缩放；右键平移</footer>
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
