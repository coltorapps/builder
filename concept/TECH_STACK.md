# Tech Stack Documentation

## Overview

This project is a modern, type-safe form builder library with a headless, framework-agnostic core and React bindings. The codebase is organized as a monorepo supporting multi-platform deployment (web, mobile, servers, serverless, workers).

## Monorepo Architecture

### Workspace Management
- **Monorepo Tool**: [Turborepo](https://turbo.build/) (latest)
- **Package Manager**: [pnpm](https://pnpm.io/) v9.14.4 (strictly enforced via `only-allow`)
- **Workspace Structure**: pnpm workspaces
  - `packages/builder` - Core headless library
  - `packages/builder-react` - React bindings
  - `packages/eslint-config` - Shared ESLint configuration
  - `docs/` - Next.js documentation site
- **Package Management**: [@manypkg/cli](https://github.com/Thinkmill/manypkg) for monorepo validation and fixes

### Configuration Files
- `/pnpm-workspace.yaml` - Workspace configuration
- `/turbo.json` - Turborepo pipeline configuration
- `/.npmrc` - pnpm settings

## Core Technologies

### Language & Type System
- **TypeScript**: v5.2.2
  - Target: ES2017
  - Strict mode enabled
  - JSX: React runtime
  - No unchecked indexed access
- **Type Definitions**:
  - @types/node v20.4.9
  - @types/react v18.2.32

### Build System
- **Library Bundler**: [tsup](https://tsup.egoist.dev/) v7.2.0
  - Outputs: CommonJS and ESM formats
  - DTS generation enabled
  - Minification enabled
  - Configurations:
    - `/packages/builder/tsup.config.ts`
    - `/packages/builder-react/tsup.config.ts`
- **Documentation Site**: [Next.js](https://nextjs.org/) v14.0.3
  - Configuration: `/docs/next.config.mjs`

### Testing
- **Test Framework**: [Vitest](https://vitest.dev/) v0.34.6
  - Unit testing
  - Type checking (`vitest typecheck`)
  - Uses default configuration

### Version Management
- **Tool**: [Changesets](https://github.com/changesets/changesets) CLI v2.27.10
- **Strategy**: Fixed versioning for @coltorapps/builder and @coltorapps/builder-react
- **Configuration**: `/.changeset/config.json`
- **Custom Patches**: Applied to @changesets/assemble-release-plan@5.2.4

## Code Quality & Formatting

### Linting
- **ESLint**: v8.52.0
- **Plugins & Configurations**:
  - @typescript-eslint/eslint-plugin v5.59.8
  - @typescript-eslint/parser v5.59.8
  - eslint-config-next v13.4.16
  - eslint-config-turbo v1.9.3
  - eslint-config-prettier v8.3.0
  - eslint-plugin-react v7.28.0
- **Custom Configuration**: `/packages/eslint-config/index.js`
- **Root Configuration**: `/.eslintrc.js`

### Formatting
- **Prettier**: v3.0.3
- **Plugins**:
  - @ianvs/prettier-plugin-sort-imports v4.1.1 (auto-sorts imports)
  - prettier-plugin-tailwindcss v0.5.2 (sorts Tailwind classes)
- **Configuration**: `/prettier.config.cjs`

## React Ecosystem

### Core Libraries
- **React**: v18.2.0 (with React 19 support in peer dependencies)
- **React DOM**: v18.2.0
- **React Native**: Supported for mobile platforms

### UI Framework (Documentation Site)
- **Framework**: Next.js v14.0.3
- **Theme Management**: [next-themes](https://github.com/pacocoursey/next-themes) v0.2.1

## Styling & CSS (Documentation Site)

### CSS Framework
- **Tailwind CSS**: v3.3.3
- **PostCSS**: Configured (`/docs/postcss.config.js`)
- **Tailwind Configuration**: `/docs/tailwind.config.ts`

### Tailwind Plugins
- @tailwindcss/typography v0.5.7
- tailwindcss-animate v1.0.7

### Utility Libraries
- [class-variance-authority](https://cva.style/) v0.7.0 - CSS variant management
- [clsx](https://github.com/lukeed/clsx) v1.2.1 - Conditional classnames
- [tailwind-merge](https://github.com/dcastil/tailwind-merge) v2.0.0 - Merge Tailwind classes

## UI Component Libraries (Documentation)

### Radix UI Components
Headless, accessible components:
- @radix-ui/react-checkbox v1.0.4
- @radix-ui/react-dialog v1.0.5
- @radix-ui/react-dropdown-menu v2.0.6
- @radix-ui/react-label v2.0.2
- @radix-ui/react-popover v1.0.7
- @radix-ui/react-scroll-area v1.0.5
- @radix-ui/react-select v2.0.0
- @radix-ui/react-slot v1.0.2
- @radix-ui/react-tabs v1.0.4
- @radix-ui/react-toast v1.1.5
- @radix-ui/react-toggle v1.0.3

### Additional UI Libraries
- [@headlessui/react](https://headlessui.com/) v1.7.13 - Headless UI components
- [lucide-react](https://lucide.dev/) v0.292.0 - Icon library
- [framer-motion](https://www.framer.com/motion/) v11.12.0 - Animation library
- [cmdk](https://cmdk.paco.me/) v0.2.0 - Command menu component
- [react-day-picker](https://react-day-picker.js.org/) v8.9.1 - Date picker

### Drag & Drop
Complete [dnd-kit](https://dndkit.com/) ecosystem:
- @dnd-kit/core v6.1.0
- @dnd-kit/modifiers v7.0.0
- @dnd-kit/sortable v8.0.0
- @dnd-kit/utilities v3.2.2

## Documentation Tools

### Content Management
- **Markup Language**: [Markdoc](https://markdoc.dev/)
  - @markdoc/markdoc v0.3.4
  - @markdoc/next.js v0.3.4

### Search
- **Client-side Search**: [FlexSearch](https://github.com/nextapps-de/flexsearch) v0.7.31
- **Autocomplete**: @algolia/autocomplete-core v1.9.2
- **Custom Implementation**: Integrated search functionality

### Syntax Highlighting & Text Tools
- [prism-react-renderer](https://github.com/FormidableLabs/prism-react-renderer) v2.0.6 - Code syntax highlighting
- [react-highlight-words](https://github.com/bvaughn/react-highlight-words) v0.20.0 - Text highlighting

## Utility Libraries

### Validation & Schema
- [Zod](https://zod.dev/) v3.22.4 - TypeScript-first schema validation

### Date & Time
- [date-fns](https://date-fns.org/) v2.30.0 - Date utility library

### General Utilities
- [lodash](https://lodash.com/) v4.17.21 - Utility functions
- [@sindresorhus/slugify](https://github.com/sindresorhus/slugify) v2.1.0 - String slugification
- [fast-glob](https://github.com/mrmlnc/fast-glob) v3.2.12 - File pattern matching
- [js-yaml](https://github.com/nodeca/js-yaml) v4.1.0 - YAML parsing
- json CLI v11.0.0 - JSON manipulation

## Analytics & Monitoring

- [@vercel/analytics](https://vercel.com/analytics) v1.1.1 - Analytics integration
- @next/third-parties v15.0.3 - Third-party script optimization

## Development Tools

### Git Hooks
- **Hook Manager**: [Husky](https://typicode.github.io/husky/) v8.0.3
- **Pre-commit Hook**: Runs format, lint, test, and typecheck
- **Configuration**: `/.husky/pre-commit`

### CI/CD
- **Platform**: GitHub Actions
- **Workflow Configuration**: `/.github/workflows/ci.yml`
- **Setup Action**: Custom action at `/.github/actions/setup/action.yml`

### CI Test Matrix
- **Operating Systems**: ubuntu-latest, macos-latest, windows-latest
- **Node.js Version**: v20
- **Jobs**:
  1. Typecheck (ubuntu-only)
  2. Test (cross-platform matrix)
- **Pipeline**: checkout → install pnpm → setup node → install → build → test/typecheck

## Runtime Environment

### Node.js
- **CI/CD**: Node.js v20 (matrix), v18.x (default in setup action)
- **Development**: Node.js v22.21.1 (current container)

### Target Platforms
- Web browsers (React)
- Mobile devices (React Native)
- Node.js servers
- Serverless functions
- Edge workers

## Key Features & Characteristics

### Architecture
- **Headless Core**: Framework-agnostic core library
- **Zero Dependencies**: Core library has no runtime dependencies
- **Type-Safe**: Fully type-safe by default
- **Multi-Platform**: Single codebase for web, mobile, and server
- **Progressive Enhancement**: Built on web standards

### License
- **License**: MIT

## Configuration Files Reference

### Root Configuration
- `/package.json` - Root package configuration
- `/tsconfig.json` - Root TypeScript configuration
- `/.eslintrc.js` - ESLint configuration
- `/prettier.config.cjs` - Prettier configuration
- `/.npmrc` - pnpm settings
- `/turbo.json` - Turborepo configuration
- `/pnpm-workspace.yaml` - Workspace configuration

### Package Configurations
- `/packages/builder/package.json`
- `/packages/builder/tsup.config.ts`
- `/packages/builder-react/package.json`
- `/packages/builder-react/tsup.config.ts`
- `/packages/eslint-config/package.json`
- `/docs/package.json`
- `/docs/next.config.mjs`
- `/docs/tailwind.config.ts`
- `/docs/postcss.config.js`

### Version Management
- `/.changeset/config.json` - Changesets configuration

### CI/CD
- `/.github/workflows/ci.yml` - GitHub Actions workflow
- `/.github/actions/setup/action.yml` - Custom setup action

## Summary

This is a modern, well-architected monorepo leveraging cutting-edge tooling with a strong emphasis on:
- **Type Safety**: Full TypeScript coverage with strict mode
- **Developer Experience**: Comprehensive linting, formatting, and testing
- **Multi-Platform Support**: Web, mobile, and server environments
- **Zero Dependencies**: Lightweight core library
- **Documentation**: Comprehensive docs site with search and interactive examples
- **CI/CD**: Automated testing across multiple platforms
- **Version Management**: Structured release process with changesets
