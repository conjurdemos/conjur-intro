# Auto-failover Demo

This script configures a Conjur Auto-Failover cluster. To run this demo, you'll need the following installed:

- Docker
- Conjur Appliance Image
- Bash

To stand up a cluster, run:
```
$ ./start
```

The master is available on port `443` on [localhost](https://localhost/ui)

To force auto-failover to occur, simply stop the Conjur master:
```
$ docker-compose exec conjur-master-1 sv stop conjur
```

Then view progress with:
```
$ docker-compose logs -f
```
Look for the standby which has `entering state promote` in it's log file. That will be the new master.

Once the failover occurs, it will be available as:
- if `conjur-master-2`, on port `444` on [localhost](https://localhost:444/ui)
- if `conjur-master-3`, on port `445` on [localhost](https://localhost:445/ui)
- if `conjur-master-4`, on port `446` on [localhost](https://localhost:446/ui)
