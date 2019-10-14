const pkg = require('./package.json');

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: pkg,

        browserify: {
            dist: {
                src: [],
                dest: 'bundle.js',
                options: {
                    require: Object.keys(pkg.dependencies)
                }
            }
        },

        concat: {
            options: {
                separator: '\n\n//------------------------------------------\n'
            },
            css: {
                src: [
                    'node_modules/bootstrap/dist/css/bootstrap.css'
                ],
                dest: 'bundle.css'
            }
        },

        clean: {
            build: [
                'node_modules/',
                'package-lock.json'
            ]
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['browserify', 'concat']);

};