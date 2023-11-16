---
title: Installation
nextjs:
  metadata:
    title: Installation
    description: Getting started with Basebuilder is straightforward.
---

To begin, simply install the necessary dependencies.

---

## Installing dependencies

Install `basebuilder` and `@basebuilder/react` via your preferred package manager.

```shell
pnpm install basebuilder
pnpm install @basebuilder/react
```

While our documentation often assumes you're using a full-stack framework such as Next.js for illustrative purposes, you can replicate these setups within a monorepo structure, maintaining decoupled client and server apps.

If you have a separate server app, it will only need `basebuilder` for schema and values validation, whereas the client app will require both `basebuilder` and `@basebuilder/react`.

Though, if your server, for example, is tasked with generating PDF reports based on entities values, you may also benefit from using both packages on the server side.
