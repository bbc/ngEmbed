module.exports = function (grunt) {
    'use strict';
    grunt.initConfig({
        concat: {
            admin: {
                src: 'app/**/*.js',
                dest: 'ngEmbed.build.js'
            }
        }});

    grunt.registerTask('build', [
        'concat'
    ]);

    grunt.loadNpmTasks('grunt-contrib-concat');
};