# A small stub containing a few methods from underscore.string.js
# To prevent having to re-include the entire file.
define [], ->

  StringUtils =

    underscored: (str) ->
      str = if str == null then '' else String(str)
      str.trim().replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase()

    capitalize: (str) ->
      str = if str == null then '' else String(str)
      str.charAt(0).toUpperCase() + str.slice(1)

    humanize: (str) ->
      StringUtils.capitalize(StringUtils.underscored(str).replace(/_id$/,'').replace(/_/g, ' '))
