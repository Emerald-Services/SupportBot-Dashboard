import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshIcon,
  Link01Icon,
  Clock01Icon,
  Comment01Icon,
  SentIcon,
  UserIcon,
  Maximize01Icon,
  Minimize01Icon,
  Cancel01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  Tick01Icon,
  Attachment01Icon,
  Image01Icon,
  Ticket01Icon,
  Search01Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons";
import { api, GuildResources } from "@/api/client";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getByPath } from "@/lib/config-utils";
import { formatUptime } from "@/api/client";
import {
  useRealtimeStream,
  StreamTicketMessage,
  StreamTicketMessageDeleted,
  StreamTicketMessageUpdated,
  StreamTicketCreated,
  StreamTicketClosed,
} from "@/hooks/useRealtimeStream";
import { toast } from "sonner";

interface TicketItem {
  ticket_id: string;
  user_id: string;
  subject: string;
  description: string;
  department: string;
  priority: string;
  created_at: number;
}

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface EmbedItem {
  title?: string | null;
  description?: string | null;
  color?: string | null;
  author?: { name?: string; iconURL?: string } | null;
  fields?: EmbedField[];
  footer?: { text?: string; iconURL?: string } | null;
  thumbnail?: { url?: string } | null;
  image?: { url?: string } | null;
  timestamp?: string | number | null;
}

interface ComponentSubItem {
  type?: number | string;
  label?: string | null;
  style?: number | string | null;
  url?: string | null;
  customId?: string | null;
  emoji?: string | null;
}

interface ComponentItem {
  type?: number | string;
  components?: ComponentSubItem[];
}

interface MessageItem {
  id: string;
  author: {
    id: string;
    username: string;
    globalName: string;
    avatar: string;
    bot: boolean;
    isDashboard?: boolean;
  };
  content: string;
  containerColor?: string | null;
  embeds?: EmbedItem[];
  components?: ComponentItem[];
  attachments?: { id: string; name: string; url: string; contentType?: string }[];
  createdAt: number;
}

interface PendingAttachment {
  filename: string;
  data: string;
  previewUrl?: string;
  sizeMb?: string;
}

export default function Tickets() {
  const [list, setList] = useState<TicketItem[]>([]);
  const [guildId, setGuildId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Department system enablement state
  const [departmentsEnabled, setDepartmentsEnabled] = useState<boolean>(true);
  const [configuredDepartments, setConfiguredDepartments] = useState<
    { id: string; name: string; emoji?: string }[]
  >([]);

  useEffect(() => {
    try {
      api.getConfigJson("supportbot")
        .then((res) => {
          if (res && res.data && typeof res.data === "object") {
            const ticketType = getByPath(res.data, "Ticket.TicketType");
            const deptVal = getByPath(res.data, "Ticket.DepartmentSystem.Enabled");
            if (typeof deptVal === "boolean") {
              setDepartmentsEnabled(ticketType !== "threads" && deptVal);
            }
            const deptsObj = getByPath(res.data, "Ticket.DepartmentSystem.Departments");
            if (deptsObj && typeof deptsObj === "object") {
              const deptsList = Object.entries(deptsObj).map(([key, val]: [string, any]) => ({
                id: key,
                name: val && typeof val === "object" && val.Name ? (val.Name as string) : key,
                emoji: val && typeof val === "object" && val.Emoji ? (val.Emoji as string) : "🎫",
              }));
              if (deptsList.length > 0) {
                setConfiguredDepartments(deptsList);
                setCreateDept((prev) => {
                  const exists = deptsList.some((d) => d.id === prev);
                  return exists ? prev : deptsList[0].id;
                });
              }
            }
          }
        })
        .catch(() => {});
    } catch {
      // Fallback silently if config fetch fails
    }
  }, []);

  // Filter state
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const availableDepartments = useMemo(() => {
    const deptsSet = new Set<string>();
    if (Array.isArray(list)) {
      list.forEach((ticket) => {
        if (ticket && ticket.department && typeof ticket.department === "string") {
          const d = ticket.department.trim().toLowerCase();
          if (d) deptsSet.add(d);
        }
      });
    }
    return Array.from(deptsSet).sort();
  }, [list]);

  const filteredTickets = useMemo(() => {
    if (!Array.isArray(list)) return [];
    return list.filter((ticket) => {
      if (!ticket) return false;
      if (departmentsEnabled && selectedDeptFilter !== "all" && ticket.department?.toLowerCase() !== selectedDeptFilter.toLowerCase()) {
        return false;
      }
      if (selectedPriorityFilter !== "all" && ticket.priority?.toLowerCase() !== selectedPriorityFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const subjectMatch = ticket.subject?.toLowerCase().includes(q);
        const idMatch = ticket.ticket_id?.toLowerCase().includes(q);
        const userMatch = ticket.user_id?.toLowerCase().includes(q);
        const deptMatch = departmentsEnabled && ticket.department?.toLowerCase().includes(q);
        if (!subjectMatch && !idMatch && !userMatch && !deptMatch) {
          return false;
        }
      }
      return true;
    });
  }, [list, departmentsEnabled, selectedDeptFilter, selectedPriorityFilter, searchQuery]);

  // Live Chat state
  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [fullView, setFullView] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);

  // Guild Resources for `@` mentions
  const [resources, setResources] = useState<GuildResources | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  // Edit & Close message state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<TicketItem | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);

  // Create Direct Ticket State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDept, setCreateDept] = useState("general");
  const [createSubject, setCreateSubject] = useState("");
  const [createUserId, setCreateUserId] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateTicket = async () => {
    if (!createSubject.trim()) {
      toast.error("Please enter a subject or reason for the ticket.");
      return;
    }
    setCreating(true);
    try {
      const res = await api.createTicket({
        department: departmentsEnabled ? createDept : undefined,
        subject: createSubject.trim(),
        userId: createUserId.trim() || undefined,
      });
      toast.success(res.message || "Ticket opened successfully!");
      setCreateModalOpen(false);
      setCreateSubject("");
      setCreateUserId("");
      void loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open ticket.");
    } finally {
      setCreating(false);
    }
  };

  const promptCloseTicket = (ticket: TicketItem) => {
    setTicketToClose(ticket);
    setCloseReason("Closed via Web Dashboard");
    setCloseModalOpen(true);
  };

  const confirmCloseTicket = async () => {
    if (!ticketToClose) return;

    const targetId = ticketToClose.ticket_id;
    setClosingTicketId(targetId);
    try {
      await api.closeTicket(targetId, closeReason || "Closed via Web Dashboard");
      toast.success("Ticket closed and transcript saved.");
      setList((prev) => prev.filter((t) => t.ticket_id !== targetId));
      if (activeTicket?.ticket_id === targetId) {
        setChatOpen(false);
        setFullView(false);
        setActiveTicket(null);
      }
      setCloseModalOpen(false);
      setTicketToClose(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close ticket.");
    } finally {
      setClosingTicketId(null);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listOpenTickets();
      if (res.data) {
        setGuildId(res.data.guildId);
        setList(res.data.tickets.sort((a, b) => b.created_at - a.created_at));
        if (typeof res.data.departmentsEnabled === "boolean") {
          setDepartmentsEnabled(res.data.departmentsEnabled);
        }
        if (Array.isArray(res.data.configuredDepartments) && res.data.configuredDepartments.length > 0) {
          setConfiguredDepartments(res.data.configuredDepartments);
          setCreateDept((prev) => {
            const exists = res.data?.configuredDepartments?.some((d) => d.id === prev);
            return exists ? prev : res.data!.configuredDepartments![0].id;
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load open tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Load guild roles for mentions
  useEffect(() => {
    api
      .getGuildResources()
      .then((res) => {
        if (res.data) setResources(res.data);
      })
      .catch(() => {});
  }, []);

  // Real-time SSE handlers
  const handleTicketMessage = useCallback(
    (eventData: StreamTicketMessage) => {
      if (activeTicket && eventData.ticketId === activeTicket.ticket_id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === eventData.message.id)) return prev;
          return [...prev, eventData.message];
        });
        setTimeout(scrollToBottom, 100);
      }
    },
    [activeTicket]
  );

  const handleTicketMessageDeleted = useCallback(
    (data: StreamTicketMessageDeleted) => {
      if (activeTicket && data.ticketId === activeTicket.ticket_id) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    },
    [activeTicket]
  );

  const handleTicketMessageUpdated = useCallback(
    (data: StreamTicketMessageUpdated) => {
      if (activeTicket && data.ticketId === activeTicket.ticket_id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, content: data.content } : m))
        );
      }
    },
    [activeTicket]
  );

  const handleTicketCreated = useCallback((newTicket: StreamTicketCreated) => {
    setList((prev) => {
      if (prev.some((t) => t.ticket_id === newTicket.ticket_id)) return prev;
      return [newTicket, ...prev];
    });
    toast.info("New Ticket Created", {
      description: `#${newTicket.ticket_id} - ${newTicket.subject || "No Subject"}`,
    });
  }, []);

  const handleTicketClosed = useCallback(
    (data: StreamTicketClosed) => {
      setList((prev) => prev.filter((t) => t.ticket_id !== data.ticket_id));
      if (activeTicket?.ticket_id === data.ticket_id) {
        toast.warning("Active ticket was closed in Discord.");
      }
    },
    [activeTicket]
  );

  useRealtimeStream({
    onTicketMessage: handleTicketMessage,
    onTicketMessageDeleted: handleTicketMessageDeleted,
    onTicketMessageUpdated: handleTicketMessageUpdated,
    onTicketCreated: handleTicketCreated,
    onTicketClosed: handleTicketClosed,
  });

  const openChat = async (ticket: TicketItem) => {
    setActiveTicket(ticket);
    setChatOpen(true);
    setLoadingMessages(true);
    setMessages([]);
    setPendingFiles([]);
    setEditingMsgId(null);
    try {
      const res = await api.getTicketMessages(ticket.ticket_id);
      if (res.data?.messages) {
        setMessages(res.data.messages);
        setTimeout(scrollToBottom, 150);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPendingFiles((prev) => [
          ...prev,
          {
            filename: file.name,
            data: dataUrl,
            previewUrl: file.type.startsWith("image/") ? dataUrl : undefined,
            sizeMb: (file.size / 1024 / 1024).toFixed(2),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyText.trim() && !pendingFiles.length) || !activeTicket || sending) return;

    const content = replyText.trim();
    const filesToSend = [...pendingFiles];

    setSending(true);
    setReplyText("");
    setPendingFiles([]);
    setShowMentionMenu(false);

    try {
      const meRes = await api.me().catch(() => null);
      const staffName = meRes?.data?.username || "Staff";

      const res = await api.sendTicketReply(
        activeTicket.ticket_id,
        content,
        staffName,
        filesToSend.map((f) => ({ filename: f.filename, data: f.data }))
      );

      if (res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data!.id)) return prev;
          return [
            ...prev,
            {
              id: res.data!.id,
              author: res.data!.author,
              content: res.data!.content,
              attachments: res.data!.attachments || [],
              createdAt: res.data!.createdAt,
            },
          ];
        });
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply to Discord.");
      setReplyText(content);
      setPendingFiles(filesToSend);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeTicket) return;
    try {
      await api.deleteTicketMessage(activeTicket.ticket_id, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success("Message deleted in Discord.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete message.");
    }
  };

  const startEdit = (msg: MessageItem) => {
    setEditingMsgId(msg.id);
    setEditingContent(msg.content);
  };

  const cancelEdit = () => {
    setEditingMsgId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!activeTicket || !editingContent.trim()) return;
    try {
      await api.editTicketMessage(activeTicket.ticket_id, messageId, editingContent.trim());
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: editingContent.trim() } : m))
      );
      setEditingMsgId(null);
      toast.success("Message updated in Discord.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to edit message.");
    }
  };

  // Handle `@` mention typing in text input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReplyText(val);

    const cursor = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    if (lastAtPos !== -1 && !textBeforeCursor.slice(lastAtPos).includes(" ")) {
      const query = textBeforeCursor.slice(lastAtPos + 1).toLowerCase();
      setMentionQuery(query);
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (tag: string, id: string, isRole: boolean) => {
    const cursor = replyText.lastIndexOf("@");
    const prefix = replyText.slice(0, cursor);
    const mentionTag = isRole ? `<@&${id}>` : `<@${id}>`;
    setReplyText(`${prefix}${mentionTag} `);
    setShowMentionMenu(false);
  };

  const getTimeElapsed = (createdAt: number) => {
    const seconds = Math.floor((Date.now() - createdAt) / 1000);
    return formatUptime(seconds);
  };

  const formatMessageTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render message text with Discord Markdown formatting, mentions & inline media
  const renderFormattedText = (text: string): React.ReactNode => {
    if (!text) return null;

    // Discord markdown tokenizer pattern
    const pattern =
      /(```[\s\S]*?```|`[^`]+`|\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|\|\|[\s\S]+?\|\||<@!?&?\d+>|^###\s[^\n]+|^##\s[^\n]+|^-#\s[^\n]+|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/gm;

    const parts = text.split(pattern);

    return parts.map((part, i) => {
      if (!part) return null;

      // Discord Subtext -# Subtext
      if (part.startsWith("-# ")) {
        return (
          <span key={i} className="text-xs text-muted-foreground font-medium block my-0.5 opacity-80">
            {renderFormattedText(part.slice(3))}
          </span>
        );
      }

      // Discord H2 Heading ## Heading
      if (part.startsWith("## ")) {
        return (
          <span key={i} className="text-base font-bold text-foreground block my-1 tracking-tight">
            {renderFormattedText(part.slice(3))}
          </span>
        );
      }

      // Discord H3 Heading ### Heading
      if (part.startsWith("### ")) {
        return (
          <span key={i} className="text-sm font-bold text-foreground block my-0.5">
            {renderFormattedText(part.slice(4))}
          </span>
        );
      }

      // Code Block ```code```
      if (part.startsWith("```") && part.endsWith("```") && part.length >= 6) {
        const inner = part.slice(3, -3).replace(/^[a-z0-9_-]+\n/i, "");
        return (
          <pre
            key={i}
            className="bg-black/60 p-2.5 rounded-lg text-xs font-mono my-1.5 border border-border overflow-x-auto text-emerald-400 font-mono"
          >
            <code>{inner}</code>
          </pre>
        );
      }

      // Inline Code `code`
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={i}
            className="bg-black/50 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-300 border border-border/40"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold Italic ***text***
      if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
        return (
          <strong key={i} className="font-bold italic">
            {renderFormattedText(part.slice(3, -3))}
          </strong>
        );
      }

      // Bold **text**
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return (
          <strong key={i} className="font-bold">
            {renderFormattedText(part.slice(2, -2))}
          </strong>
        );
      }

      // Underline __text__
      if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
        return (
          <span key={i} className="underline underline-offset-2">
            {renderFormattedText(part.slice(2, -2))}
          </span>
        );
      }

      // Strikethrough ~~text~~
      if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
        return (
          <span key={i} className="line-through opacity-80">
            {renderFormattedText(part.slice(2, -2))}
          </span>
        );
      }

      // Spoiler ||text||
      if (part.startsWith("||") && part.endsWith("||") && part.length > 4) {
        return (
          <span
            key={i}
            className="bg-secondary text-transparent hover:text-foreground hover:bg-secondary/50 px-1.5 py-0.5 rounded transition-all cursor-pointer select-none border border-border/30"
            title="Click to reveal spoiler"
          >
            {part.slice(2, -2)}
          </span>
        );
      }

      // User Mention <@12345> or <@!12345>
      const userMentionMatch = part.match(/^<@!?(\d+)>$/);
      if (userMentionMatch) {
        const userId = userMentionMatch[1];
        const userMap = new Map<string, string>();
        if (activeTicket) {
          userMap.set(activeTicket.user_id, "Ticket Author");
        }
        messages.forEach((m) => {
          if (m.author?.id) {
            userMap.set(m.author.id, m.author.globalName || m.author.username);
          }
        });
        const knownName = userMap.get(userId);

        return (
          <span
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-xs bg-primary/20 text-primary mx-0.5"
            title={`User ID: ${userId}`}
          >
            @{knownName || `User`}
          </span>
        );
      }

      // Role Mention <@&12345>
      const roleMentionMatch = part.match(/^<@&(\d+)>$/);
      if (roleMentionMatch) {
        const roleId = roleMentionMatch[1];
        const role = resources?.roles?.find((r) => r.id === roleId);
        return (
          <span
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-xs bg-amber-500/20 text-amber-400 mx-0.5"
          >
            @{role ? role.name : `Role (${roleId})`}
          </span>
        );
      }

      // Markdown Link [Label](URL)
      const mdLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (mdLinkMatch) {
        const label = mdLinkMatch[1];
        const url = mdLinkMatch[2];
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline hover:opacity-80 break-all"
          >
            {label}
          </a>
        );
      }

      // Plain URL (Image/GIF vs Link)
      if (/^https?:\/\/[^\s]+$/i.test(part)) {
        const isImageOrGif =
          /\.(gif|jpe?g|png|webp)(\?[^\s]*)?$/i.test(part) ||
          /cdn\.discordapp\.com\/(emojis|attachments)\//i.test(part) ||
          /images\.discordapp\.net\//i.test(part) ||
          /media\d*\.giphy\.com\//i.test(part);

        if (isImageOrGif) {
          return (
            <span key={i} className="block my-1">
              <img
                src={part}
                alt="GIF/Image"
                className="max-h-64 rounded-lg border border-border object-contain hover:opacity-95 transition-opacity"
                loading="lazy"
              />
            </span>
          );
        }

        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline hover:opacity-80 break-all"
          >
            {part}
          </a>
        );
      }

      return part;
    });
  };

  // Render Rich Media Attachments (Images, Videos, Audio, Files)
  const renderAttachments = (attachments?: MessageItem["attachments"]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="space-y-2 mt-1">
        {attachments.map((att) => {
          const isImage =
            att.contentType?.startsWith("image/") ||
            /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name);
          const isVideo =
            att.contentType?.startsWith("video/") ||
            /\.(mp4|webm|mov|mkv)$/i.test(att.name);
          const isAudio =
            att.contentType?.startsWith("audio/") ||
            /\.(mp3|wav|ogg|m4a)$/i.test(att.name);

          if (isImage) {
            return (
              <div key={att.id} className="rounded-lg overflow-hidden border border-border bg-black/40">
                <a href={att.url} target="_blank" rel="noreferrer">
                  <img
                    src={att.url}
                    alt={att.name}
                    className="max-h-80 max-w-full object-contain hover:opacity-95 transition-opacity"
                    loading="lazy"
                  />
                </a>
              </div>
            );
          }

          if (isVideo) {
            return (
              <div key={att.id} className="rounded-lg overflow-hidden border border-border bg-black">
                <video src={att.url} controls className="max-h-80 max-w-full" />
              </div>
            );
          }

          if (isAudio) {
            return (
              <div key={att.id} className="p-2 border border-border rounded-lg bg-secondary/20">
                <audio src={att.url} controls className="w-full h-8" />
              </div>
            );
          }

          return (
            <div
              key={att.id}
              className="p-2.5 rounded-lg border border-border bg-secondary/20 flex items-center justify-between text-xs gap-3"
            >
              <div className="flex items-center gap-2 truncate">
                <Icon icon={Attachment01Icon} size={16} className="text-primary shrink-0" />
                <span className="truncate font-medium">{att.name}</span>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                <a href={att.url} target="_blank" rel="noreferrer" download>
                  Download
                </a>
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Discord Embeds with left border color, author, fields grid, thumbnail, image, and footer
  const renderEmbeds = (embeds?: EmbedItem[]) => {
    if (!embeds || embeds.length === 0) return null;

    return (
      <div className="space-y-3 mt-1.5 w-full">
        {embeds.map((emb, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border/60 bg-secondary/30 p-3.5 text-xs space-y-2 border-l-4 shadow-sm relative overflow-hidden max-w-xl"
            style={{ borderLeftColor: emb.color || "#5865F2" }}
          >
            {/* Author */}
            {emb.author && (
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                {emb.author.iconURL && (
                  <img src={emb.author.iconURL} alt="" className="h-4 w-4 rounded-full" />
                )}
                <span>{emb.author.name}</span>
              </div>
            )}

            {/* Thumbnail right corner */}
            {emb.thumbnail?.url && (
              <img
                src={emb.thumbnail.url}
                alt=""
                className="h-12 w-12 rounded object-cover absolute top-3 right-3 border border-border"
              />
            )}

            {/* Title */}
            {emb.title && (
              <h4 className="font-bold text-sm text-foreground tracking-tight pr-12">
                {renderFormattedText(emb.title)}
              </h4>
            )}

            {/* Description */}
            {emb.description && (
              <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed pr-12">
                {renderFormattedText(emb.description)}
              </div>
            )}

            {/* Fields */}
            {emb.fields && emb.fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/30">
                {emb.fields.map((f, fIdx) => (
                  <div
                    key={fIdx}
                    className={`space-y-0.5 ${f.inline ? "" : "sm:col-span-2"}`}
                  >
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                      {f.name}
                    </p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {renderFormattedText(f.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Main Image */}
            {emb.image?.url && (
              <div className="rounded-md overflow-hidden border border-border mt-2">
                <img src={emb.image.url} alt="" className="max-h-64 w-full object-cover" />
              </div>
            )}

            {/* Footer */}
            {(emb.footer || emb.timestamp) && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/20 text-[10px] text-muted-foreground">
                {emb.footer?.iconURL && (
                  <img src={emb.footer.iconURL} alt="" className="h-3.5 w-3.5 rounded-full" />
                )}
                {emb.footer?.text && <span>{emb.footer.text}</span>}
                {emb.timestamp && (
                  <span>
                    {new Date(emb.timestamp).toLocaleDateString()} {new Date(emb.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render Discord Components (Buttons, Action Rows, Interactive Menus)
  const renderComponents = (components?: ComponentItem[]) => {
    if (!components || components.length === 0) return null;

    // Filter only rows that contain actual interactive buttons or select menus
    const interactiveRows = components
      .map((row) => ({
        ...row,
        components: (row.components || []).filter(
          (comp) =>
            comp.customId ||
            comp.url ||
            comp.type === 2 ||
            comp.type === 3 ||
            comp.type === "BUTTON" ||
            comp.type === "STRING_SELECT"
        ),
      }))
      .filter((row) => row.components && row.components.length > 0);

    if (interactiveRows.length === 0) return null;

    return (
      <div className="space-y-2 mt-2.5 w-full">
        {interactiveRows.map((row, rIdx) => (
          <div key={rIdx} className="flex items-center gap-2 flex-wrap">
            {row.components?.map((comp, cIdx) => (
              <div
                key={cIdx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border/80 shadow-sm hover:bg-secondary transition-colors cursor-pointer"
              >
                {comp.emoji && <span>{comp.emoji}</span>}
                <span>{comp.label || comp.customId || "Button"}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderMessageContent = () => (
    <ScrollArea className="flex-1 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        {loadingMessages ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-1/2 ml-auto" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No recent messages in this ticket channel.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`group flex items-start gap-3 ${
                msg.author.isDashboard ? "flex-row-reverse" : ""
              }`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={msg.author.avatar} alt={msg.author.username} />
                <AvatarFallback>
                  <Icon icon={UserIcon} size={16} />
                </AvatarFallback>
              </Avatar>
              <div
                className={`flex flex-col space-y-1 max-w-[80%] ${
                  msg.author.isDashboard ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {msg.author.globalName || msg.author.username}
                  </span>
                  {msg.author.bot && (
                    <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                      BOT
                    </Badge>
                  )}
                  {msg.author.isDashboard && (
                    <Badge variant="default" className="px-1 py-0 text-[10px]">
                      STAFF
                    </Badge>
                  )}
                  <span>{formatMessageTime(msg.createdAt)}</span>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={() => startEdit(msg)}
                      title="Edit Message"
                    >
                      <Icon icon={PencilEdit01Icon} size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="Delete Message"
                    >
                      <Icon icon={Delete02Icon} size={12} />
                    </Button>
                  </div>
                </div>

                {/* Main Message Text / Edit Input */}
                {editingMsgId === msg.id ? (
                  <div className="flex items-center gap-2 w-full mt-1">
                    <Input
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8 px-2 bg-primary"
                      onClick={() => handleSaveEdit(msg.id)}
                    >
                      <Icon icon={Tick01Icon} size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={cancelEdit}
                    >
                      <Icon icon={Cancel01Icon} size={14} />
                    </Button>
                  </div>
                ) : msg.content ? (
                  <div
                    className={`rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.author.isDashboard
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/40 text-secondary-foreground border border-border/50"
                    }`}
                    style={
                      msg.containerColor || (msg.author.bot && !msg.embeds?.length)
                        ? { borderLeftWidth: "4px", borderLeftColor: msg.containerColor || "#5865F2" }
                        : undefined
                    }
                  >
                    {renderFormattedText(msg.content)}
                  </div>
                ) : null}

                {/* Rich Media Attachments */}
                {renderAttachments(msg.attachments)}

                {/* Discord Embeds */}
                {renderEmbeds(msg.embeds)}

                {/* Discord Components / Buttons */}
                {renderComponents(msg.components)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );

  const renderReplyForm = () => (
    <div className="p-4 border-t border-border bg-secondary/10 flex flex-col gap-2 relative">
      {/* Pending Attachments Preview Chips */}
      {pendingFiles.length > 0 && (
        <div className="max-w-4xl mx-auto w-full flex items-center gap-2 flex-wrap mb-1">
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-1.5 px-3 rounded-lg border border-border bg-secondary text-xs"
            >
              {file.previewUrl ? (
                <img src={file.previewUrl} alt="" className="h-6 w-6 rounded object-cover" />
              ) : (
                <Icon icon={Attachment01Icon} size={14} className="text-primary" />
              )}
              <span className="font-medium max-w-[120px] truncate">{file.filename}</span>
              <span className="text-muted-foreground text-[10px]">{file.sizeMb}MB</span>
              <button
                type="button"
                onClick={() => removePendingFile(i)}
                className="text-muted-foreground hover:text-destructive ml-1"
              >
                <Icon icon={Cancel01Icon} size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* `@` Mention Autocomplete Popup */}
      {showMentionMenu && (
        <div className="max-w-4xl mx-auto w-full absolute bottom-full mb-2 z-50 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          <div className="p-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b">
            Mentions (@)
          </div>
          {/* User Option */}
          {activeTicket && (
            <button
              type="button"
              onClick={() => insertMention("Ticket Author", activeTicket.user_id, false)}
              className="w-full text-left p-2 hover:bg-secondary flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="font-medium">Ticket Author</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                @{activeTicket.user_id}
              </span>
            </button>
          )}

          {/* Roles */}
          {resources?.roles
            ?.filter((r) => r.name.toLowerCase().includes(mentionQuery))
            .slice(0, 5)
            .map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => insertMention(role.name, role.id, true)}
                className="w-full text-left p-2 hover:bg-secondary flex items-center justify-between text-xs"
              >
                <span className="font-medium text-amber-400">@{role.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">Role</span>
              </button>
            ))}
        </div>
      )}

      <form onSubmit={handleSendReply} className="max-w-4xl mx-auto w-full flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.zip,.txt,.json"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          title="Attach files or media"
          className="h-9 px-2.5"
        >
          <Icon icon={Image01Icon} size={16} />
        </Button>

        <Input
          value={replyText}
          onChange={handleInputChange}
          placeholder="Type a reply... Use @ to tag roles or users"
          disabled={sending || loadingMessages}
          className="flex-1"
        />

        <Button
          type="submit"
          size="sm"
          disabled={sending || (!replyText.trim() && !pendingFiles.length) || loadingMessages}
        >
          {sending ? (
            <Icon icon={RefreshIcon} size={16} className="animate-spin" />
          ) : (
            <>
              <Icon icon={SentIcon} size={16} className="mr-1.5" />
              Send
            </>
          )}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Open Tickets</h1>
          <p className="text-muted-foreground">
            Manage open support tickets & reply live to Discord channels from the web dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="gap-2 bg-primary font-semibold text-xs h-9"
          >
            <Icon icon={Ticket01Icon} size={15} /> Open Ticket
          </Button>
          <Button onClick={() => void loadList()} disabled={loading} variant="outline" size="sm">
            <Icon icon={RefreshIcon} size={16} className={loading ? "animate-spin mr-2" : "mr-2"} />
            Refresh
          </Button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card/60 p-3.5 rounded-xl border border-border/80 shadow-sm">
        <div className="relative w-full md:w-80">
          <Icon
            icon={Search01Icon}
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search tickets by ID, user, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-secondary/30 border-border"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {departmentsEnabled && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">Department:</span>
              <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
                <SelectTrigger className="text-xs h-9 w-[160px] bg-secondary/30 border-border capitalize">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {availableDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept} className="capitalize">
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground">Priority:</span>
            <Select value={selectedPriorityFilter} onValueChange={setSelectedPriorityFilter}>
              <SelectTrigger className="text-xs h-9 w-[140px] bg-secondary/30 border-border capitalize">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium / Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(selectedDeptFilter !== "all" || selectedPriorityFilter !== "all" || searchQuery.trim()) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDeptFilter("all");
                setSelectedPriorityFilter("all");
                setSearchQuery("");
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <p>No open tickets found matching your filter criteria.</p>
              {(selectedDeptFilter !== "all" || selectedPriorityFilter !== "all" || searchQuery.trim()) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDeptFilter("all");
                    setSelectedPriorityFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-xs mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.ticket_id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-secondary/10 transition-colors gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-primary">
                        {ticket.subject || "Untitled Ticket"}
                      </p>
                      <span className="text-xs font-mono text-muted-foreground">
                        #{ticket.ticket_id}
                      </span>
                      {departmentsEnabled && ticket.department && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {ticket.department}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          ticket.priority === "high"
                            ? "destructive"
                            : ticket.priority === "medium"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs capitalize"
                      >
                        {ticket.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      User ID: <span className="font-mono">{ticket.user_id}</span>
                      {ticket.description && ` • ${ticket.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="text-sm text-muted-foreground flex items-center whitespace-nowrap mr-2">
                      <Icon icon={Clock01Icon} size={14} className="mr-1.5" />
                      {getTimeElapsed(ticket.created_at)}
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openChat(ticket)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Icon icon={Comment01Icon} size={16} className="mr-2" />
                      Live Chat
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => promptCloseTicket(ticket)}
                      disabled={closingTicketId === ticket.ticket_id}
                    >
                      {closingTicketId === ticket.ticket_id ? (
                        <Icon icon={RefreshIcon} size={14} className="animate-spin mr-1.5" />
                      ) : (
                        <Icon icon={Cancel01Icon} size={14} className="mr-1.5" />
                      )}
                      Close
                    </Button>
                    {guildId && (
                      <Button variant="secondary" size="sm" asChild>
                        <a
                          href={`https://discord.com/channels/${guildId}/${ticket.ticket_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Icon icon={Link01Icon} size={16} />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CENTERED MODAL POPOUT WITH BACKDROP */}
      {chatOpen && fullView && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFullView(false);
            }
          }}
        >
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[88vh] overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-border bg-secondary/20 flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h2 className="text-lg font-bold tracking-tight truncate">
                    {activeTicket?.subject || "Ticket Live Chat"}
                  </h2>
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    #{activeTicket?.ticket_id}
                  </Badge>
                  {departmentsEnabled && activeTicket?.department && (
                    <Badge variant="secondary" className="text-xs capitalize shrink-0">
                      {activeTicket.department}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeTicket && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => promptCloseTicket(activeTicket)}
                      disabled={closingTicketId === activeTicket.ticket_id}
                      className="h-8 px-2.5 text-xs"
                    >
                      {closingTicketId === activeTicket.ticket_id ? (
                        <Icon icon={RefreshIcon} size={14} className="animate-spin mr-1.5" />
                      ) : (
                        <Icon icon={Cancel01Icon} size={14} className="mr-1.5" />
                      )}
                      Close Ticket
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFullView(false)}
                    className="h-8 px-3 text-xs flex items-center gap-1.5"
                  >
                    <Icon icon={Minimize01Icon} size={14} />
                    <span>Collapse</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setChatOpen(false);
                      setFullView(false);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Icon icon={Cancel01Icon} size={18} />
                  </Button>
                </div>
              </div>
              {activeTicket?.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {activeTicket.description}
                </p>
              )}
            </div>

            {renderMessageContent()}
            {renderReplyForm()}
          </div>
        </div>
      )}

      {/* Standard Side Drawer Sheet */}
      {chatOpen && !fullView && (
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-card">
            <SheetHeader className="p-4 border-b border-border space-y-1 bg-secondary/20">
              <div className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <SheetTitle className="text-base font-bold truncate">
                    {activeTicket?.subject || "Ticket Live Chat"}
                  </SheetTitle>
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    #{activeTicket?.ticket_id}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {activeTicket && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => promptCloseTicket(activeTicket)}
                      disabled={closingTicketId === activeTicket.ticket_id}
                      className="h-7 px-2 text-xs"
                    >
                      {closingTicketId === activeTicket.ticket_id ? (
                        <Icon icon={RefreshIcon} size={13} className="animate-spin mr-1" />
                      ) : (
                        <Icon icon={Cancel01Icon} size={13} className="mr-1" />
                      )}
                      Close
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFullView(true)}
                    className="h-7 px-2 text-xs flex items-center gap-1"
                    title="Open in Full View"
                  >
                    <Icon icon={Maximize01Icon} size={13} />
                    <span>Full View</span>
                  </Button>
                </div>
              </div>
              {activeTicket?.description && (
                <SheetDescription className="text-xs text-muted-foreground truncate">
                  {activeTicket.description}
                </SheetDescription>
              )}
            </SheetHeader>

            {renderMessageContent()}
            {renderReplyForm()}
          </SheetContent>
        </Sheet>
      )}

      {/* CUSTOM CLOSE TICKET DIALOG MODAL */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Icon icon={Cancel01Icon} className="text-destructive" size={20} />
              Close Ticket #{ticketToClose?.ticket_id}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to close this ticket? A transcript will be created and the channel will be deleted in Discord.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-foreground">
              Reason for closing (Optional)
            </label>
            <Input
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="e.g. Issue resolved by support team"
              className="text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCloseModalOpen(false)}
              disabled={Boolean(closingTicketId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmCloseTicket}
              disabled={Boolean(closingTicketId)}
            >
              {closingTicketId ? (
                <Icon icon={RefreshIcon} size={14} className="animate-spin mr-1.5" />
              ) : (
                <Icon icon={Cancel01Icon} size={14} className="mr-1.5" />
              )}
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Icon icon={Ticket01Icon} size={18} className="text-primary" />
              Open Direct Ticket
            </DialogTitle>
            <DialogDescription className="text-xs">
              {departmentsEnabled
                ? "Select a support department to create a new ticket channel in Discord immediately."
                : "Create a new ticket channel in Discord immediately."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {departmentsEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department</Label>
                <Select value={createDept} onValueChange={setCreateDept}>
                  <SelectTrigger className="text-xs border-border bg-secondary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(configuredDepartments.length > 0
                      ? configuredDepartments
                      : [
                          { id: "general", name: "General Support", emoji: "🎫" },
                          { id: "purchase", name: "Purchase & Billing Support", emoji: "💳" },
                          { id: "reports", name: "Player Report", emoji: "🚨" },
                          { id: "appeals", name: "Ban Appeals", emoji: "⚖️" },
                        ]
                    ).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.emoji ? `${dept.emoji} ` : ""}{dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ticket Subject / Reason</Label>
              <Input
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                placeholder="e.g. Assistance with server permissions"
                className="text-xs border-border bg-secondary/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Discord User ID (Optional)</Label>
              <Input
                value={createUserId}
                onChange={(e) => setCreateUserId(e.target.value)}
                placeholder="e.g. 123456789012345678 (Leave blank for yourself)"
                className="text-xs font-mono border-border bg-secondary/30"
              />
              <p className="text-[11px] text-muted-foreground">
                If specified, the ticket channel will be created for this user.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTicket}
              disabled={creating || !createSubject.trim()}
              className="gap-1.5 text-xs bg-primary font-semibold"
            >
              {creating ? (
                <Icon icon={RefreshIcon} size={14} className="animate-spin" />
              ) : (
                <Icon icon={Ticket01Icon} size={14} />
              )}
              {creating ? "Opening Ticket..." : "Open Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
