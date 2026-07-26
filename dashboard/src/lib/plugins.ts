import type { IconSvgElement } from "@hugeicons/react";
import {
  AiBrain01Icon,
  CommandIcon,
  File02Icon,
  Message01Icon,
  Settings02Icon,
  Ticket01Icon,
} from "@hugeicons/core-free-icons";

export type PluginCategory =
  | "all"
  | "tickets"
  | "community"
  | "server";

export interface PluginModule {
  id: string;
  title: string;
  description: string;
  icon: IconSvgElement;
  href: string;
  category: PluginCategory;
}

export const plugins: PluginModule[] = [
  {
    id: "tickets",
    title: "Ticket panel",
    description:
      "Create and manage support tickets with departments, priorities, and AI assistance.",
    icon: Ticket01Icon,
    href: "/configs?file=ticket-panel",
    category: "tickets",
  },
  {
    id: "supportbot",
    title: "Core bot settings",
    description:
      "General bot options, activity status, embed colours, roles, and welcome messages.",
    icon: Settings02Icon,
    href: "/configs?file=supportbot",
    category: "server",
  },
  {
    id: "transcripts",
    title: "Ticket transcripts",
    description:
      "Browse and preview HTML transcripts saved when tickets are closed.",
    icon: File02Icon,
    href: "/transcripts",
    category: "tickets",
  },
  {
    id: "suggestions",
    title: "Suggestions",
    description:
      "Configure suggestion channels, voting emojis, and forum thread behaviour.",
    icon: Message01Icon,
    href: "/configs?file=messages",
    category: "community",
  },
  {
    id: "ai",
    title: "AI assistant",
    description:
      "SupportBot AI mode settings for in-ticket conversational help.",
    icon: AiBrain01Icon,
    href: "/configs?file=supportbot-ai",
    category: "community",
  },
  {
    id: "commands",
    title: "Commands",
    description:
      "Enable or disable slash commands and customise command permissions.",
    icon: CommandIcon,
    href: "/configs?file=commands",
    category: "server",
  },
];

export const pluginTabs: { id: PluginCategory | "all"; label: string }[] = [
  { id: "all", label: "All modules" },
  { id: "tickets", label: "Tickets" },
  { id: "community", label: "Community" },
  { id: "server", label: "Server" },
];
