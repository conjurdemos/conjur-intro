# Evoke Role Clear Doc Changes

There are two places that I am aware of where we will need to update
documentation:

1. [Evoke Reference](https://docs.cyberark.com/conjur-enterprise/latest/en/Content/Tools/Evoke-command-reference.htm)
2. [Replace the removed Leader](https://docs.cyberark.com/conjur-enterprise/13.1/en/Content/Deployment/HighAvailability/repair-cluster-after-auto-failover.htm#ReplacetheremovedLeader)

# Evoke Reference Changes

We are adding one new command: `evoke role clear`.

## Role

Role related commands for the server.

### Clear

Clear the node's role (e.g. Leader, Standby, Follower). The node will behave
as if it (the container) was started for the first time, in an unconfigured
state.

This command is intended to be run on a Leader in an Automatiic Failover Cluster
has failed over and subsequentloy needs to be recreated into a Standby. After
this command is run, it still needs to be re-seeded and re-joined to the
Automatic Failover Cluster.

See:

1. [Repair Cluster After Auto Failover](https://docs.cyberark.com/conjur-enterprise/13.1/en/Content/Deployment/HighAvailability/repair-cluster-after-auto-failover.htm#ReplacetheremovedLeader).
2. `evoke seed` commands
3. `evoke configure` commands

When clearing a node, a series of pre-condition checks are executed against
this node to ensure that it is safe to clear this node.

> Warning: Do not run this on a healthy Leader node in an Automatic Failover
> Cluster, as this will risk triggering an Automatic Failover event.

> Note: This command performs the same operations on this node that
> `evoke cluster clear`, plus some additional operations.

### Usage

```
evoke role clear [command options]
```
Command description: `Completely clear a nodes role. Any database data or settings will be permanently lost from this node.`

### Options

This command has the following arguments:

| Argument  | Description                                                     |
| --------- | --------------------------------------------------------------- |
| `--yes`   | Skip confirmation prompt on command start.                      |
| `--force` | Force command to continue even with warnings, and skip the confirmation prompt. |
| `--preserve-standby-seed` | Retains relevant configuration files that enable a node to be configured as a Standby, given it was previously a Leader or a Standby. |

# Replace the removed Leader Changes

## Replace the removed Leader

Keep the same.

## Repurpose the removed Leader

> Note to tech writer: the provided command above basically reduces the
> number of steps outlined in this document: [Repair Cluster After Auto Failover](https://docs.cyberark.com/conjur-enterprise/13.1/en/Content/Deployment/HighAvailability/repair-cluster-after-auto-failover.htm#ReplacetheremovedLeader).

1. Keep this step
2. Replace this step with:

    ```
    evoke role clear --preserve-standby-seed
    ```

3. Remove this step. The command above prevents the need for us to remove the
   container and re-create it.
5. Keep this step
6. Replace this step with step 10 (`evoke cluster member add`)
7. Remove this step
8. Remove this step
9. Keep this step
10. This step is moved to step 6
11. Keep this step
12. Keep this step
13. Keep this step

... in essence, the outline should look like this:
