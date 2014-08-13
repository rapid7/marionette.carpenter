define ['templates/loading'], ->
  #
  # Show a loading animation. Used as the EmptyView for non-static collections
  # until something is fetched.
  #
  class Table.Loading extends Marionette.ItemView

    template: @::templatePath 'loading'

    tagName: 'tr'