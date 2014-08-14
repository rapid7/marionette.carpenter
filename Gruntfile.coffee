# SPEC_FILES = require('fs').readdirSync('./dist/spec/').filter (f) -> f.match(/\.js$/)

module.exports = (grunt) ->

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    coffee:
      source:
        options:
          sourceMap: true
        expand: true
        cwd: 'src/'
        src: ['**/**.coffee']
        dest: 'dist/'
        ext: '.js'

      spec:
        options:
          sourceMap: true
        expand: true
        cwd: 'spec'
        src: ['*_spec.coffee']
        dest: 'dist/spec/'
        ext: '.js'

    eco:
      compile:
        options:
          amd: true
        expand: true
        cwd: 'src/templates/'
        src: ['*.eco']
        dest: 'dist/templates/'
        ext: '.js'

    requirejs:
      source:
        options:
          almond: true
          baseUrl: "dist/"
          name: "controllers/table_controller"
          include: ["controllers/table_controller"]
          out: "dist/marionette.carpenter.js"
          optimize: "none"
          generateSourceMaps: true

      spec:
        options:
          almond: true
          baseUrl: "dist/"
          include: ["spec/table_controller_spec.js", "spec/table_view_spec.js"]
          insertRequire: ["spec/table_controller_spec.js", "spec/table_view_spec.js"]
          out: "dist/spec/specs.js"
          optimize: "none"
          generateSourceMaps: true

    watch:
      files: ['src/**/**.coffee', 'src/**/**.eco', 'spec/**/**.coffee']
      tasks: ['spec']

    jasmine:
      run:
        options:
          specs: ['dist/spec/specs.js']
          summary: true

  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-contrib-jasmine')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.registerTask('build', ['coffee', 'eco','requirejs'])
  grunt.registerTask('spec',  ['build', 'jasmine'])
  grunt.registerTask('default', ['build'])
