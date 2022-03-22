/* eslint-disable */

var webpack = require('webpack')
var path = require('path')
var fs = require('fs')
var ProgressBarPlugin = require('progress-bar-webpack-plugin')

process.noDeprecation = true

const entry = {
	gltf2backend: [path.resolve(__dirname, 'gltf2backend/index.ts')],
	gltf2frontend: [path.resolve(__dirname, 'gltf2frontend/index.ts')],
	usecase0: [path.resolve(__dirname, 'usecase0/index.ts')],
	geomBuilders: [path.resolve(__dirname, 'geomBuilders/index.ts')],
	raycast: [path.resolve(__dirname, 'raycast/index.ts')],
	sprite: [path.resolve(__dirname, 'sprite/index.ts')],
	prgMatr: [path.resolve(__dirname, 'prgMatr/index.ts')],
	gline: [path.resolve(__dirname, 'gline/index.ts')],
	gsiRefiner: [path.resolve(__dirname, 'gsiRefiner/index.ts')],
	memory: [path.resolve(__dirname, 'memory/index.ts')],
	'utils-geometry': [path.resolve(__dirname, 'utils-geometry/index.ts')],
	threelite: [path.resolve(__dirname, 'threelite/index.ts')],
}

var config = {
	entry: entry,
	output: {
		// path: path.resolve(__dirname, 'build'),
		filename: '[name].demo.js',
		publicPath: '/static/',
	},

	// devtool: 'eval-source-map', // 性能较差但是可以保留原始ts代码，若要优化性能，注释掉这一行

	mode: 'development',
	plugins: [
		new ProgressBarPlugin({ width: 30 }),
		// new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
	],
	resolve: {
		extensions: ['.js', '.scss', '.css', '.ts'],
	},
	module: {
		rules: [
			{
				// 保证 packages 里的所有依赖包都可以录入 sourcemap
				test: /\.js|ts$/,
				enforce: 'pre',
				use: ['source-map-loader'],
			},
			{
				test: /\.ts$/,
				// include: /src/,
				loader: 'ts-loader',
				options: {
					transpileOnly: true,
					configFile: path.resolve(__dirname, './tsconfig.build.json'),
				},
			},
		],
	},
}

module.exports = config
