import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Clock, Briefcase, Users, UserCheck, FileText, Shield, Loader2, TrendingUp, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { quantaClient } from "@/api/quantaClient";
import { useToast } from "@/components/ui/use-toast";


function StatCard({ label, value, sub, subGreen, subOrange, icon: Icon, iconColor, iconBg, borderColor, loading }) {
  return (
    <div className={`bg-white border border-border border-l-4 ${borderColor} rounded-2xl p-5 space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <p className="text-4xl font-bold text-foreground">{value}</p>
      )}
      <p className={`text-xs font-medium ${subOrange ? "text-orange-500" : subGreen ? "text-green-500" : "text-muted-foreground"}`}>
        {subGreen && "↗ "}{sub}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [recruiters, setRecruiters] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [recruiterFilter, setRecruiterFilter] = useState("all");

  useEffect(() => {
    const init = async () => {
      const authed = await quantaClient.auth.isAuthenticated();
      if (!authed) { navigate("/admin-auth"); setChecking(false); return; }
      const me = await quantaClient.auth.me();
      if (me?.role !== "admin") { navigate("/"); setChecking(false); return; }
      setAdminEmail(me.email);

      // Fetch from RecruiterProfile, Jobs, and Applications
      const [recruitersData, jobsData, appsData] = await Promise.all([
        quantaClient.entities.RecruiterProfile.list(),
        quantaClient.entities.Job.list(),
        quantaClient.entities.Application.list(),
      ]);

      setRecruiters(recruitersData || []);
      setJobs(jobsData || []);
      setApplications(appsData || []);
      setLoading(false);
      setChecking(false);
    };
    init();
  }, [navigate]);

  const pendingRecruiters = recruiters.filter((r) => r.status === "pending");
  const activeRecruiters = recruiters.filter((r) => r.status === "approved");
  const blockedRecruiters = recruiters.filter((r) => r.status === "blocked");
  const activeJobs = jobs.filter((j) => j.status === "open");
  const scoredApps = applications.filter((a) => a.match_score);
  const avgScore = scoredApps.length
    ? Math.round(scoredApps.reduce((s, a) => s + a.match_score, 0) / scoredApps.length)
    : 0;

  const filteredRecruiters = recruiterFilter === "all" 
    ? recruiters 
    : recruiters.filter((r) => r.status === recruiterFilter);

  const handleApproveRecruiter = async (id) => {
    try {
      const recruiter = recruiters.find(r => r.id === id);
      await quantaClient.entities.RecruiterProfile.update(id, { status: 'approved' });
      if (recruiter && recruiter.user_id) {
        await quantaClient.entities.User.update(recruiter.user_id, { is_active: true });
      }
      const updated = await quantaClient.entities.RecruiterProfile.list();
      setRecruiters(updated || []);
      toast({ description: "Recruiter approved successfully" });
    } catch (err) {
      toast({ description: "Failed to approve recruiter" });
      console.error(err);
    }
  };

  const handleBlockRecruiter = async (id) => {
    try {
      const recruiter = recruiters.find(r => r.id === id);
      await quantaClient.entities.RecruiterProfile.update(id, { status: 'blocked' });
      if (recruiter && recruiter.user_id) {
        await quantaClient.entities.User.update(recruiter.user_id, { is_active: false });
      }
      const updated = await quantaClient.entities.RecruiterProfile.list();
      setRecruiters(updated || []);
      toast({ description: "Recruiter blocked successfully" });
    } catch (err) {
      toast({ description: "Failed to block recruiter" });
      console.error(err);
    }
  };

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F3FF]">
      {/* Navbar */}
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-none">QuantaHire Admin</p>
            <p className="text-xs text-muted-foreground">{adminEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/admin-profile"><User className="w-4 h-4" />My Profile</Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/"><LogOut className="w-4 h-4" />Logout</Link>
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage recruiters, monitor system activity, and review registrations</p>
        </div>

        {/* Stats Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard loading={loading} label="Total Recruiters" value={recruiters.length} sub={`${activeRecruiters.length} approved`} subGreen icon={Users} iconColor="text-primary" iconBg="bg-primary/10" borderColor="border-l-primary" />
          <StatCard loading={loading} label="Active Recruiters" value={activeRecruiters.length} sub={recruiters.length ? `${Math.round(activeRecruiters.length / recruiters.length * 100)}% of total` : "—"} icon={UserCheck} iconColor="text-green-500" iconBg="bg-green-50" borderColor="border-l-green-500" />
          <StatCard loading={loading} label="Pending Approvals" value={pendingRecruiters.length} sub="Require attention" subOrange={pendingRecruiters.length > 0} icon={Clock} iconColor="text-orange-500" iconBg="bg-orange-50" borderColor="border-l-orange-500" />
        </div>

        {/* Stats Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard loading={loading} label="Active Job Listings" value={activeJobs.length} sub={`${jobs.length} total posted`} icon={Briefcase} iconColor="text-blue-500" iconBg="bg-blue-50" borderColor="border-l-blue-500" />
          <StatCard loading={loading} label="Total Applications" value={applications.length} sub={`${scoredApps.length} CV analyzed`} subGreen={scoredApps.length > 0} icon={FileText} iconColor="text-primary" iconBg="bg-primary/10" borderColor="border-l-primary" />
          <StatCard loading={loading} label="Avg Match Score" value={avgScore ? `${avgScore}%` : "—"} sub="AI-computed across all jobs" icon={TrendingUp} iconColor="text-teal-500" iconBg="bg-teal-50" borderColor="border-l-teal-500" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">

          <Button variant="outline" className="rounded-xl gap-2 h-11 px-5" asChild>
            <Link to="/system-reports"><FileText className="w-4 h-4" />View Reports</Link>
          </Button>

          <Button variant="outline" className="rounded-xl gap-2 h-11 px-5" onClick={() => navigate("/jobs-reference")}>
            <Briefcase className="w-4 h-4" />Jobs Reference
          </Button>

          <Button className="rounded-xl gap-2 h-11 px-5 bg-primary hover:bg-primary/90" onClick={() => navigate("/admin-all-jobs")}>
            <Briefcase className="w-4 h-4" />All Jobs & CVs
          </Button>

          <Button variant="outline" className="rounded-xl gap-2 h-11 px-5 animate-pulse border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100" onClick={() => navigate("/admin-management")}>
            <Shield className="w-4 h-4" />Manage Admins
          </Button>

          <Button variant="outline" className="rounded-xl gap-2 h-11 px-5" onClick={() => navigate("/psych-admin")}>
            <TrendingUp className="w-4 h-4" />Psychometric Assessment
          </Button>
        </div>

        {/* All Recruiters Table */}
        <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">All Recruiters</h2>
                <p className="text-sm text-muted-foreground">Manage all recruiter accounts</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{recruiters.length} total</span>
          </div>

          <div className="flex gap-2">
            {["all", "pending", "approved", "blocked"].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={recruiterFilter === status ? "default" : "outline"}
                className={`rounded-lg text-xs h-8 px-4 ${recruiterFilter === status ? "bg-primary text-white" : ""}`}
                onClick={() => setRecruiterFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>

          {filteredRecruiters.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No recruiters found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    {["Full Name", "Email", "Phone", "Company", "Certificate", "Status", "Registered On", "Actions"].map((h) => (
                      <th key={h} className="pb-3 pr-6 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecruiters.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-4 pr-6 font-medium text-foreground whitespace-nowrap">{r.full_name || "—"}</td>
                      <td className="py-4 pr-6 text-muted-foreground whitespace-nowrap">{r.email}</td>
                      <td className="py-4 pr-6 text-muted-foreground whitespace-nowrap">{r.phone || "—"}</td>
                      <td className="py-4 pr-6 text-foreground whitespace-nowrap">{r.company || "—"}</td>
                      <td className="py-4 pr-6 whitespace-nowrap">
                        {r.certificate_url ? (
                          <a href={r.certificate_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                            <FileText className="w-3.5 h-3.5" /> View
                          </a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-4 pr-6 whitespace-nowrap">
                        <Badge className={
                          r.status === "approved" ? "bg-green-50 text-green-600 border-green-200" :
                          r.status === "blocked" ? "bg-red-50 text-red-500 border-red-200" :
                          "bg-orange-50 text-orange-500 border-orange-200"
                        }>
                          {r.status === "approved" ? "Approved" : r.status === "blocked" ? "Blocked" : "Pending"}
                        </Badge>
                      </td>
                      <td className="py-4 pr-6 text-xs text-muted-foreground whitespace-nowrap">{r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"}</td>
                      <td className="py-4 whitespace-nowrap">
                        {r.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-7 px-3 text-xs" onClick={() => handleApproveRecruiter(r.id)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 rounded-lg h-7 px-3 text-xs" onClick={() => handleBlockRecruiter(r.id)}>
                              Reject
                            </Button>
                          </div>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50 rounded-lg h-7 px-3 text-xs" onClick={() => handleBlockRecruiter(r.id)}>
                            Revoke
                          </Button>
                        )}
                        {r.status === "blocked" && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-7 px-3 text-xs" onClick={() => handleApproveRecruiter(r.id)}>
                            Re-approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Recent Applications</h2>
                <p className="text-sm text-muted-foreground">Latest CV submissions across all jobs</p>
              </div>
            </div>
            <span className="bg-muted text-foreground text-sm font-semibold px-3 py-1 rounded-lg">{applications.length} total</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : applications.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No applications yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    {["Candidate", "Job", "Match Score", "Status", "CV", "Action"].map((h) => (
                      <th key={h} className="pb-3 pr-6 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.slice(0, 20).map((app) => (
                    <tr key={app.id}>
                      <td className="py-3 pr-6 whitespace-nowrap">
                        <p className="font-medium text-foreground">{app.candidate_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{app.candidate_email}</p>
                      </td>
                      <td className="py-3 pr-6 whitespace-nowrap text-muted-foreground">{app.job_title || "—"}</td>
                      <td className="py-3 pr-6 whitespace-nowrap">
                        {app.match_score ? (
                          <span className={`font-bold text-base ${app.match_score >= 80 ? "text-green-600" : app.match_score >= 60 ? "text-orange-500" : "text-muted-foreground"}`}>
                            {app.match_score}%
                          </span>
                        ) : <span className="text-muted-foreground text-xs">Pending</span>}
                      </td>
                      <td className="py-3 pr-6 whitespace-nowrap">
                        <Badge className={
                          app.status === "shortlisted" ? "bg-blue-50 text-blue-600 border-blue-200" :
                          app.status === "rejected" ? "bg-red-50 text-red-500 border-red-200" :
                          app.status === "processed" ? "bg-green-50 text-green-600 border-green-200" :
                          app.status === "pending" ? "bg-orange-50 text-orange-500 border-orange-200" :
                          "bg-muted text-muted-foreground"
                        }>
                          {app.status === "processed" ? "CV Analyzed" : app.status === "shortlisted" ? "Shortlisted" : app.status === "rejected" ? "Rejected" : app.status || "Pending"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-6 whitespace-nowrap">
                        {app.cv_url ? (
                          <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                            <FileText className="w-3.5 h-3.5" /> View CV
                          </a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-3">
                        <Button size="sm" variant="outline" className="rounded-lg text-xs h-7 px-3" onClick={() => navigate(`/view-candidates?job_id=${app.job_id}&job=${encodeURIComponent(app.job_title || "")}&from=admin`)}>
                          View Job
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}