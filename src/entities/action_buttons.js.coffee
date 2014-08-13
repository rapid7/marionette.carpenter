define [], ->
  @Pro.module "Entities", (Entities, App) ->

    #
    # ENTITY CLASSES
    #

    class Entities.ActionButton extends App.Entities.Model
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

    class Entities.ActionButtonsCollection extends App.Entities.Collection
      model: Entities.ActionButton

    #
    # API
    #

    API =
      newActionButton: (attributes = {}) ->
        new Entities.ActionButton(attributes)

      newActionButtons: (entities = []) ->
        new Entities.ActionButtonsCollection entities

    #
    # REQUEST HANDLERS
    #

    App.reqres.setHandler "new:action_button:entity", (attributes) ->
      API.newActionButton attributes

    App.reqres.setHandler "new:action_buttons:entities", (entities) ->
      API.newActionButtons entities