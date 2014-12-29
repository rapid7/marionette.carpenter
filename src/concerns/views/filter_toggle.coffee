
define [], ->

  FilterToggle =
    ui:
      filterToggle: 'a.filter-toggle'

    events:
      'click @ui.filterToggle': 'triggerFilterToggle'

    #
    # Trigger the custom filter toggle event.
    #
    # @return [void]
    triggerFilterToggle: ->
      @ui.filterToggle.toggleClass 'enabled'
      @carpenter.trigger @filterToggleEvent