define [
  'utilities/mixin'
], ->
    # This is the base controller class that all other Marionette
    # controllers should inherit from. It provides some convenience
    # methods that most controllers would implement, like unbinding
    # or adding views to the main region of the @app.
    class Controller extends Marionette.Controller

      # @param [Object] options the options hash
      # @option options [Region] the region to render in. Defaults to the
      constructor: (options = {}) ->
        @region = options.region
        @app = options.app
        super options
        @_instance_id = _.uniqueId("controller")
        @app.execute "register:instance", @, @_instance_id

      # Unregisters the Controller from the app and closes itself
      close: ->
        @app.execute "unregister:instance", @, @_instance_id
        super

      # Shows the specified view in the desired region. If a Controller
      # is passed isntead of a view, the Controller's view will be auto-
      # magically used instead.
      #
      # @param [Backbone.View] view the view to insert into the region
      # @param [Object] options the options hash
      # @option options [region] an optional region to use instead of the
      #                          default region (@see #constructor)
      # @option options [Boolean] loading show the loading view until the
      #                        
      show: (view, options={}) ->
        _.defaults options,
          loading: false
          region: @region

        # allow us to pass in a controller instance instead of a view
        # if controller instance, set view to the mainView of the controller
        view = if view.getMainView then view.getMainView() else view
        throw new Error("getMainView() did not return a view instance or #{view?.constructor?.name} is not a view instance") if not view

        @setMainView view
        @_manageView view, options

      
      # @return [Backbone.View] the main view
      getMainView: ->
        @_mainView

      # Sets the main view, and remembers to close ourself when this view closes
      # @param [Backbone.View] the view to render
      setMainView: (view) ->

        # the first view we show is always going to become the mainView of our
        # controller (whether its a layout or another view type).  So if this
        # *is* a layout, when we show other regions inside of that layout, we
        # check for the existance of a mainView first, so our controller is only
        # closed down when the original mainView is closed.

        return if @_mainView
        @_mainView = view
        @listenTo view, "close", @close

      _manageView: (view, options) ->
        if options.loading
          ## show the loading view
          @app.execute "show:loading", view, options
        else
          options.region.show view

      mergeDefaultsInto: (obj) ->
        obj = if _.isObject(obj) then obj else {}
        _.defaults obj, @_getDefaults()

      _getDefaults: ->
        _.clone _.result(@, "defaults")