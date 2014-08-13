define [], ->
  Marionette.Carpenter.App.module "Entities", (Entities, App) ->

    #
    # ENTITY CLASSES
    #

    #
    # Responsible for storing the state of a table's filter.
    class Entities.Filter extends App.Entities.Model

    #
    # API
    #

    API =
      newFilter: (attributes = {}) ->
        new Entities.Filter attributes

    #
    # REQUEST HANDLERS
    #

    App.reqres.setHandler "new:filter:entity", (attributes) ->
      # Ensure that any private.type attributes are correctly transformed into arrays.
      if attributes?.booleans?.associations?.private?.type
        attributes.booleans.associations.private.type = [].concat(attributes.booleans.associations.private.type)

      API.newFilter attributes