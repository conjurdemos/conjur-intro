#!/bin/bash -e

../../bin/cli  conjur variable values add production/myapp/database/username my-username
../../bin/cli  conjur variable values add production/myapp/database/password my-password
../../bin/cli  conjur variable values add production/myapp/database/url https://my-database.mycompany.com
../../bin/cli  conjur variable values add production/myapp/database/port 5432