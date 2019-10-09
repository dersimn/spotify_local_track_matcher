module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        browserify: {
            pqueue: {
                src: ['browserify_p-queue.js'],
                dest: 'p-queue.js'
            },
            delay: {
                src: ['browserify_delay.js'],
                dest: 'delay.js'
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
                    'p-queue.js',
                    'delay.js',
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
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['browserify', 'concat']);

};