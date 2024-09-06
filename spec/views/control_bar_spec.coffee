define [
  'views/control_bar',
  'spec/support/shared/examples/create_region'
], (ControlBar, createRegion) ->

  describe 'ControlBar View', ->

    createRegion()

    TestHelpers =
      createControlBar: (actionButtons, controlBarOpts) ->
        options =  _.extend({
          actionButtonsCollection: new Backbone.Collection(actionButtons)
          tableCollection: new Backbone.Collection [{foo: 1}]
          selectable: true
        }, controlBarOpts)
        new ControlBar options

    describe 'when action buttons are provided', ->

      beforeEach ->

        @actionButtons = [
          {
            label: 'Add'
            id:    'add-button'
            click: (selectAllState, selectedIDs, deselectedIDs) =>
              @clickFunctionExecuted = true
              @selectAllState = selectAllState
              @selectedIDs = selectedIDs
              @deselectedIDs = deselectedIDs
          }
          {
            label: 'Delete'
          }
        ]

        controlBar = TestHelpers.createControlBar @actionButtons,
          tableSelections:
            selectAllState: true
            selectedIDs: {}
            deselectedIDs: {}

        @region.show controlBar

      it 'renders each of the action buttons', ->
        expect(@region.$el.find('button.action-button').length).toEqual(@actionButtons.length)

      it "executes a button's callback function on click", ->
        @clickFunctionExecuted = false
        @region.$el.find('#add-button').click()
        expect(@clickFunctionExecuted).toBe(true)
