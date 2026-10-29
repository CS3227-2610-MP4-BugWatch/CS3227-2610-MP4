# BugWatch

React + TypeScript with Vite, managed with npm.

## Development

Run these commands from the repository root:

```sh
npm install
npm run dev
```

```sh
npm run build   # Type-check and build into dist/
npm run lint    # Run ESLint
npm run preview # Preview the production build
```

## Structure

```text
./
  public/               Static assets served directly
  src/
    assets/             Assets imported by the application
    features/           Empty; future features each get their own folder
    shared/
      components/       Empty; components used across features
    App.tsx             Root application component
    App.css
    index.css
    main.tsx            React entry point
  index.html
  eslint.config.js
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vite.config.ts
```

Keep feature-specific components inside their feature folder. Place components
used across features in `src/shared/components/`. The empty directories contain
`.gitkeep` placeholders so Git preserves them.

The Vite starter screen is retained. Backend and Vercel configuration are not
part of this frontend setup.
