# Conjur Installation Demo on OpenShift

## Explanations

The purpose of this demo is to install Conjur on existing OpenShift environment and then run Java Client on top of it  
The environent contains 4 pods each with up to 2 containers inside  
Pod #1: Postgres  
Pod #2: Conjur + Nginx  
Pod #3: Conjur CLI  
Pod #4: Conjur authenticator client + Java Client  

## Local Prerequisites

Git - git version 2.24.1  
Maven - Apache Maven 3.6.3  
Java SDK / JRE - openjdk version "1.8.0_232"  
macOS Catalina - Version 10.15.1 (19076)  
OpenShift client installed on you local station  

## Important Note:
The commands below can run in either an interactive mode as well as in a command line mode.
Interactive mode means that each parameter that was not filled in the command line will be asked to be provided interactively.  
In interactive mode, some of these parameters have default values defined.
If the user does not provide an input, the default value is taken.  

## Commands

1. Run a local Kubernetes Cluster with Minikube
```bash
$ minikube start
$ eval $(minikube docker-env)
```

2. Building the Java Client:
```bash
$ cd <home-dir>/conjur-intro/demos/java-api-client
$ ./build.sh
```

3. Customize bootstrap.sh with your desired parameters
```bash
$ source ./bootstrap.sh
``` 

4. Installing and running ia demo Java client in Kubernetes:
```bash
$ ./java-client-installer.sh --project-name "$PROJECT_NAME" --account-name "$ACCOUNT_NAME" --authenticator "$AUTHENTICATOR"
```

| Flag | Meaning |
| ---- | ------- |
|`--project-name` | Sets the OpenShift project in which the demo Java client would be installed (should have the same value as above) |
|`--account-name` | Sets the Conjur account that would be used by the demo Java client (should have the same value as above) |
|`--authenticator` | Sets the authenticator name that would be used by the demo Java client (should have the same value as above) |

3. Verify that all pods are up and running by:

```bash
$ oc get pods
```

4. Checking output of the demo Java client container in pod #4:

```bash
$ oc logs <pod-name> -c my-conjur-java-client  
```

  It should show that the secret was retrieved properly.

## Remark:
There is an option to run installer.sh script to install Conjur + Conjur CLI and (optionally) load configuration to it.  
Commands for it are:  

1. Installing Conjur and Conjur CLI in OpenShift:

```bash
$ cd <home-dir>/conjur-intro/demos/openshift-install
$ ./installer.sh --project-name <project-name> --account-name <account-name> --authenticator <authenticator>
```

| Flag | Meaning |
| ---- | ------- |
|`--project-name` | Sets the OpenShift project in which Conjur be installed|
|`--account-name` | Sets the Conjur account that would be created|
|`--authenticator` | Sets the authenticator name that would be created|

2. Verify that all pods are up and running by:

```bash
$ oc get pods
```
