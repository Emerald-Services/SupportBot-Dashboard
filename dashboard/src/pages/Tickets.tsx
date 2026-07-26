import { useCallback, useEffect, useState } from "react";
import {
  RefreshIcon,
  Link01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { api } from "@/api/client";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUptime } from "@/api/client";

interface TicketItem {
  ticket_id: string;
  user_id: string;
  subject: string;
  description: string;
  department: string;
  priority: string;
  created_at: number;
}

export default function Tickets() {
  const [list, setList] = useState<TicketItem[]>([]);
  const [guildId, setGuildId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listOpenTickets();
      if (res.data) {
        setGuildId(res.data.guildId);
        setList(res.data.tickets.sort((a, b) => b.created_at - a.created_at));
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

  const getTimeElapsed = (createdAt: number) => {
    const seconds = Math.floor((Date.now() - createdAt) / 1000);
    return formatUptime(seconds);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Open Tickets</h1>
          <p className="text-muted-foreground">
            View live tickets currently active in Discord.
          </p>
        </div>
        <Button onClick={() => void loadList()} disabled={loading} variant="outline" size="sm">
          <Icon icon={RefreshIcon} size={16} className={loading ? "animate-spin mr-2" : "mr-2"} />
          Refresh
        </Button>
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
          ) : list.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No open tickets at the moment!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {list.map((ticket) => (
                <div
                  key={ticket.ticket_id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-secondary/10 transition-colors gap-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-primary">
                      {ticket.subject || "Untitled Ticket"}
                      <span className="ml-2 text-xs font-mono text-muted-foreground">
                        #{ticket.ticket_id}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      User ID: {ticket.user_id} &bull; Dept: {ticket.department} &bull; Priority: {ticket.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground flex items-center whitespace-nowrap">
                      <Icon icon={Clock01Icon} size={14} className="mr-1.5" />
                      {getTimeElapsed(ticket.created_at)}
                    </div>
                    {guildId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                      >
                        <a
                          href={`https://discord.com/channels/${guildId}/${ticket.ticket_id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Icon icon={Link01Icon} size={16} className="mr-2" />
                          View
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
    </div>
  );
}
