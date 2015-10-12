_ = require('underscore')
require('../src/set') unless @set?

describe 'jasmine-set plugin', ->

  describe 'a top-level set (a=1)', ->
    set 'a', -> 1

    _.times 3, -> it 'sets a to 1', -> expect(a).toEqual(1)

    describe 'a nested refining set', ->
      set 'a', -> 2

      _.times 3, ->  it 'sets a to 2', -> expect(a).toEqual(2)

    describe 'a nested set that does not change a', ->

      _.times 3, -> it 'sets a to 1', -> expect(a).toEqual(1)

      describe 'a nested refining set', ->
        set 'a', -> 3

        _.times 3, -> it 'sets a to 3', -> expect(a).toEqual(3)

        describe 'a nested set that does not change a', ->

          _.times 3, -> it 'sets a to 3', -> expect(a).toEqual(3)

  describe 'the next suite (a=3)', ->

    set 'a', -> 3

    _.times 3, -> it 'sets a to 3', -> expect(a).toEqual(3)

  describe 'the next suite, which does not set a', ->

    _.times 3, -> it 'does not set a', -> expect(typeof a).toEqual("undefined")

  describe 'a suite that accesses the a in beforeEach', ->

    set 'a', -> 4

    beforeEach ->
      `a = 5`

    _.times 3, -> it 'sets a to 5', -> expect(a).toEqual(5)

  describe 'a suite that calls set after beforeEach', ->

    set 'b', -> 7

    beforeEach ->
      `b = 6`

    _.times 3, -> it 'sets b to 6', -> expect(b).toEqual(6)

describe 'jasmine-set plugin with a set (a=1)', ->
  set 'a', -> 1

  describe 'with no immediate sub-specs, just a sub-context', ->

    _.times 3, -> it 'sets a to 1', -> expect(a).toEqual(1)

describe 'jasmine-set with cross-referencing sets', ->

  set 'a', -> 1
  set 'b', -> a + 1

  _.times 3, -> it 'sets a to 1', -> expect(a).toEqual(1)
  _.times 3, -> it 'sets b to 2', -> expect(b).toEqual(2)

describe 'jasmine-set with cross-referencing, reverse sets', ->

  set 'b', -> a + 1
  set 'a', -> 1

  describe 'within an immediate suite', ->

    _.times 3, -> it 'sets a to 1', -> expect(a).toEqual(1)
    _.times 3, -> it 'sets b to 2', -> expect(b).toEqual(2)

describe 'jasmine-set with cross-referencing, reverse sets, that are referenced in a beforeEach', ->

  set 'a', -> 1
  set 'b', -> a + 1  

  beforeEach -> `b+=1`

  describe 'within an immediate suite', ->

    _.times 3, -> it 'sets a to 1', -> expect(a).toEqual(1)
    _.times 3, -> it 'sets b to 3', -> expect(b).toEqual(3)

describe 'an outer beforeEach that depends on a nested set call', ->

  beforeEach -> `a+=1`

  describe 'when a is overriden inside a nested suite to depend on a nested var', ->

    set 'b', -> 1
    set 'a', -> b + 1

    _.times 3, -> it 'sets a to 2', -> expect(a).toEqual(2)
    _.times 3, -> it 'sets b to 1', -> expect(b).toEqual(1)


describe 'an outer beforeEach that depends on a nested set call', ->

  beforeEach -> `a+=1`

  describe 'when a is overriden inside a nested suite to depend on a nested var', ->

    set 'b', -> 1
    set 'a', -> b + 1

    describe 'within an immediate suite', ->

      _.times 3, -> it 'sets a to 2', -> expect(a).toEqual(2)
      _.times 3, -> it 'sets b to 1', -> expect(b).toEqual(1)
