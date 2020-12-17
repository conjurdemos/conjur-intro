# DAP End-to-End Tests

For now, DAP-Intro includes a set of End-to-End tests. These tests are intended to validate common customer workflows. The current set of scenarios can be found [here](../features/cluster.feature).

End-to-End tests are platform agnostic. This means the same set of scenarios are run against a set of supported environments. Docker Compose is the only currently supported environment.

## Running End-to-End Tests

To run the end-to-end test suite:

```
ci/bin/end-to-end-tests
```

## Adding new Release Versions

When a new release candidate is ready to be added, three changes must be made in this repository:

1. Add the version to line 5 of [/ci/bin/end-to-end-tests](../ci/bin/end-to-end-tests)
2. Update `CURRENT_VERSION` on line 6 in [/features/step_definitions/world.rb](../features/step_definitions/world.rb)
3. Add a the previously "Current" version to the `releases` table in [/features/cluster.feature](../features/cluster.feature)

## Development

These end-to-end tests were designed to be run against multiple environments and configurations. Currently, Docker Compose is the available provider. It's intended that cloud providers like AWS, Azure, and GCP are added in the future. We can also support additional runtime environments like Podman.

### Adding a new Environment

In order to implement a new environment, an environment specific provider must be created. This provider must implement the interface defined in [/ci/providers/provider_interface.rb](../ci/providers/provider_interface.rb).  The Provider should handle both component setup (VM/LB provisioning and configuration) as well as inspection. [CI::Providers::DockerCompose](../ci/providers/docker_compose.rb) can be used as an example.

Once the Provider has been completed, it must be added to:

- [/features/step_definitions/world.rb](../features/step_definitions/world.rb) - sets provider for each run
- [/features/support/env.rb](../features/support/env.rb) - handles cleanup after all scenarios have been run
- [/ci/bin/end-to-end-tests](../ci/bin/end-to-end-tests) - list of providers to run tests against
