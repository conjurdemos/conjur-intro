# frozen_string_literal: true

require 'logger'
require './ci/providers/docker_compose'

CURRENT_VERSION = '12.0.0'

def logger
  @logger ||= begin
    level = ENV['LOG_LEVEL'] || 'INFO'
    log_level = Kernel.const_get("Logger::#{level.upcase}")
    logger = Logger.new(STDOUT)
    logger.level = log_level
    logger
  end
end

def provider(type:)
  @provider_cache ||= {}
  @provider_cache[type] ||= begin
    case type
    when 'docker'
      CI::Providers::DockerCompose.new(logger: logger)
    else
      raise "No Provider available for #{ENV['PROVIDER']}"
    end
  end
end

Before do
  @provider = provider(type: ENV['PROVIDER'])
end

After do
  @provider.reset_environment
end

Given 'skip' do
  skip_this_scenario
end
