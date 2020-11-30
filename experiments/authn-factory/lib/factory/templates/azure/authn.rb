require 'erb'

module Factory
  module Templates
    module Azure
      class Authn
        def initialize()
          @template = 'templates/azure/authn.yml.erb'
        end

        def render
          ERB.new(@template).result(binding)
        end
      end
    end
  end
end
