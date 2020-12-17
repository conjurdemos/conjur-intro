Feature: A DAP cluster is deployed in a variety of configurations

Scenario: I deploy a cluster for a non-production environments
  Given I deploy a DAP master
    And I deploy one follower
    And I load a variable and value
  When I request the variable value through the API
  Then I get the variable value
    And when I check the master audit log, I see the audit event

Scenario: I deploy a cluster for a production environment
  Given I deploy a DAP master with a load balancer
    And I configure the master with custom certificates
    And I deploy two standbys
    And I configured the master and standby as an auto-failover cluster
    And I deploy a follower with a load balancer
    And I load a variable and value
  When I request the variable value through the API
  Then I get the variable value
    And when I check the master audit log, I see the audit event
  When I trigger a failover event
    And I update the variable value
    And I request the variable value through the API
  Then I get the variable value
    And when I check the master audit log, I see the audit event

Scenario Outline: I can upgrade a cluster from one version to another
  Given I deploy a DAP master with version <release>
    And I deploy one follower with version <release>
    And I load a variable and value
  When I upgrade the master to the current version
    And I upgrade the follower to the current version
    And I request the variable value through the API
  Then I get the variable value
    And when I check the master audit log, I see the audit event

  Examples: DAP Releases
    | release |
    | 11.6.0  |
    | 11.7.0  |
