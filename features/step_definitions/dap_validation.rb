# frozen_string_literal: true

# Validation tasks
Given('I load a variable and value') do
  system('bin/api --load-sample-policy-and-values')
end

When('I request the variable value through the API') do
  @variable_request = JSON.parse(`bin/api --fetch-secrets`)
end

Then('I get the variable value') do
  expect(
    @variable_request['demo:variable:staging/my-app-1/postgres-database/password']
  ).to eq('secret-p@ssword-staging-my-app-1')
end

Then('when I check the master audit log, I see the audit event') do
  resource = 'demo:variable:staging/my-app-1/postgres-database/port'
  response = @provider.last_audit_event(resource: resource)
  expect(response).not_to be_nil, "no audit event found for #{resource}"
  expect(response['subject@43868']['resource']).to eq(resource)
  expect(response['auth@43868']['user']).to eq('demo:user:admin')
  expect(response['action@43868']['result']).to eq('success')
end

When('I update the variable value') do
  system('bin/api --set-secrets')
end
