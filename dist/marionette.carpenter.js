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

(function() {
  var __slice = [].slice;

  define('utilities/mixin',[], function() {
    var include, key, klass, klasses, mixinKeywords, module, modules, obj, _i, _len, _results;
    mixinKeywords = ["beforeIncluded", "afterIncluded"];
    include = function() {
      var concern, klass, obj, objs, _i, _len, _ref, _ref1, _ref2;
      objs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      klass = this;
      for (_i = 0, _len = objs.length; _i < _len; _i++) {
        obj = objs[_i];
        concern = obj;
        if ((_ref = concern.beforeIncluded) != null) {
          _ref.call(klass.prototype, klass, concern);
        }
        Cocktail.mixin(klass, (_ref1 = _(concern)).omit.apply(_ref1, mixinKeywords));
        if ((_ref2 = concern.afterIncluded) != null) {
          _ref2.call(klass.prototype, klass, concern);
        }
      }
      return klass;
    };
    modules = [
      {
        Backbone: ["Collection", "Model", "View"]
      }, {
        Marionette: ["ItemView", "LayoutView", "CollectionView", "CompositeView", "Controller"]
      }
    ];
    _results = [];
    for (_i = 0, _len = modules.length; _i < _len; _i++) {
      module = modules[_i];
      _results.push((function() {
        var _results1;
        _results1 = [];
        for (key in module) {
          klasses = module[key];
          _results1.push((function() {
            var _j, _len1, _ref, _results2;
            _results2 = [];
            for (_j = 0, _len1 = klasses.length; _j < _len1; _j++) {
              klass = klasses[_j];
              obj = window[key];
              _results2.push((_ref = obj[klass]) != null ? _ref.include = include : void 0);
            }
            return _results2;
          })());
        }
        return _results1;
      })());
    }
    return _results;
  });

}).call(this);

//# sourceMappingURL=mixin.js.map
;
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('controllers/application_controller',['utilities/mixin'], function() {
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
        this.carpenter.command("register:instance", this, this._instance_id);
      }

      Controller.prototype.destroy = function() {
        this.carpenter.command("unregister:instance", this, this._instance_id);
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
          return this.carpenter.command("show:loading", view, options);
        } else {
          return options.region.show(view);
        }
      };

      Controller.prototype.mergeDefaultsInto = function(obj) {
        obj = _.isObject(obj) ? obj : {};
        return _.defaults(obj, this._getDefaults());
      };

      Controller.prototype._attachRadio = function() {
        return this.carpenter = Backbone.Radio.channel('carpenter');
      };

      Controller.prototype._getDefaults = function() {
        return _.clone(_.result(this, "defaults"));
      };

      return Controller;

    })(Marionette.Controller);
  });

}).call(this);

//# sourceMappingURL=application_controller.js.map
;
(function() {
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
        return this.carpenter.command('flash:display', {
          title: 'Error in search',
          style: 'error',
          message: message || 'There is an error in your search terms.'
        });
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
      var WrappedCollection, k, superclass, v, _base, _ref;
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
      return WrappedCollection;
    };
  });

}).call(this);

//# sourceMappingURL=paginated_collection.js.map
;
(function() {
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

}).call(this);

//# sourceMappingURL=action_button.js.map
;
(function() {
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

}).call(this);

//# sourceMappingURL=action_buttons_collection.js.map
;
(function() {
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

}).call(this);

//# sourceMappingURL=filter.js.map
;
(function() {
  define('concerns/views/filter_toggle',[], function() {
    var FilterToggle;
    return FilterToggle = {
      ui: {
        filterToggle: 'a.filter-toggle'
      },
      events: {
        'click @ui.filterToggle': 'triggerFilterToggle'
      },
      triggerFilterToggle: function() {
        this.ui.filterToggle.toggleClass('enabled');
        return this.carpenter.trigger(this.filterToggleEvent);
      }
    };
  });

}).call(this);

//# sourceMappingURL=filter_toggle.js.map
;
(function() {
  define('concerns/views/filter_custom_query_field',[], function() {
    var FilterCustomQueryField;
    return FilterCustomQueryField = {
      ui: {
        filterCustomQueryField: 'input.filter-custom-query-field'
      },
      events: {
        'keyup @ui.filterCustomQueryField': 'inputActivity'
      },
      inputActivity: function() {
        this.debouncedTriggerCustomQuery || (this.debouncedTriggerCustomQuery = _.debounce(this.triggerFilterCustomQuery, 1000));
        return this.debouncedTriggerCustomQuery();
      },
      triggerFilterCustomQuery: function() {
        return this.carpenter.trigger(this.filterCustomQueryEvent, this.ui.filterCustomQueryField.val());
      }
    };
  });

}).call(this);

//# sourceMappingURL=filter_custom_query_field.js.map
;
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

(function() {
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
          return this.carpenter.trigger(this.model.get('event'));
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

}).call(this);

//# sourceMappingURL=action_button.js.map
;
define('templates/control_bar',[],function(){
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
      if (this.renderFilterControls) {
        _print(_safe('\n  <div class="filter-controls-wrapper">\n    <div class="filter-controls">\n      <a href="javascript:void(0);" class="filter-toggle">\n        Filter\n        <span class="explanatory-text">Toggle search filter</span>\n      </a>\n\n      <div class=\'search-field\'>\n        <input type="text" class="filter-custom-query-field" placeholder="Search">\n      </div>\n    </div>\n  </div>\n'));
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

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/control_bar',['concerns/views/filter_toggle', 'concerns/views/filter_custom_query_field', 'views/action_button', 'templates/control_bar'], function(FilterToggle, FilterCustomQueryField, ActionButton, template) {
    var ControlBar;
    return ControlBar = (function(_super) {
      __extends(ControlBar, _super);

      function ControlBar() {
        return ControlBar.__super__.constructor.apply(this, arguments);
      }

      ControlBar.prototype.template = template;

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
        this.renderFilterControls = !!opts.renderFilterControls;
        this.filterCustomQueryEvent = opts.filterCustomQueryEvent;
        this.filterToggleEvent = opts.filterToggleEvent;
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

      ControlBar.include(FilterToggle);

      ControlBar.include(FilterCustomQueryField);

      return ControlBar;

    })(Marionette.CompositeView);
  });

}).call(this);

//# sourceMappingURL=control_bar.js.map
;
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

(function() {
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

}).call(this);

//# sourceMappingURL=empty.js.map
;
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/filter',[], function() {
    var Filter;
    return Filter = (function(_super) {
      __extends(Filter, _super);

      function Filter() {
        this.resetFilter = __bind(this.resetFilter, this);
        this.toggleFilter = __bind(this.toggleFilter, this);
        return Filter.__super__.constructor.apply(this, arguments);
      }

      Filter.prototype.ui = {
        textInputs: 'input[type=text], textarea',
        checkboxes: 'input[type=checkbox]',
        selectInputs: 'select',
        filter: '.filter',
        filterCols: '.filter-column',
        resetLink: 'a.filter-reset',
        hideOnResetInputs: 'input.hide-on-reset'
      };

      Filter.prototype.events = {
        'keyup @ui.textInputs': 'inputActivity',
        'change @ui.selectInputs': 'inputActivity',
        'change @ui.checkboxes': 'inputActivity',
        'click @ui.resetLink': 'resetFilter'
      };

      Filter.prototype.modelEvents = {
        'change': 'triggerSearch'
      };

      Filter.prototype.initialize = function(opts) {
        if (opts == null) {
          opts = {};
        }
        this.template = this.templatePath(opts.filterTemplatePath);
        this.model = opts.filterModel;
        this.filterAttrs = opts.filterAttrs;
        this.collection = opts.collection;
        return this.carpenter = opts.carpenter;
      };

      Filter.prototype.inputActivity = function() {
        this.debouncedUpdateModel || (this.debouncedUpdateModel = _.debounce(this.updateModel, 1000));
        return this.debouncedUpdateModel();
      };

      Filter.prototype.prepareInputReaders = function() {
        this.filterInputReaderSet = new Backbone.Syphon.InputReaderSet();
        this.filterInputReaderSet.registerDefault(function($el) {
          return $el.val();
        });
        return this.filterInputReaderSet.register('checkbox', function($el) {
          if ($el.prop('checked')) {
            return $el.data('filter-value');
          }
        });
      };

      Filter.prototype.prepareInputWriters = function() {
        this.filterInputWriterSet = new Backbone.Syphon.InputWriterSet;
        this.filterInputWriterSet.registerDefault(function($el, value) {
          return $el.val(value);
        });
        return this.filterInputWriterSet.register('checkbox', (function(_this) {
          return function($el, value) {
            return _this.ui.checkboxes.filter("[data-filter-value='" + value + "']").prop('checked', true);
          };
        })(this));
      };

      Filter.prototype.updateModel = function(customQuery) {
        var data;
        this.prepareInputReaders();
        data = Backbone.Syphon.serialize(this, {
          inputReaders: this.filterInputReaderSet
        });
        _.extend(data, {
          custom_query: customQuery
        });
        this.collection.currentPage = 1;
        return this.model.set(data);
      };

      Filter.prototype.triggerSearch = function() {
        return this.trigger('table:search', this.model);
      };

      Filter.prototype.handleFilterOnLoad = function() {
        this.prepareInputWriters();
        Backbone.Syphon.deserialize(this, this.model.attributes, {
          inputWriters: this.filterInputWriterSet
        });
        return this.toggleFilter();
      };

      Filter.prototype.addFilterColumnClasses = function() {
        var filterClass;
        filterClass = (function() {
          switch (this.ui.filterCols.length) {
            case 5:
              return 'columns-5';
            case 4:
              return 'columns-4';
            case 3:
              return 'columns-3';
          }
        }).call(this);
        return this.ui.filterCols.addClass(filterClass);
      };

      Filter.prototype.toggleFilter = function() {
        return this.ui.filter.toggle();
      };

      Filter.prototype.resetFilter = function() {
        this.ui.textInputs.val('');
        this.ui.selectInputs.val('');
        this.ui.checkboxes.prop('checked', false);
        this.ui.hideOnResetInputs.css('visibility', 'hidden');
        return this.updateModel();
      };

      Filter.prototype.onRender = function() {
        this.addFilterColumnClasses();
        if (this.filterAttrs) {
          return this.handleFilterOnLoad();
        }
      };

      return Filter;

    })(Marionette.ItemView);
  });

}).call(this);

//# sourceMappingURL=filter.js.map
;
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
        _print(_safe('\n  <h3>'));
        _print(this.title);
        _print(_safe('</h3>\n'));
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

(function() {
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
        return this.taggable = !!opts.taggable;
      };

      Header.prototype.serializeData = function() {
        return this;
      };

      return Header;

    })(Marionette.ItemView);
  });

}).call(this);

//# sourceMappingURL=header.js.map
;
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

(function() {
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

}).call(this);

//# sourceMappingURL=layout.js.map
;
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

(function() {
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

}).call(this);

//# sourceMappingURL=loading.js.map
;
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
        _print(_safe('\n      </select>\n    </label>\n\n    <span class=\'page_info line\'>\n      '));
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

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/paginator',['templates/paginator'], function(template) {
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

}).call(this);

//# sourceMappingURL=paginator.js.map
;
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
        _print(_.str.underscored(column.attribute).replace(/[^\w]/g, ''));
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

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/row',['templates/row'], function(template) {
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
        this.carpenter = opts.carpenter;
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
        this.carpenter.trigger('table:row:selection_toggled', this.model);
        this.model.trigger('selection_toggled');
        if (!this.ui.checkbox.prop('checked')) {
          this.carpenter.trigger('table:row:deselected', this.model);
          return this.model.trigger('deselected');
        } else {
          this.carpenter.trigger('table:row:selected', this.model);
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
        return this;
      };

      return Row;

    })(Marionette.LayoutView);
  });

}).call(this);

//# sourceMappingURL=row.js.map
;
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
    
      _print(_safe('<table>\n  <thead>\n    <tr>\n      '));
    
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

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/row_list',['views/row', 'views/empty', 'views/loading', 'templates/table'], function(Row, Empty, Loading, template) {
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
        this.carpenter = opts.carpenter;
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
        } else {
          this.tableSelections.selectAllState = false;
          this.tableSelections.selectedIDs = {};
          _.each(this.collection.models, function(model) {
            return model.set('selected', false);
          });
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
          carpenter: this.carpenter
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
        return this.updateClasses();
      };

      return RowList;

    })(Marionette.CompositeView);
  });

}).call(this);

//# sourceMappingURL=row_list.js.map
;
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

(function() {
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

}).call(this);

//# sourceMappingURL=selection_indicator.js.map
;
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  define('controllers/table_controller',['controllers/application_controller', 'entities/paginated_collection', 'entities/action_buttons_collection', 'entities/action_button', 'entities/filter', 'views/control_bar', 'views/empty', 'views/filter', 'views/header', 'views/layout', 'views/loading', 'views/paginator', 'views/row', 'views/row_list', 'views/selection_indicator'], function(Controller, CreatePaginatedCollectionClass, ActionButtonsCollection, ActionButton, EntityFilter, ControlBar, Empty, Filter, Header, Layout, Loading, Paginator, Row, RowList, SelectionIndicator) {
    var API;
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

      Controller.prototype.filterable = true;

      Controller.prototype.selectable = false;

      Controller.prototype.filterTemplatePath = '';

      Controller.prototype.taggable = false;

      Controller.prototype.title = null;

      Controller.prototype["static"] = false;

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
              label: _.str.humanize(column.attribute)
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
        this.listClass || (this.listClass = RowList);
        this.header = new Header(this);
        this.buttons = new ControlBar(this);
        this.list = new this.listClass(this);
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
        this.listenTo(this.getMainView(), 'show', function() {
          this.show(this.header, {
            region: this.getMainView().headerRegion
          });
          this.show(this.buttons, {
            region: this.getMainView().buttonsRegion
          });
          this.show(this.list, {
            region: this.getMainView().tableRegion
          });
          this.show(this.paginator, {
            region: this.getMainView().paginationRegion
          });
          if (this.selectable) {
            return this.show(this.selectionIndicator, {
              region: this.getMainView().selectionIndicatorRegion,
              preventDestroy: false
            });
          }
        });
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
          this.collection.fetch({
            reset: true
          });
        }
        return this.show(this.getMainView(), {
          region: opts.region
        });
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
          this.carpenter.trigger('total_records:change', this.totalRecords());
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
    return API = {
      createTable: function(options) {
        return new Controller(options);
      }
    };
  });

}).call(this);

//# sourceMappingURL=table_controller.js.map
;

require(["controllers/table_controller"]);

//# sourceMappingURL=marionette.carpenter.js.map