define [], ->

  #
  # ENTITY CLASSES
  #

  class Entities.ActionButton extends Backbone.Model
    initialize: (attributes) ->
      @set('disabled', true) if @get('activateOn')

      super(attributes)

    #
    # Set the disabled state to false.
    #
    enable: ->
      @set 'disabled', false

    #
    # Set the disabled state to true.
    #
    disable: ->
      @set 'disabled', true
