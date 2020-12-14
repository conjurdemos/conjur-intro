# frozen_string_literal: true

Before do
  @current_version = '5.12.4'
  case ENV['PROVIDER']
  when 'docker'
    @provider = CI::Providers::DockerCompose.new
  else
    raise "No Provider available for #{ENV['PROVIDER']}"
  end
end

After do
  @provider.reset_environment
end

Given 'skip' do
  skip_this_scenario
end
