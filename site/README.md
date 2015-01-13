# Carpenter marketing site

This is the marketing site for Carpenter. Here's the rundown:

## Working with the site

Head on in to this directory, `bundle install`, and run `middleman`. This will kick off a preview server at [localhost:4567](http://localhost:4567).

From here, you can make your changes in the `source` directory at will (and watch your LiveReload-enabled browser autorefresh), commit, push, etc.

## Deploying changes

The `gh-pages` branch contains the compiled source of the site. In order to make a change to the site:

* make the relevant changes in the `source` directory
* preview them with `middleman`
* commit them
* build the site with `middleman build`
* deploy the site to GitHub Pages with `middleman deploy`

The `deploy` command will take the compiled source of the site and commit it to the orphan `gh-pages` branch. This is why you can't make changes directly to the compiled source at `gh-pages`, as they'll be overwritten the next time the site is deployed.
