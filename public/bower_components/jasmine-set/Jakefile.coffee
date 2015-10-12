fs = require 'fs'
_ = require 'underscore'
child_process = require 'child_process'
JASMINE_PATH = './node_modules/jasmine-node/lib/jasmine-node/cli.js'
SRC_PATH = './src/set.coffee'
DIST_PATH = './jasmine-set.js'

run_task = (cmd, cmpl_fn=complete) ->
  child_process.exec cmd, (error, stdout, stderr) ->
    process.stdout.write(stdout) if stdout.trim().length?
    process.stdout.write(stderr) if stderr.trim().length?
    cmpl_fn() if cmpl_fn?

desc 'Runs the test spec'
task 'spec', { async: true }, ->
  debug = if process.env.DEBUG? then '--debug-brk' else ''
  spec_file = process.env.SPEC || './spec'
  run_task "node #{debug} #{JASMINE_PATH} --coffee --verbose #{spec_file}", complete

desc "Compiles ./src into #{DIST_PATH}"
task 'build', ->
  source = fs.readFileSync(SRC_PATH).toString()
  js = require('coffee-script').compile(source)
  comments = _.filter(source.split("\n\n")[0].split("\n"), (line) -> line.match(/^#.*$/))
  header = _.map(comments, (comment) -> comment.replace(/^#/, '//')).join("\n")
  fs.writeFileSync(DIST_PATH, header+"\n\n"+js)
  console.log("Compiled successfully. Saved in #{DIST_PATH}")
