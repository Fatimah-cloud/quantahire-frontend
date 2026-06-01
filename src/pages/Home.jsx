import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Briefcase, Users, Shield } from "lucide-react";
import RoleCard from "../components/home/RoleCard";

export default function Home() {
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    if (role === "recruiter") navigate("/recruiter-auth");
    else if (role === "candidate") navigate("/candidate-auth");
    else if (role === "admin") navigate("/admin-auth");
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 relative">
      {/* Left side — branding */}
      <div className="relative flex items-center px-8 md:px-16 py-16 overflow-hidden bg-gradient-to-br from-[#EDE9FE] to-[#F5F3FF]">
        {/* Logo in top-left corner */}
        <div className="absolute top-8 left-8 z-20 flex items-center gap-2.5 select-none">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
            <Briefcase className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="font-semibold text-lg text-purple-900 tracking-tight">QuantaHire</span>
        </div>

        {/* Animated gradient blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-pink-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-xl pt-16 lg:pt-0">
          {/* Pill */}
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md border border-white/40 rounded-full px-4 py-1.5 shadow-lg hover:bg-white/70 transition-all">
            <Sparkles className="w-4 h-4 text-purple-600 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-sm font-medium text-gray-700">AI-Powered Recruitment Platform</span>
          </div>

          {/* Heading */}
          <h1 className="mt-8 text-6xl md:text-7xl font-bold text-purple-600 tracking-tight leading-tight break-words">
            QuantaHire
          </h1>

          <p className="mt-6 text-xl text-gray-600 leading-relaxed max-w-md font-light">
            Transform your hiring with intelligent candidate matching and unbiased screening powered by advanced AI.
          </p>

          {/* Feature cards */}
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl p-4 hover:bg-white/80 transition-all shadow-sm">
              <Briefcase className="w-6 h-6 text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-800 text-sm">For Recruiters</h3>
              <p className="text-gray-600 text-xs mt-1">Smart screening & AI matching</p>
            </div>
            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl p-4 hover:bg-white/80 transition-all shadow-sm">
              <Users className="w-6 h-6 text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-800 text-sm">For Candidates</h3>
              <p className="text-gray-600 text-xs mt-1">Fair evaluation & instant feedback</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — account selection */}
      <div className="flex items-center justify-center px-6 md:px-12 py-16 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-semibold text-foreground tracking-tight">
              Welcome to QuantaHire
            </h2>
            <p className="mt-2 text-muted-foreground">
              Choose your account type to continue
            </p>
          </div>

          <div className="space-y-3">
            <RoleCard
              icon={Briefcase}
              title="I'm a Recruiter"
              description="Post jobs and find top talent"
              onClick={() => handleSelectRole("recruiter")}
            />
            <RoleCard
              icon={Users}
              title="I'm a Candidate"
              description="Find jobs and apply with ease"
              onClick={() => handleSelectRole("candidate")}
            />
            <RoleCard
              icon={Shield}
              title="I'm an Admin"
              description="Manage platform and users"
              onClick={() => handleSelectRole("admin")}
            />
          </div>


        </div>
      </div>

      {/* Support email in bottom-left corner */}
      <div className="absolute bottom-4 left-4 z-20 select-none pointer-events-none">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <span>📧</span> support@quantahire.com
        </p>
      </div>
    </div>
  );
}