require 'rubygems'
require 'cucumber'
require 'cucumber/rake/task'
require 'rspec/expectations'

Cucumber::Rake::Task.new(:features) do |t|
  t.cucumber_opts = "--format pretty" # Any valid command line option can go here.
  include RSpec::Matchers
end
