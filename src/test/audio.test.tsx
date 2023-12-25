import { useEffect, useRef } from 'react'

import { PolylineShape } from '..'
import {
	CartesianAxes,
	CartesianCoordinator,
	coordinatorPointerControl,
	tick,
} from '../lib/charts/coordinate'
import { XRange, drawXRange } from '../lib/charts/marker'
import { barPlot, linePlot } from '../lib/charts/plots'
import { Scene } from '../lib/core'
import { decode, loadAudio } from '../lib/utils/audio'

import styles from './Test.module.css'

const audioSrc = './test-audio.mp3'
const audioAuthor = 'https://freesound.org/people/quetzalcontla/sounds/612846/'

/**
 * @test_name 音频频谱
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

		coordinatorPointerControl(scene, coordinator, {
			lockY: true,
			lockScale: false,
			xStartMin: 0,
			xEndMax: 100,
		})

		const axis = new CartesianAxes(coordinator, { followOrigin: false })

		scene.add(coordinator.indicator)

		const t = tick(coordinator)
		scene.add(t)

		const r = new XRange(coordinator, { draggable: true, min: 0, max: 100 })
		scene.add(r)

		drawXRange(scene, coordinator, { draggable: true })

		scene.add(axis)
		;(async () => {
			const { blob } = await loadAudio(audioSrc)
			const ab = await blob.arrayBuffer()
			const decodedData = await decode(ab, 3000)

			const channelData = decodedData.getChannelData(0)
			const len = channelData.length

			const max = channelData.reduce((max, v) => Math.max(Math.abs(v), max), 0)

			const width = 100
			const height = 100
			const normalize = true
			let yScale = 1 * 0.5 * height
			if (normalize) {
				yScale = (1 / max) * 0.5 * height
			}

			const xResolution = 4000

			const polylineData: { x: number; y: number }[] = []

			if (xResolution < channelData.length) {
				console.log('xResolution > channelData.length，重新采样')
				for (let i = 0; i < xResolution; i++) {
					const x = i / xResolution
					const index = Math.floor(x * len)

					polylineData.push({
						x: x * width,
						y: channelData[index] * yScale + 0.5 * height,
					})
				}
			} else {
				for (let i = 0; i < channelData.length; i++) {
					polylineData.push({
						x: (i / len) * width,
						y: channelData[i] * yScale + 0.5 * height,
					})
				}
			}

			const bbox = barPlot(coordinator, [{ x: width / 2, y: height }], { barWidth: width })
			const rect = Array.from(bbox.children.values())[0]
			rect.style.pointerEvents = 'none'
			rect.style.stroke = true
			rect.style.strokeStyle = 'black'
			scene.add(bbox)

			const l = linePlot(coordinator, polylineData)
			const polyline = l.userData.polyline as PolylineShape
			polyline.style.lineWidth = 1
			polyline.style.lineJoin = 'miter'
			polyline.style.pointerEvents = 'none'
			scene.add(l)
		})()

		// ;(globalThis as any).scene = scene

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

			<div>
				<a href={audioAuthor} target="_blank" rel="noreferrer">
					测试音频来源
				</a>
			</div>
		</div>
	)
}
