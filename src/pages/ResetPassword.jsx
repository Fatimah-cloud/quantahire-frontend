import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quantaClient } from "@/api/quantaClient";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    if (!tokenParam) {
      setError("Reset token is missing from the URL. Please request a new link.");
    } else {
      setToken(tokenParam);
    }
  }, []);

  const passwordRules = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  const isPasswordValid = passwordRules.minLength && passwordRules.hasUpper && passwordRules.hasLower && passwordRules.hasNumber && passwordRules.hasSpecial;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing. Please request a new link.");
      return;
    }

    if (!password) {
      setError("Please enter a new password.");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet the complexity requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await quantaClient.functions.invoke("resetPassword", {
        token,
        password,
      });

      setLoading(false);

      if (res.data.error) {
        setError(res.data.error);
        return;
      }

      setSuccess(true);
      // Wait 3 seconds then redirect to login portal selector (Home page)
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err) {
      setLoading(false);
      setError("Failed to reset password. The link might be expired or invalid.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      {/* Left side — branding with premium gradient */}
      <div className="relative hidden lg:flex flex-col justify-between px-16 py-14 overflow-hidden bg-gradient-to-br from-[#EEE9FF] via-[#F3EEFF] to-[#E8E0FF]">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-purple-300/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white rounded-full px-4 py-1.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI-Powered Recruitment Platform</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-8 border border-white/80">
            <Lock className="w-8 h-8 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-5xl font-bold text-primary tracking-tight mb-4 leading-tight">
            Create New<br />Password
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
            Choose a strong and secure password. Ensure it meets the minimum security requirements below.
          </p>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} QuantaHire Platform. All rights reserved.
        </div>
      </div>

      {/* Right side — Form */}
      <div className="flex flex-col px-6 md:px-12 py-10 bg-background justify-between min-h-screen">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="w-full max-w-md space-y-8">
            {success ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto border border-green-100">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Password Reset Successful</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your password has been successfully updated. Redirecting to home login page in a few seconds...
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-3">
                  <Link to="/">
                    <Button className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/95 shadow-md">
                      Go to Sign In Immediately
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-3xl font-bold text-foreground tracking-tight">Reset Password</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please enter your new password and confirm it below.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        disabled={!token}
                        placeholder="••••••••"
                        className="h-12 rounded-xl border-border pl-11 pr-11 focus-visible:ring-primary"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        required
                        disabled={!token}
                        placeholder="••••••••"
                        className="h-12 rounded-xl border-border pl-11 pr-11 focus-visible:ring-primary"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {password && (
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

                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm animate-shake animate-duration-300">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                      <span className="leading-normal">{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !token || !isPasswordValid || password !== confirmPassword}
                    className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/95 shadow-md transition-all mt-2"
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>

        <div />
      </div>
    </div>
  );
}
