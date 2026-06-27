import { registerPlugin } from "@capacitor/core";

export interface NativeOAuthAuthenticateOptions {
  url: string;
  callbackScheme: string;
}

export interface NativeOAuthAuthenticateResult {
  url: string;
}

export interface NativeOAuthPlugin {
  authenticate(options: NativeOAuthAuthenticateOptions): Promise<NativeOAuthAuthenticateResult>;
}

export const NativeOAuth = registerPlugin<NativeOAuthPlugin>("JipbabOAuth");
