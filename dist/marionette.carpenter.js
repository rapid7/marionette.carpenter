(function(root, factory) {
  var deps = ['cocktail', 'jquery', 'underscore', 'marionette', 'backbone.radio'];

  if (typeof define === 'function' && define.amd) {
    define(deps, function(Cocktail, $, _, Marionette) {
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
/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('controllers/application_controller',[], function() {
  var Controller;
  return Controller = (function(_super) {
    __extends(Controller, _super);

    function Controller(options) {
      if (options == null) {
        options = {};
      }
      this.region = options.region;
      this._attachRadio();
      Controller.__super__.constructor.call(this, options);
      this._instance_id = _.uniqueId("controller");
      this.carpenterRadio.command("register:instance", this, this._instance_id);
    }

    Controller.prototype.destroy = function() {
      this.carpenterRadio.command("unregister:instance", this, this._instance_id);
      return Controller.__super__.destroy.apply(this, arguments);
    };

    Controller.prototype.show = function(view, options) {
      var _ref;
      if (options == null) {
        options = {};
      }
      _.defaults(options, {
        loading: false,
        region: this.region
      });
      view = view.getMainView ? view.getMainView() : view;
      if (!view) {
        throw new Error("getMainView() did not return a view instance or " + (view != null ? (_ref = view.constructor) != null ? _ref.name : void 0 : void 0) + " is not a view instance");
      }
      this.setMainView(view);
      return this._manageView(view, options);
    };

    Controller.prototype.getMainView = function() {
      return this._mainView;
    };

    Controller.prototype.setMainView = function(view) {
      if (this._mainView) {
        return;
      }
      this._mainView = view;
      return this.listenTo(view, "destroy", this.destroy);
    };

    Controller.prototype._manageView = function(view, options) {
      if (options.loading) {
        return this.carpenterRadio.command("show:loading", view, options);
      } else {
        return options.region.show(view);
      }
    };

    Controller.prototype.mergeDefaultsInto = function(obj) {
      obj = _.isObject(obj) ? obj : {};
      return _.defaults(obj, this._getDefaults());
    };

    Controller.prototype._attachRadio = function() {
      return this.carpenterRadio = Backbone.Radio.channel('carpenter');
    };

    Controller.prototype.channel = function() {
      return this.carpenterRadio;
    };

    Controller.prototype._getDefaults = function() {
      return _.clone(_.result(this, "defaults"));
    };

    return Controller;

  })(Marionette.Controller);
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('entities/paginated_collection',[], function() {
  var AjaxPaginatedCollection, CreatePaginatedCollectionClass, StaticPaginatedCollection;
  AjaxPaginatedCollection = (function(_super) {
    __extends(AjaxPaginatedCollection, _super);

    function AjaxPaginatedCollection() {
      return AjaxPaginatedCollection.__super__.constructor.apply(this, arguments);
    }

    AjaxPaginatedCollection.prototype.server_api = {
      ui: 1,
      sort_by: null,
      format: 'json',
      per_page: function() {
        return this.perPage;
      },
      page: function() {
        return this.currentPage;
      }
    };

    AjaxPaginatedCollection.prototype.setSort = function(sortColumn, sortDirection, renamedSortColumn) {
      this.sortColumn = sortColumn;
      this.sortDirection = sortDirection;
      this.renamedSortColumn = renamedSortColumn;
      this.updateSortKey();
      return this.fetch({
        reset: true
      });
    };

    AjaxPaginatedCollection.prototype.setSearch = function(filter) {
      this.server_api.search = filter.attributes;
      return this.fetch({
        reset: true,
        error: (function(_this) {
          return function(model, response, options) {
            var _ref;
            return _this.displayErrorMessage(response != null ? (_ref = response.responseJSON) != null ? _ref.message : void 0 : void 0);
          };
        })(this)
      });
    };

    AjaxPaginatedCollection.prototype.displayErrorMessage = function(message) {
      return this.carpenterRadio.trigger('error:search', message);
    };

    AjaxPaginatedCollection.prototype.updateSortKey = function() {
      var col;
      col = this.renamedSortColumn || this.sortColumn;
      return this.server_api.sort_by = "" + col + " " + this.sortDirection;
    };

    AjaxPaginatedCollection.prototype.parse = function(results) {
      this.totalRecords = results.total_count;
      return results.collection;
    };

    AjaxPaginatedCollection.prototype.sort = function() {};

    AjaxPaginatedCollection.prototype.initialize = function(models, options) {
      this.numSelected = 0;
      this.server_api.search = {};
      return AjaxPaginatedCollection.__super__.initialize.call(this, models, options);
    };

    return AjaxPaginatedCollection;

  })(Backbone.Paginator.requestPager);
  StaticPaginatedCollection = (function(_super) {
    __extends(StaticPaginatedCollection, _super);

    function StaticPaginatedCollection() {
      return StaticPaginatedCollection.__super__.constructor.apply(this, arguments);
    }

    return StaticPaginatedCollection;

  })(Backbone.Paginator.clientPager);
  return CreatePaginatedCollectionClass = function(collection, opts) {
    var WrappedCollection, k, superclass, v, _base, _ref, _ref1;
    if (opts == null) {
      opts = {};
    }
    superclass = opts["static"] ? StaticPaginatedCollection : AjaxPaginatedCollection;
    WrappedCollection = superclass.extend({
      model: collection.constructor.prototype.model || collection.model,
      url: _.result(collection, 'url'),
      paginator_core: {
        type: 'GET',
        dataType: 'json'
      },
      paginator_ui: {
        firstPage: opts.firstPage || 1,
        currentPage: opts.currentPage || 1,
        perPage: opts.perPage || 20
      },
      carpenterRadio: opts.carpenterRadio,
      updateNumSelected: function(numSelected) {
        this.numSelected = numSelected;
        return this.trigger('change:numSelected');
      },
      removeMultiple: function(models) {
        var selectedIDs;
        selectedIDs = models.pluck('id');
        return this.trigger('remove:multiple', selectedIDs);
      }
    });
    _ref = collection.constructor.prototype;
    for (k in _ref) {
      v = _ref[k];
      (_base = WrappedCollection.prototype)[k] || (_base[k] = v);
    }
    _ref1 = WrappedCollection.prototype;
    for (k in _ref1) {
      v = _ref1[k];
      if (typeof v === 'object') {
        WrappedCollection.prototype[k] = _.clone(v);
      }
    }
    return WrappedCollection;
  };
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('entities/action_button',[], function() {
  var ActionButton;
  return ActionButton = (function(_super) {
    __extends(ActionButton, _super);

    function ActionButton() {
      return ActionButton.__super__.constructor.apply(this, arguments);
    }

    ActionButton.prototype.initialize = function(attributes) {
      if (this.get('activateOn')) {
        this.set('disabled', true);
      }
      return ActionButton.__super__.initialize.call(this, attributes);
    };

    ActionButton.prototype.enable = function() {
      return this.set('disabled', false);
    };

    ActionButton.prototype.disable = function() {
      return this.set('disabled', true);
    };

    return ActionButton;

  })(Backbone.Model);
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('entities/action_buttons_collection',['entities/action_button'], function(ActionButton) {
  var ActionButtonsCollection;
  return ActionButtonsCollection = (function(_super) {
    __extends(ActionButtonsCollection, _super);

    function ActionButtonsCollection() {
      return ActionButtonsCollection.__super__.constructor.apply(this, arguments);
    }

    ActionButtonsCollection.prototype.model = ActionButton;

    return ActionButtonsCollection;

  })(Backbone.Collection);
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('entities/filter',[], function() {
  var Filter;
  return Filter = (function(_super) {
    __extends(Filter, _super);

    function Filter() {
      return Filter.__super__.constructor.apply(this, arguments);
    }

    return Filter;

  })(Backbone.Model);
});

define('templates/action_button',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<a href=\'javascript:void(0)\' '));
    
      if (this.id) {
        _print(_safe('id="'));
        _print(this.id);
        _print(_safe('"'));
      }
    
      _print(_safe(' class="action-button '));
    
      _print(this["class"]);
    
      _print(_safe(' '));
    
      if (this.disabled) {
        _print(_safe('disabled'));
      }
    
      _print(_safe('">\n  '));
    
      _print(this.label);
    
      _print(_safe('\n</a>'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

define('views/action_button',['templates/action_button'], function(template) {
  var ActionButton;
  return ActionButton = (function(_super) {
    __extends(ActionButton, _super);

    function ActionButton() {
      return ActionButton.__super__.constructor.apply(this, arguments);
    }

    ActionButton.prototype.template = template;

    ActionButton.prototype.tagName = 'li';

    ActionButton.prototype.className = function() {
      return this.model.get('containerClass');
    };

    ActionButton.prototype.modelEvents = {
      'change:disabled': 'render'
    };

    ActionButton.prototype.events = {
      'click': 'executeClickActions'
    };

    ActionButton.prototype.initialize = function(opts) {
      this.carpenter = opts.carpenter;
      this.selectable = !!opts.selectable;
      this.tableCollection = opts.tableCollection;
      this.tableSelections = opts.tableSelections;
      this.listenTo(this.tableCollection, 'selection_toggled', (function(_this) {
        return function() {
          return _this.setActivationState();
        };
      })(this));
      return this.listenTo(this.tableCollection, 'select_all_toggled', (function(_this) {
        return function() {
          return _this.setActivationState();
        };
      })(this));
    };

    ActionButton.prototype.setActivationState = function(rowModel) {
      var activateOn, moreThanOneSelected, numSelected, oneSelected;
      activateOn = this.model.get('activateOn');
      if (!this.selectable || !activateOn) {
        this.model.enable();
        return false;
      }
      numSelected = this.tableCollection.numSelected;
      moreThanOneSelected = this.tableSelections.selectAllState || numSelected > 1;
      oneSelected = numSelected === 1;
      if (activateOn === 'any' && (oneSelected || moreThanOneSelected)) {
        return this.model.enable();
      } else if (activateOn === 'many' && moreThanOneSelected) {
        return this.model.enable();
      } else if ((activateOn === 'one' && oneSelected) && !this.tableSelections.selectAllState) {
        return this.model.enable();
      } else {
        return this.model.disable();
      }
    };

    ActionButton.prototype.executeClickActions = function() {
      if ((this.model.get('disabled') == null) || ((this.model.get('disabled') != null) && !this.model.get('disabled'))) {
        this.executeCallback();
        return this.executeTrigger();
      }
    };

    ActionButton.prototype.executeTrigger = function() {
      if (this.model.get('event')) {
        return this.carpenterRadio.trigger(this.model.get('event'));
      }
    };

    ActionButton.prototype.executeCallback = function() {
      var deselectedIDs, selectAllState, selectedIDs, selectedVisibleCollection;
      if (!this.model.get('click')) {
        return false;
      }
      if (this.selectable) {
        selectAllState = this.tableSelections.selectAllState;
        selectedIDs = Object.keys(this.tableSelections.selectedIDs);
        deselectedIDs = Object.keys(this.tableSelections.deselectedIDs);
        selectedVisibleCollection = new Backbone.Collection(this.tableCollection.filter(function(model) {
          var _ref;
          return _ref = model.id, __indexOf.call(selectedIDs, _ref) >= 0;
        }));
        return this.model.get('click')(selectAllState, selectedIDs, deselectedIDs, selectedVisibleCollection, this.tableCollection);
      } else {
        return this.model.get('click')();
      }
    };

    return ActionButton;

  })(Marionette.ItemView);
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/control_bar',['views/action_button'], function(ActionButton) {
  var ControlBar;
  return ControlBar = (function(_super) {
    __extends(ControlBar, _super);

    function ControlBar() {
      return ControlBar.__super__.constructor.apply(this, arguments);
    }

    ControlBar.prototype.childView = ActionButton;

    ControlBar.prototype.tagName = 'ul';

    ControlBar.prototype.className = 'table-control-bar';

    ControlBar.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      this.collection = opts.actionButtonsCollection;
      this.columns = opts.columns;
      this.tableSelections = opts.tableSelections;
      this.tableCollection = opts.tableCollection;
      this.selectable = !!opts.selectable;
      this.carpenter = opts.carpenter;
      return ControlBar.__super__.initialize.apply(this, arguments);
    };

    ControlBar.prototype.buildChildView = function(item, ItemViewType, itemViewOptions) {
      var defaultOptions, options;
      defaultOptions = {
        tableSelections: this.tableSelections,
        tableCollection: this.tableCollection,
        selectable: this.selectable,
        model: item
      };
      options = _.extend(defaultOptions, itemViewOptions);
      return new ItemViewType(options);
    };

    ControlBar.prototype.serializeData = function() {
      return this;
    };

    return ControlBar;

  })(Marionette.CollectionView);
});

define('templates/empty',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<td colspan=\'100%\'>No items were found.</td>'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/empty',['templates/empty'], function(template) {
  var Empty;
  return Empty = (function(_super) {
    __extends(Empty, _super);

    function Empty() {
      return Empty.__super__.constructor.apply(this, arguments);
    }

    Empty.prototype.template = template;

    Empty.prototype.tagName = 'tr';

    Empty.prototype.attributes = {
      "class": 'empty'
    };

    return Empty;

  })(Marionette.ItemView);
});

define('templates/header',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      if (this.title && this.title.length) {
        _print(_safe('\n  <h3\n    '));
        if (this.htmlID != null) {
          _print(_safe('\n      data-table-id=\''));
          _print(this.htmlID);
          _print(_safe('\'\n    '));
        }
        _print(_safe('\n  >\n    '));
        _print(this.title);
        _print(_safe('\n  </h3>\n'));
      }
    
      _print(_safe('\n\n<div class=\'right\'>\n  '));
    
      if (this.searchable) {
        _print(_safe('\n    <input type=\'text\' name=\'query\' />\n  '));
      }
    
      _print(_safe('\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/header',['templates/header'], function(template) {
  var Header;
  return Header = (function(_super) {
    __extends(Header, _super);

    function Header() {
      return Header.__super__.constructor.apply(this, arguments);
    }

    Header.prototype.template = template;

    Header.prototype.attributes = {
      "class": 'table-header'
    };

    Header.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      this.title = opts.title;
      this.taggable = !!opts.taggable;
      return this.htmlID = opts.htmlID;
    };

    Header.prototype.serializeData = function() {
      return this;
    };

    return Header;

  })(Marionette.ItemView);
});

define('templates/layout',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('\n<div class=\'header-region\'>\n</div>\n\n'));
    
      _print(_safe('\n<div class=\'selection-indicator-region\'>\n</div>\n\n'));
    
      _print(_safe('\n<div class=\'buttons-region\'>\n</div>\n\n<div class=\'filter-region\'>\n</div>\n\n<div class=\'table-container\'>\n  '));
    
      _print(_safe('\n  <div class=\'table-region\'>\n  </div>\n\n  '));
    
      _print(_safe('\n  <div class=\'overlay-region\'>\n  </div>\n</div>\n\n'));
    
      _print(_safe('\n<div class=\'pagination-region\'>\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/layout',['templates/layout'], function(template) {
  var Layout;
  return Layout = (function(_super) {
    __extends(Layout, _super);

    function Layout() {
      this._modelForTd = __bind(this._modelForTd, this);
      this._columnForTd = __bind(this._columnForTd, this);
      this.mouseEnteredTableCell = __bind(this.mouseEnteredTableCell, this);
      this.mouseEnteredTableHeader = __bind(this.mouseEnteredTableHeader, this);
      return Layout.__super__.constructor.apply(this, arguments);
    }

    Layout.prototype.template = template;

    Layout.prototype.regions = {
      headerRegion: '.header-region',
      filterRegion: '.filter-region',
      buttonsRegion: '.buttons-region',
      tableRegion: '.table-region',
      paginationRegion: '.pagination-region',
      overlayRegion: '.overlay-region',
      selectionIndicatorRegion: '.selection-indicator-region'
    };

    Layout.prototype.events = {
      'mouseenter td': 'mouseEnteredTableCell',
      'mouseenter th': 'mouseEnteredTableHeader'
    };

    Layout.prototype.attributes = {
      "class": 'table-component foundation'
    };

    Layout.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      _.extend(this.regions, opts != null ? opts.regions : void 0);
      this.controller = opts;
      this.columns = opts.columns;
      this.collection = opts.collection;
      return this.selectable = !!opts.selectable;
    };

    Layout.prototype.serializeData = function() {
      return this;
    };

    Layout.prototype.mouseEnteredTableHeader = function(e) {
      return this.overlayRegion.reset();
    };

    Layout.prototype.mouseEnteredTableCell = function(e) {
      var column, hover, model, tdPosition, _ref;
      column = this._columnForTd(e.currentTarget);
      model = this._modelForTd(e.currentTarget);
      if ((column != null ? column.hoverView : void 0) != null) {
        if ((column != null ? column.hoverOn : void 0) != null) {
          if (!column.hoverOn.call({
            model: model,
            column: column
          })) {
            return;
          }
        }
        hover = new column.hoverView({
          model: model,
          column: column
        });
        tdPosition = $(e.currentTarget).position();
        tdPosition.top += $(e.currentTarget).outerHeight() - 2;
        tdPosition.width = $(e.currentTarget).outerWidth();
        this.overlayRegion.show(hover);
        return (_ref = this.overlayRegion.$el) != null ? _ref.css(tdPosition) : void 0;
      } else {
        return this.overlayRegion.reset();
      }
    };

    Layout.prototype._columnForTd = function(td) {
      var colIdx;
      colIdx = $(td).index();
      if (this.selectable) {
        colIdx--;
      }
      return this.columns[colIdx];
    };

    Layout.prototype._modelForTd = function(td) {
      var rowIdx;
      rowIdx = $(td).parent('tr').index();
      return this.collection.models[rowIdx];
    };

    return Layout;

  })(Marionette.LayoutView);
});

define('templates/loading',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<td colspan="100%" class=\'tab-loading\'>\n</td>'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/loading',['templates/loading'], function(template) {
  var Loading;
  return Loading = (function(_super) {
    __extends(Loading, _super);

    function Loading() {
      return Loading.__super__.constructor.apply(this, arguments);
    }

    Loading.prototype.template = template;

    Loading.prototype.tagName = 'tr';

    return Loading;

  })(Marionette.ItemView);
});

define('templates/paginator',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var i, val, _i, _len, _ref;
    
      if (this.collection.length > 0) {
        _print(_safe('\n  <div class=\'left\'>\n    <label class=\'row_select\'>\n      <span class=\'line\'>Show</span>\n      <select class=\'rows\'>\n        '));
        _ref = this.perPageOptions;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _print(_safe('\n          '));
          val = i === 'All' ? this.ALL_MAGIC : i;
          _print(_safe('\n          <option value=\''));
          _print(val);
          _print(_safe('\' '));
          _print(this.perPage.toString() === val.toString() ? 'selected' : void 0);
          _print(_safe('>'));
          _print(i);
          _print(_safe('</option>\n        '));
        }
        _print(_safe('\n      </select>\n    </label>\n\n    <span class=\'page_info line\'>\n      Showing '));
        _print((this.currentPage - 1) * this.perPage + 1);
        _print(_safe(' - '));
        _print(this.lastRow);
        _print(_safe(' of '));
        _print(this.totalRecords);
        _print(_safe('\n    </span>\n  </div>\n\n  <div class=\'page_navigation\'>\n    <a href=\'javascript:void(0)\' title=\'First\' class=\'first '));
        if (this.isFirstPage) {
          _print('disabled');
        }
        _print(_safe('\'></a>\n    <a href=\'javascript:void(0)\' title=\'Previous\' class=\'previous '));
        if (this.isFirstPage) {
          _print('disabled');
        }
        _print(_safe('\'></a>\n\n    <input class="curr" value="'));
        _print(this.currentPage);
        _print(_safe('" />\n\n    <a href=\'javascript:void(0)\' title=\'Next\' class=\'next '));
        if (this.isLastPage) {
          _print('disabled');
        }
        _print(_safe('\'></a>\n    <a href=\'javascript:void(0)\' title=\'Last\' class=\'last '));
        if (this.isLastPage) {
          _print('disabled');
        }
        _print(_safe('\'></a>\n  </div>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

/*! backbone.paginator - v1.0.0-dev - 4/6/2014
* http://github.com/backbone-paginator/backbone.paginator
* Copyright (c) 2014 Addy Osmani; Licensed MIT */
/*globals Backbone:true, _:true, jQuery:true*/
Backbone.Paginator = (function ( Backbone, _, $ ) {
  


  var bbVer = _.map(Backbone.VERSION.split('.'), function(digit) {
    return parseInt(digit, 10);
  });

  var Paginator = {};
  Paginator.version = "1.0.0-dev";

  // @name: clientPager
  //
  // @tagline: Paginator for client-side data
  //
  // @description:
  // This paginator is responsible for providing pagination
  // and sort capabilities for a single payload of data
  // we wish to paginate by the UI for easier browsering.
  //
  Paginator.clientPager = Backbone.Collection.extend({

    // DEFAULTS FOR SORTING & FILTERING
    useDiacriticsPlugin: true, // use diacritics plugin if available
    useLevenshteinPlugin: true, // use levenshtein plugin if available
    sortColumn: "",
    sortDirection: "desc",
    lastSortColumn: "",
    fieldFilterRules: [],
    lastFieldFilterRules: [],
    filterFields: "",
    filterExpression: "",
    lastFilterExpression: "",

    //DEFAULT PAGINATOR UI VALUES
    defaults_ui: {
      firstPage: 0,
      currentPage: 1,
      perPage: 5,
      totalPages: 10,
      pagesInRange: 4
    },

    // Default values used when sorting and/or filtering.
    initialize: function(){
      //LISTEN FOR ADD & REMOVE EVENTS THEN REMOVE MODELS FROM ORGINAL MODELS
      this.on('add', this.addModel, this);
      this.on('remove', this.removeModel, this);

      // SET DEFAULT VALUES (ALLOWS YOU TO POPULATE PAGINATOR MAUNALLY)
      this.setDefaults();
    },


    setDefaults: function() {
      // SET DEFAULT UI SETTINGS
      var options = _.defaults(this.paginator_ui, this.defaults_ui);

      //UPDATE GLOBAL UI SETTINGS
      _.defaults(this, options);
    },

    addModel: function(model) {
      this.origModels.push(model);
    },

    removeModel: function(model) {
      var index = _.indexOf(this.origModels, model);

      this.origModels.splice(index, 1);
    },

    sync: function ( method, model, options ) {
      var self = this;

      // SET DEFAULT VALUES
      this.setDefaults();

      // Some values could be functions, let's make sure
      // to change their scope too and run them
      var queryAttributes = {};
      _.each(_.result(self, "server_api"), function(value, key){
        if( _.isFunction(value) ) {
          value = _.bind(value, self);
          value = value();
        }
        queryAttributes[key] = value;
      });

      var queryOptions = _.clone(self.paginator_core);
      _.each(queryOptions, function(value, key){
        if( _.isFunction(value) ) {
          value = _.bind(value, self);
          value = value();
        }
        queryOptions[key] = value;
      });

      // Create default values if no others are specified
      queryOptions = _.defaults(queryOptions, {
        timeout: 25000,
        cache: false,
        type: 'GET',
        dataType: 'jsonp'
      });

      queryOptions = _.extend(queryOptions, {
        data: decodeURIComponent($.param(queryAttributes)),
        processData: false,
        url: _.result(queryOptions, 'url')
      }, options);

      var promiseSuccessFormat = !(bbVer[0] === 0 &&
                                   bbVer[1] === 9 &&
                                   bbVer[2] === 10);

      var isBeforeBackbone_1_0 = bbVer[0] === 0;

      var success = queryOptions.success;
      queryOptions.success = function ( resp, status, xhr ) {
        if ( success ) {
          // This is to keep compatibility with Backbone 0.9.10
          if (promiseSuccessFormat) {
            success( resp, status, xhr );
          } else {
            success( model, resp, queryOptions );
          }
        }
        if ( isBeforeBackbone_1_0 && model && model.trigger ) {
          model.trigger( 'sync', model, resp, queryOptions );
        }
      };

      var error = queryOptions.error;
      queryOptions.error = function ( xhr ) {
        if ( error ) {
          error( xhr );
        }
        if ( isBeforeBackbone_1_0 && model && model.trigger ) {
          model.trigger( 'error', model, xhr, queryOptions );
        }
      };

      var xhr = queryOptions.xhr = Backbone.ajax( queryOptions );
      if ( model && model.trigger ) {
        model.trigger('request', model, xhr, queryOptions);
      }
      return xhr;
    },

    nextPage: function (options) {
      if(this.currentPage < this.information.totalPages) {
        this.currentPage = ++this.currentPage;
        this.pager(options);
      }
    },

    previousPage: function (options) {
      if(this.currentPage > 1) {
        this.currentPage = --this.currentPage;
        this.pager(options);
      }
    },

    goTo: function ( page, options ) {
      if(page !== undefined){
        this.currentPage = parseInt(page, 10);
        this.pager(options);
      }
    },

    howManyPer: function ( perPage ) {
      if(perPage !== undefined){
        var lastPerPage = this.perPage;
        this.perPage = parseInt(perPage, 10);
        this.currentPage = Math.ceil( ( lastPerPage * ( this.currentPage - 1 ) + 1 ) / perPage);
        this.pager();
      }
    },


    // setSort is used to sort the current model. After
    // passing 'column', which is the model's field you want
    // to filter and 'direction', which is the direction
    // desired for the ordering ('asc' or 'desc'), pager()
    // and info() will be called automatically.
    setSort: function ( column, direction ) {
      if(column !== undefined && direction !== undefined){
        this.lastSortColumn = this.sortColumn;
        this.sortColumn = column;
        this.sortDirection = direction;
        this.pager();
        this.info();
      }
    },

    // setFieldFilter is used to filter each value of each model
    // according to `rules` that you pass as argument.
    // Example: You have a collection of books with 'release year' and 'author'.
    // You can filter only the books that were released between 1999 and 2003
    // And then you can add another `rule` that will filter those books only to
    // authors who's name start with 'A'.
    setFieldFilter: function ( fieldFilterRules ) {
      if( !_.isEmpty( fieldFilterRules ) ) {
        this.lastFieldFilterRules = this.fieldFilterRules;
        this.fieldFilterRules = fieldFilterRules;
        this.pager();
        this.info();
        // if all the filters are removed, we should save the last filter
        // and then let the list reset to it's original state.
      } else {
        this.lastFieldFilterRules = this.fieldFilterRules;
        this.fieldFilterRules = '';
        this.pager();
        this.info();
      }
    },

    // doFakeFieldFilter can be used to get the number of models that will remain
    // after calling setFieldFilter with a filter rule(s)
    doFakeFieldFilter: function ( rules ) {
      if( !_.isEmpty( rules ) ) {
        var testModels = this.origModels;
        if (testModels === undefined) {
          testModels = this.models;
        }

        testModels = this._fieldFilter(testModels, rules);

        // To comply with current behavior, also filter by any previously defined setFilter rules.
        if ( this.filterExpression !== "" ) {
          testModels = this._filter(testModels, this.filterFields, this.filterExpression);
        }

        // Return size
        return testModels.length;
      }

    },

    // setFilter is used to filter the current model. After
    // passing 'fields', which can be a string referring to
    // the model's field, an array of strings representing
    // each of the model's fields or an object with the name
    // of the model's field(s) and comparing options (see docs)
    // you wish to filter by and
    // 'filter', which is the word or words you wish to
    // filter by, pager() and info() will be called automatically.
    setFilter: function ( fields, filter ) {
      if( fields !== undefined && filter !== undefined ){
        this.filterFields = fields;
        this.lastFilterExpression = this.filterExpression;
        this.filterExpression = filter;
        this.pager();
        this.info();
      }
    },

    // doFakeFilter can be used to get the number of models that will
    // remain after calling setFilter with a `fields` and `filter` args.
    doFakeFilter: function ( fields, filter ) {
      if( fields !== undefined && filter !== undefined ){
        var testModels = this.origModels;
        if (testModels === undefined) {
          testModels = this.models;
        }

        // To comply with current behavior, first filter by any previously defined setFieldFilter rules.
        if ( !_.isEmpty( this.fieldFilterRules ) ) {
          testModels = this._fieldFilter(testModels, this.fieldFilterRules);
        }

        testModels = this._filter(testModels, fields, filter);

        // Return size
        return testModels.length;
      }
    },


    // pager is used to sort, filter and show the data
    // you expect the library to display.
    pager: function (options) {
      var self = this,
      disp = this.perPage,
      start = (self.currentPage - 1) * disp,
      stop = start + disp;
      // Saving the original models collection is important
      // as we could need to sort or filter, and we don't want
      // to loose the data we fetched from the server.
      if (self.origModels === undefined) {
        self.origModels = self.models;
      }

      self.models = self.origModels.slice();

      // Check if sorting was set using setSort.
      if ( this.sortColumn !== "" ) {
        self.models = self._sort(self.models, this.sortColumn, this.sortDirection);
      }

      // Check if field-filtering was set using setFieldFilter
      if ( !_.isEmpty( this.fieldFilterRules ) ) {
        self.models = self._fieldFilter(self.models, this.fieldFilterRules);
      }

      // Check if filtering was set using setFilter.
      if ( this.filterExpression !== "" ) {
        self.models = self._filter(self.models, this.filterFields, this.filterExpression);
      }

      // If the sorting or the filtering was changed go to the first page
      if ( this.lastSortColumn !== this.sortColumn || this.lastFilterExpression !== this.filterExpression || !_.isEqual(this.fieldFilterRules, this.lastFieldFilterRules) ) {
        start = 0;
        stop = start + disp;
        self.currentPage = 1;

        this.lastSortColumn = this.sortColumn;
        this.lastFieldFilterRules = this.fieldFilterRules;
        this.lastFilterExpression = this.filterExpression;
      }

      // We need to save the sorted and filtered models collection
      // because we'll use that sorted and filtered collection in info().
      self.sortedAndFilteredModels = self.models.slice();
      self.info();
      self.reset(self.models.slice(start, stop));

      // This is somewhat of a hack to get all the nextPage, prevPage, and goTo methods
      // to work with a success callback (as in the requestPager). Realistically there is no failure case here,
      // but maybe we could catch exception and trigger a failure callback?
      _.result(options, 'success');
    },

    // The actual place where the collection is sorted.
    // Check setSort for arguments explicacion.
    _sort: function ( models, sort, direction ) {
      models = models.sort(function (a, b) {
        var ac = a.get(sort),
        bc = b.get(sort);

        if ( _.isUndefined(ac) || _.isUndefined(bc) || ac === null || bc === null ) {
          return 0;
        } else {
          /* Make sure that both ac and bc are lowercase strings.
           * .toString() first so we don't have to worry if ac or bc
           * have other String-only methods.
           */
          ac = ac.toString().toLowerCase();
          bc = bc.toString().toLowerCase();
        }

        if (direction === 'desc') {

          // We need to know if there aren't any non-number characters
          // and that there are numbers-only characters and maybe a dot
          // if we have a float.
          // Oh, also a '-' for negative numbers!
          if((!ac.match(/[^\-\d\.]/) && ac.match(/-?[\d\.]+/)) &&
               (!bc.match(/[^\-\d\.]/) && bc.match(/-?[\d\.]+/))){

            if( (ac - 0) < (bc - 0) ) {
              return 1;
            }
            if( (ac - 0) > (bc - 0) ) {
              return -1;
            }
          } else {
            if (ac < bc) {
              return 1;
            }
            if (ac > bc) {
              return -1;
            }
          }

        } else {

          //Same as the regexp check in the 'if' part.
          if((!ac.match(/[^\-\d\.]/) && ac.match(/-?[\d\.]+/)) &&
             (!bc.match(/[^\-\d\.]/) && bc.match(/-?[\d\.]+/))){
            if( (ac - 0) < (bc - 0) ) {
              return -1;
            }
            if( (ac - 0) > (bc - 0) ) {
              return 1;
            }
          } else {
            if (ac < bc) {
              return -1;
            }
            if (ac > bc) {
              return 1;
            }
          }

        }

        if (a.cid && b.cid){
          var aId = a.cid,
          bId = b.cid;

          if (aId < bId) {
            return -1;
          }
          if (aId > bId) {
            return 1;
          }
        }

        return 0;
      });

      return models;
    },

    // The actual place where the collection is field-filtered.
    // Check setFieldFilter for arguments explicacion.
    _fieldFilter: function( models, rules ) {

      // Check if there are any rules
      if ( _.isEmpty(rules) ) {
        return models;
      }

      var filteredModels = [];

      // Iterate over each rule
      _.each(models, function(model){

        var should_push = true;

        // Apply each rule to each model in the collection
        _.each(rules, function(rule){

          // Don't go inside the switch if we're already sure that the model won't be included in the results
          if( !should_push ){
            return false;
          }

          should_push = false;

          // The field's value will be passed to a custom function, which should
          // return true (if model should be included) or false (model should be ignored)
          if(rule.type === "function"){
            var f = _.wrap(rule.value, function(func){
              return func( model.get(rule.field) );
            });
            if( f() ){
              should_push = true;
            }

            // The field's value is required to be non-empty
          }else if(rule.type === "required"){
            if( !_.isEmpty( model.get(rule.field).toString() ) ) {
              should_push = true;
            }

            // The field's value is required to be greater than N (numbers only)
          }else if(rule.type === "min"){
            if( !_.isNaN( Number( model.get(rule.field) ) ) &&
               !_.isNaN( Number( rule.value ) ) &&
                 Number( model.get(rule.field) ) >= Number( rule.value ) ) {
              should_push = true;
            }

            // The field's value is required to be smaller than N (numbers only)
          }else if(rule.type === "max"){
            if( !_.isNaN( Number( model.get(rule.field) ) ) &&
               !_.isNaN( Number( rule.value ) ) &&
                 Number( model.get(rule.field) ) <= Number( rule.value ) ) {
              should_push = true;
            }

            // The field's value is required to be between N and M (numbers only)
          }else if(rule.type === "range"){
            if( !_.isNaN( Number( model.get(rule.field) ) ) &&
               _.isObject( rule.value ) &&
                 !_.isNaN( Number( rule.value.min ) ) &&
                   !_.isNaN( Number( rule.value.max ) ) &&
                     Number( model.get(rule.field) ) >= Number( rule.value.min ) &&
                       Number( model.get(rule.field) ) <= Number( rule.value.max ) ) {
              should_push = true;
            }

            // The field's value is required to be more than N chars long
          }else if(rule.type === "minLength"){
            if( model.get(rule.field).toString().length >= rule.value ) {
              should_push = true;
            }

            // The field's value is required to be no more than N chars long
          }else if(rule.type === "maxLength"){
            if( model.get(rule.field).toString().length <= rule.value ) {
              should_push = true;
            }

            // The field's value is required to be more than N chars long and no more than M chars long
          }else if(rule.type === "rangeLength"){
            if( _.isObject( rule.value ) &&
               !_.isNaN( Number( rule.value.min ) ) &&
                 !_.isNaN( Number( rule.value.max ) ) &&
                   model.get(rule.field).toString().length >= rule.value.min &&
                     model.get(rule.field).toString().length <= rule.value.max ) {
              should_push = true;
            }

            // The field's value is required to be equal to one of the values in rules.value
          }else if(rule.type === "oneOf"){
            if( _.isArray( rule.value ) &&
               _.include( rule.value, model.get(rule.field) ) ) {
              should_push = true;
            }

            // The field's value is required to be equal to the value in rules.value
          }else if(rule.type === "equalTo"){
            if( rule.value === model.get(rule.field) ) {
              should_push = true;
            }

          }else if(rule.type === "containsAllOf"){
            if( _.isArray( rule.value ) &&
                _.isArray(model.get(rule.field)) &&
                _.intersection( rule.value, model.get(rule.field)).length === rule.value.length) {
              should_push = true;
            }

              // The field's value is required to match the regular expression
          }else if(rule.type === "pattern"){
            if( model.get(rule.field).toString().match(rule.value) ) {
              should_push = true;
            }

            // The field's value will be applied to the model, which should
            // return true (if model should be included) or false (model should be ignored)
          }else if(rule.type === "custom"){
            var attr = model.toJSON();
            var cf = _.wrap(rule.value, function(func){
              return func( attr );
            });
            if( cf() ){
              should_push = true;
            }

            //Unknown type
          }else{
            should_push = false;
          }

        });

        if( should_push ){
          filteredModels.push(model);
        }

      });

      return filteredModels;
    },

    // The actual place where the collection is filtered.
    // Check setFilter for arguments explicacion.
    _filter: function ( models, fields, filter ) {

      //  For example, if you had a data model containing cars like { color: '', description: '', hp: '' },
      //  your fields was set to ['color', 'description', 'hp'] and your filter was set
      //  to "Black Mustang 300", the word "Black" will match all the cars that have black color, then
      //  "Mustang" in the description and then the HP in the 'hp' field.
      //  NOTE: "Black Musta 300" will return the same as "Black Mustang 300"

      // We accept fields to be a string, an array or an object
      // but if string or array is passed we need to convert it
      // to an object.

      var self = this;

      var obj_fields = {};

      if( _.isString( fields ) ) {
        obj_fields[fields] = {cmp_method: 'regexp'};
      }else if( _.isArray( fields ) ) {
        _.each(fields, function(field){
          obj_fields[field] = {cmp_method: 'regexp'};
        });
      }else{
        _.each(fields, function( cmp_opts, field ) {
          obj_fields[field] = _.defaults(cmp_opts, { cmp_method: 'regexp' });
        });
      }

      fields = obj_fields;

      //Remove diacritic characters if diacritic plugin is loaded
      if( _.has(Backbone.Paginator, 'removeDiacritics') && self.useDiacriticsPlugin ){
        filter = Backbone.Paginator.removeDiacritics(filter);
      }

      // 'filter' can be only a string.
      // If 'filter' is string we need to convert it to
      // a regular expression.
      // For example, if 'filter' is 'black dog' we need
      // to find every single word, remove duplicated ones (if any)
      // and transform the result to '(black|dog)'
      if( filter === '' || !_.isString(filter) ) {
        return models;
      } else {
        var words = _.map(filter.match(/\w+/ig), function(element) { return element.toLowerCase(); });
        var pattern = "(" + _.uniq(words).join("|") + ")";
        var regexp = new RegExp(pattern, "igm");
      }

      var filteredModels = [];

      // We need to iterate over each model
      _.each( models, function( model ) {

        var matchesPerModel = [];

        // and over each field of each model
        _.each( fields, function( cmp_opts, field ) {

          var value = model.get( field );

          if( value ) {

            // The regular expression we created earlier let's us detect if a
            // given string contains each and all of the words in the regular expression
            // or not, but in both cases match() will return an array containing all
            // the words it matched.
            var matchesPerField = [];

            if( _.has(Backbone.Paginator, 'removeDiacritics') && self.useDiacriticsPlugin ){
              value = Backbone.Paginator.removeDiacritics(value.toString());
            }else{
              value = value.toString();
            }

            // Levenshtein cmp
            if( cmp_opts.cmp_method === 'levenshtein' && _.has(Backbone.Paginator, 'levenshtein') && self.useLevenshteinPlugin ) {
              var distance = Backbone.Paginator.levenshtein(value, filter);

              _.defaults(cmp_opts, { max_distance: 0 });

              if( distance <= cmp_opts.max_distance ) {
                matchesPerField = _.uniq(words);
              }

              // Default (RegExp) cmp
            }else{
              matchesPerField = value.match( regexp );
            }

            matchesPerField = _.map(matchesPerField, function(match) {
              return match.toString().toLowerCase();
            });

            _.each(matchesPerField, function(match){
              matchesPerModel.push(match);
            });

          }

        });

        // We just need to check if the returned array contains all the words in our
        // regex, and if it does, it means that we have a match, so we should save it.
        matchesPerModel = _.uniq( _.without(matchesPerModel, "") );

        if(  _.isEmpty( _.difference(words, matchesPerModel) ) ) {
          filteredModels.push(model);
        }

      });

      return filteredModels;
    },

    // You shouldn't need to call info() as this method is used to
    // calculate internal data as first/prev/next/last page...
    info: function () {
      var self = this,
      info = {},
      totalRecords = (self.sortedAndFilteredModels) ? self.sortedAndFilteredModels.length : self.length,
      totalPages = Math.ceil(totalRecords / self.perPage);

      info = {
        totalUnfilteredRecords: self.origModels.length,
        totalRecords: totalRecords,
        currentPage: self.currentPage,
        perPage: this.perPage,
        totalPages: totalPages,
        lastPage: totalPages,
        previous: false,
        next: false,
        startRecord: totalRecords === 0 ? 0 : (self.currentPage - 1) * this.perPage + 1,
        endRecord: Math.min(totalRecords, self.currentPage * this.perPage)
      };

      if (self.currentPage > 1) {
        info.previous = self.currentPage - 1;
      }

      if (self.currentPage < info.totalPages) {
        info.next = self.currentPage + 1;
      }

      info.pageSet = self.setPagination(info);

      self.information = info;
      return info;
    },


    // setPagination also is an internal function that shouldn't be called directly.
    // It will create an array containing the pages right before and right after the
    // actual page.
    setPagination: function ( info ) {

      var pages = [], i = 0, l = 0;

      // How many adjacent pages should be shown on each side?
      var ADJACENTx2 = this.pagesInRange * 2,
      LASTPAGE = Math.ceil(info.totalRecords / info.perPage);

      if (LASTPAGE > 1) {

        // not enough pages to bother breaking it up
        if (LASTPAGE <= (1 + ADJACENTx2)) {
          for (i = 1, l = LASTPAGE; i <= l; i++) {
            pages.push(i);
          }
        }

        // enough pages to hide some
        else {

          //close to beginning; only hide later pages
          if (info.currentPage <=  (this.pagesInRange + 1)) {
            for (i = 1, l = 2 + ADJACENTx2; i < l; i++) {
              pages.push(i);
            }
          }

          // in middle; hide some front and some back
          else if (LASTPAGE - this.pagesInRange > info.currentPage && info.currentPage > this.pagesInRange) {
            for (i = info.currentPage - this.pagesInRange; i <= info.currentPage + this.pagesInRange; i++) {
              pages.push(i);
            }
          }

          // close to end; only hide early pages
          else {
            for (i = LASTPAGE - ADJACENTx2; i <= LASTPAGE; i++) {
              pages.push(i);
            }
          }
        }

      }

      return pages;

    },

    bootstrap: function(options) {
      _.extend(this, options);
      this.goTo(1);
      this.info();
      return this;
    }

  });

  // function aliasing
  Paginator.clientPager.prototype.prevPage = Paginator.clientPager.prototype.previousPage;

  // Helper function to generate rejected Deferred
  var reject = function () {
    var response = new $.Deferred();
    response.reject();
    return response.promise();
  };

  // @name: requestPager
  //
  // Paginator for server-side data being requested from a backend/API
  //
  // @description:
  // This paginator is responsible for providing pagination
  // and sort capabilities for requests to a server-side
  // data service (e.g an API)
  //
  Paginator.requestPager = Backbone.Collection.extend({

    sync: function ( method, model, options ) {

      var self = this;

      self.setDefaults();

      // Some values could be functions, let's make sure
      // to change their scope too and run them
      var queryAttributes = {};
      _.each(_.result(self, "server_api"), function(value, key){
        if( _.isFunction(value) ) {
          value = _.bind(value, self);
          value = value();
        }
        queryAttributes[key] = value;
      });

      var queryOptions = _.clone(self.paginator_core);
      _.each(queryOptions, function(value, key){
        if( _.isFunction(value) ) {
          value = _.bind(value, self);
          value = value();
        }
        queryOptions[key] = value;
      });

      // Create default values if no others are specified
      queryOptions = _.defaults(queryOptions, {
        timeout: 25000,
        cache: false,
        type: 'GET',
        dataType: 'jsonp',
        url: self.url
      });

      // Allows the passing in of {data: {foo: 'bar'}} at request time to overwrite server_api defaults
      if( options.data ){
        options.data = decodeURIComponent($.param(_.extend(queryAttributes,options.data)));
      }else{
        options.data = decodeURIComponent($.param(queryAttributes));
      }

      queryOptions = _.extend(queryOptions, {
        data: decodeURIComponent($.param(queryAttributes)),
        processData: false,
        url: _.result(queryOptions, 'url')
      }, options);

      var promiseSuccessFormat = !(bbVer[0] === 0 &&
                                   bbVer[1] === 9 &&
                                   bbVer[2] === 10);

      var isBeforeBackbone_1_0 = bbVer[0] === 0;

      var success = queryOptions.success;
      queryOptions.success = function ( resp, status, xhr ) {

        if ( success ) {
          // This is to keep compatibility with Backbone 0.9.10
          if (promiseSuccessFormat) {
            success( resp, status, xhr );
          } else {
            success( model, resp, queryOptions );
          }
        }
        if (isBeforeBackbone_1_0 && model && model.trigger ) {
          model.trigger( 'sync', model, resp, queryOptions );
        }
      };

      var error = queryOptions.error;
      queryOptions.error = function ( xhr ) {
        if ( error ) {
          error( xhr );
        }
        if ( isBeforeBackbone_1_0 && model && model.trigger ) {
          model.trigger( 'error', model, xhr, queryOptions );
        }
      };

      var xhr = queryOptions.xhr = Backbone.ajax( queryOptions );
      if ( model && model.trigger ) {
        model.trigger('request', model, xhr, queryOptions);
      }
      return xhr;
    },

    setDefaults: function() {
      var self = this;

      // Create default values if no others are specified
      _.defaults(self.paginator_ui, {
        firstPage: 0,
        currentPage: 1,
        perPage: 5,
        totalPages: 10,
        pagesInRange: 4
      });

      // Change scope of 'paginator_ui' object values
      _.each(self.paginator_ui, function(value, key) {
        if (_.isUndefined(self[key])) {
          self[key] = self.paginator_ui[key];
        }
      });
    },

    requestNextPage: function ( options ) {
      if ( this.currentPage !== undefined ) {
        this.currentPage += 1;
        return this.pager( options );
      } else {
        return reject();
      }
    },

    requestPreviousPage: function ( options ) {
      if ( this.currentPage !== undefined ) {
        this.currentPage -= 1;
        return this.pager( options );
      } else {
        return reject();
      }
    },

    updateOrder: function ( column, options ) {
      if (column !== undefined) {
        this.sortField = column;
        return this.pager( options );
      } else {
        return reject();
      }
    },

    goTo: function ( page, options ) {
      if ( page !== undefined ) {
        this.currentPage = parseInt(page, 10);
        return this.pager( options );
      } else {
        return reject();
      }
    },

    howManyPer: function ( count, options ) {
      if ( count !== undefined ) {
        this.currentPage = this.firstPage;
        this.perPage = count;
        return this.pager( options );
      } else {
        return reject();
      }
    },

    info: function () {

      var info = {
        // If parse() method is implemented and totalRecords is set to the length
        // of the records returned, make it available. Else, default it to 0
        totalRecords: this.totalRecords || 0,

        currentPage: this.currentPage,
        firstPage: this.firstPage,
        totalPages: Math.ceil(this.totalRecords / this.perPage),
        lastPage: this.totalPages, // should use totalPages in template
        perPage: this.perPage,
        previous:false,
        next:false
      };

      if (this.currentPage > 1) {
        info.previous = this.currentPage - 1;
      }

      if (this.currentPage < info.totalPages) {
        info.next = this.currentPage + 1;
      }

      // left around for backwards compatibility
      info.hasNext = info.next;
      info.hasPrevious = info.next;

      info.pageSet = this.setPagination(info);

      this.information = info;
      return info;
    },

    setPagination: function ( info ) {

      var pages = [], i = 0, l = 0;

      // How many adjacent pages should be shown on each side?
      var ADJACENTx2 = this.pagesInRange * 2,
      LASTPAGE = Math.ceil(info.totalRecords / info.perPage);

      if (LASTPAGE > 1) {

        // not enough pages to bother breaking it up
        if (LASTPAGE <= (1 + ADJACENTx2)) {
          for (i = 1, l = LASTPAGE; i <= l; i++) {
            pages.push(i);
          }
        }

        // enough pages to hide some
        else {

          //close to beginning; only hide later pages
          if (info.currentPage <=  (this.pagesInRange + 1)) {
            for (i = 1, l = 2 + ADJACENTx2; i < l; i++) {
              pages.push(i);
            }
          }

          // in middle; hide some front and some back
          else if (LASTPAGE - this.pagesInRange > info.currentPage && info.currentPage > this.pagesInRange) {
            for (i = info.currentPage - this.pagesInRange; i <= info.currentPage + this.pagesInRange; i++) {
              pages.push(i);
            }
          }

          // close to end; only hide early pages
          else {
            for (i = LASTPAGE - ADJACENTx2; i <= LASTPAGE; i++) {
              pages.push(i);
            }
          }
        }

      }

      return pages;

    },

    // fetches the latest results from the server
    pager: function ( options ) {
      if ( !_.isObject(options) ) {
        options = {};
      }
      return this.fetch( options );
    },

    url: function(){
      // Expose url parameter enclosed in this.paginator_core.url to properly
      // extend Collection and allow Collection CRUD
      if(this.paginator_core !== undefined && this.paginator_core.url !== undefined){
        return this.paginator_core.url;
      } else {
        return null;
      }
    },

    bootstrap: function(options) {
      _.extend(this, options);
      this.setDefaults();
      this.info();
      return this;
    }
  });

  // function aliasing
  Paginator.requestPager.prototype.nextPage = Paginator.requestPager.prototype.requestNextPage;
  Paginator.requestPager.prototype.prevPage = Paginator.requestPager.prototype.requestPreviousPage;

  return Paginator;

}( Backbone, _, jQuery ));

define("views/../../bower_components/backbone.paginator/dist/backbone.paginator.js", function(){});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/paginator',['templates/paginator', '../../bower_components/backbone.paginator/dist/backbone.paginator.js'], function(template) {
  var Paginator;
  return Paginator = (function(_super) {
    __extends(Paginator, _super);

    function Paginator() {
      return Paginator.__super__.constructor.apply(this, arguments);
    }

    Paginator.ALL_MAGIC = '99999999';

    Paginator.prototype.template = template;

    Paginator.prototype.attributes = {
      "class": 'paginator'
    };

    Paginator.prototype.ui = {
      next: '.page_navigation a.next',
      previous: '.page_navigation a.previous',
      last: '.page_navigation a.last',
      first: '.page_navigation a.first',
      pageInput: '.page_navigation input',
      perPage: '.row_select select'
    };

    Paginator.prototype.triggers = {
      'click @ui.first': 'table:first',
      'click @ui.last': 'table:last',
      'click @ui.next': 'table:next',
      'click @ui.previous': 'table:previous',
      'change @ui.perPage': 'table:setPerPage',
      'change @ui.pageInput': 'table:pageInputChanged',
      'keyup @ui.pageInput': 'table:pageInputChanged'
    };

    Paginator.prototype.events = {
      'click @ui.pageInput': 'pageInputClicked'
    };

    Paginator.prototype.perPage = 20;

    Paginator.prototype.perPageOptions = [20, 50, 100, 'All'];

    Paginator.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      this.collection = opts.collection;
      this.perPageOptions = opts.perPageOptions || this.perPageOptions;
      this.perPage = opts.perPage || this.perPage;
      this["static"] = !!opts["static"];
      if (!_.contains(this.perPageOptions, this.perPage)) {
        this.perPageOptions.unshift(this.perPage);
      }
      if (this["static"]) {
        this.collection.howManyPer(this.perPage);
      } else {
        this.collection.perPage = this.perPage;
      }
      this.listenTo(this.collection, 'sync', this.render);
      return this.listenTo(this.collection, 'reset', this.render);
    };

    Paginator.prototype.pageInputClicked = function(e) {
      return $(e.currentTarget).select();
    };

    Paginator.prototype.serializeData = function() {
      var lastRow, totalRecords, _ref, _ref1;
      totalRecords = this.collection.totalRecords || ((_ref = this.collection) != null ? (_ref1 = _ref.origModels) != null ? _ref1.length : void 0 : void 0) || 0;
      lastRow = Math.min(this.collection.currentPage * this.collection.perPage, totalRecords);
      return _.extend({}, this, this.collection, {
        totalRecords: totalRecords,
        lastRow: lastRow,
        isLastPage: lastRow === totalRecords,
        isFirstPage: this.collection.currentPage === 1,
        ALL_MAGIC: Paginator.ALL_MAGIC
      });
    };

    return Paginator;

  })(Marionette.ItemView);
});

define('templates/row',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var column, idx, _i, _len, _ref;
    
      if (this.selectable) {
        _print(_safe('\n  <td class="checkbox">\n    <input type="checkbox" data-id="'));
        _print(this.model.id);
        _print(_safe('" '));
        if (this.model.get('selected')) {
          _print(_safe('checked'));
        }
        _print(_safe('>\n  </td>\n'));
      }
    
      _print(_safe('\n\n'));
    
      idx = 0;
    
      _print(_safe('\n'));
    
      _ref = this.columns;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        column = _ref[_i];
        _print(_safe('\n  <td class=\''));
        _print(column["class"]);
        _print(_safe(' '));
        _print(this.StringUtils.underscored(column.attribute).replace(/[^\w]/g, ''));
        _print(_safe(' cell'));
        _print(idx);
        _print(_safe('\'>\n    '));
        if (column.view != null) {
          _print(_safe('\n\n    '));
        } else if (column.render != null) {
          _print(_safe('\n      '));
          _print(column.render.call(this));
          _print(_safe('\n    '));
        } else {
          _print(_safe('\n        '));
          if (column.escape) {
            _print(_safe('\n          <span>'));
            _print(this.model.get(column.attribute));
            _print(_safe('</span>\n        '));
          } else {
            _print(_safe('\n          <span>'));
            _print(_safe(this.model.get(column.attribute)));
            _print(_safe('</span>\n        '));
          }
          _print(_safe('\n    '));
        }
        _print(_safe('\n  </td>\n\n  '));
        idx++;
        _print(_safe('\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

define('utilities/string_utils',[], function() {
  var StringUtils;
  return StringUtils = {
    underscored: function(str) {
      str = str === null ? '' : String(str);
      return str.trim().replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
    },
    capitalize: function(str) {
      str = str === null ? '' : String(str);
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
    humanize: function(str) {
      return StringUtils.capitalize(StringUtils.underscored(str).replace(/_id$/, '').replace(/_/g, ' '));
    }
  };
});

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/row',['templates/row', 'utilities/string_utils'], function(template, StringUtils) {
  var Row;
  return Row = (function(_super) {
    __extends(Row, _super);

    function Row() {
      this.onShow = __bind(this.onShow, this);
      this.selectionStateChanged = __bind(this.selectionStateChanged, this);
      return Row.__super__.constructor.apply(this, arguments);
    }

    Row.prototype.template = template;

    Row.prototype.tagName = 'tr';

    Row.prototype.ui = {
      checkbox: 'td.checkbox input'
    };

    Row.prototype.events = {
      'change @ui.checkbox': 'triggerSelectionEvents'
    };

    Row.prototype.modelEvents = {
      'change:selected': 'selectionStateChanged'
    };

    Row.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      this.columns = opts.columns;
      this.selectable = !!opts.selectable;
      this.tableSelections = opts.tableSelections;
      this.serverAPI = opts.serverAPI;
      this.controller = opts.controller;
      this.setInitialSelectionState();
      return _.each(this.columns, (function(_this) {
        return function(column, idx) {
          if (column.view != null) {
            return _this.addRegion(_this.regionName(idx), "td." + (_this.regionName(idx)));
          }
        };
      })(this));
    };

    Row.prototype.selectionStateChanged = function() {
      if (!!this.ui.checkbox.prop('checked') === this.model.get('selected')) {
        return;
      }
      this.ui.checkbox.prop('checked', this.model.get('selected'));
      return this.recordSelectionState();
    };

    Row.prototype.setInitialSelectionState = function() {
      if (!this.selectable) {
        return false;
      }
      if (this.tableSelections.selectAllState) {
        return this.model.set('selected', !(this.model.id in this.tableSelections.deselectedIDs), {
          silent: true
        });
      } else {
        return this.model.set('selected', this.model.id in this.tableSelections.selectedIDs, {
          silent: true
        });
      }
    };

    Row.prototype.setSelectionState = function() {
      if (this.ui.checkbox.prop('checked')) {
        return this.model.set('selected', true);
      } else {
        return this.model.set('selected', false);
      }
    };

    Row.prototype.recordSelectionState = function() {
      if (!this.selectable) {
        return;
      }
      if (this.tableSelections.selectAllState) {
        if (this.ui.checkbox.prop('checked')) {
          return delete this.tableSelections.deselectedIDs[this.model.id];
        } else {
          return this.tableSelections.deselectedIDs[this.model.id] = true;
        }
      } else {
        if (this.ui.checkbox.prop('checked')) {
          return this.tableSelections.selectedIDs[this.model.id] = true;
        } else {
          return delete this.tableSelections.selectedIDs[this.model.id];
        }
      }
    };

    Row.prototype.triggerSelectionEvents = function() {
      this.setSelectionState();
      this.recordSelectionState();
      this.controller.carpenterRadio.trigger('table:row:selection_toggled', this.model);
      this.model.trigger('selection_toggled');
      if (!this.ui.checkbox.prop('checked')) {
        this.controller.carpenterRadio.trigger('table:row:deselected', this.model);
        return this.model.trigger('deselected');
      } else {
        this.controller.carpenterRadio.trigger('table:row:selected', this.model);
        return this.model.trigger('selected');
      }
    };

    Row.prototype.onShow = function() {
      return _.each(this.columns, (function(_this) {
        return function(column, idx) {
          var controller, view, viewOpts, _ref;
          if (column.view != null) {
            viewOpts = _.extend({}, column.viewOpts);
            _.extend(viewOpts, {
              model: _this.model,
              column: column,
              collection: _this.model.collection,
              serverAPI: _this.serverAPI
            });
            view = new column.view(viewOpts);
            controller = view.getMainView ? view : null;
            view = view.getMainView ? view.getMainView() : view;
            if (!view) {
              throw new Error("getMainView() did not return a view instance or " + (view != null ? (_ref = view.constructor) != null ? _ref.name : void 0 : void 0) + " is not a view instance");
            }
            if (controller != null) {
              _this.listenTo(view, "destroy", controller.destroy);
            }
            return _this[_this.regionName(idx)].show(view);
          }
        };
      })(this));
    };

    Row.prototype.regionName = function(idx) {
      return "cell" + idx;
    };

    Row.prototype.serializeData = function() {
      return _.extend({
        StringUtils: StringUtils
      }, this);
    };

    return Row;

  })(Marionette.LayoutView);
});

define('templates/table',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var column, sorted, _i, _len, _ref;
    
      _print(_safe('<table '));
    
      if (this.htmlID) {
        _print(_safe('id="'));
        _print(this.htmlID);
        _print(_safe('"'));
      }
    
      _print(_safe('>\n  <thead>\n    <tr>\n      '));
    
      if (this.selectable) {
        _print(_safe('\n        <th class="select-all unselectable" unselectable="on">\n          <input type="checkbox" title="Selects all available records on every page">\n        </th>\n      '));
      }
    
      _print(_safe('\n\n      '));
    
      _ref = this.columns;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        column = _ref[_i];
        _print(_safe('\n        '));
        sorted = column.attribute === this.sortColumn;
        _print(_safe('\n        <th unselectable="on" class="unselectable '));
        _print(column["class"]);
        _print(_safe(' '));
        if (column.sortable) {
          _print('sortable');
        }
        _print(_safe(' '));
        _print(sorted ? "sort " + this.sortDirection : "not-sort");
        _print(_safe('">\n          <span>'));
        _print(column.label);
        _print(_safe('</span>\n        </th>\n      '));
      }
    
      _print(_safe('\n    </tr>\n  </thead>\n\n  <tbody>\n\n  </tbody>\n</table>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

/* jQuery Resizable Columns v0.1.0 | http://dobtco.github.io/jquery-resizable-columns/ | Licensed MIT | Built Wed Apr 30 2014 14:24:25 */
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __slice = [].slice;

(function($, window) {
  var ResizableColumns, parseWidth, pointerX, setWidth;
  parseWidth = function(node) {
    return parseFloat(node.style.width.replace('%', ''));
  };
  setWidth = function(node, width) {
    width = width.toFixed(2);
    return node.style.width = "" + width + "%";
  };
  pointerX = function(e) {
    if (e.type.indexOf('touch') === 0) {
      return (e.originalEvent.touches[0] || e.originalEvent.changedTouches[0]).pageX;
    }
    return e.pageX;
  };
  ResizableColumns = (function() {
    ResizableColumns.prototype.defaults = {
      selector: 'tr th:visible',
      store: window.store,
      syncHandlers: true,
      resizeFromBody: true,
      maxWidth: null,
      minWidth: null
    };

    function ResizableColumns($table, options) {
      this.pointerdown = __bind(this.pointerdown, this);
      this.constrainWidth = __bind(this.constrainWidth, this);
      this.options = $.extend({}, this.defaults, options);
      this.$table = $table;
      this.setHeaders();
      this.restoreColumnWidths();
      this.syncHandleWidths();
      $(window).on('resize.rc', ((function(_this) {
        return function() {
          return _this.syncHandleWidths();
        };
      })(this)));
      if (this.options.start) {
        this.$table.bind('column:resize:start.rc', this.options.start);
      }
      if (this.options.resize) {
        this.$table.bind('column:resize.rc', this.options.resize);
      }
      if (this.options.stop) {
        this.$table.bind('column:resize:stop.rc', this.options.stop);
      }
    }

    ResizableColumns.prototype.triggerEvent = function(type, args, original) {
      var event;
      event = $.Event(type);
      event.originalEvent = $.extend({}, original);
      return this.$table.trigger(event, [this].concat(args || []));
    };

    ResizableColumns.prototype.getColumnId = function($el) {
      return this.$table.data('resizable-columns-id') + '-' + $el.data('resizable-column-id');
    };

    ResizableColumns.prototype.setHeaders = function() {
      this.$tableHeaders = this.$table.find(this.options.selector);
      this.assignPercentageWidths();
      return this.createHandles();
    };

    ResizableColumns.prototype.destroy = function() {
      this.$handleContainer.remove();
      this.$table.removeData('resizableColumns');
      return this.$table.add(window).off('.rc');
    };

    ResizableColumns.prototype.assignPercentageWidths = function() {
      return this.$tableHeaders.each((function(_this) {
        return function(_, el) {
          var $el;
          $el = $(el);
          return setWidth($el[0], $el.outerWidth() / _this.$table.width() * 100);
        };
      })(this));
    };

    ResizableColumns.prototype.createHandles = function() {
      var _ref;
      if ((_ref = this.$handleContainer) != null) {
        _ref.remove();
      }
      this.$table.before((this.$handleContainer = $("<div class='rc-handle-container' />")));
      this.$tableHeaders.each((function(_this) {
        return function(i, el) {
          var $handle;
          if (_this.$tableHeaders.eq(i + 1).length === 0 || (_this.$tableHeaders.eq(i).attr('data-noresize') != null) || (_this.$tableHeaders.eq(i + 1).attr('data-noresize') != null)) {
            return;
          }
          $handle = $("<div class='rc-handle' />");
          $handle.data('th', $(el));
          return $handle.appendTo(_this.$handleContainer);
        };
      })(this));
      return this.$handleContainer.on('mousedown touchstart', '.rc-handle', this.pointerdown);
    };

    ResizableColumns.prototype.syncHandleWidths = function() {
      return this.$handleContainer.width(this.$table.width()).find('.rc-handle').each((function(_this) {
        return function(_, el) {
          var $el;
          $el = $(el);
          return $el.css({
            left: $el.data('th').outerWidth() + ($el.data('th').offset().left - _this.$handleContainer.offset().left),
            height: _this.options.resizeFromBody ? _this.$table.height() : _this.$table.find('thead').height()
          });
        };
      })(this));
    };

    ResizableColumns.prototype.saveColumnWidths = function() {
      return this.$tableHeaders.each((function(_this) {
        return function(_, el) {
          var $el;
          $el = $(el);
          if ($el.attr('data-noresize') == null) {
            if (_this.options.store != null) {
              return _this.options.store.set(_this.getColumnId($el), parseWidth($el[0]));
            }
          }
        };
      })(this));
    };

    ResizableColumns.prototype.restoreColumnWidths = function() {
      return this.$tableHeaders.each((function(_this) {
        return function(_, el) {
          var $el, width;
          $el = $(el);
          if ((_this.options.store != null) && (width = _this.options.store.get(_this.getColumnId($el)))) {
            return setWidth($el[0], width);
          }
        };
      })(this));
    };

    ResizableColumns.prototype.totalColumnWidths = function() {
      var total;
      total = 0;
      this.$tableHeaders.each((function(_this) {
        return function(_, el) {
          return total += parseFloat($(el)[0].style.width.replace('%', ''));
        };
      })(this));
      return total;
    };

    ResizableColumns.prototype.constrainWidth = function(width) {
      if (this.options.minWidth != null) {
        width = Math.max(this.options.minWidth, width);
      }
      if (this.options.maxWidth != null) {
        width = Math.min(this.options.maxWidth, width);
      }
      return width;
    };

    ResizableColumns.prototype.pointerdown = function(e) {
      var $currentGrip, $leftColumn, $ownerDocument, $rightColumn, newWidths, startPosition, widths;
      e.preventDefault();
      $ownerDocument = $(e.currentTarget.ownerDocument);
      startPosition = pointerX(e);
      $currentGrip = $(e.currentTarget);
      $leftColumn = $currentGrip.data('th');
      $rightColumn = this.$tableHeaders.eq(this.$tableHeaders.index($leftColumn) + 1);
      widths = {
        left: parseWidth($leftColumn[0]),
        right: parseWidth($rightColumn[0])
      };
      newWidths = {
        left: widths.left,
        right: widths.right
      };
      this.$handleContainer.add(this.$table).addClass('rc-table-resizing');
      $leftColumn.add($rightColumn).add($currentGrip).addClass('rc-column-resizing');
      this.triggerEvent('column:resize:start', [$leftColumn, $rightColumn, newWidths.left, newWidths.right], e);
      $ownerDocument.on('mousemove.rc touchmove.rc', (function(_this) {
        return function(e) {
          var difference;
          difference = (pointerX(e) - startPosition) / _this.$table.width() * 100;
          setWidth($leftColumn[0], newWidths.left = _this.constrainWidth(widths.left + difference));
          setWidth($rightColumn[0], newWidths.right = _this.constrainWidth(widths.right - difference));
          if (_this.options.syncHandlers != null) {
            _this.syncHandleWidths();
          }
          return _this.triggerEvent('column:resize', [$leftColumn, $rightColumn, newWidths.left, newWidths.right], e);
        };
      })(this));
      return $ownerDocument.one('mouseup touchend', (function(_this) {
        return function() {
          $ownerDocument.off('mousemove.rc touchmove.rc');
          _this.$handleContainer.add(_this.$table).removeClass('rc-table-resizing');
          $leftColumn.add($rightColumn).add($currentGrip).removeClass('rc-column-resizing');
          _this.syncHandleWidths();
          _this.saveColumnWidths();
          return _this.triggerEvent('column:resize:stop', [$leftColumn, $rightColumn, newWidths.left, newWidths.right], e);
        };
      })(this));
    };

    return ResizableColumns;

  })();
  return $.fn.extend({
    resizableColumns: function() {
      var args, option;
      option = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return this.each(function() {
        var $table, data;
        $table = $(this);
        data = $table.data('resizableColumns');
        if (!data) {
          $table.data('resizableColumns', (data = new ResizableColumns($table, option)));
        }
        if (typeof option === 'string') {
          return data[option].apply(data, args);
        }
      });
    }
  });
})(window.jQuery, window);

define("views/../../bower_components/jquery-resizable-columns/dist/jquery.resizableColumns.js", function(){});

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/row_list',['views/row', 'views/empty', 'views/loading', 'templates/table', '../../bower_components/jquery-resizable-columns/dist/jquery.resizableColumns.js'], function(Row, Empty, Loading, template) {
  var RowList;
  return RowList = (function(_super) {
    __extends(RowList, _super);

    function RowList() {
      this.updateClasses = __bind(this.updateClasses, this);
      this.fetched = __bind(this.fetched, this);
      this.setSort = __bind(this.setSort, this);
      this.sortChanged = __bind(this.sortChanged, this);
      return RowList.__super__.constructor.apply(this, arguments);
    }

    RowList.prototype.template = template;

    RowList.prototype.childView = Row;

    RowList.prototype.collectionEvents = {
      sync: 'fetched',
      reset: 'fetched'
    };

    RowList.prototype.ui = {
      selectAllCheckbox: 'thead th.select-all input',
      rowCheckboxes: 'td.checkbox input',
      sortableColHeader: 'thead th.sortable',
      thead: 'thead',
      table: 'table'
    };

    RowList.prototype.events = {
      'click  @ui.selectAllCheckbox': 'toggleSelectAll',
      'click  @ui.rowCheckboxes': 'selectIntermediateCheckboxes',
      'click  th.sortable': 'sortChanged'
    };

    RowList.prototype.childViewContainer = 'tbody';

    RowList.prototype.sortColumn = null;

    RowList.prototype.sortDirection = null;

    RowList.prototype.attributes = {
      "class": 'wrap'
    };

    RowList.prototype.initialize = function(opts) {
      if (opts == null) {
        opts = {};
      }
      this.htmlID = opts.htmlID;
      this.columns = opts.columns;
      this["static"] = !!opts["static"];
      this.selectable = !!opts.selectable;
      this.tableSelections = opts.tableSelections;
      this.emptyView = opts.emptyView || opts.tableEmptyView || Empty;
      this.loadingView = opts.loadingView || Loading;
      this.controller = opts;
      this.setSort(this.collection.sortColumn, this.collection.sortDirection, {
        noReload: true
      });
      if (this.selectable) {
        this.selectedIDs = {};
        this.deselectedIDs = {};
      }
      if (!this["static"]) {
        this.originalEmptyView = this.emptyView;
        this.emptyView = this.loadingView;
      }
      return this.listenTo(this.collection, 'remove:multiple:after', (function(_this) {
        return function() {
          return _this.handleRemoveMultiple();
        };
      })(this));
    };

    RowList.prototype.sortChanged = function(e) {
      var sortIdx, _ref;
      sortIdx = $(e.currentTarget).index();
      if (this.selectable) {
        sortIdx--;
      }
      return this.trigger('table:sort', {
        attribute: (_ref = this.columns[sortIdx]) != null ? _ref.attribute : void 0
      });
    };

    RowList.prototype.setSort = function(sortColumn, sortDirection, opts) {
      var sortIdx, _ref;
      this.sortColumn = sortColumn;
      this.sortDirection = sortDirection;
      if (opts == null) {
        opts = {};
      }
      sortIdx = _.indexOf(this.columns, _.findWhere(this.columns, {
        attribute: this.sortColumn
      }));
      if (this.selectable) {
        sortIdx++;
      }
      this.$el.find('thead th').removeClass('sort asc desc').eq(sortIdx).addClass("sort " + this.sortDirection);
      if (this.selectable) {
        sortIdx--;
      }
      if (!opts.noReload) {
        return this.collection.setSort(this.sortColumn, this.sortDirection, (_ref = this.columns[sortIdx]) != null ? _ref.sortAttribute : void 0);
      }
    };

    RowList.prototype.setSearch = function(filter) {
      return this.collection.setSearch(filter);
    };

    RowList.prototype.getRowCheckboxes = function() {
      return this.$el.find('td.checkbox input');
    };

    RowList.prototype.toggleSelectAll = function() {
      var $rowCheckboxes;
      $rowCheckboxes = this.getRowCheckboxes();
      if (this.ui.selectAllCheckbox.prop('checked')) {
        this.tableSelections.selectAllState = true;
        this.tableSelections.deselectedIDs = {};
        _.each(this.collection.models, function(model) {
          return model.set('selected', true);
        });
        this.controller.carpenterRadio.trigger('table:rows:selected');
      } else {
        this.tableSelections.selectAllState = false;
        this.tableSelections.selectedIDs = {};
        _.each(this.collection.models, function(model) {
          return model.set('selected', false);
        });
        this.controller.carpenterRadio.trigger('table:rows:deselected');
      }
      this.collection.trigger('select_all_toggled');
      return true;
    };

    RowList.prototype.selectIntermediateCheckboxes = function(e) {
      var $previousRows, $previouslySelectedCheckbox, $subsequentRows, newState;
      if (window.event.shiftKey && this.previouslySelected) {
        newState = $(e.target).is(':checked');
        $previousRows = $(e.target).parents('tr').prevAll();
        $subsequentRows = $(e.target).parents('tr').nextAll();
        $previouslySelectedCheckbox = $('tr').find(this.previouslySelected);
        if ($previousRows.has($previouslySelectedCheckbox).length > 0) {
          $(e.target).parents('tr').prevUntil($('tr').has($previouslySelectedCheckbox)).find('td.checkbox input').prop('checked', newState).change();
        } else if ($subsequentRows.has($previouslySelectedCheckbox).length > 0) {
          $(e.target).parents('tr').nextUntil($('tr').has($previouslySelectedCheckbox)).find('td.checkbox input').prop('checked', newState).change();
        }
      }
      return this.previouslySelected = $(e.target);
    };

    RowList.prototype.handleRemoveMultiple = function() {
      if (this.collection.length === 0) {
        return this.ui.selectAllCheckbox.prop('checked', false);
      }
    };

    RowList.prototype.fetched = function() {
      if (this.originalEmptyView) {
        this.emptyView = this.originalEmptyView;
        this.originalEmptyView = null;
        return this.render();
      } else {
        return this.updateClasses();
      }
    };

    RowList.prototype.buildChildView = function(item, ItemView) {
      return new ItemView({
        model: item,
        columns: this.columns,
        selectable: this.selectable,
        tableSelections: this.tableSelections,
        serverAPI: this.collection.server_api,
        controller: this.controller
      });
    };

    RowList.prototype.serializeData = function() {
      return this;
    };

    RowList.prototype.updateClasses = function() {
      var totalRecords, _base, _base1;
      totalRecords = this.collection.totalRecords || this.collection.length || 0;
      if (typeof (_base = this.ui.table).toggleClass === "function") {
        _base.toggleClass('loaded', true);
      }
      return typeof (_base1 = this.ui.table).toggleClass === "function" ? _base1.toggleClass('populated', totalRecords > 0) : void 0;
    };

    RowList.prototype.onRender = function() {
      this.ui.table.resizableColumns();
      return this.updateClasses();
    };

    return RowList;

  })(Marionette.CompositeView);
});

define('templates/selection_indicator',[],function(){
  var template = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class="selection-indicator"><span class="num-selected">'));
    
      _print(this.numSelected);
    
      _print(_safe('</span> of '));
    
      _print(this.totalRecords);
    
      _print(_safe(' selected</div>'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
  return template;
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define('views/selection_indicator',['templates/selection_indicator'], function(template) {
  var SelectionIndicator;
  return SelectionIndicator = (function(_super) {
    __extends(SelectionIndicator, _super);

    function SelectionIndicator() {
      return SelectionIndicator.__super__.constructor.apply(this, arguments);
    }

    SelectionIndicator.prototype.template = template;

    SelectionIndicator.prototype.initialize = function(opts) {
      var calculateEvents, renderEvents;
      if (opts == null) {
        opts = {};
      }
      this.tableSelections = opts.tableSelections;
      this.tableCollection = opts.tableCollection;
      calculateEvents = ['selection_toggled', 'select_all_toggled', 'remove:multiple:after'];
      _.each(calculateEvents, (function(_this) {
        return function(event) {
          return _this.listenTo(_this.tableCollection, event, function() {
            return _this.calculateNumSelected();
          });
        };
      })(this));
      renderEvents = ['sync', 'change:numSelected'];
      return _.each(renderEvents, (function(_this) {
        return function(event) {
          return _this.listenTo(_this.tableCollection, event, function() {
            return _this.render();
          });
        };
      })(this));
    };

    SelectionIndicator.prototype.calculateNumSelected = function() {
      var numSelected;
      if (!this.tableCollection.totalRecords) {
        return 0;
      }
      if (this.tableSelections.selectAllState) {
        numSelected = this.tableCollection.totalRecords - Object.keys(this.tableSelections.deselectedIDs).length;
      } else {
        numSelected = Object.keys(this.tableSelections.selectedIDs).length;
      }
      return this.tableCollection.updateNumSelected(numSelected);
    };

    SelectionIndicator.prototype.serializeData = function() {
      return {
        numSelected: this.tableCollection.numSelected,
        totalRecords: this.tableCollection.totalRecords
      };
    };

    return SelectionIndicator;

  })(Marionette.ItemView);
});

var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

define('controllers/table_controller',['controllers/application_controller', 'entities/paginated_collection', 'entities/action_buttons_collection', 'entities/action_button', 'entities/filter', 'views/control_bar', 'views/empty', 'views/header', 'views/layout', 'views/loading', 'views/paginator', 'views/row', 'views/row_list', 'views/selection_indicator', 'utilities/string_utils'], function(Controller, CreatePaginatedCollectionClass, ActionButtonsCollection, ActionButton, EntityFilter, ControlBar, Empty, Header, Layout, Loading, Paginator, Row, RowList, SelectionIndicator, StringUtils) {
  Marionette.Carpenter = {};
  Marionette.Carpenter.CellController = (function(_super) {
    __extends(CellController, _super);

    function CellController() {
      return CellController.__super__.constructor.apply(this, arguments);
    }

    return CellController;

  })(Controller);
  Marionette.Carpenter.Controller = (function(_super) {
    __extends(Controller, _super);

    function Controller() {
      this.toggleInteraction = __bind(this.toggleInteraction, this);
      this.setPerPage = __bind(this.setPerPage, this);
      this.totalPages = __bind(this.totalPages, this);
      this.totalRecords = __bind(this.totalRecords, this);
      this.last = __bind(this.last, this);
      this.first = __bind(this.first, this);
      this.previous = __bind(this.previous, this);
      this.next = __bind(this.next, this);
      this.refresh = __bind(this.refresh, this);
      return Controller.__super__.constructor.apply(this, arguments);
    }

    Controller.prototype.showView = true;

    Controller.prototype.selectable = false;

    Controller.prototype.filterTemplatePath = '';

    Controller.prototype.taggable = false;

    Controller.prototype.title = null;

    Controller.prototype["static"] = false;

    Controller.prototype.fetch = true;

    Controller.prototype.defaultSort = null;

    Controller.prototype.actionButtons = [];

    Controller.prototype.columns = [];

    Controller.prototype.perPageOptions = [20, 50, 100, 'All'];

    Controller.prototype.perPage = 20;

    Controller.prototype.columnDefaults = {
      sortable: true,
      escape: true,
      defaultDirection: 'desc'
    };

    Controller.prototype.header = null;

    Controller.prototype.buttons = null;

    Controller.prototype.list = null;

    Controller.prototype.paginator = null;

    Controller.prototype.initialize = function(opts) {
      var PagerClass, _base, _ref;
      if (opts == null) {
        opts = {};
      }
      _.extend(this, opts);
      _.each(this.columns, (function(_this) {
        return function(column) {
          _.defaults(column, _this.columnDefaults);
          return _.defaults(column, {
            label: StringUtils.humanize(column.attribute)
          });
        };
      })(this));
      this["static"] = !!this["static"];
      PagerClass = CreatePaginatedCollectionClass(this.collection, this);
      this.collection = new PagerClass(this.collection.models);
      if (typeof (_base = this.collection).rebind === "function") {
        _base.rebind();
      }
      this.setMainView(new Layout(this));
      this.collection.perPage = this.perPage;
      this.collection.sortColumn = (_ref = this.defaultSortColumn()) != null ? _ref.attribute : void 0;
      this.collection.sortDirection = this.defaultSortDirection();
      if (!this["static"]) {
        this.collection.updateSortKey();
      }
      this.tableCollection = this.collection;
      this.tableSelections = {};
      if (this.selectable) {
        this.tableSelections.selectAllState = false;
        this.tableSelections.selectedIDs = {};
        this.tableSelections.deselectedIDs = {};
      }
      this.actionButtonsCollection = new ActionButtonsCollection(opts.actionButtons);
      this.header = new Header(this);
      this.buttons = new ControlBar(this);
      this.list = new RowList(this);
      this.paginator = new Paginator(this);
      if (this.selectable) {
        this.selectionIndicator = new SelectionIndicator(this);
      }
      this.listenTo(this.collection, 'reset', (function(_this) {
        return function() {
          return _this.toggleInteraction(true);
        };
      })(this));
      this.listenTo(this.collection, 'sync', (function(_this) {
        return function() {
          return _this.toggleInteraction(true);
        };
      })(this));
      this.listenTo(this.collection, 'change', (function(_this) {
        return function() {
          return _this.toggleInteraction(true);
        };
      })(this));
      this.listenTo(this.collection, 'error', (function(_this) {
        return function() {
          return _this.toggleInteraction(true);
        };
      })(this));
      this.listenTo(this.collection, 'remove:multiple', (function(_this) {
        return function(removedIDs) {
          _.each(removedIDs, function(id) {
            return delete _this.tableSelections.selectedIDs[id];
          });
          _this.collection.trigger('remove:multiple:after');
          _this.toggleInteraction(false);
          return _this.tableCollection.fetch();
        };
      })(this));
      this.listenTo(this.getMainView(), 'show', (function(_this) {
        return function() {
          _this.show(_this.header, {
            region: _this.getMainView().headerRegion
          });
          _this.show(_this.buttons, {
            region: _this.getMainView().buttonsRegion
          });
          _this.show(_this.list, {
            region: _this.getMainView().tableRegion
          });
          _this.show(_this.paginator, {
            region: _this.getMainView().paginationRegion
          });
          if (_this.selectable) {
            _this.show(_this.selectionIndicator, {
              region: _this.getMainView().selectionIndicatorRegion,
              preventDestroy: false
            });
          }
          return typeof _this.onShow === "function" ? _this.onShow(_this) : void 0;
        };
      })(this));
      this.listenTo(this.paginator, 'table:first', this.first);
      this.listenTo(this.paginator, 'table:previous', this.previous);
      this.listenTo(this.paginator, 'table:next', this.next);
      this.listenTo(this.paginator, 'table:last', this.last);
      this.listenTo(this.paginator, 'table:setPerPage', (function(_this) {
        return function() {
          var needsReload, newPerPage;
          newPerPage = _this.paginator.ui.perPage.val();
          if (_this.perPage === newPerPage) {
            return;
          }
          needsReload = newPerPage > _this.perPage;
          _this.setPerPage(newPerPage);
          if (needsReload) {
            return _this.toggleInteraction(false);
          }
        };
      })(this));
      this.listenTo(this.paginator, 'table:pageInputChanged', _.debounce((function(_this) {
        return function(e) {
          var clampedVal, val;
          val = parseInt(_this.paginator.ui.pageInput.val());
          if ((val != null) && _.isNumber(val) && !_.isNaN(val) && val !== _this.collection.currentPage) {
            clampedVal = Math.min(Math.max(1, val), _this.totalPages());
            if (clampedVal !== val) {
              _this.paginator.ui.pageInput.val(clampedVal);
            }
            if (clampedVal === _this.collection.currentPage) {
              return;
            }
            _this.collection.goTo(clampedVal);
            _this.toggleInteraction(false);
            return _.defer(function() {
              return _this.paginator.ui.pageInput.click();
            });
          }
        };
      })(this), 300));
      this.listenTo(this.list, 'table:sort', (function(_this) {
        return function(opts) {
          var dir, sortCol;
          if (opts == null) {
            opts = {};
          }
          sortCol = _.findWhere(_this.columns, {
            attribute: opts.attribute
          });
          dir = _this.list.sortColumn === opts.attribute ? _this.list.sortDirection === 'asc' ? 'desc' : 'asc' : _this.list.sortDirection || (sortCol != null ? sortCol.defaultDirection : void 0) || 'desc';
          _this.toggleInteraction(false);
          if (sortCol != null ? sortCol.sortable : void 0) {
            return _this.list.setSort(sortCol.attribute, dir, sortCol.sortAttribute);
          }
        };
      })(this));
      if (this["static"]) {
        this.collection.bootstrap();
      } else {
        if (this.fetch) {
          this.collection.fetch({
            reset: true
          });
        }
      }
      if (this.showView) {
        return this.show(this.getMainView(), {
          region: opts.region
        });
      }
    };

    Controller.prototype.refresh = function(opts) {
      if (opts == null) {
        opts = {};
      }
      _.defaults(opts, {
        reset: true
      });
      this.toggleInteraction(false);
      return this.collection.fetch(opts);
    };

    Controller.prototype.next = function() {
      this.toggleInteraction(false);
      return this.collection.nextPage();
    };

    Controller.prototype.previous = function() {
      this.toggleInteraction(false);
      return this.collection.prevPage();
    };

    Controller.prototype.first = function() {
      this.toggleInteraction(false);
      return this.collection.goTo(1);
    };

    Controller.prototype.last = function() {
      this.toggleInteraction(false);
      return this.collection.goTo(this.totalPages());
    };

    Controller.prototype.totalRecords = function() {
      if (this.collection.totalRecords != null) {
        return this.collection.totalRecords;
      } else if (this.collection.origModels != null) {
        return this.collection.origModels.length;
      } else if (this.collection.models != null) {
        return this.collection.models.length;
      } else {
        return 0;
      }
    };

    Controller.prototype.totalPages = function() {
      return Math.floor(this.totalRecords() / this.collection.perPage) + 1;
    };

    Controller.prototype.setPerPage = function(newPerPage) {
      this.paginator.perPage = this.perPage = newPerPage;
      return this.collection.howManyPer(newPerPage);
    };

    Controller.prototype.defaultSortColumn = function() {
      return _.findWhere(this.columns, {
        attribute: this.defaultSort
      }) || _.findWhere(this.columns, {
        sortable: true
      });
    };

    Controller.prototype.defaultSortDirection = function() {
      var dir, _ref;
      dir = (_ref = this.defaultSortColumn()) != null ? _ref.defaultDirection : void 0;
      return (_.contains(['asc', 'desc'], dir) && dir) || 'desc';
    };

    Controller.prototype.toggleInteraction = function(enabled) {
      var $ctrlBarButtons, userInputSelector;
      if (enabled) {
        this.carpenterRadio.trigger('total_records:change', this.totalRecords());
      }
      if (this.isInteractionEnabled === enabled) {
        return;
      }
      if (!this["static"]) {
        this.isInteractionEnabled = enabled;
        userInputSelector = 'a,th,select,input';
        $ctrlBarButtons = this.buttons.$el.find(userInputSelector);
        this.getMainView().$el.find(userInputSelector).not($ctrlBarButtons).toggleClass('disabled', !enabled);
        $ctrlBarButtons.toggleClass('action-disabled', !enabled);
      }
      if (enabled) {
        return this.paginator.render();
      }
    };

    return Controller;

  })(Controller);
  Marionette.Carpenter.create = function(opts) {
    var controller;
    if (opts == null) {
      opts = {};
    }
    opts.showView = false;
    controller = new Marionette.Carpenter.Controller(opts);
    return controller.getMainView();
  };
  return Marionette.Carpenter.Controller;
});

  return require("controllers/table_controller");
}));
