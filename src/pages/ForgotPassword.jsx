import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quantaClient } from "@/api/quantaClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await quantaClient.functions.invoke("forgotPassword", {
        email: email.trim().toLowerCase(),
      });

      setLoading(false);

      if (res.data.error) {
        setError(res.data.error);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setLoading(false);
      setError("An unexpected error occurred. Please try again.");
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
            <Mail className="w-8 h-8 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-5xl font-bold text-primary tracking-tight mb-4 leading-tight">
            Reset Your<br />Password
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
            Recover your account password easily. Enter your email and we'll send you a password reset link.
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
                  <h2 className="text-2xl font-bold text-foreground">Check Your Email</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If an account exists with this email, you will receive a reset link. Please check your inbox and spam folder.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-3">
                  <Link to="/">
                    <Button variant="outline" className="w-full h-12 rounded-xl text-base font-semibold">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-3xl font-bold text-foreground tracking-tight">Forgot Password?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enter the email address associated with your account and we will send you a reset link.
                  </p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="h-12 rounded-xl border-border pl-11 focus-visible:ring-primary"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                        }}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm animate-shake">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                      <span className="leading-normal">{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/95 shadow-md transition-all mt-2"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Remember your password?{" "}
                    <Link to="/" className="text-primary font-semibold hover:underline">
                      Sign In
                    </Link>
                  </p>
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
