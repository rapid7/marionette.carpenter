define [
  'templates/header'
], (template)->

  #
  # Display a title and an optional search/filter area
  #
  class Header extends Marionette.ItemView

    template: template

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