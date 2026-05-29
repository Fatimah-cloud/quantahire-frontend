import React, { useState } from "react";
import { Sparkles, Trash2, XCircle, RefreshCw, Clock, MapPin, Users, ChevronDown, ChevronUp, DollarSign, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { quantaClient } from "@/api/quantaClient";

const STATUS_STYLES = {
  open:     "bg-green-50 text-green-600 border border-green-200",
  closed:   "bg-red-50 text-red-500 border border-red-200",
  reopened: "bg-yellow-50 text-yellow-600 border border-yellow-200",
  draft:    "bg-gray-50 text-gray-500 border border-gray-200",
};

function ConfirmDialog({ open, title, message, confirmLabel, confirmClass, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 border border-border">
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" className="rounded-xl" onClick={onCancel}>Cancel</Button>
          <Button className={`rounded-xl ${confirmClass}`} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export default function JobCard({ job, appCount, recruiterEmail, onJobUpdated, onNavigateRank }) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState(null); // "close" | "reopen" | "delete" | "save"
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [editTitle, setEditTitle] = useState(job.title || "");
  const [editDescription, setEditDescription] = useState(job.description || "");
  const [editSkills, setEditSkills] = useState(Array.isArray(job.skills) ? job.skills.join(", ") : "");
  const [editResponsibilities, setEditResponsibilities] = useState(Array.isArray(job.responsibilities) ? job.responsibilities.join("\n") : "");
  const [editBenefits, setEditBenefits] = useState(Array.isArray(job.benefits) ? job.benefits.join("\n") : "");
  const [editLocation, setEditLocation] = useState(job.location || "");
  const [editSalary, setEditSalary] = useState(job.salary || "");
  const [editType, setEditType] = useState(job.type || "Full-time");
  const [editArrangement, setEditArrangement] = useState(job.arrangement || "On-site");
  const [editLevel, setEditLevel] = useState(job.level || "Entry-level");

  const isOwner = job.recruiter_email === recruiterEmail;

  const pushHistory = (newStatus) => {
    const history = Array.isArray(job.status_history) ? job.status_history : [];
    return [
      ...history,
      { status: newStatus, timestamp: new Date().toISOString(), changed_by: recruiterEmail }
    ];
  };

  const handleClose = async () => {
    setLoading(true);
    await quantaClient.entities.Job.update(job.id, {
      status: "closed",
      status_history: pushHistory("closed"),
    });
    setDialog(null);
    setLoading(false);
    onJobUpdated();
  };

  const handleReopen = async () => {
    setLoading(true);
    await quantaClient.entities.Job.update(job.id, {
      status: "reopened",
      status_history: pushHistory("reopened"),
    });
    setDialog(null);
    setLoading(false);
    onJobUpdated();
  };

  const handleDelete = async () => {
    setLoading(true);
    // Delete all applications for this job
    const apps = await quantaClient.entities.Application.filter({ job_id: job.id });
    await Promise.all(apps.map(a => quantaClient.entities.Application.delete(a.id)));
    await quantaClient.entities.Job.delete(job.id);
    setDialog(null);
    setLoading(false);
    onJobUpdated();
  };

  const handleSave = async (updatedFields) => {
    setLoading(true);
    try {
      // 1. Save updated job fields to backend
      const updatedJob = await quantaClient.entities.Job.update(job.id, updatedFields);

      // 2. Fetch applications for this job
      const apps = await quantaClient.entities.Application.filter({ job_id: job.id });
      const appsWithCV = (apps || []).filter(app => app.cv_url && app.cv_url.trim());

      // 3. Re-run ranking/matching for each application with CV in parallel
      if (appsWithCV.length > 0) {
        await Promise.all(
          appsWithCV.map(app =>
            quantaClient.functions.invoke("processCV", {
              cv_url: app.cv_url,
              application_id: app.id,
              job_id: job.id,
              job_title: updatedJob.title,
              job_description: updatedJob.description,
              job_skills: updatedJob.skills || [],
            })
          )
        );
      }

      // 4. Call POST /api/match/ with job_id to refresh and re-initialize global session to Round 1
      try {
        await fetch("http://127.0.0.1:8000/api/match/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: job.id })
        });
      } catch (err) {
        console.error("Match session re-initialization failed:", err);
      }

      toast({ description: "Job updated and candidate rankings re-calculated successfully." });
      setIsEditing(false);
      onJobUpdated();
    } catch (error) {
      console.error("Failed to update job or re-rank candidates:", error);
      toast({ description: "Failed to update job or re-rank candidates." });
    } finally {
      setLoading(false);
    }
  };

  const status = job.status || "open";

  if (isEditing) {
    return (
      <div className="bg-white border border-primary/30 rounded-2xl p-6 space-y-4 shadow-md transition-all">
        <h3 className="font-bold text-foreground text-base border-b border-border pb-2 flex items-center gap-2">
          <Pencil className="w-4 h-4 text-primary" />
          Edit Job Details
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Job Title *</label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" className="rounded-xl h-10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Location</label>
            <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Riyadh, Saudi Arabia" className="rounded-xl h-10" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Employment Type</label>
            <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full px-3 h-10 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Freelance">Freelance</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Work Arrangement</label>
            <select value={editArrangement} onChange={(e) => setEditArrangement(e.target.value)} className="w-full px-3 h-10 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="On-site">On-site</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Experience Level</label>
            <select value={editLevel} onChange={(e) => setEditLevel(e.target.value)} className="w-full px-3 h-10 rounded-xl border border-input bg-white text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="Entry-level">Entry-level</option>
              <option value="Mid-level">Mid-level</option>
              <option value="Senior">Senior</option>
              <option value="Lead">Lead</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Salary Range</label>
            <Input value={editSalary} onChange={(e) => setEditSalary(e.target.value)} placeholder="e.g. $4k-6k" className="rounded-xl h-10" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Job Description</label>
          <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Describe the role and primary functions..." className="min-h-[100px] rounded-xl" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Required Skills (comma-separated)</label>
          <Input value={editSkills} onChange={(e) => setEditSkills(e.target.value)} placeholder="React, Node.js, Python" className="rounded-xl h-10" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Responsibilities (one per line)</label>
            <Textarea value={editResponsibilities} onChange={(e) => setEditResponsibilities(e.target.value)} placeholder="Develop new features&#10;Write clean code" className="min-h-[100px] rounded-xl" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Benefits (one per line)</label>
            <Textarea value={editBenefits} onChange={(e) => setEditBenefits(e.target.value)} placeholder="Health insurance&#10;Remote work flexible" className="min-h-[100px] rounded-xl" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              // Reset values
              setEditTitle(job.title || "");
              setEditDescription(job.description || "");
              setEditSkills(Array.isArray(job.skills) ? job.skills.join(", ") : "");
              setEditResponsibilities(Array.isArray(job.responsibilities) ? job.responsibilities.join("\n") : "");
              setEditBenefits(Array.isArray(job.benefits) ? job.benefits.join("\n") : "");
              setEditLocation(job.location || "");
              setEditSalary(job.salary || "");
              setEditType(job.type || "Full-time");
              setEditArrangement(job.arrangement || "On-site");
              setEditLevel(job.level || "Entry-level");
            }}
            disabled={loading}
            className="rounded-xl h-10 px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!editTitle.trim()) {
                alert("Job title is required.");
                return;
              }
              setDialog("save");
            }}
            disabled={loading}
            className="rounded-xl bg-primary hover:bg-primary/90 h-10 px-5 gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-primary font-bold text-sm">{(job.title || "J")[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[status.toLowerCase()] || STATUS_STYLES.draft}`}>
                {status.toLowerCase()}
              </span>
              {isOwner && status.toLowerCase() !== "closed" && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 ml-2 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
              )}
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{appCount} applicant{appCount !== 1 ? "s" : ""}</span>
              {job.created_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(job.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              )}
              {job.type && <span>{job.type}</span>}
              {job.arrangement && <span>{job.arrangement}</span>}
              {job.level && <span>{job.level}</span>}
              {job.salary && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary}</span>}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Rank */}
          <Button
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5"
            onClick={onNavigateRank}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Rank All
          </Button>

          {isOwner && (
            <>
              {/* Close — shown when Open or Reopened */}
              {(status.toLowerCase() === "open" || status.toLowerCase() === "reopened") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600 gap-1.5"
                  onClick={() => setDialog("close")}
                  disabled={loading}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Close Job
                </Button>
              )}

              {/* Reopen — shown when Closed */}
              {status.toLowerCase() === "closed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-green-300 text-green-600 hover:bg-green-50 gap-1.5"
                  onClick={() => setDialog("reopen")}
                  disabled={loading}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reopen Job
                </Button>
              )}

              {/* Delete — always shown */}
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 px-2.5"
                onClick={() => setDialog("delete")}
                disabled={loading}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
        </div>

        {/* Toggle Details Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-accent/40 py-2 border-t border-border transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide Details" : "View Job Details & Requirements"}
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="px-5 pb-5 pt-3 border-t border-border space-y-4 bg-slate-50/50">
            {job.description && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</h4>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
              </div>
            )}

            {job.skills && job.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {job.responsibilities && job.responsibilities.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Responsibilities</h4>
                <ul className="space-y-1">
                  {job.responsibilities.map((r, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {job.benefits && job.benefits.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Benefits</h4>
                <ul className="space-y-1">
                  {job.benefits.map((b, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={dialog === "close"}
        title="Close this job?"
        message="Are you sure you want to close this job? It will stop accepting new applications."
        confirmLabel="Yes, Close Job"
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
        onConfirm={handleClose}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "reopen"}
        title="Reopen this job?"
        message="Are you sure you want to reopen this job? It will start accepting applications again."
        confirmLabel="Yes, Reopen"
        confirmClass="bg-green-600 hover:bg-green-700 text-white"
        onConfirm={handleReopen}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title="Delete this job?"
        message="This will permanently delete this job and all its ranking results. This action cannot be undone."
        confirmLabel="Delete Permanently"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleDelete}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "save"}
        title="Update this job?"
        message="Are you sure you want to update this job? All existing rankings will be re-calculated based on the new job details."
        confirmLabel="Yes, Update Job"
        confirmClass="bg-primary hover:bg-primary/90 text-white"
        onConfirm={async () => {
          setDialog(null);
          await handleSave({
            title: editTitle,
            description: editDescription,
            skills: editSkills.split(",").map((s) => s.trim()).filter(Boolean),
            responsibilities: editResponsibilities.split("\n").map((r) => r.trim()).filter(Boolean),
            benefits: editBenefits.split("\n").map((b) => b.trim()).filter(Boolean),
            location: editLocation,
            salary: editSalary,
            type: editType,
            arrangement: editArrangement,
            level: editLevel,
          });
        }}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}