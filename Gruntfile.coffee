module.exports = (grunt) ->

  grunt.loadNpmTasks('grunt-contrib-coffee')

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    coffee:

      compile:

        options:
          sourceMap: true

        files:
          'dist/controllers/table_controller.js': 'src/controllers/table_controller.js'

