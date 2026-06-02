import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Save, CheckCircle, X, FileText, Trophy, Brain, Briefcase, BarChart2, Calendar, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quantaClient } from "@/api/quantaClient";

const EDU_LEVELS = ["High School", "Bachelor", "Master", "PhD"];
const EXP_OPTIONS = Array.from({ length: 22 }, (_, i) => i < 21 ? String(i) : "20+");

function SkillsInput({ skills, onChange }) {
  const [input, setInput] = useState("");
  const addSkill = () => {
    const trimmed = input.trim();
    if (trimmed && !skills.includes(trimmed)) onChange([...skills, trimmed]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
          placeholder="e.g. Python, React — press Enter to add"
          className="rounded-xl flex-1"
        />
        <Button type="button" variant="outline" onClick={addSkill} className="rounded-xl shrink-0">Add</Button>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map(s => (
            <span key={s} className="inline-flex items-center gap-1 bg-accent text-primary text-xs px-2.5 py-1 rounded-lg font-medium">
              {s}
              <button onClick={() => onChange(skills.filter(x => x !== s))} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CandidateProfilePage() {
  const navigate = useNavigate();
  const photoRef = useRef(null);
  const cvRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [candidateRecord, setCandidateRecord] = useState(null);
  const [applications, setApplications] = useState([]);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", location: "",
    linkedin_url: "", portfolio_url: "", years_of_experience: "",
    education_level: "", field_of_study: "", current_job_title: "",
    skills: [], cv_url: "", cv_filename: "", cv_uploaded_at: "",
    photo_url: "",
  });

  useEffect(() => {
    const init = async () => {
      const email = (localStorage.getItem("candidateEmail") || "").trim().toLowerCase();
      const id = localStorage.getItem("candidateId");
      if (!email || !id) { navigate("/candidate-auth"); return; }

      const [candidates, apps, assessments] = await Promise.all([
        quantaClient.entities.Candidate.filter({ email }),
        quantaClient.entities.Application.filter({ candidate_email: email }, "-created_date"),
        quantaClient.entities.AssessmentResult.filter({ candidate_email: email }, "-created_date", 1),
      ]);
      if (assessments?.length > 0) setAssessmentResult(assessments[0]);

      const c = candidates[0] || {};
      setCandidateRecord(c);
      setApplications(apps || []);
      setForm({
        full_name: c.full_name || "",
        email,
        phone: c.phone || "",
        location: c.location || "",
        linkedin_url: c.linkedin_url || "",
        portfolio_url: c.portfolio_url || "",
        years_of_experience: c.years_of_experience !== undefined ? String(c.years_of_experience) : "",
        education_level: c.education_level || "",
        field_of_study: c.field_of_study || "",
        current_job_title: c.current_job_title || "",
        skills: c.skills || [],
        cv_url: c.cv_url || "",
        cv_filename: c.cv_filename || "",
        cv_uploaded_at: c.cv_uploaded_at || "",
        photo_url: c.photo_url || "",
      });
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
      user_id: localStorage.getItem("candidateId"),
      job_id: null
    });
    setForm(f => ({ ...f, photo_url: file_url }));
    setPhotoUploading(false);
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCvUploading(true);
    const { file_url } = await quantaClient.integrations.Core.UploadFile({
      file,
      user_id: localStorage.getItem("candidateId"),
      job_id: null
    });
    setForm(f => ({ ...f, cv_url: file_url, cv_filename: file.name, cv_uploaded_at: new Date().toISOString() }));
    setCvUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, years_of_experience: form.years_of_experience !== "" ? form.years_of_experience : undefined };
    if (candidateRecord?.id) {
      await quantaClient.entities.Candidate.update(candidateRecord.id, data);
    } else {
      const created = await quantaClient.entities.Candidate.create(data);
      setCandidateRecord(created);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  const initials = (form.full_name || form.email || "C").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const rankedApps = applications.filter(a => a.match_score);

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
        <button onClick={() => navigate("/candidate-dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <span className="font-bold text-lg text-primary ml-auto">QuantaHire</span>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">Candidate Portal</p>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal and professional information.</p>
        </div>

        {/* Main Card — Photo + Form */}
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
                  onClick={() => photoRef.current?.click()}
                  disabled={photoUploading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  {photoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <p className="text-xs text-muted-foreground text-center">Click camera to update photo</p>
            </div>

            {/* Right: Form */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Jane Smith" className="rounded-xl" />
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
                <Label>Location / City</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Riyadh, Saudi Arabia" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Current Job Title</Label>
                <Input value={form.current_job_title} onChange={e => setForm(f => ({ ...f, current_job_title: e.target.value }))} placeholder="Software Engineer" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Years of Experience</Label>
                <select
                  value={form.years_of_experience}
                  onChange={e => setForm(f => ({ ...f, years_of_experience: e.target.value }))}
                  className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select years</option>
                  {EXP_OPTIONS.map(v => <option key={v} value={v}>{v} {v === "20+" ? "years" : v === "1" ? "year" : "years"}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Education Level</Label>
                <select
                  value={form.education_level}
                  onChange={e => setForm(f => ({ ...f, education_level: e.target.value }))}
                  className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select level</option>
                  {EDU_LEVELS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Field of Study</Label>
                <Input value={form.field_of_study} onChange={e => setForm(f => ({ ...f, field_of_study: e.target.value }))} placeholder="Computer Science" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>LinkedIn URL</Label>
                <Input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>GitHub / Portfolio URL</Label>
                <Input value={form.portfolio_url} onChange={e => setForm(f => ({ ...f, portfolio_url: e.target.value }))} placeholder="https://github.com/..." className="rounded-xl" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Skills</Label>
                <SkillsInput skills={form.skills} onChange={skills => setForm(f => ({ ...f, skills }))} />
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

        {/* CV Section */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-foreground text-lg flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-primary" />My CV</h2>
          {form.cv_url ? (
            <div className="flex items-center justify-between bg-[#F8F7FF] rounded-xl px-4 py-3">
              <div>
                <p className="font-medium text-sm text-foreground">{form.cv_filename || "CV Document"}</p>
                {form.cv_uploaded_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Uploaded {new Date(form.cv_uploaded_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a href={form.cv_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors">View CV</a>
                <Button variant="outline" size="sm" onClick={() => cvRef.current?.click()} disabled={cvUploading} className="rounded-xl text-xs gap-1.5">
                  {cvUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Replace
                </Button>
              </div>
            </div>
          ) : (
            <button onClick={() => cvRef.current?.click()} disabled={cvUploading} className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground">
              {cvUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6" />}
              <span className="text-sm font-medium">{cvUploading ? "Uploading..." : "Upload your CV"}</span>
              <span className="text-xs">PDF, DOC, or DOCX</span>
            </button>
          )}
          <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCvUpload} />
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
                <p className="text-2xl font-bold text-foreground">{applications.length}</p>
                <p className="text-xs text-muted-foreground">Applications</p>
              </div>
            </div>
            <div className="bg-[#F8F7FF] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{applications.filter(a => a.status === "shortlisted").length}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
            </div>
            <div className="bg-[#F8F7FF] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {candidateRecord?.created_date
                    ? new Date(candidateRecord.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Member Since</p>
              </div>
            </div>
          </div>
        </div>

        {/* Personality Assessment */}
        {assessmentResult ? (
          <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />Personality Assessment
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { label: "Openness", value: assessmentResult.score_openness },
                { label: "Conscientiousness", value: assessmentResult.score_conscientiousness },
                { label: "Extraversion", value: assessmentResult.score_extraversion },
                { label: "Agreeableness", value: assessmentResult.score_agreeableness },
                { label: "Stability", value: assessmentResult.score_stability },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#F8F7FF] rounded-xl px-3 py-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold text-primary">{value?.toFixed(1) || "—"}</p>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${((value || 0) / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {assessmentResult.recommended_jobs?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recommended Career Paths</p>
                <div className="flex flex-wrap gap-1.5">
                  {assessmentResult.recommended_jobs.map((job) => (
                    <span key={job} className="text-xs bg-accent text-primary px-2.5 py-1 rounded-lg font-medium">{job}</span>
                  ))}
                </div>
                {assessmentResult.recommended_reason && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{assessmentResult.recommended_reason}</p>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Taken on {new Date(assessmentResult.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={() => navigate(`/psych-results?id=${assessmentResult.id}`)}>
                View Full Results
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground text-sm">Personality Assessment</p>
                <p className="text-xs text-muted-foreground">Take the Big Five test to discover your career matches</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-xl text-xs shrink-0" onClick={() => navigate("/assessment")}>
              Take Test
            </Button>
          </div>
        )}

        {/* Job Matches */}
        {rankedApps.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />My Job Matches</h2>
            <div className="space-y-3">
              {rankedApps.map((app, idx) => (
                <div key={app.id} className="flex items-center justify-between bg-[#F8F7FF] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-xs">#{idx + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{app.job_title}</p>
                      <p className="text-xs text-muted-foreground">{app.company}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${app.match_score >= 80 ? "text-green-600" : app.match_score >= 60 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {app.match_score}% Match
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{app.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}