## Summary
When certificate chains containing more than one upstream certificate are used (i.e. Root CA -> Intermediate CA -> Server Cert), nginx and browsers expect the certificate chain to include everything except the root certificate. However, etcd appears to fail when a certificate chain file is used because it is expecting a single certificate in the file. Also, according to http://nginx.org/en/docs/http/configuring_https_servers.html, the order of the certificates matters in these files as well:

## SSL certificate chains
Some browsers may complain about a certificate signed by a well-known certificate authority, while other browsers may accept the certificate without issues. This occurs because the issuing authority has signed the server certificate using an intermediate certificate that is not present in the certificate base of well-known trusted certificate authorities which is distributed with a particular browser. In this case the authority provides a bundle of chained certificates which should be concatenated to the signed server certificate. The server certificate must appear before the chained certificates in the combined file:
```
$ cat www.example.com.crt bundle.crt > www.example.com.chained.crt
```
The resulting file should be used in the ssl_certificate directive:
```
server {
  listen              443 ssl;     
  server_name         www.example.com;     
  ssl_certificate     www.example.com.chained.crt;     
  ssl_certificate_key www.example.com.key;     
  ...
}
```
If the server certificate and the bundle have been concatenated in the wrong order, nginx will fail to start and will display the error message:
```
SSL_CTX_use_PrivateKey_file(" ... /www.example.com.key") failed    (SSL: error:0B080074:x509 certificate routines:     X509_check_private_key:key values mismatch)
```
because nginx has tried to use the private key with the bundle’s first certificate instead of the server certificate.

Browsers usually store intermediate certificates which they receive and which are signed by trusted authorities, so actively used browsers may already have the required intermediate certificates and may not complain about a certificate sent without a chained bundle. To ensure the server sends the complete certificate chain, the openssl command-line utility may be used, for example:



## Network Configuration
1. Domain: cyberarkdemo.com
2. infra.cyberarkdemo.com = 172.16.10.70 (Primary)
    1. Also hosts 172.16.10.74, 172.16.10.76 for realistic LB configuration
    2. DNS (non-PAS/AD environment)
    3. HAProxy
    4. Certificate Authority
3. cmaster1.cyberarkdemo.com = 172.16.10.71
4. cmaster2.cyberarkdemo.com = 172.16.10.72
5. cmaster3.cyberarkdemo.com = 172.16.10.75
6. conjurmaster.cyberarkdemo.com = 172.16.10.74
    1. Handled by HAProxy on infra.cyberarkdemo.com using tcp passthrough on port 443 and monitoring port 442 for an HTTP 200 OK status on all three conjur hosts to enable load balancing to the active master.
7. conjurfollower.cyberarkdemo.com = 172.16.10.76

## HAProxy Configuration
```
# /root/haproxy/master-lb/haproxy.cfg

global
    log         127.0.0.1 local2 debug
    log         127.0.0.1 local3
    pidfile     /var/run/haproxy.pid
    maxconn     4000
    daemon
defaults
    mode                    http
    log                     global
    option                  tcplog
    option                  dontlognull
    option http-server-close
#    option forwardfor       except 127.0.0.0/8
    option                  redispatch
    retries                 3
    timeout http-request    10s
    timeout queue           1m
    timeout connect         10s
    timeout client          1m
    timeout server          1m
    timeout http-keep-alive 10s
    timeout check           10s
    maxconn                 3000

frontend  conjur_master_frontend
    mode tcp
    bind *:443
    default_backend             conjur_https_backend
frontend conjur_master_pg
    mode tcp
    bind *:5432
    default_backend             conjur_pg_backend
frontend conjur_master_syslog
    mode tcp
    bind *:1999
    default_backend             conjur_syslog_backend

backend conjur_https_backend
    mode tcp
    balance static-rr
    default-server inter 5s fall 3 rise 2
    option httpchk GET /health
    http-check expect status 200
    server cmaster1 cmaster1.cyberarkdemo.com:443 check port 443 check-ssl verify none
    server cmaster2 cmaster2.cyberarkdemo.com:443 check port 443 check-ssl verify none
    server cmaster3 cmaster3.cyberarkdemo.com:443 check port 443 check-ssl verify none

backend conjur_pg_backend
    mode tcp
    balance static-rr
    default-server inter 5s fall 3 rise 2
    option httpchk GET /health
    http-check expect status 200
    server cmaster1 cmaster1.cyberarkdemo.com:5432 check port 443 check-ssl verify none
    server cmaster2 cmaster2.cyberarkdemo.com:5432 check port 443 check-ssl verify none
    server cmaster3 cmaster3.cyberarkdemo.com:5432 check port 443 check-ssl verify none

backend conjur_syslog_backend
    mode tcp
    balance static-rr
    default-server inter 5s fall 3 rise 2
    option httpchk GET /health
    http-check expect status 200
    server cmaster1 cmaster1.cyberarkdemo.com:1999 check port 443 check-ssl verify none
    server cmaster2 cmaster2.cyberarkdemo.com:1999 check port 443 check-ssl verify none
    server cmaster3 cmaster3.cyberarkdemo.com:1999 check port 443 check-ssl verify none
```

Run HAProxy:
```
MASTERNAME=conjurmaster-lb
docker run -d --name $MASTERNAME --restart=always \
  -p "172.16.10.74:443:443" \
  -p "172.16.10.74:5432:5432" \
  -p "172.16.10.74:1999:1999" \
  -v /root/haproxy/master-lb:/usr/local/etc/haproxy:ro haproxy:1.7
```

## Setup Steps and Results
1. Initial Setup Steps
    1. CMASTER1/CMASTER2/CMASTER3:
    ```
    IMAGEID="registry2.itci.conjur.net/conjur-appliance:5.2.0"

		docker run --name conjur -d --restart=always \
		--security-opt seccomp:unconfined \
		-v /opt/conjur/backup:/opt/conjur/backup \
		-p "443:443" -p "636:636" -p "5432:5432" \
		-p "5433:5433" -p "1999:1999" $IMAGEID

		# Update the nginx config for ssl_verify_depth 2
		docker exec -it conjur bash
		sed 's/optional_no_ca;/optional_no_ca;\n ssl_verify_depth 2;/g' /etc/nginx/sites-available/conjur > /etc/nginx/sites-available/conjur_new
		mv /etc/nginx/sites-available/conjur_new /etc/nginx/sites-available/conjur
		exit
    ```

    2. CMASTER1:
    ```
    evoke configure master \
  		-h conjurmaster.cyberarkdemo.com \
  		--master-altnames="conjurmaster.cyberarkdemo.com,cmaster1.cyberarkdemo.com,cmaster2.cyberarkdemo.com,cmaster3.cyberarkdemo.com,localhost" \
  		-p Cyberark1 Conjurlab
    ```

2. Upstream Chain File Scenario - Cluster Reports Healthy, UI is Broken
    1. Configuration
        1. Intermediate CA certificate and then root CA certificate are bundled into ca-chain.cert.pem
        ```
        cat intermediate.cert.pem root.cert.pem > ca-chain.cert.pem
        ```
        2. The server certificate is kept by itself in `server.cert.pem`
        ```
        openssl x509 -noout -text -in server.cert.pem
        ```

    2. Steps to Reproduce
        1. CMASTER1:
        ```
        docker exec -it conjur bash # required to provide passphrase to server certificate key
    		 evoke ca import -r -f /opt/conjur/backup/ca-chain.cert.pem
    		 evoke ca import -k /opt/conjur/backup/server.key.pem \
    		 -s /opt/conjur/backup/server.cert.pem
    		 # Provide passphrase for key
    		 exit

    		# Create management network and connect conjur appliance and CLI5 to it:
    		docker network create management
    		docker network connect management conjur
    		docker run -it--name CLI5 --rm -v ~/v5policy/:/policy --network management conjurinc/cli5

    		# In CLI5 container
    		# For me the conjur appliance is always at 172.18.0.2 and the
    		# CLI is always 172.18.0.3. YMMV, so please change the IPs
    		# below to ensure the conjur appliance is referenced properly
    		echo "172.18.0.3 conjurmaster.cyberarkdemo.com" >> /etc/hosts
    		conjur init -u https://conjurmaster.cyberarkdemo.com/api -a Conjurlab
    		# Accept certificate
    		conjur authn login -u admin # Cyberark1
    		cat << EOF > root.yml
    		---
    		- !policy conjur
    		EOF
    		cat << EOF > cluster.yml
    		- !policy
    		 id: cluster/conjur
    		 body:
    		  - !layer
    		  - &hosts
    		   - !host cmaster1.cyberarkdemo.com
    		   - !host cmaster2.cyberarkdemo.com
    		   - !host cmaster3.cyberarkdemo.com
    		  - !grant
    		   role: !layer
    		   member: *hosts
    		EOF

    		conjur policy load root root.yml
    		conjur policy load conjur cluster.yml
    		exit

    		# HOST (cmaster1)
    		docker exec conjur evoke cluster enroll -n cmaster1.cyberarkdemo.com conjur

    		# At this point, any load balancing relying on
    		# HTTP 200 status breaks so make sure you are testing
    		# health URLs against localhost

    		docker exec conjur evoke seed standby > /opt/conjur/backup/standby-seed.tar

    		scp /opt/conjur/backup/standby-seed.tar root@cmaster2:/opt/conjur/backup/
    		scp /opt/conjur/backup/standby-seed.tar root@cmaster3:/opt/conjur/backup/
        ```

        2. CMASTER2 and then CMASTER3 (in order)
        ```
        docker exec conjur evoke unpack seed /opt/conjur/backup/standby-seed.tar
        		MASTERIP=172.16.10.71 # Replace as necessary
        		docker exec conjur evoke configure standby -i $MASTERIP
        ```

        3. CMASTER1
        ```
        docker exec conjur evoke replication sync
        ```
        4. CMASTER2 and CMASTER3 (in order)
        ```
        CLUSTERID=cmaster2.cyberarkdemo.com # change for cmaster3
        		docker exec conjur evoke cluster enroll -n $CLUSTERID conjur
        ```

    3. Results
        1. The cluster is operational
        ```
        curl -k https://localhost/health
        {
         "services": {
          "possum": "ok",
          "ui-backend": "ok",
          "ui": "ok",
          "ok": true
         },
         "database": {
          "ok": true,
          "connect": {
           "main": "ok"
          },
          "free_space": {
           "main": {
            "kbytes": 11860424,
            "inodes": 13514528
           }
          },
          "replication_status": {
           "pg_stat_replication": [
            {
             "usename": "conjurmaster.cyberarkdemo.com",
             "application_name": "standby",
             "client_addr": "172.16.10.72",
             "backend_start": "2018-09-25 09:06:59 +0000",
             "state": "streaming",
             "sent_location": "0/5000060",
             "replay_location": "0/5000060",
             "sync_priority": 1,
             "sync_state": "sync",
             "sent_location_bytes": 83886176,
             "replay_location_bytes": 83886176,
             "replication_lag_bytes": 0
            },
            {
             "usename": "conjurmaster.cyberarkdemo.com",
             "application_name": "standby",
             "client_addr": "172.16.10.75",
             "backend_start": "2018-09-25 09:07:40 +0000",
             "state": "streaming",
             "sent_location": "0/5000060",
             "replay_location": "0/5000060",
             "sync_priority": 1,
             "sync_state": "potential",
             "sent_location_bytes": 83886176,
             "replay_location_bytes": 83886176,
             "replication_lag_bytes": 0
            }
           ],
           "pg_current_xlog_location": "0/5000060",
           "pg_current_xlog_location_bytes": 83886176
          }
         },
         "cluster": {
          "ok": true,
          "status": "running",
          "message": null
         },
         "ok": true
        }
        ```
        2. UI Fails
        ```
        curl -I --cacert ./output/root.cert.pem https://cmaster1.cyberarkdemo.com/ui/login/new

        HTTP/1.1 500 Internal Server Error
        Server: nginx
        Date: Tue, 25 Sep 2018 09:28:54 GMT
        Content-Type: text/html; charset=UTF-8
        Content-Length: 1477
        Connection: keep-alive
        X-Request-Id: 66a9eb4a-fe85-4a44-b720-9356af11d1e2
        Strict-Transport-Security: max-age=15552000

        cmaster1:conjur:/var/log/syslog

        2018-09-25T08:55:03.314+00:00 3dc567cd2f97 syslog-ng[33]: syslog-ng starting up; version='3.5.3'
        2018-09-25T08:55:36.000+00:00 3dc567cd2f97 conjur-possum: [1458] Puma starting in cluster mode...
        2018-09-25T08:55:36.000+00:00 3dc567cd2f97 conjur-possum: [1458] * Version 3.12.0 (ruby 2.5.1-p57), codename: Llamas in Pajamas
        2018-09-25T08:55:36.000+00:00 3dc567cd2f97 conjur-possum: [1458] * Min threads: 0, max threads: 16
        2018-09-25T08:55:36.000+00:00 3dc567cd2f97 conjur-possum: [1458] * Environment: appliance
        2018-09-25T08:55:36.000+00:00 3dc567cd2f97 conjur-possum: [1458] * Process workers: 2
        2018-09-25T08:55:36.000+00:00 3dc567cd2f97 conjur-possum: [1458] * Preloading application
        2018-09-25T08:55:38.000+00:00 3dc567cd2f97 conjur-ui: CREATE SCHEMA
        2018-09-25T08:55:38.000+00:00 3dc567cd2f97 conjur-ui: CREATE TABLE
        2018-09-25T08:55:38.000+00:00 3dc567cd2f97 conjur-ui: CREATE ROLE
        2018-09-25T08:55:38.000+00:00 3dc567cd2f97 conjur-ui: GRANT
        2018-09-25T08:55:38.000+00:00 3dc567cd2f97 conjur-ui: GRANT
        2018-09-25T08:55:38.000+00:00 3dc567cd2f97 conjur-ui: ok: run: conjur/ui-backend: (pid 1710) 0s
        2018-09-25T08:55:38.000+00:00 3dc567cd2f97 conjur-ui: Joined session keyring: 232626634
        2018-09-25T08:55:39.000+00:00 3dc567cd2f97 conjur-ui: `/opt/conjur/ui` is not writable.
        2018-09-25T08:55:39.000+00:00 3dc567cd2f97 conjur-ui: Bundler will use `/tmp/bundler/home/unknown' as your home directory temporarily.
        2018-09-25T08:55:39.000+00:00 3dc567cd2f97 conjur-ui: [1463] Puma starting in cluster mode...
        2018-09-25T08:55:39.000+00:00 3dc567cd2f97 conjur-ui: [1463] * Version 3.11.4 (ruby 2.5.1-p57), codename: Love Song
        2018-09-25T08:55:39.000+00:00 3dc567cd2f97 conjur-ui: [1463] * Min threads: 5, max threads: 5
        2018-09-25T08:55:39.000+00:00 3dc567cd2f97 conjur-ui: [1463] * Environment: appliance
        2018-09-25T08:55:39.000+00:00 3dc567cd2f97 conjur-ui: [1463] * Process workers: 2
        2018-09-25T08:55:39.000+00:00 3dc567cd2f97 conjur-ui: [1463] * Preloading application
        "syslog-cachain.log" 3173L, 619167C  1,1      Top
        2018-09-25T09:28:31.000+00:00 3dc567cd2f97 conjur-ui: 172.16.10.70 - - [25/Sep/2018:09:28:31 +0000] "GET /ui HTTP/1.0" 302 - 0.0015
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 evoke-info: 127.0.0.1 - - [25/Sep/2018:09:25:16 +0000] "GET / HTTP/1.1" 200 1930 0.0526
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: ActionView::Template::Error (no implicit conversion of nil into String):
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:   3:   %span.logo
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:   4:  .box.box-primary
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:   5:   .box-header.with-border
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:   6:    %div.pull-right= appliance_version
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:   7:    %h3.box-title Sign in
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:   8:   .box-body
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:   9:    %p.help-block
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui:
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: app/models/cluster_status.rb:140:in `remote_health'
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: app/models/cluster_status.rb:39:in `block in nodes'
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: app/models/cluster_status.rb:38:in `map'
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: app/models/cluster_status.rb:38:in `nodes'
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: app/models/cluster_status.rb:15:in `health'
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: app/controllers/login_controller.rb:29:in `appliance_version'
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: app/views/login/new.html.haml:6:in `_app_views_login_new_html_haml___2821307098956610512_31863400'
        2018-09-25T09:28:38.000+00:00 3dc567cd2f97 conjur-ui: app/controllers/application_controller.rb:82:in `expose_conjur_api'
        ```

    4. Downstream Chain File
    NOTE: This should be the proper configuration for nginx, but cluster connectivity fails for some reason.
        1. Configuration
            1. The Root CA certificate is written to root.cert.pem
            2. The server certificate is writen to server.cert.pem and then the intermediate CA certificate is appended to server.cert.pem
        2. Steps to Reproduce
            1. Same as above scenario
        3. Results
            1. The auto-failover cluster never starts
            ```
            {
             "services": {
              "possum": "ok",
              "ui-backend": "ok",
              "ui": "ok",
              "ok": true
             },
             "database": {
              "ok": true,
              "connect": {
               "main": "ok"
              },
              "free_space": {
               "main": {
                "kbytes": 11753728,
                "inodes": 13514531
               }
              },
              "replication_status": {
               "pg_stat_replication": [
                {
                 "usename": "conjurmaster.cyberarkdemo.com",
                 "application_name": "standby",
                 "client_addr": "172.16.10.72",
                 "backend_start": "2018-09-25 08:47:44 +0000",
                 "state": "streaming",
                 "sent_location": "0/7000060",
                 "replay_location": "0/7000000",
                 "sync_priority": 1,
                 "sync_state": "sync",
                 "sent_location_bytes": 117440608,
                 "replay_location_bytes": 117440512,
                 "replication_lag_bytes": 96
                },
                {
                 "usename": "conjurmaster.cyberarkdemo.com",
                 "application_name": "standby",
                 "client_addr": "172.16.10.75",
                 "backend_start": "2018-09-25 08:04:35 +0000",
                 "state": "streaming",
                 "sent_location": "0/7000060",
                 "replay_location": "0/7000000",
                 "sync_priority": 1,
                 "sync_state": "potential",
                 "sent_location_bytes": 117440608,
                 "replay_location_bytes": 117440512,
                 "replication_lag_bytes": 96
                }
               ],
               "pg_current_xlog_location": "0/7000060",
               "pg_current_xlog_location_bytes": 117440608
              }
             },
             "cluster": {
              "ok": false,
              "status": "starting",
              "message": null
             },
             "ok": false
            }
            ```
    5. Downstream Chain Incorrect Order
        1. NOTE: Attempting to chain the certificate in the reverse order (intermediate followed by server) results in an error when running "evoke ca import -k server.key.pem -s server.cert.epm) because the key file does not match the first certificate in the chain. This is an invalid configuration anyway and thus is not documented further here.
