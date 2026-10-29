# Connecting social networks

Every network requires you to register your own developer app. The app's keys go in `.env.local` (copy `.env.example`), and you restart `npm run dev` afterwards. A network without keys shows setup steps on the Accounts page instead of a Connect button.

**Redirect URL.** Each app must list this exact URL:

```
<APP_URL>/api/connect/<network>/callback
```

`<APP_URL>` defaults to the address you open the app at, e.g. `http://localhost:3000`. The connect dialog on the Accounts page shows the exact URL for each network.

**HTTPS.** Google, LinkedIn and Facebook accept `http://localhost` while you develop. TikTok, Threads and Instagram require an HTTPS redirect, and X and Pinterest may too. For those, run an HTTPS tunnel to your local app (for example `cloudflared tunnel --url http://localhost:3000`), set `APP_URL` to the tunnel address, and register the redirect with that address.

**Development mode.** Until a network approves your app, usually through "App Review", only people you add to the app as developers or testers can connect. That's enough for connecting your own accounts.

| Network | Register at | `.env.local` keys | Permissions requested |
|---|---|---|---|
| Facebook Pages | [developers.facebook.com/apps](https://developers.facebook.com/apps): create an app, add **Facebook Login** | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` |
| Instagram | Same Meta app: add **Instagram → API setup with Instagram login**; it shows its own app ID and secret | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | `instagram_business_basic`, `instagram_business_content_publish` |
| Threads | Meta app with the **Threads API** use case; use its Threads app ID and secret | `THREADS_APP_ID`, `THREADS_APP_SECRET` | `threads_basic`, `threads_content_publish` |
| LinkedIn | [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps): add **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn** | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | `openid`, `profile`, `w_member_social` |
| X | [developer.x.com](https://developer.x.com/en/portal/dashboard): enable **OAuth 2.0**, type *Web App* (confidential client) | `X_CLIENT_ID`, `X_CLIENT_SECRET` | `tweet.read`, `tweet.write`, `users.read`, `offline.access` |
| TikTok | [developers.tiktok.com/apps](https://developers.tiktok.com/apps): add **Login Kit** and **Content Posting API** | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.publish` |
| YouTube | [Google Cloud console](https://console.cloud.google.com/apis/credentials): enable **YouTube Data API v3**, create an OAuth client of type *Web application*, add yourself as a test user | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `youtube.readonly`, `youtube.upload` |
| Pinterest | [developers.pinterest.com/apps](https://developers.pinterest.com/apps/) | `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET` | `user_accounts:read`, `boards:read`, `pins:read`, `pins:write` |

Notes:

- **Facebook** connects a Page, not a personal profile; Facebook doesn't allow apps to post to personal profiles. If you manage several Pages, you pick one after signing in. If your Meta app is a *Business* type that uses Facebook Login for Business, create a configuration and set `FACEBOOK_CONFIG_ID` too.
- **Instagram** needs a Business or Creator account. Personal accounts can't be used through the API.
- **LinkedIn** connects your personal profile. Posting as a company Page needs LinkedIn's Community Management API, which requires a separate application to LinkedIn.
- **X** charges for most API access. Check your plan's posting limits in the X developer portal.
- The **Meta Graph API version** defaults to `v25.0`; override it with `META_GRAPH_VERSION`.

## What happens when you connect

1. **Connect** checks that you're an Admin or Manager of the workspace, records a single-use, 10-minute connection attempt, and sends you to the network.
2. The network sends you back to the callback with a code. The server checks that the attempt belongs to you, exchanges the code for a token, reads the profile or Pages, and saves them to the workspace's slot for that network.
3. Tokens are encrypted with AES-256-GCM using `TOKEN_ENCRYPTION_KEY`, or a key generated into `.data/secret.key`, and stored server-side. They are never sent to the browser.
4. **Disconnect** deletes the stored token. To fully revoke access, also remove the app in that network's settings.

## Not built yet

Connecting stores the access needed to post, but **publishing scheduled posts to the networks isn't wired up yet**. The same goes for syncing analytics, comments and mentions. Those are the next pieces, one network at a time.
