#!/bin/bash
  
#set -x

function validate_app {
        APPNAME=$1
        CHECK_APP=$( which $APPNAME )
        if [ -z "$CHECK_APP" ]
        then
                echo "Please install $APPNAME"
                exit 1
        fi
}

validate_app oc
validate_app helm

oc delete deployment --all
helm uninstall conjur-oss
oc delete project $1
