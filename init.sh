#!/bin/bash

sed -i "s/REPO_NAME/$1/g" README.md

# Remove the script itself
rm init.sh
