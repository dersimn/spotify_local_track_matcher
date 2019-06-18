module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        browserify: {
            default: {
                src: ['browserify_p-queue.js'],
                dest: 'p-queue.js'
            }
        },

        concat: {
            options: {
                separator: '\n\n//------------------------------------------\n'
            },
            dist: {
                src: [
                    'node_modules/jquery/dist/jquery.js',
                    'node_modules/jquery-deparam/jquery-deparam.js',
                    'node_modules/bootstrap/dist/js/bootstrap.bundle.js',
                    'node_modules/spotify-web-api-js/src/spotify-web-api.js',
                    'p-queue.js',
                    'node_modules/mustache/mustache.js'
                ],
                dest: 'bundle.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['browserify', 'concat']);

};