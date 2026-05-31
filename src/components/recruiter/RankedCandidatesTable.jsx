import React, { useState } from "react";
import { quantaClient } from "@/api/quantaClient";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import CandidateExpandedRow from "@/components/recruiter/CandidateExpandedRow";
import CandidateProfileModal from "@/components/recruiter/CandidateProfileModal";

const SCORE_COLORS = {
  strong: "bg-green-50 text-green-700 border-green-200",
  moderate: "bg-yellow-50 text-yellow-700 border-yellow-200",
  weak: "bg-orange-50 text-orange-700 border-orange-200",
  poor: "bg-red-50 text-red-700 border-red-200",
};

const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

function getScoreColor(score) {
  if (score >= 80) return SCORE_COLORS.strong;
  if (score >= 60) return SCORE_COLORS.moderate;
  if (score >= 40) return SCORE_COLORS.weak;
  return SCORE_COLORS.poor;
}

function getScoreLabel(score) {
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Moderate Match";
  if (score >= 40) return "Weak Match";
  return "Poor Match";
}

export default function RankedCandidatesTable({ candidates, onReprocess, jobId, job, showScores, onStatusChange: onParentStatusChange }) {
  const [expanded, setExpanded] = useState(null);
  const [reprocessing, setReprocessing] = useState(null);
  const [profileModal, setProfileModal] = useState(null);

  const handleStatusUpdate = async (e, appId) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    await quantaClient.entities.Application.update(appId, { status: newStatus });
    if (onParentStatusChange) onParentStatusChange();
  };

  const handleReprocess = async (appId) => {
    setReprocessing(appId);
    await onReprocess(appId);
    setReprocessing(null);
  };

  const handleStatusChange = async (appId, newStatus) => {
    if (onParentStatusChange) {
      await onParentStatusChange(appId, newStatus);
    }
    // Update local candidate state
    const updatedCandidate = candidates.find((c) => c.id === appId);
    if (updatedCandidate) {
      updatedCandidate.status = newStatus;
      updatedCandidate.updated_date = new Date().toISOString();
    }
  };

  return (
    <>
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-4 text-left font-semibold text-foreground w-16">Rank</th>
              <th className="px-6 py-4 text-left font-semibold text-foreground">Candidate</th>
              {showScores && <th className="px-6 py-4 text-left font-semibold text-foreground w-32">Score</th>}

              <th className="px-6 py-4 text-left font-semibold text-foreground w-32">Status</th>
              <th className="px-6 py-4 text-right font-semibold text-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={showScores ? "9" : "4"} className="px-6 py-12 text-center text-muted-foreground">
                  {showScores ? "No candidates with scores yet. Process all CVs first." : "Click 'Rank All Candidates' to start analyzing CVs."}
                </td>
              </tr>
            ) : (
              candidates.map((app, idx) => {
                const isExpanded = expanded === app.id;
                const score = app.match_score || 0;
                const constructs = app.rag_results?.construct_scores || {};

                return (
                  <React.Fragment key={app.id}>
                    <tr className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setExpanded(isExpanded ? null : app.id)}>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {idx < 3 && <span className="text-xl">{MEDAL_ICONS[idx]}</span>}
                        {idx < 3 ? "" : `#${idx + 1}`}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-foreground">{app.candidate_name || app.candidate_email || "Unknown"}</p>
                          {app.candidate_name && app.candidate_name !== app.candidate_email && (
                            <p className="text-xs text-muted-foreground">{app.candidate_email}</p>
                          )}
                        </div>
                      </td>
                      {showScores && (
                        <td className="px-6 py-4">
                          <div className={`inline-flex flex-col items-center px-3 py-2 rounded-xl border ${getScoreColor(score)}`}>
                            <p className="text-lg font-bold">{score.toFixed(1)}</p>
                            <p className="text-xs">{getScoreLabel(score)}</p>
                          </div>
                        </td>
                      )}

                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={app.status || "pending"}
                          onChange={(e) => handleStatusUpdate(e, app.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs rounded-lg border border-input px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="pending">Pending</option>
                          <option value="processed">Analyzed</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="accepted">Accepted</option>
                          <option value="interview">Interview</option>
                          <option value="rejected">Rejected</option>
                          <option value="waitlisted">Waitlisted</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg gap-1.5 border-primary/30 text-primary hover:bg-accent text-xs h-8"
                            onClick={(e) => { e.stopPropagation(); setProfileModal({ email: app.candidate_email, name: app.candidate_name }); }}
                          >
                            <User className="w-3.5 h-3.5" /> Profile
                          </Button>
                          <button className="text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                       <tr className="bg-muted/10">
                         <td colSpan={showScores ? "9" : "4"} className="px-6 py-6">
                           <CandidateExpandedRow
                             app={app}
                             jobId={jobId}
                             job={job}
                             onReprocess={() => handleReprocess(app.id)}
                             isReprocessing={reprocessing === app.id}
                             onStatusChange={handleStatusChange}
                           />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
    {profileModal && (
      <CandidateProfileModal
        candidateEmail={profileModal.email}
        candidateName={profileModal.name}
        jobId={jobId}
        onClose={() => setProfileModal(null)}
      />
    )}
    </>
  );
}