#!/usr/bin/env bash

certificate_password="Cyberark1"

#### Root Certificate ####

# Root Certificate Key
openssl genrsa -aes256 -passout pass:$certificate_password -out /ca/private/ca.key.pem 4096
chmod 400 /ca/private/ca.key.pem

# Root Certificate
openssl req -config /configs/0001_ca.openssl.cnf \
  -passout pass:$certificate_password \
  -passin pass:$certificate_password \
  -subj "/C=US/ST=Texas/L=Houston/O=CADemos/OU=CADemos Certificate Authority/CN=CADemos Root CA/CN=CADemos Root CA" \
  -key /ca/private/ca.key.pem \
  -new -x509 -days 7300 -sha256 -extensions v3_ca \
  -out /ca/certs/ca.cert.pem

#### Intermediate Certificate ####

# Intermediate Certificate Key
openssl genrsa -aes256 -passout pass:$certificate_password -out /ca/intermediate/private/intermediate.key.pem 4096
chmod 400 /ca/intermediate/private/intermediate.key.pem

# Intermediate CSR
openssl req \
  -config /configs/0002_intermediate.openssl.cnf \
  -passin pass:$certificate_password \
  -subj "/C=US/ST=Texas/L=Houston/O=CADemos/OU=CADemos Certificate Authority/CN=CADemos Root CA/CN=CADemos Intermediate CA" \
  -key /ca/intermediate/private/intermediate.key.pem \
  -new -sha256 -out /ca/intermediate/csr/intermediate.csr.pem

# Intermediate Signed Certificate
openssl ca -batch -config /configs/0001_ca.openssl.cnf -extensions v3_intermediate_ca \
  -passin pass:$certificate_password \
  -days 3650 -notext -md sha256 \
  -in /ca/intermediate/csr/intermediate.csr.pem \
  -out /ca/intermediate/certs/intermediate.cert.pem

chmod 444 /ca/intermediate/certs/intermediate.cert.pem

# CA certificate chain file

cat /ca/intermediate/certs/intermediate.cert.pem \
    /ca/certs/ca.cert.pem > /ca/intermediate/certs/ca-chain.cert.pem
cp /ca/intermediate/certs/ca-chain.cert.pem /output/

#### Server Certificate ####

# Master/Standby Certificate Key
openssl genrsa -aes256 \
  -passout pass:$certificate_password \
  -out /output/conjurmaster.conjurlab.local.key.pem 2048

# Master/Standby Certificate CSR
openssl req \
  -config /configs/0003_masterreq.openssl.cnf \
  -passin pass:$certificate_password \
  -key /output/conjurmaster.conjurlab.local.key.pem \
  -new -sha256 -nodes \
  -out /ca/intermediate/csr/conjurmaster.conjurlab.local.csr.pem

# Master/Standby Certificate - Signed by Intermediate CA
openssl ca -batch \
  -config /configs/0004_int_sign_master.openssl.cnf \
  -passin pass:$certificate_password \
  -extensions server_cert -days 375 -notext -md sha256 \
  -in /ca/intermediate/csr/conjurmaster.conjurlab.local.csr.pem \
  -out /ca/intermediate/certs/conjurmaster.conjurlab.local.cert.pem

cp /ca/intermediate/certs/conjurmaster.conjurlab.local.cert.pem /output/

#### Follower Certificate ####

# Follower Certificate Key
openssl genrsa -aes256 \
  -passout pass:$certificate_password \
  -out /output/conjurfollower.conjurlab.local.key.pem 2048

# Follower Certificate CSR
openssl req \
  -config /configs/0005_followerreq.openssl.cnf \
  -passin pass:$certificate_password \
  -key /output/conjurfollower.conjurlab.local.key.pem \
  -new -sha256 -nodes \
  -out /ca/intermediate/csr/conjurfollower.conjurlab.local.csr.pem

# Follower Certificate - Signed by Intermediate CA
openssl ca -batch \
  -config /configs/0006_int_sign_follower.openssl.cnf \
  -passin pass:$certificate_password \
  -extensions server_cert -days 375 -notext -md sha256 \
  -in /ca/intermediate/csr/conjurfollower.conjurlab.local.csr.pem \
  -out /ca/intermediate/certs/conjurfollower.conjurlab.local.cert.pem

cp /ca/intermediate/certs/conjurfollower.conjurlab.local.cert.pem /output/

#### Create Certificates Tar File
# cd /output
# tar -zcf certs.tar.gz *
