define [], ->

    TemplatePathHelpers =
      lookups: [""]

      # Generate the full path to a template file.
      #
      # @example Setting a view's template
      #   class Show.Info extends App.Views.ItemView
      #     template: @::templatePath('reports/show/show_info')
      #
      # @param template [String] the shorthand path to the template file
      templatePath: (template) ->
        return if template is false

        for path in [template, @withTemplate(template)]
          for lookup in @lookups
            return JST[lookup + path] if JST[lookup + path]

      # Insert /templates/ in the next to last position in the path. This allows us
      # to omit the word 'templates' from the template path, but still store the
      # templates in a directory outside of the view.
      #
      # @example
      #   withTemplate('users/list/layout') => 'users/list/templates/layout'
      #
      # @param path [String] the path to the template
      #
      # @return [String] the path with /templates/ inserted
      withTemplate: (path) ->
        array = path.split("/")
        array.splice(-1, 0, "templates")
        array.join("/")

      # Select the text within any element.
      # from http://stackoverflow.com/questions/985272/jquery-selecting-text-in-an-element-akin-to-highlighting-with-your-mouse
      #
      # @param element [HTMLElement] the element containing the text to be selected.
      #
      # @return [void]
      selectText: (element) ->
        if document.body.createTextRange
          range = document.body.createTextRange()
          range.moveToElementText element
          range.select()
        else if window.getSelection #all others
          selection = window.getSelection()
          range = document.createRange()
          range.selectNodeContents element
          selection.removeAllRanges()
          selection.addRange(range)

    _.extend Marionette.ItemView::,
      TemplatePathHelpers

    _.extend Marionette.CollectionView::,
      TemplatePathHelpers

    _.extend Marionette.View::,
      # Helper methods to be used within views.
      templateHelpers: ->


    _.extend Marionette.Renderer,
      #So we can pass in an empty template
      render: (template,data) ->
        return if template is false

        templateFunc
        if (typeof template == "function")
          templateFunc = template
        else
          templateFunc = Marionette.TemplateCache.get(template)


        templateFunc(data)


