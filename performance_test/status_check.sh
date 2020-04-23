#!/bin/bash -ex

PID=$1

#Copy status.txt from jmeter container 
docker cp performance_test_jmeter_1:/status.txt ./status.txt

#Only exit while loop when status is 1 (finished)
while [[ $(< ./status.txt) != "1" ]]
do
  sleep 10
  docker cp performance_test_jmeter_1:/status.txt ./status.txt
  echo "Still running"
done

#Kills conjur container
kill $PID
