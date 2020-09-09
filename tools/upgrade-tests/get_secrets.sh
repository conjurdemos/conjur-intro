#!/bin/bash -e

../../bin/cli  conjur variable value production/myapp/database/username 
../../bin/cli  conjur variable value production/myapp/database/password
../../bin/cli  conjur variable value production/myapp/database/url
../../bin/cli  conjur variable value production/myapp/database/port