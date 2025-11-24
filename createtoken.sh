echo $(echo -n $(curl --cacert conjur.pem --data your_api_here https://master.conjur/api/authn/users/host%2Fhostname/authenticate) | base64 | tr -d '\r\n')
