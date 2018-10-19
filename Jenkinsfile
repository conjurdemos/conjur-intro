#!/usr/bin/env groovy

pipeline {
  agent { label 'executor-v2' }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '30'))
    skipDefaultCheckout()  // see 'Checkout SCM' below, once perms are fixed this is no longer needed
  }

  stages {
    stage('Checkout SCM') {
      steps {
        checkout scm
      }
    }

    stage('Validate Simple HA Cluster') {
      steps {
        sh 'cd demos/simple-cluster && ./cli rm -rf /root/*'
        sh 'cd demos/simple-cluster && ./start --load-data'
        sh 'cd demos/simple-cluster && ./cli rm -rf /root/*'
        sh 'cd demos/simple-cluster && ./stop'
      }
    }
    stage('Validate Simple HA Cluster with Master Key Encryption') {
      steps {
        sh 'cd demos/simple-cluster && ./start --load-data --master-key'
        sh 'cd demos/simple-cluster && ./stop'
      }
    }
    stage('Validate Simple HA Cluster with Custom Certificates') {
      steps {
        sh 'cd demos/simple-cluster && ./start --load-data --custom-certs'
        sh 'cd demos/simple-cluster && ./stop'
      }
    }
    stage('Validate Simple HA Cluster with Custom Certificates and Master Key Encryption') {
      steps {
        sh 'cd demos/simple-cluster && ./start --load-data --custom-certs --master-key'
        sh 'cd demos/simple-cluster && ./stop'
      }
    }
  }
}
