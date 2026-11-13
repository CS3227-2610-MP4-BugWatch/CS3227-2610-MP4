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

When the app renews your session in the background or you return to its browser tab, your current account screen stays open. Any unsaved project form text remains in place. Signing out or losing the session still returns you to the login screen.

### Provided Accounts for MP4

| Role | Email | Password |
| --- | --- | --- |
| Developer | developerdavid@mail.com | d3vDavid |
| Developer | developerdanielle@mail.com | d3vDanielle |
| Tester | testerterence@mail.com | t3stTerence |
| Tester | testertrisha@mail.com | t3stTrisha |

## Navigate the workspace

The header shows your display name, role, and **Log out**. On wider screens, the sidebar offers **Projects** and **Mailbox** to both roles and **My drafts** to Testers. On a narrow screen, select **Menu** to open or close those destinations. With focus on **Menu** or its navigation, press Escape to close the menu. The current destination is highlighted. See [Projects](Projects.md), [Bug reports](Reports.md), and [Mailbox](Mailbox.md) for the available workflows.

## Account setup and logout

If the screen says **Account setup incomplete - contact the administrator.**, your account needs an administrator to complete or correct its profile before you can enter. Select **Log out** if you need to leave that screen.

If identity loading is temporarily unavailable, select **Retry**. You can also select **Log out**. In the workspace, select **Log out** in the header to end your session and return to login. Signing out clears protected content and unsaved form text immediately. If logout fails, the app reports an error and offers a retry when the service is available.

Administrators can find setup details in the [authentication developer guide](../developerGuide/Authentication.md).
