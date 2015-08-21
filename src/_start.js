(function(root, factory) {
  var deps = ['cocktail', 'jquery', 'underscore', 'marionette', 'backbone.radio'];

  if (typeof define === 'function' && define.amd) {
    define('carpenter', deps, function(Cocktail, $, _, Marionette) {
      return (root.Carpenter = factory(root, Cocktail, $, _, Marionette));
    });
  } else if (typeof exports !== 'undefined') {
    var Cocktail = require('cocktail');
    var $ = require('jquery');
    var _ = require('underscore');
    var Marionette = require('marionete');
    module.exports = factory(root, Cocktail, $, _, Marionette);
  } else {
    root.Carpenter = factory(root, root.Cocktail, root.$, root._, root.Marionette);
  }

}(this, function(root, Cocktail,$, _, Marionette) {
