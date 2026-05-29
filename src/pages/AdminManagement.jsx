import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShieldAlert, UserPlus, Trash2, Shield, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { quantaClient } from "@/api/quantaClient";

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [myEmail, setMyEmail] = useState("");
  
  // Dialogs State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // admin object to delete

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await quantaClient.entities.User.filter({ role: "admin" });
      setAdmins(data || []);
    } catch (err) {
      console.error("Failed to load admins:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load administrator accounts."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const authed = await quantaClient.auth.isAuthenticated();
        if (!authed) {
          navigate("/admin-auth");
          return;
        }
        const me = await quantaClient.auth.me();
        if (me?.role !== "admin") {
          navigate("/");
          return;
        }
        setMyEmail(me.email);
        await fetchAdmins();
      } catch (err) {
        console.error("Initialization error:", err);
        navigate("/");
      }
    };
    init();
  }, [navigate]);

  const filtered = admins.filter(
    (a) =>
      (a.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await quantaClient.functions.invoke("authRegister", {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        role: "admin"
      });

      if (res.data?.error) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: res.data.error
        });
        setActionLoading(false);
        return;
      }

      toast({
        description: `Admin account for ${fullName} created successfully!`
      });

      // Clear Form & Close Dialog
      setFullName("");
      setEmail("");
      setPassword("");
      setAddDialogOpen(false);

      // Refresh list
      await fetchAdmins();
    } catch (err) {
      console.error("Failed to add admin:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteConfirm) return;
    setActionLoading(true);

    try {
      await quantaClient.entities.User.delete(deleteConfirm.id);
      
      toast({
        description: `Admin account ${deleteConfirm.full_name || deleteConfirm.email} deleted successfully.`
      });

      setDeleteConfirm(null);
      await fetchAdmins();
    } catch (err) {
      console.error("Failed to delete admin:", err);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not remove administrator account. Please try again."
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Navbar */}
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-none">QuantaHire Admin</p>
            <p className="text-xs text-muted-foreground">Admin Accounts Panel</p>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Back */}
        <Link
          to="/admin-dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Account Management</h1>
            <p className="text-muted-foreground mt-1">Add, monitor, and remove platform administrators</p>
          </div>
          <Button 
            className="rounded-xl gap-2 h-11 px-5 bg-primary hover:bg-primary/95 shadow-sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4" /> Add Administrator
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Total Administrators</p>
              <p className="text-4xl font-bold text-foreground">{loading ? "..." : admins.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Your Active Session</p>
              <p className="text-sm font-semibold text-primary truncate max-w-xs">{myEmail}</p>
              <Badge className="bg-green-50 text-green-600 border-green-200 mt-1">Super Admin</Badge>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-border rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Administrators List</h2>
              <p className="text-sm text-muted-foreground">Manage administrative access keys</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl w-full sm:w-72 border-border focus-visible:ring-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No administrators found.</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No administrators match your search query.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border pb-3">
                    {["Full Name", "Email Address", "Created On", "Status", "Actions"].map((h) => (
                      <th key={h} className="pb-3 pr-4 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((a) => {
                    const isSelf = a.email === myEmail;
                    return (
                      <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-4 pr-4 font-semibold text-foreground whitespace-nowrap">
                          {a.full_name || "Platform Admin"}
                          {isSelf && <span className="ml-2 text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full select-none">You</span>}
                        </td>
                        <td className="py-4 pr-4 text-muted-foreground whitespace-nowrap font-mono text-xs">{a.email}</td>
                        <td className="py-4 pr-4 text-muted-foreground whitespace-nowrap">
                          {a.created_date ? new Date(a.created_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-4 pr-4 whitespace-nowrap">
                          <Badge className="bg-green-50 text-green-600 border-green-200">Active</Badge>
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSelf}
                            className={`rounded-lg h-8 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 ${isSelf ? "opacity-40 cursor-not-allowed" : ""}`}
                            onClick={() => setDeleteConfirm(a)}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Access
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Add Admin */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if(!actionLoading) setAddDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Create Admin Account
            </DialogTitle>
            <DialogDescription className="pt-1">
              Add a new administrator to the QuantaHire platform. They will get instant dashboard access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAdmin} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                required
                placeholder="Sarah Connor"
                className="rounded-xl h-11 border-border"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email Address</Label>
              <Input
                id="add-email"
                type="email"
                required
                placeholder="sarah@quantahire.com"
                className="rounded-xl h-11 border-border"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-pass">Password</Label>
              <Input
                id="add-pass"
                type="password"
                required
                placeholder="••••••••"
                className="rounded-xl h-11 border-border"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={actionLoading}
                className="rounded-xl flex-1 h-11"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl flex-1 h-11 bg-primary hover:bg-primary/95 text-white"
              >
                {actionLoading ? "Registering..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm Delete */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => { if(!actionLoading) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" /> Remove Admin Access?
            </DialogTitle>
            <DialogDescription className="pt-1">
              Are you sure you want to permanently revoke admin access for <span className="font-semibold text-foreground">{deleteConfirm?.full_name || deleteConfirm?.email}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={actionLoading}
              className="rounded-xl flex-1 h-11"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              className="rounded-xl flex-1 h-11 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteAdmin}
            >
              {actionLoading ? "Deleting..." : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
