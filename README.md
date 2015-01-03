<h1 align="center">Marionette.Carpenter</h1>
<p align="center">
  <img title="backbone marionette" src='https://raw.githubusercontent.com/rapid7/marionette.carpenter/master/site/source/assets/images/logo-black.png' />
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

One of the more common tasks when developing web applications is building tabular representations of resources. Carpenter aims to make the process of building robust tables as simple as possible, while giving developers the flexibility to easily extend the table's functionality.

### Features

* Searching
* Sorting
* Pagination (for both client and server-side collections)
* Custom views for table cells

## Getting Started

### Installation

#### Installing via Bower

The easiest way to get things rocking and rolling is with [Bower](http://bower.io/):

```console
$ bower install marionette.carpenter
```

That will put everything in place along with all the correct dependencies. Easy ice!

#### Installing by Hand

For an artisanal, hand-crafted, manual installation, you'll need to start by installing the...

##### Dependencies

You can find an up-to-date list of the libraries required by Carpenter in the [`bower.json` file](https://github.com/rapid7/marionette.carpenter/blob/master/bower.json) under the `dependencies` key. Install these as instructed in each project's `README`.

#### Manual Installation

After getting the dependencies in place, move the following files into their proper places in your project:

* [`dist/marionette.carpenter.css`](https://github.com/rapid7/marionette.carpenter/blob/master/dist/marionette.carpenter.css) - The base CSS styles for Carpenter tables.
* [`assets/images/*`](https://github.com/rapid7/marionette.carpenter/tree/master/assets/images) - All of the image assets necessary to use the base table styling.

Then install only one of the following two files, depending on whether you plan to load Carpenter via AMD:

* [`dist/marionette.carpenter.js`](https://github.com/rapid7/marionette.carpenter/blob/master/dist/marionette.carpenter.js) - The main Carpenter library.
* [`dist/marionette.carpenter.require.js`](https://github.com/rapid7/marionette.carpenter/blob/master/dist/marionette.carpenter.require.js) - The main Carpenter library. **Use this file if you plan on using Carpenter with [RequireJS](http://requirejs.org/).**

## Development

To build from source, just run:

```console
$ grunt build
```

To run tests, run:


```console
$ grunt spec
```