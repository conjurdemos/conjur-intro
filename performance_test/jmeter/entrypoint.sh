#!/bin/bash
# This status file will mark if the JMETER is done running 0 = no,  1 = yes
echo '0' > /status.txt

echo "START Running Jmeter"
# Keep entrypoint simple: we must pass the standard JMeter arguments
jmeter -Jkey=null -n -t /DAP_Performance_Test.jmx -l /DAP_Performance_Results.csv -e -o /jmeter_reports
echo "STOP Running Jmeter"

#Update status.txt to 1 
echo "1" > /status.txt

#This is to keep the container from exiting
tail -F anything
