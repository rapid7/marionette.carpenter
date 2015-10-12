[![Build Status](https://travis-ci.org/jvennix-r7/jasmine-set.svg?branch=master)](https://travis-ci.org/jvennix-r7/jasmine-set)

jasmine-set brings rspec's `let` syntax to the [Jasmine](http://jasmine.github.io/) behavior-driven development framework for testing JavaScript code. The `set` global function is provided, which allows the spec writer to define lazy global accessors that can be refined in nested specs. To achieve this behavior, the `Suite.prototype.finish` function from Jasmine is wrapped.

##### Why not `let`?

In Ecmascript, `let` is a reserved word that allows for block-level scoping (as opposed to `var`, which is functionally-scoped).

### Sample Usage

    describe 'House', ->
      set 'opts',  -> {}
      set 'house', -> new House(opts)

      it 'has a door', -> expect(house).toHaveADoor()

      describe 'with no doors', ->
        set 'opts', -> { doors: 0 }

        it 'does not have a door', -> expect(house).not.toHaveADoor()

### Dependencies

- underscore (~1.6)
- node >= 0.8

### Building from source

    $ npm i
    $ ./jake build

### Running specs

    $ ./jake spec [DEBUG=1] [SPEC=./spec/set.coffee]

### License

[MIT](http://en.wikipedia.org/wiki/MIT_License)

### Copyright

Rapid7 2014
