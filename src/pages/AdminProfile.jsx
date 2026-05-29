import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, LogOut, ArrowLeft, User, Mail, Save, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quantaClient } from "@/api/quantaClient";
import { useToast } from "@/components/ui/use-toast";

export default function AdminProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [stats, setStats] = useState({ recruiters: 0, jobs: 0, applications: 0 });

  useEffect(() => {
    const init = async () => {
      const authed = await quantaClient.auth.isAuthenticated();
      if (!authed) { navigate("/admin-auth"); return; }
      const me = await quantaClient.auth.me();
      if (me?.role !== "admin") { navigate("/"); return; }
      setAdminEmail(me.email);
      setAdminName(me.full_name || "");

      const [recruiters, jobs, apps] = await Promise.all([
        quantaClient.entities.RecruiterProfile.list(),
        quantaClient.entities.Job.list(),
        quantaClient.entities.Application.list(),
      ]);
      setStats({ recruiters: recruiters.length, jobs: jobs.length, applications: apps.length });
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await quantaClient.auth.updateMe({ full_name: adminName });
      toast({ description: "Profile updated successfully" });
    } catch (err) {
      toast({ description: "Failed to update profile" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F3FF]">
      {/* Navbar */}
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-none">QuantaHire Admin</p>
            <p className="text-xs text-muted-foreground">{adminEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/admin-dashboard"><ArrowLeft className="w-4 h-4" />Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/"><LogOut className="w-4 h-4" />Logout</Link>
          </Button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your admin account details</p>
        </div>

        {/* Avatar & Role */}
        <div className="bg-white border border-border rounded-2xl p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{adminName || "Admin"}</p>
            <p className="text-muted-foreground text-sm">{adminEmail}</p>
            <span className="inline-block mt-2 text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">Super Admin</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Recruiters", value: stats.recruiters },
            { label: "Jobs Posted", value: stats.jobs },
            { label: "Applications", value: stats.applications },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Edit Profile Form */}
        <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-foreground text-lg">Edit Profile</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" /> Full Name
            </label>
            <Input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Enter your full name"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
            </label>
            <Input
              value={adminEmail}
              disabled
              className="rounded-xl bg-muted/50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" /> Email cannot be changed
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}