# frozen_string_literal: true

# require 'json'

# Validation tasks
Given('a variable and value are loaded') do
  system('bin/api --load-policy-and-values')
end

When('a user requests the variable value') do
  @variable_request = JSON.parse(`bin/api --fetch-secrets`)
end

Then('the variable value is returned') do
  expect(
    @variable_request['demo:variable:staging/my-app-1/postgres-database/password']
  ).to eq('secret-p@ssword-staging-my-app-1')
end

Then('the audit event is present on the master') do
  response = @provider.last_audit_event
  expect(response['subject@43868']['resource']).to eq(
    'demo:variable:staging/my-app-1/postgres-database/port'
  )
  expect(response['auth@43868']['user']).to eq('demo:user:admin')
  expect(response['action@43868']['result']).to eq('success')
end

When('the variable value is updated') do
  system('bin/api --set-secrets')
end
