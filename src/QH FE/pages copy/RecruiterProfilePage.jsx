import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Save, Briefcase, Users, BarChart2, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { quantaClient } from "@/api/quantaClient";

const STATUS_STYLES = {
  approved: "bg-green-50 text-green-600 border-green-200",
  pending: "bg-orange-50 text-orange-500 border-orange-200",
  blocked: "bg-red-50 text-red-500 border-red-200",
};

export default function RecruiterProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", company: "",
    job_title: "", bio: "", photo_url: "",
  });
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const email = localStorage.getItem("recruiterEmail");
      if (!email) { navigate("/recruiter-auth"); return; }

      const [profiles, jobsData] = await Promise.all([
        quantaClient.entities.RecruiterProfile.filter({ email }),
        quantaClient.entities.Job.filter({ recruiter_email: email }),
      ]);

      const p = profiles[0] || {};
      setProfile(p);
      setForm({
        full_name: p.full_name || "",
        email: p.email || email,
        phone: p.phone || "",
        company: p.company || "",
        job_title: p.job_title || "",
        bio: p.bio || "",
        photo_url: p.photo_url || "",
      });
      setJobs(jobsData || []);

      if (jobsData?.length) {
        const jobIds = jobsData.map(j => j.id);
        const allApps = await quantaClient.entities.Application.list();
        setApplications((allApps || []).filter(a => jobIds.includes(a.job_id)));
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    const { file_url } = await quantaClient.integrations.Core.UploadFile({
      file,
      user_id: null,
      job_id: null
    });
    setForm(f => ({ ...f, photo_url: file_url }));
    setPhotoUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    if (profile?.id) {
      await quantaClient.entities.RecruiterProfile.update(profile.id, form);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  const rankedApps = applications.filter(a => a.match_score);
  const initials = (form.full_name || form.email || "R").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Navbar */}
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center gap-4 sticky top-0 z-10 h-16">
        <button onClick={() => navigate("/recruiter-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <span className="font-bold text-lg text-primary ml-auto">QuantaHire</span>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">Recruiter Portal</p>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal and professional information.</p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Account Status:</span>
          <Badge className={`capitalize px-3 py-1 text-sm font-semibold border ${STATUS_STYLES[profile?.status] || STATUS_STYLES.pending}`}>
            {profile?.status || "pending"}
          </Badge>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-border rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left: Photo */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Profile" className="w-28 h-28 rounded-2xl object-cover border-2 border-border" />
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-border">
                    <span className="text-primary font-bold text-3xl">{initials}</span>
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={photoUploading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  {photoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <p className="text-xs text-muted-foreground text-center">Click camera to update photo</p>
            </div>

            {/* Right: Form */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email} disabled className="rounded-xl bg-muted/40 cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+966 5X XXX XXXX" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" className="rounded-xl" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Job Title / Position</Label>
                <Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="Senior HR Manager" className="rounded-xl" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Short Bio</Label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell candidates a bit about yourself and your company..."
                  rows={3}
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 rounded-xl gap-2 h-11 px-6">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-foreground text-lg mb-4">Activity Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#F8F7FF] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">Jobs Posted</p>
              </div>
            </div>
            <div className="bg-[#F8F7FF] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{rankedApps.length}</p>
                <p className="text-xs text-muted-foreground">Rankings Completed</p>
              </div>
            </div>
            <div className="bg-[#F8F7FF] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {profile?.created_date ? new Date(profile.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Member Since</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}