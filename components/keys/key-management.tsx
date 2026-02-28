"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { Copy, Plus, Trash, Key as KeyIcon, AlertCircle, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ApiKey } from "@/type/interface/key";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { useUser } from "@/context/user-context";

export default function KeyManagement() {
  const { activeOrg } = useUser();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiresIn, setNewKeyExpiresIn] = useState("90d");
  const [customDate, setCustomDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // State to show the newly created key
  const [createdKeyData, setCreatedKeyData] = useState<{
    key: string;
    name: string;
  } | null>(null);

  const fetchKeys = async () => {
    try {
      const params = activeOrg?.id ? `?orgId=${activeOrg.id}` : "";
      const response = await axios.get(`/api/keys${params}`);
      if (response.data.status === "success") {
        setKeys(response.data.data);
      }
    } catch (error) {
      toast.error("Failed to load API keys");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOrg) {
      fetchKeys();
    } else {
      setLoading(false);
    }
  }, [activeOrg]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || !activeOrg) return;

    setIsCreating(true);
    try {
      const response = await axios.post("/api/keys", {
        name: newKeyName,
        expiresIn: newKeyExpiresIn,
        customDate: newKeyExpiresIn === "custom" ? customDate : undefined,
        orgId: activeOrg.id,
      });

      if (response.data.status === "success") {
        setCreatedKeyData({
          key: response.data.data.key,
          name: response.data.data.name,
        });
        toast.success("API Key created successfully");
        setNewKeyName("");
        setNewKeyExpiresIn("90d");
        setCustomDate("");
        // Don't close dialog yet, we need to show the key
        fetchKeys();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to create API key");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) return;

    try {
      const response = await axios.delete("/api/keys", {
        data: { id },
      });

      if (response.data.status === "success") {
        toast.success("API Key deleted successfully");
        fetchKeys();
      }
    } catch (error) {
      toast.error("Failed to delete API key");
      console.error(error);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API Key copied to clipboard");
  };

  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
    setCreatedKeyData(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <Card className="w-full border-none shadow-none h-full mb-auto">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Please select an organization first to manage API keys.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full border-none shadow-none h-full mb-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <Item className="w-full p-0">
          <ItemContent>
            <ItemTitle className="text-3xl font-bold tracking-tight">API Keys</ItemTitle>
            <ItemDescription>
              Manage API keys for <strong>{activeOrg.name}</strong>. Use these keys to let your AI agents access projects in this workspace.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Link href="/docs">
              <Button variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                Docs
              </Button>
            </Link>
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              if (!open) handleCloseCreateDialog();
              else setIsCreateOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Key
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {createdKeyData ? "Save your API Key" : "Create New API Key"}
                  </DialogTitle>
                  <DialogDescription>
                    {createdKeyData
                      ? "This is the only time we will show you this key. Please copy it and store it somewhere safe."
                      : `Generate a new API key for ${activeOrg.name} workspace.`}
                  </DialogDescription>
                </DialogHeader>

                {createdKeyData ? (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <div className="flex items-center space-x-2">
                        <Field className="grid flex-1 gap-2">
                          <FieldLabel htmlFor="link" className="sr-only">
                            Link
                          </FieldLabel>
                          <Input
                            id="link"
                            defaultValue={createdKeyData.key}
                            readOnly
                            className="font-mono text-sm"
                          />
                        </Field>
                        <Button type="submit" size="sm" className="px-3" onClick={() => handleCopyKey(createdKeyData.key)}>
                          <span className="sr-only">Copy</span>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                          We don't store your full API key. If you lose it, you will need to create a new one.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateKey} className="grid gap-4 py-4">
                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="name">Name</FieldLabel>
                      <Input
                        id="name"
                        placeholder="e.g. Dian Agent, Production Bot"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        required
                      />
                    </Field>
                    <Field className="grid gap-2">
                      <FieldLabel htmlFor="expires">Expires In</FieldLabel>
                      <Select value={newKeyExpiresIn} onValueChange={setNewKeyExpiresIn}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expiration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">7 days</SelectItem>
                          <SelectItem value="90d">90 days</SelectItem>
                          <SelectItem value="1y">1 year</SelectItem>
                          <SelectItem value="never">Never Expires</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {newKeyExpiresIn === "custom" && (
                      <Field className="grid gap-2">
                        <FieldLabel htmlFor="custom-date">Expiration Date</FieldLabel>
                        <Input
                          id="custom-date"
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          required
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </Field>
                    )}
                    <DialogFooter>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create Key"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
                {createdKeyData && (
                  <DialogFooter>
                    <Button onClick={handleCloseCreateDialog}>Done</Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </ItemActions>
        </Item>
      </CardHeader>

      <CardContent>
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>
              You have {keys.length} active API key{keys.length !== 1 ? "s" : ""} for this workspace. 
              Use these keys to authenticate your AI agents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keys.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    <KeyIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    No API keys found.
                  </EmptyTitle>
                  <EmptyDescription>
                    Create a new API key to let your agents access projects in this workspace.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{key.name}</span>
                          {!key.is_active && (
                            <Badge variant="destructive" className="w-fit mt-1 text-[10px] px-1 py-0 h-4">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                          {key.key_prefix}...{key.key_suffix}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(key.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {key.last_used_at ? (
                          formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })
                        ) : (
                          "Never"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {key.expires_at ? (
                          new Date(key.expires_at).toLocaleDateString()
                        ) : (
                          "Never"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteKey(key.id)}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
