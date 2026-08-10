import { useState } from "react";
import { CommandIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/api/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { canEditConfig } from "@/lib/permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2Icon } from "lucide-react";

export function AddonBuilder() {
  const { permissions } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [restartMessage, setRestartMessage] = useState("");

  const [commandName, setCommandName] = useState("");
  const [description, setDescription] = useState("");
  const [permission, setPermission] = useState("Administrator");
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDescription, setEmbedDescription] = useState("");
  const [embedColor, setEmbedColor] = useState("General");

  const canEdit = canEditConfig(permissions, "supportbot");

  const handleBuild = async () => {
    if (!commandName.match(/^[a-z0-9_-]+$/i)) {
      toast.error("Command name can only contain letters, numbers, underscores and dashes.");
      return;
    }

    setLoading(true);
    setSuccess(false);
    try {
      const res = await api.buildAddon({
        name: commandName.toLowerCase(),
        description: description || "A custom command",
        permission,
        embed: {
          title: embedTitle,
          description: embedDescription || "Hello from your custom command!",
          color: embedColor
        }
      });
      setSuccess(true);
      setRestartMessage(res.message || "Restart required.");
      toast.success(`Addon ${commandName}.js created successfully!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to build addon");
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        You don't have permission to build addons.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Addon Builder</h1>
        <p className="text-muted-foreground">
          Visually scaffold a custom slash command addon for your bot.
        </p>
      </div>

      {success ? (
        <Alert className="border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400">
          <CheckCircle2Icon className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Successfully built <strong>{commandName}.js</strong>! {restartMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Command Details</CardTitle>
              <CardDescription>Configure how users trigger the command.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Command Name</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  <Input 
                    placeholder="ping" 
                    value={commandName} 
                    onChange={(e) => setCommandName(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="Replies with a custom embed" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Required Permission</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">@everyone</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="ManageMessages">Manage Messages</SelectItem>
                    <SelectItem value="ManageGuild">Manage Server</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Response Embed</CardTitle>
              <CardDescription>What the bot will reply with.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Embed Title (Optional)</Label>
                <Input 
                  placeholder="Hello!" 
                  value={embedTitle}
                  onChange={(e) => setEmbedTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Embed Description</Label>
                <Textarea 
                  placeholder="Type your message here..." 
                  className="resize-none"
                  rows={4}
                  value={embedDescription}
                  onChange={(e) => setEmbedDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Embed Color</Label>
                <Select value={embedColor} onValueChange={setEmbedColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">Theme General</SelectItem>
                    <SelectItem value="Success">Theme Success</SelectItem>
                    <SelectItem value="Warning">Theme Warning</SelectItem>
                    <SelectItem value="Error">Theme Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon icon={SparklesIcon} size={16} className="text-primary" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-[#313338] p-4 font-sans text-sm text-[#dbdee1]">
                <div className="flex gap-4">
                  <div className="size-10 shrink-0 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">
                    B
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">SupportBot</span>
                      <span className="text-[10px] text-white font-medium uppercase px-1.5 py-0.5 rounded bg-[#5865F2] flex items-center gap-1">
                        <CheckCircle2Icon size={10} /> BOT
                      </span>
                      <span className="text-xs text-[#949ba4]">Today at 12:00 PM</span>
                    </div>
                    
                    <div className="mt-2 rounded bg-[#2b2d31] border-l-4 border-l-[#5865F2] px-4 py-3 max-w-[432px]">
                      {embedTitle && <div className="mb-1 font-semibold text-white">{embedTitle}</div>}
                      <div className="whitespace-pre-wrap">
                        {embedDescription || "Hello from your custom command!"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full gap-2" 
                size="lg"
                disabled={!commandName || loading}
                onClick={handleBuild}
              >
                <Icon icon={CommandIcon} size={18} />
                {loading ? "Building..." : "Generate Addon"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
