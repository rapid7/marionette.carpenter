module.exports = (grunt) ->

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    clean:
      src: ['build', 'dist']

    copy:

      css:
        src: 'build/css/table-base.css'
        dest: 'dist/marionette.carpenter.css'

      foundationCss:
        src: 'build/css/table-foundation.css'
        dest: 'build/marionette.carpenter.foundation.css'

      proCss:
        src: 'build/css/table-pro.css'
        dest: 'build/marionette.carpenter.pro.css'

      js:
        expand: true
        nonull: false
        cwd: 'build/'
        src: ['marionette.carpenter.js', 'marionette.carpenter.require.js',]
        dest: 'dist/'

      # This makes me :-(, sass task doesn't parse css files so we generate a scss file.
      # The copy task also drops the . syntax in the copied file.
      cssAsScss:
        files: [
          expand:true
          cwd: 'bower_components'
          src: ['**/jquery.resizableColumns.css']
          dest: 'bower_components'
          filter: 'isFile'
          ext: '.resizableColumns.scss'
        ]

    coffee:
      source:
        options:
          sourceMap: false
          bare: true
        expand: true
        cwd: 'src/'
        src: ['**/**.coffee']
        dest: 'build/'
        ext: '.js'

      spec:
        options:
          sourceMap: false
        expand: true
        cwd: 'spec'
        src: ['**/**.coffee']
        dest: 'build/spec/'
        ext: '.js'

    eco:
      compile:
        options:
          amd: true
        expand: true
        cwd: 'src/templates/'
        src: ['*.eco']
        dest: 'build/templates/'
        ext: '.js'

    requirejs:
      build:
        options:
          almond: true
          baseUrl: "build/"
          name: "controllers/table_controller"
          include: ["controllers/table_controller"]
          out: "build/marionette.carpenter.js"
          optimize: "none"
          generateSourceMaps: false
          wrap:
            startFile: 'src/_start.js'
            endFile: 'src/_end.js'

      spec:
        options:
          almond: true
          baseUrl: "build/"
          include: [
            "spec/controllers/table_controller_spec.js"
            "spec/views/create_spec.js"
            "spec/views/control_bar_spec.js"
            "spec/views/row_spec.js"
            "spec/views/row_list_spec.js"
            "spec/views/paginator_spec.js"
            "spec/utilities/string_utils_spec.js"
          ]
          out: "build/spec/specs.js"
          optimize: "none"
          generateSourceMaps: true

    uglify:
      options:
        mangle: true
        screwIE8: true # always
      dist:
        files:
          "dist/marionette.carpenter.min.js": "dist/marionette.carpenter.js"

    concat:
      # "Fix up" our specs to load everything synchronously
      spec:
        src: ["build/spec/specs.js", "build/spec/require_stub.js"]
        dest: "build/spec/specs.js"
      base_css:
        src: ["build/css/table.css"]
        dest: "dist/marionette.carpenter.css"
      foundation_css:
        src: ["build/css/table-foundation.css"]
        dest: "dist/marionette.carpenter.foundation.css"

    watch:
      files: ['src/**/**.coffee', 'src/**/**.eco', 'spec/**/**.coffee']
      tasks: ['spec']

    jasmine:
      run:
        options:
          vendor: [
            'bower_components/jquery/dist/jquery.js'
            'bower_components/underscore/underscore.js'
            'bower_components/backbone/backbone.js'
            'bower_components/backbone.marionette/lib/backbone.marionette.js'
            'bower_components/backbone.radio/build/backbone.radio.js'
            'bower_components/cocktail/Cocktail.js'
            'bower_components/jasmine-set/jasmine-set.js'
            'bower_components/sinon/index.js'
          ]
          specs: ['build/spec/specs.js']
          summary: true

    sass:
      options:
        includePaths: [
          'bower_components/compass-mixins/lib'
          'bower_components/jquery-resizable-columns/dist'
        ]
        sourceMap: false
        style: 'compact'
      base:
        expand: true
        flatten: true
        src: ['./src/sass/table-base.scss']
        dest: './build/css'
        ext: '.css'
      foundation:
        expand: true
        flatten: true
        src: ['./src/sass/table-foundation.scss']
        dest: './build/css'
        ext: '.css'
      pro:
        expand: true
        flatten: true
        src: ['./src/sass/table-pro.scss']
        dest: './build/css'
        ext: '.css'


    imageEmbed:
      base:
        src: [ "./dist/marionette.carpenter.css" ]
        dest: "./dist/marionette.carpenter.css"
        options:
          baseDir: './assets'
      foundation:
        src: [ "./dist/marionette.carpenter.foundation.css" ]
        dest: "./dist/marionette.carpenter.foundation.css"
        options:
          baseDir: './assets'
      pro:
        src: [ "./dist/marionette.carpenter.pro.css" ]
        dest: "./dist/marionette.carpenter.pro.css"
        options:
          baseDir: './assets'

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-contrib-jasmine')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-sass')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-requirejs')
  grunt.loadNpmTasks('grunt-image-embed')
  grunt.loadNpmTasks('grunt-contrib-uglify')

  grunt.registerTask('style', ['clean', 'sass'])
  grunt.registerTask(
    'build',
    [
      'clean'
      'style'
      'coffee'
      'eco'
      'requirejs'
      'concat'
      'copy:js'
      'copy:css'
      'imageEmbed'
      'uglify'
    ]
  )
  grunt.registerTask('spec',  ['build', 'jasmine'])
  grunt.registerTask('default', ['build'])
