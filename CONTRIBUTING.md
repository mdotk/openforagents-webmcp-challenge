# Contributing

Thank you for considering a contribution to Open for Agents WebMCP Challenge.

## Before proposing a change

1. Keep the change focused and explain the user-visible reason for it.
2. Install the locked dependencies with `npm ci`.
3. Run the complete local acceptance gate with `npm run check`. It runs lint,
   the automated tests and the production build.
4. Do not include secrets, private data or third-party material that you do
   not have permission to contribute.

## Developer Certificate of Origin

Every commit must include a `Signed-off-by` line certifying the
[Developer Certificate of Origin 1.1](https://developercertificate.org/).
Add it automatically with:

```sh
git commit -s
```

Use your real name and an email address you are authorised to use. The sign-off
confirms that you have the right to submit the contribution under this
repository's licence. It is not a copyright assignment.
