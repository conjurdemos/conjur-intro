# Jmeter Performance Test

## How to run
1. `start.sh`

The script will exit upon completion of the jmeter tests and output the results.

## Results
There will be two sets of results:
1. `./jmeter_reports/index.html` contains a nice page with aggregrate reports
2. `./DAP_Performance_Results.csv` is a more in depth report, containing information regarding each individual jmeter request.


## Current Test
1. Authenticate as the admin user
2. Load the following policies (from conjurdemos/dap-intro):
    - policy/users.yml (into the root namespace, using [replace](https://docs.cyberark.com/Product-Doc/OnlineHelp/AAM-DAP/Latest/en/Content/Developer/Conjur_API_Replace_Policy.htm?tocpath=Developer%7CREST%C2%A0APIs%7C_____9))
    - policy/policy.yml (into the root namespace using [append](https://docs.cyberark.com/Product-Doc/OnlineHelp/AAM-DAP/Latest/en/Content/Developer/Conjur_API_Append_Policy.htm?tocpath=Developer%7CREST%C2%A0APIs%7C_____10))
    - policy/apps/myapp.yml (into the staging namespace using [append](https://docs.cyberark.com/Product-Doc/OnlineHelp/AAM-DAP/Latest/en/Content/Developer/Conjur_API_Append_Policy.htm?tocpath=Developer%7CREST%C2%A0APIs%7C_____10))
    - policy/apps/myapp.yml (into the production namespace using [append](https://docs.cyberark.com/Product-Doc/OnlineHelp/AAM-DAP/Latest/en/Content/Developer/Conjur_API_Append_Policy.htm?tocpath=Developer%7CREST%C2%A0APIs%7C_____10))
    - policy/application_grants.yml (into the root namespace using [append](https://docs.cyberark.com/Product-Doc/OnlineHelp/AAM-DAP/Latest/en/Content/Developer/Conjur_API_Append_Policy.htm?tocpath=Developer%7CREST%C2%A0APIs%7C_____10))
    - policy/hosts.yml (into the root namespace using [append](https://docs.cyberark.com/Product-Doc/OnlineHelp/AAM-DAP/Latest/en/Content/Developer/Conjur_API_Append_Policy.htm?tocpath=Developer%7CREST%C2%A0APIs%7C_____10))
      - Record the test-host-1 API key for future use

3. Set the following variables with random strings:
    - production/myapp/database/username
    - production/myapp/database/password
    - production/myapp/database/url
    - production/myapp/database/port

4. Load Test:
    - Authenticate using the test-host-1 API key and retrieve a token
    - Retrieve the production/myapp/database credentials using batch retrieval


## Contributing
Download [Jmeter](http://jmeter.apache.org/download_jmeter.cgi) and edit the `.jmx` file 