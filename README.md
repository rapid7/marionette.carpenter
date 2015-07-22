<h1 align="center">Marionette.Carpenter</h1>
<p align="center">
  <img title="backbone marionette" src='https://raw.githubusercontent.com/rapid7/marionette.carpenter/master/site/source/assets/images/logo-black.png' style='width:100%;'/>
</p>
<p align="center">It builds tables.</p>
<p align="center">
  <a title='Build Status' href="https://travis-ci.org/rapid7/marionette.carpenter">
    <img src='https://img.shields.io/travis/rapid7/marionette.carpenter.svg?branch=master' />
  </a>
  <a href='https://coveralls.io/r/rapid7/marionette.carpenter'>
    <img src='https://img.shields.io/coveralls/rapid7/marionette.carpenter.svg' alt='Coverage Status' />
  </a>
  <a href='https://david-dm.org/rapid7/marionette.carpenter#info=dependencies&view=table'>
    <img src='https://img.shields.io/david/rapid7/marionette.carpenter.svg' />
  </a>
  <a href='https://david-dm.org/rapid7/marionette.carpenter#info=devDependencies&view=table'>
    <img src='https://img.shields.io/david/dev/rapid7/marionette.carpenter.svg' />
  </a>
</p>

## About Carpenter

**Easily represent a Backbone collection as a sortable, paginated table.**

One of the more common tasks when developing web applications is building tabular representations of data. Carpenter aims to make the process of building robust tables as simple as possible, while giving developers the flexibility to easily extend a table's functionality.

### Features

* Searching
* Sorting
* Pagination (for both client and server-side collections)
* Custom views for table cells
* Button bar generation

## Installation

### Installing via Bower

The easiest way to get things rocking and rolling is with [Bower](http://bower.io/):

```console
$ bower install marionette.carpenter
```

That will put everything in place along with all the correct dependencies. Easy ice!

### Using with RequireJS

If you'd like to use Carpenter with [RequireJS](http://requirejs.org/), the following `requirejs.config` should come in handy:

```coffeescript
requirejs.config
  shim:
    'backbone':
      deps: ['underscore', 'jquery']
      exports: 'Backbone'
   'backbone.radio':
      deps: ['backbone']
    'underscore':
      exports: '_'
    'marionette':
      deps: ['backbone', 'backbone.wreqr', 'backbone.babysitter']
     exports: 'Marionette'
    'carpenter':
      deps: ['cocktail', 'backbone.radio', 'underscore.string', 'jquery-resizable-columns', 'marionette']

```

Note that you will also likely need to [specify a `paths` configuration](http://requirejs.org/docs/api.html#config-paths).

### Installing by Hand

For an artisanal, hand-crafted, manual installation, you'll need to start by installing the...

#### Dependencies

You can find an up-to-date list of the libraries required by Carpenter in the [`bower.json` file](https://github.com/rapid7/marionette.carpenter/blob/master/bower.json) under the `dependencies` key. Install these as instructed in each project's `README`.

#### Manual Installation

After getting the dependencies in place, move the following files into their proper places in your project:

* [`dist/marionette.carpenter.css`](https://github.com/rapid7/marionette.carpenter/blob/master/dist/marionette.carpenter.css) - The base CSS styles for Carpenter tables.
* [`dist/marionette.carpenter.js`](https://github.com/rapid7/marionette.carpenter/blob/master/dist/marionette.carpenter.js) - The main Carpenter library.

## Usage

Building a table couldn't be simpler:

```coffeescript
new Marionette.Carpenter.Controller
  title: 'Users'
  region: new Backbone.Marionette.Region el: '#users-table-region'
  collection: usersCollection # a Backbone collection
  static: true
  columns: [
    { attribute: 'first_name' }
    { attribute: 'last_name' }     
    { attribute: 'email' }
  ]
```

The above code creates a new table element at `#users-table-region` with pagination controls and sortable columns. We set the title of the table with `title: 'Users'`, indicate the `region` we want the table rendered to, specify that the collection is to be paginated and sorted client-side with `static: true`, and then specify the attributes to load in the table with an array at `columns`.

### Customizing columns

The `columns` property is where the action's at when you're looking to specify the data that the table loads. We pass an array of objects, with each object representing a column in the table. At a minimum, we need to specify a model attribute that we wish to display for each column:

```coffeescript
columns: [
  { attribute: 'title' }
  { attribute: 'author' }]
```

This will result in two columns, with "Title" and "Author" headers, loading the data from the respective attributes in the model. We can customize the column's header `label`, as well:

```coffeescript
columns: [
  {
    attribute: 'issueCount'
    label:     'Issues'
  }
]
```

#### Sortability

By default, every column is considered sortable. This is easily overridden with the `sortable` property in cases where we want to disallow it:

```coffeescript
columns: [
  {
    attribute: 'avatar'
    sortable: false
  }
]
```

We can also customize the initial sort direction with `defaultDirection`:

```coffeescript
columns: [
  {
    attribute:        'salary'
    defaultDirection: 'desc'
  }
]
```

#### Using custom cell views

Time to get fancy! Let's say we want to render something more than boring old text in one of our cells. In this case, we'd like to create [a Foundation progress bar](http://foundation.zurb.com/docs/components/progress_bars.html). We'll start by defining a `Marionette.ItemView` for the cell:

```coffeescript
class ProjectProgressCellView extends Marionette.ItemView
  template: (data) ->
    """
    <div class="progress round">
      <span class="meter" style="width: #{ data.percentCompleted }%"></span>
    </div>
    """
```
	
We then reference that view in the relevant column's `view` property:

```coffeescript
columns: [
  {
    attribute: 'projectTitle'
    label: 'title'
  }
  {
    attribute: 'contact'
  }
  { 
    attribute: 'percentCompleted'
    label: 'progress'
    view: ProjectProgressCellView
  }
] 
```

It's also possible to pass options to the view's `initialize` method with the `viewOpts` property. If our above `ProjectProgressCellView` accepted a `class` option to override the progress bar's CSS class, we could set it like so:

```coffeescript
  { 
    attribute: 'percentCompleted'
    label: 'progress'
    view: ProjectProgressCellView
    viewOpts:
      class: 'alert round'
  }
```

## Development

To build from source, just run:

```console
$ grunt build
```

To run tests, run:


```console
$ grunt spec
```

To run tests on file change:
    
```console
$ grunt watch
```

## Additional Resources

### API Documentation

The full documentation is available [on the Carpenter site](https://carpenter.coffee/doc/).
