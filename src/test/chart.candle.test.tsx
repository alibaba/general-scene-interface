import { useEffect, useRef } from 'react'

import {
	CartesianAxes,
	CartesianCoordinator,
	barPlot,
	candlestickPlot,
	coordinatorPointerControl,
	linePlot,
	randomColor,
} from '..'
import { Scene } from '../lib/core'

import styles from './Test.module.css'

/**
 * @test_name 蜡烛图
 * @test_category chart
 */
export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	const width = 800
	const height = 700

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)

		const coordinator = new CartesianCoordinator()
		coordinator.viewportX = 50
		coordinator.viewportY = 50
		coordinator.viewportWidth = width - 100
		coordinator.viewportHeight = height - 100

		const axis = new CartesianAxes(coordinator, { followOrigin: false })

		scene.add(coordinator.indicator)

		scene.add(axis)

		fetch('./test-stock-data.csv')
			.then((res) => res.text())
			.then((text) => {
				const lines = text.trim().split('\n')
				const header = lines[0].split(',')
				const data = lines.slice(1).map((line, index) => {
					const values = line.split(',')
					const obj = {} as any
					for (let i = 0; i < header.length; i++) {
						obj[header[i]] = values[i]
						obj.index = index
					}
					return obj
				})

				data.forEach((item) => {
					item.timestamp = new Date().setTime(Date.parse(item.Datetime))
				})

				const minIndex = data.map((item) => item.index).reduce((a, b) => Math.min(a, b), Infinity)
				const maxIndex = data.map((item) => item.index).reduce((a, b) => Math.max(a, b), -Infinity)

				console.log('minIndex, maxIndex', minIndex, maxIndex)

				coordinator.xStart = minIndex
				coordinator.xEnd = maxIndex

				coordinatorPointerControl(scene, coordinator, {
					lockY: true,
					lockScale: false,
					xStartMin: minIndex,
					xEndMax: maxIndex,
				})

				const maxVolume = data
					.map((item) => parseInt(item.Volume))
					.reduce((a, b) => Math.max(a, b), -Infinity)

				// scale y from [minVolume, maxVolume] to [0, 100]
				const volumeToY = (volume: number) => (volume / maxVolume) * 100

				coordinator.yStart = 0
				coordinator.yEnd = 300
				coordinator.dispatchEvent({ type: 'update' })

				const volumeData = data.map((item) => {
					return {
						x: item.index,
						y: volumeToY(parseInt(item.Volume)),
					}
				})

				const b = barPlot(coordinator, volumeData, { barWidth: 0.9, color: randomColor(0.9) })
				scene.add(b)

				const closePriceData = data.map((item) => {
					return {
						x: item.index,
						y: parseFloat(item['Adj Close']),
					}
				})

				const minPrice = closePriceData
					.map((item) => item.y)
					.reduce((a, b) => Math.min(a, b), Infinity)
				const maxPrice = closePriceData
					.map((item) => item.y)
					.reduce((a, b) => Math.max(a, b), -Infinity)

				console.log('minPrice, maxPrice', minPrice, maxPrice)

				// scale y from [minPrice, maxPrice] to [100, 300]
				const priceToY = (price: number) => ((price - minPrice) / (maxPrice - minPrice)) * 100 + 100

				//

				const candleData = data.map((item) => {
					return {
						x: item.index,
						open: priceToY(parseFloat(item.Open)),
						close: priceToY(parseFloat(item.Close)),
						high: priceToY(parseFloat(item.High)),
						low: priceToY(parseFloat(item.Low)),
					}
				})

				// console.log('candleData', candleData)

				const candle = candlestickPlot(coordinator, candleData, { barWidth: 0.8 })
				scene.add(candle)

				//

				closePriceData.forEach((item) => {
					item.y = priceToY(item.y) + 50
				})

				const l = linePlot(coordinator, closePriceData, { color: randomColor(0.9), lineWidth: 1 })
				scene.add(l)
			})

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

/**
 * 将一周内的时间，映射到 0-1 之间，仅保留美股交易时间
 */
function normalizeTime(timestamp: number) {
	const time = new Date(new Date(timestamp).toLocaleString('en', { timeZone: 'America/New_York' }))
	const day = Math.floor(timestamp / (24 * 60 * 60 * 1000))
	// console.log('day', day)
	const hour = time.getHours()
	const minute = time.getMinutes()

	// console.log('hour, minute', hour, minute)

	const minuteOfDay = hour * 60 + minute

	const startMinute = 9 * 60 + 30
	const endMinute = 16 * 60

	// // 周中，如果在 9:30 之前，则返回当日的 start
	// if (minuteOfDay < startMinute) {
	// 	console.warn('minuteOfDay < startMinute')
	// 	return 0
	// }

	// // 周中，如果在 16:00 之后，则返回当日的 end
	// if (minuteOfDay > endMinute) {
	// 	console.warn('minuteOfDay > endMinute')
	// 	return 1
	// }

	// 周中，交易时间，连续分布
	const t = day + (minuteOfDay - startMinute) / (endMinute - startMinute)

	return t
}

function denormalizeTime(t: number) {
	const startMinute = 9 * 60 + 30
	const endMinute = 16 * 60

	const minuteOfDay = startMinute + (t - Math.floor(t)) * (endMinute - startMinute)

	const hour = Math.floor(minuteOfDay / 60)
	const minute = Math.floor(minuteOfDay % 60)

	return `${hour}:${minute}`
}
