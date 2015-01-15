define [
  'templates/layout'
], (template) ->

  #
  # Contains the header, button bar, table, and pagination
  #
  class Layout extends Marionette.LayoutView

    template: template

    regions:
      headerRegion:             '.header-region'
      filterRegion:             '.filter-region'
      buttonsRegion:            '.buttons-region'
      tableRegion:              '.table-region'
      paginationRegion:         '.pagination-region'
      overlayRegion:            '.overlay-region'
      selectionIndicatorRegion: '.selection-indicator-region'

    events:
      'mouseenter td': 'mouseEnteredTableCell'
      'mouseenter th': 'mouseEnteredTableHeader'

    attributes:
      class: 'table-component foundation'

    #
    # @param opts [Object] the options hash
    # @option opts [Object]  :regions maps region names to DOM selectors
    # @option opts [Object]  :columns @see Controller#columns
    # @option opts [Object]  :collection @see Controller#collection
    # @option opts [Boolean] :selectable @see Controller#selectable
    #
    initialize: (opts={}) ->
      # merge in the defaults
      _.extend @regions, opts?.regions
      @controller =   opts
      @columns    =   opts.columns
      @collection =   opts.collection
      @selectable = !!opts.selectable

    serializeData: -> @

    mouseEnteredTableHeader: (e) =>
      @overlayRegion.reset()

    # Called when the user mouses over a new table cell. If this column
    # uses the :hoverView option, a hover overlay will be rendered next
    # to the table cell, and other overlays will be closed.
    mouseEnteredTableCell: (e) =>
      column = @_columnForTd(e.currentTarget)
      model = @_modelForTd(e.currentTarget)
      if column?.hoverView?
        if column?.hoverOn?
          # user can provide a hoverOn function to determine when to hover
          return unless column.hoverOn.call({ model: model, column: column })
        # Render this column's overlay
        hover = new column.hoverView(model: model, column: column)
        tdPosition = $(e.currentTarget).position()
        tdPosition.top += $(e.currentTarget).outerHeight()-2
        tdPosition.width = $(e.currentTarget).outerWidth()
        @overlayRegion.show(hover)
        @overlayRegion.$el?.css(tdPosition)
      else
        @overlayRegion.reset()

    # @return [Object] column data for the given <td> element
    _columnForTd: (td) =>
      colIdx = $(td).index()
      colIdx-- if @selectable
      @columns[colIdx]

    # @return [Object] model data for the given <td> element
    _modelForTd: (td) =>
      rowIdx = $(td).parent('tr').index()
      @collection.models[rowIdx]