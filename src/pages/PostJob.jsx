import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { quantaClient } from "@/api/quantaClient";

function TagInput({ tags, setTags, placeholder }) {
  const [input, setInput] = useState("");
  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setInput("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 bg-accent text-primary text-sm px-3 py-1 rounded-full">
            {t}
            <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="h-10 rounded-xl"
        />
        <Button type="button" variant="outline" onClick={add} className="rounded-xl px-4">Add</Button>
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-foreground text-lg">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function PostJob() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recruiterCompany, setRecruiterCompany] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [type, setType] = useState("");
  const [arrangement, setArrangement] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("open");
  const [skills, setSkills] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [responsibilities, setResponsibilities] = useState([]);

  React.useEffect(() => {
    const recruiterEmail = localStorage.getItem("recruiterEmail");
    if (recruiterEmail) {
      quantaClient.entities.RecruiterProfile.filter({ email: recruiterEmail }).then((profiles) => {
        if (profiles.length > 0) setRecruiterCompany(profiles[0].company || "");
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title) { setError("Job title is required."); return; }
    const recruiterEmail = localStorage.getItem("recruiterEmail");
    if (!recruiterEmail) { navigate("/recruiter-auth"); return; }

    setSubmitting(true);
    let recruiterId = null;
    try {
      const me = await quantaClient.auth.me();
      recruiterId = me.id;
    } catch (err) {
      console.error("Failed to fetch recruiter info:", err);
      recruiterId = localStorage.getItem("recruiterId");
    }

    await quantaClient.entities.Job.create({
      title,
      description,
      level,
      type,
      arrangement,
      location,
      salary,
      skills,
      benefits,
      responsibilities,
      recruiter_email: recruiterEmail,
      recruiter_id: recruiterId,
      created_by: recruiterId,
      company: recruiterCompany,
      status,
    });
    navigate("/recruiter-dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <div className="bg-white border-b border-border px-6 md:px-10 py-4 sticky top-0 z-10">
        <Link to="/recruiter-dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-bold text-foreground">Post a New Job</h1>
          <p className="text-sm text-muted-foreground">Fill in the job details to start receiving applications</p>
        </div>
      </div>

      <form className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6" onSubmit={handleSubmit}>

        <SectionCard title="Job Information" description="Basic information about the position">
          <div className="space-y-1.5">
            <Label>Job Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Senior Software Engineer" className="h-11 rounded-xl" required />
          </div>
          <div className="space-y-1.5">
            <Label>Job Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the role, responsibilities, and requirements..." className="min-h-[120px] rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Experience Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entry-level">Entry-level</SelectItem>
                  <SelectItem value="Mid-level">Mid-level</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Freelance">Freelance</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Work Arrangement</Label>
              <Select value={arrangement} onValueChange={setArrangement}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select arrangement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="On-site">On-site</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Job Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Riyadh, Saudi Arabia" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Salary Range</Label>
              <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g., 8,000 - 12,000 SAR" className="h-11 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Required Skills</Label>
            <TagInput tags={skills} setTags={setSkills} placeholder="Add a skill and press Enter" />
          </div>
          <div className="space-y-1.5">
            <Label>Responsibilities</Label>
            <TagInput tags={responsibilities} setTags={setResponsibilities} placeholder="Add a responsibility and press Enter" />
          </div>
          <div className="space-y-1.5">
            <Label>Benefits</Label>
            <TagInput tags={benefits} setTags={setBenefits} placeholder="e.g., Health Insurance, Remote Work" />
          </div>
        </SectionCard>

        {error && <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 rounded-xl h-12 px-8 text-base font-medium flex-1 sm:flex-none gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {submitting ? "Posting..." : "Post Job"}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl h-12 px-8" onClick={() => navigate("/recruiter-dashboard")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}