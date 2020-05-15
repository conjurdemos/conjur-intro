# Jmeter Performance Test

## How to run
- To run the performance test on the latest DAP version:

    ```sh
    $ bin/run
    ```

- To run the performance test against a particular DAP release:

    ```sh
    $ bin/run --tag 11.3
    ```

- To view all possible commands:

    ```sh
    $ bin/run --help
    ```

The script will:
1. Start and configure a DAP master.
1. Using JMeter, run the performance test specified in `jmeter/DAP_Performance_Test.jmx`.
1. Upon test completion, shut down all containers and open the results in a browser.

The script will exit upon completion of the JMeter tests, outputting the results in the `jmeter/jmeter_reports` folder


## Results
After run a test, the test results are available in `jmeter/jmeter_reports/<dap-version>`.  The folder will include two files that may be of use:
1. `index.html` contains a nice page with aggregrate reports
2. `DAP_Performance_Results.csv` is a more in depth report, containing information regarding each individual jmeter request.

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
Install JMeter on OSX:
1. Install JMeter using Brew:
    ```sh
    $ brew install jmeter
    ```
2. Open the file using the JMeter:
    ```sh
    $ jmeter -t DAP_Performance_Test.jmx
    ```

Optionally, you install JMeter manually:
Download [Jmeter](http://jmeter.apache.org/download_jmeter.cgi) and edit the `.jmx` file
