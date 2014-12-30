define [], ->

  createRegion = ->
    beforeEach ->
      @$el = $("<div />", id: 'table-region').appendTo($('body'))[0]
      @region = new Backbone.Marionette.Region(el: @$el)

    afterEach ->
      @region.destroy()
      @$el?.remove?()
