#!/usr/bin/env groovy

pipeline {
  agent { label 'conjur-enterprise-common-agent' }

  options {
    ansiColor('xterm')
    timestamps()
    buildDiscarder(logRotator(daysToKeepStr: '30'))
  }

  parameters {
    string(name: 'FROM', description: 'Version to upgrade from', defaultValue: '')
    choice(name: 'FROM_SOURCE', description: 'Where the image of FROM version is pulled from, internal registry or JFrog Artifactory', choices: ['appliance-docker-latest-local', 'appliance-docker-dev-local', 'appliance-docker-release-local', 'registry.tld'])
    string(name: 'TO', description: 'Version to upgrade to', defaultValue: '')
    choice(name: 'TO_SOURCE', description: 'Where the image of the TO version is pulled from, internal registry or JFrog Artifactory', choices: ['appliance-docker-latest-local', 'appliance-docker-dev-local', 'appliance-docker-release-local', 'registry.tld'])
    booleanParam(name: 'SKIP_DYNAMIC_SECRETS', description: 'If set to true, the dynamic secrets exercise and the check that a dynamic secret created before the upgrade survives it will not be run', defaultValue: false)
    booleanParam(name: 'SKIP_CERT_AUTH', description: 'If set to true, the check that certificate authentication set up before the upgrade still works after it will not be run', defaultValue: false)
    booleanParam(name: 'COPY_ENTERPRISE_COMMIT', description: 'Copy the main branch commit to the public conjurinc GitHub organization', defaultValue: true)
  }
  environment {
    SKIP_DYNAMIC_SECRETS = "${params.SKIP_DYNAMIC_SECRETS}"
    SKIP_CERT_AUTH = "${params.SKIP_CERT_AUTH}"
    FROM_SOURCE = "${params.FROM_SOURCE}"
    TO_SOURCE = "${params.TO_SOURCE}"
  }

  stages {
    stage('Get InfraPool ExecutorV2 Agent') {
      steps {
        script {
          // Request ExecutorV2 agents for 1 hour(s)
          infrapool = getInfraPoolAgent.connected(type: "ExecutorV2", quantity: 1, duration: 1)[0]
          // The appliance image is pulled from Artifactory (see appliance_registry in bin/utils.sh),
          // which requires a docker login on the agent.
          dockerArtifactory.login(infrapool)
        }
      }
    }

    stage('Run upgrade test') {
      when {
        allOf {
          expression { env.FROM }
          expression { env.TO }
        }
      }
      steps {
        script {
          infrapool.agentSh "SKIP_DYNAMIC_SECRETS=\"${SKIP_DYNAMIC_SECRETS}\" SKIP_CERT_AUTH=\"${SKIP_CERT_AUTH}\" FROM_SOURCE=\"${FROM_SOURCE}\" TO_SOURCE=\"${TO_SOURCE}\" ./bin/upgrade-test \"${FROM}\" \"${TO}\""
        }
      }
    }

    stage('Copy Enterprise Commit') {
      when {
        allOf {
          branch 'main'
          not { triggeredBy 'TimerTrigger' }
        }
      }
      steps {
        script {
          release.copyEnterpriseCommit(targetOrganization='conjurdemos')
        }
      }
    }
  }

  post {
    always {
      script {
        releaseInfraPoolAgent(".infrapool/release_agents")
      }
    }
  }
}
