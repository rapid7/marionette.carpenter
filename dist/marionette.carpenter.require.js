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

(function() {
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
        this.ui.table.resizableColumns();
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
