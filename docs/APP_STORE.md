# App Store and Play Console checklist

Use this when preparing Google Play internal testing and Apple TestFlight. The mobile app does not change website authentication.

## Identifiers

| Item | Value |
|---|---|
| App name | UXGuard Studio |
| Bundle ID (iOS) | `studio.uxguard.app` |
| Application ID (Android) | `uxguard.studio` |
| URL scheme | `uxguard` |
| Privacy | https://uxguard.studio/privacy |
| Terms | https://uxguard.studio/terms |
| Support | hello@uxguard.studio |

## Builds

EAS project (linked): [romsuxguard/uxguard-studio](https://expo.dev/accounts/romsuxguard/projects/uxguard-studio)  
Project ID: `601f4ab6-cb5c-466d-b0a1-afe239c48106`

```bash
cd mobile
npx eas-cli login
# Project already linked via eas init — only re-run if the link is missing
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile preview --platform ios
```

Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_APP_URL`, and `EXPO_PUBLIC_CONTENT_API_URL` in EAS Environment (preview + production) before building.

- Android preview produces an APK for internal testing.
- iOS preview is for TestFlight / ad hoc once Apple credentials are connected.
- Production Android uses an App Bundle.

## Privacy and legal

The current website privacy/terms pages are too short for store review. Expand them before submission with:

- Account data collected (name, email, interests, experience level)
- Learning data (challenge attempts, points, redemptions)
- Device push token, if permission is granted
- Content analytics for sponsored impressions/opens (not used to award points)
- Retention and deletion (in-app Delete account)
- No sale of personal data
- Points are not cash and cannot be withdrawn

## Data safety / Apple privacy nutrition

Disclose:

- Email and name (account)
- User content (saved items, challenge answers)
- Identifiers (user ID, push token)
- Product interaction (reading progress, campaign events)

Do not claim the app does not collect data.

## Age rating

Declare a 12+ / 4+ equivalent based on professional learning content. There is no user-generated public chat in the mobile MVP. Confirm with legal before submission.

## Permissions

- Notifications: “UXGuard Studio can notify you about learning challenges, new articles, and rewards.”
- Requested during onboarding, not on first launch.

## Account deletion

In-app path: Profile → Settings → Delete account.

Full auth-user deletion requires the `delete-account` Edge Function. The SQL RPC still removes app data if the function is not deployed yet.

## Environments

| Env | Purpose |
|---|---|
| development | Local `.env` + Expo Go / dev client |
| preview | Internal testing / TestFlight |
| production | Store release, production Supabase |

Never ship the Supabase service-role key. Mobile clients use the anon key only.

## Push

Keep `app_settings.push_sending_enabled = false` until Expo push credentials and legal copy are confirmed.
