docker run -v /host/directory:/opt/conjur/backup --name conjur -d --restart=always \
  --security-opt seccomp:./seccomp.json \
  -p "443:443" -p "444:444" -p "636:636" -p "5432:5432" -p "5433:5433" \
  registry.tld/conjur-appliance:4.9.18.0
