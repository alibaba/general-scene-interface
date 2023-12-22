import { Suspense, lazy, useEffect, useState } from 'react'

import { entries } from './entries'

import styles from './App.module.css'

const categories = [
	{ key: 'shapes', name: 'Shapes' },
	{ key: 'drawer', name: '绘制器' },
	{ key: 'utils', name: 'Utilities' },
]

function App() {
	const url = new URL(window.location.href)
	const defaultIndex = url.searchParams.get('entry') || entries[0].key
	const [currentEntry, setCurrentEntry] = useState(defaultIndex as string)

	// const [result, setResult] = useState<any>(null)

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
						{entries.find((entry) => entry.key === currentEntry)?.getComponent()}
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
