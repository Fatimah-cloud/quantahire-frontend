import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Briefcase, Loader2, Bell, CheckCircle, XCircle, X, UserCircle } from "lucide-react";
import AccountDropdown from "@/components/AccountDropdown";
import InterviewInvites from "@/components/candidate/InterviewInvites";
import { Badge } from "@/components/ui/badge";
import { quantaClient } from "@/api/quantaClient";


const QUICK_ACTIONS = [
  { icon: ClipboardList, label: "Take Assessment", description: "Complete your psychometric test", href: "/assessment" },
  { icon: Briefcase, label: "Browse Jobs", description: "Find jobs and apply with your CV", href: "/browse-jobs" },
  { icon: UserCircle, label: "My Profile", description: "Update your profile and CV", href: "/candidate-profile-page" },
];

const STATUS_LABEL = {
  pending: "Submitted",
  processed: "Under Review",
  shortlisted: "Accepted",
  rejected: "Rejected",
};

const STATUS_STYLES = {
  "Submitted": "bg-blue-50 text-blue-600 border-blue-200",
  "Under Review": "bg-orange-50 text-orange-500 border-orange-200",
  "Accepted": "bg-green-50 text-green-600 border-green-200",
  "Rejected": "bg-red-50 text-red-500 border-red-200",
};

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [user, setUser] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [alerts, setAlerts] = useState([]); // backend notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [invites, setInvites] = useState([]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [hasTakenPsychTest, setHasTakenPsychTest] = useState(false);
  const [psychTestResultId, setPsychTestResultId] = useState(null);
  const bellRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/notifications", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/notifications/${notifId}/read`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
        }
      });
      if (response.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === notifId ? { ...a, read: true } : a))
        );
      }
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadAlerts = alerts.filter((a) => !a.read);
      await Promise.all(
        unreadAlerts.map(async (a) => {
          await fetch(`http://127.0.0.1:8000/api/notifications/${a.id}/read`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
            }
          });
        })
      );
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch (e) {
      console.error("Failed to mark all notifications as read:", e);
    }
  };

  const deleteNotification = async (notifId) => {
    try {
      await quantaClient.entities.Notification.delete(notifId);
      setAlerts((prev) => prev.filter((a) => a.id !== notifId));
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  // Upsert candidate record
  const upsertCandidate = async (me, apps) => {
    const existing = await quantaClient.entities.Candidate.filter({ email: me.email });
    const accepted = apps.filter(a => a.status === "shortlisted").length;
    const rejected = apps.filter(a => a.status === "rejected").length;
    const data = {
      email: me.email,
      full_name: me.full_name || "",
      user_id: me.id,
      total_applications: apps.length,
      accepted_count: accepted,
      rejected_count: rejected,
    };
    if (existing.length > 0) {
      await quantaClient.entities.Candidate.update(existing[0].id, data);
      return existing[0];
    } else {
      return await quantaClient.entities.Candidate.create(data);
    }
  };

  useEffect(() => {
    const init = async () => {
      const candidateEmail = (localStorage.getItem("candidateEmail") || "").trim().toLowerCase();
      const candidateId = localStorage.getItem("candidateId");
      if (!candidateEmail || !candidateId) {
        navigate("/candidate-auth");
        setChecking(false);
        return;
      }
      setEmailVerified(true);

      // My Applications, interview slots, and candidate profile: fetch from QuantaHire
      const [apps, interviewSlots, candidates] = await Promise.all([
        quantaClient.entities.Application.filter({ candidate_email: candidateEmail }, "-created_date"),
        quantaClient.entities.InterviewSlot.filter({ candidate_email: candidateEmail }, "-created_date"),
        quantaClient.entities.Candidate.filter({ email: candidateEmail })
      ]);
      setInvites(interviewSlots);

      // Fetch custom notifications
      let notificationsData = [];
      try {
        const notifResponse = await fetch("http://127.0.0.1:8000/api/notifications", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
          }
        });
        if (notifResponse.ok) {
          notificationsData = await notifResponse.json();
        }
      } catch (e) {
        console.error("Failed to fetch notifications during init:", e);
      }
      setAlerts(notificationsData || []);

      const fullName = candidates[0]?.full_name || apps[0]?.candidate_name || "";
      setUser({ email: candidateEmail, id: candidateId, full_name: fullName });

      setApplications(apps || []);

      const accepted = (apps || []).filter(a => a.status === "shortlisted" || a.status === "accepted").length;
      const rejected = (apps || []).filter(a => a.status === "rejected").length;
      setCandidate({ email: candidateEmail, full_name: fullName, total_applications: (apps || []).length, accepted_count: accepted, rejected_count: rejected });

      // Check if candidate took personality test
      try {
        const psychResults = await quantaClient.entities.AssessmentResult.filter({ candidate_email: candidateEmail });
        if (psychResults && psychResults.length > 0) {
          psychResults.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          setHasTakenPsychTest(true);
          setPsychTestResultId(psychResults[0].id);
        } else {
          setHasTakenPsychTest(false);
          setPsychTestResultId(null);
        }
      } catch (e) {
        console.error("Failed to fetch assessment results:", e);
      }

      setLoading(false);
      setChecking(false);
    };
    init();
  }, [navigate]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Real-time subscription for application status changes
  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = quantaClient.entities.Application.subscribe((event) => {
      if (event.type === "update" && event.data?.candidate_email === user.email) {
        setApplications((prev) => {
          const updated = prev.map(a => a.id === event.id ? event.data : a);
          setCandidate({ email: user.email, total_applications: updated.length, accepted_count: updated.filter(a => a.status === "shortlisted").length, rejected_count: updated.filter(a => a.status === "rejected").length });
          return updated;
        });
        fetchNotifications();
      }
      if (event.type === "create" && event.data?.candidate_email === user.email) {
        setApplications((prev) => {
          const updated = [event.data, ...prev];
          setCandidate({ email: user.email, total_applications: updated.length, accepted_count: updated.filter(a => a.status === "shortlisted").length, rejected_count: updated.filter(a => a.status === "rejected").length });
          return updated;
        });
        fetchNotifications();
      }
    });
    return () => unsubscribe();
  }, [user]);



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
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center justify-between sticky top-0 z-10 h-16 shrink-0">
        <span className="font-bold text-lg text-primary">QuantaHire</span>
        <div className="flex items-center gap-3">
          {/* Bell with notification dropdown */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <Bell className="w-5 h-5 text-primary" />
              {alerts.filter((a) => !a.read).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {alerts.filter((a) => !a.read).length}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="font-semibold text-sm text-foreground">Notifications</p>
                  {alerts.filter((a) => !a.read).length > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-muted-foreground hover:text-foreground">
                      Mark all as read
                    </button>
                  )}
                </div>
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">No new notifications</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        onClick={() => !alert.read && markAsRead(alert.id)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${
                          !alert.read ? "bg-primary/5 font-medium" : ""
                        }`}
                      >
                        {alert.status === "shortlisted" ? (
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${alert.status === "shortlisted" ? "text-green-700" : "text-red-600"}`}>
                            {alert.status === "shortlisted" ? "🎉 Application Accepted!" : "Application Update"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {alert.message || (
                              <>
                                <strong>{alert.job_title}</strong> at <strong>{alert.company_name || alert.company}</strong> —{" "}
                                {alert.status === "shortlisted" ? "you've been shortlisted!" : "not selected this time."}
                              </>
                            )}
                          </p>
                          {alert.created_date && (
                            <span className="text-[10px] text-muted-foreground block mt-1">
                              {new Date(alert.created_date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(alert.id);
                          }}
                          className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <AccountDropdown
            email={user?.email}
            fullName={user?.full_name ? user.full_name.split(" ")[0] : user?.email}
            role="Candidate"
            onLogout={() => { localStorage.removeItem("candidateEmail"); localStorage.removeItem("candidateId"); window.location.href = "/"; }}
          />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">Candidate Portal</p>
          <h1 className="text-3xl font-bold text-foreground">Welcome, {user?.full_name?.split(" ")[0] || "Candidate"}!</h1>
          <p className="text-muted-foreground mt-1">Track your job applications and status updates.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-border rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-foreground">{candidate?.total_applications ?? applications.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Applications</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-green-600">{candidate?.accepted_count ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Accepted</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-5 text-center">
            <p className="text-3xl font-bold text-orange-500">{applications.filter(a => a.status === "pending" || a.status === "processed").length}</p>
            <p className="text-sm text-muted-foreground mt-1">In Review</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: ClipboardList,
              label: hasTakenPsychTest ? "View Results" : "Take Personality Test",
              description: hasTakenPsychTest ? "Review your personality profile" : "Complete your psychometric test",
              href: hasTakenPsychTest ? `/candidate/psych-results?id=${psychTestResultId}` : "/candidate/psych-test"
            },
            { icon: Briefcase, label: "Browse Jobs", description: "Find jobs and apply with your CV", href: "/browse-jobs" },
            { icon: UserCircle, label: "My Profile", description: "Update your profile and CV", href: "/candidate-profile-page" },
          ].map(({ icon: Icon, label, description, href }) => (
            <div
              key={label}
              onClick={() => href && navigate(href)}
              className="bg-white border border-border rounded-2xl p-5 flex flex-col items-center text-center gap-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Interview Invitations */}
        {invites.length > 0 && (
          <InterviewInvites
            invites={invites}
            onUpdate={async () => {
              const updated = await quantaClient.entities.InterviewSlot.filter({ candidate_email: user.email }, "-created_date");
              setInvites(updated);
            }}
          />
        )}

        {/* Applications */}
        <div>
          <div className="mb-4">
            <h2 className="font-semibold text-foreground text-lg">My Applications</h2>
            <p className="text-sm text-muted-foreground">All jobs you have applied to</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : applications.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-10 text-center text-muted-foreground">
              No applications yet. Browse jobs and apply!
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const statusLabel = STATUS_LABEL[app.status] || "In Progress";
                const initials = (app.company || app.job_title || "?")[0].toUpperCase();
                return (
                  <div
                    key={app.id}
                    className={`bg-white border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      app.status === "shortlisted" ? "border-green-200 bg-green-50/30" :
                      app.status === "rejected" ? "border-red-100" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-base">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-foreground">{app.job_title || "Job"}</h3>
                          <Badge className={`text-xs ${STATUS_STYLES[statusLabel] || "bg-muted text-muted-foreground"}`}>{statusLabel}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{app.company || "Company"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Applied on {new Date(app.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        {(app.skills || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(app.skills || []).slice(0, 4).map((s) => (
                              <span key={s} className="text-xs bg-accent text-primary px-2 py-0.5 rounded-md">{s}</span>
                            ))}
                            {app.skills.length > 4 && <span className="text-xs text-muted-foreground">+{app.skills.length - 4} more</span>}
                          </div>
                        )}
                        {(app.status === "shortlisted" || app.status === "accepted" || app.status === "rejected") && app.feedback && (
                          <div className="mt-3 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3 text-muted-foreground leading-relaxed">
                            <span className="font-bold text-foreground">Feedback:</span> {app.feedback}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => navigate(`/candidate/job/${app.job_id}`)}
                        className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors"
                      >
                        View Job
                      </button>
                      {app.cv_url && (
                        <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors">
                          View CV
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}