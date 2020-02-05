package com.cyberark.example;

import net.conjur.api.Conjur;
import net.conjur.api.Token;

import java.io.File;
import java.nio.file.Paths;

public class JavaClient {

    public static void main(String args[]) {
        System.out.println("Running Conjur Java SDK Example");
        String truststoreFileName = "/run/conjur/store/trust-store.jks";
        File tempFile = null;
        try {
	    //Now application is waiting for appearing of trust-store.jks file 
            //which contains certificate for SSL connection
	    //Waiting is nessesary because in my application example this file cannot be part of image
	    //because it is created by installatiion.sh. Thus we need to copy it after the pod is up - and
	    //that's what we are waiting for
            while ((tempFile == null) || (!tempFile.exists()))
            {
                System.out.println("Check if " + truststoreFileName + "file appeared");
                tempFile = new File(truststoreFileName);
                Thread.sleep(3000);
            }
            System.setProperty("javax.net.ssl.trustStore", truststoreFileName);
            System.setProperty("javax.net.ssl.trustStorePassword", "TrustStore");

            System.setProperty("CONJUR_ACCOUNT", System.getenv("CONJUR_ACCOUNT"));
            System.setProperty("CONJUR_AUTHN_LOGIN", System.getenv("CONJUR_AUTHN_LOGIN"));
            System.setProperty("CONJUR_APPLIANCE_URL", System.getenv("CONJUR_APPLIANCE_URL"));
            //For OpenShift

            System.out.println("CONJUR_AUTHN_TOKEN_FILE = " + System.getenv("CONJUR_AUTHN_TOKEN_FILE"));
            Token token = Token.fromFile(Paths.get(System.getenv("CONJUR_AUTHN_TOKEN_FILE")));
            System.out.println("Create Conjur API Instance");
            Conjur conjur = new Conjur(token);
            String secret = conjur.variables().retrieveSecret("variables/mypassword");
            System.out.println("Retrieved secret = " + secret);
        }
        catch (Exception e)
        {
            System.out.println("Exception:" + e);
        }
        try {
            Thread.sleep(500000);
        }
        catch (Exception e)
        {
            System.out.println("Timer Exception:" + e);
        }
    }

}
