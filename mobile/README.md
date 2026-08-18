# UXGuard Studio mobile

Native Android and iOS app (React Native, Expo, TypeScript). This is not a website wrapper.

The existing website stays on Vercel Blob + JWT. This app uses a **new Supabase project**.

## Product decisions (MVP)

- Guests can browse published website content without an account.
- Mobile-only Supabase Auth. Website passwords are not reused yet.
- Account deletion removes the mobile account, not the website portfolio.
- Password reset uses the `uxguard://reset-password` deep link.
- Articles render as native text, not a WebView.
- Published website articles/case studies are read from Supabase after sync, with a public API fallback.
- Push tokens can be stored; **sending stays off** until you confirm backend config.
- Points are not cash and are never awarded for ads.

You can run the app immediately with `cd mobile && npm start`. Home and Discover load published case studies from `https://uxguard.studio`, then from Supabase after sync.

**Use Expo Go on a phone, not the browser.** The browser is not the product and will not behave like iOS/Android.

## 1. Create Supabase

1. Create a project at supabase.com (dev, then prod).
2. Authentication → URL configuration:
   - Redirect URLs: `uxguard://reset-password`, `uxguard://`
3. SQL editor: run in order:
   - `supabase/migrations/20260817000001_mobile_foundation.sql`
   - `supabase/migrations/20260817000002_seed_catalogue.sql`
4. Deploy `supabase/functions/delete-account` (required for full App Store account deletion).
5. Copy the **anon** key only into the app env. Never put the service-role key in `mobile/`.

## 2. Configure the app

```bash
cd mobile
cp .env.example .env
```

Set:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_URL=https://uxguard.studio
EXPO_PUBLIC_CONTENT_API_URL=https://uxguard.studio
```

## 3. Run on a phone (Expo Go)

1. Install **Expo Go** from the App Store (iPhone) or Play Store (Android). Update it if it is old.
2. Put the phone on the **same Wi-Fi** as this computer.
3. From this repo:

```bash
cd mobile
npx expo start --lan
```

4. On iPhone: open the Camera app, scan the QR code in the terminal, open in Expo Go.
5. On Android: open Expo Go → Scan QR code.
6. If the phone cannot connect, stop Metro and use a tunnel instead:

```bash
cd mobile
npx expo start --tunnel
```

Do not open `http://localhost:8081` in Safari or Chrome. That is the web fallback, not the native app.

Local Supabase (optional, requires Docker):

```bash
npx supabase start
```

Then put the local API URL (`http://127.0.0.1:54321`) and anon key from `npx supabase status` into `mobile/.env`.

## 4. Sync website content (optional)

From the repo root, using the **service role** locally only:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role \
node scripts/sync-mobile-content.mjs
```

## 5. EAS / store prep

```bash
cd mobile
npx eas-cli login
npx eas-cli init
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile preview --platform ios
```

Still required before store submission — see `docs/APP_STORE.md`:

- Expand privacy policy and terms
- Confirm age rating, data-safety, and Apple privacy nutrition labels
- Replace placeholder EAS project settings
- Confirm Expo push credentials, then set `push_sending_enabled` in `app_settings`
- App icons/splash already use the UXGuard shield on navy `#001334`

Bundle ID / application ID: `studio.uxguard.app`  
Scheme: `uxguard`
