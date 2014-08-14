module.exports = (grunt) ->

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    clean:
      src: ['build']

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
        src: ['**/**.coffee']
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
          out: "dist/spec/specs.js"
          optimize: "none"
          generateSourceMaps: true

    concat:

      # "Fix up" our specs to load everything synchronously
      spec:
        src: ["dist/spec/specs.js", "dist/spec/require_stub.js"]
        dest: 'dist/spec/specs.js'


    watch:
      files: ['src/**/**.coffee', 'src/**/**.eco', 'spec/**/**.coffee']
      tasks: ['spec']

    jasmine:
      run:
        options:
          version: '1.3.1'
          vendor: [
            'bower_components/jquery/dist/jquery.js'
            'bower_components/underscore/underscore.js'
            'bower_components/underscore.string/dist/underscore.string.min.js'
            'bower_components/backbone/backbone.js'
            'bower_components/backbone.marionette/lib/backbone.marionette.js'
            'bower_components/backbone.paginator/dist/backbone.paginator.js'
            'bower_components/cocktail/Cocktail.js'
            'bower_components/jasmine-set/jasmine-set.js'
          ]
          outfile: 'SpecRunner.html'
          specs: ['dist/spec/specs.js']
          summary: true

    # In order to run the compass task, you must have the compass ruby gem installed.
    # Confirm you have Ruby installed and run: gem update --system && gem install compass
    compass:
      dist:
        options:
          sassDir: 'src/sass'
          cssDir: 'build/css'
          imagesDir: 'assets'
          relativeAssets: false
          outputStyle: 'expanded'
          noLineComments: true

  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-compass')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-jasmine')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-requirejs')

  grunt.registerTask('build', ['clean', 'coffee', 'eco', 'requirejs', 'concat'])
  grunt.registerTask('spec',  ['build', 'jasmine'])
  grunt.registerTask('style', ['clean', 'compass'])
  grunt.registerTask('default', ['build'])
