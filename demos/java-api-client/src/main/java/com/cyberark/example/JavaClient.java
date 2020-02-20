package com.cyberark.example;

import net.conjur.api.Conjur;
import net.conjur.api.Token;

import java.io.FileOutputStream;
import java.io.PrintWriter;

import java.io.File;
import java.nio.file.Paths;

public class JavaClient {

  private static String truststoreFileName = "/run/conjur/truststore.jks";

  private static void initialize()
  {
    System.setProperty("javax.net.ssl.trustStore", truststoreFileName);
    System.setProperty("javax.net.ssl.trustStorePassword", "changeit");
    System.setProperty("CONJUR_ACCOUNT", System.getenv("CONJUR_ACCOUNT"));
    if (System.getenv("CONJUR_AUTHN_LOGIN") != null)
    {
      System.setProperty("CONJUR_AUTHN_LOGIN", System.getenv("CONJUR_AUTHN_LOGIN"));
    }
    System.setProperty("CONJUR_APPLIANCE_URL", System.getenv("CONJUR_APPLIANCE_URL"));
  }

  private static void enterPending()
  {
    try 
    {
      Thread.sleep(500000);
    }
    catch (Exception e)
    {
      System.out.println("Timer Exception:" + e);
    }
  }

  public static void main(String args[])
  {
    System.out.println("Running Conjur Java SDK Example");
    initialize();
    Token token = null;
    try 
    {
      System.out.println("CONJUR_AUTHN_TOKEN_FILE = " + System.getenv("CONJUR_AUTHN_TOKEN_FILE"));
      token = Token.fromFile(Paths.get(System.getenv("CONJUR_AUTHN_TOKEN_FILE")));
    }
    catch (Exception e)
    {
      System.out.println("Exception:" + e);
      return;
    }
    System.out.println("Create Conjur API Instance");
    Conjur conjur = new Conjur(token);
    String secret = conjur.variables().retrieveSecret("variables/mypassword");
    System.out.println("Retrieved secret = " + secret);
    enterPending();
  }

}
