define ['templates/empty'], (template) ->
  #
  # Shown when the collection is empty
  #
  class Empty extends Marionette.ItemView

    template: template

    tagName: 'tr'

    attributes:
      class: 'empty'
