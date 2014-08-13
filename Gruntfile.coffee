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
      compile:
        options:
          amd: true
        expand: true
        cwd: 'src/templates/'
        src: ['**/**.jst.eco']
        dest: 'dist/templates/'
        ext: '.js'

    requirejs: 
      compile: 
        options: 
          baseUrl: "dist/"
          name: "controllers/table_controller"
          include: ["controllers/table_controller"]
          out: "dist/marionette.carpenter.js"

  
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-eco')

