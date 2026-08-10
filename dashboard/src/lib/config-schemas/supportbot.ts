import type { ConfigSchema } from "./types";

const activityTypes = [
  { value: "Playing", label: "Playing" },
  { value: "Watching", label: "Watching" },
  { value: "Listening", label: "Listening" },
  { value: "Competing", label: "Competing" },
  { value: "Streaming", label: "Streaming" },
];

const suggestionModes = [
  { value: "Channel", label: "Channel" },
  { value: "Forum", label: "Forum" },
];

const ticketTypes = [
  { value: "channels", label: "Channels" },
  { value: "threads", label: "Threads" },
];

const ticketSubjects = [
  { value: "description", label: "Channel description" },
  { value: "embed", label: "Embed" },
];

const buttonStyles = [
  { value: "1", label: "Blurple" },
  { value: "2", label: "Grey" },
  { value: "3", label: "Green" },
  { value: "4", label: "Red" },
];

export const supportbotSchema: ConfigSchema = [
  {
    title: "General",
    fields: [
      { path: "General.Name", label: "Bot name", type: "text" },
      {
        path: "General.Token",
        label: "Bot token",
        type: "secret",
        description: "Masked in the dashboard. Your real token is preserved on save.",
      },
      {
        path: "General.GuildId",
        label: "Server (guild) ID",
        type: "discordId",
        description:
          "Right-click your Discord server icon → Copy Server ID. The bot should only stay in this server.",
        placeholder: "Discord server snowflake ID",
      },
      {
        path: "General.Addons.Enabled",
        label: "Addons enabled",
        type: "boolean",
      },
    ],
  },
  {
    title: "Database",
    fields: [
      {
        path: "Database.Driver",
        label: "Database Engine",
        type: "select",
        options: [
          { value: "sqlite", label: "SQLite (Local File)" },
          { value: "mysql", label: "MySQL / MariaDB" },
        ],
        description: "Select SQLite for zero-config file storage, or MySQL for external host servers.",
      },
      {
        path: "Database.MySQL.Host",
        label: "MySQL Host",
        type: "text",
        placeholder: "127.0.0.1 or localhost",
        description: "Hostname or IP address of your MySQL database server.",
      },
      {
        path: "Database.MySQL.Port",
        label: "MySQL Port",
        type: "number",
        placeholder: "3306",
      },
      {
        path: "Database.MySQL.Database",
        label: "Database Name",
        type: "text",
        placeholder: "supportbot",
      },
      {
        path: "Database.MySQL.User",
        label: "Database User",
        type: "text",
        placeholder: "root",
      },
      {
        path: "Database.MySQL.Password",
        label: "Database Password",
        type: "secret",
        placeholder: "••••••••••••",
      },
      {
        path: "Database.MySQL.ConnectionLimit",
        label: "Connection Pool Limit",
        type: "number",
        placeholder: "10",
        description: "Maximum simultaneous connections in the MySQL pool (default 10).",
      },
      {
        path: "Database.SQLite.File",
        label: "SQLite Database File Path",
        type: "text",
        placeholder: "./Data/supportbot.db",
      },
    ],
  },
  {
    title: "Activity",
    fields: [
      { path: "Activity.Status", label: "Status text", type: "text" },
      {
        path: "Activity.Type",
        label: "Activity type",
        type: "select",
        options: activityTypes,
      },
      {
        path: "Activity.StreamingURL",
        label: "Streaming URL",
        type: "text",
        description: "Required when type is Streaming.",
      },
    ],
  },
  {
    title: "Embeds",
    fields: [
      { path: "Embed.Colours.General", label: "General colour", type: "color" },
      { path: "Embed.Colours.Success", label: "Success colour", type: "color" },
      { path: "Embed.Colours.Error", label: "Error colour", type: "color" },
      { path: "Embed.Colours.Warn", label: "Warn colour", type: "color" },
      { path: "Embed.Footer", label: "Footer text", type: "text" },
    ],
  },
  {
    title: "Roles",
    fields: [
      {
        path: "Roles.AutoRole.Enabled",
        label: "Auto role enabled",
        type: "boolean",
      },
      {
        path: "Roles.AutoRole.Role",
        label: "Auto role",
        type: "discordRole",
      },
      {
        path: "Roles.StaffMember.Staff",
        label: "Staff role",
        type: "discordRole",
      },
      {
        path: "Roles.StaffMember.Admin",
        label: "Admin role",
        type: "discordRole",
      },
      {
        path: "Roles.StaffMember.Moderator",
        label: "Moderator role",
        type: "discordRole",
      },
      {
        path: "Roles.Mod.AllowSupportStaff",
        label: "Allow support staff /mod",
        type: "boolean",
      },
    ],
  },
  {
    title: "Welcome & leave",
    fields: [
      { path: "Welcome.Enabled", label: "Welcome enabled", type: "boolean" },
      {
        path: "Welcome.Channel",
        label: "Welcome channel",
        type: "discordChannel",
      },
      { path: "Leave.Enabled", label: "Leave enabled", type: "boolean" },
      {
        path: "Leave.Channel",
        label: "Leave channel",
        type: "discordChannel",
      },
    ],
  },
  {
    title: "Suggestions",
    fields: [
      {
        path: "Suggestions.Mode",
        label: "Mode",
        type: "select",
        options: suggestionModes,
      },
      {
        path: "Suggestions.Channel",
        label: "Suggestions channel",
        type: "discordChannel",
      },
      {
        path: "Suggestions.ForumChannel",
        label: "Forum channel",
        type: "discordChannel",
      },
      {
        path: "Suggestions.UpvoteEmoji",
        label: "Upvote emoji",
        type: "emoji",
      },
      {
        path: "Suggestions.DownvoteEmoji",
        label: "Downvote emoji",
        type: "emoji",
      },
      { path: "Suggestions.OwnSuggestion", label: "Own suggestion votes", type: "boolean" },
      { path: "Suggestions.ShowUsers", label: "Show users", type: "boolean" },
      {
        path: "Suggestions.UpvoteTitle",
        label: "Upvote button title",
        type: "text",
      },
      {
        path: "Suggestions.DownvoteTitle",
        label: "Downvote button title",
        type: "text",
      },
      {
        path: "Suggestions.Threads.Enabled",
        label: "Suggestion threads",
        type: "boolean",
      },
      {
        path: "Suggestions.Threads.Title",
        label: "Thread title",
        type: "text",
      },
      {
        path: "Suggestions.Threads.Reason",
        label: "Thread reason",
        type: "text",
      },
      {
        path: "Suggestions.Buttons.Upvote",
        label: "Upvote button style",
        type: "select",
        options: buttonStyles,
      },
      {
        path: "Suggestions.Buttons.Downvote",
        label: "Downvote button style",
        type: "select",
        options: buttonStyles,
      },
      {
        path: "Suggestions.Buttons.RemoveVote",
        label: "Remove vote button style",
        type: "select",
        options: buttonStyles,
      },
      {
        path: "Suggestions.Buttons.RemoveVote_Title",
        label: "Remove vote title",
        type: "text",
      },
      {
        path: "Suggestions.Tags.Created",
        label: "Tag: created",
        type: "text",
      },
      {
        path: "Suggestions.Tags.Considering",
        label: "Tag: considering",
        type: "text",
      },
      {
        path: "Suggestions.Tags.Solved",
        label: "Tag: solved",
        type: "text",
      },
      {
        path: "Suggestions.Tags.Denied",
        label: "Tag: denied",
        type: "text",
      },
    ],
  },
  {
    title: "Tickets",
    fields: [
      {
        path: "Ticket.TicketType",
        label: "Ticket type",
        type: "select",
        options: ticketTypes,
      },
      {
        path: "Ticket.UserManagement.DMOnAdd",
        label: "DM when added to ticket",
        type: "boolean",
      },
      {
        path: "Ticket.UserManagement.DMOnRemove",
        label: "DM when removed from ticket",
        type: "boolean",
      },
      {
        path: "Ticket.UserManagement.DMTranscript",
        label: "DM transcript on close",
        type: "boolean",
      },
      {
        path: "Ticket.TicketHome",
        label: "Ticket home channel",
        type: "discordChannel",
      },
      {
        path: "Ticket.TicketChannelsCategory",
        label: "Ticket category",
        type: "discordCategory",
      },
      {
        path: "Ticket.TicketChannelsCategory2",
        label: "Overflow ticket category",
        type: "discordCategory",
        description: "Used when the first category is full.",
      },
      {
        path: "Ticket.TicketArchiveCategory",
        label: "Archive category",
        type: "discordCategory",
      },
      { path: "Ticket.Channel", label: "Channel prefix", type: "text" },
      {
        path: "Ticket.TicketSubject",
        label: "Ticket subject display",
        type: "select",
        options: ticketSubjects,
      },
      { path: "Ticket.Timeout", label: "Close timeout (minutes)", type: "number" },
      {
        path: "Ticket.TicketsPerUser",
        label: "Tickets per user",
        type: "number",
      },
      { path: "Ticket.TicketReason", label: "Require reason", type: "boolean" },
      {
        path: "Ticket.Close.StaffOnly",
        label: "Close staff only",
        type: "boolean",
      },
      {
        path: "Ticket.Invites.StaffOnly",
        label: "Ticket invites staff only",
        type: "boolean",
      },
      {
        path: "Ticket.ClaimTickets.Enabled",
        label: "Claim tickets",
        type: "boolean",
      },
      {
        path: "Ticket.ClaimTickets.Channel",
        label: "Claim log channel",
        type: "discordChannel",
      },
      {
        path: "Ticket.ClaimTickets.ClaimAcceptTime",
        label: "Claim accept time (ms)",
        type: "number",
      },
      {
        path: "Ticket.ClaimTickets.ButtonTitle",
        label: "Claim button title",
        type: "text",
      },
      {
        path: "Ticket.ClaimTickets.ButtonEmoji",
        label: "Claim button emoji",
        type: "emoji",
      },
      {
        path: "Ticket.ClaimTickets.Button",
        label: "Claim button style",
        type: "select",
        options: buttonStyles,
      },
      {
        path: "Ticket.ReviewSystem.Enabled",
        label: "Review system",
        type: "boolean",
      },
      {
        path: "Ticket.ReviewSystem.Channel",
        label: "Review channel",
        type: "discordChannel",
      },
      {
        path: "Ticket.ReviewSystem.UseModal",
        label: "Review uses modal",
        type: "boolean",
      },
      {
        path: "Ticket.Log.TicketDataLog",
        label: "Ticket data log channel",
        type: "discordChannel",
      },
      {
        path: "Ticket.Log.TickeDataTitle",
        label: "Ticket data log title",
        type: "text",
      },
      {
        path: "Ticket.Log.TicketBlacklistLog",
        label: "Blacklist log channel",
        type: "discordChannel",
      },
      {
        path: "Ticket.AIMode.Enabled",
        label: "AI mode in tickets",
        type: "boolean",
      },
      {
        path: "Ticket.AIMode.ThreadName",
        label: "AI thread name",
        type: "text",
      },
      {
        path: "Ticket.AIMode.WelcomeMessage",
        label: "AI welcome message",
        type: "textarea",
      },
      {
        path: "Ticket.Questions.Enabled",
        label: "Ticket questions",
        type: "boolean",
      },
      {
        path: "Ticket.Questions.List",
        label: "Default questions",
        type: "stringList",
      },
    ],
  },
  {
    title: "Ticket Departments",
    description: "Configure ticket department channels, emojis, staff roles, and custom department questions.",
    fields: [
      {
        path: "Ticket.DepartmentSystem.Enabled",
        label: "Departments enabled",
        type: "boolean",
      },
      {
        path: "Ticket.DepartmentSystem.Placeholder",
        label: "Department placeholder",
        type: "text",
      },
      {
        path: "Ticket.DepartmentSystem.DefaultDepartment",
        label: "Default department key",
        type: "text",
      },
    ],
  },
  {
    title: "Ticket Priorities",
    description: "Configure ticket priority levels and emojis.",
    fields: [
      {
        path: "Ticket.PrioritySystem.Enabled",
        label: "Priority system",
        type: "boolean",
      },
      {
        path: "Ticket.PrioritySystem.DefaultPriority",
        label: "Default priority",
        type: "text",
      },
      {
        path: "Ticket.PrioritySystem.AllowUsersToChooseOnOpen",
        label: "User picks priority on open",
        type: "boolean",
      },
    ],
  },
  {
    title: "Voice tickets",
    fields: [
      { path: "VoiceTickets.Name", label: "VC name format", type: "text" },
      {
        path: "VoiceTickets.Category",
        label: "VC category",
        type: "discordCategory",
      },
    ],
  },
  {
    title: "Logging",
    fields: [
      {
        path: "MessageDelete.Channel",
        label: "Message delete log channel",
        type: "discordChannel",
      },
      {
        path: "MessageDelete.Colour",
        label: "Message delete embed colour",
        type: "color",
      },
      {
        path: "MessageUpdate.Channel",
        label: "Message update log channel",
        type: "discordChannel",
      },
      {
        path: "MessageUpdate.Colour",
        label: "Message update embed colour",
        type: "color",
      },
      {
        path: "Translate.TranslateLog",
        label: "Translate log channel",
        type: "discordChannel",
      },
    ],
  },
  {
    title: "Buttons & menus",
    description: "Ticket panel and control button labels and styles.",
    fields: [
      { path: "Buttons.General.Delete", label: "Delete emoji", type: "emoji" },
      {
        path: "Buttons.General.DeleteStyle",
        label: "Delete button style",
        type: "select",
        options: buttonStyles,
      },
      {
        path: "Buttons.Voice.TicketDeleteText",
        label: "Voice delete label",
        type: "text",
      },
      {
        path: "Buttons.Tickets.ClaimEmoji",
        label: "Ticket claim emoji",
        type: "emoji",
      },
      {
        path: "Buttons.Tickets.ClaimStyle",
        label: "Ticket claim style",
        type: "select",
        options: buttonStyles,
      },
      {
        path: "SelectMenus.Tickets.PanelEmoji",
        label: "Panel menu emoji",
        type: "emoji",
      },
      {
        path: "SelectMenus.Tickets.CloseEmoji",
        label: "Close menu emoji",
        type: "emoji",
      },
    ],
  },
];
