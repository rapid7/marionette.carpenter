define [
  'views/row',
  'spec/support/shared/examples/create_region'
], (Row, createRegion) ->

  describe 'Row View', ->

    createRegion()

    TestHelpers =

      createRow: (opts = {}) ->
        opts = _.defaults opts,
          columns: {}
          selectable: true
          modelAttrs: {id: 1}
          actionButtons: {}
          tableSelections:
            selectAllState: false
            deselectedIDs: {}
            selectedIDs: {}

        new Row
          columns: opts.columns
          selectable: opts.selectable
          model: new Backbone.Model(opts.modelAttrs)
          tableSelections: opts.tableSelections
          actionButtons: opts.actionButtons


    describe 'when collection is selectable', ->

      describe 'on initialization', ->
        describe 'when the select all checkbox is checked', ->
          describe 'when no checkboxes have been deselected before this rendering', ->
            it 'sets the selected state to true', ->
              row = TestHelpers.createRow
                tableSelections:
                  selectAllState: true
                  deselectedIDs: {}
                  selectedIDs: {}


              expect(row.model.get('selected')).toBe true

          describe 'when the checkbox for this row has been deselected before this rendering', ->
            it 'sets the selected state to false', ->
              row = TestHelpers.createRow
                tableSelections:
                  selectAllState: true
                  deselectedIDs:
                    1: true
                  selectedIDs: {}

              expect(row.model.get('selected')).toBe false

        describe 'when the select all checkbox is not checked', ->
          describe 'when no checkboxes have been selected before this rendering', ->
            it 'sets the selected state to false', ->
              row = TestHelpers.createRow()

              expect(row.model.get('selected')).toBe false

          describe 'when the checkbox for this row has been selected before this rendering', ->
            it 'sets the selected state to true', ->
              row = TestHelpers.createRow
                tableSelections:
                  selectAllState: false
                  selectedIDs:
                    1: true
                  deselectedIDs: {}

              expect(row.model.get('selected')).toBe true
