import type { ConfigField, ConfigSchema, FieldType } from "@/lib/config-schemas";

function labelFromKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferFieldType(key: string, value: unknown): FieldType {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "stringList";

  if (typeof value === "string") {
    const k = key.toLowerCase();
    if (/prefix/.test(k)) return "text";
    if (/emoji/.test(k)) return "emoji";
    if (/guild.?id|guild_id/.test(k)) return "discordId";
    if (/category/.test(k)) return "discordCategory";
    if (/channel|forum/.test(k)) return "discordChannel";
    if (/role|staff|admin|moderator/.test(k)) return "discordRole";
    if (value.length > 100) return "textarea";
    return "text";
  }

  return "text";
}

export function collectConfigFields(
  obj: Record<string, unknown>,
  prefix = "",
): ConfigField[] {
  const fields: ConfigField[] = [];

  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(val)) {
      const hasObjects =
        val.length > 0 &&
        typeof val[0] === "object" &&
        val[0] !== null &&
        !Array.isArray(val[0]);
      if (hasObjects) continue;
      fields.push({
        path,
        label: labelFromKey(key),
        type: "stringList",
      });
      continue;
    }

    if (
      val &&
      typeof val === "object" &&
      Object.keys(val as object).length > 0
    ) {
      fields.push(...collectConfigFields(val as Record<string, unknown>, path));
      continue;
    }

    fields.push({
      path,
      label: labelFromKey(key),
      type: inferFieldType(key, val),
    });
  }

  return fields;
}

export function schemaFromObject(data: Record<string, unknown>): ConfigSchema {
  const fields = collectConfigFields(data);
  if (fields.length === 0) {
    return [
      {
        title: "Configuration",
        fields: [],
      },
    ];
  }

  return [
    {
      title: "Settings",
      description: "Values from this addon’s config file.",
      fields,
    },
  ];
}
