$ = jQuery

beforeEach ->
  @addMatchers

    #
    # Given an HTML element, this matcher checks if
    # the element contains a child node whose text value
    # contains +needle+. This prevents specs from passing
    # if +needle+ occurs from the concatenation of the
    # extracted text values of multiple child nodes.
    #
    # That is, this matcher ensures that the entirety of
    # +needle+ occurs within a single child node.
    #
    # An optional +sel+ parameter can be passed to specify
    # the properties of the node that contains the text.
    #
    toContainNodeWithText: (needle, sel='*') ->
      _.any $(@actual).find(sel).andSelf(), (child) ->
        $(child)
          .clone()
          .children()
          .remove()
          .end()
          .text().indexOf(needle) > -1
