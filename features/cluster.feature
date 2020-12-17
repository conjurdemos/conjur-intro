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
    And I configure with <master_key_encryption> master key encryption
    And I configure the master <custom_certificates> custom certificates
    And I deploy two standbys
    And I configured the master and standbys <auto_failover> auto-failover
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

  Examples:
  | master_key_encryption | custom_certificates | auto_failover |
  | no                    | without             | without       |
  | no                    | without             | with          |
  | no                    | with                | without       |
  | no                    | with                | with          |
  | file                  | without             | without       |
  | file                  | without             | with          |
  | file                  | with                | without       |
  | file                  | with                | with          |


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
