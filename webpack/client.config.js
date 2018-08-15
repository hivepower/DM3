const webpack = require('webpack');
const config = require('sapper/webpack/config.js');

const mode = process.env.NODE_ENV;
const isDev = mode === 'development';

module.exports = {
	entry: config.client.entry(),
	output: config.client.output(),
	resolve: {
		extensions: ['.js', '.json', '.html'],
		mainFields: ['svelte', 'module', 'browser', 'main']
	},
	module: {
			rules: [
				{
					test: /\.html$/,
					exclude: /node_modules/,
					use: {
						loader: 'svelte-loader',
						options: {
							hydratable: true,
							cascade: false,
							store: true,
							hotReload: true
						}
					}
				},
				{
					test: /\.css$/,
					use: [
						{ loader: 'style-loader' },
						{ loader: 'css-loader' }
					]
				},
				{
					test: /\.scss$/,
					use:[
						"style-loader",
						"css-loader",
						"sass-loader"
					]
				}
			]
		},
	mode,
	plugins: [
		isDev && new webpack.HotModuleReplacementPlugin(),
		new webpack.DefinePlugin({
			'process.browser': true,
			'process.env.NODE_ENV': JSON.stringify(mode)
		}),
	].filter(Boolean),
	devtool: isDev && 'inline-source-map'
};
