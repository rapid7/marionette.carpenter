module.exports = (grunt) ->

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    coffee:
      compile:
        options:
          sourceMap: true
        expand: true
        cwd: 'src/'
        src: ['**/**.js.coffee']
        dest: 'dist/'
        ext: '.js'

    eco:

  grunt.loadNpmTasks('grunt-contrib-coffee')