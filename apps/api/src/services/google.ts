const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export class GoogleOAuthError extends Error { }
export class GoogleEmailNotVerifiedError extends GoogleOAuthError { }

export type GoogleServiceConfig = {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
};

export class GoogleService {
  constructor(private config: GoogleServiceConfig) { }

  static resolveRedirectUri(explicit: string | undefined, requestUrl: string): string {
    if (explicit) return explicit;
    return new URL("/api/auth/google/callback", requestUrl).toString();
  }

  static displayNameFor(info: GoogleUserInfo): string {
    return info.name?.trim() || info.email.split("@")[0]!;
  }

  buildAuthUrl(state: string): string {
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  async exchangeCode(code: string): Promise<string> {
    const { clientId, clientSecret, redirectUri } = this.config;
    if (!clientSecret) throw new GoogleOAuthError("Missing client secret");
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new GoogleOAuthError("Google token exchange failed");
    const tokens = (await res.json()) as { access_token?: string };
    if (!tokens.access_token) throw new GoogleOAuthError("Google token exchange failed");
    return tokens.access_token;
  }

  async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new GoogleOAuthError("Failed to fetch Google profile");
    const info = (await res.json()) as GoogleUserInfo;
    if (!info.sub || !info.email) throw new GoogleOAuthError("Incomplete Google profile");
    if (info.email_verified === false) throw new GoogleEmailNotVerifiedError("Google email not verified");
    return info;
  }
}
