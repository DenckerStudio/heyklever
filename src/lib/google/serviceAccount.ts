import jwt from "jsonwebtoken";

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getGoogleAccessTokenFromServiceAccount(scopes: string[] = [
  "https://www.googleapis.com/auth/drive"
]): Promise<string | null> {
  try {
    // Read service account JSON from env var (as JSON string)
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountJson) {
      console.error("GOOGLE_SERVICE_ACCOUNT_KEY is not set");
      return null;
    }

    const serviceAccount = JSON.parse(serviceAccountJson) as GoogleServiceAccount;

    // Return cached token if still valid (skew 60s)
    const now = Math.floor(Date.now() / 1000);
    if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > now) {
      return cachedAccessToken.token;
    }

    const iat = now;
    const exp = now + 3600; // 1 hour
    const payload = {
      iss: serviceAccount.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp,
    } as const;

    const assertion = jwt.sign(payload, serviceAccount.private_key, { algorithm: "RS256" });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!response.ok) {
      console.error("Failed to exchange JWT for access token:", await response.text());
      return null;
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };

    cachedAccessToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600),
    };

    return cachedAccessToken.token;
  } catch (error) {
    console.error("Error generating Google access token:", error);
    return null;
  }
}


