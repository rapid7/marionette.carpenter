define [
  'jquery'
  'base_controller'
  'backbone_chooser'
  'lib/components/table/entities/paginated_collection'
  'lib/components/table/entities/action_buttons'
  'lib/components/table/entities/filter'
  'lib/components/table/table_view'
], ($) ->

  @Pro.module "Components.Table", (Table, App) ->

    class Table.Controller extends App.Controllers.Application

      # @property [Boolean] allow the table to be searched from the header
      searchable: true

      # @property [Boolean] allow checkbox selection of table rows
      selectable: false

      # @property [String] the path to the (optional) template for the Table.Filter view
      filterTemplatePath: ''

      # @property [Boolean] allow rows in the table to be tagged
      taggable: false

      # @property [String] text to show in the table header
      title: null

      # @property [Boolean] do not use AJAX to sync the models
      static: false

      # @property [String] attribute name of the default sorted column
      #   Defaults to the first sortable column if this property is null.
      defaultSort: null

      # @property [Array<Object>] data used to render the table header buttons
      #
      # Array of option hashes for rendering the action buttons above the form.
      # Should contain an array of Objects with the following properties:
      #
      # <ul>
      #   <li>label          - [String] the text displayed in the button
      #   <li>click          - [Function] Callback fn for the click event. Receives `selectAllState`,
      #                          `selectedIDs`, `deselectedIDs`, 'selectedVisibleCollection`,
      #                          and 'tableCollection` arguments
      #   <li>id             - [String] a CSS id to apply to the button
      #   <li>class          - [String] one or more CSS classes to apply to the button
      #   <li>containerClass - [String] one or more CSS classes to apply to the button's
      #                          containing element
      #   <li>event          - [String] an event name to trigger on the global event bus when the
      #                          button is clicked
      #   <li>activateOn     - [String] (any|one|many) enable/disable this button based
      #                          on how many rows are selected. This is a noop
      #                          if #selectable is false. If no option is passed,
      #                          button will always remain enabled.
      # </ul>
      actionButtons: []

      # @property [Array<Object>] data used to render the table columns
      #
      # Array of option hashes for rendering the columns in the table.
      # Should contain an array of Objects with the following properties:
      #
      # <ul>
      #   <li>label            - [String] the text displayed in the column
      #   <li>attribute        - [String] the model attribute that is displayed in this column
      #   <li>sortAttribute    - [String] a separate string that is sent to the server as a sort key
      #   <li>sortable         - [Boolean] enable the user to sort by this column (true)
      #   <li>defaultDirection - [String] (asc|desc) default sort direction
      #   <li>view             - [Class] subclass of Backbone.View that will be rendered in this column
      #   <li>viewOpts         - [Object] any options to pass to the `view` when it's instantiated
      #   <li>hoverView        - [Class] subclass of Backbone.View that will be rendered as an overlay on hover
      #   <li>hoverOn          - [Function] that returns Boolean of whether to display the HoverView on hover
      #   <li>render           - [Function] callback function that accepts the model and
      #                                 returns HTML markup for rendering
      # </ul>
      columns: []

      # @property [Array<Number,"All">] choices in the "Display" dropdown
      perPageOptions: [20, 50, 100, 'All']

      # @property [Number] the number of rows to show per page by default.
      # Must be an element of the #perPageOptions array.
      perPage: 20

      # @property [Object] of defaults that are applied to every column definition
      columnDefaults:
        sortable: true
        escape: true
        defaultDirection: 'desc'

      #
      # Layouts and Views
      #

      # @property [Table.Header] the table header view
      header: null

      # @property [Table.ControlBar] the control bar view
      buttons: null

      # @property [Table.RowList] the row list view (contains the &lt;table&gt;)
      list: null

      # @property [Table.Paginator] the paginator view
      paginator: null

      # Create a new instance of TableController and adds it to
      # the main region of the local Application.
      #
      # @param [Object] opts the options hash
      # @option opts :collection             [Backbone.Collection] a collection to render
      # @option opts :static                 [Object] do not fetch the collection over ajax (default: false)
      # @option opts :regions                [Object] maps region names to DOM selectors
      # @option opts :actionButtons          [Object] @see #actionButtons
      # @option opts :columns                [Object] @see #columns
      # @option opts :region                 [Marionette.Region] the region to render into
      # @option opts :currentPage            [Number] the current page to display
      # @option opts :perPage                [Number] number of rows per page
      # @option opts :perPageOptions         [Array<Number,String>] choices in the "Display" dropdown
      # @option opts :selectable             [Boolean] whether or not to display check boxes in each row
      # @option opts :renderFilterControls   [Boolean] whether or not to render the filter toggle and search box
      #                                        (default: false)
      # @option opts :filterTemplatePath     [String] the path to the template for the table filter view
      # @option opts :filterView             [Object] a custom filter view class
      # @option opts :filterToggleEvent      [String] the event to listen to on `App.vent` which should toggle
      #                                        display of the table's filter
      # @option opts :filterCustomQueryEvent [String] the event to listen to on `App.vent` which should toggle
      #                                        a custom query search
      # @option opts :filterAttrs            [Object] the attributes representing the initial state of the filter
      #                                        on table load
      initialize: (opts={}) ->
        # merge in any specified overrides
        _.extend @, opts

        # apply column defaults
        _.each @columns, (column) =>
          _.defaults(column, @columnDefaults)
          _.defaults(column, label: _.str.humanize(column.attribute))

        # ensure @static is a Boolean
        @static = !!@static

        # clone the collection into a relevant PaginatedCollection
        PagerClass = App.Entities.CreatePaginatedCollectionClass(@collection, @)
        @collection = new PagerClass(@collection.models)
        @collection.rebind?() # crappy workaround to my class wrapping

        # container for different parts of our table
        @setMainView(new Table.Layout(@))

        # set default options on the PaginatedCollection
        @collection.perPage = @perPage

        # Set default sorting/styles on the list
        @collection.sortColumn = @defaultSortColumn().attribute
        @collection.sortDirection = @defaultSortDirection()
        @collection.updateSortKey() unless @static

        # Initialize some objects on the collection for caching checkbox selection state.
        @tableCollection = @collection
        @tableSelections = {}
        if @selectable
          @tableSelections.selectAllState = false
          @tableSelections.selectedIDs = {}
          @tableSelections.deselectedIDs = {}

        # create a collection of action buttons for the control bar
        @actionButtonsCollection = App.request 'new:action_buttons:entities', opts.actionButtons

        # create a filter for storing the search state
        if @filterEnabled()
          @filterModel = App.request 'new:filter:entity', @filterAttrs

        # build the new table
        @header             = new Table.Header(@)
        @buttons            = new Table.ControlBar(@)
        @list               = new Table.RowList(@)
        @paginator          = new Table.Paginator(@)
        @selectionIndicator = new Table.SelectionIndicator(@) if @selectable

        if @filterEnabled()
          if @filterView
            @filter = new @filterView(@)
          else
            @filter = new Table.Filter(@)

        @listenTo @collection, 'reset',  => @toggleInteraction true
        @listenTo @collection, 'sync',   => @toggleInteraction true
        @listenTo @collection, 'change', => @toggleInteraction true

        # Don't listen to 'remove', as it's called for each model in the collection on
        # each page change. Listen to 'remove:multiple', instead.
        @listenTo @collection, 'remove:multiple', (removedIDs) =>
          _.each removedIDs, (id) =>
            # Remove the id from the selected IDs.
            delete @tableSelections.selectedIDs[id]
          # Trigger a refresh of the selection indicator.
          @collection.trigger 'remove:multiple:after'
          # Sync the table.
          @toggleInteraction false
          @tableCollection.fetch()

        # wire the pieces together
        @listenTo @getMainView(), 'show', ->
          @show @header,             region: @getMainView().headerRegion
          @show @buttons,            region: @getMainView().buttonsRegion
          @show @list,               region: @getMainView().tableRegion
          @show @paginator,          region: @getMainView().paginationRegion
          @show @selectionIndicator, region: @getMainView().selectionIndicatorRegion if @selectable
          @show @filter,             region: @getMainView().filterRegion if @filterEnabled()

        @listenTo @paginator, 'table:first', @first
        @listenTo @paginator, 'table:previous', @previous
        @listenTo @paginator, 'table:next', @next
        @listenTo @paginator, 'table:last', @last
        @listenTo @paginator, 'table:setPerPage', =>
          newPerPage = @paginator.ui.perPage.val()
          return if @perPage is newPerPage
          # the Paginator lib will short-circuit requests to decrease the perPage size
          # and will not actually re-fetch the collection.
          needsReload = newPerPage > @perPage
          @setPerPage(newPerPage)
          @toggleInteraction(false) if needsReload

        @listenTo @paginator, 'table:pageInputChanged', _.debounce((e) =>
          val = parseInt(@paginator.ui.pageInput.val())
          if val? and _.isNumber(val) and not _.isNaN(val) and val isnt @collection.currentPage
            # clamp the entered page
            clampedVal = Math.min(Math.max(1, val), @totalPages())
            @paginator.ui.pageInput.val(clampedVal) if clampedVal != val
            return if clampedVal is @collection.currentPage
            @collection.goTo(clampedVal)
            # refocus the input field after navigation, in case user wants to continue navigating
            @toggleInteraction(false)
            _.defer => @paginator.ui.pageInput.click()
        , 300)

        @listenTo @list, 'table:sort', (opts={}) =>
          sortCol = _.findWhere @columns, attribute: opts.attribute
          dir = if @list.sortColumn == opts.attribute
            # flip the direction if the column is clicked twice
            if @list.sortDirection is 'asc' then 'desc' else 'asc'
          else
            # otherwise use the previous direction, or the default, or desc
            @list.sortDirection or sortCol?.defaultDirection or 'desc'

          @toggleInteraction(false)

          if sortCol?.sortable
            @list.setSort(sortCol.attribute, dir, sortCol.sortAttribute)

        if @filter
          # Listen to the filter's search event.
          @listenTo @filter, 'table:search', (filter) =>
            @toggleInteraction false
            @list.setSearch filter

        # Tell the collection NOT to fetch if we are rendering static data
        if @static
          @collection.bootstrap()
        # If we're loading with filter attributes set via querystring, start with a search.
        else if @filterAttrs
          @list.setSearch @filter.model
        # Otherwise, load the table via AJAX (w/o filtering).
        else
          @collection.fetch reset: true

        # calls the #show method defined App.Controllers.Application, which
        # puts the view into the (component) Application's main region
        @show @getMainView(), region: opts.region

      refresh: (opts={}) =>
        _.defaults opts, reset: true
        @toggleInteraction(false)
        @collection.fetch(opts)

      # Navigates the table to the next page, if possible
      next: =>
        @toggleInteraction(false)
        @collection.nextPage()

      # Navigates the table to the previous page, if possible
      previous: =>
        @toggleInteraction(false)
        @collection.prevPage()

      # Navigates the table to the first page, if possible
      first: =>
        @toggleInteraction(false)
        @collection.goTo(1)

      # Navigates the table to the last page, if possible
      last: =>
        @toggleInteraction(false)
        @collection.goTo(@totalPages())

      # @return [Number] the total number of records in the collection
      totalRecords: =>
        if @collection.totalRecords?
          @collection.totalRecords
        else
          @collection.origModels.length


      # @return [Number] the total number of pages
      totalPages: =>
        Math.floor(@totalRecords() / @collection.perPage) + 1

      # Updates the #perPage property and re-renders the collection
      # @param newPerPage [Number] the new number of rows per table page
      setPerPage: (newPerPage) =>
        @paginator.perPage = @perPage = newPerPage
        @collection.howManyPer(newPerPage)

      # @return [String] the default sort column (or null if no column can be sorted)
      defaultSortColumn: ->
        _.findWhere(@columns, attribute: @defaultSort) or _.findWhere(@columns, sortable: true)

      # @return [String] (asc|desc) default direction of the default sort column (desc)
      defaultSortDirection: ->
        dir = @defaultSortColumn()?.defaultDirection
        (_.contains(['asc', 'desc'], dir) and dir) or 'desc'

      # Enables/disables user interaction on the various parts of the table views
      # @param enabled [Boolean] enable or disable the table
      toggleInteraction: (enabled) =>
        # Trigger an update of any total records indicators.
        App.vent.trigger 'total_records:change', @totalRecords() if enabled

        if @isInteractionEnabled is enabled then return

        unless @static
          @isInteractionEnabled = enabled
          userInputSelector = 'a,th,select,input'
          $ctrlBarButtons = @buttons.$el.find(userInputSelector)
          @getMainView().$el.find(userInputSelector)
            .not($ctrlBarButtons)
            .toggleClass('disabled', not enabled)
          $ctrlBarButtons.toggleClass('action-disabled', not enabled)
        @paginator.render() if enabled

      #
      # @return [Boolean] true if the filter has been enabled for this table, false otherwise
      filterEnabled: ->
        @filterTemplatePath or @filterView

    API =
      # @return [Table.Controller] a new controller for the requested table
      createTable: (options) ->
        new Table.Controller options

    # Register an Application-wide handler for rendering a table component
    App.reqres.setHandler 'table:component', (options={}) ->
      API.createTable(options)
