module.exports = function (config) {
    config.set({
        frameworks: ['jasmine'],
        basePath: '../../',
        files: [
            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/*.js',
            'app/**/*.js',
            'test/unit/*.spec.js'
        ],
        autoWatch: true,
        browsers: ['chrome'],
        singleRun: false
    });
};