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

    watch:
      files: '**/**.js.coffee'
      tasks: ['jasmine']

    jasmine:
      run:
        options:
          specs: ['dist/spec/**/*.js']

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-contrib-jasmine')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.registerTask('build', ['coffee', 'eco'])
  grunt.registerTask('spec',  ['build', 'jasmine'])
  grunt.registerTask('default', ['build'])