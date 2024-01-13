export const navigation = [
  {
    title: "Introduction",
    links: [
      { title: "Getting started", href: "/" },
      { title: "Installation", href: "/docs/installation" },
    ],
  },
  {
    title: "Core Concepts",
    links: [
      { title: "Attributes", href: "/docs/attributes" },
      { title: "Entities", href: "/docs/entities" },
      { title: "Builders", href: "/docs/builders" },
      { title: "Schema", href: "/docs/schema" },
      { title: "Entities Values", href: "/docs/entities-values" },
      { title: "Builder store", href: "/docs/builder-store" },
      { title: "Interpreter store", href: "/docs/interpreter-store" },
    ],
  },
  {
    title: "Core API Reference",
    links: [
      { title: "createAttribute", href: "/docs/api/create-attribute" },
      { title: "createEntity", href: "/docs/api/create-entity" },
      { title: "createBuilder", href: "/docs/api/create-builder" },
      { title: "createBuilderStore", href: "/docs/api/create-builder-store" },
      {
        title: "createInterpreterStore",
        href: "/docs/api/create-interpreter-store",
      },
      { title: "validateSchema", href: "/docs/api/validate-schema" },
      { title: "validateSchemaShape", href: "/docs/api/validate-schema-shape" },
      {
        title: "validateEntitiesValues",
        href: "/docs/api/validate-entities-values",
      },
    ],
  },
  {
    title: "React API Reference",
    links: [
      { title: "useBuilderStore", href: "/docs/api/react/use-builder-store" },
      {
        title: "useBuilderStoreData",
        href: "/docs/api/react/use-builder-store-data",
      },
      {
        title: "createEntityComponent",
        href: "/docs/api/react/create-entity-component",
      },
      {
        title: "<Entities />",
        href: "/docs/api/react/entities",
      },
      {
        title: "createAttributeComponent",
        href: "/docs/api/react/create-attribute-component",
      },
      {
        title: "<EntityAttributes />",
        href: "/docs/api/react/entity-attributes",
      },
    ],
  },
];
