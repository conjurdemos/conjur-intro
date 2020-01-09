# Upgrade Validation

This demo provides a mechanism for validating an upgrade from one version of DAP
to another version of DAP. The script performs the following steps:

1. Starts two versions of DAP
1. Configures the old version
1. Loads a policy file with users
1. Performs a upgrade:
    1. Generates a seed file for the new instance
    1. Unpacks the seed on the new instance
    1. Configures the new instance as `upgradable`
    1. Stops the old version
    1. Promotes the new instance

# Upgrade
To perform the upgrade, run following:

```sh
$ bin/upgrade --from <version> --to <version>
```

The script will perform the upgrade described above, then display the upgraded master's logs.  To exit and cleanup, use `ctr-c`.

# Validating a successful upgrade
To validate, log into the upgraded master's UI at: https://localhost using the
username `admin` and the password `secret`.  Verify users are present in the UI.
