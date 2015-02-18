module.exports = function (grunt) {
    'use strict';
    grunt.initConfig({
        concat: {
            admin: {
                src: 'app/**/*.js',
                dest: 'ngEmbed.build.js'
            }
        }});

    grunt.loadNpmTasks('grunt-contrib-concat');
};