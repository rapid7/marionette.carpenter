# Carpenter marketing site

This is the marketing site for Carpenter. Here's the rundown:


## Bower assets

Install Node, and download bower dependencies

```
brew install node
npx -p node@16 -- bower install  
```

## Working with the site

Head on in to this directory, `bundle install`, and run `middleman`. This will kick off a preview server at [localhost:4567](http://localhost:4567).

From here, you can make your changes in the `source` directory at will (and watch your LiveReload-enabled browser autorefresh), commit, push, etc.

## Deploying changes

Deploying to Github (gh-pages) is not currently supported:

```console
middleman build
middleman deploy
```
