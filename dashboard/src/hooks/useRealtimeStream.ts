import { useEffect, useRef, useState } from "react";

export interface StreamMetrics {
  timestamp: number;
  ping: number;
  ram_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  cpu_load: number;
  uptime: number;
}

export interface StreamLogEntry {
  type: "Output" | "Warn" | "Error";
  timestamp: string;
  message: string;
}

export interface StreamTicketMessage {
  ticketId: string;
  message: {
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
    embeds?: { title?: string; description?: string; color?: string | null }[];
    attachments?: { id: string; name: string; url: string; contentType?: string }[];
    createdAt: number;
  };
}

export interface StreamTicketMessageDeleted {
  ticketId: string;
  messageId: string;
}

export interface StreamTicketMessageUpdated {
  ticketId: string;
  messageId: string;
  content: string;
}

export interface StreamTicketCreated {
  ticket_id: string;
  user_id: string;
  subject: string;
  description: string;
  department: string;
  priority: string;
  created_at: number;
}

export interface StreamTicketClosed {
  ticket_id: string;
}

export interface StreamHandlers {
  onMetrics?: (metrics: StreamMetrics) => void;
  onLog?: (log: StreamLogEntry) => void;
  onTicketMessage?: (msg: StreamTicketMessage) => void;
  onTicketMessageDeleted?: (data: StreamTicketMessageDeleted) => void;
  onTicketMessageUpdated?: (data: StreamTicketMessageUpdated) => void;
  onTicketCreated?: (ticket: StreamTicketCreated) => void;
  onTicketClosed?: (ticket: StreamTicketClosed) => void;
}

export function useRealtimeStream(handlers: StreamHandlers) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let timerId: number | null = null;

    const connect = () => {
      eventSource = new EventSource("/api/stream");

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.addEventListener("connected", () => {
        setConnected(true);
      });

      eventSource.addEventListener("metrics", (ev) => {
        try {
          const data: StreamMetrics = JSON.parse(ev.data);
          handlersRef.current.onMetrics?.(data);
        } catch {
          // Ignore JSON parse errors
        }
      });

      eventSource.addEventListener("log", (ev) => {
        try {
          const data: StreamLogEntry = JSON.parse(ev.data);
          handlersRef.current.onLog?.(data);
        } catch {
          // Ignore JSON parse errors
        }
      });

      eventSource.addEventListener("ticket_message", (ev) => {
        try {
          const data: StreamTicketMessage = JSON.parse(ev.data);
          handlersRef.current.onTicketMessage?.(data);
        } catch {
          // Ignore JSON parse errors
        }
      });

      eventSource.addEventListener("ticket_message_deleted", (ev) => {
        try {
          const data: StreamTicketMessageDeleted = JSON.parse(ev.data);
          handlersRef.current.onTicketMessageDeleted?.(data);
        } catch {
          // Ignore JSON parse errors
        }
      });

      eventSource.addEventListener("ticket_message_updated", (ev) => {
        try {
          const data: StreamTicketMessageUpdated = JSON.parse(ev.data);
          handlersRef.current.onTicketMessageUpdated?.(data);
        } catch {
          // Ignore JSON parse errors
        }
      });

      eventSource.addEventListener("ticket_created", (ev) => {
        try {
          const data: StreamTicketCreated = JSON.parse(ev.data);
          handlersRef.current.onTicketCreated?.(data);
        } catch {
          // Ignore JSON parse errors
        }
      });

      eventSource.addEventListener("ticket_closed", (ev) => {
        try {
          const data: StreamTicketClosed = JSON.parse(ev.data);
          handlersRef.current.onTicketClosed?.(data);
        } catch {
          // Ignore JSON parse errors
        }
      });

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();
        timerId = window.setTimeout(connect, 4000);
      };
    };

    connect();

    return () => {
      if (timerId) window.clearTimeout(timerId);
      if (eventSource) eventSource.close();
    };
  }, []);

  return { connected };
}
