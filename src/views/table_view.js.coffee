define [
  'jquery'
  'resizable_columns'
  'base_layout'
  'base_itemview'
  'base_collectionview'
  'base_compositeview'
  'lib/components/table/templates/layout'
  'lib/components/table/templates/header'
  'lib/components/table/templates/table'
  'lib/components/table/templates/action_button'
  'lib/components/table/templates/control_bar'
  'lib/components/table/templates/row'
  'lib/components/table/templates/empty'
  'lib/components/table/templates/paginator'
  'lib/components/table/templates/selection_indicator'
  'lib/components/table/templates/loading'
  'lib/concerns/views/filter_toggle'
  'lib/concerns/views/filter_custom_query_field'
], ($) ->

  @Pro.module "Components.Table", (Table, App, Backbone, Marionette, $, _) ->

    #
    # Contains the header, button bar, table, and pagination
    #
    class Table.Layout extends App.Views.Layout

      template: @::templatePath('table/layout')

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
      # @option opts [Object]  :columns @see Table.Controller#columns
      # @option opts [Object]  :collection @see Table.Controller#collection
      # @option opts [Boolean] :selectable @see Table.Controller#selectable
      #
      initialize: (opts={}) ->
        # merge in the defaults
        _.extend @regions, opts?.regions
        @columns    =   opts.columns
        @collection =   opts.collection
        @selectable = !!opts.selectable

      serializeData: -> @

      mouseEnteredTableHeader: (e) =>
        @overlayRegion.close()

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
          @overlayRegion.close()

      # @return [Object] column data for the given <td> element
      _columnForTd: (td) =>
        colIdx = $(td).index()
        colIdx-- if @selectable
        @columns[colIdx]

      # @return [Object] model data for the given <td> element
      _modelForTd: (td) =>
        rowIdx = $(td).parent('tr').index()
        @collection.models[rowIdx]

    #
    # Display a title and an optional search/filter area
    #
    class Table.Header extends App.Views.ItemView

      template: @::templatePath 'table/header'

      attributes:
        class: 'table-header'

      # @param [Object] opts the options hash
      # @option opts :title [String] @see {Table.Controller#title}
      # @option opts :searchable [Boolean] @see {Table.Controller#searchable}
      # @option opts [Array<Entities.AjaxPaginatedCollection>, Array<Entities.StaticPaginatedCollection>]
      #   :tableCollection the collection currently managed by the table
      initialize: (opts={}) ->
        @title      =   opts.title
        @taggable   = !!opts.taggable

      serializeData: -> @

    class Table.Filter extends App.Views.ItemView
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

      onClose: ->
        App.vent.off @filterToggleEvent

    #
    # The indicator of the number of selected items.
    #
    class Table.SelectionIndicator extends App.Views.ItemView

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

    #
    # The action buttons in the control bar
    #
    class Table.ActionButton extends App.Views.ItemView

      template: @::templatePath 'table/action_button'

      tagName: 'li'

      className: -> ( @model.get('containerClass') )

      modelEvents:
        'change:disabled': 'render'

      events:
        'click': 'executeClickActions'

      # @param [Object] opts the options hash
      # @option opts [Boolean] :selectable @see Table.Controller#selectable
      # @option opts [Object] :tableSelections data about the current state of the table
      # @option opts [Array<Entities.AjaxPaginatedCollection>, Array<Entities.StaticPaginatedCollection>]
      #   :tableCollection the collection currently managed by the table
      initialize: (opts) ->
        @selectable      = !!opts.selectable
        @tableCollection =   opts.tableCollection
        @tableSelections =   opts.tableSelections

        @listenTo @tableCollection, 'selection_toggled', () =>
          @setActivationState()
        @listenTo @tableCollection, 'select_all_toggled', () =>
          @setActivationState()

      #
      # Set the activation state of the button.
      #
      # @param rowModel [Backbone.Model] the model for the last-clicked table row
      #
      # @return [void]
      setActivationState: (rowModel) ->
        activateOn = @model.get 'activateOn'

        # If the table does not enable checkboxes, or if activateOn is not specified,
        # the button should always be enabled.
        if !@selectable || !activateOn
          @model.enable()
          return false

        # Determine the current state of the selections.
        # NB: This uses Object.keys(obj).length, which happens in O(n) time, but
        # that should be fine unless somebody decides to click a checkbox thousands
        # of times.
        numSelected         = @tableCollection.numSelected
        moreThanOneSelected = @tableSelections.selectAllState || numSelected > 1
        oneSelected         = numSelected == 1

        if activateOn == 'any' && ( oneSelected || moreThanOneSelected )
          @model.enable()
        else if activateOn == 'many' && moreThanOneSelected
          @model.enable()
        else if ( activateOn == 'one' && oneSelected ) && !@tableSelections.selectAllState
          @model.enable()
        else
          @model.disable()

      #
      # Execute any callbacks or global event triggers.
      #
      # @return [void]
      executeClickActions: ->
        # If disabled not defined, or if disabled false
        if (!@model.get('disabled')?) or (@model.get('disabled')? and !@model.get('disabled'))
          @executeCallback()
          @executeTrigger()


      #
      # Execute the global event trigger.
      #
      # @return [void]
      executeTrigger: ->
        if @model.get 'event'
          App.trigger @model.get('event')

      #
      # Execute this button's associated callback, passing the table selection data
      # if needed.
      #
      # @return [void]
      #
      # TODO: Due to callback ordering, selectedIDs and deselectedIDs aren't being cleared
      # out on "select all" selection. Not a big deal, since we only care about one
      # or the other at a time.
      executeCallback: ->
        return false unless @model.get 'click'
        if @selectable
          # Gather the data needed as arguments to the callback.
          selectAllState = @tableSelections.selectAllState
          # NB: Object.keys runs in O(n) time
          selectedIDs    = Object.keys @tableSelections.selectedIDs
          deselectedIDs  = Object.keys @tableSelections.deselectedIDs
          selectedVisibleCollection = new Backbone.Collection @tableCollection.filter (model) ->
            model.id in selectedIDs

          @model.get('click')(
            selectAllState,
            selectedIDs,
            deselectedIDs,
            selectedVisibleCollection,
            @tableCollection
          )

        else
          @model.get('click')()

    #
    # Hold the action and tag buttons
    #
    class Table.ControlBar extends App.Views.CompositeView

      template: @::templatePath 'table/control_bar'

      itemView: Table.ActionButton

      tagName: 'ul'

      className: 'table-control-bar'

      # @param [Object] opts the options hash
      # @option opts :selectable [Boolean] @see {Table.Controller#selectable}
      # @option opts :renderFilterControls [Boolean] @see {Table.Controller#renderFilterControls}
      # @option opts :filterCustomQueryEvent [String] @see {Table.Controller#filterCustomQueryEvent}
      # @option opts [Entities.ActionButtonsCollection] :actionButtonsCollection
      # @option opts [Object] :tableSelections data about the current state of the table
      # @option opts [Array<Entities.AjaxPaginatedCollection>, Array<Entities.StaticPaginatedCollection>]
      #   :tableCollection the collection currently managed by the table
      initialize: (opts={}) ->
        @collection             = opts.actionButtonsCollection
        @columns                = opts.columns
        @tableSelections        = opts.tableSelections
        @tableCollection        = opts.tableCollection
        @renderFilterControls   = !!opts.renderFilterControls
        @filterCustomQueryEvent = opts.filterCustomQueryEvent
        @filterToggleEvent      = opts.filterToggleEvent
        @selectable             = !!opts.selectable

        super

      #
      # Pass the `reqres` request event bus down to the item view.
      #
      # @return [Marionette.ItemView] the item's view
      buildItemView: (item, ItemViewType, itemViewOptions) ->
        defaultOptions =
          tableSelections: @tableSelections
          tableCollection: @tableCollection
          selectable: @selectable
          model: item

        options = _.extend(defaultOptions, itemViewOptions)
        new ItemViewType(options)

      serializeData: -> @

      @include "FilterToggle"
      @include "FilterCustomQueryField"

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
    class Table.Row extends App.Views.Layout

      template: @::templatePath 'table/row'

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
      triggerSelectionEvents: ->
        @setSelectionState()
        @recordSelectionState()

        App.vent.trigger 'table:row:selection_toggled', @model
        @model.trigger 'selection_toggled'

        if !@ui.checkbox.prop 'checked'
          App.vent.trigger 'table:row:deselected', @model
          @model.trigger 'deselected'
        else
          App.vent.trigger 'table:row:selected', @model
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

    #
    # Shown when the collection is empty
    #
    class Table.Empty extends App.Views.ItemView

      template: @::templatePath 'table/empty'

      tagName: 'tr'

      attributes:
        class: 'empty'

    #
    # Show a loading animation. Used as the EmptyView for non-static collections
    # until something is fetched.
    #
    class Table.Loading extends App.Views.ItemView

      template: @::templatePath 'table/loading'

      tagName: 'tr'

    #
    # Render the table rows and columns
    #
    class Table.RowList extends App.Views.CompositeView

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

    #
    # Render the pagination controls
    #
    class Table.Paginator extends App.Views.ItemView

      # When the 'All rows' option is selected, we pass this as the
      # "max rows" variable to the server
      @ALL_MAGIC: '99999999'

      template: @::templatePath 'table/paginator'

      attributes:
        class: 'paginator'

      ui:
        next:      '.page_navigation a.next'
        previous:  '.page_navigation a.previous'
        last:      '.page_navigation a.last'
        first:     '.page_navigation a.first'
        pageInput: '.page_navigation input'
        perPage:   '.row_select select'

      triggers:
        'click @ui.first':      'table:first'
        'click @ui.last':       'table:last'
        'click @ui.next':       'table:next'
        'click @ui.previous':   'table:previous'
        'change @ui.perPage':   'table:setPerPage'
        'change @ui.pageInput': 'table:pageInputChanged'
        'keyup @ui.pageInput':  'table:pageInputChanged'

      events:
        'click @ui.pageInput': 'pageInputClicked'

      # @property [Array<Number,"All">] @see TableController#perPage
      perPage: 20

      # @property [Array<Number,"All">] @see TableController#perPageOptions
      perPageOptions: [20, 50, 100, 'All']

      # @param opts [Object] the options hash
      # @option opts :perPageOptions @see TablePaginator#perPageOptions
      # @option opts :static @see TableController#static
      # @option opts :collection [Backbone.Paginator.requestPager, Backbone.Paginator.clientPager]
      #   the PaginatedCollection to render in the table
      initialize: (opts={}) ->
        @collection     =   opts.collection
        @perPageOptions =   opts.perPageOptions || @perPageOptions
        @perPage        =   opts.perPage || @perPage
        @static         = !!opts.static

        unless _.contains(@perPageOptions, @perPage)
          @perPageOptions.unshift(@perPage)

        if @static
          @collection.howManyPer(@perPage)
        else
          @collection.perPage = @perPage

        @listenTo @collection, 'sync', @render
        @listenTo @collection, 'reset', @render

      # select the entirety of the input field when clicked for easy replacement
      pageInputClicked: (e) ->
        $(e.currentTarget).select()

      serializeData: ->
        totalRecords = @collection.totalRecords || @collection?.origModels?.length || 0
        lastRow = Math.min(@collection.currentPage*@collection.perPage, totalRecords)
        _.extend {}, @, @collection,
          totalRecords: totalRecords
          lastRow: lastRow
          isLastPage: lastRow is totalRecords
          isFirstPage: @collection.currentPage is 1
          ALL_MAGIC: Table.Paginator.ALL_MAGIC
