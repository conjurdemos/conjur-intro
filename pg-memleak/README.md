Table of Contents
- [Purpose](#purpose)
- [Goal](#goal)
- [Speculation](#speculation)
  - [Notice](#notice)
- [Prerequisites](#prerequisites)
- [Reproduce with Conjur OSS Dev Environment](#reproduce-with-conjur-oss-dev-environment)
  - [Initialize the Environment](#initialize-the-environment)
  - [Configure the jmeter Template](#configure-the-jmeter-template)
    - [Setting the Admin Password](#setting-the-admin-password)
  - [Starting the jmeter Tests](#starting-the-jmeter-tests)
  - [Monitoring Conjur OSS Dev Environment](#monitoring-conjur-oss-dev-environment)
    - [Resetting Your Environment](#resetting-your-environment)
      - [Stopping jmeter](#stopping-jmeter)
      - [Stopping Conjur](#stopping-conjur)
- [Reproduce with Conjur OSS Helm Chart](#reproduce-with-conjur-oss-helm-chart)
  - [Initialize the Environment](#initialize-the-environment-1)
  - [Configure the jmeter Template](#configure-the-jmeter-template-1)
    - [Setting the Admin Password](#setting-the-admin-password-1)
  - [Starting the jmeter Tests](#starting-the-jmeter-tests-1)
  - [Monitoring Conjur OSS in Kubernetes](#monitoring-conjur-oss-in-kubernetes)
  - [Active Debugging](#active-debugging)
  - [Resetting Your Environment](#resetting-your-environment-1)
    - [Stopping jmeter](#stopping-jmeter-1)
    - [Stopping Conjur OSS](#stopping-conjur-oss)
- [Reproduce with Conjur Enterprise using Conjur Intro](#reproduce-with-conjur-enterprise-using-conjur-intro)
  - [Initialize the Environment](#initialize-the-environment-2)
  - [Monitoring Conjur Enterprise](#monitoring-conjur-enterprise)
    - [Active Debugging](#active-debugging-1)
    - [Resetting Your Environment](#resetting-your-environment-2)
      - [Stopping jmeter](#stopping-jmeter-2)
      - [Stopping the Appliance](#stopping-the-appliance)
- [Recommended Terminal Setup](#recommended-terminal-setup)
- [Postgres Troubleshooting](#postgres-troubleshooting)
  - [Connect to the Database with psql](#connect-to-the-database-with-psql)
  - [Troulbeshooting Steps](#troulbeshooting-steps)
- [YET TO TRY](#yet-to-try)
- [Root Cause Analysis](#root-cause-analysis)
- [Pgbouncer](#pgbouncer)
  - [TRACKING](#tracking)
# Purpose

This document will tell you how to setup the `conjur-intro` to simulate
the alleged postgres memory leak.

# Goal

Determine what is causing what appears to be a postgres memory leak.

# Speculation

At the moment, I am suspecting:

- Connections are not being released or too much RAM is allocated to connections
- See: [Medium - PostgreSQL Out Of Memory](https://italux.medium.com/postgresql-out-of-memory-3fc1105446d#:~:text=The%20most%20common%20cause%20of,writing%20to%20temporary%20disk%20files.)

## Notice

The issue has been reproduced against the following postgres image
(as specified the latest Conjur OSS Helm Chart):

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

This has also been reproduced with the following Appliance versions:

- Appliance image `registry.tld/conjur-appliance:11.5.0`. The version of postgres is `9.4`.
- Appliance image `latest`. The version of postgres is `10.21`.

# Prerequisites

1. Install jmeter

  ```bash
  $ brew install jmeter
  ```

# Reproduce with Conjur OSS Dev Environment

## Initialize the Environment

This utilizes the `cyberark/conjur` repo. Review the root README.md for
these steps below.

1. Clone the repo

    ```bash
    $ git clone https://github.com/cyberark/conjur
    $ cd conjur
    ```

1. (Optional) consider specifying a memory limit for the postgres container,
   as this is the container that appears to have this "memory leak"

    ```yaml
    pg:
      deploy:
        resources:
            limits:
              memory: 3G
      # ...
    ```

3. Start the dev environment


    ```bash
    $ cd dev
    $ ./start

    # start conjur
    root@927b8d7206aa:/src/conjur-server# conjurctl server

    # optionally log the server logs such to a file you can view from your host
    root@927b8d7206aa:/src/conjur-server# conjurctl server | tee /src/conjur-server/conjur-server.log
    ```

4. Obtain admin user credentials

    ```bash
    # get the password from the running conjur container
    # from cli script from conjur/dev directory:
    $ CONJUR_ADMIN_PASSWORD=$(./cli key)
    $ echo -n "admin:$CONJUR_ADMIN_PASSWORD" | base64
    ```

    > WARNING: be sure to include the `-n` switch for `echo` to ensure that a
    > new line is not encoded!

    Copy the base64-encoded password, as we'll need this to configure the jmeter
    template.

## Configure the jmeter Template

We will make two changes to the conjur-oss-k8s jmeter template:

1. The server URL and port

    Since this dev environment is initialized with Docker Compose, the
    url that jmeter needs to use will be http://conjur:3000.

    The following are already hard-coded in the provided
    `conjur-oss/test-plan.jmx`.

   1. The domain name of the  `master` field in the config variable
   2. The port is already hard-coded in each HTTP request controller as: `3000`

2. The admin password

    You need to update this. We will do this in the next section.

### Setting the Admin Password

You must take this base64-encoded value and place it into the jmeter template
under Populate Master DB > Execute Loop > Config Variables > `admin_password`:

```
# example 1
Basic <your base64 encoded value>
```

## Starting the jmeter Tests

> Note: be default the test.sh script assumes it is running against
> conjur-intro / enterprise dev environment!

```bash
# from the pg-memleak/ directory, run:
$ ./test.sh --oss
```

## Monitoring Conjur OSS Dev Environment

When the jmeter tests are running, you should notice memory usage increasing
on the postgres container. Given the jmeter tests should be infinite out-of-box,
we should never the RAM usage go down. You can monitor the resources below:

Before beginning to monitor, we need to install some tools in the postgres 
container (`top`):

```bash
$ docker exec -it dev_pg_1 bash
$ apt-get update
$ apt-get install procps
```

See:
- [Recommended Terminal Setup](#recommended-terminal-setup)
- [Postgres Troubleshooting](#postgres-troubleshooting)

### Resetting Your Environment

#### Stopping jmeter

Kill the docker container:

```bash
$ docker stop jmeter-oss && docker rm jmeter-oss
```

#### Stopping Conjur

Simply stop the `conjur-intro` project:

```bash
# from conjur/dev, run:
$ ./stop
```

> Important: before restarting, you will need to re-fetch the admin password
> and update it in the jmeter template each time!

# Reproduce with Conjur OSS Helm Chart

## Initialize the Environment

```bash
# clone the conjur-oss-helm-chart repository
$ git clone git@github.com:cyberark/conjur-oss-helm-chart.git

# configure .env
export USE_DOCKER_LOCAL_REGISTRY="true"

# run from example
$ cd conjur-oss-helm-chart/examples/kubernetes-in-docker
$ ./start
```

> Note: this helm chart example setup automatically creates a kind image
> registry that is mapped to port `5000` on your docker host. So if you have one
> already, either stop and remove that container.

We will not run jmeter inside of Kubernetes. Once conjur is up and running,
let's make this server accessible from your host:

```bash
# open a port to this service, locally
$ kubectl port-forward service/conjur-oss -n $CONJUR_NAMESPACE 28015:443

# visit this address on your browser to confirm you can access the conjur server
$ https://localhost:28015/
```

## Configure the jmeter Template

We will make two changes to the conjur-oss-k8s jmeter template:

1. The server URL and port
   1. The URL already hard-coded under the `master` config variable
   2. The port is already hard-coded in each HTTP request controller as: `28015`
2. The admin password

### Setting the Admin Password

With conjur up and running, obtain your admin password:

> Note: these variables used below are default to this example environment
> provisioned by the oss helm chart repo.

```bash
# get the master pod name
$ CONJUR_NAMESPACE=conjur-oss
$ CONJUR_ACCOUNT=myConjurAccount
$ MASTER_POD_NAME="$(kubectl get pod -n conjur-oss --selector app=conjur-oss --no-headers | awk '{ print $1 }')"

# print the password 
$ CONJUR_ADMIN_PASSWORD="$(kubectl exec \
        -n "$CONJUR_NAMESPACE" \
        "conjur-oss-5f86ff589f-ndcwm" \
        --container=conjur-oss \
        -- conjurctl role retrieve-key "$CONJUR_ACCOUNT":user:admin | tail -1)"

# convert to base64 -> myConjurAccount:password
$ echo -n "admin:$CONJUR_ADMIN_PASSWORD" | base64
```

> WARNING: be sure to include the `-n` switch for `echo` to ensure that a
> new line is not encoded!

You must take this base64-encoded value and place it into the jmeter template
under Populate Master DB > Execute Loop > Config Variables > `admin_password`:

```
# example 1
Basic <your base64 encoded value>
```

## Starting the jmeter Tests

> Note: because we are port forwarding from a kind cluster, we want to 
> run jmeter from your docker host, as opposed to within a docker container like
> we do when testing against the appliance...

```bash
# from the pg-memleak/tests/conjur-oss-k8s directory
$ jmeter -n -t test-plan.jmx
```

## Monitoring Conjur OSS in Kubernetes

We have to install to the Metrics Server in order to use the `kubetl top`
command.

```bash
# pull the metrics server image and push it into your KinD registry
$ docker pull k8s.gcr.io/metrics-server/metrics-server:v0.6.1
$ docker tag k8s.gcr.io/metrics-server/metrics-server:v0.6.1 localhost:5000/metrics-server/metrics-server:v0.6.1
$ docker push localhost:5000/metrics-server/metrics-server:v0.6.1
# install metrics server
$ kubectl apply -f metrics-server.yaml
# view pod status
$ kubectl get pod -n kube-system | grep metrics-server
# view stats from k8s
$ kubectl top pod conjur-oss-postgres-0 -n conjur-oss
```

```bash
# view stats from the postgres pods
$ kubectl exec -it conjur-oss-postgres-0 -n conjur-oss -- bash
$ apt-get update && apt-get install procps

# monitor processes
$ ps aux

# monitor processes and resource usage
$ top
```

References:

- [GitHub: Metrics Server](https://github.com/kubernetes-sigs/metrics-server#deployment)
- [Enabling Metrics Server for Kubernets on Docker Desktop](https://blog.codewithdan.com/enabling-metrics-server-for-kubernetes-on-docker-desktop/)

## Active Debugging

See:
- [Postgres Troubleshooting](#postgres-troubleshooting)

## Resetting Your Environment

### Stopping jmeter

Kill the process you are running `jmeter` with using `SIGINT` (CTRL+C).

### Stopping Conjur OSS

Since the example scripts provision much of the environment, I rather tear
it all down and start from scratch:

```bash
$ kind delete cluster
$ docker stop kind-registry && docker rm kind-registry
```

# Reproduce with Conjur Enterprise using Conjur Intro

## Initialize the Environment

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

## Monitoring Conjur Enterprise

1. Log into `conjur-intro` at `https://localhost:443`

    I use this to easily see/aggregate the policies that are loaded by `jmeter`.

1. Open the jmeter GUI

    The credentials are hard-coded into conjur-intro, so we should not need
    to tweak the jmeter template.

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

    See [Recommended Terminal Setup](#recommended-terminal-setup).

2. Run the `jmeter` tests

    In another tab, from this directory, use the provided `test.sh` script to
    run the jmeter template:

    > Note: be default the test.sh script assumes it is running against
    > conjur-intro / enterprise dev environment!

    ```bash
    # from the pg-memleak/ directory, run:
    $ ./test.sh
    ```

At this point, you should be able to reload the UI and verify policy is being
added. You can also verify the memory stats to see that they keep climbing. If
you stop the jmeter tests, you'll notice that it doesn't look like the RAM
usage declines until postgres is reset. View more in the [Debugging](#active-debugging)
section.


### Active Debugging

At this point, your server is getting hammered. It's time to see what we can
learn.

See:
- [Recommended Terminal Setup](#recommended-terminal-setup)
- [Postgres Troubleshooting](#postgres-troubleshooting)

### Resetting Your Environment

#### Stopping jmeter

Kill the docker container:

```bash
$ docker stop jmeter-enterprise && docker rm jmeter-enterprise
```

#### Stopping the Appliance

Simply stop the `conjur-intro` project:

```bash
# from the root of the repo
$ ./bin/dap --stop
```

# Recommended Terminal Setup

1. Configure your terminal with the following tabs:

    1. If using kubernetes-based environment, see [Monitoring Conjur OSS in Kubernetes](#monitoring-conjur-oss-in-kubernetes)

    2. If using docker-based dev environments

       1. View docker resource usage
          
         ```bash
         $ docker stats
         ```

       2. Viewing the docker container resources (inside)

         ```bash
         # enterprise
         $ docker exec -it conjur-intro_conjur-master-1.mycompany.local_1 top
         
         # oss
         $ docker exec -it dev_pg_1 top
         ````
    
    3. Viewing the logs logs
       
       1. Appliance
       
        > Note: for the appliance all of our service logs piped through to
        > syslog, which is what is output to stdout when logging our docker
        > containers.

        I prefer viewing this file in `vscode` instead of the terminal.

        ```bash
        $ docker logs conjur-intro_conjur-master-1.mycompany.local_1 -f > appliance.log
        ```

        1. Conjur OSS

        > Note: the dev environment should already log the SQL commands by
        > default in the log output mentioned below.

        The OSS components runs in separate containers (i.e. conjur,
        postgresql). However, when we start the conjur server with
        `conjurctl server` all logs are written to that console. You may
        consider piping that to a file as such:

        ```bash
        # note we are in the container at /src/conjur-server
        root@8980439ba22a:/src/conjur-server# conjurctl server | tee conjur.log
        ```
        
        You can find that file on your docker host, as the root of the conjur
        repo is mounted to `/src/conjur-server` inside the container. So
        check the root of this repo for the `conjur.log` file.

# Postgres Troubleshooting

## Connect to the Database with psql

See the commands below to log into postgres:

If using the Appliance via conjur-intro, `exec` into the container and run:

```bash
$ docker exec -it conjur-intro_conjur-master-1.mycompany.local_1 su conjur
$ psql
```

If using Conjur OSS via the conjur repo dev environment, run the following
from the postgres container:

```
$ docker exec -it dev_pg_1 psql -d postgres -U postgres
```

## Troulbeshooting Steps

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

3. View active connections

    ```sql
    conjur=# select pid as process_id, 
              usename as username, 
              datname as database_name, 
              client_addr as client_address, 
              application_name,
              backend_start,
              state,
              state_change
            from pg_stat_activity;
    ```

1. Use `pgtop`

  For OSS:

  ```bash
  $ apt-get update
  $ apt-get install -y pgtop
  $ su postgres
  $ pg_top
  ```

  Watching this seems to indicate that one process (the same PID) is hogging
  memory (`SIZE` column), and is increasing similarly to the container memory
  usage (`docker stats`). When viewing the connections via `psql` (see above
  command) the `application_name` is: `puma: cluster worker 0: 152 [Conjur API Server]`

  The other process taking up about the same amount as RAM as the previous
  process as an `application_name`: `puma: cluster worker 1: 152 [Conjur API Server]`

  References:
  - https://severalnines.com/database-blog/dynamic-monitoring-postgresql-instances-using-pgtop
  - https://www.systutorials.com/docs/linux/man/1-pg_top/

2. For future reference, perhaps we can debug with `gdb` if running from source

  For OSS:

  Add the following capabilities to the pg service:

  ```yaml
    pg:
      cap_add:
      - ALL
    # ...
  ```

  We want to attach `gdb` to our running postgres process, which requires
  the capability: `SYS_PTRACE`.

  Get the pid of the process by running this command in `psql`:

  ```sql
  SELECT pg_backend_pid();
  ```

  ```bash
  # note: procps installs commands: top, ps
  $ apt-get update && apt-get install -y libc6-dbg gdb valgrind procps
  $ ps | grep pg
  $ su postgres
  $ gdb -p PID_FROM_ABOVE
  # load the symbols
  # TODO: not helpful??
  (gdb) attach PID_FROM_ABOVE
  (gdb) p MemoryContextStats(TopMemoryContext)
  # Couldn't get extended state status: No such process.
  ```

  See debugging steps with gdb:
  - https://wiki.postgresql.org/wiki/Developer_FAQ#Examining_backend_memory_use
  - https://wiki.postgresql.org/wiki/Getting_a_stack_trace_of_a_running_PostgreSQL_backend_on_Linux/BSD
  - https://sourceware.org/gdb/current/onlinedocs/gdb/Symbols.html#index-info-variables-918

2. When the container runs out of memory

   In the appliance, it will start killing processes off
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

   For OSS, the postgres container will just restart.

# YET TO TRY

https://stackoverflow.com/questions/37096186/memory-issues-on-rds-postgresql-instance-rails-4

# Root Cause Analysis

See [my comment ONYX-18692](https://ca-il-jira.il.cyber-ark.com:8443/browse/ONYX-18692?focusedCommentId=622453&page=com.atlassian.jira.plugin.system.issuetabpanels%3Acomment-tabpanel#comment-622453).

# Pgbouncer

These steps are with regards to the conjur dev repo (not conjur-intro).
See the [conjur/pg-bouncer branch](https://github.com/cyberark/conjur/tree/pg-bouncer).

> Note: pgbouncer does not support prepared statements, so this will likely be
> a deal breaker, if adding this to the conjur architecture doesn't already.

1. Create `dev/files/pgbouncer/pgbouncer.ini`

    ```ini
    ################## Auto generated ##################
    [databases]
    postgres = host=pg port=5432 user=postgres

    [pgbouncer]
    listen_addr = 0.0.0.0
    listen_port = 5432
    unix_socket_dir =
    user = postgres
    auth_file = /etc/pgbouncer/userlist.txt
    # Note: this is configured similarly to pg services in docker-compose.yml
    auth_type = trust
    ignore_startup_parameters = extra_float_digits

    # Custom settings
    server_lifetime = 60

    # Log settings
    admin_users = postgres

    # Connection sanity checks, timeouts

    # TLS settings

    # Dangerous timeouts
    ################## end file ##################
    ```


1. Add `pgbouncer` service to docker-compose.yml

  ```yaml
  conjur:
    # ...
    environment:
      DATABASE_URL: postgres://postgres@pgbouncer/postgres
  # ...
  pgbouncer:
    image: edoburu/pgbouncer
    environment:
      DATABASE_URL: postgres://postgres@pg/postgres
      # DB_USER: postgres
      # DB_PASSWORD: postgres
      # DB_HOST: pg
      # DB_NAME: postgres
    ports:
      - 5432:5432
    volumes:
      - ./files/pgbouncer/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro
      - ./files/pgbouncer/userlist.txt:/etc/pgbouncer/userlist.txt:ro
  # ...
  ```

1. Edit `dev/start.sh` and add `pgbouncer` to the `services` variable

    ```bash
    # Minimal set of services.  We add to this list based on cmd line flags.
    services=(pg conjur client pgbouncer)
    ```

2. Create `dev/files/pgbouncer/userlist.txt`

    > Note: this may not be required due to using `auth_method = trust` in
    > pgbouncer.ini. See "Using a Custom Configuration": https://hub.docker.com/r/edoburu/pgbouncer/.

    ```txt
    "postgres" "md53175bce1d3201d16594cebf9d7eb3f9d"
    # or
    "postgres" "postgres"
    ```

5. Configure `auth_type` in pgbouncer.ini to be `trust`, which aligns with our
   postgres config in the `docker-compose.yml` file

The `./start` script should now properly init all of the services, and conjur
should try to connect to , pgbouncer, which should proxy that connection to
pg.

If needed, you can connect to `pg` via `pgbouncer` using `psql` as follows, from
any docker container on the dev network:

```bash
$ psql -h pgbouncer -U postgres -d postgres
```

## TRACKING

`docker logs -f dev_pgbouncer_1` outputs:

2022-06-16 23:00:34.270 UTC [1] LOG S-0x7faf974dd350: postgres/postgres@172.23.0.2:5432 closing because: server lifetime over (age=60s)
2022-06-16 23:00:37.602 UTC [1] LOG S-0x7faf974de070: postgres/postgres@172.23.0.2:5432 closing because: server lifetime over (age=63s)
2022-06-16 23:00:40.936 UTC [1] LOG S-0x7faf974de2a0: postgres/postgres@172.23.0.2:5432 closing because: server lifetime over (age=61s)

Sample Output from pg_top:

  last pid:  2227;  load avg:  0.06,  0.36,  0.50;       up 0+08:54:25                                                                                                                                              23:19:01
  13 processes: 5 other background task(s), 7 idle, 1 active
  CPU states:  0.2% user,  0.0% nice,  0.5% system, 99.3% idle,  0.0% iowait
  Memory: 3625M used, 6341M free, 0K shared, 337M buffers, 1344M cached
  Swap: 0K used, 1024M free, 0K cached, 0K in, 0K out

  PID USERNAME    SIZE   RES STATE   XTIME  QTIME  %CPU LOCKS COMMAND
  2228 postgres    283M   15M active   0:00   0:00   0.0     8 postgres: postgres postgres [local] idle
  957 postgres    373M  123M idle     0:00   0:00   0.0     0 postgres: postgres postgres 172.23.0.3(49632) idle
  1071 postgres    878M  629M idle     0:00   0:00   0.0     0 postgres: postgres postgres 172.23.0.3(49638) idle
    71             282M 6448K          0:00   0:00   0.0     0 postgres: autovacuum launcher process
    73 postgres    282M 4812K          0:00   0:00   0.0     0 postgres: bgworker: logical replication launcher
  123 postgres    284M   17M idle     0:00   0:00   0.2     0 postgres: postgres postgres 172.23.0.3(49610) idle
    68             284M   37M          0:00   0:00   0.0     0 postgres: checkpointer process
    80 postgres    282M   11M idle     0:00   0:00   0.0     0 postgres: postgres postgres 172.23.0.3(49556) idle
    69             282M 7320K          0:00   0:00   0.2     0 postgres: writer process
    79 postgres    283M   15M idle     0:00   0:00   0.0     0 postgres: postgres postgres 172.23.0.3(49552) idle
    70             282M 8664K          0:00   0:00   0.0     0 postgres: wal writer process
  124 postgres    282M 9648K idle     0:00   0:00   0.0     0 postgres: postgres postgres 172.23.0.3(49618) idle
  121 postgres    282M   10M idle     0:00   0:00   0.0     0 postgres: postgres postgres [local] idle

Though it appears that pgbouncer does drop idle conncetions after that time
limit, it isn't dropping the connection (pid) that conjur was using to process
requests from jmeter (1071).

06/16/2022 6:1? PM: PID 1071 @ 878M dev_pg_1 @ 809 MB
06/16/2022 6:15 PM: PID 1071 @ 878M dev_pg_1 @ 796 MB
06/16/2022 6:20 PM: PID 1071 @ 878M dev_pg_1 @ 793.1 MB


--- Restart, add `server_idle_timeout = 60`


06/16/2022 6:29 PM: PID 2556 @ 380M dev_pg_1 @ 230 MB
06/16/2022 6:29 PM: PID 2556 @ 452M dev_pg_1 @ 299 MB
06/16/2022 6:36 PM: PID 2556 @ 452M dev_pg_1 @ 291 MB
