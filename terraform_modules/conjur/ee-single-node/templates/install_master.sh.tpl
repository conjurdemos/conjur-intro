conjur_master_public_dns=$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)

until [ "`/usr/bin/docker inspect -f {{.State.Running}} conjur-appliance`"=="true" ]; do
    sleep 0.5;
done;

docker exec conjur-appliance evoke configure master \
  -h "$${conjur_master_public_dns}" \
  -p "${admin_password}" \
  puppet
