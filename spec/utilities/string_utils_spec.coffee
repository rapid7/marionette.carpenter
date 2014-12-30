define ['utilities/string_utils'], (StringUtils) ->

  describe 'StringUtils.humanize', ->
    describe 'when given "a   bCD eFG"', ->
      it 'returns "A b cd e fg"', ->
        expect(StringUtils.humanize("a   bCD eFG")).toEqual("A b cd e fg")


  describe 'StringUtils.capitalize', ->
    describe 'when given "abc"', ->
      it 'returns "Abc"', ->
        expect(StringUtils.capitalize('abc')).toEqual('Abc')


  describe 'StringUtils.underscored', ->
    describe 'when given "ABc def"', ->
      it 'returns "abc_def"', ->
        expect(StringUtils.underscored('ABc def')).toEqual('abc_def')
