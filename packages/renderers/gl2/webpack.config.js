var webpack = require('webpack')
var path = require('path')
var fs = require('fs')
// var CompressionPlugin = require("compression-webpack-plugin")
const TerserPlugin = require('terser-webpack-plugin')

var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

process.noDeprecation = true

function getDemoEntry(dirPath) {
	var entries = {}
	var reg = /.js$/
	var pageDir = fs.readdirSync(dirPath) || []

	for (var j = 0; j < pageDir.length; j++) {
		var filePath = path.resolve(dirPath, pageDir[j])
		var fileStat = fs.statSync(filePath)
		if (fileStat.isFile() && reg.test(pageDir[j])) {
			var name = pageDir[j].replace('.js', '')
			// entries[name] = [filePath, 'webpack-hot-middleware/client?reload=true'];
			entries[name] = [filePath]
		}
	}
	return entries
}

var ENTRY = process.env.ENTRY
var entry = {}
if (ENTRY) {
	// entry[ENTRY] = ['./demo/' + ENTRY + '.js', 'webpack-hot-middleware/client?reload=true'];
	entry[ENTRY] = ['./demo/' + ENTRY + '.js']
} else {
	entry = getDemoEntry(path.resolve(__dirname, 'demo/'))
}

var plugins, devtool, output, mode, externals, optimization

if (process.env.NODE_ENV === 'production') {
	console.log('publishing')

	entry = {
		GL2: [path.resolve('./src/GL2.js')],
		lite: [path.resolve('./src/lite.js')],
	}

	// @DEBUG 调试中，记得删掉
	// mode = 'development'
	// devtool = "inline-source-map"

	mode = 'production'

	externals = {
		three: 'three',
	}

	plugins = [
		new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
		// new webpack.optimize.UglifyJsPlugin({test: /(\.js)$/})
		// new BundleAnalyzerPlugin(),
	]

	devtool = undefined

	output = {
		path: path.resolve('./'),
		publicPath: '/static/',
		filename: '[name].js',
		library: 'GL2',
		libraryTarget: 'umd',
		// umdNamedDefine: true,
		globalObject: 'this',
	}

	optimization = {
		// minimizer: [
		//     new TerserPlugin({
		//         // exclude: /\THREE/,
		//         // exclude: /three/,
		//         // cache: true,
		//         // parallel: true,
		//         terserOptions: {
		//             // mangle: false,
		//             keep_fnames: true,
		//         },
		//     }),
		// ],
		minimize: false,
	}
} else if (process.env.NODE_ENV === 'debug') {
	console.log('debug')

	entry = {
		GL2: [path.resolve('./src/GL2.js')],
		lite: [path.resolve('./src/lite.js')],
	}

	devtool = 'inline-source-map'

	mode = 'development'

	externals = {
		three: 'three',
	}

	plugins = [
		new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
	]

	output = {
		path: path.resolve('./'),
		publicPath: '/static/',
		filename: '[name].js',
		library: 'GL2',
		libraryTarget: 'umd',
		// umdNamedDefine: true,
		globalObject: 'this',
	}
} else {
	console.log('deving')

	plugins = [
		new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
	]

	mode = 'development'

	devtool = 'inline-source-map'

	output = {
		filename: '[name].demo.js',
		publicPath: '/static/',
	}
}

var config = {
	entry: entry,
	output: output,
	devtool: devtool,
	plugins: plugins,
	mode: mode,
	resolve: {
		alias: {
			utils: path.join(__dirname, 'src/utils'),
			config: path.join(__dirname, 'src/config.js'),
			src: path.join(__dirname, 'src'),
		},
		extensions: ['.js', '.scss', '.css'],
	},
	externals,
	module: {
		rules: [
			{
				test: /\.js$/,
				include: /src|demo/,
				// exclude: /(node_modules|bower_components)/,
				loader: 'babel-loader',
				options: {
					cacheDirectory: true,
					presets: [['@babel/preset-env']],
					plugins: [
						'@babel/plugin-transform-runtime',
						'@babel/plugin-proposal-function-bind',
						['@babel/plugin-proposal-decorators', { legacy: true }],
						['@babel/plugin-proposal-class-properties', { loose: true }],
						['@babel/plugin-proposal-async-generator-functions'],
						[
							'@babel/plugin-transform-async-to-generator',
							{
								module: 'bluebird',
								method: 'coroutine',
							},
						],
					],
				},
			},
			{
				test: /\.jade/,
				include: /src/,
				loader: 'pug-loader',
			},
			{
				test: /\.(glsl|vs|fs)$/,
				include: /src|demo/,
				loader: 'webpack-glsl-loader',
			},
			// {
			//     test: /(\.scss$)/,
			//     include: /src/,
			//     use: [
			//         'style-loader',
			//         'css-loader',
			//         'sass-loader',
			//     ]
			// },
			{
				test: /\.css$/,
				include: /src/,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	optimization,
}

module.exports = config
