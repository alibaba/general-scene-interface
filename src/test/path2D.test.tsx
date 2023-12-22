import { useEffect, useRef } from 'react'

import { useSize2 } from '../demo/hooks'
import { Scene } from '../lib/core'
import { addAxis, draggable, scenePointerControl } from '../lib/extra'
import { PathShape } from '../lib/shapes'
import { randomColor } from '../lib/utils/misc'

import styles from './Test.module.css'

/**
 * @test_name Path2D
 * @test_category shapes
 */

export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		scenePointerControl(scene)
		addAxis(scene)

		{
			const shape = new PathShape(new Path2D(path1))
			shape.styles.fillStyle = randomColor()
			// shape.styles.fill = false
			shape.styles.stroke = true
			// shape.styles.lineWidth = 2

			draggable(shape)

			scene.add(shape)
		}

		{
			const shape = new PathShape(new Path2D(path2))
			shape.x = 200
			shape.styles.fillStyle = randomColor()
			// shape.styles.fill = false
			shape.styles.stroke = true
			// shape.styles.lineWidth = 2

			draggable(shape)

			scene.add(shape)
		}

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

const path1 =
	'M111.273 12.393A36.287 36.287 0 0 0 83.907 0c-8.79 0-17.314 3.34-23.84 9.083C53.674 3.206 45.15 0 36.093 0 16.115 0 0 15.896 0 35.532a34.747 34.747 0 0 0 5.915 19.443l1.913 2.292 26.619-23.92a9.09 9.09 0 1 1 17.459.43L68.45 48.253a9.055 9.055 0 0 1 3.878-.866c1.173 0 2.293.222 3.322.626zm4.129 6.156L80.794 53.157a9.09 9.09 0 1 1-17.132.57L47.116 39.25a9.055 9.055 0 0 1-3.878.866 9.053 9.053 0 0 1-4.277-1.067L12.8 62.548c.43.355.87.7 1.319 1.036L57.536 97.38c.666.535 1.598.802 2.397.802s1.732-.267 2.398-.802l44.484-34.464C115.205 56.104 120 46.086 120 35.532a34.86 34.86 0 0 0-2.347-12.609z"'
const path2 =
	'M13,19c-7,0-7-9,0-9l82,2c6,0,6-9,13-9l42,1c3,0,3,3,0,3h-35c-4,0-4,3,0,3h35c3,0,3,3,0,3h-38c-3,0-3,3,0,3h38c3,0,3,3,0,3h-35c-4,0-4,3,0,3h35c3,0,3,3,0,3l-42,1c-7,0-7-9-13-9zM145,50c7,0,7-9,0-9l-84,2c-6,0-7-6-14-9c-11-6-31,1-36,5c-5,4-5,9,0,13c5,4,25,10,36,5c7-4,9-9,14-9z'
