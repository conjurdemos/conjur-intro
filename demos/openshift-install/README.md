Explanations:
-------------
The purpose of this demo is to install Conjur on existing OpenShift environment and then run Java Client on top of it  
The environent contains 4 pods each with up to 2 containers inside  
Pod #1: Postgres  
Pod #2: Conjur + Nginx  
Pod #3: Conjur CLI  
Pod #4: Conjur authenticator client + Java Client  

Local Prerequisites:
--------------------
Git - git version 2.24.1  
Maven - Apache Maven 3.6.3  
Java SDK / JRE - openjdk version "1.8.0_232"  
MAC OS Catalina - Version 10.15.1 (19076)  
OpenShift client installed on MAC  

External Prerequisites:
-----------------------
A GitHub user for GitHub environment  
OpenShift -     oc v3.11.0+0cbc58b  
                kubernetes v1.11.0+d4cacc0  
                features: Basic-Auth  

Commands:
---------
1. **Building Java Client:** cd <home-dir>/conjur-intro/demos/java-api-client  
			 ./build.sh  
2. **Installing Conjur and Conjur-CLI on OpenShift:** <home-dir>/conjur-intro/demos/openshift-install  
						   ./installer.sh --with-config --ocp-url <ocp-url>:<port> --project-name <project-name> --account-name <account-name> --authenticator <authenticator>  
3. **Verify that all pods are up and running by:** 	oc get pods  
4. **Installing and running java client opn Open Shift:** ./java-client-installer.sh --ocp-url <ocp-url>:<port> --docker-url <docker-url> --project-name <project-name> --account-name <account-name> --authenticator <authenticator>  
5. **Verify that all pods are up and running by:** 	oc get pods  
6. **Checking output of Java client container on pod #4:** oc logs <pod-name> -c my-conjur-java-client  
   It should show that secret was retrieved properly  

