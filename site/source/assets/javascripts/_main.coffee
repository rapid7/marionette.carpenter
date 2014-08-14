################################################################################
# Init foundation
################################################################################
$(document).foundation();

################################################################################
# Create a namespace for our site
################################################################################

carpenterSite = carpenterSite or {}

carpenterSite.initialEditorContent = '''
  new Marionette.Carpenter.Controller
    columns: [
      {
        attribute: 'username'
      }
      {
        attribute: 'email'
        label: 'Email Address'
      }
      {
        attribute: 'city'
      }
    ]
'''

# Initialize the ACE editor for the table example.
carpenterSite.loadEditor = () ->
  editor = ace.edit 'table-code'
  editor.setTheme 'ace/theme/solarized_dark'
  editor.setFontSize 17
  editor.getSession().setTabSize 2
  editor.getSession().setMode 'ace/mode/coffee'
  editor.getSession().setValue @initialEditorContent

$ ->
  carpenterSite.loadEditor()