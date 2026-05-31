import React, { useState, useEffect } from "react";
import { X, Brain, Briefcase, Star, User, Mail, Phone, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRAIT_LABELS = {
  openness: "Openness",
  conscientiousness: "Conscientiousness",
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  stability: "Emotional Stability",
};

function getTraitLabel(score) {
  if (score >= 4.3) return "Very High";
  if (score >= 3.5) return "High";
  if (score >= 2.6) return "Moderate";
  if (score >= 1.9) return "Low";
  return "Very Low";
}

function getTraitColor(score) {
  if (score >= 3.5) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 2.6) return "text-orange-500 bg-orange-50 border-orange-200";
  return "text-red-500 bg-red-50 border-red-200";
}

function getPersonalitySummary(scores) {
  if (!scores) return "";
  const traitsList = [
    { label: "Openness", val: scores.openness },
    { label: "Conscientiousness", val: scores.conscientiousness },
    { label: "Extraversion", val: scores.extraversion },
    { label: "Agreeableness", val: scores.agreeableness },
    { label: "Emotional Stability", val: scores.stability }
  ];
  return traitsList
    .filter(t => t.val !== undefined && t.val !== null)
    .map(t => `${getTraitLabel(t.val)} ${t.label}`)
    .join(", ");
}

const STATUS_BADGES = {
  shortlisted: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  interview: "bg-purple-50 text-purple-700 border-purple-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  waitlisted: "bg-yellow-50 text-yellow-700 border-yellow-200",
  pending: "bg-orange-50 text-orange-700 border-orange-200",
  processed: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function CandidateProfileModal({ candidateEmail, candidateName, jobId = null, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let url = `http://127.0.0.1:8000/api/candidate/${encodeURIComponent(candidateEmail)}/full-profile`;
    if (jobId) {
      url += `?job_id=${encodeURIComponent(jobId)}`;
    }
    
    setLoading(true);
    fetch(url, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("qh_token")}`
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to fetch candidate profile");
        }
        return res.json();
      })
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching full candidate profile:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [candidateEmail, jobId]);

  const scores = profile?.psychometric?.scores;
  const personalitySummary = scores ? getPersonalitySummary(scores) : "";

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg">{profile?.candidate?.name || candidateName || candidateEmail}</h2>
                <p className="text-xs text-muted-foreground">{profile?.candidate?.email || candidateEmail}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-20 text-muted-foreground text-sm flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Loading profile details...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="bg-slate-50/50 border border-border rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-foreground text-sm border-b border-border pb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <InfoRow icon={<User className="w-4 h-4 text-primary" />} label="Full Name" value={profile.candidate.name || "N/A"} />
                      <InfoRow icon={<Mail className="w-4 h-4 text-primary" />} label="Email Address" value={profile.candidate.email} />
                      <InfoRow icon={<Phone className="w-4 h-4 text-primary" />} label="Phone Number" value={profile.candidate.phone || "Not available"} />
                      <InfoRow 
                        icon={<Calendar className="w-4 h-4 text-primary" />} 
                        label="Member Since" 
                        value={profile.candidate.created_date ? new Date(profile.candidate.created_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"} 
                      />
                    </div>
                  </div>

                  {/* Application Information */}
                  <div className="bg-slate-50/50 border border-border rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-foreground text-sm border-b border-border pb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Application Details
                    </h3>
                    {profile.application ? (
                      <div className="space-y-3">
                        <InfoRow 
                          icon={<Calendar className="w-4 h-4 text-primary" />} 
                          label="Applied Date" 
                          value={profile.application.applied_date ? new Date(profile.application.applied_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"} 
                        />
                        
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Match Score</p>
                            {profile.application.match_score !== undefined && profile.application.match_score !== null ? (
                              <span className={`inline-block text-xs font-bold px-2 py-0.5 mt-0.5 rounded-full border ${
                                profile.application.match_score >= 80 ? "bg-green-50 text-green-700 border-green-200" :
                                profile.application.match_score >= 60 ? "bg-orange-50 text-orange-700 border-orange-200" :
                                "bg-slate-50 text-slate-600 border-slate-200"
                              }`}>
                                {profile.application.match_score.toFixed(1)}% Match
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-foreground italic">Pending</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Current Status</p>
                            <span className={`inline-block text-xs font-semibold capitalize px-2.5 py-0.5 mt-0.5 rounded-full border ${
                              STATUS_BADGES[profile.application.status?.toLowerCase()] || STATUS_BADGES.pending
                            }`}>
                              {profile.application.status || "Pending"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1">
                          <p className="text-xs text-muted-foreground font-semibold mb-1">Feedback Sent:</p>
                          {profile.application.feedback ? (
                            <p className="text-xs bg-white border border-border rounded-xl p-3 text-muted-foreground leading-relaxed italic">
                              "{profile.application.feedback}"
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No feedback sent yet.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic py-6 text-center">No application details for this job.</p>
                    )}
                  </div>
                </div>

                {/* Psychometric Assessment Results */}
                <div className="bg-slate-50/50 border border-border rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-foreground text-sm border-b border-border pb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Psychometric Assessment (Big Five)
                  </h3>

                  {profile.psychometric?.completed ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pb-1">
                        <p>Completed on: {new Date(profile.psychometric.completed_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                        {personalitySummary && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">Personality Summary:</span>
                            <span className="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded font-medium">{personalitySummary}</span>
                          </div>
                        )}
                      </div>

                      {/* Traits breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        {Object.entries(profile.psychometric.scores).map(([trait, score]) => {
                          if (score === null || score === undefined) return null;
                          const percentage = (score / 5) * 100;
                          return (
                            <div key={trait} className="bg-white border border-border rounded-xl p-3 flex flex-col justify-between">
                              <div>
                                <p className="text-xs font-semibold text-foreground mb-0.5 capitalize">{TRAIT_LABELS[trait] || trait}</p>
                                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${getTraitColor(score)}`}>
                                  {getTraitLabel(score)}
                                </span>
                              </div>
                              <div className="mt-3">
                                <div className="flex items-baseline justify-between text-xs mb-1">
                                  <span className="font-bold text-foreground text-base">{score.toFixed(1)}</span>
                                  <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Recommended Jobs */}
                      {profile.psychometric.recommended_jobs?.length > 0 && (
                        <div className="pt-2 border-t border-border/60">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recommended Career Paths</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {profile.psychometric.recommended_jobs.map(job => (
                              <span key={job} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg font-medium">{job}</span>
                            ))}
                          </div>
                          {profile.psychometric.recommended_reason && (
                            <p className="text-xs text-muted-foreground leading-relaxed bg-white border border-border/80 rounded-xl p-3 italic">
                              "{profile.psychometric.recommended_reason}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50/50 border border-amber-200 text-amber-800 rounded-xl p-4 text-center text-sm font-medium">
                      Candidate has not completed the psychometric test
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 flex justify-end bg-slate-50/50 rounded-b-2xl">
            <Button onClick={onClose} className="rounded-xl text-sm font-semibold h-10 px-5">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}