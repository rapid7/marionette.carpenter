define ['templates/table'], ->
  #
  # Render the table rows and columns
  #
  class Table.RowList extends Marionette.CompositeView

    template: @::templatePath 'table/table'

    itemView: Table.Row

    collectionEvents:
      sync: 'fetched'
      reset: 'fetched'

    ui:
      selectAllCheckbox: 'thead th.select-all input'
      rowCheckboxes:     'td.checkbox input'
      sortableColHeader: 'thead th.sortable'
      thead: 'thead'
      table: 'table'

    events:
      'click  @ui.selectAllCheckbox': 'toggleSelectAll'
      'click  @ui.rowCheckboxes':     'selectIntermediateCheckboxes'
      'click  th.sortable':           'sortChanged'

    itemViewContainer: 'tbody'

    # @property [String] the attribute name of the current sort column
    sortColumn: null

    # @property [String] (asc|desc) the current sort direction direction
    sortDirection: null

    attributes:
      class: 'wrap'

    # @param opts [Object] the options hash
    # @option opts :columns [Array<Object>] @see TableController#columns
    # @option opts :selectable [Boolean] @see Table.Controller#selectable
    # @option opts :static [Boolean] @see TableController#static
    # @option opts :collection [Backbone.Paginator.requestPager, Backbone.Paginator.clientPager]
    #   the PaginatedCollection to render in the table
    # @option opts :loadingView [Backbone.View] the view to display during initial load
    # @option opts :emptyView [Backbone.View] the view to display when empty
    # @option opts [Object] :tableSelections data about the current state of the table
    initialize: (opts={}) ->
      @columns         =   opts.columns
      @static          = !!opts.static
      @selectable      = !!opts.selectable
      @tableSelections =   opts.tableSelections
      @emptyView       =   opts.emptyView || Table.Empty
      @loadingView     =   opts.loadingView || Table.Loading

      @setSort(@collection.sortColumn, @collection.sortDirection, noReload: true)

      # Initialize some objects for caching checkbox selection state.
      if @selectable
        @selectedIDs = {}
        @deselectedIDs = {}

      unless @static
        # display the LoadingView if necessary
        @originalEmptyView = @emptyView
        @emptyView = @loadingView

      @listenTo @collection, 'remove:multiple:after', =>
        @handleRemoveMultiple()

    # Callback for when the sort direction was changed by the user. Triggers a method
    #   on the controller, which determines what to do and calls back to #setSort.
    #
    # @return [void]
    sortChanged: (e) =>
      sortIdx = $(e.currentTarget).index()
      if @selectable then sortIdx--
      @trigger 'table:sort',
        attribute: @columns[sortIdx]?.attribute

    # Sets the sort options on the collection and adds CSS classes as necessary
    #
    # @param attr [String] the column attribute to sort by
    # @param dir [String] (asc|desc) the sort direction
    # @param opts [Hash] the options hash
    # @option opts :noReload [Boolean] don't reload the collection after changing
    setSort: (@sortColumn, @sortDirection, opts={}) =>
      sortIdx = _.indexOf(@columns, _.findWhere(@columns, attribute: @sortColumn))
      if @selectable then sortIdx++
      @$el.find('thead th')
        .removeClass('sort asc desc')
        .eq(sortIdx)
        .addClass("sort #{@sortDirection}")
      if @selectable then sortIdx--
      unless opts.noReload
        @collection.setSort(@sortColumn, @sortDirection, @columns[sortIdx]?.sortAttribute)

    #
    # Trigger a search of the models in the table based on the state of the {Entities.Filter}.
    #
    # @param filter [Entities.Filter] the table's current filter
    setSearch: (filter) ->
      @collection.setSearch filter

    #
    # Fetch the checkbox elements within the table rows.
    #
    # @note This can't live within the UI hash, as only elements rendered
    #   specifically by the CompositeView are accessible there, unless you're
    #   simply binding events to those elements.
    #
    # @return [Array<Object>] all of the selector checkboxes within the table rows
    getRowCheckboxes: ->
      @$el.find('td.checkbox input')

    #
    # Toggle selection state of every model in the collection, and reset
    # the state selections object. Fire an event on the collection.
    #
    # @return [void]
    toggleSelectAll: ->
      $rowCheckboxes = @getRowCheckboxes()

      if @ui.selectAllCheckbox.prop 'checked'
        @tableSelections.selectAllState = true
        @tableSelections.deselectedIDs = {}
        _.each @collection.models, (model) -> model.set('selected', true)
      else
        @tableSelections.selectAllState = false
        @tableSelections.selectedIDs = {}
        _.each @collection.models, (model) -> model.set('selected', false)

      # TODO: This event needs to be documented... but where? On both types of collection?
      @collection.trigger 'select_all_toggled'

      # Ensure we always return true (and don't prevent bubbling).
      return true

    #
    # If the shift key is held down, set all checkboxes between the target
    # checkbox and the nearest also-selected checkbox to the new state of the
    # target checkbox.
    #
    # @return [void]
    selectIntermediateCheckboxes: (e) ->
      if window.event.shiftKey && @previouslySelected
        newState  = $(e.target).is(':checked')
        $previousRows   = $(e.target).parents('tr').prevAll()
        $subsequentRows = $(e.target).parents('tr').nextAll()
        $previouslySelectedCheckbox = $('tr').find(@previouslySelected)

        if $previousRows.has($previouslySelectedCheckbox).length > 0
          $(e.target).parents('tr').prevUntil($('tr').has($previouslySelectedCheckbox))
            .find('td.checkbox input').attr('checked', newState).change()
        else if $subsequentRows.has($previouslySelectedCheckbox).length > 0
          $(e.target).parents('tr').nextUntil($('tr').has($previouslySelectedCheckbox))
          .find('td.checkbox input').attr('checked', newState).change()

      @previouslySelected = $(e.target)

    #
    # If there are no entities left in the collection, deselect the select all
    # checkbox.
    #
    # @return [void]
    handleRemoveMultiple: ->
      @ui.selectAllCheckbox.attr('checked', false) if @collection.length == 0

    #
    # If the EmptyView was replaced with a LoadingView, revert that
    # replacement to actually show a message on empty collection.
    # Called after any change to the collection.
    fetched: =>
      if @originalEmptyView
        @emptyView = @originalEmptyView
        @originalEmptyView = null
        @render() # replace any necessary views!

    #
    # Overriden to allow passing options to the rendered ItemView
    buildItemView: (item, ItemView) ->
      new ItemView
        model: item
        columns: @columns
        selectable: @selectable
        tableSelections: @tableSelections
        serverAPI: @collection.server_api

    serializeData: -> @

    onRender: ->
      @ui.table.resizableColumns()

      # Add a tooltip to the select all checkbox, if the table is selectable.
      if @selectable
        @ui.selectAllCheckbox.tooltip
          tooltipClass: 'select-all-tooltip'
          position:
            at: 'left+40 top-30'