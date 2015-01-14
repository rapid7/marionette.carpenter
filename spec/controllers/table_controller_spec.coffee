# todo: need jquer here
define [
  'controllers/table_controller'
  'spec/support/matchers/to_be_an_instance_of'
  'spec/support/matchers/to_contain_node_with_text'
  'spec/support/matchers/to_contain_text'
  'spec/support/matchers/to_have_class'
], ->

  describe 'Marionette.Carpenter.Controller', ->

    set 'app',            -> new Marionette.Application()
    set 'perPageOptions', -> [20, 50]
    set 'perPage',        -> 20
    set 'collection',     -> new Backbone.Collection([])
    set 'columns',        -> _.map(btns, (c) -> attribute: c)
    set 'selectable',     -> true
    set 'actionButtons',  -> []
    set 'titleText',      -> 'Related Logins'
    set 'btns',           -> ['D', 'E', 'F']
    set 'defaultSort',    -> null
    set 'itemViewMatch',  -> "JOE WAS HERE"
    set 'ItemView',       -> Marionette.ItemView.extend(template: -> itemViewMatch)

    beforeEach ->
      @$el = $("<div />", id: 'table-region').appendTo($('body'))[0]
      @region = new Backbone.Marionette.Region(el: @$el)

    afterEach ->
      @region.destroy()
      @$el?.remove?()

    beforeEach ->
      defaults =
        title: titleText
        region: @region
        searchable: false
        static: true
        checkboxes: true
        actionButtons: actionButtons
        selectable: selectable
        perPage: perPage
        perPageOptions: perPageOptions
        collection: collection
        columns: columns
        defaultSort: defaultSort
        app: app

      @controller = new Marionette.Carpenter.Controller(defaults)

    describe 'when calling the constructor', ->

      it 'renders something', ->
        expect(@region.el.children.length).toBeGreaterThan 0

    describe '#name', ->
      set 'titleText', -> "JOES FAVORITE TABLE HEADER"

      it 'is rendered in the table header', ->
        expect(@region.el).toContainNodeWithText(titleText)

    describe '#actionButtons', ->

      describe 'with one actionButton named "FOO LABEL 123"', ->
        set 'labelText', -> 'FOO LABEL 123'
        set 'actionButtons', -> [{ label: 'FOO LABEL 123' }]

        it 'is rendered in the table control bar', ->
          expect(@region.el).toContainNodeWithText(labelText)

      describe 'with three actionButton named "A, B, C"', ->
        set 'actionButtons', -> _.map(['A', 'B', 'C'], (text) -> label: text)
        set 'buttonsEl',     -> $(@region.el).find('.action_buttons')

        it 'renders a node containing A', ->
          expect(@region.el).toContainNodeWithText('A')

        it 'renders a node containing B', ->
          expect(@region.el).toContainNodeWithText('B')

        it 'renders a node containing C', ->
          expect(@region.el).toContainNodeWithText('C')

    describe '#columns', ->

      describe 'when given three columns with attributes D, E, F', ->
        set 'columns', -> _.map(btns, (c) -> attribute: c)

        it 'renders a node containing D', ->
          expect(@region.el).toContainNodeWithText('D')

        it 'renders a node containing E', ->
          expect(@region.el).toContainNodeWithText('E')

        it 'renders a node containing F', ->
          expect(@region.el).toContainNodeWithText('F')

      describe 'when the :view property is present in the column definition', ->
        set 'columns', -> [{ attribute: 'a', view: ItemView }]
        set 'collection', -> new Backbone.Collection([{a:1}])

        it 'renders the view', ->
          expect(@region.el).toContainNodeWithText(itemViewMatch)

    describe '#perPageOptions', ->

      describe 'when given a non-empty collection', ->

        set 'collection', -> new Backbone.Collection([{},{}])

        describe 'when perPageOptions is [20, 50]', ->

          set 'perPageOptions', -> [20, 50]

          it 'renders a dropdown with an option containing 20', ->
            expect(@region.el).toContainNodeWithText('20', 'select option')

          it 'renders a dropdown with an option containing 50', ->
            expect(@region.el).toContainNodeWithText('50', 'select option')

      describe 'when given an empty collection', ->

        set 'collection', -> new Backbone.Collection([])

        it 'does not render pagination', ->
          expect(@region.$el.find('.paginator').html().trim()).toEqual('')

    describe 'pagination', ->

      describe 'when a collection of size 300 is passed, and perPage is 10', ->

        set 'collection', -> new Backbone.Collection(_.times 300, -> {})
        set 'perPage', -> 10
        set 'perPageOptions', -> [10, 20]

        describe 'and I click the next page button', ->
          beforeEach -> @controller.paginator.ui.next.click()

          it 'navigates the collection to page 2', ->
            expect(@controller.collection.currentPage).toEqual(2)

        describe 'and I click the last page button', ->
          beforeEach ->
            @controller.paginator.ui.last.click()

          it 'navigates the collection to page 31', ->
            expect(@controller.collection.currentPage).toEqual(31)

        describe 'and I enter 15 into the page input field', ->

          # This is an asynchronous spec because we _.debounce changes to the
          # input field, which adds a small delay (in case another key is pressed)
          it 'navigates the collection to page 15', ->
            runs ->
              @controller.paginator.ui.pageInput.attr('value', '15').change()

            waits(800)

            runs ->
              expect(@controller.collection.currentPage).toEqual(15)


    describe 'sortability', ->

      describe 'with three columns [A,B,C]', ->

        describe 'when sortability is not specified', ->
          set 'columns', -> [{attribute: 'A', attribute: 'B', attribute: 'C'}]

          it 'defaults "sortable" to the setting in @columnDefaults', ->
            sortableDefaultSetting = @controller.columnDefaults.sortable
            expect(@controller.columns[0].sortable).toEqual(sortableDefaultSetting)

        describe 'when all columns are sortable', ->
          set 'columns', -> [
            {attribute: 'A', sortable: true},
            {attribute: 'B', sortable: true},
            {attribute: 'C', sortable: true},
          ]

          it 'sorts by the first sortable column, "A"', ->
            expect(@controller.collection.sortColumn).toEqual('A')

          it 'defaults to descending sort', ->
            expect(@controller.collection.sortDirection).toEqual('desc')

        describe 'when A is not sortable and B\'s defaultDirection is asc', ->
          set 'columns', -> [
            {attribute: 'A', sortable: false},
            {attribute: 'B', sortable: true, defaultDirection: 'asc'},
            {attribute: 'C', sortable: true},
          ]

          it 'sorts by the first sortable column, "B"', ->
            expect(@controller.collection.sortColumn).toEqual('B')

          it 'defaults to descending sort', ->
            expect(@controller.collection.sortDirection).toEqual('asc')

          describe 'when the defaultSort attribute is specified as "C"', ->
            set 'defaultSort', -> 'C'

            it 'sorts by the defaultSort column "C"', ->
              expect(@controller.collection.sortColumn).toEqual('C')

          describe 'the C column is clicked', ->

            beforeEach ->
              @region.$el.find('th:contains(C)').click()

            it 'sorts by the C column', ->
              expect(@controller.collection.sortColumn).toEqual('C')

            it 'sets a class of "sort" to the C <th>', ->
              expect(@region.$el.find('th:contains(C)')).toHaveClass('sort')

            it 'does not set a class of "sort" on any other columns', ->
              expect(@region.$el.find('th').not(':contains(C)')).not.toHaveClass('sort')

          describe 'the C column is clicked, then the B column is clicked', ->
            beforeEach ->
              @region.$el.find('th:contains(C)').click()
              @region.$el.find('th:contains(B)').click()

            it 'sorts by the B column', ->
              expect(@controller.collection.sortColumn).toEqual('B')

            it 'sets a class of "sort" to the B <th>', ->
              expect(@region.$el.find('th:contains(B)')).toHaveClass('sort')

            it 'does not set a class of "sort" on any other columns', ->
              expect(@region.$el.find('th').not(':contains(B)')).not.toHaveClass('sort')

          describe 'the C column is clicked, then the unsortable A column is clicked', ->
            beforeEach ->
              @region.$el.find('th:contains(C)').click()
              @region.$el.find('th:contains(A)').click()

            it 'still sorts by the C column', ->
              expect(@controller.collection.sortColumn).toEqual('C')

            it 'sets a class of "sort" to the C <th>', ->
              expect(@region.$el.find('th:contains(C)')).toHaveClass('sort')

            it 'does not set a class of "sort" on any other columns', ->
              expect(@region.$el.find('th').not(':contains(C)')).not.toHaveClass('sort')


    describe '#collection', ->

      describe 'when given a single row with attributes 1, 2, and 3', ->
        set 'columns', -> _.map(['D', 'E', 'F'], (c) -> attribute: c)
        set 'collection', -> new Backbone.Collection([{D: '1', E: '2', F: '3'}])

        it 'renders a node containing 1', ->
          expect(@region.el).toContainNodeWithText('1')

        it 'renders a node containing 2', ->
          expect(@region.el).toContainNodeWithText('2')

        it 'renders a node containing 3', ->
          expect(@region.el).toContainNodeWithText('3')

    describe '#selectable', ->

      describe 'with an empty collection', ->
        set 'collection', -> new Backbone.Collection([])

        describe 'when true', ->
          set 'selectable', -> true

          it 'renders a column containing a checkbox', ->
            expect($(@region.el).find('input[type=checkbox]').length).toEqual(1)

        describe 'when false', ->
          set 'selectable', -> false

          it 'does not render a column containing a checkbox', ->
            expect($(@region.el).find('input[type=checkbox]').length).toEqual(0)

      describe 'with a collection of 1 item', ->
        set 'collection', -> new Backbone.Collection([{ D: '1', E: '2', F: '3' }])

        it 'renders two checkboxes', ->
          expect($(@region.el).find('input[type=checkbox]').length).toEqual(2)

        it 'renders only unchecked checkboxes', ->
          expect($(@region.el).find('input[type=checkbox]:checked').length).toEqual(0)

        describe 'after clicking the checkbox in thead', ->
          selectedFlag = false

          beforeEach ->
            @controller.carpenterRadio.on('table:rows:selected',()->
              selectedFlag=true
            )

            $(@region.el).find('thead input[type=checkbox]')[0].click()

          afterEach ->
            selectedFlag=false
            @controller.carpenterRadio.off('table:rows:selected')

          it 'triggers the table:rows:selected event', ->
            waitsFor(()->
              selectedFlag
            , "The table:rows:selected event should be triggered", 5000)

            runs ->
              expect(selectedFlag).toEqual(true)

          it 'selects all checkboxes', ->
            expect($(@region.el).find('input[type=checkbox]:checked').length).toEqual(2)

          describe 'and then clicking again', ->
            deselectedFlag = false

            beforeEach ->
              @controller.carpenterRadio.on('table:rows:deselected',()->
                deselectedFlag =true
              )

              $(@region.el).find('thead input[type=checkbox]').click()

            afterEach ->
              deselectedFlag  = false
              @controller.carpenterRadio.off('table:rows:deselected')

            it 'triggers the table:rows:deselected:event', ->
              waitsFor(()->
                deselectedFlag
              , "The table:rows:deselected event should be triggered", 5000)

              runs ->
                expect(deselectedFlag).toEqual(true)

            it 'deselects all checkboxes', ->
              expect($(@region.el).find('input[type=checkbox]:checked').length).toEqual(0)

      describe 'when true', ->

        it 'renders a checkbox in the header row', ->
          expect(@region.$el.find('th input[type=checkbox]').size()).toEqual(1)

        it 'renders a checkbox in each table row', ->
          expect(@region.$el.find('tr td.checkbox input[type=checkbox]').size()).toEqual(@region.currentView.collection.length)
