# Modular Policy Example

This folder includes an example of how to build a modular, template-based set of policies.

## Installation

1. Create a `staging` and `production` namespace:
    ```sh
    $ ./cli conjur policy load root policy/modular/root.yml
    ```
2. Create namespaces for each of our applications (`my-app-1..my-app-6`) in the staging namespace:
    ```sh
    $ ./cli conjur policy load staging policy/modular/apps/applications.yml
    ```
3. Create our first application `my-app-1`, in the staging environment:
    ```sh
    $ ./cli conjur policy load staging/my-app-1 policy/modular/apps/generic-application.yml
    ```
    
