---
title: Installation
nextjs:
  metadata:
    title: Installation
    description: Getting started with Builder is straightforward.
---

To begin, simply install the necessary dependencies.

---

## Installing dependencies

Install `@coltorapps/builder` and `@coltorapps/builder-react` via your preferred package manager.

```shell
pnpm install @coltorapps/builder @coltorapps/builder-react
```

While our documentation often assumes you're using a full-stack framework such as Next.js for illustrative purposes, you can replicate these setups within a monorepo structure, maintaining decoupled client and server apps.

If you have a separate server app, it will usually only need `@coltorapps/builder` for schema and values validation, whereas the client app will require both `@coltorapps/builder` and `@coltorapps/builder-react`.
