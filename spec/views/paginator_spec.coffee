define [
  'views/paginator'
  'spec/support/shared/examples/create_region'
  'entities/paginated_collection'
], (Paginator, createRegion, createPaginatedCollectionClass) ->

  describe 'Paginator View', ->

    createRegion()

    buildPaginatedCollection = (n=5) ->
      Collection = Backbone.Collection.extend
        model: Backbone.Model
      collection = new Collection({})
      PaginatedCollection = createPaginatedCollectionClass(collection, static: true)
      c = new PaginatedCollection(_.times(n, -> {}))
      c.bootstrap()
      c.goTo(1)
      c

    describe 'perPageOptions', ->

      describe 'when given perPageOptions of [100, 500, 1000] and perPage of 500', ->

        beforeEach ->
          @paginator = new Paginator
            collection: buildPaginatedCollection()
            perPageOptions: [100, 500, 1000]
            perPage: 500
            static: true
          @region.show @paginator

        it 'renders a dropdown containing a 100 option', ->
          expect(@region.el).toContainNodeWithText(100, 'option')

        it 'renders a dropdown containing a 500 option', ->
          expect(@region.el).toContainNodeWithText(500, 'option')

        it 'renders a dropdown containing a 1000 option', ->
          expect(@region.el).toContainNodeWithText(1000, 'option')

        it 'selects the 500 option from the dropdown', ->
          expect(@paginator.ui.perPage.val()).toEqual("500")

    describe 'currentPage', ->

      describe 'when currentPage is 1', ->

        beforeEach ->
          @region.show new Paginator
            collection: buildPaginatedCollection()
            perPageOptions: [100, 500, 1000]
            currentPage: 1
            static: true

        it 'renders descriptive text containing "1 - "', ->
          expect(@region.el).toContainNodeWithText('1 - ')

    describe 'totalRecords', ->

      describe 'when totalRecords is 0', ->
        beforeEach ->
          @region.show new Paginator
            collection: buildPaginatedCollection(0)
            perPageOptions: [100, 500, 1000]
            currentPage: 1
            static: true

        it 'does not render pagination', ->
          expect($(@region.el).text().trim()).toEqual('')


    describe 'button behavior', ->

      describe 'when totalRecords is 20, perPage is 10, and currentPage is 0', ->

        beforeEach ->
          collection = buildPaginatedCollection(20)
          @paginator = new Paginator
            collection: collection
            perPage: 10
            perPageOptions: [10,20,100]
            static: true
          @region.show @paginator

        it 'disables the first page button', ->
          expect(@paginator.ui.first).toHaveClass('disabled')

        it 'enables the last page button', ->
          expect(@paginator.ui.last).not.toHaveClass('disabled')

        it 'enables the next page button', ->
          expect(@paginator.ui.next).not.toHaveClass('disabled')

        it 'disables the previous page button', ->
          expect(@paginator.ui.previous).toHaveClass('disabled')

        describe 'and the collection.nextPage() method is called', ->
          beforeEach ->
            @paginator.collection.nextPage()

          it 'enables the first page button', ->
            expect(@paginator.ui.first).not.toHaveClass('disabled')

          it 'disables the last page button', ->
            expect(@paginator.ui.last).toHaveClass('disabled')

          it 'disables the next page button', ->
            expect(@paginator.ui.next.hasClass('disabled')).toEqual(true)

          it 'enables the previous page button', ->
            expect(@paginator.ui.previous.hasClass('disabled')).toEqual(false)
