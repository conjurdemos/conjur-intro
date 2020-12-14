Feature: A DAP cluster can be deployed

Scenario: A cluster is deployed for non-production environments
  Given a DAP master is deployed
    And one follower is deployed
    And a variable and value are loaded
  When a user requests the variable value
  Then the variable value is returned
    And the audit event is present on the master

Scenario: A cluster is deployed for production environments
  Given a DAP master is deployed with a load balancer
    And configured with custom certificates
    And two standbys are deployed
    And configured as an auto-failover cluster
    And one follower is deployed with a load balancer
    And a variable and value are loaded
  When a user requests the variable value
  Then the variable value is returned
    And the audit event is present on the master
  When a failover event is triggered
    And the variable value is updated
    And a user requests the variable value
  Then the variable value is returned
    And the audit event is present on the master


Scenario: A cluster can be upgraded from one version to another
Scenario Outline: DAP Releases
  Given a DAP master is deployed with version <release>
    And one follower is deployed with version <release>
    And a variable and value are loaded
  When the master is upgraded to the current version
    And the follower is upgraded to the current version
    And a user requests the variable value
  Then the variable value is returned
    And the audit event is present on the master
  Examples: DAP Releases
    | release |
    | 11.6.0  |
    | 11.7.0  |
