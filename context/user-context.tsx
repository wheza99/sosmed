"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@/type/interface/user";
import { Organization } from "@/type/interface/organization";
import { SocialAccount } from "@/type/interface/social-account";

interface UserContextType {
  user: User | null;
  activeOrg: Organization | null;
  accounts: SocialAccount[];
  loading: boolean;
  setUser: (user: User | null) => void;
  setActiveOrg: (org: Organization | null) => void;
  setAccounts: (accounts: SocialAccount[]) => void;
  refreshUser: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  isOrgRequired: boolean;
  setIsOrgRequired: (required: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrgRequired, setIsOrgRequired] = useState(false);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        
        // Logic to set active organization
        if (data?.organizations && data.organizations.length > 0) {
          // If we have an activeOrg already, check if it's still valid
          // Otherwise default to first one
          setActiveOrg((prev) => {
            if (
              prev &&
              data.organizations.find((o: Organization) => o.id === prev.id)
            ) {
              return prev;
            }
            return data.organizations[0];
          });
          setIsOrgRequired(false);
        } else {
          setActiveOrg(null);
          setIsOrgRequired(!!data);
        }
      } else {
        setUser(null);
        setActiveOrg(null);
        setAccounts([]);
        setIsOrgRequired(false);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      setActiveOrg(null);
      setAccounts([]);
      setIsOrgRequired(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (!activeOrg?.id) {
      setAccounts([]);
      return;
    }

    try {
      const response = await fetch(`/api/accounts?orgId=${activeOrg.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setAccounts([]);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (activeOrg?.id) {
      fetchAccounts();
    }
  }, [activeOrg?.id]);

  return (
    <UserContext.Provider
      value={{
        user,
        activeOrg,
        accounts,
        loading,
        setUser,
        setActiveOrg,
        setAccounts,
        refreshUser: fetchUser,
        refreshAccounts: fetchAccounts,
        isOrgRequired,
        setIsOrgRequired,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
