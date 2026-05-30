import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Users, Clock, DollarSign, Briefcase, FileText, Sparkles, Loader2, Check, X, Search, AlertCircle, Award, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { quantaClient } from "@/api/quantaClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const STATUS_STYLES = {
  open: "bg-green-50 text-green-600 border border-green-200",
  closed: "bg-red-50 text-red-500 border border-red-200",
  reopened: "bg-yellow-50 text-yellow-600 border border-yellow-200",
  draft: "bg-gray-50 text-gray-500 border border-gray-200",
};

export default function JobRankingPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(`session_id_${jobId}`) || "");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const fetchJobAndApplications = async () => {
    try {
      // 1. Fetch Job details
      const jobData = await quantaClient.entities.Job.get(jobId);
      setJob(jobData);

      // 2. Fetch Job applications
      const response = await fetch(`http://127.0.0.1:8000/api/applications/job/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      } else {
        console.error("Failed to fetch applications");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load candidate applications."
        });
      }
    } catch (error) {
      console.error("Error loading page data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load job details or applications."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) {
      navigate("/recruiter-dashboard");
      return;
    }
    fetchJobAndApplications();
  }, [jobId]);

  const handleRankAll = async () => {
    const appsWithCV = candidates.filter((c) => c.cv_url && c.cv_url.trim());
    if (appsWithCV.length === 0) {
      toast({
        variant: "destructive",
        title: "No CVs Found",
        description: "There are no applications with CVs to rank."
      });
      return;
    }

    setRanking(true);
    try {
      // 1. Call POST /api/match/ to initialize/align matching session in the backend
      const matchResponse = await fetch("http://127.0.0.1:8000/api/match/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
        },
        body: JSON.stringify({ job_id: jobId })
      });

      if (!matchResponse.ok) {
        throw new Error("Failed to start match session on backend");
      }

      const matchData = await matchResponse.json();
      if (matchData && matchData.session_id) {
        setSessionId(matchData.session_id);
        localStorage.setItem(`session_id_${jobId}`, matchData.session_id);
      }

      // 2. Process CVs in parallel to calculate and store match_score in applications collection
      await Promise.all(
        appsWithCV.map(app =>
          quantaClient.functions.invoke("processCV", {
            resume_url: app.cv_url,
            application_id: app.id,
            job_id: jobId,
            job_title: job.title,
            job_description: job.description,
            job_skills: job.skills || [],
          })
        )
      );

      toast({
        title: "Success",
        description: "Candidates ranked successfully."
      });
      
      // Refresh candidates list
      await fetchJobAndApplications();
    } catch (error) {
      console.error("Error ranking candidates:", error);
      toast({
        variant: "destructive",
        title: "Ranking Failed",
        description: "An error occurred while running the ranking process."
      });
    } finally {
      setRanking(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackLoading(true);
    try {
      let activeSessionId = sessionId;
      
      // 1. If no active session id in state/localStorage, initialize a session first
      if (!activeSessionId) {
        const matchResponse = await fetch("http://127.0.0.1:8000/api/match/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
          },
          body: JSON.stringify({ job_id: jobId })
        });
        
        if (!matchResponse.ok) {
          throw new Error("Failed to initialize match session.");
        }
        
        const matchData = await matchResponse.json();
        activeSessionId = matchData.session_id;
        setSessionId(activeSessionId);
        localStorage.setItem(`session_id_${jobId}`, activeSessionId);
      }
      
      // 2. Fetch all CV records to get the cv_id -> file_url mapping
      const cvResponse = await fetch("http://127.0.0.1:8000/api/cvs/", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
        }
      });
      if (!cvResponse.ok) {
        throw new Error("Failed to fetch CV mapping records.");
      }
      const cvData = await cvResponse.json();
      const cvsList = cvData.cvs || [];
      const cvIdToUrlMap = {};
      cvsList.forEach(cv => {
        cvIdToUrlMap[cv.cv_id] = cv.file_url;
      });
      
      // 3. Send feedback to POST /api/match/{session_id}/feedback
      const feedbackResponse = await fetch(`http://127.0.0.1:8000/api/match/${activeSessionId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
        },
        body: JSON.stringify({ feedback: feedbackText })
      });
      
      if (!feedbackResponse.ok) {
        const errData = await feedbackResponse.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to process feedback re-ranking");
      }
      
      const feedbackData = await feedbackResponse.json();
      const newResults = feedbackData.all_results || feedbackData.top_candidates || [];
      
      // 4. Update the candidate application documents in parallel
      await Promise.all(
        newResults.map(async (row) => {
          const fileUrl = cvIdToUrlMap[row.cv_id];
          if (!fileUrl) return;
          
          // Find matching application in state candidates
          const matchingApp = candidates.find(c => c.cv_url === fileUrl);
          if (matchingApp) {
            await quantaClient.entities.Application.update(matchingApp.id, {
              match_score: row.final_score,
              rag_results: {
                feedback: row.verdict || "",
                ranking_reason: row.verdict || "",
                scores: row.scores || {}
              }
            });
          }
        })
      );
      
      // 5. Refresh candidates list
      await fetchJobAndApplications();
      
      toast({
        title: "Re-ranking Complete",
        description: `Feedback applied successfully. Candidates have been re-ranked.`,
      });
      
      setShowFeedbackModal(false);
      setFeedbackText("");
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      toast({
        variant: "destructive",
        title: "Error Re-ranking",
        description: err.message || "Failed to process feedback. Please try again."
      });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    // Optimistically update frontend state immediately
    setCandidates((prev) =>
      prev.map((c) => (c.id === appId ? { ...c, status: newStatus } : c))
    );

    try {
      await quantaClient.entities.Application.update(appId, { status: newStatus });
      
      let title = "Status Updated";
      let description = `Candidate status updated to ${newStatus}.`;
      if (newStatus === "shortlisted") {
        title = "Shortlisted";
        description = "Candidate shortlisted successfully";
      } else if (newStatus === "rejected") {
        title = "Rejected";
        description = "Candidate rejected successfully";
      } else if (newStatus === "pending") {
        title = "Pending";
        description = "Candidate status reset successfully";
      }

      toast({
        title,
        description
      });
      // Refresh list to pull updated status
      await fetchJobAndApplications();
    } catch (error) {
      console.error("Failed to update candidate status:", error);
      // Revert optimistic update on failure
      await fetchJobAndApplications();
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update candidate status."
      });
    }
  };

  const filteredAndSortedCandidates = candidates
    .filter((cand) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        cand.candidate_name.toLowerCase().includes(query) ||
        cand.candidate_email.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "shortlisted" && cand.status === "shortlisted") ||
        (statusFilter === "rejected" && cand.status === "rejected") ||
        (statusFilter === "pending" && (!cand.status || cand.status === "pending" || cand.status === "processed"));

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort ranked candidates by score descending, others at bottom
      const scoreA = a.match_score !== undefined && a.match_score !== null ? a.match_score : -1;
      const scoreB = b.match_score !== undefined && b.match_score !== null ? b.match_score : -1;
      return scoreB - scoreA;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading Job & Candidate Details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-foreground">Job Not Found</h2>
        <Link to="/recruiter-dashboard">
          <Button className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const jobStatus = job.status || "open";

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Top sticky header */}
      <div className="bg-white border-b border-border px-6 md:px-10 py-5 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link to="/recruiter-dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{job.title}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[jobStatus.toLowerCase()] || STATUS_STYLES.draft}`}>
                {jobStatus}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              {job.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />{job.location}</span>
              )}
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary" />{candidates.length} applicant{candidates.length !== 1 ? "s" : ""}</span>
              {job.created_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Created: {new Date(job.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              )}
              {job.type && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">{job.type}</span>}
              {job.arrangement && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">{job.arrangement}</span>}
              {job.level && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">{job.level}</span>}
              {job.salary && <span className="flex items-center gap-1 font-semibold text-primary"><DollarSign className="w-3.5 h-3.5" />{job.salary}</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => setShowFeedbackModal(true)}
              disabled={ranking || feedbackLoading || candidates.length === 0}
              variant="outline"
              className="border-primary/20 text-primary hover:bg-primary/5 rounded-xl shadow-sm gap-2 font-medium px-5"
            >
              <MessageSquare className="w-4 h-4 text-primary" />
              Rank with Feedback
            </Button>
            <Button
              onClick={handleRankAll}
              disabled={ranking || candidates.length === 0}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md gap-2 font-medium px-5"
            >
              {ranking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ranking Candidates...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Run Candidate Ranking
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Job Description and Requirements */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Job Requirements & Specs
              </h2>

              {job.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Role Description</h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-xl border border-slate-100">{job.description}</p>
                </div>
              )}

              {job.skills && job.skills.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Required Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.responsibilities && job.responsibilities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Responsibilities</h3>
                  <ul className="space-y-2">
                    {job.responsibilities.map((r, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2 bg-slate-50/40 p-2.5 rounded-lg border border-slate-100/50">
                        <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {job.benefits && job.benefits.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Benefits</h3>
                  <ul className="space-y-2">
                    {job.benefits.map((b, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2 bg-green-50/30 p-2.5 rounded-lg border border-green-100/50">
                        <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Candidates & Applications */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search and Filters */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-xl"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                {["all", "pending", "shortlisted", "rejected"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all whitespace-nowrap ${
                      statusFilter === filter
                        ? "bg-primary border-primary text-white shadow-sm"
                        : "bg-white border-border text-muted-foreground hover:text-foreground hover:bg-slate-50"
                    }`}
                  >
                    {filter === "all" ? "All Applicants" : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidates list */}
            {ranking && (
              <div className="bg-white border border-primary/20 rounded-2xl p-8 text-center shadow-sm space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">AI Matching Engine in Progress</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">Evaluating resumes against required skills, work experience, education, and background. This might take a few moments...</p>
                </div>
              </div>
            )}

            {!ranking && filteredAndSortedCandidates.length === 0 ? (
              <div className="bg-white border border-border rounded-2xl p-12 text-center text-muted-foreground shadow-sm">
                <AlertCircle className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-sm font-medium">No applications found matching the search criteria.</p>
                {candidates.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Candidates will appear here once they upload their resumes to this job.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {!ranking && filteredAndSortedCandidates.map((cand, idx) => {
                  const hasScore = cand.match_score !== undefined && cand.match_score !== null;
                  const isShortlisted = cand.status === "shortlisted";
                  const isRejected = cand.status === "rejected";

                  return (
                    <div
                      key={cand.id}
                      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isShortlisted ? "border-green-200 bg-green-50/10" :
                        isRejected ? "border-red-100 bg-red-50/5" : "border-border"
                      }`}
                    >
                      {/* Left side: Candidate profile info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {hasScore ? (
                            <span className="text-primary-700 font-extrabold">#{idx + 1}</span>
                          ) : (
                            <span>{cand.candidate_name[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            {cand.candidate_name}
                            {isShortlisted && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                                <Check className="w-2.5 h-2.5" /> Shortlisted
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                                <X className="w-2.5 h-2.5" /> Rejected
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium">{cand.candidate_email}</p>
                          {cand.upload_date && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              Applied: {new Date(cand.upload_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right side: Resume link & scores */}
                      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 justify-between md:justify-end">
                        {cand.cv_url && (
                          <a
                            href={cand.cv_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold border border-primary/20 bg-primary/5 rounded-xl px-3 py-2 transition-all hover:bg-primary/10 shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-[150px] truncate">{cand.cv_filename || "View Resume"}</span>
                          </a>
                        )}

                        <div className="shrink-0">
                          {hasScore ? (
                            <div className={`inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-xl border ${
                              cand.match_score >= 80 ? "bg-green-100 text-green-700 border-green-300 shadow-sm shadow-green-100" :
                              cand.match_score >= 60 ? "bg-orange-100 text-orange-700 border-orange-300 shadow-sm shadow-orange-100" :
                              "bg-slate-100 text-slate-700 border-slate-300"
                            }`}>
                              <Award className="w-3.5 h-3.5" />
                              Match: {cand.match_score}%
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border bg-slate-50 text-slate-400 border-slate-200 italic">
                              Match: Pending
                            </div>
                          )}
                        </div>

                        {/* Status Toggle Controls */}
                        <div className="flex items-center gap-1 border border-border/80 bg-slate-50/50 p-1 rounded-xl shrink-0">
                          <button
                            onClick={() => handleStatusChange(cand.id, "shortlisted")}
                            className={`p-1.5 rounded-lg transition-all ${
                              isShortlisted
                                ? "bg-green-600 text-white shadow-sm"
                                : "text-muted-foreground hover:text-green-600 hover:bg-green-50"
                            }`}
                            title="Shortlist Candidate"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(cand.id, "rejected")}
                            className={`p-1.5 rounded-lg transition-all ${
                              isRejected
                                ? "bg-red-600 text-white shadow-sm"
                                : "text-muted-foreground hover:text-red-500 hover:bg-red-50"
                            }`}
                            title="Reject Candidate"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {(isShortlisted || isRejected) && (
                            <button
                              onClick={() => handleStatusChange(cand.id, "pending")}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-slate-100 transition-all"
                              title="Reset status to pending"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Dialog Modal */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 bg-white border border-border/60 shadow-xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Agentic RAG Re-ranking Feedback
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Provide specific guidelines or preferences to rewrite the matching query. The AI will re-evaluate candidate CVs based on your feedback (up to 3 rounds).
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Feedback / Search Directives
            </label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Focus on candidates with strong React and typescript experience, prioritize those who have worked in fintech companies, or disregard candidates without a computer science degree."
              className="min-h-[120px] rounded-xl resize-none text-sm p-3.5 focus-visible:ring-primary/20 border-border"
            />
          </div>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowFeedbackModal(false);
                setFeedbackText("");
              }}
              className="rounded-xl flex-1 font-semibold border-border text-muted-foreground hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFeedbackSubmit}
              disabled={feedbackLoading || !feedbackText.trim()}
              className="rounded-xl flex-1 font-semibold bg-primary hover:bg-primary/90 text-white gap-2"
            >
              {feedbackLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Re-ranking...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Apply & Re-rank
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
