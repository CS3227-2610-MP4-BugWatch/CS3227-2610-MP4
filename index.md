---
  layout: default.md
  title: "BugWatch Documentation"
---

# BugWatch Documentation

**BugWatch is a web application for tracking software bugs.** This documentation
is the starting point for learning about the application and contributing to its
development.

## Explore the documentation

* [**User Guide**](docs/userGuide/UserGuide.html): documentation for people using BugWatch
* [**Developer Guide**](docs/developerGuide/DeveloperGuide.html): documentation for contributors

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
