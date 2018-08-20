# Mutual TLS with Conjur

This example demostrates using Conjur as certificate authority to configure
two hosts with machine identity in Conjur with X.509 certificates issued
by a Conjur CA for mutual TLS authentication.

The first host will be an nginx web service. The second host is a cURL web
client.

### Prerequisites

1. docker
2. docker-compose

### Getting Started

1. Start the environment
    ```sh-session
    ./0_start
    ```

2. Load the policy configuring the CA and 2 host identities
    ```sh-session
    ./1_load_policy
    ```

3. Create the root and intermediate CA certificates, and load the intermediate
  CA certificate and key into Conjur
    ```sh-session
    ./2_create_ca
    ```

4. Log the web server host into Conjur and request a host certificate from the
  Conjur CA
    ```sh-session
    ./3_create_host_cert
    ```

5. Log the web client into Conjur and request a client certificate from tbe
  Conjur CA
    ```sh-session
    ./4_create_client_cert
    ```

6. Establish a connection between the client and host with mutual TLS using
  the issued certificates
    ```sh-session
    ./5_connect
    ```

7. Clean up the example environment
    ```sh-session
    ./6_stop
    ```
