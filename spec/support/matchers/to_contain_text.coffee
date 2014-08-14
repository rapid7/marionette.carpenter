$ = jQuery

beforeEach ->
  @addMatchers

    #
    # Checks if +needle+ is a substring of @actual
    #
    toContainText: (needle) ->
      $(@actual).text().indexOf(needle) > -1
