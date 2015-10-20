define [
  'views/row_list',
  'spec/support/shared/examples/create_region'
  'entities/paginated_collection'
], (RowList, createRegion, createPaginatedCollectionClass) ->

  describe 'RowList CollectionView', ->

    createRegion()

    #Need ref to Backbone.Radio
    buildCarpenterRadio = ->
      new Backbone.Radio.channel('carpenter')

    describe 'when rendering a static collection', ->

      buildModelClass = ->
        Backbone.Model.extend
          defaults:
            name: 'joe'
            class: 'ashjksadkjhdsakjh'

      buildCollection = (n=0) ->
        Model = buildModelClass()
        new Backbone.Collection(
          _.times(n, -> new Model),
          { model: Model }
        )

      buildColumns = ->
        [
          { attribute: 'name' }
          { attribute: 'class' }
        ]

      buildRowList = (n=0, opts={}) ->
        defaults =
          collection: buildCollection(n)
          columns:    buildColumns()
          static:     true
          carpenterRadio:  buildCarpenterRadio()
        opts = _.extend({}, defaults, opts)
        new RowList opts

      describe 'when given an empty collection', ->

        beforeEach ->
          @list = buildRowList(0)
          @region.show(@list)

        it 'displays one row containing the empty view', ->
          expect(@list.$el.find('tbody>tr').size()).toEqual(1)

        it 'does add the "populated" class to the table', ->
          expect(@list.ui.table).toHaveClass('populated')

        it 'adds the "loaded" class to the table', ->
          expect(@list.ui.table).toHaveClass('loaded')

      describe 'when given a collection with one element', ->

        beforeEach ->
          @list = buildRowList(1)
          @region.show(@list)

        it 'displays one row', ->
          expect(@list.$el.find('tbody>tr').size()).toEqual(1)

        it 'adds the "populated" class to the table', ->
          expect(@list.ui.table).toHaveClass('populated')

        it 'adds the "loaded" class to the table', ->
          expect(@list.ui.table).toHaveClass('loaded')

      describe 'when given a collection with five elements', ->

        beforeEach ->
          @list = buildRowList(5)
          @region.show(@list)

        it 'displays five rows', ->
          expect(@list.$el.find('tbody>tr').size()).toEqual(5)

        it 'adds the "populated" class to the table', ->
          expect(@list.ui.table).toHaveClass('populated')

        it 'adds the "loaded" class to the table', ->
          expect(@list.ui.table).toHaveClass('loaded')

    describe 'when rendering a collection loaded from a URL', ->
      urlRoot = -> '/joe'

      buildModelClass = ->
        Backbone.Model.extend
          defaults:
            name: 'joe'
            class: 'ashjksadkjhdsakjh'

      buildCollection = ->
        Model = buildModelClass()
        Collection = Backbone.Collection.extend({ model: Model, url: urlRoot() })
        collection = new Collection({})
        Wrapped = createPaginatedCollectionClass(collection, static: false)
        new Wrapped()

      json = (n) ->
        JSON.stringify({
          collection: _.times n, -> { name: 'Spradic', class: 'SSH' }
          total_count: n
        })

      buildColumns = ->
        [
          { attribute: 'name'  }
          { attribute: 'class' }
        ]

      describe 'before the URL finishes loading', ->
        beforeEach ->
          @server = sinon.fakeServer.create()
          @server.respondWith(/\/joe.*/,
              [200, {"Content-Type": "application/json"}, json(10)])
          @collection = buildCollection()

        afterEach ->
          @server.restore()

        it 'displays a loading view', ->
          @list = new RowList
            collection: @collection
            columns: buildColumns()
            static: false

          @collection.fetch(reset: true)
          @region.show(@list)
          expect(@list.$el.find('.tab-loading').size()).toEqual(1)
          @server.respond()

      describe 'when the URL returns 10 items', ->
        beforeEach ->
          @server = sinon.fakeServer.create()
          @server.respondWith(/\/joe.*/,
              [200, {"Content-Type": "application/json"}, json(10)])
          @collection = buildCollection()
          @list = new RowList
            collection: @collection
            columns: buildColumns()
            static: false
          @collection.fetch(reset: true)
          @region.show(@list)
          @server.respond()

        afterEach ->
          @server.restore()

        it 'displays 10 rows', ->
          expect(@list.$el.find('tbody>tr').size()).toEqual(10)

        it 'adds the "loaded" class to the table', ->
          expect(@list.ui.table).toHaveClass('loaded')

        it 'adds the "populated" class to the table', ->
          expect(@list.ui.table).toHaveClass('populated')

      describe 'when the URL returns 0 items', ->
        beforeEach ->
          @server = sinon.fakeServer.create()
          @server.respondWith("GET", urlRoot(),
              [200, {"Content-Type": "application/json"}, json(0)])
          @collection = buildCollection()
          @list = new RowList
            collection: @collection
            columns: buildColumns()
            static: false
          @region.show(@list)
          @server.respond()

        afterEach ->
          @server.restore()

        it 'displays 1 row containing the EmptyView', ->
          expect(@list.$el.find('tbody>tr').size()).toEqual(1)

        it 'adds the "loaded" class to the table', ->
          expect(@list.ui.table).toHaveClass('loaded')

        it 'does add the "populated" class to the table', ->
          expect(@list.ui.table).toHaveClass('populated')

    describe 'when the collection is selectable', ->

      buildPopulatedRowList = (n, opts) ->
        buildCollection = (n, opts) ->
          Model = Backbone.Model.extend defaults: opts.modelDefaults
          collection = _.times(n, -> new Model(id: n))
          new Backbone.Collection collection, { model: Model }


        defaultRowListOptions =
          collection:      buildCollection(n, opts)
          columns:         opts.columns
          static:          true
          tableSelections: {}
          carpenterRadio: buildCarpenterRadio()
        rowListOptions = _.extend({}, defaultRowListOptions, opts.rowListOptions)
        new RowList rowListOptions

      beforeEach ->
        modelDefaults =
          username: 'matt'
          password: 'pass'

        columns = [
          { attribute: 'username' }
          { attribute: 'password' }
        ]

        rowListOptions =
          selectable: true
          tableSelections:
            selectAllState: false
            deselectedIDs: {}
            selectedIDs: {}

        list = buildPopulatedRowList(5, { columns, modelDefaults, rowListOptions })
        @region.show(list)

      describe 'when the select all checkbox is clicked', ->

        describe 'when the select all checkbox was previously deselected', ->
          it 'selects all visible checkboxes', ->
            @region.$el.find('th.select-all input').click()

            $visibleCheckboxes = @region.$el.find('td.checkbox input')
            expect($visibleCheckboxes.filter(':checked').length)
              .toEqual($visibleCheckboxes.length)

        describe 'when the select all checkbox was previously deselected', ->
          it 'deselects all visible checkboxes', ->
            @region.$el.find('th.select-all input').click().click()

            $visibleCheckboxes = @region.$el.find('td.checkbox input')
            expect($visibleCheckboxes.filter(':not(:checked)').length)
              .toEqual($visibleCheckboxes.length)
