import gp from "gulp";
let fileswatch   = 'html,htm,txt,json,md,woff2';
const { gulp, src, dest, parallel, series, watch } = gp

import browserSync from 'browser-sync'
import bssi from 'browsersync-ssi'
import ssi from 'ssi'
import webpackStream from 'webpack-stream'
import webpack from 'webpack'    
import TerserPlugin from 'terser-webpack-plugin'
import concat from 'gulp-concat' 
import gulpSass from 'gulp-sass' 
import dartSass from 'sass'
import sassglob from 'gulp-sass-glob'
const sass = gulpSass(dartSass)
import stylglob from 'gulp-noop'
import postCss  from 'gulp-postcss'
import cssnano from 'cssnano'
import autoprefixer from 'autoprefixer'
import imagemin from 'gulp-imagemin'
import changed from 'gulp-changed'
import {deleteAsync} from 'del'


function browsersync() {
    browserSync.init({
        server: {
            baseDir: 'app/',
            middleware: bssi({baseDir: 'app/', ext: '.html'})
        },
        ghostMode: {clicks: false},
        notify: false,
        online: true,
        // tunnel: 'yousutename', // Attempt to use the URL https://yousutename.loca.lt      
    })
}

function scripts() {
    return src(['app/js/*.js', '!app/js/*.min.js'])
    .pipe(webpackStream({
        mode: 'production',
        performance: { hints: false },
        plugins: [
            new webpack.ProvidePlugin({$: 'jquery', jQuery: 'jquery', 'window.jQuery': 'jquery' })
        ],
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    exclude: /(node_modules)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                            plugins: ['babel-plugin-root-import']
                        }
                    }
                }
            ]
        },
        optimization: {
            minimize: true,
				minimizer: [
					new TerserPlugin({
						terserOptions: { format: { comments: false } },
						extractComments: false
					})
				]
        },
    }, webpack)).on('error', (err) => {this.emit('end')})
    .pipe(concat('app.min.js'))
    .pipe(dest('app/js'))
    .pipe(browserSync.stream())
}

function styles() {
    return src([`app/scss/*.*`, `!app/scss/_*.*`])
    .pipe(eval(`sassglob`)())
    .pipe(eval(sass)({ 'include css': true }))
    .pipe(postCss([
        autoprefixer({ grid: 'autoplace' }),
        cssnano({ preset: ['default', { discardComments: { removeAll: true } }] })
    ]))    
    .pipe(concat('app.min.css'))
    .pipe(dest('app/css'))
    .pipe(browserSync.stream())
}

function images() {
	return src(['app/images/src/**/*'])
		.pipe(changed('app/images/dist'))
		.pipe(imagemin())
		.pipe(dest('app/images/dist'))
		.pipe(browserSync.stream())
}

function buildcopy() {
	return src([
		'{app/js,app/css}/*.min.*',
		'app/images/**/*.*',
		'!app/images/src/**/*',
		'app/fonts/**/*'
	], { base: 'app/' })
	.pipe(dest('dist'))
}

async function buildhtml() {
	let includes = new ssi('app/', 'dist/', '/**/*.html')
	includes.compile()
	await deleteAsync('dist/parts', { force: true })
}

async function cleandist() {
	await deleteAsync('dist/**/*', { force: true })
}

function startwatch() {
	watch(`app/scss/**/*`, { usePolling: true }, styles)
	watch(['app/js/**/*.js', '!app/js/**/*.min.js'], { usePolling: true }, scripts)
	watch('app/images/src/**/*', { usePolling: true }, images)
	watch(`app/**/*.{${fileswatch}}`, { usePolling: true }).on('change', browserSync.reload)
}

export { scripts, styles, images }
export let assets = series(scripts, styles, images)
export let build = series(cleandist, images, scripts, styles, buildcopy, buildhtml)

export default series(scripts, styles, images, parallel(browsersync, startwatch))