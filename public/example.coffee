class WoodworkersCollection extends Backbone.Collection
  url: '/woodworkers.json'

collection = new WoodworkersCollection
collection.fetch
  success: ->
    new Marionette.Carpenter.Controller
      title: 'Woodworkers'
      region: new Backbone.Marionette.Region el: '#table-region'
      collection: collection
      static: true
      columns: [
        { attribute: 'first_name' }
        { attribute: 'last_name' }
        { attribute: 'email' }
        { attribute: 'city' }
        { attribute: 'state' }
      ]

    $('table').addClass 'table'