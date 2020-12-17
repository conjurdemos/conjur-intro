# frozen_string_literal: true

at_exit do
  provider(type: ENV['PROVIDER']).teardown
end
