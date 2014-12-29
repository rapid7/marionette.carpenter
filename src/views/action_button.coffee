define [
  'templates/action_button'
], (template) ->

  #
  # The action buttons in the control bar
  #
  class ActionButton extends Marionette.ItemView

    template: template

    tagName: 'li'

    className: -> ( @model.get('containerClass') )

    modelEvents:
      'change:disabled': 'render'

    events:
      'click': 'executeClickActions'

    # @param [Object] opts the options hash
    # @option opts [Boolean] :selectable @see Controller#selectable
    # @option opts [Object] :tableSelections data about the current state of the table
    # @option opts [Array<Entities.AjaxPaginatedCollection>, Array<Entities.StaticPaginatedCollection>]
    #   :tableCollection the collection currently managed by the table
    initialize: (opts) ->
      @carpenter       =   opts.carpenter
      @selectable      = !!opts.selectable
      @tableCollection =   opts.tableCollection
      @tableSelections =   opts.tableSelections

      @listenTo @tableCollection, 'selection_toggled', () =>
        @setActivationState()
      @listenTo @tableCollection, 'select_all_toggled', () =>
        @setActivationState()

    #
    # Set the activation state of the button.
    #
    # @param rowModel [Backbone.Model] the model for the last-clicked table row
    #
    # @return [void]
    setActivationState: (rowModel) ->
      activateOn = @model.get 'activateOn'

      # If the table does not enable checkboxes, or if activateOn is not specified,
      # the button should always be enabled.
      if !@selectable || !activateOn
        @model.enable()
        return false

      # Determine the current state of the selections.
      # NB: This uses Object.keys(obj).length, which happens in O(n) time, but
      # that should be fine unless somebody decides to click a checkbox thousands
      # of times.
      numSelected         = @tableCollection.numSelected
      moreThanOneSelected = @tableSelections.selectAllState || numSelected > 1
      oneSelected         = numSelected == 1

      if activateOn == 'any' && ( oneSelected || moreThanOneSelected )
        @model.enable()
      else if activateOn == 'many' && moreThanOneSelected
        @model.enable()
      else if ( activateOn == 'one' && oneSelected ) && !@tableSelections.selectAllState
        @model.enable()
      else
        @model.disable()

    #
    # Execute any callbacks or global event triggers.
    #
    # @return [void]
    executeClickActions: ->
      # If disabled not defined, or if disabled false
      if (!@model.get('disabled')?) or (@model.get('disabled')? and !@model.get('disabled'))
        @executeCallback()
        @executeTrigger()


    #
    # Execute the global event trigger.
    #
    # @return [void]
    executeTrigger: ->
      if @model.get 'event'
        @carpenter.trigger @model.get('event')

    #
    # Execute this button's associated callback, passing the table selection data
    # if needed.
    #
    # @return [void]
    #
    # TODO: Due to callback ordering, selectedIDs and deselectedIDs aren't being cleared
    # out on "select all" selection. Not a big deal, since we only care about one
    # or the other at a time.
    executeCallback: ->
      return false unless @model.get 'click'
      if @selectable
        # Gather the data needed as arguments to the callback.
        selectAllState = @tableSelections.selectAllState
        # NB: Object.keys runs in O(n) time
        selectedIDs    = Object.keys @tableSelections.selectedIDs
        deselectedIDs  = Object.keys @tableSelections.deselectedIDs
        selectedVisibleCollection = new Backbone.Collection @tableCollection.filter (model) ->
          model.id in selectedIDs

        @model.get('click')(
          selectAllState,
          selectedIDs,
          deselectedIDs,
          selectedVisibleCollection,
          @tableCollection
        )

      else
        @model.get('click')()