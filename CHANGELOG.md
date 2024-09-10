# Change Log

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](http://semver.org/).

## [0.0.5](https://github.com/rapid7/marionette.carpenter/releases/0.0.5)

### Changed

- None

### Fixed

- Fixed `carpenterRadio.command` is not a function.

## [0.0.4](https://github.com/rapid7/marionette.carpenter/releases/0.0.4)

### Changed

- [Add ability to use POST request when requesting data if needed/allow additional request parameters](https://github.com/rapid7/marionette.carpenter/pull/37)

### Fixed

- None

## [0.0.3](https://github.com/rapid7/marionette.carpenter/releases/0.0.3)

### Changed

- [Add `escapeLabel` option for adding HTML to labels.](https://github.com/rapid7/marionette.carpenter/pull/27) (#27)
- [Add "populated" tag when empty tables are loaded (in addition to non-empty tables that were already tagged)](https://github.com/rapid7/marionette.carpenter/pull/31) (#31)
- [Add better almond compatibility.](https://github.com/rapid7/marionette.carpenter/pull/29) (#29)

### Fixed
- [Ensure last page button on pagination properly takes you to last table instead of empty view.](https://github.com/rapid7/marionette.carpenter/pull/30) (#30)

## [0.0.2](https://github.com/rapid7/marionette.carpenter/releases/0.0.2) - 8/5/2015

### Changed

- [Allow caller to pass custom regions for each component of the table.](https://github.com/rapid7/marionette.carpenter/commit/7b6088a9e3f0a6db5aa0dcfc80b29527a087cc65)
- [Add `showColumn` and `hideColumn` methods.](https://github.com/rapid7/marionette.carpenter/pull/22) (#22)

### Fixed

- [Don't record selection state when table isn't selectable.](https://github.com/rapid7/marionette.carpenter/commit/8e55509ab35f30b2a02944ad932408b5fe4abf63) (#8)
- [Ensure shift selection of rows works in Firefox.](https://github.com/rapid7/marionette.carpenter/issues/25)
