import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quantaClient } from "@/api/quantaClient";

const LIKERT = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

const TRAITS = ["openness", "conscientiousness", "extraversion", "agreeableness", "stability"];

const JOB_MATCHING_RULES = [
  { pattern: { high: ["openness", "conscientiousness"] }, jobs: ["UX Designer", "Product Manager", "Architect", "Research Scientist"], reason: "Your creativity combined with strong discipline makes you ideal for roles that need both innovation and precision." },
  { pattern: { high: ["openness", "extraversion"] }, jobs: ["Marketing Manager", "Public Relations", "Brand Strategist", "Creative Director"], reason: "Your curiosity and social energy suit roles where you communicate big ideas to wide audiences." },
  { pattern: { high: ["openness"], low: ["extraversion"] }, jobs: ["Writer", "Researcher", "Data Scientist", "Graphic Designer", "Animator"], reason: "Your creative thinking paired with independent focus fits roles that require deep solo work on original ideas." },
  { pattern: { high: ["conscientiousness", "extraversion"] }, jobs: ["Project Manager", "Operations Manager", "Team Lead", "Account Manager"], reason: "Your reliability and people skills make you a natural leader who keeps teams organized and motivated." },
  { pattern: { high: ["conscientiousness"], low: ["extraversion"] }, jobs: ["Accountant", "Software Engineer", "Quality Assurance", "Data Analyst", "Compliance Officer"], reason: "Your attention to detail and preference for focused work suit roles requiring precision and deep concentration." },
  { pattern: { high: ["extraversion", "agreeableness"] }, jobs: ["Sales Representative", "HR Manager", "Customer Success", "Recruiter", "Teacher"], reason: "Your warmth and social confidence make you excellent at building relationships and helping others." },
  { pattern: { high: ["extraversion"], low: ["agreeableness"] }, jobs: ["Lawyer", "Executive", "Entrepreneur", "Business Development", "Negotiator"], reason: "Your assertiveness and social confidence suit competitive environments where tough decisions are routine." },
  { pattern: { high: ["agreeableness", "stability"] }, jobs: ["Nurse", "Social Worker", "Counselor", "Therapist", "Customer Support Lead"], reason: "Your calm empathy and emotional resilience make you outstanding in caregiving and support roles." },
  { pattern: { high: ["agreeableness"], low: ["extraversion"] }, jobs: ["Technical Writer", "Librarian", "Veterinarian", "Backend Developer"], reason: "Your helpfulness and quiet focus suit roles where you support others through careful, behind-the-scenes work." },
  { pattern: { high: ["stability", "conscientiousness"] }, jobs: ["Surgeon", "Air Traffic Controller", "Financial Analyst", "DevOps Engineer", "Pharmacist"], reason: "Your composure under pressure and strong discipline make you perfect for high-stakes precision roles." },
  { pattern: { high: ["stability", "openness"] }, jobs: ["Startup Founder", "Consultant", "Journalist", "Documentary Filmmaker"], reason: "Your resilience and curiosity equip you for roles that require navigating uncertainty while exploring new territory." },
  { pattern: { high: ["conscientiousness"], low: ["openness"] }, jobs: ["Auditor", "Bank Teller", "Administrative Assistant", "Logistics Coordinator"], reason: "Your reliability and preference for structure make you excellent in process-driven roles with clear expectations." },
  { pattern: { high: ["stability"], low: ["openness"] }, jobs: ["Security Analyst", "Database Administrator", "Manufacturing Supervisor"], reason: "Your composure and preference for stability suit roles maintaining critical systems and consistent operations." },
  { pattern: { high: ["openness", "agreeableness"] }, jobs: ["Teacher", "Counselor", "UX Researcher", "Nonprofit Manager", "Mediator"], reason: "Your empathy and open-mindedness make you effective in roles that require understanding diverse perspectives." },
  { pattern: { high: ["conscientiousness", "agreeableness"] }, jobs: ["Nurse", "Project Coordinator", "Office Manager", "Event Planner"], reason: "Your organizational skills and team-oriented nature make you great at coordinating people and processes." },
];

function getTraitLabel(score) {
  if (score >= 4.3) return "Very High";
  if (score >= 3.5) return "High";
  if (score >= 2.6) return "Moderate";
  if (score >= 1.9) return "Low";
  return "Very Low";
}

function calcScores(questions, answers) {
  const sums = {}, counts = {};
  TRAITS.forEach(t => { sums[t] = 0; counts[t] = 0; });
  questions.forEach(q => {
    const raw = answers[q.id];
    if (raw == null) return;
    const score = q.is_reverse_scored ? 6 - raw : raw;
    sums[q.trait] += score;
    counts[q.trait]++;
  });
  const scores = {};
  TRAITS.forEach(t => { scores[t] = counts[t] > 0 ? Math.round((sums[t] / counts[t]) * 10) / 10 : 0; });
  return scores;
}

function matchJobs(scores) {
  const isHigh = t => scores[t] >= 3.5;
  const isLow = t => scores[t] < 3.5;
  for (const rule of JOB_MATCHING_RULES) {
    const { high = [], low = [] } = rule.pattern;
    if (high.every(isHigh) && low.every(isLow)) {
      return { jobs: rule.jobs, reason: rule.reason };
    }
  }
  return { jobs: ["Administrative Assistant", "Customer Service", "General Management", "Coordinator"], reason: "Your balanced profile suits a wide variety of professional environments." };
}

export default function Assessment() {
  const navigate = useNavigate();
  const [step, setStep] = useState("intro"); // intro | test | done
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resultId, setResultId] = useState(null);

  useEffect(() => {
    const init = async () => {
      let me = null;
      try { me = await quantaClient.auth.me(); } catch (_) {}
      // Prefer localStorage candidate session
      const localEmail = localStorage.getItem("candidateEmail");
      const localName = localStorage.getItem("candidateName");
      if (localEmail) {
        me = { email: localEmail, full_name: localName || me?.full_name || "" };
      }
      setUser(me);
      
      const qs = await quantaClient.entities.PsychQuestion.list("order_index", 50);
      const sortedQuestions = qs.sort((a, b) => a.order_index - b.order_index);
      setQuestions(sortedQuestions);
      
      // Load saved progress from localStorage if it exists
      const savedAnswers = localStorage.getItem("psych_answers");
      const savedCurrent = localStorage.getItem("psych_current");
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch (_) {}
      }
      if (savedCurrent) {
        const idx = parseInt(savedCurrent, 10);
        if (!isNaN(idx) && idx >= 0 && (sortedQuestions.length === 0 || idx < sortedQuestions.length)) {
          setCurrent(idx);
        }
      }
      
      setLoading(false);
    };
    init();
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem("psych_answers", JSON.stringify(answers));
    }
  }, [answers]);

  useEffect(() => {
    localStorage.setItem("psych_current", String(current));
  }, [current]);

  const total = questions.length;
  const answered = Object.keys(answers).length;
  const progress = total > 0 ? (answered / total) * 100 : 0;
  const canSubmit = answered === total;

  const handleSelect = (value) => {
    const q = questions[current];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: value }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const scores = calcScores(questions, answers);
    const { jobs, reason } = matchJobs(scores);
    const result = await quantaClient.entities.AssessmentResult.create({
      candidate_email: user?.email || "",
      candidate_name: user?.full_name || "",
      job_profile_id: "personality",
      job_profile_title: "Personality Assessment",
      score_openness: scores.openness,
      score_conscientiousness: scores.conscientiousness,
      score_extraversion: scores.extraversion,
      score_agreeableness: scores.agreeableness,
      score_stability: scores.stability,
      fit_score: 0,
      answers,
      recommended_jobs: jobs,
      recommended_reason: reason,
    });
    
    // Clear saved progress on successful submission
    localStorage.removeItem("psych_answers");
    localStorage.removeItem("psych_current");
    
    setResultId(result.id);
    setStep("done");
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!loading && (!questions || questions.length === 0)) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center px-4">
        <div className="bg-white border border-border rounded-3xl p-10 max-w-md w-full text-center space-y-5 shadow-sm">
          <h2 className="text-2xl font-bold text-foreground">No Questions Found</h2>
          <p className="text-muted-foreground text-sm">
            We couldn't retrieve the psychometric questions. Please try again or contact support.
          </p>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/candidate-dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // DONE
  if (step === "done") return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center px-4">
      <div className="bg-white border border-border rounded-3xl p-10 max-w-md w-full text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Assessment Complete!</h2>
        <p className="text-muted-foreground text-sm">Your personality profile and job recommendations are ready.</p>
        <div className="flex flex-col gap-3">
          <Button className="w-full rounded-xl bg-primary hover:bg-primary/90" onClick={() => navigate(`/psych-results?id=${resultId}`)}>
            View My Results
          </Button>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/candidate-dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );

  // INTRO
  if (step === "intro") return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center sticky top-0 z-10">
        <span className="font-bold text-lg text-primary">QuantaHire</span>
      </nav>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <Link to="/candidate-dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">Personality Test</p>
          <h1 className="text-3xl font-bold text-foreground">Big Five Assessment</h1>
          <p className="text-muted-foreground mt-1">10 questions · ~5 minutes · Discover your personality profile & job matches</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Emotional Stability"].map(t => (
              <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                {t}
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 space-y-2 text-sm text-muted-foreground">
            <p>• Rate each statement from <strong>Strongly Disagree</strong> to <strong>Strongly Agree</strong></p>
            <p>• There are no right or wrong answers — be honest</p>
            <p>• You'll receive job role recommendations based on your profile</p>
          </div>
          <Button className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90" onClick={() => setStep("test")}>
            Start Assessment <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );

  // TEST
  const q = questions[current];
  const isLast = current === total - 1;

  if (!q) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <nav className="bg-white border-b border-border px-6 md:px-10 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-lg text-primary">QuantaHire</span>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted rounded-xl px-3 py-1.5">
          <Clock className="w-3.5 h-3.5" /> ~5 min
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-5">
        {/* Progress */}
        <div className="bg-white border border-border rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Progress</span>
            <span className="text-muted-foreground">{answered} / {total} answered</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white border border-border rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
              Question {current + 1} of {total} · <span className="capitalize">{q?.trait}</span>
            </p>
            <h2 className="text-lg font-semibold text-foreground leading-snug">{q?.text}</h2>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {LIKERT.map(({ value, label }) => {
              const selected = answers[q?.id] === value;
              return (
                <button key={value} onClick={() => handleSelect(value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-xs font-medium transition-all ${
                    selected ? "border-primary bg-accent text-primary shadow-sm" : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:bg-accent/40"
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold ${selected ? "border-primary bg-primary text-white" : "border-border text-muted-foreground"}`}>
                    {value}
                  </span>
                  <span className="text-center leading-tight hidden sm:block">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between pt-1">
            <Button variant="outline" className="rounded-xl gap-2" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
              <ArrowLeft className="w-4 h-4" /> Previous
            </Button>
            {isLast ? (
              <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Submit
              </Button>
            ) : (
              <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90" disabled={answers[q?.id] == null} onClick={() => setCurrent(c => c + 1)}>
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}