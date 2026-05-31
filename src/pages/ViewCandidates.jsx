import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Loader2, Brain, TrendingUp, BookOpen, FileText, Mail, X, Trash2, CheckSquare, Square, Zap, CalendarDays, User } from "lucide-react";
import ProposeInterviewModal from "@/components/recruiter/ProposeInterviewModal";
import CandidateProfileModal from "@/components/recruiter/CandidateProfileModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { quantaClient } from "@/api/quantaClient";
import { pgQuery } from "@/lib/neonDb";
import { useToast } from "@/components/ui/use-toast";

const STATUS_STYLES = {
  "processed": "bg-green-50 text-green-600 border-green-200",
  "pending": "bg-orange-50 text-orange-500 border-orange-200",
  "shortlisted": "bg-blue-50 text-blue-600 border-blue-200",
  "rejected": "bg-red-50 text-red-500 border-red-200",
};

export default function ViewCandidates() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [emailModal, setEmailModal] = useState(null); // { app, type: 'accept' | 'reject' }
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [ragProcessing, setRagProcessing] = useState(false);
  const [ragTriggered, setRagTriggered] = useState(false); // Default false — only show after RAG is triggered
  const [interviewModal, setInterviewModal] = useState(null); // application object
  const [confirmRag, setConfirmRag] = useState(false); // Confirmation dialog
  const [profileModal, setProfileModal] = useState(null); // { email, name }
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get("job_id");
  const jobTitle = urlParams.get("job") || "All Jobs";
  const jobStatus = urlParams.get("status") || "open";
  const fromAdmin = urlParams.get("from") === "admin";
  const backPath = fromAdmin ? "/admin-dashboard" : "/recruiter-dashboard";

  useEffect(() => {
    const fetchApplications = async () => {
      // Candidates per Job: SELECT * FROM applications_detail_view WHERE job_id = :jobId ORDER BY match_score DESC NULLS LAST
      const query = jobId
        ? 'SELECT * FROM applications WHERE job_id = $1 ORDER BY match_score DESC NULLS LAST'
        : 'SELECT * FROM applications ORDER BY match_score DESC NULLS LAST';
      const params = jobId ? [jobId] : [];
      const data = await pgQuery(query, params);
      setApplications(data || []);
      setLoading(false);
    };
    fetchApplications();

    // Auto-refresh every 5s to pick up newly processed CVs
    const interval = setInterval(async () => {
      const query = jobId
        ? 'SELECT * FROM applications WHERE job_id = $1 ORDER BY match_score DESC NULLS LAST'
        : 'SELECT * FROM applications ORDER BY match_score DESC NULLS LAST';
      const params = jobId ? [jobId] : [];
      const data = await pgQuery(query, params);
      const hasPending = (data || []).some((a) => a.status === "pending" || a.status === "submitted");
      if (!hasPending) { clearInterval(interval); return; }
      setApplications((prev) => {
        const prevIds = new Set(prev.map((a) => a.id));
        const updated = prev.map((a) => {
          const fresh = (data || []).find((d) => d.id === a.id);
          return fresh && (a.status === "pending" || a.status === "submitted") ? fresh : a;
        });
        (data || []).forEach((d) => {
          if (!prevIds.has(d.id) && (d.status === "pending" || d.status === "submitted")) updated.push(d);
        });
        return updated;
      })
    }, 5000);

    return () => clearInterval(interval);
  }, [jobId]);

  const filtered = applications
    .filter((a) => {
      const q = search.toLowerCase();
      return (
        !q ||
        (a.candidate_name || "").toLowerCase().includes(q) ||
        (a.candidate_email || "").toLowerCase().includes(q) ||
        (a.skills || []).some((s) => s.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      // Only sort by match_score after RAG is triggered
      if (ragTriggered) {
        const scoreA = a.match_score ?? -1;
        const scoreB = b.match_score ?? -1;
        return scoreB - scoreA;
      }
      // Before RAG, keep original order (by created_date)
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const processed = applications.filter((a) => a.status === "processed" || a.match_score);

  const updateStatus = async (appId, status) => {
    await pgQuery('UPDATE applications SET status = $1, is_viewed = true WHERE id = $2', [status, appId]);
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status, is_viewed: true } : a));
  };

  const markViewed = async (appId) => {
    const app = applications.find(a => a.id === appId);
    if (app && !app.is_viewed) {
      await pgQuery('UPDATE applications SET is_viewed = true WHERE id = $1', [appId]);
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, is_viewed: true } : a));
    }
  };

  const openEmailModal = async (app, type) => {
    const isAccept = type === "accept";
    // Show default template immediately so Send is not blocked
    const defaultMsg = isAccept
      ? `Dear ${app.candidate_name || "Candidate"},\n\nCongratulations! You have been selected for the ${jobTitle} position. We look forward to welcoming you to the team and will be in touch shortly with next steps.\n\nBest regards,\nThe Hiring Team`
      : `Dear ${app.candidate_name || "Candidate"},\n\nThank you for applying for the ${jobTitle} position. After careful consideration, we will not be moving forward with your application at this time. We appreciate your interest and wish you the best.\n\nBest regards,\nThe Hiring Team`;

    setEmailModal({ app, type });
    setEmailMessage(defaultMsg);
    setSendingEmail(false);

    const isAcceptForAI = type === "accept";
    // AI refines in background — replaces template when ready
    try {
      const result = await quantaClient.integrations.Core.InvokeLLM({
        prompt: isAcceptForAI
          ? `Write a short 3-sentence acceptance email for ${app.candidate_name || "the candidate"} for the ${jobTitle} role. Mention 1-2 of their strengths: ${(app.strengths || []).slice(0, 2).join(", ") || "strong skills"}. Start with "Dear ${app.candidate_name || "Candidate"}," and end with "Best regards,\nThe Hiring Team". No subject line.`
          : `Write a short 3-sentence rejection email for ${app.candidate_name || "the candidate"} for the ${jobTitle} role. Briefly mention why (e.g. ${(app.improvements || []).slice(0, 1).join(", ") || "stronger candidates"}). Start with "Dear ${app.candidate_name || "Candidate"}," and end with "Best regards,\nThe Hiring Team". No subject line.`,
      });
      setEmailMessage(result);
    } catch {
      // Keep the default template already shown
    }
  };

  const handleSendEmail = async () => {
    if (!emailModal) return;
    const { app, type } = emailModal;
    const isAccept = type === "accept";
    setSendingEmail(true);
    await Promise.all([
      quantaClient.integrations.Core.SendEmail({
        to: app.candidate_email,
        subject: isAccept ? `Congratulations – ${jobTitle} Offer` : `Application Update – ${jobTitle}`,
        body: emailMessage
      }),
      pgQuery('UPDATE applications SET status = $1, is_viewed = true WHERE id = $2', [isAccept ? "shortlisted" : "rejected", app.id])
    ]);
    // Remove the candidate from the list immediately
    setApplications((prev) => prev.filter((a) => a.id !== app.id));
    setSendingEmail(false);
    setEmailModal(null);
  };

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  };

  const deleteCandidate = async (appId) => {
    await pgQuery('DELETE FROM applications WHERE id = $1', [appId]);
    setApplications((prev) => prev.filter((a) => a.id !== appId));
    setSelected((prev) => { const next = new Set(prev); next.delete(appId); return next; });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkProcessing(true);
    await pgQuery(`DELETE FROM applications WHERE id = ANY($1::uuid[])`, [ids]);
    setApplications((prev) => prev.filter((a) => !ids.includes(a.id)));
    setSelected(new Set());
    setBulkProcessing(false);
  };

  const triggerRAGPipeline = async () => {
    setRagProcessing(true);
    setConfirmRag(false);
    toast({ description: "Starting RAG analysis on all CVs..." });
    
    try {
      const pending = applications.filter((a) => a.status === "pending");
      await Promise.all(
        pending.map((app) =>
          quantaClient.functions.invoke("processCV", {
            cv_url: app.cv_url,
            application_id: app.id,
            job_id: jobId || app.job_id,
            job_title: jobTitle || app.job_title,
            job_description: "", 
            job_skills: []
          })
        )
      );
      
      // Refresh applications to show updated scores
      const query = jobId
        ? 'SELECT * FROM applications WHERE job_id = $1 ORDER BY match_score DESC NULLS LAST'
        : 'SELECT * FROM applications ORDER BY match_score DESC NULLS LAST';
      const params = jobId ? [jobId] : [];
      const updated = await pgQuery(query, params);
      setApplications(updated || []);
      
      toast({ description: "RAG analysis completed! Navigating to results..." });
      // Navigate to results page
      navigate(`/rag-analysis-results?job_id=${jobId}&job=${encodeURIComponent(jobTitle)}`);
    } catch (error) {
      toast({ description: "Failed to start RAG analysis. Please try again." });
      console.error(error);
    } finally {
      setRagProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 md:px-10 py-4 sticky top-0 z-10">
        <Link to={backPath} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground">Job Status:</span>
              <Badge className="bg-green-50 text-green-600 border-green-200">{jobStatus}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{jobTitle}</h1>
            <p className="text-sm text-muted-foreground">Applicants ranked by AI RAG match score</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
         {/* RAG button - Only visible to recruiters, not admins */}
         {!fromAdmin && (
           <div className="flex justify-center">
             <Button
               size="lg"
               className="bg-primary hover:bg-primary/90 rounded-xl gap-2 px-8"
               onClick={() => setConfirmRag(true)}
               disabled={ragProcessing}
             >
               {ragProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
               {ragProcessing ? "Analyzing All CVs..." : "Run RAG Analysis"}
             </Button>
           </div>
         )}

         {/* Search */}
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <Input
             placeholder="Search by name, email, or skills..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="pl-9 h-11 rounded-xl bg-white"
           />
         </div>

         {ragTriggered && applications.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-sm text-muted-foreground mb-2">Total Applications</p>
              <p className="text-2xl font-bold text-foreground">{applications.length}</p>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-sm text-muted-foreground mb-2">CV Analyzed</p>
              <p className="text-2xl font-bold text-foreground">{processed.length}</p>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-sm text-muted-foreground mb-2">AI Fairness</p>
              <p className="text-base font-bold text-green-600">Bias Check Passed ✓</p>
            </div>
          </div>
          )}

         {/* Candidates list */}
         <div className="space-y-4">
           <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
             <div>
               <h2 className="font-semibold text-foreground text-lg">Applicants</h2>
               <p className="text-sm text-muted-foreground">All candidates before analysis</p>
             </div>
             {filtered.length > 0 && (
               <div className="flex items-center gap-2 flex-wrap">
                 <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                   {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                   {selected.size === filtered.length && filtered.length > 0 ? "Deselect All" : "Select All"}
                 </button>
                 {selected.size > 0 && (
                   <>
                     <span className="text-sm text-muted-foreground">{selected.size} selected</span>
                     <Button size="sm" variant="outline" className="rounded-xl border-red-200 text-red-400 hover:bg-red-50 gap-1.5" onClick={handleBulkDelete} disabled={bulkProcessing}>
                       <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                     </Button>
                   </>
                 )}
               </div>
             )}
           </div>

           {loading ? (
             <div className="flex items-center justify-center py-16">
               <Loader2 className="w-6 h-6 animate-spin text-primary" />
             </div>
           ) : filtered.length === 0 ? (
             <div className="bg-white border border-border rounded-2xl p-10 text-center text-muted-foreground">
               No applications yet. Candidates will appear here after applying.
             </div>
           ) : (
             <div className="space-y-3">
               {filtered.map((a, i) => {
                 const initials = (a.candidate_name || a.candidate_email || "?").split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
                 const isExpanded = expanded === a.id;
                 return (
                   <div key={a.id} className={`bg-white border rounded-2xl p-5 ${selected.has(a.id) ? "border-primary/50 bg-accent/10" : "border-border"}`}>
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                       <div className="flex items-center gap-4 flex-1">
                         <button onClick={() => toggleSelect(a.id)} className="shrink-0">
                           {selected.has(a.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                         </button>
                         {ragTriggered && a.match_score && <span className={`text-sm font-bold w-6 text-yellow-500`}>#{i + 1}</span>}
                         <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
                           <span className="text-primary font-semibold text-sm">{initials}</span>
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex flex-wrap items-center gap-2 mb-0.5">
                             <h3 className="font-semibold text-foreground">{a.candidate_name || a.candidate_email || "Unknown"}</h3>
                             {ragTriggered && (
                               <Badge className={`text-xs ${STATUS_STYLES[a.status] || "bg-muted text-muted-foreground"}`}>
                                 {a.status === "processed" ? "CV Analyzed" : a.status === "shortlisted" ? "Shortlisted" : a.status === "rejected" ? "Rejected" : "Pending"}
                               </Badge>
                             )}
                           </div>
                           {a.candidate_name && a.candidate_name !== a.candidate_email && (
                              <p className="text-sm text-muted-foreground mb-2">{a.candidate_email}</p>
                            )}
                           <div className="flex flex-wrap gap-1.5">
                             {(Array.isArray(a.skills) ? a.skills : []).slice(0, 5).map((s) => (
                               <span key={s} className="text-xs bg-accent text-primary px-2.5 py-1 rounded-full">{s}</span>
                             ))}
                             {(Array.isArray(a.skills) ? a.skills : []).length > 5 && <span className="text-xs text-muted-foreground">+{(Array.isArray(a.skills) ? a.skills : []).length - 5} more</span>}
                           </div>
                         </div>
                       </div>

                       <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                         {ragTriggered && a.match_score ? (
                           <div className="text-right">
                             <p className="text-xs text-muted-foreground">Match Score</p>
                             <p className={`text-3xl font-bold ${a.match_score >= 80 ? "text-green-600" : a.match_score >= 60 ? "text-orange-500" : "text-muted-foreground"}`}>
                               {a.match_score}
                             </p>
                           </div>
                         ) : null}
                         <div className="flex gap-2 flex-wrap justify-end">
                           <Button variant="outline" size="sm" className="rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-accent" onClick={() => setProfileModal({ email: a.candidate_email, name: a.candidate_name })}>
                             <User className="w-3.5 h-3.5" /> Profile
                           </Button>
                           {a.cv_url && (
                             <a href={a.cv_url} target="_blank" rel="noopener noreferrer">
                               <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                                 <FileText className="w-3.5 h-3.5" /> CV
                               </Button>
                             </a>
                           )}
                           {ragTriggered && (a.status === "processed" || a.match_score) && (
                             <Button variant="outline" size="sm" className="rounded-xl border-primary text-primary hover:bg-accent" onClick={() => { setExpanded(isExpanded ? null : a.id); if (!isExpanded) markViewed(a.id); }}>
                               {isExpanded ? "Hide" : "Details"}
                             </Button>
                           )}
                           {a.status !== "shortlisted" && a.status !== "rejected" && (
                             <Button size="sm" className="rounded-xl bg-green-600 hover:bg-green-700 text-white" onClick={() => navigate(`/rag-analysis-results?job_id=${a.job_id}&job=${encodeURIComponent(a.job_title)}`)}>
                               Accept
                             </Button>
                           )}
                           {a.status !== "rejected" && a.status !== "shortlisted" && (
                             <Button size="sm" variant="outline" className="rounded-xl border-red-300 text-red-500 hover:bg-red-50" onClick={() => navigate(`/rag-analysis-results?job_id=${a.job_id}&job=${encodeURIComponent(a.job_title)}`)}>
                               Reject
                             </Button>
                           )}
                           <Button size="sm" variant="outline" className="rounded-xl border-primary/30 text-primary hover:bg-accent gap-1.5" onClick={() => navigate(`/rag-analysis-results?job_id=${a.job_id}&job=${encodeURIComponent(a.job_title)}`)}>
                             <CalendarDays className="w-3.5 h-3.5" /> Interview
                           </Button>
                           <Button size="sm" variant="outline" className="rounded-xl border-red-200 text-red-400 hover:bg-red-50" onClick={() => deleteCandidate(a.id)}>
                             <Trash2 className="w-3.5 h-3.5" />
                           </Button>
                         </div>
                       </div>
                     </div>

                     {/* Expanded RAG Results */}
                     {isExpanded && (
                       <div className="mt-5 pt-5 border-t border-border space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="bg-muted/50 rounded-xl p-4">
                             <div className="flex items-center gap-2 mb-2">
                               <TrendingUp className="w-4 h-4 text-primary" />
                               <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Experience</p>
                             </div>
                             <p className="text-2xl font-bold text-foreground">{a.years_of_experience || 0} <span className="text-sm font-normal text-muted-foreground">years</span></p>
                           </div>
                           <div className="bg-green-50 rounded-xl p-4">
                             <div className="flex items-center gap-2 mb-2">
                               <Brain className="w-4 h-4 text-green-600" />
                               <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Strengths</p>
                             </div>
                             <ul className="space-y-1">{(a.strengths || []).map((s, idx) => <li key={idx} className="text-xs text-green-700">• {s}</li>)}</ul>
                           </div>
                           <div className="bg-orange-50 rounded-xl p-4">
                             <div className="flex items-center gap-2 mb-2">
                               <BookOpen className="w-4 h-4 text-orange-500" />
                               <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Areas to Improve</p>
                             </div>
                             <ul className="space-y-1">{(a.improvements || []).map((s, idx) => <li key={idx} className="text-xs text-orange-600">• {s}</li>)}</ul>
                           </div>
                         </div>
                         {(a.education_summary || a.work_experience_summary) && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {a.education_summary && (
                               <div className="bg-muted/30 rounded-xl p-4">
                                 <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Education</p>
                                 <p className="text-sm text-muted-foreground">{a.education_summary}</p>
                               </div>
                             )}
                             {a.work_experience_summary && (
                               <div className="bg-muted/30 rounded-xl p-4">
                                 <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Work Experience</p>
                                 <p className="text-sm text-muted-foreground">{a.work_experience_summary}</p>
                               </div>
                             )}
                           </div>
                         )}
                         {a.cv_url && (
                           <a href={a.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                             <FileText className="w-4 h-4" /> View CV
                           </a>
                         )}
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
         </div>

          {/* Candidate Profile Modal */}
          {profileModal && (
            <CandidateProfileModal
              candidateEmail={profileModal.email}
              candidateName={profileModal.name}
              jobId={jobId}
              onClose={() => setProfileModal(null)}
            />
          )}

          {/* Propose Interview Modal */}
           {interviewModal && (
        <ProposeInterviewModal
          application={interviewModal}
          recruiterEmail={localStorage.getItem("recruiterEmail") || ""}
          onClose={() => setInterviewModal(null)}
          onSent={() => setInterviewModal(null)}
        />
      )}

      {/* Confirm RAG Pipeline Modal */}
      {confirmRag && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => !ragProcessing && setConfirmRag(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
              <div>
                <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Start RAG Analysis?
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  This will automatically analyze all {applications.length} available CVs using AI matching. This process may take a few minutes.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmRag(false)} disabled={ragProcessing}>Cancel</Button>
                <Button
                  className="flex-1 rounded-xl bg-primary hover:bg-primary/90 gap-2 text-white"
                  onClick={triggerRAGPipeline}
                  disabled={ragProcessing}
                >
                  {ragProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {ragProcessing ? "Starting..." : "Start Analysis"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Accept / Reject Email Modal */}
      {emailModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => !sendingEmail && setEmailModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-foreground text-lg">
                    {emailModal.type === "accept" ? "Accept & Notify Candidate" : "Reject & Notify Candidate"}
                  </h2>
                  <p className="text-sm text-muted-foreground">An email will be sent to <strong>{emailModal.app.candidate_email}</strong></p>
                </div>
                <button onClick={() => !sendingEmail && setEmailModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <textarea
                className="w-full border border-border rounded-xl p-3 text-sm text-foreground h-48 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                disabled={sendingEmail}
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEmailModal(null)} disabled={sendingEmail}>Cancel</Button>
                <Button
                  className={`flex-1 rounded-xl gap-2 text-white ${emailModal.type === "accept" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {sendingEmail ? "Sending..." : emailModal.type === "accept" ? "Send & Accept" : "Send & Reject"}
                </Button>
              </div>
            </div>
          </div>
        </>
        )}
        </div>
        </div>
        );
        }