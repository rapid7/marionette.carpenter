define ['templates/row'], (template) ->
  #
  # Render a single row (per model in the collection)
  #
  # @event table:row:selection_toggled
  #   Emitted when this row's checkbox is toggled. Also emitted as `selection_toggled`
  #   on the model.
  #   @param model [Entities.model] the row's associated model
  # @event table:row:selected
  #   Emitted when this row's checkbox is selected. Also emitted as `selected`
  #   on the model.
  #   @param model [Entities.model] the row's associated model
  # @event table:row:deselected
  #   Emitted when this row's checkbox is deselected. Also emitted as `deselected`
  #   on the model.
  #   @param model [Entities.model] the row's associated model
  class Row extends Marionette.Layout

    template: template

    tagName: 'tr'

    ui:
      checkbox: 'td.checkbox input'

    events:
      'change @ui.checkbox': 'triggerSelectionEvents'

    modelEvents:
      'change:selected': 'selectionStateChanged'

    # @param opts [Object] the options hash
    # @option opts :columns [Array<Object>] @see TableController#columns
    # @option opts :selectable [Boolean] @see Table.Controller#selectable
    # @option opts [Object] :tableSelections data about the current state of the table
    initialize: (opts={}) ->
      @app             =   opts.app
      @columns         =   opts.columns
      @selectable      = !!opts.selectable
      @tableSelections =   opts.tableSelections
      @serverAPI       =   opts.serverAPI
      @setInitialSelectionState()

      # dynamically add regions for each column that needs a View
      _.each @columns, (column, idx) =>
        if column.view?
          @addRegion(@regionName(idx), "td.#{@regionName(idx)}")

    # Ensure the checkbox changes when the model:selected attribute is changed
    selectionStateChanged: =>
      # make this a nop if the dom is already consistent
      return if !!@ui.checkbox.prop('checked') is @model.get('selected')
      @ui.checkbox.prop('checked', @model.get('selected'))
      @recordSelectionState()

    #
    # Set the value of `@selected` on the model based on the cached selections.
    #
    # @return [void]
    setInitialSelectionState: ->
      return false unless @selectable

      if @tableSelections.selectAllState
        @model.set 'selected', !(@model.id of @tableSelections.deselectedIDs), silent: true
      else
        @model.set 'selected', @model.id of @tableSelections.selectedIDs, silent: true

    #
    # Set the value of `@selected` on the model when the checkbox value changes.
    #
    # @return [void]
    setSelectionState: ->
      if @ui.checkbox.prop 'checked'
        @model.set 'selected', true
      else
        @model.set 'selected', false

    #
    # Record this model's ID in the list of selected or deselected IDs.
    #
    # @return [void]
    # TODO: Test this method.
    recordSelectionState: ->
      # If we are currently in 'select all' mode...
      if @tableSelections.selectAllState
        # ...remove the ID from the list of deselected IDs if we've selected it.
        if @ui.checkbox.prop 'checked'
          delete @tableSelections.deselectedIDs[@model.id]
        # ...add the ID to the list of deselected IDs if we've deselected it.
        else
          @tableSelections.deselectedIDs[@model.id] = true
        # If we aren't in 'select all' mode...
      else
        # ...add the ID to the list of selected IDs if we've selected it.
        if @ui.checkbox.prop 'checked'
          @tableSelections.selectedIDs[@model.id] = true
          # ...remove the ID from the list of selected IDs if we've deselected it.
        else
          delete @tableSelections.selectedIDs[@model.id]

    #
    # Trigger events regarding the selection of the row.
    #
    # @return [void]
    triggerSelectionEvents: =>
      @setSelectionState()
      @recordSelectionState()

      @app.vent.trigger 'table:row:selection_toggled', @model
      @model.trigger 'selection_toggled'

      if !@ui.checkbox.prop 'checked'
        @app.vent.trigger 'table:row:deselected', @model
        @model.trigger 'deselected'
      else
        @app.vent.trigger 'table:row:selected', @model
        @model.trigger 'selected'

    # Render any columns that had an associated View classes
    onShow: =>
      _.each @columns, (column, idx) =>
        if column.view?
          # See application_controller.js. Since we didn't use
          # controller/view pattern for nested views we gotta repo the logic here :-(
          #
          # allow us to pass in a controller instance instead of a view
          # if controller instance
          viewOpts = _.extend {}, column.viewOpts
          _.extend viewOpts,
            model: @model
            column: column
            collection: @model.collection
            serverAPI: @serverAPI

          view = new column.view viewOpts

          #Get view from Controller if view was a controller
          controller = if view.getMainView then view else null
          view = if view.getMainView then view.getMainView() else view
          throw new Error("getMainView() did not return a view instance or #{view?.constructor?.name} is not a view instance") if not view

          #Bind Controller to view close event if view passed in was a controller
          if controller?
            @listenTo view, "close", controller.close

          #Show view in region
          @[@regionName(idx)].show(view)

    # Maps a column => region name for nested Views
    #
    # @param idx [Number] the index of the column
    # @return [String] the name of the dynamically added region for the column at +idx+
    regionName: (idx) -> "cell#{idx}"

    # Pass ourselves to the view for rendering
    #
    # @return [Object] data for rendering in the view
    serializeData: -> @
