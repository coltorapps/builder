import { BasicFormBuilder } from "@/builders/basic-form-builder";
import { Callout } from "@/components/Callout";
import { QuickLink, QuickLinks } from "@/components/QuickLinks";
import { cn } from "@/lib/utils";

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
      <span
        className={cn(
          "mr-px rounded-md border border-neutral-700 bg-neutral-900 px-2 py-px text-sm font-medium tracking-wide text-neutral-200",
          {
            "border-sky-600/50 bg-sky-500/20": content === "array",
            "border-yellow-600/50 bg-yellow-500/20": content === "string",
            "border-orange-600/50 bg-orange-500/20": content === "object",
            "border-pink-600/50 bg-pink-500/20": content === "function",
            "border-green-600/50 bg-green-500/20": content === "boolean",
          },
        )}
      >
        {content}
      </span>
    ),
    attributes: {
      content: { type: String },
    },
  },
};

export default tags;
