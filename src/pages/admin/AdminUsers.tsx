import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Shield, ShieldCheck, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";

type AppRole = "admin" | "moderator" | "user";

const roleBadge: Record<AppRole, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  admin: { label: "Admin", variant: "destructive" },
  moderator: { label: "Moderator", variant: "default" },
  user: { label: "User", variant: "secondary" },
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Remove existing roles for user
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Insert new role (skip if "user" since that's default with no entry)
      if (role !== "user") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const getUserRole = (userId: string): AppRole => {
    const userRole = roles.find((r) => r.user_id === userId);
    return (userRole?.role as AppRole) || "user";
  };

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6" /> User Management
        </h1>
        <Badge variant="secondary" className="text-sm">{profiles.length} Total Users</Badge>
      </div>

      <Input
        placeholder="Search by name, email, or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-10">Loading users...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((profile) => {
                    const currentRole = getUserRole(profile.id);
                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{profile.email || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{profile.phone || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(profile.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadge[currentRole].variant}>
                            {currentRole === "admin" && <ShieldCheck className="h-3 w-3 mr-1" />}
                            {currentRole === "moderator" && <Shield className="h-3 w-3 mr-1" />}
                            {currentRole === "user" && <User className="h-3 w-3 mr-1" />}
                            {roleBadge[currentRole].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentRole}
                            onValueChange={(val) => assignRole.mutate({ userId: profile.id, role: val as AppRole })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
