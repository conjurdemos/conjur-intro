#!/usr/bin/env bash

show_header() {
	echo "=== $1 ==="
}

show_status() {
	echo "  - $1"
}

rm -rf ca
rm -rf output

show_header "Making Directory Structure"

show_status "ca/..."

mkdir -p ca/certs
mkdir -p ca/newcerts
mkdir -p ca/private
mkdir -p ca/crl

chmod 700 ca/private
echo 1000 > ca/serial
touch ca/index.txt

show_status "ca/intermediate/..."

mkdir -p ca/intermediate
mkdir -p ca/intermediate/certs
mkdir -p ca/intermediate/newcerts
mkdir -p ca/intermediate/private
mkdir -p ca/intermediate/crl
mkdir -p ca/intermediate/csr

chmod 700 ca/intermediate/private
touch ca/intermediate/index.txt
echo 1000 > ca/intermediate/serial
echo 1000 > ca/intermediate/crlnumber

mkdir -p output

show_status "Generating CA/Intermediate Certs"
show_header "Checking jordi/openssl"

if [ "$(docker images | grep jordi | wc -l)" -eq "0" ];then
	show_status "Image not found. Pulling..."
	docker pull jordi/openssl
fi

show_status "Generating certificates..."

docker run --rm -v $(pwd)/ca:/ca -v $(pwd)/configs:/configs -v $(pwd)/output:/output -v $(pwd)/scripts:/scripts jordi/openssl bash /scripts/generatecerts.sh
