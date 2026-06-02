import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, Briefcase, Eye, EyeOff, Clock, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quantaClient } from "@/api/quantaClient";

export default function RecruiterAuth() {
  const [tab, setTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState(null); // 'no_access' | 'pending' | 'suspended' | 'registered' | 'denied'
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [certFile, setCertFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWarning(null);
    setLoading(true);
    if (tab === "register") {
      if (password !== confirm) { setWarning("no_access"); setLoading(false); return; }

      // Upload certificate
      let certUrl = null;
      if (certFile) {
        const { file_url } = await quantaClient.integrations.Core.UploadFile({
          file: certFile,
          user_id: null,
          job_id: null
        });
        certUrl = file_url;
      }

      const res = await quantaClient.functions.invoke("authRegister", {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName,
        role: "recruiter",
        company,
        certificate_url: certUrl
      });
      setLoading(false);
      if (res.data.error) {
        setWarning("no_access");
      } else {
        setWarning("registered");
      }
    } else {
      const res = await quantaClient.functions.invoke("authLogin", { email: email.trim().toLowerCase(), password });
      setLoading(false);
      if (res.data.error) {
        // Map error messages to warnings
        if (res.data.error.includes('pending')) {
          setWarning("pending");
        } else if (res.data.error.includes('blocked')) {
          setWarning("suspended");
        } else if (res.data.error.includes('active')) {
          setWarning("pending");
        } else {
          setWarning("no_access");
        }
        return;
      }
      const user = res.data.user;
      if (user.role !== 'recruiter') {
        setWarning("denied");
        return;
      }
      if (!user.is_active) {
        setWarning("pending");
        return;
      }
      localStorage.setItem("recruiterEmail", user.email);
      localStorage.setItem("recruiterId", user.id);
      navigate("/recruiter-dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      {/* Left side — branding */}
      <div className="relative hidden lg:flex flex-col justify-between px-16 py-14 overflow-hidden bg-gradient-to-br from-[#EEE9FF] via-[#F3EEFF] to-[#E8E0FF]">
        {/* Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-purple-300/20 blur-3xl" />

        {/* Logo */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white rounded-full px-4 py-1.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI-Powered Recruitment Platform</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm border border-white shadow-md flex items-center justify-center mb-8">
            <Briefcase className="w-8 h-8 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-5xl font-bold text-primary tracking-tight mb-4">QuantaHire</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
            Transform your hiring process with intelligent candidate matching and unbiased screening.
          </p>
        </div>

        {/* Bottom spacer */}
        <div />
      </div>

      {/* Right side — auth form */}
      <div className="flex flex-col px-6 md:px-12 py-10 bg-background">
        {/* Back button */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">

            {/* Full-page success screen after registration */}
            {warning === "registered" ? (
              <div className="text-center space-y-6 py-8">
                <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto">
                  <Clock className="w-10 h-10 text-orange-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">Request Submitted!</h2>
                  <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Your recruiter account request has been submitted. An admin will review your application and you will be notified by email once approved.
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 text-left space-y-2">
                  <p className="text-sm font-semibold text-orange-700">What happens next?</p>
                  <ul className="text-sm text-orange-600 space-y-1.5">
                    <li>• Admin reviews your registration details</li>
                    <li>• You receive an approval email</li>
                    <li>• Log in with your email to access the platform</li>
                  </ul>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => { setWarning(null); setTab("login"); }}
                    className="w-full h-12 rounded-xl text-base font-medium bg-primary hover:bg-primary/90"
                  >
                    Go to Login
                  </Button>
                  <Link to="/" className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-8">
                  <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Recruiter Portal</p>
                  <h2 className="text-3xl font-semibold text-foreground tracking-tight">
                    {tab === "login" ? "Welcome" : "Create Account"}
                  </h2>
                  <p className="mt-1.5 text-muted-foreground">
                    {tab === "login" ? "Sign in to your account" : "Fill in the details below to get started"}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-muted rounded-xl p-1 mb-8">
                  <button onClick={() => { setTab("login"); setWarning(null); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "login" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Login</button>
                  <button onClick={() => { setTab("register"); setWarning(null); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "register" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Register</button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {tab === "register" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="fullname">Full Name</Label>
                        <Input id="fullname" type="text" placeholder="John Doe" className="h-12 rounded-xl border-border" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company">Company Name</Label>
                        <Input id="company" type="text" placeholder="Acme Corp" className="h-12 rounded-xl border-border" value={company} onChange={(e) => setCompany(e.target.value)} required />
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="you@example.com" className="h-12 rounded-xl border-border" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-12 rounded-xl border-border pr-11" value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {tab === "register" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm">Confirm Password</Label>
                        <div className="relative">
                          <Input id="confirm" type={showConfirm ? "text" : "password"} placeholder="••••••••" className="h-12 rounded-xl border-border pr-11" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Certificate Upload */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cert">Certificate <span className="text-muted-foreground font-normal">(PDF or DOC)</span></Label>
                        <label htmlFor="cert" className="flex items-center gap-3 h-12 rounded-xl border border-border bg-background px-3 cursor-pointer hover:bg-muted/40 transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground truncate flex-1">
                            {certFile ? certFile.name : "Upload your certificate"}
                          </span>
                          {certFile && <FileText className="w-4 h-4 text-primary shrink-0" />}
                        </label>
                        <input id="cert" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCertFile(e.target.files[0] || null)} />
                      </div>
                    </>
                  )}

                  {/* Inline warning/status messages (login tab only) */}
                  {warning === "no_access" && (
                    <div className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-4 py-3 text-sm">
                      <Clock className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
                      <span>No account found for this email. Please register first or contact your admin.</span>
                    </div>
                  )}
                  {warning === "pending" && (
                    <div className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-4 py-3 text-sm">
                      <Clock className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
                      <span>Your account is still pending admin approval. You will be notified by email once approved.</span>
                    </div>
                  )}
                  {warning === "suspended" && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">
                      <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                      <span>Your account has been suspended. Please contact support for assistance.</span>
                    </div>
                  )}
                  {warning === "denied" && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">
                      <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                      <span>You don't have access to the recruiter portal. Please contact support if you believe this is an error.</span>
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-medium bg-primary hover:bg-primary/90 mt-2">
                    {loading ? "Please wait..." : tab === "login" ? "Sign In" : "Submit for Approval"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    {tab === "login" ? (
                      <>Don't have an account?{" "}<button type="button" onClick={() => { setTab("register"); setWarning(null); }} className="text-primary font-medium hover:underline">Register</button></>
                    ) : (
                      <>Already have an account?{" "}<button type="button" onClick={() => { setTab("login"); setWarning(null); }} className="text-primary font-medium hover:underline">Login</button></>
                    )}
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}