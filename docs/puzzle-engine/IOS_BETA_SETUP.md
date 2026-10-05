# TestFlight Beta build pointing at dev

The new puzzle styles only exist in the **dev** database. TestFlight builds archive
with the **Release** configuration, which points at **prod**, so a TestFlight build
would show no new styles at all.

This needs a third build configuration, `Beta`: Release in every respect except
that it reads `Config.beta.plist` (the dev API). The code side is done; the Xcode
side has to be done in Xcode, because editing `project.pbxproj` by hand across
three targets is easy to corrupt.

## Already in the repo

- `Configuration.swift` picks the plist by compiler flag: `BETA_BUILD` →
  `Config.beta.plist`, else `DEBUG` → `Config.debug.plist`, else `Config.plist`.
  `BETA_BUILD` is checked first, so a Beta build can never fall through to prod.
- `Configuration.isDevAPI` is true when the configured URL contains `.dev.`.
- `ContentView` shows an orange **DEV** badge under the title when `isDevAPI`.
- `Config.beta.plist.template` — copy to `Config.beta.plist` (gitignored, like the
  other two).

## Xcode steps

1. **Create the plist.** In `app/queens/`:
   ```
   cp Config.beta.plist.template Config.beta.plist
   ```
   Confirm it holds `https://api.dev.queens.knittedmice.com/puzzle`.

2. **Duplicate the build configuration.** Project (not target) → Info →
   Configurations → select **Release** → the **+** → *Duplicate "Release"
   Configuration* → name it `Beta`.

3. **Set the flag.** Target `queens` → Build Settings → *Other Swift Flags* → the
   **Beta** row → add `-DBETA_BUILD`. Leave Debug and Release alone.

   Verify: Release and Debug must **not** carry `-DBETA_BUILD`. That flag is the
   only thing standing between a Beta archive and the prod API.

4. **Confirm the plist ships.** Target → Build Phases → Copy Bundle Resources
   should list `Config.beta.plist`. The project uses Xcode 16 synchronised
   folders, so it is usually added automatically — check rather than assume.

5. **Add a scheme.** Product → Scheme → New Scheme, name it `queens (Beta)`.
   Edit it → **Archive** → Build Configuration → `Beta`. Also set Run → `Beta` if
   you want to run it on a device against dev.

6. **Bump the build number** and archive with the `queens (Beta)` scheme. Upload
   to TestFlight as usual.

## Before archiving for the App Store

The risk this whole setup introduces is shipping a dev-pointed build to the store.
Check all three:

- The scheme is `queens` (not `queens (Beta)`).
- Archive configuration is `Release`.
- The launched build shows **no DEV badge**.

The badge is the backstop: if it appears on a build you meant for the App Store,
that build is pointed at dev — do not submit it.

## Verifying against dev

With a Beta build on a device:

1. The DEV badge is visible under the title.
2. New Game shows a **Style** picker with Original / Winding / Tangled. If it
   shows no picker, `/catalogue` is unreachable or dev has no new-engine puzzles
   yet — the app falls back to Original-only by design.
3. Choosing Winding or Tangled offers 8×8 and 9×9, and the difficulty buttons
   only light up for buckets that exist.
4. A fetched board shows the style name next to the difficulty capsule.
5. 9×9 renders correctly from iPhone SE up to iPad, and the hint button works on
   a Tangled board.
6. Offline downloads work per style.
