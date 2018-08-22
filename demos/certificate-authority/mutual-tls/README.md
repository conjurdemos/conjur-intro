# Mutual TLS with Conjur

This example demonstrates using Conjur as certificate authority (CA) to configure
two hosts with X.509 certificates for mutual TLS authentication. The hosts
used for this example are an nginx web server and a cUrl web client.

The Conjur CA is configured in policy and uses an intermediate CA certificate
and private key created using OpenSSL and stored in Conjur variables.

With the CA configured, each host is able to authenticate to Conjur using
its own identity, and  submit an X.509 certificate signing request (CSR)
to the CA to have it signed using the intermediate CA private key.

With the host certificates issues, each host is able to authenticate to the
other using mutual TLS.

### Prerequisites

1. docker
2. docker-compose

### Getting Started

1. Start the environment to pull and start the container images
    ```sh-session
    $ ./0_start
    Pulling latest images...
    Starting Conjur...
    Waiting for Conjur to be ready...
    ....... Conjur is ready!
    Created new account account 'cucumber'
    ------------------------------
    Admin secret is: 32s6txpth3nc7ejkded2t8mexe209ccq3newxgs60emq5vk5dkb
    ------------------------------
    ```

2. Load the policy to configure the CA, host identities, and privileges
    ```sh-session
    $ ./1_load_policy
    Wrote configuration to /root/.conjurrc
    Please enter admin's password (it will not be echoed): # use password from prior command
    Logged in
    Loaded policy 'root'
    -------------------------------------------
    Server password: 2tm5age3akt70w14aqz4z1p9mvn61qzeybm2x9w8gc22ev8nq36g4xmm
    Client password: 1s8b2pf1g5as48836jgsxjftpb2rzbdh80f3gse8vz8n30ne0qv
    -------------------------------------------
    ```

3. Create the root and intermediate CA certificates, and load the intermediate
  CA certificate and key into Conjur
    ```sh-session
    $ ./2_create_ca
    Store the intermediate CA private key in Conjur...
    Store the intermediate certificate chain in Conjur...
    ```

4. Log the web server host into Conjur and request a host certificate from the
  Conjur CA
    ```sh-session
    $ ./3_create_server_cert
    Password for mutual-tls/server: # server password from above
    -----BEGIN CERTIFICATE-----
    MIIEWzCCAkOgAwIBAgIUB71ZMj8EcCOt9xtEIINh3mEvsiEwDQYJKoZIhvcNAQEL
    BQAwUjELMAkGA1UEBhMCVVMxCjAIBgNVBAgMAS4xCjAIBgNVBAcMAS4xCjAIBgNV
    BAoMAS4xHzAdBgNVBAMMFkNvbmp1ciBJbnRlcm1lZGlhdGUgQ0EwHhcNMTgwODIy
    MTkxNzA2WhcNMTgwODIzMTkxNzA2WjBCMQswCQYDVQQGEwJVUzEKMAgGA1UECAwB
    LjEKMAgGA1UEBwwBLjEKMAgGA1UECgwBLjEPMA0GA1UEAwwGc2VydmVyMIIBIjAN
    BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAny/4YqlgwhVZSjOX2Nj+SV32i30c
    Wu5+MmrREJhIMTJgkdwEpS9nXyheDSAGsO0DI105HQ8uRiNVkFYgZ/i02wbZ09SW
    imtVbj73NjyeEUFNPKn9zwDOy4wwXbPjOWWlHUsxVNclzYD7RnhNht37iZvbTEyG
    NPvf90w76vdJyuxxQo01jZ9oe1b4SLrzMXEIShX/V25aJeIC54upiuqOAeC+QwV4
    Tb7tNWcJyWIwSaM7Q87t5s0IGbd4zlrRTBxyHRmqazBbdndnOyPQkz9P4sb2IHey
    vcKiGCZYI8CzpWm6S/29xBkq39/RoE5DUmWuVQi9YQGfJT17BnHgE5RUcQIDAQAB
    ozkwNzAJBgNVHRMEAjAAMAsGA1UdDwQEAwIEsDAdBgNVHQ4EFgQUsx4h40TWHyMK
    qGE584dtidlxk2EwDQYJKoZIhvcNAQELBQADggIBAHHoyXzMybjt3miV7JM2qVEA
    wXeB/C6Wo505N2oPYUn+b+iobbWmv1YQ6mXUpZInMDSZBEs0lXMExn3VHRWFrYVt
    Vwp7rRCdqwXSV1ltOHo3yy0AhY7HQj2i5NUVM2ewLtNRqx8Yq8MW+C0gHpoV/c2h
    3nGxgOxKzjGjd8xYc7TNnVAuZ7kLxp2EtoAIGVnPbW+afJCNAcSdAWBiKfJL1+Va
    gEc3Ot8WGECGBGD4qUO12woGmTNqexEirr4JnKBmh/ug+1sH5nukiUnFFINBpxrN
    4h7CLsGDMEXcCzqUDJgqNtWGnMHbrRA8Mj0t5xj//Sbs7iodSuu0TMNy/9spRyfd
    R51QuA91Hw5iZiVj0qWVPmoGyjb5UpCoT261qf3tG9+FqxfzW8oltHOH2ev4nnqC
    3ohuLBB/yfutK17mr8LBPMc+uELaTHMDWAPDO0hY+zFANM47ALrvG9NIAkKhQh9w
    eHMTwtbSNlOgPvE8FTixpcDwN61lanvyCtXyZ4ET4JwVFXZqN8VtDs9RG9z0api6
    fG1jLsSEyha8Cec6bYLhLZ9MCwo3nkopT6qABQYfvxRaqE/A3Nt+owsbtMayxtyf
    ClbyVY3fTk+bpZBNpcRstjLS3B4S+ezV2OB0yBk8qVU95jnNXdp8QCQacb2Yqip0
    GgK4G/A2QD2QX5/JJDKw
    -----END CERTIFICATE-----
    ```

5. Log the web client into Conjur and request a client certificate from tbe
  Conjur CA
    ```sh-session
    $ ./4_create_client_cert
    Password for mutual-tls/client: # client password from above
    {
    "certificate": "-----BEGIN CERTIFICATE-----\nMIIEWzCCAkOgAwIBAgIURYI21GXLvdTyeky0S0n5UsBqyzcwDQYJKoZIhvcNAQEL\nBQAwUjELMAkGA1UEBhMCVVMxCjAIBgNVBAgMAS4xCjAIBgNVBAcMAS4xCjAIBgNV\nBAoMAS4xHzAdBgNVBAMMFkNvbmp1ciBJbnRlcm1lZGlhdGUgQ0EwHhcNMTgwODIy\nMTkxNzQ3WhcNMTgwODIzMTkxNzQ3WjBCMQswCQYDVQQGEwJVUzEKMAgGA1UECAwB\nLjEKMAgGA1UEBwwBLjEKMAgGA1UECgwBLjEPMA0GA1UEAwwGY2xpZW50MIIBIjAN\nBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3RD53ArA+/Xp01JudfFrPJL8aJA0\ni/Q+tyVcz6AuQ8YGBKTvX1bR5hajAKJj8Ceh/eBgcqKBPVkAxHRD4KU1zoWNxTzo\nX2bWtAWF3/n4En2eWKsVmUa+rcGbvsNtvumGC4COBFcSakfoz3lC2l6R3r/k/XmY\nIgCkGTJQ4UEYdXKIh28TBevegCd1sjOzY4Hm9VM5wX7I6uMbhNQjD+sqDaywWrdL\neM65efXgxe9wcco52zjdEnP1OESF/Yvt2PHmjRCnkrUHZsSDCa324ZWsVbk7vyqm\nc6mGh7EsKiPrqJM16FyyWjo3CsqJbMTj7FjT2JFk4DGurgG7qm0Z6/ifMQIDAQAB\nozkwNzAJBgNVHRMEAjAAMAsGA1UdDwQEAwIEsDAdBgNVHQ4EFgQU/vRh/m1mk3Zj\n/dWZx4vxbCrDW+YwDQYJKoZIhvcNAQELBQADggIBALBbB+TFNpaXpXrYqEPrXIaO\nLqo+RHFRHD6GcKivvYi8P2M2S4dTEWw2JVwLtn/KWsBWBfpDWuMmd/LddIm/VcU0\nOpSsJK8HfVABEMMuEJPV3zZi2esb/zkDa3l+j2mj+AOIdmaKZYE5ig8JUN9jE7wq\nzv6GSfNWEoEzYsdqB+DMymO61viwh334hCejA9St1F5uxqb8dszCqevZbpCJR78G\n5zuqXmJRHlL08tK+hsICQakEqZbvYG8BkcjVkmSyMCAnTcsiqcvYZZlicpyY6akf\nQndbU3ASXjC2+XCrL2QAX8NyPPDgci7cLJKCeKh0MRCDoE+9iCp3xPF24fSW+xPR\nUGySBHSA5bHBCocOoO6aTZvt6yKzDWsTCzPSWcP4CKfx5odsF44CI30Qxq5eJzdO\nF07BQ8FNGlVC6nIn53LXDBytZjtGFzCJ6rEc3f19BtKojZlS42+6ZRR2r9gQ/3rR\ncDeG+5sYB9+Kqz/hZZpdbZzFD6SIJttAlwdvrUQVCmCmNdGaKdnV7nHxLrtQb7Mu\nyCIDVstROyxukDi2w//NeH8a3XOaKeg6SwLqO4KsgltKvqygwI1+HVn21DaqS1+o\n45WVDQekW2cUaX+R57sLXfoaQBkP6EK48mvA1zoWY4MNDcS1UTRVtvZaxhyId9hj\nKfNGS61ysUORIt87m7AR\n-----END CERTIFICATE-----\n"
    }
    ```

6. Establish a connection between the client and host with mutual TLS using
  the issued certificates
    ```sh-session
    # Connection with no certificate chain to validate server and no client certificate
    $ ./5_connect
    Starting server...
    Connecting client (Certificate Chain=false, Client Certificate=false)...
    curl: (60) SSL certificate problem: unable to get local issuer certificate
    More details here: https://curl.haxx.se/docs/sslcerts.html

    curl failed to verify the legitimacy of the server and therefore could not
    establish a secure connection to it. To learn more about this situation and
    how to fix it, please visit the web page mentioned above.


    # Connection with server certificate chain but no client certificate
    $ ./5_connect --ca-chain
    Starting server...
    Connecting client (Certificate Chain=true, Client Certificate=false)...
    <html>
    <head><title>400 No required SSL certificate was sent</title></head>
    <body bgcolor="white">
    <center><h1>400 Bad Request</h1></center>
    <center>No required SSL certificate was sent</center>
    <hr><center>nginx/1.15.2</center>
    </body>
    </html>


    # Connection with server certificate chain and client certificate
    $ ./5_connect --ca-chain --client-cert
    Starting server...
    Connecting client (Certificate Chain=true, Client Certificate=true)...
    <h1>Hello, from a Conjur secured host!</h1>
    ```

7. Clean up the example environment
    ```sh-session
    ./6_stop
    ```
