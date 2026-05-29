import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, Sparkles, Building2, X, CheckCircle, Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quantaClient } from "@/api/quantaClient";


const ARRANGEMENTS = ["On-site", "Remote", "Hybrid"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const LEVELS = ["Entry-level", "Mid-level", "Senior", "Lead"];

export default function BrowseJobs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedArrangements, setSelectedArrangements] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [error, setError] = useState(null);

  // Apply modal state
  const [applyJob, setApplyJob] = useState(null);
  const [applyFile, setApplyFile] = useState(null);
  const [applyUploading, setApplyUploading] = useState(false);
  const [applyDone, setApplyDone] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const candidateEmail = (localStorage.getItem("candidateEmail") || "").trim().toLowerCase();
        const candidateId = localStorage.getItem("candidateId");
        const user = candidateEmail ? { email: candidateEmail, id: candidateId, full_name: "" } : null;
        setCurrentUser(user);

        // Fetch all jobs and filter in-memory to allow open or reopened statuses case-insensitively
        const allJobs = await quantaClient.entities.Job.list();
        const openJobs = (allJobs || []).filter(
          (j) => (j.status || "").toLowerCase() === "open" || (j.status || "").toLowerCase() === "reopened"
        );
        setJobs(openJobs || []);

        // Check already applied
        if (candidateEmail) {
          const apps = await quantaClient.entities.Application.filter({ candidate_email: candidateEmail });
          setAppliedJobIds(new Set((apps || []).map((a) => a.job_id)));
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to load jobs:", err);
        setError("Failed to load jobs. Please refresh the page.");
        setLoading(false);
      }
    };
    init();
  }, []);

  const toggleItem = (list, setList, item) =>
    setList((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);

  const filtered = jobs.filter((job) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (job.title || "").toLowerCase().includes(q) || (job.company || "").toLowerCase().includes(q) || (job.skills || []).some((s) => s.toLowerCase().includes(q));
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(job.type);
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(job.level);
    const matchesArrangement = selectedArrangements.length === 0 || selectedArrangements.includes(job.arrangement);
    return matchesSearch && matchesType && matchesLevel && matchesArrangement;
  });

  const openApplyModal = (job) => {
    setApplyJob(job);
    setApplyFile(null);
    setApplyDone(false);
    setApplyError(null);
    setApplyUploading(false);
  };

  const handleApplySubmit = async () => {
    if (!applyFile || !applyJob) return;
    setApplyError(null);
    setApplyUploading(true);

    // 1. Upload CV
    const { file_url } = await quantaClient.integrations.Core.UploadFile({ file: applyFile });

    // 2. Create application record in QuantaHire
    const appData = await quantaClient.entities.Application.create({
      job_id: applyJob.id,
      job_title: applyJob.title,
      company: applyJob.company,
      candidate_email: currentUser.email,
      candidate_name: currentUser?.full_name || currentUser.email,
      cv_url: file_url,
      status: 'pending'
    });
    const applicationId = appData.id;

    // 3. Show success immediately — AI processing runs in the background
    setApplyUploading(false);
    setApplyDone(true);
    setAppliedJobIds((prev) => new Set([...prev, applyJob.id]));

    // Fire-and-forget AI processing (doesn't block the user)
    quantaClient.functions.invoke("processCV", {
      cv_url: file_url,
      application_id: applicationId,
      job_id: applyJob.id,
      job_title: applyJob.title,
      job_description: applyJob.description || "",
      job_skills: applyJob.skills || []
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F3FF]">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-6 md:px-10 py-3 sticky top-0 z-10">
        <button onClick={() => navigate("/candidate-dashboard")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-primary">Browse Jobs</h1>
          <p className="text-sm text-muted-foreground">Apply directly with your CV for instant AI matching</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search roles, companies, or skills..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-12 rounded-xl bg-white border-border text-sm" />
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar Filters */}
          <aside className="hidden md:block w-56 bg-white border border-border rounded-2xl p-5 space-y-5 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">Filters</span>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employment Type</p>
              {EMPLOYMENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" checked={selectedTypes.includes(type)} onChange={() => toggleItem(selectedTypes, setSelectedTypes, type)} />
                  <span className="text-sm text-foreground">{type}</span>
                </label>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Experience Level</p>
              {LEVELS.map((level) => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" checked={selectedLevels.includes(level)} onChange={() => toggleItem(selectedLevels, setSelectedLevels, level)} />
                  <span className="text-sm text-foreground">{level}</span>
                </label>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Arrangement</p>
              {ARRANGEMENTS.map((arr) => (
                <label key={arr} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" checked={selectedArrangements.includes(arr)} onChange={() => toggleItem(selectedArrangements, setSelectedArrangements, arr)} />
                  <span className="text-sm text-foreground">{arr}</span>
                </label>
              ))}
            </div>
          </aside>

          {/* Job List */}
          <div className="flex-1 space-y-4 min-w-0">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">{error}</div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{filtered.length} jobs found</p>
                {filtered.map((job) => {
                  const applied = appliedJobIds.has(job.id);
                  return (
                    <div key={job.id} className="bg-white border border-border rounded-2xl p-5 border-l-4 border-l-primary">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground text-base">{job.title}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                              <span className="bg-muted text-foreground px-2 py-0.5 rounded-md font-medium">{job.arrangement}</span>
                              <span>{job.type}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">{job.description}</p>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {(job.skills || []).map((skill) => (
                                <span key={skill} className="bg-muted text-foreground text-xs px-2.5 py-1 rounded-md border border-border">{skill}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-sm font-medium text-foreground">{job.salary}</span>
                              <span className="bg-muted text-foreground text-xs px-2.5 py-1 rounded-md border border-border font-medium">{job.level}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="rounded-xl text-xs h-8 px-4 w-28" onClick={() => setSelectedJob(job)}>
                            View Details
                          </Button>
                          {applied ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
                              <CheckCircle className="w-3 h-3" /> Applied
                            </span>
                          ) : (
                            <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-xl text-xs h-8 px-4 w-28" onClick={() => openApplyModal(job)}>
                              Apply Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Job Detail Panel */}
      {selectedJob && (
        <>
          <div className="fixed inset-0 bg-black/30 z-20" onClick={() => setSelectedJob(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-30 shadow-2xl overflow-y-auto flex flex-col">
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-lg leading-tight">{selectedJob.title}</h2>
                  <p className="text-sm text-muted-foreground">{selectedJob.company}</p>
                </div>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-muted-foreground hover:text-foreground mt-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Job Type</p><p className="text-sm font-semibold">{selectedJob.type}</p></div>
                <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Level</p><p className="text-sm font-semibold">{selectedJob.level}</p></div>
                <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Salary</p><p className="text-sm font-semibold">{selectedJob.salary}</p></div>
                <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Location</p><p className="text-sm font-semibold">{selectedJob.location}</p></div>
              </div>
              <div><h3 className="font-semibold mb-2">Description</h3><p className="text-sm text-muted-foreground">{selectedJob.description}</p></div>
              {(selectedJob.responsibilities || []).length > 0 && (
                <div><h3 className="font-semibold mb-2">Responsibilities</h3><ul className="space-y-1.5">{selectedJob.responsibilities.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />{r}</li>)}</ul></div>
              )}
              {(selectedJob.skills || []).length > 0 && (
                <div><h3 className="font-semibold mb-2">Required Skills</h3><div className="flex flex-wrap gap-1.5">{selectedJob.skills.map((s) => <span key={s} className="bg-accent text-primary text-xs px-2.5 py-1 rounded-md font-medium">{s}</span>)}</div></div>
              )}
              {(selectedJob.benefits || []).length > 0 && (
                <div><h3 className="font-semibold mb-2">Benefits</h3><ul className="space-y-1.5">{selectedJob.benefits.map((b, i) => <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{b}</li>)}</ul></div>
              )}
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              {appliedJobIds.has(selectedJob.id) ? (
                <div className="flex-1 flex items-center justify-center gap-2 text-green-600 font-semibold"><CheckCircle className="w-4 h-4" /> Already Applied</div>
              ) : (selectedJob.status && (selectedJob.status.toLowerCase() === "closed" || selectedJob.status.toLowerCase() === "draft")) ? (
                <div className="flex-1 flex items-center justify-center gap-2 text-red-500 font-semibold">This job is not accepting applications</div>
              ) : (
                <Button className="flex-1 bg-primary hover:bg-primary/90 rounded-xl" onClick={() => { setSelectedJob(null); openApplyModal(selectedJob); }}>Apply Now</Button>
              )}
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSelectedJob(null)}>Close</Button>
            </div>
          </div>
        </>
      )}

      {/* Apply Modal */}
      {applyJob && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => !applyUploading && setApplyJob(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
              {applyDone ? (
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Application Submitted!</h2>
                  <p className="text-sm text-muted-foreground">Your CV has been analyzed and your application sent to the recruiter with your AI match score.</p>
                  <Button className="w-full rounded-xl bg-primary hover:bg-primary/90" onClick={() => setApplyJob(null)}>Done</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-foreground text-lg">Apply for {applyJob.title}</h2>
                      <p className="text-sm text-muted-foreground">{applyJob.company}</p>
                    </div>
                    <button onClick={() => !applyUploading && setApplyJob(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>

                  {/* File Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${applyFile ? "border-primary bg-accent/30" : "border-border hover:border-primary/50 hover:bg-accent/20"}`}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => e.target.files[0] && setApplyFile(e.target.files[0])} />
                    {applyFile ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                        <p className="font-medium text-foreground text-sm">{applyFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{(applyFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <p className="font-medium text-foreground text-sm">Drop your CV or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF or DOCX, up to 10MB</p>
                      </>
                    )}
                  </div>

                  {applyUploading && <div className="flex items-center gap-2 text-sm text-primary"><Loader2 className="w-4 h-4 animate-spin" />Uploading CV...</div>}
                  {applyError && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{applyError}</div>}

                  <Button
                    className="w-full h-11 rounded-xl gap-2 bg-primary hover:bg-primary/90"
                    disabled={!applyFile || applyUploading}
                    onClick={handleApplySubmit}
                  >
                    {applyUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {applyUploading ? "Uploading..." : "Submit Application"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}