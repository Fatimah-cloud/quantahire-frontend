import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Loader2, Clock, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quantaClient } from "@/api/quantaClient";
import StatsCard from "../components/recruiter/StatsCard";
import AccountDropdown from "../components/AccountDropdown";
import JobCard from "../components/recruiter/JobCard";

const TABS = ["All Jobs", "Open", "Closed", "Reopened", "Draft"];

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All Jobs");
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [recruiterStatus, setRecruiterStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [recruiterProfile, setRecruiterProfile] = useState(null);

  useEffect(() => {
    const init = async () => {
      const recruiterId = localStorage.getItem("recruiterId");
      const recruiterEmail = localStorage.getItem("recruiterEmail");
      if (!recruiterId || !recruiterEmail) {
        navigate("/recruiter-auth");
        return;
      }
      setUser({ email: recruiterEmail, id: recruiterId });
      try {
        // Check recruiter status in RecruiterProfile
        const profiles = await quantaClient.entities.RecruiterProfile.filter({ email: recruiterEmail });
        const profile = profiles && profiles.length > 0 ? profiles[0] : null;
        setRecruiterProfile(profile);

        if (profile && profile.status === "pending") {
          setRecruiterStatus("pending");
          setLoading(false);
          return;
        }
        if (profile && profile.status === "blocked") {
          setRecruiterStatus("blocked");
          setLoading(false);
          return;
        }
        
        // My Jobs: fetch from QuantaHire
        const me = await quantaClient.auth.me();
        const jobsData = await quantaClient.entities.Job.filter({ recruiter_id: me.id }, "-created_date");
        const appsData = await quantaClient.entities.Application.list();
        
        // Filter applications for recruiter's jobs
        const recruiterJobIds = new Set((jobsData || []).map(j => j.id));
        const recruiterApps = (appsData || []).filter(a => recruiterJobIds.has(a.job_id));
        
        setRecruiterStatus("approved");
         setJobs(jobsData || []);
         setApplications(recruiterApps || []);
         setLoading(false);
         setChecking(false);
        } catch (err) {
          console.error("Failed to load recruiter data:", err);
          setLoading(false);
          setChecking(false);
        }
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = quantaClient.entities.Application.subscribe((event) => {
      setApplications((prev) => {
        const jobIds = new Set(jobs.map(j => j.id));
        if (event.type === "create" && jobIds.has(event.data?.job_id)) {
          return [event.data, ...prev];
        } else if (event.type === "update" && jobIds.has(event.data?.job_id)) {
          return prev.map(a => a.id === event.id ? event.data : a);
        } else if (event.type === "delete") {
          return prev.filter(a => a.id !== event.id);
        }
        return prev;
      });
    });
    return () => unsubscribe();
  }, [user, jobs]);

  const reloadJobs = async () => {
    try {
      const me = await quantaClient.auth.me();
      const jobsData = await quantaClient.entities.Job.filter({ recruiter_id: me.id }, "-created_date");
      const appsData = await quantaClient.entities.Application.list();
      const recruiterJobIds = new Set((jobsData || []).map(j => j.id));
      const recruiterApps = (appsData || []).filter(a => recruiterJobIds.has(a.job_id));
      setJobs(jobsData || []);
      setApplications(recruiterApps || []);
    } catch (err) {
      console.error("Failed to reload jobs:", err);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesTab = activeTab === "All Jobs" || (job.status || "").toLowerCase() === activeTab.toLowerCase();
    const matchesSearch = (job.title || "").toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getJobAppCount = (jobId) => applications.filter((a) => a.job_id === jobId).length;

  const totalApplicants = applications.length;
  const pendingReviews = applications.filter((a) => a.status === "pending" || a.status === "processed").length;

  const STATS = [
    { label: "Total Applicants", value: String(totalApplicants), change: "", subtext: "across all jobs" },
    { label: "Pending Reviews", value: String(pendingReviews), change: "", subtext: "need action" },
  ];

  // Block access until approved
  if (!loading && recruiterStatus === "pending") {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-6">
        <div className="bg-white border border-border rounded-2xl p-10 max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Account Pending Approval</h2>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Your recruiter account is being reviewed by our admin team. You will receive an email once your account is approved.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => { localStorage.removeItem("recruiterEmail"); localStorage.removeItem("recruiterId"); navigate("/"); }}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!loading && recruiterStatus === "blocked") {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-10 max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-600">Account Blocked</h2>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              Your account has been blocked by our admin team. Please contact support for assistance.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => { localStorage.removeItem("recruiterEmail"); localStorage.removeItem("recruiterId"); navigate("/"); }}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Navbar */}
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="font-bold text-lg text-primary">QuantaHire</span>
          <p className="text-xs text-muted-foreground">Recruiter Portal</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground hidden sm:flex" onClick={() => navigate("/recruiter-profile")}>
            <UserCircle className="w-4 h-4" />My Profile
          </Button>
          <AccountDropdown
            email={user?.email}
            fullName={recruiterProfile?.full_name}
            phone={recruiterProfile?.phone}
            company={recruiterProfile?.company}
            role="Recruiter"
            onLogout={() => { localStorage.removeItem("recruiterEmail"); localStorage.removeItem("recruiterId"); navigate("/"); }}
          />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">Recruiter Portal</p>
            <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your recruitment today.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 rounded-xl gap-2 h-11 px-5 self-start" onClick={() => navigate("/post-job")}>
            <Plus className="w-4 h-4" />
            Post New Job
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {STATS.map((s) => (
            <StatsCard key={s.label} label={s.label} value={s.value} change={s.change} subtext={s.subtext} />
          ))}
        </div>

        {/* Job Postings */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-foreground text-lg">Job Postings</h2>
              <p className="text-sm text-muted-foreground">Click "View Candidates" to see ranked applicants</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl w-full sm:w-64"
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TABS.map((tab) => {
              const count = tab === "All Jobs" ? jobs.length : jobs.filter((j) => (j.status || "").toLowerCase() === tab.toLowerCase()).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-primary text-white" : "bg-white border border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-10 text-center text-muted-foreground">No jobs found.</div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  appCount={getJobAppCount(job.id)}
                  recruiterEmail={user?.email}
                  onJobUpdated={reloadJobs}
                  onNavigateRank={() => navigate(`/recruiter/job/${job.id}/rank`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}