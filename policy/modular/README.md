# Modular Policy Example

This folder includes an example of how to build a modular, template-based set of policies.

## Installation

1. Create a `staging` and `production` namespace:
    ```sh
    $ ./cli conjur policy load root policy/modular/root.yml
    ```

2. Create namespaces for each of our applications (`my-app-1..my-app-6`) in the staging namespace:
    ```sh
    $ ./cli conjur policy load --replace staging policy/modular/apps/applications.yml
    ```

3. Create our first application `my-app-1`, in the staging environment:
    ```sh
    $ ./cli conjur policy load staging/my-app-1 policy/modular/apps/generic-application.yml
    ```

4. Create a database for our application `my-app-1`, in the staging environment:
    ```sh
    $ ./cli conjur policy load staging/my-app-1 policy/modular/services/pg-database.yml
    ```

    A. Set credentials
      ```
      $ ./cli conjur variable values add staging/my-app-1/postgres-database/url https://foo-bar.mydatabase.com
      $ ./cli conjur variable values add staging/my-app-1/postgres-database/username my-app-user
      $ ./cli conjur variable values add staging/my-app-1/postgres-database/password super-secret-password
      $ ./cli conjur variable values add staging/my-app-1/postgres-database/port 5432
      ```

5. Grant our application (`my-app-1`) permission to use database credentials `postgres-database`
    ```sh
    $ ./cli conjur policy load staging/my-app-1 policy/modular/entitlements/postgres-database.yml
    ```
