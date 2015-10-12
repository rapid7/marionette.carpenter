#!/usr/bin/env node

var JAKE_PATH = './node_modules/jake/bin/cli.js';
var args = process.argv.slice(1);
var opts = {
  env: process.env,
  stdio: 'inherit'
};

require('child_process').spawn(JAKE_PATH, args, opts);
