define [
], ->
# TODO.
#   # TODO: Remaining to test:
#   # * Table.Row.recordSelectionState
#   # * Table.ActionButton (especially activateOn)
#   # * passing correct data to action button click callback function

#   # TODO: Should be documented.
#   TestHelpers =
#     createControlBar: (actionButtons, controlBarOpts) ->
#       actionButtonsCollection = Pro.request 'new:action_buttons:entities', actionButtons
#       options =  _.extend({
#         actionButtonsCollection: actionButtonsCollection
#         tableCollection: new Backbone.Collection [{foo: 1}]
#         selectable: true
#       }, controlBarOpts)

#       new Pro.Components.Table.ControlBar options

#     createFilter: (opts) ->
#       defaults =
#         collection: new Backbone.Collection [{foo: 1}]
#         filterTemplatePath: 'creds/index/filter'
#         filterModel: Pro.request 'new:filter:entity'

#       new Pro.Components.Table.Filter _.defaults(defaults, opts)

#     createRowList: (n, opts) ->
#       buildCollection = (n, opts) ->
#         Model = Backbone.Model.extend defaults: opts.modelDefaults
#         collection = _.times(n, -> new Model(id: n))
#         new Backbone.Collection collection, { model: Model }

#       defaultRowListOptions =
#         collection:      buildCollection(n, opts)
#         columns:         opts.columns
#         static:          true
#         tableSelections: {}

#       rowListOptions = _.extend({}, defaultRowListOptions, opts.rowListOptions)

#       new Pro.Components.Table.RowList rowListOptions

#     createRow: (opts = {}) ->
#       opts = _.defaults opts,
#         columns: {}
#         selectable: true
#         modelAttrs: {id: 1}
#         actionButtons: {}
#         tableSelections:
#           selectAllState: false
#           deselectedIDs: {}
#           selectedIDs: {}

#       new Pro.Components.Table.Row
#         columns: opts.columns
#         selectable: opts.selectable
#         model: new Backbone.Model(opts.modelAttrs)
#         tableSelections: opts.tableSelections
#         actionButtons: opts.actionButtons

#   describe 'Components.Table.View', ->

#     beforeEach ->
#       @$el = $("<div />", id: 'table-region').appendTo($('body'))[0]
#       @region = new Backbone.Marionette.Region(el: @$el)

#     afterEach ->
#       @region.close()
#       @$el?.remove?()

#     ###
#     # ControlBar Specs
#     ###
#     describe 'Table.ControlBar', ->

#       describe 'when action buttons are provided', ->
#         beforeEach ->
#           @actionButtons = [
#             {
#               label: 'Add'
#               id:    'add-button'
#               click: (selectAllState, selectedIDs, deselectedIDs) ->
#                 window.clickFunctionExecuted = true
#                 window.selectAllState = selectAllState
#                 window.selectedIDs = selectedIDs
#                 window.deselectedIDs = deselectedIDs
#             }
#             {
#               label: 'Delete'
#             }
#           ]

#           controlBar = TestHelpers.createControlBar @actionButtons,
#             tableSelections:
#               selectAllState: true
#               selectedIDs: {}
#               deselectedIDs: {}

#           @region.show controlBar

#         it 'renders each of the action buttons', ->
#           expect(@region.$el.find('a.action-button').length).toEqual(@actionButtons.length)

#         it "executes a button's callback function on click", ->
#           window.clickFunctionExecuted = false
#           @region.$el.find('#add-button').click()

#           expect(window.clickFunctionExecuted).toBe(true)

#     ###
#     # Row Specs
#     ###
#     describe 'Table.Row', ->

#       describe 'when collection is selectable', ->

#         beforeEach ->
#           modelDefaults =
#             username: 'matt'
#             password: 'pass'

#           columns = [
#             { attribute: 'username' }
#             { attribute: 'password' }
#           ]

#           rowListOptions =
#             selectable: true
#             tableSelections:
#               selectAllState: false
#               deselectedIDs: {}
#               selectedIDs: {}

#           list = TestHelpers.createRowList(1, { columns, modelDefaults, rowListOptions })

#           @region.show(list)
#           @model = @region.currentView.collection.models[0]

#         describe 'on initialization', ->
#           describe 'when the select all checkbox is checked', ->
#             describe 'when no checkboxes have been deselected before this rendering', ->
#               it 'sets the selected state to true', ->
#                 row = TestHelpers.createRow
#                   tableSelections:
#                     selectAllState: true
#                     deselectedIDs: {}
#                     selectedIDs: {}


#                 expect(row.model.get('selected')).toBe true

#             describe 'when the checkbox for this row has been deselected before this rendering', ->
#               it 'sets the selected state to false', ->
#                 row = TestHelpers.createRow
#                   tableSelections:
#                     selectAllState: true
#                     deselectedIDs:
#                       1: true
#                     selectedIDs: {}

#                 expect(row.model.get('selected')).toBe false

#           describe 'when the select all checkbox is not checked', ->
#             describe 'when no checkboxes have been selected before this rendering', ->
#               it 'sets the selected state to false', ->
#                 row = TestHelpers.createRow()

#                 expect(row.model.get('selected')).toBe false

#             describe 'when the checkbox for this row has been selected before this rendering', ->
#               it 'sets the selected state to true', ->
#                 row = TestHelpers.createRow
#                   tableSelections:
#                     selectAllState: false
#                     selectedIDs:
#                       1: true
#                     deselectedIDs: {}

#                 expect(row.model.get('selected')).toBe true

#         describe 'when the checkbox is clicked', ->

#           it 'fires a selection toggle event on the event bus', ->
#             eventFired = false
#             Pro.vent.on 'table:row:selection_toggled', ->(eventFired = true)
#             @region.$el.find('td.checkbox input').first().click()

#             expect(eventFired).toBe true

#           it 'fires a selection toggle event on the model', ->
#             eventFired = false
#             @model.on 'selection_toggled', ->(eventFired = true)
#             @region.$el.find('td.checkbox input').first().click()

#             expect(eventFired).toBe true

#           describe 'when the checkbox was previously selected', ->
#             beforeEach ->
#               @region.$el.find('td.checkbox input').first().prop 'checked', true

#             it 'fires a deselected event on the event bus', ->
#               eventFired = false
#               Pro.vent.on 'table:row:deselected', ->(eventFired = true)
#               @region.$el.find('td.checkbox input').first().click()

#               expect(eventFired).toBe true

#             it 'fires a deselected event on the model', ->
#               eventFired = false
#               @model.on 'deselected', ->(eventFired = true)
#               @region.$el.find('td.checkbox input').first().click()

#             it 'sets the selected state of the model to false', ->
#               @region.$el.find('td.checkbox input').first().click()

#               expect(@model.get('selected')).toBe false

#           describe 'when the checkbox was previously deselected', ->

#             it 'fires a selected event on the event bus', ->
#               eventFired = false
#               Pro.vent.on 'table:row:selected', ->(eventFired = true)
#               @region.$el.find('td.checkbox input').first().click()

#               expect(eventFired).toBe true

#             it 'fires a selected event on the model', ->
#               eventFired = false
#               @model.on 'selected', ->(eventFired = true)
#               @region.$el.find('td.checkbox input').first().click()

#               expect(eventFired).toBe true

#             it 'sets the selected state of the model to false', ->
#               @region.$el.find('td.checkbox input').first().click()

#               expect(@model.get('selected')).toBe true

#     ###
#     #  RowList Specs
#     ###

#     describe 'Table.RowList', ->

#       describe 'when rendering a static collection', ->

#         buildModelClass = ->
#           Backbone.Model.extend
#             defaults:
#               name: 'joe'
#               class: 'ashjksadkjhdsakjh'

#         buildCollection = (n=0) ->
#           Model = buildModelClass()
#           new Backbone.Collection(
#             _.times(n, -> new Model),
#             { model: Model }
#           )

#         buildColumns = ->
#           [
#             { attribute: 'name' }
#             { attribute: 'class' }
#           ]

#         buildRowList = (n=0, opts={}) ->
#           defaults =
#             collection: buildCollection(n)
#             columns:    buildColumns()
#             static:     true
#           opts = _.extend({}, defaults, opts)
#           new Pro.Components.Table.RowList opts

#         describe 'when given an empty collection', ->

#           it 'displays one row containing the empty view', ->
#             list = buildRowList(0)
#             @region.show(list)
#             expect(list.$el.find('tbody>tr').size()).toEqual(1)

#         describe 'when given a collection with one element', ->

#           it 'displays one row', ->
#             list = buildRowList(1)
#             @region.show(list)
#             expect(list.$el.find('tbody>tr').size()).toEqual(1)

#         describe 'when given a collection with five elements', ->

#           it 'displays five rows', ->
#             list = buildRowList(5)
#             @region.show(list)
#             expect(list.$el.find('tbody>tr').size()).toEqual(5)

#       describe 'when rendering a collection loaded from a URL', ->
#         urlRoot = -> '/joe'

#         buildModelClass = ->
#           Backbone.Model.extend
#             defaults:
#               name: 'joe'
#               class: 'ashjksadkjhdsakjh'

#         buildCollection = ->
#           Model = buildModelClass()
#           Collection = Backbone.Collection.extend({ model: Model, url: urlRoot() })
#           collection = new Collection({})
#           Wrapped = Pro.Entities.CreatePaginatedCollectionClass(collection, static: false)
#           new Wrapped()

#         json = (n) ->
#           JSON.stringify({
#             collection: _.times n, -> { name: 'Spradic', class: 'SSH' }
#             total_count: n
#           })

#         buildColumns = ->
#           [
#             { attribute: 'name'  }
#             { attribute: 'class' }
#           ]

#         describe 'before the URL finishes loading', ->
#           beforeEach ->
#             @server = sinon.fakeServer.create()
#             @server.respondWith(/\/joe.*/,
#                 [200, {"Content-Type": "application/json"}, json(10)])
#             @collection = buildCollection()

#           afterEach ->
#             @server.restore()

#           it 'displays a loading view', ->
#             @list = new Pro.Components.Table.RowList
#               collection: @collection
#               columns: buildColumns()
#               static: false

#             @collection.fetch(reset: true)
#             @region.show(@list)
#             expect(@list.$el.find('.tab-loading').size()).toEqual(1)
#             @server.respond()

#         describe 'when the URL returns 10 items', ->
#           beforeEach ->
#             @server = sinon.fakeServer.create()
#             @server.respondWith(/\/joe.*/,
#                 [200, {"Content-Type": "application/json"}, json(10)])
#             @collection = buildCollection()

#           afterEach ->
#             @server.restore()

#           it 'displays 10 rows', ->
#             @list = new Pro.Components.Table.RowList
#               collection: @collection
#               columns: buildColumns()
#               static: false

#             @collection.fetch(reset: true)
#             @region.show(@list)
#             @server.respond()
#             expect(@list.$el.find('tbody>tr').size()).toEqual(10)

#         describe 'when the URL returns 0 items', ->
#           beforeEach ->
#             @server = sinon.fakeServer.create()
#             @server.respondWith("GET", urlRoot(),
#                 [200, {"Content-Type": "application/json"}, json(0)])
#             @collection = buildCollection()

#           afterEach ->
#             @server.restore()

#           it 'displays 1 row containing the EmptyView', ->
#             @list = new Pro.Components.Table.RowList
#               collection: @collection
#               columns: buildColumns()
#               static: false

#             @region.show(@list)
#             @server.respond()
#             expect(@list.$el.find('tbody>tr').size()).toEqual(1)

#       describe 'when the collection is selectable', ->
#         beforeEach ->
#           modelDefaults =
#             username: 'matt'
#             password: 'pass'

#           columns = [
#             { attribute: 'username' }
#             { attribute: 'password' }
#           ]

#           rowListOptions =
#             selectable: true
#             tableSelections:
#               selectAllState: false
#               deselectedIDs: {}
#               selectedIDs: {}

#           list = TestHelpers.createRowList(5, { columns, modelDefaults, rowListOptions })
#           @region.show(list)

#         describe 'when the select all checkbox is clicked', ->

#           describe 'when the select all checkbox was previously deselected', ->
#             it 'selects all visible checkboxes', ->
#               @region.$el.find('th.select-all input').click()

#               $visibleCheckboxes = @region.$el.find('td.checkbox input')
#               expect($visibleCheckboxes.filter(':checked').length)
#                 .toEqual($visibleCheckboxes.length)

#           describe 'when the select all checkbox was previously deselected', ->
#             it 'deselects all visible checkboxes', ->
#               @region.$el.find('th.select-all input').click().click()

#               $visibleCheckboxes = @region.$el.find('td.checkbox input')
#               expect($visibleCheckboxes.filter(':not(:checked)').length)
#                 .toEqual($visibleCheckboxes.length)

#         describe 'when a shift-click intermediate checkbox selection occurs', ->
#           it 'toggles the intermediate checkboxes', ->
#             console.warn 'This is untestable due to security limitations with triggering keyboard events.'

#     describe 'Table.Filter', ->
#       beforeEach ->
#         filter = TestHelpers.createFilter()
#         @region.show(filter)

#       describe 'when a filter template path is passed', ->
#         it 'renders the filter', ->
#           expect(@region.$el.find('.filter').length).toEqual 1

#       describe 'auto-styling the filter', ->
#         describe 'when the filter has filter-column divs', ->
#           it 'applies the appropriate style to the filter on render', ->
#             expect(@region.$el.find('.filter-column').first().hasClass('columns-5')).toBe true

#       describe 'when the "Reset Filter" link is clicked', ->
#         # TODO: There are some other things that happen, here. Test them, and stuff.
#         it 'empties all of the text inputs', ->
#           $textField = @region.$el.find('.filter-input input[type="text"]').first()
#           $textField.val 'blah'
#           @region.$el.find('a.filter-reset').click()

#           expect($textField.val()).toEqual ''

#     ###
#     #  Paginator Specs
#     ###

#     describe 'Table.Paginator', ->

#       buildPaginatedCollection = (n=5) ->
#         Collection = Backbone.Collection.extend
#           model: Backbone.Model
#         collection = new Collection({})
#         PaginatedCollection = Pro.Entities.CreatePaginatedCollectionClass(collection, static: true)
#         c = new PaginatedCollection(_.times(n, -> {}))
#         c.bootstrap()
#         c.goTo(1)
#         c

#       describe 'perPageOptions', ->

#         describe 'when given perPageOptions of [100, 500, 1000] and perPage of 500', ->

#           beforeEach ->
#             @paginator = new Pro.Components.Table.Paginator
#               collection: buildPaginatedCollection()
#               perPageOptions: [100, 500, 1000]
#               perPage: 500
#               static: true
#             @region.show @paginator

#           it 'renders a dropdown containing a 100 option', ->
#             expect(@region.el).toContainNodeWithText(100, 'option')

#           it 'renders a dropdown containing a 500 option', ->
#             expect(@region.el).toContainNodeWithText(500, 'option')

#           it 'renders a dropdown containing a 1000 option', ->
#             expect(@region.el).toContainNodeWithText(1000, 'option')

#           it 'selects the 500 option from the dropdown', ->
#             expect(@paginator.ui.perPage.val()).toEqual("500")

#       describe 'currentPage', ->

#         describe 'when currentPage is 1', ->

#           beforeEach ->
#             @region.show new Pro.Components.Table.Paginator
#               collection: buildPaginatedCollection()
#               perPageOptions: [100, 500, 1000]
#               currentPage: 1
#               static: true

#           it 'renders descriptive text containing "1 - "', ->
#             expect(@region.el).toContainNodeWithText('1 - ')

#       describe 'totalRecords', ->

#         describe 'when totalRecords is 0', ->
#           beforeEach ->
#             @region.show new Pro.Components.Table.Paginator
#               collection: buildPaginatedCollection(0)
#               perPageOptions: [100, 500, 1000]
#               currentPage: 1
#               static: true

#           it 'does not render pagination', ->
#             expect(_.trim $(@region.el).text()).toEqual('')


#       describe 'button behavior', ->

#         describe 'when totalRecords is 20, perPage is 10, and currentPage is 0', ->

#           beforeEach ->
#             collection = buildPaginatedCollection(20)
#             @paginator = new Pro.Components.Table.Paginator
#               collection: collection
#               perPage: 10
#               perPageOptions: [10,20,100]
#               static: true
#             @region.show @paginator

#           it 'disables the first page button', ->
#             expect(@paginator.ui.first).toHaveClass('disabled')

#           it 'enables the last page button', ->
#             expect(@paginator.ui.last).not.toHaveClass('disabled')

#           it 'enables the next page button', ->
#             expect(@paginator.ui.next).not.toHaveClass('disabled')

#           it 'disables the previous page button', ->
#             expect(@paginator.ui.previous).toHaveClass('disabled')

#           describe 'and the collection.nextPage() method is called', ->
#             beforeEach ->
#               @paginator.collection.nextPage()

#             it 'enables the first page button', ->
#               expect(@paginator.ui.first).not.toHaveClass('disabled')

#             it 'disables the last page button', ->
#               expect(@paginator.ui.last).toHaveClass('disabled')

#             it 'disables the next page button', ->
#               expect(@paginator.ui.next.hasClass('disabled')).toEqual(true)

#             it 'enables the previous page button', ->
#               expect(@paginator.ui.previous.hasClass('disabled')).toEqual(false)
