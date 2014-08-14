define [], ->
    FilterCustomQueryField =
      ui:
        filterCustomQueryField: 'input.filter-custom-query-field'

      events:
        'keyup @ui.filterCustomQueryField': 'inputActivity'

      #
      # Handle input activity in the custom query field.
      #
      # @return [void]
      inputActivity: ->
        @debouncedTriggerCustomQuery ||= _.debounce(@triggerFilterCustomQuery, 1000)
        @debouncedTriggerCustomQuery()

      #
      # Trigger the custom query event with the value of the custom query field.
      #
      # @return [void]
      triggerFilterCustomQuery: ->
        @app.vent.trigger @filterCustomQueryEvent, @ui.filterCustomQueryField.val()
