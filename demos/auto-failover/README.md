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
$ docker-compose logs -f conjur-master-2 
```

Once the failover occurs, master is available on port `444` on [localhost](https://localhost:444/ui).
