# Google Play release — UXGuard Studio

Package: `uxguard.studio` (Android) · iOS bundle ID: `studio.uxguard.app`  
EAS project: https://expo.dev/accounts/romsuxguard/projects/uxguard-studio

## 1. Play Console app (one-time)

1. Open [Google Play Console](https://play.google.com/console).
2. **Create app** → name **UXGuard Studio** → default language → App / Free.
3. When asked for package name, use **`uxguard.studio`** (must match `mobile/app.json` → `android.package`).

Complete required dashboard tasks before production:

- App content: Privacy policy URL `https://uxguard.studio/privacy`
- Data safety (email, name, user content, identifiers, app activity)
- Content rating questionnaire
- Target audience
- Store listing: short + full description, screenshots, feature graphic
- App category: Education or Productivity

## 2. Google Play API key for EAS Submit (recommended)

EAS can upload the `.aab` for you after this is set up once.

1. Play Console → **Setup** → **API access**.
2. Link a Google Cloud project (or create one).
3. **Create service account** → grant access in Play Console.
4. For the service account, grant **Release manager** (or Admin) on the app.
5. In Google Cloud → service account → **Keys** → **Add key** → JSON → download.
6. Save the file locally, e.g. `mobile/google-play-service-account.json` (gitignored).
7. Upload to EAS:

```bash
cd mobile
npx eas-cli credentials --platform android
# Choose: Google Service Account Key for Play Store Submissions → upload JSON
```

Or set in `eas.json` (do not commit the JSON):

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-play-service-account.json",
      "track": "internal",
      "releaseStatus": "completed"
    }
  }
}
```

## 3. Build production App Bundle

```bash
cd mobile
npx eas-cli build --profile production --platform android
```

This produces an **`.aab`** (required for Play Store; APK preview builds are not accepted for production).

## 4. Submit to Play

**Internal testing first** (recommended):

```bash
cd mobile
npx eas-cli submit --platform android --profile production --latest
```

Change `"track": "internal"` to `"production"` in `eas.json` when ready for public release.

**Manual upload** (if you skip EAS Submit):

1. Download the `.aab` from the EAS build page.
2. Play Console → your app → **Testing** → **Internal testing** → **Create release** → upload `.aab`.

## 5. Promote to production

1. Test the internal release on a real device.
2. Play Console → **Production** → **Create release** → promote from internal or upload new `.aab`.
3. **Send for review**.

Typical first review: a few days.

## Version bumps for updates

In `mobile/app.json`:

- `version` → user-visible, e.g. `1.0.1`
- `android.versionCode` → integer, must increase every upload, e.g. `2`

Then rebuild and submit again.

## Signing key mismatch (wrong key)

If Play Console says the bundle is signed with the wrong key, the **first `.aab` uploaded** to this app registered an upload certificate. Later builds must use the **same upload keystore**.

For UXGuard Studio this happened because an early upload used the **`studio.uxguard.app`** bundle (upload key `SHA1: D4:C2:1D:…`) while current **`uxguard.studio`** EAS builds use a newer keystore (`SHA1: AA:2E:18:…`).

### Fix (recommended): reuse the original EAS keystore

1. Open [EAS credentials](https://expo.dev/accounts/romsuxguard/projects/uxguard-studio/credentials) → **Android**.
2. Find credentials for **`studio.uxguard.app`** → **Download keystore** (save `.jks` + note passwords).
3. Open credentials for **`uxguard.studio`** → **Upload existing keystore** → use that same `.jks`.
4. Bump `android.versionCode` in `app.json`, then run a new production build and upload the new `.aab`.

### Alternative: reset upload key in Play Console

Play Console → **App integrity** → **App signing** → **Request upload key reset** → upload the PEM for your current EAS upload certificate. Google approval can take 1–2 days.
