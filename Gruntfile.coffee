module.exports = (grunt) ->

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    coffee:
      source:
        options:
          sourceMap: true
        expand: true
        cwd: 'src/'
        src: ['**/**.js.coffee']
        dest: 'dist/'
        ext: '.js'

      specs:
        options:
          sourceMap: true
        expand: true
        cwd: 'spec'
        src: ['*.js.coffee']
        dest: 'dist/spec/'
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
          optimize: "none"
          generateSourceMaps: true

    watch:
      files: '**/**.js.coffee'
      tasks: ['jasmine']

    jasmine:
      run:
        options:
          specs: ['dist/spec/**/*.js']

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-contrib-jasmine')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.registerTask('build', ['coffee', 'eco','requirejs'])
  grunt.registerTask('spec',  ['build', 'jasmine'])
  grunt.registerTask('default', ['build'])

