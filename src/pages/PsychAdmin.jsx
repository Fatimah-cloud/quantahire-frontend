import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Search, ChevronDown, ChevronUp, Briefcase, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { quantaClient } from "@/api/quantaClient";

const TRAITS = ["openness", "conscientiousness", "extraversion", "agreeableness", "stability"];
const TRAIT_LABELS = { openness: "Openness", conscientiousness: "Conscientiousness", extraversion: "Extraversion", agreeableness: "Agreeableness", stability: "Stability" };

function getTraitLabel(score) {
  if (score >= 4.3) return "Very High";
  if (score >= 3.5) return "High";
  if (score >= 2.6) return "Moderate";
  if (score >= 1.9) return "Low";
  return "Very Low";
}

function getTraitColor(score) {
  if (score >= 3.5) return "text-green-600";
  if (score >= 2.6) return "text-orange-500";
  return "text-red-500";
}

function getTraitScore(r, trait) {
  if (!r) return 0;
  if (trait === "stability") {
    return r.score_neuroticism !== undefined ? r.score_neuroticism : (r.score_stability || 0);
  }
  return r[`score_${trait}`] || 0;
}

export default function PsychAdmin() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      try {
        const me = await quantaClient.auth.me();
        if (!me || me.role !== "admin") {
          navigate("/");
          return;
        }
        const data = await quantaClient.psych.getResults();
        data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setResults(data);
      } catch (err) {
        console.error("Failed to load results:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    checkAdminAndFetch();
  }, [navigate]);

  const filtered = useMemo(() => {
    let list = results;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.candidate_name || "").toLowerCase().includes(q) || (r.candidate_email || "").toLowerCase().includes(q));
    }
    if (dateFilter !== "all") {
      const now = new Date();
      const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
      const cutoff = new Date(now - days * 86400000);
      list = list.filter(r => new Date(r.created_date) >= cutoff);
    }
    return list;
  }, [results, search, dateFilter]);

  const exportCSV = () => {
    const headers = ["Name", "Email", "Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Stability", "Recommended Jobs", "Date"];
    const rows = results.map(r => [
      r.candidate_name || "", r.candidate_email,
      getTraitScore(r, "openness"), getTraitScore(r, "conscientiousness"), getTraitScore(r, "extraversion"), getTraitScore(r, "agreeableness"), getTraitScore(r, "stability"),
      (r.recommended_jobs || []).join("; "),
      new Date(r.created_date).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "personality_results.csv"; a.click();
  };

  const radarData = (r) => TRAITS.map(t => ({ trait: TRAIT_LABELS[t].slice(0, 5), score: getTraitScore(r, t) }));

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-lg text-primary">QuantaHire · Personality Admin</span>
        <Link to="/admin-dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Admin Dashboard
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Personality Results</h1>
            <p className="text-sm text-muted-foreground">{results.length} assessments completed</p>
          </div>
          <Button variant="outline" className="rounded-xl gap-2" onClick={exportCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl h-10" />
          </div>
          <div className="flex gap-2">
            {[["all", "All Time"], ["7d", "Last 7 Days"], ["30d", "Last 30 Days"], ["90d", "Last 90 Days"]].map(([val, label]) => (
              <button key={val} onClick={() => setDateFilter(val)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${dateFilter === val ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary/40"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* List */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="bg-white border border-border rounded-2xl p-10 text-center text-muted-foreground text-sm">No assessments found.</div>
            )}
            {filtered.map(r => {
              const scores = TRAITS.map(t => getTraitScore(r, t));
              const topTrait = TRAITS[scores.indexOf(Math.max(...scores))];
              const isSelected = selectedResult?.id === r.id;
              return (
                <div key={r.id}
                  onClick={() => setSelectedResult(isSelected ? null : r)}
                  className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all hover:border-primary/40 ${isSelected ? "border-primary shadow-sm" : "border-border"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                        {(r.candidate_name || r.candidate_email || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{r.candidate_name || r.candidate_email}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.candidate_email} · {new Date(r.created_date).toLocaleDateString()}</p>
                        <p className="text-xs text-primary mt-0.5 capitalize">Top trait: {TRAIT_LABELS[topTrait]} ({getTraitScore(r, topTrait).toFixed(1)})</p>
                      </div>
                    </div>
                    {isSelected ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {isSelected && (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {TRAITS.map(t => (
                          <div key={t}>
                            <p className="text-xs text-muted-foreground">{TRAIT_LABELS[t].slice(0, 4)}</p>
                            <p className={`font-bold text-sm ${getTraitColor(getTraitScore(r, t))}`}>{getTraitScore(r, t).toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">{getTraitLabel(getTraitScore(r, t)).replace("Very ", "V.")}</p>
                          </div>
                        ))}
                      </div>
                      {(r.recommended_jobs || []).length > 0 && (
                        <div className="border-t border-border pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Recommended Jobs</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(r.recommended_jobs || []).map(job => (
                              <span key={job} className="text-xs bg-accent text-primary px-2.5 py-1 rounded-md font-medium">{job}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Radar Detail */}
          <div className="bg-white border border-border rounded-2xl p-6 sticky top-24 h-fit">
            {selectedResult ? (
              <>
                <h2 className="font-semibold text-foreground">{selectedResult.candidate_name || selectedResult.candidate_email}</h2>
                <p className="text-xs text-muted-foreground mb-4">{selectedResult.candidate_email}</p>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData(selectedResult)}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9 }} tickCount={6} />
                    <Radar name="Score" dataKey="score" stroke="hsl(262,83%,58%)" fill="hsl(262,83%,58%)" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                  {TRAITS.map(t => (
                    <div key={t}>
                      <p className="text-xs text-muted-foreground">{TRAIT_LABELS[t].slice(0, 4)}</p>
                      <p className={`font-bold ${getTraitColor(getTraitScore(selectedResult, t))}`}>{getTraitScore(selectedResult, t).toFixed(1)}</p>
                    </div>
                  ))}
                </div>
                {(selectedResult.recommended_jobs || []).length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Recommended Jobs</p>
                    {selectedResult.recommended_reason && (
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{selectedResult.recommended_reason}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedResult.recommended_jobs || []).map(job => (
                        <span key={job} className="text-xs bg-accent text-primary px-2.5 py-1 rounded-md font-medium">{job}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <Link to={`/candidate/psych-results?id=${selectedResult.id}`} target="_blank"
                    className="text-xs text-primary hover:underline">
                    View full profile →
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-2 text-2xl">📊</div>
                <p className="font-medium">Select a candidate</p>
                <p className="text-sm">Click any candidate to see their radar chart and job matches</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}