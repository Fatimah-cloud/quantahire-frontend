import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, EyeOff, Lock, Mail, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quantaClient } from "@/api/quantaClient";

export default function AdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await quantaClient.functions.invoke("authLogin", {
        email: email.trim().toLowerCase(),
        password,
      });

      setLoading(false);

      if (res.data.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      const user = res.data.user;
      if (user.role !== "admin") {
        setError("Invalid email or password. Please try again.");
        await quantaClient.auth.logout();
        return;
      }

      // Route directly to admin dashboard
      navigate("/admin-dashboard");
    } catch (err) {
      setLoading(false);
      setError("An unexpected connection error occurred. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      {/* Left side — branding with premium gradient & dynamic visuals */}
      <div className="relative hidden lg:flex flex-col justify-between px-16 py-14 overflow-hidden bg-gradient-to-br from-[#EDE9FE] via-[#F3EEFF] to-[#D8B4FE]">
        {/* Animated backdrop elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-purple-300/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white/60 rounded-full px-4 py-1.5 shadow-md">
            <Sparkles className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: "4s" }} />
            <span className="text-sm font-medium text-foreground">Secure System Management</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-8 border border-white/80">
            <Shield className="w-8 h-8 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-5xl font-bold text-primary tracking-tight mb-4 leading-tight">
            QuantaHire<br />Administration
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
            Access secure controls to review recruiter registrations, view deep match statistics, and manage the platform.
          </p>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} QuantaHire Platform. Authorized access only.
        </div>
      </div>

      {/* Right side — Admin Login Form */}
      <div className="flex flex-col px-6 md:px-12 py-10 bg-background justify-between min-h-screen">
        {/* Back Link */}
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
            {/* Header */}
            <div>
              <div className="inline-flex lg:hidden items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-1">System Portal</p>
              <h2 className="text-3xl font-bold text-foreground tracking-tight">Admin Sign In</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your administrative credentials to access control panels
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="admin@quantahire.com"
                    className="h-12 rounded-xl border-border pl-11 focus-visible:ring-primary"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Box */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm animate-shake">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span className="leading-normal">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/95 shadow-md hover:shadow-lg transition-all mt-4"
              >
                {loading ? "Verifying Credentials..." : "Sign In to Dashboard"}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer spacer */}
        <div />
      </div>
    </div>
  );
}