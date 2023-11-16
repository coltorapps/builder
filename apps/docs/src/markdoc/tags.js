import { BasicFormBuilder } from "@/builders/basic-form-builder";
import { Callout } from "@/components/Callout";
import { QuickLink, QuickLinks } from "@/components/QuickLinks";

const tags = {
  callout: {
    attributes: {
      title: { type: String },
      type: {
        type: String,
        default: "note",
        matches: ["note", "warning"],
        errorLevel: "critical",
      },
    },
    render: Callout,
  },
  figure: {
    selfClosing: true,
    attributes: {
      src: { type: String },
      alt: { type: String },
      caption: { type: String },
    },
    render: ({ src, alt = "", caption }) => (
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} />
        <figcaption>{caption}</figcaption>
      </figure>
    ),
  },
  "quick-links": {
    render: QuickLinks,
  },
  "quick-link": {
    selfClosing: true,
    render: QuickLink,
    attributes: {
      title: { type: String },
      description: { type: String },
      icon: { type: String },
      href: { type: String },
    },
  },
  "basic-form-builder": {
    render: BasicFormBuilder,
    selfClosing: true,
  },
  badge: {
    render: ({ content }) => (
      <span className="mr-px rounded-md border bg-neutral-900 px-2 py-px text-sm font-medium tracking-wide text-neutral-200">
        {content}
      </span>
    ),
    attributes: {
      content: { type: String },
    },
  },
};

export default tags;
