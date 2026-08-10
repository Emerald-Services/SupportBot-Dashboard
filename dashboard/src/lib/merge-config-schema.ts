import type { ConfigField, ConfigSchema } from "@/lib/config-schemas";
import { collectConfigFields } from "@/lib/generic-config-schema";

function sectionTitleFromPath(path: string): string {
  if (path.startsWith("Ticket.DepartmentSystem.")) return "Ticket Departments";
  if (path.startsWith("Ticket.PrioritySystem.")) return "Ticket Priorities";
  if (path.startsWith("Ticket.")) return "Tickets";
  const top = path.split(".")[0] ?? "Other";
  return top
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Adds any leaf paths from `data` that are not already in `schema`. */
export function mergeSchemaWithData(
  schema: ConfigSchema,
  data: Record<string, unknown>,
): ConfigSchema {
  const known = new Set(schema.flatMap((s) => s.fields.map((f) => f.path)));
  const discovered = collectConfigFields(data).filter((f) => !known.has(f.path));

  if (discovered.length === 0) return schema;

  const result: ConfigSchema = schema.map((sec) => ({
    ...sec,
    fields: [...sec.fields],
  }));

  const bySection = new Map<string, ConfigField[]>();
  for (const field of discovered) {
    const title = sectionTitleFromPath(field.path);
    const list = bySection.get(title) ?? [];
    list.push(field);
    bySection.set(title, list);
  }

  for (const [title, fields] of bySection.entries()) {
    const existing = result.find(
      (s) => s.title.toLowerCase() === title.toLowerCase()
    );

    if (existing) {
      existing.fields.push(...fields);
    } else {
      result.push({
        title,
        description: "These options exist in your config file but are not in the main editor sections.",
        fields: fields.sort((a, b) => a.path.localeCompare(b.path)),
      });
    }
  }

  return result;
}
