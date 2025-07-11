import { promises as fs } from "fs";
import path from "path";

export const dynamic = "error";

const DOCS_DIR = path.join(process.cwd(), "src", "app", "docs");

async function getAllMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return getAllMarkdownFiles(fullPath);
      }

      if (entry.name.endsWith(".md")) {
        return [fullPath];
      }

      return [];
    }),
  );

  return files.flat();
}

export async function GET() {
  const files = await getAllMarkdownFiles(DOCS_DIR);

  const contents = await Promise.all(
    files.map(async (filePath) => {
      const content = await fs.readFile(filePath, "utf8");

      const cleaned = content
        .replace(/{%\s*class="[^"]*"\s*%}/g, "")
        .replace(/{%\s*badge\s+content="([^"]+)"\s*\/%}/g, "$1")
        .replace(
          /{%\s*callout\s+title="([^"]+)"(?:\s+type="([^"]+)")?\s*%}([\s\S]*?){%\s*\/callout\s*%}/g,
          (_match, title, type, body) => {
            const emoji = type === "warning" ? "⚠️" : "ℹ️";

            return `**${emoji} ${title}**\n\n${String(body).trim()}`;
          },
        );

      return `--- ${path.relative(DOCS_DIR, filePath)} ---\n${cleaned}`;
    }),
  );

  return new Response(contents.join("\n\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
