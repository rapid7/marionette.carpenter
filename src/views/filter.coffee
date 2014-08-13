define [], ->

  class Filter extends Marionette.ItemView
    ui:
      textInputs:        'input[type=text], textarea'
      checkboxes:        'input[type=checkbox]'
      selectInputs:      'select'
      filter:            '.filter'
      filterCols:        '.filter-column'
      resetLink:         'a.filter-reset'
      hideOnResetInputs: 'input.hide-on-reset'

    events:
      'keyup @ui.textInputs':    'inputActivity'
      'change @ui.selectInputs': 'inputActivity'
      'change @ui.checkboxes':   'inputActivity'
      'click @ui.resetLink':     'resetFilter'

    modelEvents:
      'change': 'triggerSearch'

    #
    # @param [Object] opts the options hash
    # @option opts :filterTemplatePath [String] @see {Table.Controller#filterTemplatePath}
    # @option opts :filterModel [Entities.Filter] a model to store the state of the filter
    # @option opts :filterAttrs [Object] @see {Table.Controller#filterAttrs}
    # @option opts :filterToggleEvent [String] @see {Table.Controller#filterToggleEvent}
    # @option opts :filterCustomQueryEvent [String] @see {Table.Controller#filterCustomQueryEvent}
    # @option opts :collection [Entities.AjaxPaginatedCollection] @see {Table.Controller#collection}
    initialize: (opts={}) ->
      @app      = opts.app
      @template = @templatePath(opts.filterTemplatePath)
      @model = opts.filterModel
      @filterToggleEvent = opts.filterToggleEvent
      @filterCustomQueryEvent = opts.filterCustomQueryEvent
      @filterAttrs = opts.filterAttrs
      @collection = opts.collection

      App.vent.on @filterToggleEvent, @toggleFilter if @filterToggleEvent
      App.vent.on @filterCustomQueryEvent, (customQuery) => @updateModel(customQuery) if @filterCustomQueryEvent

    #
    # Called when any activity occurs in an input field. Debounces searches to
    # prevent new calls on each key press.
    #
    # @return [void]
    inputActivity: ->
      @debouncedUpdateModel ||= _.debounce(@updateModel, 1000)
      @debouncedUpdateModel()

    #
    # Prepare `Backbone.Syphon` with the appropriate input readers.
    #
    # @return [void]
    prepareInputReaders: ->
      @filterInputReaderSet = new Backbone.Syphon.InputReaderSet()
      @filterInputReaderSet.registerDefault ($el) ->
        $el.val()
      @filterInputReaderSet.register 'checkbox', ($el) ->
        if $el.attr('checked')
          $el.data 'filter-value'

    #
    # Prepare `Backbone.Syphon` with the appropriate input writers.
    #
    # @return [void]
    prepareInputWriters: ->
      @filterInputWriterSet = new Backbone.Syphon.InputWriterSet
      @filterInputWriterSet.registerDefault ($el, value) ->
        $el.val(value)
      @filterInputWriterSet.register 'checkbox', ($el, value) =>
        @ui.checkboxes.filter("[data-filter-value='#{value}']").attr('checked', true)

    #
    # Update the filter's model with the data from the form elements in the
    # filter's template and the custom query field.
    #
    # @param customQuery [String] a custom string query
    #
    # @return [void]
    updateModel: (customQuery) ->
      # Register new input readers that will properly read checkboxes.
      @prepareInputReaders()

      # Grab the data from the form elements.
      data = Backbone.Syphon.serialize @, inputReaders: @filterInputReaderSet

      # Add the custom search query, if one exists.
      _.extend(data, custom_query: customQuery)

      # Set the table collection back to page 1, so we aren't paging beyond the available
      # records.
      @collection.currentPage = 1

      # Save the data to the model (and trigger a search request).
      @model.set(data)

    #
    # Trigger a search of the table based on the current state of the filter.
    #
    # @return [void]
    triggerSearch: ->
      @trigger 'table:search', @model

    #
    # Handle the situation in which filter parameters have been added to the querystring
    # (meaning the filter should be displayed and loaded with the appropriate values).
    #
    # @return [void]
    handleFilterOnLoad: ->
      @prepareInputWriters()

      # Load the data into the form elements.
      Backbone.Syphon.deserialize @, @model.attributes, inputWriters: @filterInputWriterSet

      # Display the filter.
      @toggleFilter()

    #
    # Add the appropriate styling classes to any .filter-column divs.
    #
    # @return [void]
    addFilterColumnClasses: ->
      filterClass = switch @ui.filterCols.length
        when 5 then 'columns-5'
        when 4 then 'columns-4'
        when 3 then 'columns-3'

      @ui.filterCols.addClass filterClass

    #
    # Toggle display of the filter.
    #
    # @return [void]
    toggleFilter: =>
      @ui.filter.toggle()

    #
    # Reset the filter to a blank state.
    #
    # @return [void]
    resetFilter: =>
      @ui.textInputs.val ''
      @ui.selectInputs.val ''
      @ui.checkboxes.attr 'checked', false
      @ui.hideOnResetInputs.css 'visibility', 'hidden'

      @updateModel()

    onRender: ->
      @addFilterColumnClasses()

      if @filterAttrs
        @handleFilterOnLoad()

    onClose: =>
      @app.vent.off @filterToggleEvent