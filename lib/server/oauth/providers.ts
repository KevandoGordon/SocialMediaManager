/**
 * OAuth 2.0 settings for each network: where to send the user, how to swap the returned code for a
 * token, and how to read the profile (or pages) that token can post as. Credentials come from
 * .env.local; see docs/connecting-networks.md for registering each app.
 */
import crypto from "node:crypto";
import type { NetworkId } from "../../types";

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  [key: string]: unknown;
}

export interface Profile {
  externalId: string;
  name: string;
  handle: string;
  followers: number | null;
  avatarUrl: string | null;
  /** The token to post with. For Facebook this is the Page's own token. */
  token: TokenSet;
}

interface Credentials {
  clientId: string;
  clientSecret: string;
}

interface Provider {
  idEnv: string;
  secretEnv: string;
  /** Where to register the app. */
  consoleUrl: string;
  /** PKCE challenge format, for networks that require or support it. */
  pkce: "S256" | null;
  authorizeUrl(o: { clientId: string; redirectUri: string; state: string; challenge: string | null }): string;
  exchange(o: Credentials & { code: string; redirectUri: string; verifier: string | null }): Promise<TokenSet>;
  profiles(token: TokenSet, creds: Credentials): Promise<Profile[]>;
}

/** A message from the network, safe to show to the user. */
export class ConnectError extends Error {}

const GRAPH = process.env.META_GRAPH_VERSION ?? "v25.0";

const url = (base: string, params: Record<string, string | undefined>) => {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, v);
  return u.toString();
};

const basic = ({ clientId, clientSecret }: Credentials) => `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

async function call<T>(network: string, input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { ...init, cache: "no-store" });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {}
  const err = body.error as Record<string, unknown> | string | undefined;
  // TikTok wraps every response in { error: { code: "ok" } }.
  const failed = !res.ok || (err && !(typeof err === "object" && err.code === "ok"));
  if (failed) {
    const detail =
      (typeof err === "object" && (err.message as string)) ||
      (body.error_description as string) ||
      (body.message as string) ||
      (typeof err === "string" && err) ||
      `HTTP ${res.status}`;
    throw new ConnectError(`${network} refused the request: ${detail}`);
  }
  return body as T;
}

const form = (network: string, endpoint: string, fields: Record<string, string>, headers: Record<string, string> = {}) =>
  call<TokenSet>(network, endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers },
    body: new URLSearchParams(fields),
  });

const bearer = <T>(network: string, endpoint: string, token: TokenSet) =>
  call<T>(network, endpoint, { headers: { Authorization: `Bearer ${token.access_token}` } });

export const PROVIDERS: Record<NetworkId, Provider> = {
  facebook: {
    idEnv: "FACEBOOK_APP_ID",
    secretEnv: "FACEBOOK_APP_SECRET",
    consoleUrl: "https://developers.facebook.com/apps",
    pkce: null,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      url(`https://www.facebook.com/${GRAPH}/dialog/oauth`, {
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        response_type: "code",
        // Business-type apps use a Facebook Login for Business configuration instead of scopes.
        ...(process.env.FACEBOOK_CONFIG_ID
          ? { config_id: process.env.FACEBOOK_CONFIG_ID }
          : { scope: "pages_show_list,pages_read_engagement,pages_manage_posts" }),
      }),
    async exchange({ clientId, clientSecret, code, redirectUri }) {
      const short = await call<TokenSet>("Facebook", url(`https://graph.facebook.com/${GRAPH}/oauth/access_token`, { client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }));
      // Page tokens obtained with a long-lived user token don't expire.
      return call<TokenSet>("Facebook", url(`https://graph.facebook.com/${GRAPH}/oauth/access_token`, { grant_type: "fb_exchange_token", client_id: clientId, client_secret: clientSecret, fb_exchange_token: short.access_token }));
    },
    async profiles(token) {
      type Page = { id: string; name: string; username?: string; access_token: string; followers_count?: number; picture?: { data?: { url?: string } } };
      const res = await call<{ data: Page[] }>(
        "Facebook",
        url(`https://graph.facebook.com/${GRAPH}/me/accounts`, { fields: "id,name,username,access_token,followers_count,picture{url}", limit: "100", access_token: token.access_token }),
      );
      if (!res.data.length) throw new ConnectError("Facebook didn't share any Pages. Connect again and select at least one Page you manage.");
      return res.data.map((p) => ({
        externalId: p.id,
        name: p.name,
        handle: `facebook.com/${p.username ?? p.id}`,
        followers: p.followers_count ?? null,
        avatarUrl: p.picture?.data?.url ?? null,
        token: { access_token: p.access_token },
      }));
    },
  },

  instagram: {
    idEnv: "INSTAGRAM_APP_ID",
    secretEnv: "INSTAGRAM_APP_SECRET",
    consoleUrl: "https://developers.facebook.com/apps",
    pkce: null,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      url("https://www.instagram.com/oauth/authorize", {
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        response_type: "code",
        scope: "instagram_business_basic,instagram_business_content_publish",
      }),
    async exchange({ clientId, clientSecret, code, redirectUri }) {
      const res = await form("Instagram", "https://api.instagram.com/oauth/access_token", { client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
      const short = (Array.isArray(res.data) ? res.data[0] : res) as TokenSet;
      return call<TokenSet>("Instagram", url("https://graph.instagram.com/access_token", { grant_type: "ig_exchange_token", client_secret: clientSecret, access_token: short.access_token }));
    },
    async profiles(token) {
      const me = await call<{ user_id?: string; id: string; username: string; name?: string; followers_count?: number; profile_picture_url?: string }>(
        "Instagram",
        url(`https://graph.instagram.com/${GRAPH}/me`, { fields: "user_id,username,name,followers_count,profile_picture_url", access_token: token.access_token }),
      );
      return [{ externalId: me.user_id ?? me.id, name: me.name || me.username, handle: `@${me.username}`, followers: me.followers_count ?? null, avatarUrl: me.profile_picture_url ?? null, token }];
    },
  },

  threads: {
    idEnv: "THREADS_APP_ID",
    secretEnv: "THREADS_APP_SECRET",
    consoleUrl: "https://developers.facebook.com/apps",
    pkce: null,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      url("https://threads.net/oauth/authorize", { client_id: clientId, redirect_uri: redirectUri, state, response_type: "code", scope: "threads_basic,threads_content_publish" }),
    async exchange({ clientId, clientSecret, code, redirectUri }) {
      const short = await form("Threads", "https://graph.threads.net/oauth/access_token", { client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
      return call<TokenSet>("Threads", url("https://graph.threads.net/access_token", { grant_type: "th_exchange_token", client_secret: clientSecret, access_token: short.access_token }));
    },
    async profiles(token) {
      const me = await call<{ id: string; username: string; name?: string; threads_profile_picture_url?: string }>(
        "Threads",
        url("https://graph.threads.net/v1.0/me", { fields: "id,username,name,threads_profile_picture_url", access_token: token.access_token }),
      );
      return [{ externalId: me.id, name: me.name || me.username, handle: `@${me.username}`, followers: null, avatarUrl: me.threads_profile_picture_url ?? null, token }];
    },
  },

  linkedin: {
    idEnv: "LINKEDIN_CLIENT_ID",
    secretEnv: "LINKEDIN_CLIENT_SECRET",
    consoleUrl: "https://www.linkedin.com/developers/apps",
    pkce: null,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      url("https://www.linkedin.com/oauth/v2/authorization", { response_type: "code", client_id: clientId, redirect_uri: redirectUri, state, scope: "openid profile w_member_social" }),
    exchange: ({ clientId, clientSecret, code, redirectUri }) =>
      form("LinkedIn", "https://www.linkedin.com/oauth/v2/accessToken", { grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
    async profiles(token) {
      const me = await bearer<{ sub: string; name: string; picture?: string }>("LinkedIn", "https://api.linkedin.com/v2/userinfo", token);
      return [{ externalId: me.sub, name: me.name, handle: me.name, followers: null, avatarUrl: me.picture ?? null, token }];
    },
  },

  x: {
    idEnv: "X_CLIENT_ID",
    secretEnv: "X_CLIENT_SECRET",
    consoleUrl: "https://developer.x.com/en/portal/dashboard",
    pkce: "S256",
    authorizeUrl: ({ clientId, redirectUri, state, challenge }) =>
      url("https://x.com/i/oauth2/authorize", {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: "tweet.read tweet.write users.read offline.access",
        code_challenge: challenge!,
        code_challenge_method: "S256",
      }),
    exchange: (o) =>
      form("X", "https://api.x.com/2/oauth2/token", { grant_type: "authorization_code", code: o.code, redirect_uri: o.redirectUri, code_verifier: o.verifier!, client_id: o.clientId }, { Authorization: basic(o) }),
    async profiles(token) {
      const { data } = await bearer<{ data: { id: string; name: string; username: string; profile_image_url?: string; public_metrics?: { followers_count: number } } }>(
        "X",
        "https://api.x.com/2/users/me?user.fields=public_metrics,profile_image_url",
        token,
      );
      return [{ externalId: data.id, name: data.name, handle: `@${data.username}`, followers: data.public_metrics?.followers_count ?? null, avatarUrl: data.profile_image_url ?? null, token }];
    },
  },

  tiktok: {
    idEnv: "TIKTOK_CLIENT_KEY",
    secretEnv: "TIKTOK_CLIENT_SECRET",
    consoleUrl: "https://developers.tiktok.com/apps",
    pkce: null,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      url("https://www.tiktok.com/v2/auth/authorize/", {
        client_key: clientId,
        response_type: "code",
        scope: "user.info.basic,user.info.profile,user.info.stats,video.publish",
        redirect_uri: redirectUri,
        state,
      }),
    exchange: ({ clientId, clientSecret, code, redirectUri }) =>
      form("TikTok", "https://open.tiktokapis.com/v2/oauth/token/", { client_key: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    async profiles(token) {
      const { data } = await bearer<{ data: { user: { open_id: string; display_name: string; username?: string; avatar_url?: string; follower_count?: number } } }>(
        "TikTok",
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url,follower_count",
        token,
      );
      const u = data.user;
      return [{ externalId: u.open_id, name: u.display_name, handle: u.username ? `@${u.username}` : u.display_name, followers: u.follower_count ?? null, avatarUrl: u.avatar_url ?? null, token }];
    },
  },

  youtube: {
    idEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET",
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    pkce: "S256",
    authorizeUrl: ({ clientId, redirectUri, state, challenge }) =>
      url("https://accounts.google.com/o/oauth2/v2/auth", {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
        access_type: "offline",
        prompt: "consent",
        state,
        code_challenge: challenge!,
        code_challenge_method: "S256",
      }),
    exchange: ({ clientId, clientSecret, code, redirectUri, verifier }) =>
      form("YouTube", "https://oauth2.googleapis.com/token", { code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier! }),
    async profiles(token) {
      type Channel = { id: string; snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } } }; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } };
      const { items = [] } = await bearer<{ items?: Channel[] }>("YouTube", "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", token);
      if (!items.length) throw new ConnectError("That Google account has no YouTube channel. Create one, then connect again.");
      return items.map((c) => ({
        externalId: c.id,
        name: c.snippet.title,
        handle: c.snippet.customUrl ?? c.snippet.title,
        followers: c.statistics?.hiddenSubscriberCount || !c.statistics?.subscriberCount ? null : Number(c.statistics.subscriberCount),
        avatarUrl: c.snippet.thumbnails?.default?.url ?? null,
        token,
      }));
    },
  },

  pinterest: {
    idEnv: "PINTEREST_APP_ID",
    secretEnv: "PINTEREST_APP_SECRET",
    consoleUrl: "https://developers.pinterest.com/apps/",
    pkce: null,
    authorizeUrl: ({ clientId, redirectUri, state }) =>
      url("https://www.pinterest.com/oauth/", { client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "user_accounts:read,boards:read,pins:read,pins:write", state }),
    exchange: (o) => form("Pinterest", "https://api.pinterest.com/v5/oauth/token", { grant_type: "authorization_code", code: o.code, redirect_uri: o.redirectUri }, { Authorization: basic(o) }),
    async profiles(token) {
      const me = await bearer<{ id?: string; username: string; business_name?: string; profile_image?: string; follower_count?: number }>("Pinterest", "https://api.pinterest.com/v5/user_account", token);
      return [{ externalId: me.id ?? me.username, name: me.business_name || me.username, handle: me.username, followers: me.follower_count ?? null, avatarUrl: me.profile_image ?? null, token }];
    },
  },
};

export function credentialsFor(network: NetworkId): Credentials | null {
  const p = PROVIDERS[network];
  const clientId = process.env[p.idEnv];
  const clientSecret = process.env[p.secretEnv];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const pkceChallenge = (verifier: string) => crypto.createHash("sha256").update(verifier).digest("base64url");
