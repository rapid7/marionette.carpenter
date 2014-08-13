define [
  'templates/control_bar'
], ($) ->

  #
  # Hold the action and tag buttons
  #
  class ControlBar extends Marionette.CompositeView

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
