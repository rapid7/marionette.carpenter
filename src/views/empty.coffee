define ['templates/empty'], ->
  #
  # Shown when the collection is empty
  #
  class Empty extends Marionette.ItemView

    template: @::templatePath 'empty'

    tagName: 'tr'

    attributes:
      class: 'empty'
