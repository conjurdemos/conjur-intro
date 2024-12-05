# Observations From Manual Profiling

## Appliance With Backup - 1MB Policy Input Size - 10 Iterations

The start number of rows in each table is as follows:

```sql
conjur=# select count(*) from credentials ;
 count 
-------
  1074
(1 row)

conjur=# select count(*) from resources;
 count  
--------
 154345
(1 row)

conjur=# select count(*) from secrets ;
 count  
--------
 150003
(1 row)

conjur=# select count(*) from annotations ;
 count  
--------
 300000
(1 row)

conjur=# select count(*) from permissions 
conjur-# ;
 count  
--------
 451247
(1 row)

conjur=# select count(*) from role_memberships ;
 count 
-------
  5093
(1 row)

conjur=# select count(*) from roles;
 count 
-------
  3720
(1 row)
```

Each iteration, approximately `5512` resources are created after the policy is
actually loaded.

```sql
-- before
conjur=# select count(*) from resources;
 count  
--------
 218353
(1 row)

-- after
conjur=# select count(*) from resources;
 count  
--------
 223865
(1 row)
```

Each iteration, approximately `2000` credentials are created after the policy is
actually loaded.

```sql
--before
conjur=# select count(*) from credentials ;
 count 
-------
 15074
(1 row)

--after
conjur=# select count(*) from credentials ;
 count 
-------
 17074
(1 row)
```

As the number of resources in the database increases, so too does the time
it takes to run the dryrun. For the above policy size, it seems to increase by
20 seconds per load (given these are loaded onto unique branches).

If dryrunning on the same branch (and the database does not grow from any other
policy loads), the performance is stable at +/- 1% variation in duration.
