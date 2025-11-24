# frozen_string_literal: true


# Setup tasks
Given('I deploy a DAP master') do
  @provider.provision_master(version: CURRENT_VERSION)
end

Given('I deploy one follower') do
  @provider.provision_follower(version: CURRENT_VERSION)
end

Given('I deploy a DAP master with a load balancer') do
  @provider.provision_master(version: CURRENT_VERSION, with_load_balancer: true)
end

Given('I configure the master with custom certificates') do
  @provider.import_custom_certificates
end

Given('I deploy two standbys') do
  @provider.provision_standbys(version: CURRENT_VERSION)
end

Given('I configured the master and standby as an auto-failover cluster') do
  @provider.enable_autofailover
end

Given('I deploy a follower with a load balancer') do
  @provider.provision_follower(
    version: CURRENT_VERSION,
    with_load_balancer: true
  )
end

When('I trigger a failover event') do
  @provider.trigger_auto_failover
  @provider.wait_for_healthy_master
end

Given('I deploy a DAP master with version {int}.{int}.{int}') do |int1, int2, int3|
  @provider.provision_master(version: "#{int1}.#{int2}.#{int3}")
end

Given('I deploy one follower with version {int}.{int}.{int}') do |int1, int2, int3|
  @provider.provision_follower(version: "#{int1}.#{int2}.#{int3}")
end

When('I upgrade the master to the current version') do
  @provider.upgrade_master(version: CURRENT_VERSION)
end

When('I upgrade the follower to the current version') do
  @provider.provision_follower(version: CURRENT_VERSION)
end

# Given('configured with {word} master key encryption') do |mke|
#   pending # Write code here that turns the phrase above into concrete actions
# end
