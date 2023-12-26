import { useEffect, useRef } from 'react'

import { PointerEvents, PolylineShape, RectShape, SegmentShape } from '..'
import { CartesianCoordinator, coordinatorPointerControl, tick } from '../lib/charts/coordinate'
import { drawXRange } from '../lib/charts/marker'
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

	const canvasWidth = 800
	const canvasHeight = 250

	const barHeight = 150
	const barWidth = 740

	const ctrlBarHeight = 20

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)
		// scenePointerControl(scene, { lockY: true, lockScale: true })

		const coordinator = new CartesianCoordinator()
		coordinator.viewportX = 30
		coordinator.viewportY = 50
		coordinator.viewportWidth = barWidth
		coordinator.viewportHeight = barHeight
		scene.add(coordinator.indicator)

		coordinatorPointerControl(scene, coordinator, {
			lockY: true,
			lockScale: false,
			xStartMin: 0,
			xEndMax: 100,
		})

		//
		;(async () => {
			const { blob, audio, duration } = await loadAudio(audioSrc)
			console.log(audio)
			scene.addEventListener('dispose', () => {
				audio.pause()
			})
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
				for (let i = 0; i < xResolution; i++) {
					const x = i / xResolution
					const index = Math.round(x * len)

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

			const bbox = barPlot(coordinator, [{ x: width / 2, y: height }], {
				barWidth: width,
				color: '#ffbab7',
			})
			const rect = Array.from(bbox.children.values())[0]
			rect.style.pointerEvents = 'none'
			rect.style.stroke = true
			rect.style.strokeStyle = 'rgba(0, 0, 0, 0.5)'
			scene.add(bbox)

			const l = linePlot(coordinator, polylineData)
			const polyline = l.userData.polyline as PolylineShape
			polyline.style.lineWidth = 1
			polyline.style.lineJoin = 'miter'
			polyline.style.strokeStyle = '#0c5ef9'
			polyline.style.pointerEvents = 'none'
			scene.add(l)

			// 事件轴刻度

			const t = tick(coordinator, {
				disableY: true,
				xColor: '#000000',
				xToString: (x) => `${((x / 100) * duration).toFixed(1)}s`,
			})
			scene.add(t)

			// 播放指示线
			let isPlaying = false
			{
				const progress = new SegmentShape()
				const startPos = coordinator.project(0, height)
				progress.x = startPos[0]
				progress.y = startPos[1] - ctrlBarHeight
				progress.dy = barHeight + ctrlBarHeight
				progress.style.zIndex = 10
				progress.dx = 0
				progress.style.lineWidth = 3
				progress.style.pointerEvents = 'none'
				progress.style.strokeStyle = 'rgba(255, 0, 0, 0.8)'
				scene.add(progress)

				coordinator.addEventListener('update', (e) => {
					const time = audio.currentTime
					const x = Math.min(1, time / duration) * width
					progress.x = coordinator.project(x, 0)[0]
				})

				scene.addEventListener('beforeRender', () => {
					const time = audio.currentTime
					const x = Math.min(1, time / duration) * width
					progress.x = coordinator.project(x, 0)[0]
				})
			}

			// 进度控制条
			const ctrlBar = new RectShape()
			ctrlBar.hoverStyle.cursor = 'ew-resize'
			const updateCtrlBar = () => {
				const left = coordinator.project(0, 0)[0]
				const [right, bottom] = coordinator.project(width, height)

				ctrlBar.x = left
				ctrlBar.y = bottom - ctrlBarHeight
				ctrlBar.width = right - left
				ctrlBar.height = ctrlBarHeight
			}

			updateCtrlBar()
			coordinator.addEventListener('update', updateCtrlBar)
			scene.add(ctrlBar)

			ctrlBar.style.fillStyle = '#b973ee'
			ctrlBar.addEventListener('pointerdown', (e: any) => {
				if (e.srcEvent.button !== 0) return

				isPlaying = false
				audio.pause()

				const onMove = (e: PointerEvents['pointermove']) => {
					const xInCanvas = e.srcEvent.offsetX
					const xInCoord = coordinator.unproject(xInCanvas, 0)[0]
					const time = (xInCoord / width) * duration
					audio.currentTime = time
				}
				onMove(e as any)
				ctrlBar.addEventListener('pointermove', onMove)

				const onUp = (e: PointerEvents['pointerup']) => {
					ctrlBar.removeEventListener('pointermove', onMove)
					ctrlBar.removeEventListener('pointerup', onUp)
				}
				ctrlBar.addEventListener('pointerup', onUp)
			})

			const onKeyDown = (e: KeyboardEvent) => {
				if (e.code === 'Space') {
					if (isPlaying) {
						isPlaying = false
						audio.pause()
					} else {
						isPlaying = true
						audio.play()
					}
				}
			}
			if (!scene.disposed) {
				document.addEventListener('keydown', onKeyDown)
				scene.addEventListener('dispose', () => {
					document.removeEventListener('keydown', onKeyDown)
				})
			}

			drawXRange(scene, coordinator, { editable: true, min: 0, max: width })
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
				width={canvasWidth}
				height={canvasHeight}
				style={{
					width: canvasWidth,
					height: canvasHeight,
					border: 'rgb(255, 255, 255) 3px solid',
					boxShadow: '#00000076 0 0 10px 1px',
				}}
			/>
			<div>💡 使用空格键控制播放与暂停</div>
			<div>
				<a href={audioAuthor} target="_blank" rel="noreferrer">
					🔗 测试音频协议 (Attribution 4.0), 作者 @quetzalcontla
				</a>
			</div>
		</div>
	)
}
