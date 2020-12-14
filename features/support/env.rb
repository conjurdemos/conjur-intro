# frozen_string_literal: true

require './ci/providers/docker_compose'

at_exit do
  case ENV['PROVIDER']
  when 'docker'
    provider = CI::Providers::DockerCompose.new
  else
    raise "No Provider available for #{ENV['PROVIDER']}"
  end
  provider.teardown
end
