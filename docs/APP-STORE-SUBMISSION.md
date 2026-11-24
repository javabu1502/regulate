# Shipping Regulate to the app stores

Everything here is either done in the repo or is a thing only Jared can do
(account settings, signing certificates, store listings). Nothing in the
"done" column needs revisiting.

---

## What the app is, technically

A fully static site. No API routes, no server-only Next APIs, no database,
no accounts, no network calls to anything but its own bundled files. That is
what makes wrapping it viable: `BUILD_TARGET=native npm run build` produces
a plain directory in `out/` and Capacitor bundles it into the binary.

```
npm run build                 # web build, keeps the service-worker headers
BUILD_TARGET=native npm run build && npx cap sync   # native build
npx cap open ios              # opens Xcode
```

Confirmed: `xcodebuild -scheme App` builds the iOS app successfully.

---

## Done

| | |
|---|---|
| Static export | `output: "export"` behind `BUILD_TARGET=native`, so the web build keeps its headers rule |
| iOS platform | `ios/`, compiles |
| Android platform | `android/`, scaffolded |
| App icons | generated for both platforms from `assets/icon.png` |
| Store icon | `assets/icon.png`, 1024×1024, **no alpha channel**, no rounded corners |
| Splash screens | generated from `assets/splash.png` |
| Privacy page | `/privacy` |
| Terms page | `/terms` |
| Support page | `/support` |
| Audio weight | 62MB → 39MB, re-encoded at 80k mono |
| Native haptics | Taptic Engine on native, `navigator.vibrate` on web |
| Background audio | `UIBackgroundModes: audio` and an `AVAudioSession` `.playback` claim |

### The Apple 4.2 question

Apple rejects apps that are a website in a shell. The case here is that four
things only work in the native build:

1. **Everything is offline.** The pages, 173 voice clips and 15 meditations
   are in the binary. No connection is needed at any point.
2. **Haptics.** iOS has never implemented the Vibration API, so on the web
   every haptic cue in the app silently does nothing on an iPhone, including
   the eyes-free breathing guides whose only job is to pace a breath you are
   not looking at. Native routes these to the Taptic Engine.
3. **Audio that survives the lock screen.** A meditation runs to four and a
   half minutes. On the web it stops when the screen locks.
4. **The ring/silent switch.** On the web it mutes every Web Audio sound in
   the app, so the bowls, the beads, the tide and the ambient beds all go
   silent with no explanation. Claiming `.playback` fixes this.

Points 2 and 4 are not framing. They are bugs on the web that the native
build fixes.

---

## Still to do, and only Jared can do it

### Decide before the first upload

- **Bundle ID** is currently `consulting.busker.regulate` in
  `capacitor.config.ts`. **This is permanent once a build is uploaded.**
  Change it now if it should be something else.
- **Support email** is `jared@busker.consulting`, set once in
  `src/app/legal/LegalPage.tsx` and used on all three pages.
- **Marketing URL.** `NEXT_PUBLIC_APP_URL` is still unset because there is no
  domain. The store listings want one. `regulate-liart.vercel.app` works but
  reads as a preview link.

### Apple

**Opening Xcode.app once fixes two things at the same time.** This Mac has
never completed Xcode's setup: there are 0 code-signing identities and 0
provisioning profiles, and the simulator does not work at all because
`CoreSimulator.framework` is missing its binary. `xcodebuild -runFirstLaunch`
installs some components but does not restore it. Open the app, let it
finish, and download a simulator runtime under Settings → Components.

- Use the **individual** developer account, not My Democracy LLC.
- App Store Connect: create the app record, bundle ID as above.
- Signing: a Distribution certificate and provisioning profile, then
  Product → Archive in Xcode.
- **Privacy nutrition label: "Data Not Collected."** Verified true. No
  analytics, no third-party code, no network calls off-device. Say so on the
  listing too, it is the strongest thing about it.
- **Age rating:** expect 12+. Infrequent mild medical or treatment
  information. Answer the self-harm questions honestly; the app points at 988
  and does not depict anything.
- Health apps get extra review scrutiny. The disclaimers are on `/terms` and
  in the app footer, and 988 is one tap from every screen.
- Account deletion requirement does not apply: there are no accounts.

### Google

- Personal account, which means **12 testers in closed testing for 14
  continuous days** before promotion to production. **Start this clock
  first**, it is the long pole.
- Android cannot be built on this machine: there is no Android SDK and Java
  is 1.8. Needs Android Studio and a JDK 17+.
- Play wants a **Health apps declaration** and a Data safety form. Same
  answers as Apple: nothing collected, nothing shared.

### Both

- Screenshots at the required sizes. The strongest screens are the home page,
  a breathing session, the meditations list and the SOS flow.
- Short description. "Gentle tools for panic attacks, anxiety, and nervous
  system regulation" is already the manifest description.

---

## Rough order

1. Start the Android closed test. The 14 days run in the background.
2. Settle the bundle ID and the domain.
3. Archive and upload the iOS build, submit for review.
4. Screenshots and listings for both.
5. Promote Android once the 14 days are up.
