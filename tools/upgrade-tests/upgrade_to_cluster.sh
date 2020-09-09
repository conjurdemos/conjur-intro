#!/bin/bash -e

cd ../..
bin/dap cluster -t 11.4.0

echo "Removing certificate cache...."
rm -rf cli_cache
echo "Done"

bin/dap cluster --enable-auto-failover

echo "Add policies and set secrets..."
cd tools/upgrade-tests
./add_policies.sh
./add_secrets.sh
./get_secrets.sh
echo "Done"

echo "Remove members from AF cluster...."
docker exec dap-intro_conjur-master-1.mycompany.local_1 bin/bash -c "
  evoke cluster member remove conjur-master-2.mycompany.local
  evoke cluster member remove conjur-master-3.mycompany.local
"
echo "Done"

echo "Stop conjur..."
docker exec dap-intro_conjur-master-1.mycompany.local_1 sv stop conjur
echo "Done"

echo "Stop replication on standbys and followers..."
docker exec dap-intro_conjur-master-2.mycompany.local_1 evoke replication stop
docker exec dap-intro_conjur-master-3.mycompany.local_1 evoke replication stop
docker exec dap-intro_conjur-follower-1.mycompany.local_1 evoke replication stop
echo "Done"

echo "Backup DAP....."
docker exec dap-intro_conjur-master-1.mycompany.local_1 evoke backup
echo "Done"

echo "Stop and rename..."
docker stop dap-intro_conjur-master-1.mycompany.local_1
docker rename dap-intro_conjur-master-1.mycompany.local_1 dap-intro_conjur-master-1.mycompany.local_1-backup
echo "Done"

cd ../..
echo "Start new instance.."
export VERSION=5.11.0
docker-compose up -d --no-deps conjur-master-1.mycompany.local
echo "Done"

echo "Unpack.."
docker exec dap-intro_conjur-master-1.mycompany.local_1 sh -c "
  evoke unpack backup --key /opt/conjur/backup/key /opt/conjur/backup/*.tar.xz.gpg
"
echo "Done"

echo "Restore..."
docker exec dap-intro_conjur-master-1.mycompany.local_1 sh -c "
  evoke restore --accept-eula
"
echo "Done"

echo "Removing certificate cache...."
rm -rf cli_cache
echo "Done"

echo "Get secrets...."
cd tools/upgrade-tests
./get_secrets.sh
echo "Done"