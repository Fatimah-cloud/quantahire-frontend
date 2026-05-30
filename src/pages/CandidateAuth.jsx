import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, Users, Eye, EyeOff, Loader2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quantaClient } from "@/api/quantaClient";

export default function CandidateAuth() {
  const [tab, setTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const passwordRules = {
    minLength: form.password.length >= 8,
    hasUpper: /[A-Z]/.test(form.password),
    hasLower: /[a-z]/.test(form.password),
    hasNumber: /[0-9]/.test(form.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(form.password)
  };
  const isPasswordValid = passwordRules.minLength && passwordRules.hasUpper && passwordRules.hasLower && passwordRules.hasNumber && passwordRules.hasSpecial;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await quantaClient.functions.invoke("authLogin", { email: form.email.trim().toLowerCase(), password: form.password });
      if (res.data.error) {
        setError(res.data.error);
        setLoading(false);
        return;
      }
      const user = res.data.user;
      if (user.role !== 'candidate') {
        setError("No candidate account found. Please register first.");
        setLoading(false);
        return;
      }
      localStorage.setItem("candidateEmail", user.email);
      localStorage.setItem("candidateId", user.id);
      navigate("/candidate-dashboard");
    } catch (err) {
      setError("Login failed. Please try again.");
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});

    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full Name is required.";
    if (!form.email.trim()) newErrors.email = "Email Address is required.";
    
    if (!form.password) {
      newErrors.password = "Password is required.";
    } else {
      if (form.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters.";
      } else if (!/[A-Z]/.test(form.password)) {
        newErrors.password = "Password must contain at least one uppercase letter.";
      } else if (!/[a-z]/.test(form.password)) {
        newErrors.password = "Password must contain at least one lowercase letter.";
      } else if (!/[0-9]/.test(form.password)) {
        newErrors.password = "Password must contain at least one number.";
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
        newErrors.password = "Password must contain at least one special character.";
      }
    }

    if (!form.confirm) {
      newErrors.confirm = "Confirm Password is required.";
    } else if (form.password !== form.confirm) {
      newErrors.confirm = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await quantaClient.functions.invoke("authRegister", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.fullName,
        role: "candidate"
      });
      if (res.data.error) {
        setError(res.data.error);
        setLoading(false);
        return;
      }
      setLoading(false);
      setSuccess("Account created successfully! Please login.");
      setForm({ fullName: "", email: "", password: "", confirm: "" });
      setTimeout(() => {
        setTab("login");
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.message || "Registration failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      {/* Left side — branding */}
      <div className="relative hidden lg:flex flex-col justify-between px-16 py-14 overflow-hidden bg-gradient-to-br from-[#EEE9FF] via-[#F3EEFF] to-[#E8E0FF]">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-purple-300/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white rounded-full px-4 py-1.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI-Powered Recruitment Platform</span>
          </div>
        </div>

        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm border border-white shadow-md flex items-center justify-center mb-8">
            <Users className="w-8 h-8 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-5xl font-bold text-primary tracking-tight mb-4">QuantaHire</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
            Transform your hiring process with intelligent candidate matching and unbiased screening.
          </p>
        </div>

        <div />
      </div>

      {/* Right side — auth form */}
      <div className="flex flex-col px-6 md:px-12 py-10 bg-background">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Candidate Portal</p>
              <h2 className="text-3xl font-semibold text-foreground tracking-tight">
                {tab === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="mt-1.5 text-muted-foreground">
                {tab === "login"
                  ? "Sign in with your registered account"
                  : "Register to access the candidate portal"}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-muted rounded-xl p-1 mb-8 relative z-0">
              <button
                onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all pointer-events-auto ${
                  tab === "login" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setTab("register"); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all pointer-events-auto ${
                  tab === "register" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-5">
                {success}
              </div>
            )}

            {/* Login Form */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="candidate@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-12 rounded-xl border-border"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="h-12 rounded-xl border-border pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-medium bg-primary hover:bg-primary/90 mt-2 gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => { setTab("register"); setError(""); }} className="text-primary font-medium hover:underline">
                    Register
                  </button>
                </p>
              </form>
            )}

            {/* Register Form */}
            {tab === "register" && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) => {
                      setForm({ ...form, fullName: e.target.value });
                      if (errors.fullName) setErrors({ ...errors, fullName: null });
                    }}
                    className={`h-12 rounded-xl border-border ${errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    required
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.fullName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email Address</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="candidate@example.com"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: null });
                    }}
                    className={`h-12 rounded-xl border-border ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    required
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => {
                        setForm({ ...form, password: e.target.value });
                        if (errors.password) setErrors({ ...errors, password: null });
                      }}
                      className={`h-12 rounded-xl border-border pr-11 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.password}
                    </p>
                  )}
                  {form.password && (
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

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.confirm}
                      onChange={(e) => {
                        setForm({ ...form, confirm: e.target.value });
                        if (errors.confirm) setErrors({ ...errors, confirm: null });
                      }}
                      className={`h-12 rounded-xl border-border pr-11 ${errors.confirm ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.confirm}
                    </p>
                  )}
                  {form.confirm && form.password !== form.confirm && !errors.confirm && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Passwords do not match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-medium bg-primary hover:bg-primary/90 mt-2 gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setTab("login"); setError(""); setErrors({}); }} className="text-primary font-medium hover:underline">
                    Login
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}