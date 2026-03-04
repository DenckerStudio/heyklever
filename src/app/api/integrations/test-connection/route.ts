import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { provider, clientId, clientSecret, authorizationUrl, accessTokenUrl } = await req.json();

    if (!provider || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let testResult: { success: boolean; message: string; accountInfo?: any } = {
      success: false,
      message: "Unknown error"
    };

    if (provider === "google_drive") {
      testResult = await testGoogleDriveConnection(clientId, clientSecret);
    } else if (provider === "onedrive") {
      if (!authorizationUrl || !accessTokenUrl) {
        return NextResponse.json({ error: "OneDrive requires authorization and token URLs" }, { status: 400 });
      }
      testResult = await testOneDriveConnection(clientId, clientSecret, authorizationUrl, accessTokenUrl);
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    return NextResponse.json(testResult);
  } catch (error) {
    console.error("Connection test error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Connection test failed" 
    }, { status: 500 });
  }
}

async function testGoogleDriveConnection(clientId: string, clientSecret: string) {
  try {
    // Test by attempting to get an access token using authorization code flow
    // We'll use a dummy authorization code to test if the credentials are valid
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: "dummy_code_for_testing",
        redirect_uri: "urn:ietf:wg:oauth:2.0:oob" // Out-of-band redirect for testing
      }),
    });

    const responseData = await tokenResponse.json();
    
    // If we get an "invalid_grant" error, it means the credentials are valid but the code is invalid
    // This is what we want - it confirms the client_id and client_secret are correct
    if (responseData.error === "invalid_grant") {
      return {
        success: true,
        message: "Google Drive credentials are valid",
        accountInfo: {
          provider: "google_drive",
          status: "credentials_valid"
        }
      };
    }
    
    // If we get other errors, the credentials might be invalid
    if (responseData.error) {
      return {
        success: false,
        message: `Invalid credentials: ${responseData.error_description || responseData.error}`
      };
    }

    // If we somehow get a successful response (unlikely with dummy code), consider it valid
    return {
      success: true,
      message: "Google Drive credentials are valid",
      accountInfo: {
        provider: "google_drive",
        status: "credentials_valid"
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function testOneDriveConnection(clientId: string, clientSecret: string, authorizationUrl: string, accessTokenUrl: string) {
  try {
    // Test by attempting to get an access token using authorization code flow
    // We'll use a dummy authorization code to test if the credentials are valid
    const tokenResponse = await fetch(accessTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: "dummy_code_for_testing",
        redirect_uri: "urn:ietf:wg:oauth:2.0:oob" // Out-of-band redirect for testing
      }),
    });

    const responseData = await tokenResponse.json();
    
    // If we get an "invalid_grant" error, it means the credentials are valid but the code is invalid
    // This is what we want - it confirms the client_id and client_secret are correct
    if (responseData.error === "invalid_grant") {
      return {
        success: true,
        message: "OneDrive credentials are valid",
        accountInfo: {
          provider: "onedrive",
          status: "credentials_valid"
        }
      };
    }
    
    // If we get other errors, the credentials might be invalid
    if (responseData.error) {
      return {
        success: false,
        message: `Invalid credentials: ${responseData.error_description || responseData.error}`
      };
    }

    // If we somehow get a successful response (unlikely with dummy code), consider it valid
    return {
      success: true,
      message: "OneDrive credentials are valid",
      accountInfo: {
        provider: "onedrive",
        status: "credentials_valid"
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}
