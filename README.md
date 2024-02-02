[![Builder](https://raw.githubusercontent.com/coltorapps/builder/main/assets/github-cover-photo.png)](https://builder.coltorapps.com)

<div align="center"><strong>Builder</strong></div>
<div align="center">Powerful library for crafting your own form builders and beyond.</div>
<div align="center">
<a href="https://builder.coltorapps.com/">Website</a> 
<span> · </span>
<a href="https://github.com/coltorapps/builder">GitHub</a>
<span> · </span>
<a href="https://twitter.com/sandulat">Twitter (X)</a>
</div>
<br />
<div align="center">
<a href="https://www.npmjs.com/package/@coltorapps/builder"><img src="https://img.shields.io/npm/v/@coltorapps/builder?color=%232172dd&label=@coltorapps/builder" alt="@coltorapps/builder"></a>
<a href="https://www.npmjs.com/package/@coltorapps/builder-react"><img src="https://img.shields.io/npm/v/@coltorapps/builder-react?color=%232172dd&label=@coltorapps/builder-react" alt="@coltorapps/builder-react"></a>
</div>

## Introduction

**Builder** is a versatile TypeScript library designed for crafting custom form builders and much more. You can also develop website builders, dashboard builders, and any other builders you envision.

Some key characteristics:

- Headless: Bring your own components and design the user experience as you want.
- Full-stack: Provides comprehensive tools for building both the interface and validate schemas on the back-end.
- Typesafe: Ensures full type safety by default in every aspect.
- Multi-platform: Runs on web, mobile, servers, serverless, and workers.
- Framework agnostic: Features a core that is independent of any front-end framework.
- Zero dependencies: Offers a streamlined, lightweight library.
- Unopinionated: Affords you the freedom to build anything you imagine.
- Progressively Enhanceable: Embraces web standards.

Currently, **Builder** offers support for React, with plans to extend compatibility to other front-end frameworks in the future.

> We are successfully using **Builder** in real-world production apps. However, it's important to note that the project is currently in the alpha stage, which means that breaking changes can occur even in minor or patch updates.

## Install

Install the dependencies via your preferred package manager.

```shell
pnpm install @coltorapps/builder @coltorapps/builder-react
```

## Concepts

### Attributes

Think of attributes as the props of your entities. For instance, a text field may include attributes such as a label, a requirement flag, a maximum length, and others. Attributes are atomic, enabling their reuse across various entities.

```ts
import { createAttribute } from "@coltorapps/builder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    return z.string().min(1).parse(value);
  },
});
```

### Entities

Think of entities with attributes as components with props. For example, you can define a text field entity, and users can later add multiple instances of text fields to a form.

```ts
import { createEntity } from "@coltorapps/builder";
import { z } from "zod";

import { labelAttribute } from "./label-attribute";

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [labelAttribute],
  validate(value) {
    return z.string().optional().parse(value);
  },
});
```

### Builders

Think of builders as collections of supported entities. For example, you can have a form builder that allows adding text and select fields to a form, but also another landing page builder that allows adding hero sections and feature sections to a landing page.

```ts
import { createBuilder } from "@coltorapps/builder";

import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [textFieldEntity],
});
```

### Further Reading

For more information about core concepts, React integration, API references, and guides, please visit the documentation at [https://builder.coltorapps.com/](https://builder.coltorapps.com/).

## Development

#### Install dependencies

```sh
pnpm install
```

#### Build and run packages

```sh
pnpm dev
```

## Authors

- Alexandru Stratulat ([@sandulat](https://twitter.com/sandulat))

## License

MIT License
