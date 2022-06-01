Table of Contents
- [Purpose](#purpose)
- [Goal](#goal)
  - [Disclaimer](#disclaimer)
- [Prerequisites](#prerequisites)
- [Workflow](#workflow)
- [Active Debugging](#active-debugging)
- [Speculation](#speculation)
- [Resetting Your Environment](#resetting-your-environment)
  - [Stopping jmeter](#stopping-jmeter)
  - [Stopping the Appliance](#stopping-the-appliance)
# Purpose

This document will tell you how to setup the `conjur-intro` to simulate
the alleged postgres memory leak.

# Goal

Determine what is causing what appears to be a postgres memory leak.

## Disclaimer

These steps are to reproduce what appears to be a memory leak in `conjur-intro`
with Conjur Enterprise. The original ticket came in with the use of
Conjur OSS Helm Charts, which this environment does not use.

The latest release of the [Conjur OSS Helm Chart v2.0.4](https://github.com/cyberark/conjur-oss-helm-chart/releases/)
uses the following postgres image:

```
# values.yaml
postgres:
  image:
    # NOTE: For OpenShift deployments, the default values to use for the
    # postgres image are as follows:
    #
    # repository: registry.redhat.io/rhscl/postgresql-10-rhel7
    # tag: latest
    repository: postgres       # https://hub.docker.com/_/postgres/
    tag: '10.16'
    pullPolicy: Always
```

This has been replicated with:

- Appliance image `registry.tld/conjur-appliance:11.5.0`. The version of postgres is `9.4`.
- Appliance image `latest`. The version of postgres is `10.21`.

# Prerequisites

1. Install jmeter

  ```bash
  $ brew install jmeter
  ```

1. Start conjur-intro

  ```bash
  $ ./bin/dap --provision-master
  ```

  > Note: if you provision Docker with a lot of RAM, consider limiting the
  > RAM on the server by editing the `docker-compose.yml` file in the root.

  ```yml
  # --- snip --- 
  conjur-master-1.mycompany.local:
    image: registry.tld/conjur-appliance:11.5.0
    deploy:
      resources:
          limits:
            memory: 3G
  # --- snip --- 
  ```

1. (Optional) Configure PostgreSQL to log SQL statements

    To connect to the conjur database using psql, you must use the `conjur`
    user, which is authenticated locally via certificate.

    ```bash
    # exec into the container
    $ docker exec -it conjur-intro_conjur-master-1.mycompany.local_1 bash

    # edit config
    $ vi /etc/postgresql/9.4/main/postgresql.conf

    # add this line:
    log_statement = 'all'

    # save and exit
    :wq

    # restart the service
    $ sv restart pg
    ok: run: pg: (pid 1520) 0s
    ```

    You should now be able to see SQL statements logged to syslog, which is
    streamed to `stdout` for the appliance container. The recommended
    way to view the appliance logs is outlined in the [Workflow](#workflow)
    section.

# Workflow

1. Log into `conjur-intro` at `https://localhost:443`

    I use this to easily see/aggregate the policies that are loaded by `jmeter`.

1. Open the jmeter GUI

    Run this from your terminal. Leave this tab open. We use this GUI only
    for editing the file, NOT for running the tests.

    ```bash
    $ jmeter
    ```

    Open the provided [test-plan.jmx](./tests/conjur-oss/test-plan.jmx) file.

    > Note: I have to drag into in from Finder if the "open" file icon or
    > file > open does not work for you. I believe this is due to Java being
    > out of date, but I'm too lazy to update it.

    Here, you can configure variables for the cluster. The provided template
    should work out-of-box. View Execute Loop > Config Variables to view
    global variables that are used throughout the template.

    Currently, this template is configured to:

    1. On an infinite loop:
       1. Log in as admin
       2. Create a "safe" policy
          1. This creates a policy, a group that owns this policy, and
             permissions to create, read, and update this policy
       3. Create a "host" policy
          1. This creates a policy branch, a group to own it, and a host
          2. Creates X "accounts" with Y secrets attached to this policy branch
             1. Populates a value for each of the X secrets

    Note that each group is named uniquely based on the counter variable.
    Also note that you can `enable` or `disable` objects in the object tree
    in `jmeter`. This template originally came with `Account Loops` disabled,
    but I enabled it because I think it makes the memory leakage occur "faster".

1. Configure your terminal with the following tabs:

    1. View docker resource usage
       
      ```bash
      $ docker stats
      ```

    2. Viewing the docker container resources (inside)

      ```bash
      $ docker exec -it conjur-intro_conjur-master-1.mycompany.local_1 top
      ````
    
    3. Viewing the appliance logs

      > Note: all of our service logs piped through to syslog, which is what
      > is output to stdout when logging our docker containers.

      I prefer viewing this file in `vscode` instead of the terminal.

      ```bash
      $ docker logs conjur-intro_conjur-master-1.mycompany.local_1 -f > appliance.log
      ```

2. Run the `jmeter` tests

    In another tab, from this directory, use the provided `test.sh` script to
    run the jmeter template:

    ```bash
    $ ./test.sh
    ```

At this point, you should be able to reload the UI and verify policy is being
added. You can also verify the memory stats to see that they keep climbing. If
you stop the jmeter tests, you'll notice that it doesn't look like the RAM
usage declines until postgres is reset. View more in the [Debugging](#active-debugging)
section.


# Active Debugging

At this point, your server is getting hammered. It's time to see what we can
learn.

1. Know the default postgresql.conf:

  ```conf
  # /etc/postgresql/9.4/main/postgresql.conf

  data_directory = '/var/lib/postgresql/9.4/main'
  datestyle = 'iso, mdy'
  external_pid_file = '/var/run/postgresql/9.4-main.pid'
  hba_file = '/etc/postgresql/9.4/main/pg_hba.conf'
  hot_standby = on
  ident_file = '/etc/postgresql/9.4/main/pg_ident.conf'
  listen_addresses = '0.0.0.0'
  log_destination = 'syslog'
  log_line_prefix = ''
  max_connections = 100
  max_wal_senders = 16
  node.default_text_search_config = 'pg_catalog.english'
  port = 5432
  shared_buffers = 2437498kB
  ssl = on
  ssl_ca_file = '/opt/conjur/etc/ssl/ca.pem'
  ssl_cert_file = '/opt/conjur/etc/ssl/conjur.pem'
  ssl_key_file = '/opt/conjur/etc/ssl/conjur.key'
  unix_socket_directories = '/var/run/postgresql'
  wal_keep_segments = 16
  wal_level = 'hot_standby'
  effective_cache_size = 7312494kB
  work_mem = 97499kB
  maintenance_work_mem = 609374kB
  checkpoint_segments = 64
  checkpoint_completion_target = 0.9
  checkpoint_completion_target = 0.9
  ```

1. Know some tables that may be worth monitoring

  See docs for: [Statistics Collector Tables](https://www.postgresql.org/docs/current/monitoring-stats.html)

2. View `pg_stat_all_tables`

  ```sql
  SELECT * 
  FROM pg_stat_all_tables as t
  --WHERE t.schemaname='public' -- uncomment to view only the conjur tables
  ORDER BY t.n_dead_tup DESC;
  ```

  One of the column of most interesting to many `n_dead_tup`. Typically this
  will pile up, and `AUTO VACUUM` will clean these values up. We suspected this
  to be the issue as per these references linked by Jason:

  - [Lessons from 5 Years of Scaling PostgreSQL](https://onesignal.com/blog/lessons-learned-from-5-years-of-scaling-postgresql/#high-level-overview-of-data)
  - From the above article: [Autovacuum tuning basics](https://www.2ndquadrant.com/en/blog/autovacuum-tuning-basics/)
  - [Memory leak in PL/pgSQL function which CREATE/SELECT/DROP a temporary table](https://www.postgresql.org/message-id/214653D8DF574BFEAA6ED53E545E99E4%40maumau)
  
    > Note: we are not using temp tables according to Jason.

  You can `VACUUM` these manually:

  ```sql
  conjur=# VACUUM (VERBOSE, ANALYZE) policy_versions;
  INFO:  vacuuming "public.policy_versions"
  INFO:  scanned index "policy_versions_pkey" to remove 37 row versions
  ```

  See docs for: [VACUUM](https://www.postgresql.org/docs/13/sql-vacuum.html).

  However, I noticed that this doesn't appear to affect memory usage very much.

3. When the container runs out of memory, it will start killing processes off
   at random. Usually `postgres` is the first to go, which will then restart.
   The memory is usually freed up afterwards. The appliance logs will indicate
   the restart from postgres, which looks something like this:

   ```
   Completed 500 Internal Server Error in 527ms
   Sequel::DatabaseDisconnectError (PG::ConnectionBad: PQconsumeInput() server closed the connection unexpectedly
   probably means the server terminated abnormally
   FATAL:  the database system is in recovery mode
   DETAIL:  The postmaster has commanded this server process to roll back the current transaction and exit, because another server process exited abnormally and possibly corrupted shared memory.
   ```

   Eventually the postgres service back up thanks to `runit`.

# Speculation

At the moment, I am suspecting:

- Connections are not being released or too much RAM is allocated to connections
- See: [Medium - PostgreSQL Out Of Memory](https://italux.medium.com/postgresql-out-of-memory-3fc1105446d#:~:text=The%20most%20common%20cause%20of,writing%20to%20temporary%20disk%20files.)

# Resetting Your Environment

## Stopping jmeter

I kill the docker container:

```bash
$ docker stop jmeter3 && docker rm jmeter3
```

## Stopping the Appliance

Simply stop the `conjur-intro` project:

```bash
# from the root of the repo
$ ./bin/dap --stop
```

This command should remove all volumes, thus the database should be destroyed.
Then restart it as mentioned in the [Workflow](#workflow) section.