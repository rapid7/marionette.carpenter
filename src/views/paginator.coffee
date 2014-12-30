define [
  'templates/paginator'
  '../../bower_components/backbone.paginator/dist/backbone.paginator.js'
], (template) ->
  #
  # Render the pagination controls
  #
  class Paginator extends Marionette.ItemView

    # When the 'All rows' option is selected, we pass this as the
    # "max rows" variable to the server
    @ALL_MAGIC: '99999999'

    template: template

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
        ALL_MAGIC: Paginator.ALL_MAGIC
