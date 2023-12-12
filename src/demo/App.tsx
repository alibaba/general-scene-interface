import { Suspense, lazy, useEffect, useState } from 'react'

import styles from './App.module.css'

const categories = [{ key: 'demo', name: 'Demo' }]

const entries = [
	//
	{
		key: 'scene-test-point',
		name: '点绘制',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestPoint'))
			return <Test />
		},
	},
	{
		key: 'scene-test-rect',
		name: '矩形绘制',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestRect'))
			return <Test />
		},
	},
	{
		key: 'scene-test-rect-constrain',
		name: '矩形绘制(受限区)',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestRectConstrain'))
			return <Test />
		},
	},
	{
		key: 'scene-test-segment',
		name: '线段',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestSegmentBasic'))
			return <Test />
		},
	},
	{
		key: 'scene-test-segment-draw',
		name: '线段绘制',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestSegmentDraw'))
			return <Test />
		},
	},
	{
		key: 'scene-test-segment-draw-constrain',
		name: '线段绘制(受限区)',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestSegmentDrawConstrain'))
			return <Test />
		},
	},
	{
		key: 'scene-test-polyline',
		name: '折线',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestPolylineBasic'))
			return <Test />
		},
	},
	{
		key: 'scene-test-polyline-draw',
		name: '折线绘制',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestPolylineDraw'))
			return <Test />
		},
	},
	{
		key: 'scene-test-polyline-draw-constrain',
		name: '折线绘制(受限区)',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestPolylineDrawConstrain'))
			return <Test />
		},
	},
	{
		key: 'scene-test-polygon',
		name: '多边形编辑',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestPolygonBasic'))
			return <Test />
		},
	},
	{
		key: 'scene-test-polygon-draw',
		name: '多边形绘制',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestPolygonDraw'))
			return <Test />
		},
	},
	{
		key: 'scene-test-path2d',
		name: 'Path2D',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestPath2D'))
			return <Test />
		},
	},
	{
		key: 'scene-test-svg',
		name: 'SVG parser',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestSVG'))
			return <Test />
		},
	},
	{
		key: 'scene-test-max-fps',
		name: 'FPS 限制',
		category: 'demo',
		getComponent: (onResult: any) => {
			const Test = lazy(() => import('../lib/test/TestMaxFPS'))
			return <Test />
		},
	},
]

function App() {
	const url = new URL(window.location.href)
	const defaultIndex = url.searchParams.get('entry') || entries[0].key
	const [currentEntry, setCurrentEntry] = useState(defaultIndex as string)

	// const [result, setResult] = useState<any>(null)

	const onResult = (result: any) => {
		// setResult(result)
		console.log(result)
	}

	useEffect(() => {
		// setResult(null)

		// 保存当前状态到 URL
		const url = new URL(window.location.href)
		url.searchParams.set('entry', currentEntry)
		window.history.replaceState({}, '', url.toString())
	}, [currentEntry])

	return (
		<div className={styles.wrapper}>
			<div className={styles.layout}>
				<header className={styles.header}>
					<div className={styles.logo}>Cubs.js</div>

					<div className={styles.slogan}>
						<div>轻量、模块化、零依赖的 Canvas 封装</div>
					</div>
				</header>
				<div className={styles.sidebar}>
					{categories.map((category) => {
						return (
							<div className={styles.categoryWrapper} key={category.key}>
								<div className={styles.category} key={category.key}>
									{category.name}
								</div>

								{entries.map((entry) => {
									if (entry.category !== category.key) return null
									return (
										<div
											key={entry.key}
											className={styles.entry}
											data-active={entry.key === currentEntry}
											// data-tbd={entry.tbd}
											onClick={() => setCurrentEntry(entry.key)}>
											{entry.name}
										</div>
									)
								})}
							</div>
						)
					})}
				</div>
				<main className={styles.main}>
					<Suspense fallback={<Loading />}>
						{entries.find((entry) => entry.key === currentEntry)?.getComponent(onResult)}
					</Suspense>
				</main>
				<footer className={styles.footer}>
					<a
						href="https://github.com/alibaba/general-scene-interface/tree/cubs.js"
						target="_blank"
						className={styles.link}>
						<div className={styles.linkIconCode}></div>
						<div>源码</div>
					</a>
					<a
						href="https://github.com/alibaba/general-scene-interface/tree/cubs.js/src/lib/test"
						target="_blank"
						className={styles.link}>
						<div className={styles.linkIconUsage}></div>
						<div>用例</div>
					</a>

					<div className={styles.author}>@Simon</div>
				</footer>
			</div>
		</div>
	)
}

export default App

function Loading() {
	return <div>Loading...</div>
}
