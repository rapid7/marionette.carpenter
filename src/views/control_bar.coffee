define [
  'concerns/views/filter_toggle'
  'concerns/views/filter_custom_query_field'
  'views/action_button'
  'templates/control_bar'
], (FilterToggle, FilterCustomQueryField, ActionButton, template) ->

  #
  # Hold the action and tag buttons
  #
  class ControlBar extends Marionette.CompositeView

    template: template

    childView: ActionButton

    tagName: 'ul'

    className: 'table-control-bar'

    # @param [Object] opts the options hash
    # @option opts :selectable [Boolean] @see {Controller#selectable}
    # @option opts :renderFilterControls [Boolean] @see {Controller#renderFilterControls}
    # @option opts :filterCustomQueryEvent [String] @see {Controller#filterCustomQueryEvent}
    # @option opts [ActionButtonsCollection] :actionButtonsCollection
    # @option opts [Object] :tableSelections data about the current state of the table
    # @option opts [Array<Entities.AjaxPaginatedCollection>, Array<StaticPaginatedCollection>]
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
      @carpenter              = opts.carpenter

      super

    #
    # Pass the `reqres` request event bus down to the item view.
    #
    # @return [Marionette.ItemView] the item's view
    buildChildView: (item, ItemViewType, itemViewOptions) ->
      defaultOptions =
        tableSelections: @tableSelections
        tableCollection: @tableCollection
        selectable: @selectable
        model: item

      options = _.extend(defaultOptions, itemViewOptions)
      new ItemViewType(options)

    serializeData: -> @

    @include FilterToggle
    @include FilterCustomQueryField
