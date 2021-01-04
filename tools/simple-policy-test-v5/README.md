# Simple policy and value setter/getter

Loads a policy into a Conjur instance, sets the value of it, and then runs a watch on its value.

### Usage

To run this script, all you need to do is run the `apply-and-watch` script:
```
$ ./apply-and-watch <MASTER_HOSTNAME> <ACCOUNT> <ADMIN_API_KEY> [<FOLLOWER_HOSTNAME>]
```

Example with both master and follower:
```
$ ./apply-and-watch master.myorg.com demo supersecretapikey follower.myorg.com
```

Example with no follower:
```
$ ./apply-and-watch master.myorg.com demo supersecretapikey
```
