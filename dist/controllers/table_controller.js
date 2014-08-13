(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(['controllers/application_controller', 'entities/paginated_collection', 'entities/action_buttons', 'entities/filter', 'views/table_view'], function($) {
    return this.Pro.module("Components.Table", function(Table, App) {
      var API;
      Table.Controller = (function(_super) {
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

        Controller.prototype.searchable = true;

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
          var PagerClass, _base;
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
          PagerClass = App.Entities.CreatePaginatedCollectionClass(this.collection, this);
          this.collection = new PagerClass(this.collection.models);
          if (typeof (_base = this.collection).rebind === "function") {
            _base.rebind();
          }
          this.setMainView(new Table.Layout(this));
          this.collection.perPage = this.perPage;
          this.collection.sortColumn = this.defaultSortColumn().attribute;
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
          this.actionButtonsCollection = App.request('new:action_buttons:entities', opts.actionButtons);
          if (this.filterEnabled()) {
            this.filterModel = App.request('new:filter:entity', this.filterAttrs);
          }
          this.header = new Table.Header(this);
          this.buttons = new Table.ControlBar(this);
          this.list = new Table.RowList(this);
          this.paginator = new Table.Paginator(this);
          if (this.selectable) {
            this.selectionIndicator = new Table.SelectionIndicator(this);
          }
          if (this.filterEnabled()) {
            if (this.filterView) {
              this.filter = new this.filterView(this);
            } else {
              this.filter = new Table.Filter(this);
            }
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
              this.show(this.selectionIndicator, {
                region: this.getMainView().selectionIndicatorRegion
              });
            }
            if (this.filterEnabled()) {
              return this.show(this.filter, {
                region: this.getMainView().filterRegion
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
          if (this.filter) {
            this.listenTo(this.filter, 'table:search', (function(_this) {
              return function(filter) {
                _this.toggleInteraction(false);
                return _this.list.setSearch(filter);
              };
            })(this));
          }
          if (this["static"]) {
            this.collection.bootstrap();
          } else if (this.filterAttrs) {
            this.list.setSearch(this.filter.model);
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
          } else {
            return this.collection.origModels.length;
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
            App.vent.trigger('total_records:change', this.totalRecords());
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

        Controller.prototype.filterEnabled = function() {
          return this.filterTemplatePath || this.filterView;
        };

        return Controller;

      })(App.Controllers.Application);
      API = {
        createTable: function(options) {
          return new Table.Controller(options);
        }
      };
      return App.reqres.setHandler('table:component', function(options) {
        if (options == null) {
          options = {};
        }
        return API.createTable(options);
      });
    });
  });

}).call(this);

//# sourceMappingURL=table_controller.js.map
