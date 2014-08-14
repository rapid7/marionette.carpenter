define ['templates/loading'], (template) ->
  #
  # Show a loading animation. Used as the EmptyView for non-static collections
  # until something is fetched.
  #
  class Loading extends Marionette.ItemView

    template: template

    tagName: 'tr'