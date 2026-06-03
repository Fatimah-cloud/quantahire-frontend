import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, Briefcase, Eye, EyeOff, Clock, Upload, FileText, Check, AlertCircle } from "lucide-react";
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
  const [errors, setErrors] = useState({});

  const [country, setCountry] = useState("Saudi Arabia");
  const [phoneNumber, setPhoneNumber] = useState("");

  const COUNTRIES = [
    { name: "Saudi Arabia", code: "+966" },
    { name: "United Arab Emirates", code: "+971" },
    { name: "Egypt", code: "+20" },
    { name: "United States", code: "+1" },
    { name: "United Kingdom", code: "+44" },
    { name: "Jordan", code: "+962" },
    { name: "Bahrain", code: "+973" },
    { name: "Kuwait", code: "+965" },
    { name: "Oman", code: "+968" },
    { name: "Qatar", code: "+974" },
    { name: "Lebanon", code: "+961" },
    { name: "India", code: "+91" },
    { name: "Pakistan", code: "+92" },
    { name: "Canada", code: "+1" },
    { name: "Australia", code: "+61" },
    { name: "Germany", code: "+49" },
    { name: "France", code: "+33" },
    { name: "Singapore", code: "+65" },
    { name: "Turkey", code: "+90" },
    { name: "Malaysia", code: "+60" }
  ];

  const selectedCountryObj = COUNTRIES.find(c => c.name === country) || COUNTRIES[0];
  const countryCode = selectedCountryObj.code;
  const cleanedPhone = phoneNumber.replace(/^0+/, "");
  const fullPhoneNumber = phoneNumber ? `${countryCode}${cleanedPhone}` : "";

  const passwordRules = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  const isPasswordValid = passwordRules.minLength && passwordRules.hasUpper && passwordRules.hasLower && passwordRules.hasNumber && passwordRules.hasSpecial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWarning(null);
    setErrors({});

    if (tab === "register") {
      const newErrors = {};
      if (!fullName.trim()) newErrors.fullName = "Full Name is required.";
      if (!company.trim()) newErrors.company = "Company Name is required.";
      if (!email.trim()) newErrors.email = "Email Address is required.";
      
      if (!password) {
        newErrors.password = "Password is required.";
      } else {
        if (password.length < 8) {
          newErrors.password = "Password must be at least 8 characters.";
        } else if (!/[A-Z]/.test(password)) {
          newErrors.password = "Password must contain at least one uppercase letter.";
        } else if (!/[a-z]/.test(password)) {
          newErrors.password = "Password must contain at least one lowercase letter.";
        } else if (!/[0-9]/.test(password)) {
          newErrors.password = "Password must contain at least one number.";
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          newErrors.password = "Password must contain at least one special character.";
        }
      }

      if (!confirm) {
        newErrors.confirm = "Confirm Password is required.";
      } else if (password !== confirm) {
        newErrors.confirm = "Passwords do not match.";
      }

      if (!phoneNumber) {
        newErrors.phoneNumber = "Phone number is required.";
      } else {
        const digitsOnly = phoneNumber.replace(/\D/g, "");
        if (digitsOnly.length < 9 || digitsOnly.length > 15) {
          newErrors.phoneNumber = "Phone number must be between 9 and 15 digits.";
        }
      }

      if (!certFile) {
        newErrors.certFile = "Certificate file is required.";
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setLoading(true);
      // Upload certificate
      let certUrl = null;
      if (certFile) {
        try {
          const { file_url } = await quantaClient.integrations.Core.UploadFile({
            file: certFile,
            user_id: null,
            job_id: null
          });
          certUrl = file_url;
        } catch (uploadErr) {
          setErrors({ certFile: "Certificate upload failed. Please try again." });
          setLoading(false);
          return;
        }
      }

      const res = await quantaClient.functions.invoke("authRegister", {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName,
        role: "recruiter",
        company,
        certificate_url: certUrl,
        country,
        phone: fullPhoneNumber
      });
      setLoading(false);
      if (res.data.error) {
        setWarning("no_access");
      } else {
        setWarning("registered");
      }
    } else {
      setLoading(true);
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
        setWarning("no_access");
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
                  <button onClick={() => { setTab("login"); setWarning(null); setErrors({}); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "login" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Login</button>
                  <button onClick={() => { setTab("register"); setWarning(null); setErrors({}); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "register" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Register</button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {tab === "register" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="fullname">Full Name</Label>
                        <Input
                          id="fullname"
                          type="text"
                          placeholder="John Doe"
                          className={`h-12 rounded-xl border-border ${errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (errors.fullName) setErrors({ ...errors, fullName: null });
                          }}
                          required
                        />
                        {errors.fullName && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.fullName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                          id="company"
                          type="text"
                          placeholder="Acme Corp"
                          className={`h-12 rounded-xl border-border ${errors.company ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={company}
                          onChange={(e) => {
                            setCompany(e.target.value);
                            if (errors.company) setErrors({ ...errors, company: null });
                          }}
                          required
                        />
                        {errors.company && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.company}
                          </p>
                        )}
                      </div>

                      {/* Country Dropdown */}
                      <div className="space-y-1.5">
                        <Label htmlFor="country">Country</Label>
                        <select
                          id="country"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-border"
                          required
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Phone Number Field */}
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="flex gap-2">
                          <span className="flex items-center justify-center h-12 px-3 rounded-xl border border-border bg-muted/50 text-sm font-semibold text-muted-foreground shrink-0 min-w-[3.5rem]">
                            {countryCode}
                          </span>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="512345678"
                            className={`h-12 rounded-xl border-border flex-1 ${errors.phoneNumber ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            value={phoneNumber}
                            onChange={(e) => {
                              setPhoneNumber(e.target.value);
                              if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: null });
                            }}
                            required
                          />
                        </div>
                        {errors.phoneNumber && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.phoneNumber}
                          </p>
                        )}
                        {phoneNumber && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Full number: <span className="font-semibold text-foreground">{fullPhoneNumber}</span>
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className={`h-12 rounded-xl border-border ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: null });
                        if (warning === "no_access") setWarning(null);
                      }}
                      required
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`h-12 rounded-xl border-border pr-11 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors({ ...errors, password: null });
                          if (warning === "no_access") setWarning(null);
                        }}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.password}
                      </p>
                    )}
                    {tab === "register" && password && (
                      <div className="mt-2.5 space-y-1.5 rounded-xl border border-muted bg-muted/20 p-3 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">Password requirements:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                          <div className={`flex items-center gap-1.5 transition-colors ${passwordRules.minLength ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            {passwordRules.minLength ? <Check className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 shrink-0" />}
                            <span>Min. 8 characters</span>
                          </div>
                          <div className={`flex items-center gap-1.5 transition-colors ${passwordRules.hasUpper ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            {passwordRules.hasUpper ? <Check className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 shrink-0" />}
                            <span>One uppercase letter</span>
                          </div>
                          <div className={`flex items-center gap-1.5 transition-colors ${passwordRules.hasLower ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            {passwordRules.hasLower ? <Check className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 shrink-0" />}
                            <span>One lowercase letter</span>
                          </div>
                          <div className={`flex items-center gap-1.5 transition-colors ${passwordRules.hasNumber ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            {passwordRules.hasNumber ? <Check className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 shrink-0" />}
                            <span>One number</span>
                          </div>
                          <div className={`flex items-center gap-1.5 transition-colors ${passwordRules.hasSpecial ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            {passwordRules.hasSpecial ? <Check className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 ml-1 shrink-0" />}
                            <span>One special char</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {tab === "register" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm"
                            type={showConfirm ? "text" : "password"}
                            placeholder="••••••••"
                            className={`h-12 rounded-xl border-border pr-11 ${errors.confirm ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            value={confirm}
                            onChange={(e) => {
                              setConfirm(e.target.value);
                              if (errors.confirm) setErrors({ ...errors, confirm: null });
                            }}
                            required
                          />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.confirm && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.confirm}
                          </p>
                        )}
                        {confirm && password !== confirm && !errors.confirm && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Passwords do not match
                          </p>
                        )}
                      </div>

                      {/* Certificate Upload */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cert">Certificate <span className="text-muted-foreground font-normal">(PDF or DOC)</span></Label>
                        <label htmlFor="cert" className={`flex items-center gap-3 h-12 rounded-xl border bg-background px-3 cursor-pointer hover:bg-muted/40 transition-colors ${errors.certFile ? "border-red-500" : "border-border"}`}>
                          <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground truncate flex-1">
                            {certFile ? certFile.name : "Upload your certificate"}
                          </span>
                          {certFile && <FileText className="w-4 h-4 text-primary shrink-0" />}
                        </label>
                        <input
                          id="cert"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            setCertFile(e.target.files[0] || null);
                            if (errors.certFile) setErrors({ ...errors, certFile: null });
                          }}
                        />
                        {errors.certFile && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.certFile}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Inline warning/status messages (login tab only) */}
                  {warning === "no_access" && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm animate-shake">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                      <span>Invalid email or password. Please try again.</span>
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
                      <>Don't have an account?{" "}<button type="button" onClick={() => { setTab("register"); setWarning(null); setErrors({}); }} className="text-primary font-medium hover:underline">Register</button></>
                    ) : (
                      <>Already have an account?{" "}<button type="button" onClick={() => { setTab("login"); setWarning(null); setErrors({}); }} className="text-primary font-medium hover:underline">Login</button></>
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