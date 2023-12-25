import { useEffect, useRef } from 'react'

import {
	CartesianAxes,
	CartesianCoordinator,
	coordinatorPointerControl,
	tick,
} from '../lib/charts/coordinate'
import { XRange } from '../lib/charts/marker'
import { barPlot, linePlot, scatterPlot } from '../lib/charts/plots'
import { Scene } from '../lib/core'

import styles from './Test.module.css'

/**
 * @test_name 点线柱
 * @test_category chart
 */
export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	const width = 800
	const height = 600

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)
		// scenePointerControl(scene, { lockY: true, lockScale: true })

		const coordinator = new CartesianCoordinator()
		coordinator.viewportWidth = width - 200
		coordinator.viewportHeight = height - 200

		coordinatorPointerControl(scene, coordinator, { lockY: true, lockScale: false })

		const axis = new CartesianAxes(coordinator, { followOrigin: false })

		scene.add(coordinator.indicator)

		scene.add(axis)

		const testData = [] as { x: number; y: number }[]
		for (let i = 0; i < 100; i++) {
			testData.push({ x: i, y: Math.random() * 100 })
		}

		const b = barPlot(coordinator, testData, { barWidth: 0.5 })
		scene.add(b)

		const s = scatterPlot(coordinator, testData, { size: 5 })
		scene.add(s)

		const l = linePlot(coordinator, testData, {})
		scene.add(l)

		const t = tick(coordinator)
		scene.add(t)

		const r = new XRange(coordinator, { draggable: true })
		scene.add(r)

		return () => {
			scene.dispose()
		}
	}, [])

	return (
		<div className={styles.wrapper}>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				style={{
					width: width,
					height: height,
					border: 'rgb(255, 255, 255) 3px solid',
					boxShadow: '#00000076 0 0 10px 1px',
				}}
			/>
		</div>
	)
}
