import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { quantaClient } from "@/api/quantaClient";

const TRAIT_LABELS = {
  openness: "Openness",
  conscientiousness: "Conscientiousness",
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  stability: "Stability",
};

const TRAIT_DESCRIPTIONS = {
  openness: {
    high: "Creative and curious. Embraces new ideas, enjoys variety, adapts well to change. Thrives in innovation-driven roles.",
    low: "Practical and grounded. Prefers proven methods and clear structure. Reliable in roles with established processes.",
  },
  conscientiousness: {
    high: "Organized and dependable. Plans ahead, meets deadlines, maintains high standards. Strong responsibility.",
    low: "Flexible and spontaneous. Adapts to shifting priorities but may benefit from more structure.",
  },
  extraversion: {
    high: "Energetic and sociable. Thrives in collaboration, comfortable leading, builds relationships easily.",
    low: "Thoughtful and independent. Works well alone, listens carefully, prefers depth over breadth.",
  },
  agreeableness: {
    high: "Cooperative and empathetic. Values harmony, supports teammates, resolves conflicts well.",
    low: "Direct and objective. Makes tough decisions, values honesty over diplomacy. Strong in competition.",
  },
  stability: {
    high: "Calm and resilient. Handles pressure well, recovers from setbacks, stays composed.",
    low: "Passionate and sensitive. Deeply invested, high effort but may feel stress more intensely.",
  },
};

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

const TRAITS = ["openness", "conscientiousness", "extraversion", "agreeableness", "stability"];

export default function PsychResults() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const init = async () => {
      let me = null;
      try {
        me = await quantaClient.auth.me();
      } catch (_) {}

      const candidateEmail = (localStorage.getItem("candidateEmail") || "").trim().toLowerCase();
      const candidateId = localStorage.getItem("candidateId");
      if (!candidateEmail || !candidateId || (me && me.role !== "candidate")) {
        navigate("/candidate-auth");
        return;
      }

      let results = [];
      let candidates = [];
      try {
        if (id) {
          results = await quantaClient.entities.AssessmentResult.filter({ id });
        } else {
          results = await quantaClient.entities.AssessmentResult.filter({ candidate_email: candidateEmail });
        }
        candidates = await quantaClient.entities.Candidate.filter({ email: candidateEmail });
      } catch (err) {
        console.error("Error fetching assessment results:", err);
      }

      if (results && results.length > 0) {
        results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setResult(results[0]);
      } else {
        navigate("/candidate/psych-test");
        return;
      }

      if (candidates.length > 0 && candidates[0].full_name) {
        setCurrentUserName(candidates[0].full_name);
      }
      setLoading(false);
    };

    init();
  }, [navigate]);

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!result) return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <p className="text-muted-foreground">No result found.</p>
    </div>
  );

  const scores = TRAITS.map(t => {
    const val = t === "stability" 
      ? (result.score_neuroticism !== undefined ? result.score_neuroticism : result.score_stability)
      : result[`score_${t}`];
    return { trait: t, score: val || 0 };
  });
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 2);
  const growth = sorted.slice(-2).reverse();

  const radarData = scores.map(s => ({
    trait: TRAIT_LABELS[s.trait].slice(0, 5),
    score: s.score,
  }));

  const recommendedJobs = result.recommended_jobs || [];
  const recommendedReason = result.recommended_reason || "";

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center sticky top-0 z-10">
        <span className="font-bold text-lg text-primary">QuantaHire</span>
      </nav>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Link to="/candidate/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Personality Profile</p>
          <h1 className="text-2xl font-bold text-foreground">{currentUserName || result.candidate_name || result.candidate_email}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Big Five Personality Assessment</p>
          <p className="text-xs text-muted-foreground mt-2">
            Completed {new Date(result.created_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Radar Chart */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Personality Radar</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="trait" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} tickCount={6} />
              <Radar name="Score" dataKey="score" stroke="hsl(262,83%,58%)" fill="hsl(262,83%,58%)" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip formatter={(v) => v.toFixed(1)} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Trait Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scores.map(({ trait, score }) => {
            const isHigh = score >= 3.5;
            const desc = TRAIT_DESCRIPTIONS[trait][isHigh ? "high" : "low"];
            const pct = (score / 5) * 100;
            return (
              <div key={trait} className="bg-white border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{TRAIT_LABELS[trait]}</h3>
                    <span className={`text-xs font-medium ${getTraitColor(score)}`}>{getTraitLabel(score)}</span>
                  </div>
                  <span className={`text-2xl font-bold ${getTraitColor(score)}`}>
                    {score.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/5</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            );
          })}
        </div>

        {/* Strengths & Growth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-green-700">Top Strengths</h3>
            </div>
            {strengths.map(({ trait, score }) => (
              <div key={trait} className="flex items-center justify-between py-1.5 border-b border-green-100 last:border-0">
                <span className="text-sm font-medium text-green-800">{TRAIT_LABELS[trait]}</span>
                <span className="text-sm font-bold text-green-700">{score.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-orange-700">Growth Areas</h3>
            </div>
            {growth.map(({ trait, score }) => (
              <div key={trait} className="flex items-center justify-between py-1.5 border-b border-orange-100 last:border-0">
                <span className="text-sm font-medium text-orange-800">{TRAIT_LABELS[trait]}</span>
                <span className="text-sm font-bold text-orange-700">{score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Job Recommendations */}
        {recommendedJobs.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Recommended Job Types</h2>
            </div>
            {recommendedReason && (
              <p className="text-sm text-muted-foreground bg-accent/50 rounded-xl px-4 py-3">{recommendedReason}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recommendedJobs.map((job, i) => (
                <div key={job} className="flex items-center gap-3 border border-border rounded-xl px-4 py-3 bg-muted/30">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-sm font-medium text-foreground">{job}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to Dashboard Button */}
        <div className="flex justify-center pt-4">
          <Link to="/candidate/dashboard" className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white font-medium rounded-xl h-11 px-6 transition-colors shadow-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}