beforeEach ->
  @addMatchers

    #
    # Checks if @actual is an instance of the class +klass+
    #
    toBeAnInstanceOf: (klass) ->
      @actual instanceof klass
