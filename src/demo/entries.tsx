import { lazy } from 'react'

/**
 * @attention @warning
 * THIS FILE IS GENERATED BY SCRIPTS. DO NOT EDIT IT MANUALLY.
 * 自动生成的代码，不要手动修改！
 */

export const entries = [
	{
		key: 'audio',
		name: '音频频谱',
		category: 'chart',
		getComponent: () => {
			const Test = lazy(() => import('../test/audio.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'chart.candle',
		name: '蜡烛图',
		category: 'chart',
		getComponent: () => {
			const Test = lazy(() => import('../test/chart.candle.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'chart',
		name: '点线柱',
		category: 'chart',
		getComponent: () => {
			const Test = lazy(() => import('../test/chart.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'maxFPS',
		name: 'FPS 限制',
		category: 'utils',
		getComponent: () => {
			const Test = lazy(() => import('../test/maxFPS.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'path2D',
		name: 'Path2D',
		category: 'shapes',
		getComponent: () => {
			const Test = lazy(() => import('../test/path2D.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'point',
		name: '点绘制',
		category: 'drawer',
		getComponent: () => {
			const Test = lazy(() => import('../test/point.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'polygonBasic',
		name: '多边形',
		category: 'shapes',
		getComponent: () => {
			const Test = lazy(() => import('../test/polygonBasic.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'polygonDraw',
		name: '多边形绘制',
		category: 'drawer',
		getComponent: () => {
			const Test = lazy(() => import('../test/polygonDraw.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'polylineBasic',
		name: '折线',
		category: 'shapes',
		getComponent: () => {
			const Test = lazy(() => import('../test/polylineBasic.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'polylineDraw',
		name: '折线绘制',
		category: 'drawer',
		getComponent: () => {
			const Test = lazy(() => import('../test/polylineDraw.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'polylineDrawConstrain',
		name: '限制区域-折线',
		category: 'utils',
		getComponent: () => {
			const Test = lazy(() => import('../test/polylineDrawConstrain.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'rect',
		name: '矩形绘制',
		category: 'drawer',
		getComponent: () => {
			const Test = lazy(() => import('../test/rect.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'rectConstrain',
		name: '限制区域-矩形',
		category: 'utils',
		getComponent: () => {
			const Test = lazy(() => import('../test/rectConstrain.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'sceneGraph',
		name: '场景树',
		category: 'shapes',
		getComponent: () => {
			const Test = lazy(() => import('../test/sceneGraph.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'segmentBasic',
		name: '线段',
		category: 'shapes',
		getComponent: () => {
			const Test = lazy(() => import('../test/segmentBasic.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'segmentDraw',
		name: '线段绘制',
		category: 'drawer',
		getComponent: () => {
			const Test = lazy(() => import('../test/segmentDraw.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'segmentDrawConstrain',
		name: '限制区域-线段',
		category: 'utils',
		getComponent: () => {
			const Test = lazy(() => import('../test/segmentDrawConstrain.test.tsx'))
			return <Test />
		},
	},

	{
		key: 'svg',
		name: 'SVG 解析器',
		category: 'shapes',
		getComponent: () => {
			const Test = lazy(() => import('../test/svg.test.tsx'))
			return <Test />
		},
	},
]
