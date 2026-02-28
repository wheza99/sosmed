"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Field, FieldLabel } from "../ui/field";
import axios from "axios";
import { useUser } from "@/context/user-context";

interface SidebarOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SidebarOrgDialog({
  open,
  onOpenChange,
}: SidebarOrgDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser, setActiveOrg, isOrgRequired } = useUser();

  useEffect(() => {
    if (isOrgRequired) {
      onOpenChange(true);
    }
  }, [isOrgRequired, onOpenChange]);

  const handleOpenChange = (newOpen: boolean) => {
    if (isOrgRequired && !newOpen) {
      return;
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/organization/create", {
        name
      });

      if (response.data.status === "success") {
        await refreshUser();
        setActiveOrg(response.data.organization);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message || err.message || "Failed to login",
        );
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            {isOrgRequired
              ? "You must create an organization to continue."
              : "Create a new organization to manage your projects."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="name" className="text-right">
              Name
            </FieldLabel>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Acme Inc."
              required
            />
          </Field>
          {error && <p className="text-red-500 text-sm py-4">{error}</p>}
          <DialogFooter className="py-4 gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SidebarOrgDialog
