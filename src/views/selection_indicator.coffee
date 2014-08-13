define [
  'templates/selection_indicator'
], ->

  #
  # The indicator of the number of selected items.
  #
  class SelectionIndicator extends Marionette.ItemView

    template: @::templatePath 'table/selection_indicator'

    # @param [Object] opts the options hash
    # @option opts [Object] :tableSelections data about the current state of the table
    # @option opts [Array<Entities.AjaxPaginatedCollection>, Array<Entities.StaticPaginatedCollection>]
    #   :tableCollection the collection currently managed by the table
    initialize: (opts = {}) ->
      @tableSelections = opts.tableSelections
      @tableCollection = opts.tableCollection

      # Events on `@tableCollection` for which the indicator should recalculate
      # the number of selected records.
      calculateEvents = [
        'selection_toggled'
        'select_all_toggled'
        'remove:multiple:after'
      ]

      _.each calculateEvents, (event) =>
        @listenTo @tableCollection, event, => @calculateNumSelected()

      # Events on `@tableCollection` for which the indicator should re-render.
      renderEvents = [
        'sync'
        'change:numSelected'
      ]
      _.each renderEvents, (event) =>
        @listenTo @tableCollection, event, => @render()

    # Calculate the number of currently selected records and update `@tableCollection.numSelected`
    calculateNumSelected: ->
      return 0 unless @tableCollection.totalRecords

      if @tableSelections.selectAllState
        numSelected = @tableCollection.totalRecords - Object.keys(@tableSelections.deselectedIDs).length
      else
        numSelected = Object.keys(@tableSelections.selectedIDs).length

      @tableCollection.updateNumSelected numSelected

    serializeData: ->
      numSelected:  @tableCollection.numSelected
      totalRecords: @tableCollection.totalRecords
