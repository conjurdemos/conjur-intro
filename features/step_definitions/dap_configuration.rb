# frozen_string_literal: true


# Setup tasks
Given('a DAP master is deployed') do
  @provider.provision_master(version: @current_version)
end

Given('one follower is deployed') do
  @provider.provision_follower(version: @current_version)
end

Given('a DAP master is deployed with a load balancer') do
  @provider.provision_master(version: @current_version, with_load_balancer: true)
end

Given('configured with custom certificates') do
  @provider.import_custom_certificates
end

Given('two standbys are deployed') do
  @provider.provision_standbys(version: @current_version)
end

Given('configured as an auto-failover cluster') do
  @provider.enable_autofailover
end

Given('one follower is deployed with a load balancer') do
  @provider.provision_follower(version: @current_version, with_load_balancer: true)
end

When('a failover event is triggered') do
  @provider.trigger_auto_failover
  @provider.wait_for_failover_to_complete
end

Given('a DAP master is deployed with version {int}.{int}.{int}') do |int1, int2, int3|
  @provider.provision_master(version: "#{int1}.#{int2}.#{int3}")
end

Given('one follower is deployed with version {int}.{int}.{int}') do |int1, int2, int3|
  @provider.provision_follower(version: "#{int1}.#{int2}.#{int3}")
end

When('the master is upgraded to the current version') do
  @provider.upgrade_master(version: @current_version)
end

When('the follower is upgraded to the current version') do
  @provider.provision_follower(version: @current_version)
end
