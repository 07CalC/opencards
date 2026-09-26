export type Bindings = CloudflareBindings & {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI?: string;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
};
