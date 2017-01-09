'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var watch = require('gulp-watch');
var batch = require('gulp-batch');
var plumber = require('gulp-plumber');
var jetpack = require('fs-jetpack');
var bundle = require('./bundle');
var utils = require('./utils');
var template = require('gulp-template-html');

var projectDir = jetpack;
var srcDir = jetpack.cwd('./src');
var destDir = jetpack.cwd('./app');

gulp.task('pages', function () {
    return gulp.src(srcDir.path('pages/*.html'))
      .pipe(template(srcDir.path('templates/template.html')))
      .pipe(gulp.dest(destDir.path('.')));
});

/*
gulp.task('bundle', function () {
    return Promise.all([
        //bundle(srcDir.path('background.js'), destDir.path('background.js')),
        bundle(srcDir.path('main.js'), destDir.path('main.js')),
    ]);
});
*/

/*
gulp.task('less', function () {
    return gulp.src(srcDir.path('stylesheets/main.less'))
        .pipe(plumber())
        .pipe(less())
        .pipe(gulp.dest(destDir.path('stylesheets')));
});
*/

//var copyOptions = [
//	{src: 'src/**/*.js'},
//	{src: 'src/**/*.css'},
//	{src: 'src/**/*.png'},
//	{src: 'src/fonts/**/*'}
//];
//
//gulp.task('copy', function () {
//	copyOptions.forEach(function(copyOption){
//		gulp.src([copyOption.src], {
//		base: 'src'
//		}).pipe(gulp.dest(destDir.path('.')));
//	});
//});

gulp.task('environment', function () {
    var configFile = 'config/env_' + utils.getEnvName() + '.json';
    projectDir.copy(configFile, destDir.path('env.json'), { overwrite: true });
});


gulp.task('watch', function () {
    var beepOnError = function (done) {
        return function (err) {
            if (err) {
                utils.beepSound();
            }
            done(err);
        };
    };
	
    watch('src/pages/**/*.html', batch(function (events, done) {
        gulp.start('pages', beepOnError(done));
    }));
	
	//watch('src/**/*.css', batch(function (events, done) {
    //    gulp.start('copy', beepOnError(done));
    //}));
});

gulp.task('build', ['pages', 'environment']);
