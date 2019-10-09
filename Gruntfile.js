module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        browserify: {
            pqueue: {
                src: ['browserify_p-queue.js'],
                dest: 'browserify_build_p-queue.js'
            },
            delay: {
                src: ['browserify_delay.js'],
                dest: 'browserify_build_delay.js'
            }
        },

        concat: {
            options: {
                separator: '\n\n//------------------------------------------\n'
            },
            js: {
                src: [
                    'node_modules/jquery/dist/jquery.js',
                    'node_modules/jquery-deparam/jquery-deparam.js',
                    'node_modules/bootstrap/dist/js/bootstrap.bundle.js',
                    'node_modules/spotify-web-api-js/src/spotify-web-api.js',
                    'browserify_build_p-queue.js',
                    'browserify_build_delay.js',
                    'node_modules/mustache/mustache.js'
                ],
                dest: 'bundle.js'
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
                'browserify_build_*.js',
                'package-lock.json'
            ]
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['browserify', 'concat']);

};