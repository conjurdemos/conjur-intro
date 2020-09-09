#!/bin/bash -e

cd ../..
bin/dap single -t 11.4.0

echo "Removing certificate cache...."
rm -rf cli_cache
echo "Done"

echo "Add policies and set secrets..."
cd tools/upgrade-tests
./add_policies.sh
./add_secrets.sh
./get_secrets.sh
echo "Done"

cd ../..
bin/dap single --upgrade-to 5.11.0

echo "Removing certificate cache...."
rm -rf cli_cache
echo "Done"

echo "Get secrets...."
cd tools/upgrade-tests
./get_secrets.sh
echo "Done"
