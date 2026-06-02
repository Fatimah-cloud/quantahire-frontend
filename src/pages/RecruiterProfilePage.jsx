import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Save, Briefcase, BarChart2, Calendar, CheckCircle, FileText, ExternalLink } from "lucide-react";
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
    company_website: "", company_overview: "", job_title: "", bio: "", photo_url: "",
  });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [websiteError, setWebsiteError] = useState("");

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
        company_website: p.company_website || "",
        company_overview: p.company_overview || "",
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

  const [fullNameError, setFullNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const handleFullNameChange = (val) => {
    setForm(f => ({ ...f, full_name: val }));
    if (!val.trim()) {
      setFullNameError("Full name is required");
    } else {
      setFullNameError("");
    }
  };

  const handlePhoneChange = (val) => {
    setForm(f => ({ ...f, phone: val }));
    if (!val.trim()) {
      setPhoneError("Phone number is required");
    } else if (!/^\+?[0-9]+$/.test(val.trim())) {
      setPhoneError("Phone number must contain only digits");
    } else {
      setPhoneError("");
    }
  };

  const handleWebsiteChange = (val) => {
    setForm(f => ({ ...f, company_website: val }));
    if (val && !/^https?:\/\//i.test(val)) {
      setWebsiteError("Website must start with http:// or https://");
    } else {
      setWebsiteError("");
    }
  };

  const handleSave = async () => {
    let hasError = false;

    // Validate Full Name
    if (!form.full_name?.trim()) {
      setFullNameError("Full name is required");
      hasError = true;
    } else {
      setFullNameError("");
    }

    // Validate Phone Number
    const phoneVal = form.phone?.trim();
    if (!phoneVal) {
      setPhoneError("Phone number is required");
      hasError = true;
    } else if (!/^\+?[0-9]+$/.test(phoneVal)) {
      setPhoneError("Phone number must contain only digits");
      hasError = true;
    } else {
      setPhoneError("");
    }

    // Validate Website
    const url = form.company_website?.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setWebsiteError("Website must start with http:// or https://");
      hasError = true;
    } else {
      setWebsiteError("");
    }

    if (hasError) return;

    setSaving(true);

    // Only send the updatable fields to the backend: Full Name, Phone Number, Job Title, Short Bio, Company Website.
    // Do NOT send Company Name or Email.
    const payload = {
      full_name: form.full_name,
      phone: form.phone,
      job_title: form.job_title,
      bio: form.bio,
      company_website: form.company_website,
      photo_url: form.photo_url,
      company_overview: form.company_overview
    };

    if (profile?.id) {
      await quantaClient.entities.RecruiterProfile.update(profile.id, payload);
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
                <Input 
                  value={form.full_name} 
                  onChange={e => handleFullNameChange(e.target.value)} 
                  placeholder="John Doe" 
                  className={`rounded-xl ${fullNameError ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
                />
                {fullNameError && (
                  <p className="text-xs text-red-500 mt-1">{fullNameError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email} disabled className="rounded-xl bg-muted/40 cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input 
                  value={form.phone} 
                  onChange={e => handlePhoneChange(e.target.value)} 
                  placeholder="+966 5X XXX XXXX" 
                  className={`rounded-xl ${phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}`} 
                />
                {phoneError && (
                  <p className="text-xs text-red-500 mt-1">{phoneError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Company Name</Label>
                <Input value={form.company} disabled className="rounded-xl bg-muted/40 cursor-not-allowed" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Company Website</Label>
                <Input
                  type="url"
                  value={form.company_website}
                  onChange={e => handleWebsiteChange(e.target.value)}
                  placeholder="https://example.com"
                  className={`rounded-xl ${websiteError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {websiteError && (
                  <p className="text-xs text-red-500 mt-1">{websiteError}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Company Overview</Label>
                <textarea
                  value={form.company_overview}
                  onChange={e => setForm(f => ({ ...f, company_overview: e.target.value }))}
                  placeholder="Describe your company, mission, values, culture, etc."
                  maxLength={1000}
                  rows={4}
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
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

              {profile?.certificate_url && (
                <div className="space-y-1.5 sm:col-span-2 mt-2">
                  <Label className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">Uploaded Certificate</Label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl select-none">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {decodeURIComponent(profile.certificate_url.split("/").pop())}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Verification document (read-only)</p>
                    </div>
                    <a
                      href={profile.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 transition-all shrink-0 cursor-pointer"
                    >
                      View / Download <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
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