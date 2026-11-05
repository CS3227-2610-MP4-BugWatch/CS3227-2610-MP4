---
  layout: default.md
  title: "Authentication"
  pageNav: 3
---

# Authentication

BugWatch uses accounts created by an administrator. Each account has a fixed username and a permanent Developer or Tester role. Contact your administrator for an account; the login screen has no registration or role selection controls.

## Log in

1. Open BugWatch and enter the email address and password supplied for your account.
2. Select **Log in**. The button shows **Logging in…** while the request is pending.
3. After your identity is loaded, the application shows your display name/role and opens the project workspace. The project migration must be installed in that environment before project data can load.

If the email or password is incorrect, check the details and try again. If authentication is unavailable, try again when the service is reachable. Your account remains signed in across a reload when the session is still valid; the app shows a loading message while it restores the identity.

When the app renews your session in the background, your current account screen stays open. Signing out or losing the session still returns you to the login screen.

## Account setup and logout

If the screen says **Account setup incomplete—contact the administrator.**, your account needs an administrator to complete or correct its profile before you can enter. Select **Log out** if you need to leave that screen.

If identity loading is temporarily unavailable, select **Retry**. You can also select **Log out**. On the account screen, select **Log out** to end your session and return to login. If logout fails, the app reports an error; retry when the service is available.

The [simulated project workspace](Projects.md) uses separate sample identities for development and does not change real accounts or roles. Administrators can find setup details in the [authentication developer guide](../developerGuide/Authentication.md).
