import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Briefcase, DollarSign, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quantaClient } from "@/api/quantaClient";

export default function CandidateJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await quantaClient.entities.Job.get(jobId);
        setJob(data);
      } catch (err) {
        console.error("Failed to load job details:", err);
      } finally {
        setLoading(false);
      }
    };
    if (jobId) fetchJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-4">
        <div className="bg-white border border-border rounded-3xl p-10 max-w-md w-full text-center space-y-5 shadow-sm">
          <h2 className="text-2xl font-bold text-foreground">Job Not Found</h2>
          <p className="text-muted-foreground text-sm">
            We couldn't retrieve the details for this job post. It might have been deleted or closed.
          </p>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/candidate/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center justify-between sticky top-0 z-10 h-16 shrink-0">
        <span className="font-bold text-lg text-primary">QuantaHire</span>
        <Button variant="ghost" size="sm" onClick={() => navigate("/candidate/dashboard")} className="text-muted-foreground hover:text-foreground rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Link to="/candidate/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Job Header Card */}
        <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              {job.employment_type || "Full-time"}
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              {job.work_arrangement || "On-site"}
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">{job.title}</h1>
            <p className="text-base font-medium text-muted-foreground mt-1">{job.company || "Company"}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>{job.location || "Remote / On-site"}</span>
            </div>
            {job.salary && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary shrink-0" />
                <span>{job.salary}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary shrink-0" />
              <span>{job.experience_level || "Any Experience"}</span>
            </div>
          </div>
        </div>

        {/* Job Details Content */}
        <div className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-2.5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Job Description
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {job.description || "No description provided."}
            </p>
          </div>

          {job.skills && job.skills.length > 0 && (
            <div className="space-y-3 border-t border-border pt-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span key={skill} className="text-xs bg-accent text-primary px-3 py-1 rounded-lg font-semibold border border-primary/10">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.responsibilities && (
            <div className="space-y-2.5 border-t border-border pt-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Responsibilities</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {job.responsibilities}
              </p>
            </div>
          )}

          {job.benefits && (
            <div className="space-y-2.5 border-t border-border pt-5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Benefits & Perks</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {job.benefits}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
