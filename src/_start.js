(function(root, factory) {
  var deps = ['cocktail', 'underscore', 'backbone.radio', 'underscore.string', 'jquery-resizable-columns', 'marionette'];

  if (typeof define === 'function' && define.amd) {
    define(deps, function(Cocktail, _) {
      return (root.Carpenter = factory(root, Cocktail, _));
    });
  } else if (typeof exports !== 'undefined') {
    var Cocktail = require('cocktail');
    var _ = require('underscore');
    module.exports = factory(root, Cocktail, _);
  } else {
    root.Carpenter = factory(root, root.Cocktail, root._);
  }

}(this, function(root, Cocktail, _) {
