$ = jQuery

beforeEach ->
  @addMatchers

    #
    # Checks if the DOM element has the specified class +class+
    #
    toHaveClass: (klass) ->
      _.all $(@actual), (el) -> $(el).hasClass(klass)
