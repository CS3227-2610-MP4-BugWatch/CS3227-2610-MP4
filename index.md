---
  layout: default.md
  title: "BugWatch Documentation"
---

# BugWatch Documentation

**BugWatch is a web application for tracking software bugs.** This documentation
is the starting point for learning about the application and contributing to its
development.

<box type="info">

BugWatch is in early development. The application currently displays a landing
page; bug-tracking functionality has not yet been implemented. The guides are
being adapted from the documentation template and may still contain placeholder
content.

</box>

## Explore the documentation

* [**User Guide**](docs/userGuide/UserGuide.html): documentation for people using BugWatch, including [Quick Start](docs/userGuide/QuickStart.html), [Features](docs/userGuide/Features.html), and [FAQ](docs/userGuide/FAQ.html).
* [**Developer Guide**](docs/developerGuide/DeveloperGuide.html): documentation for contributors, including [Setting Up](docs/developerGuide/SettingUp.html), [Design](docs/developerGuide/Design.html), and [Testing](docs/developerGuide/Testing.html).

## Run BugWatch locally

The frontend uses React, TypeScript, and Vite, with npm for package management.
From the repository root, run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite to view the application.

To check the application or preview a production build:

```sh
npm run build
npm run lint
npm run preview
```

## Project structure

* `src/features/`: feature-specific code, with each feature's components kept inside its own folder. This directory is currently empty.
* `src/shared/components/`: components shared across features. This directory is currently empty.
* `docs/userGuide/`: user documentation.
* `docs/developerGuide/`: developer documentation.

## Acknowledgements

BugWatch uses [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/),
and [Vite](https://vite.dev/). This documentation site is built with
[MarkBind](https://markbind.org/).
