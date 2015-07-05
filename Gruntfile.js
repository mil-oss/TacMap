/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            build: {
                cwd: 'app',
                src: ['**'],
                dest: 'build',
                expand: true
            }
        },
        clean: {
            build: {
                src: 'build'
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.registerTask(
            'build',
            'Compiles all the assets and copies the files to the build directory.',
            ['clean', 'copy']
            );
    grunt.registerTask('start', function () {
        grunt.util.spawn(
                {cmd: 'node'
                    , args: ['tacmap.js']
                })

        grunt.task.run('watch:app')
    })
};
