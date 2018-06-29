require 'sinatra/base'

class TestApp < Sinatra::Application

  configure do
    set :bind, '0.0.0.0'
  end
  
  get '/' do
    "
      <h1>Visit us @ www.conjur.org!</h1>
      <p>Database Username (PROD): #{ENV['DB_USERNAME_PROD']}</p>
      <p>Database Password (PROD): #{ENV['DB_PASSWORD_PROD']}</p>
      <p></p>
      <p>Database Username (DEV): #{ENV['DB_USERNAME_DEV']}</p>
      <p>Database Password (DEV): #{ENV['DB_PASSWORD_DEV']}</p>
      <p></p>
      <p>Stripe API Key: #{ENV['STRIPE_API_KEY']}</p>
    "
  end

end
