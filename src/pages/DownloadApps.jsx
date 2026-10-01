import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Compass,
  Zap,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Home,
  Rocket,
  Send,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader.jsx";
import stepSearchImg from "@/assets/app-step-search.png";
import stepVerifiedImg from "@/assets/app-step-verified.png";
import stepConnectImg from "@/assets/app-step-connect.png";
import apkStep01Img from "@/assets/apk-step-01-download.png";
import apkStep02Img from "@/assets/apk-step-02-settings.png";
import apkStep03Img from "@/assets/apk-step-03-install.png";

export default function DownloadApps() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Is it safe to install these APK files?",
      a: "Yes, 100% safe and verified. These APK files are built directly from our official codebase and hosted securely on our servers. They contain zero adware, bloatware, or unauthorized third-party tracking.",
    },
    {
      q: "Which Android versions are supported?",
      a: "Both apps support Android 8.0 (Oreo) through the latest Android 15 across all major device manufacturers (Samsung, OnePlus, Xiaomi, Realme, Vivo, Google Pixel, etc.).",
    },
    {
      q: "What is the difference between the two apps?",
      a: "The RoomsFind Android App is the complete client platform where you can search rooms, filter by live distance, chat with verified owners, and view 360° virtual tours. The RoomsFind 360 Studio is a specialized camera tool built specifically for property owners to capture 360° room panoramas.",
    },
    {
      q: "Will my website account and data sync with the mobile app?",
      a: "Yes, completely! You can log in with the exact same email and password you use on the website. Your saved wishlist, chats, and property listings will sync automatically.",
    },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-ink antialiased">
      <SiteHeader />

      <main>
        {/* 1. Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-brand-soft/40 via-background to-background px-4 py-16 sm:px-6 lg:px-8 dark:border-slate-800/80">
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]" />
          <div className="pointer-events-none absolute top-1/2 -left-40 -z-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />

          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-1.5 text-xs font-black text-brand shadow-sm">
              <Sparkles className="size-3.5" />
              <span>Official Mobile Releases</span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-ink sm:text-5xl sm:leading-tight">
              Get RoomsFind on Your Mobile Phone
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
              Find verified broker-free rooms, chat directly with property owners, and explore
              gyroscope-guided 360° virtual tours. Download our official Android APKs below.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-4" />
                100% Virus-Free & Verified
              </span>
              <span className="inline-flex items-center gap-1.5 text-brand">
                <Zap className="size-4" />
                Zero Brokerage Guarantee
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Smartphone className="size-4" />
                Android 8.0 to Android 15
              </span>
            </div>
          </div>
        </section>

        {/* 2. How RoomsFind Works on Mobile (Showcase Mockups) */}
        <section className="border-b border-slate-200/80 bg-background px-4 py-16 sm:px-6 lg:px-8 dark:border-slate-800/80">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3.5 py-1 text-xs font-black text-brand">
                <Sparkles className="size-3.5" />
                <span>Seamless Experience</span>
              </div>
              <h2 className="text-2xl font-black text-ink sm:text-4xl">
                How RoomsFind Works on Mobile
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Browse verified listings, filter by exact distance, and chat with property owners directly with zero middleman commissions.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {/* Step 1: Search by keyword */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow-md shadow-blue-500/30">
                    1
                  </span>
                  <h3 className="text-lg font-black text-ink">Search by keyword</h3>
                </div>
                <p className="mb-6 max-w-xs text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Type any city, area, college, office, or landmark keyword and compare matching rooms.
                </p>
                <div className="w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-3 shadow-lg shadow-slate-900/5 transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-card">
                  <img
                    src={stepSearchImg}
                    alt="Search by keyword mobile preview"
                    className="w-full rounded-2xl object-contain"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Step 2: Verified listings */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white shadow-md shadow-emerald-500/30">
                    2
                  </span>
                  <h3 className="text-lg font-black text-ink">Verified listings</h3>
                </div>
                <p className="mb-6 max-w-xs text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Every owner is identity-verified. Filter by gender, budget, amenities and room type.
                </p>
                <div className="w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-3 shadow-lg shadow-slate-900/5 transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-card">
                  <img
                    src={stepVerifiedImg}
                    alt="Verified listings mobile preview"
                    className="w-full rounded-2xl object-contain"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Step 3: Connect directly */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-brand text-xs font-black text-white shadow-md shadow-brand/30">
                    3
                  </span>
                  <h3 className="text-lg font-black text-ink">Connect directly</h3>
                </div>
                <p className="mb-6 max-w-xs text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Chat on WhatsApp or call. Visit, finalize and move in with no middleman.
                </p>
                <div className="w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-3 shadow-lg shadow-slate-900/5 transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-card">
                  <img
                    src={stepConnectImg}
                    alt="Connect directly mobile preview"
                    className="w-full rounded-2xl object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Main Apps Grid (Download Cards) */}
        <section className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-16 sm:px-6 lg:px-8 dark:border-slate-800/80 dark:bg-card/20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-ink sm:text-3xl">
                Choose Your Android App
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Direct APK downloads from our official secure servers
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Card 1: RoomsFind Main App */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_20px_50px_-25px_rgba(79,70,229,0.15)] transition-all hover:border-brand/40 hover:shadow-xl sm:p-8 dark:border-slate-800 dark:bg-card dark:shadow-none">
                <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-brand/10 blur-3xl transition-opacity group-hover:opacity-100" />

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex size-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand-soft text-brand shadow-sm">
                      <Smartphone className="size-7" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-[11px] font-black uppercase text-brand">
                        Main App
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        v1.0.0
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-5 text-2xl font-black text-ink">
                    RoomsFind Android App
                  </h2>
                  <p className="mt-1 text-xs font-bold text-brand">
                    For Room Seekers & Property Owners
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    The complete RoomsFind platform in your pocket. Search rooms filtered by exact live
                    distance, chat directly with verified owners, and explore 360° interactive virtual tours.
                  </p>

                  <div className="mt-6 space-y-2.5">
                    {[
                      "Precise distance calculation from your live location (Redis-powered)",
                      "Zero brokerage direct owner connection & real-time chat",
                      "Interactive 360° virtual tours with 3D drag & zoom controls",
                      "Easy 4-step room listing wizard for property owners",
                      "Wishlist bookmarks & instant push notification alerts",
                    ].map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="size-4 shrink-0 text-brand" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <a
                    href="/downloads/RentPE-v1.0.0.apk"
                    download="RentPE-v1.0.0.apk"
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-brand py-3.5 text-sm font-black text-white shadow-lg shadow-brand/25 transition-all hover:brightness-105 active:scale-[0.99]"
                  >
                    <Download className="size-5" strokeWidth={2.5} />
                    <span>Download RoomsFind APK (v1.0.0)</span>
                  </a>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>File Size: ~24 MB</span>
                    <span>Android 8.0+ Compatible</span>
                    <span className="font-black text-brand">Official Release</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Standalone 360 Studio App */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_20px_50px_-25px_rgba(16,185,129,0.15)] transition-all hover:border-emerald-500/40 hover:shadow-xl sm:p-8 dark:border-slate-800 dark:bg-card dark:shadow-none">
                <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl transition-opacity group-hover:opacity-100" />

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-50 text-emerald-600 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Compass className="size-7" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Owner Studio Tool
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        v1.0.0
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-5 text-2xl font-black text-ink">
                    RoomsFind 360 Studio
                  </h2>
                  <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Dedicated 360° Camera Capture Tool for Property Owners
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    A dedicated mobile tool built to capture full-sphere 360° room panoramas. Uses your
                    phone's gyroscope and a live AR target reticle to capture ceiling, eye-level, and floor angles.
                  </p>

                  <div className="mt-6 space-y-2.5">
                    {[
                      "Live AR Reticle overlay (Pitch, Yaw, and Roll tracking)",
                      "20 target points for full-sphere coverage (Ceiling + Eye + Floor)",
                      "Automatic shutter trigger with 1-second steady hold",
                      "Single panorama photo direct upload support",
                      "Automatic server-side equirectangular panorama stitching",
                    ].map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <a
                    href="/downloads/RoomsFind-360-Studio-v1.0.0.apk"
                    download="RoomsFind-360-Studio-v1.0.0.apk"
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 active:scale-[0.99]"
                  >
                    <Download className="size-5" strokeWidth={2.5} />
                    <span>Download 360 Studio APK (v1.0.0)</span>
                  </a>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>File Size: ~19 MB</span>
                    <span>Gyroscope Sensor Required</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">Owner Tool</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. How to Install the APK (3 Easy Steps) */}
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-blue-50/50 via-white to-blue-50/20 px-4 py-20 sm:px-6 lg:px-8 dark:border-slate-800/80 dark:from-[#080d1a] dark:via-[#0b0f19] dark:to-[#080d1a]">
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-[130px] dark:bg-blue-600/10" />
          <div className="pointer-events-none absolute bottom-0 left-10 -z-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-[100px] dark:bg-emerald-600/10" />
          <div className="pointer-events-none absolute bottom-0 right-10 -z-10 h-72 w-72 rounded-full bg-purple-400/10 blur-[100px] dark:bg-purple-600/10" />

          <div className="mx-auto max-w-6xl">
            {/* Header: Logo, Badge, Title, Subtitle */}
            <div className="text-center">
              <div className="mb-3.5 inline-flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/25">
                  <Home className="size-4" strokeWidth={2.5} />
                </span>
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  RoomsFind
                </span>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/90 px-3.5 py-1 text-xs font-black text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-400">
                  <Download className="size-3.5" strokeWidth={2.5} />
                  <span>Quick & Easy</span>
                </div>
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
                How to Install the APK
                <span className="mt-1 block text-blue-600 dark:text-blue-400">
                  (3 Easy Steps)
                </span>
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-slate-500 sm:text-base dark:text-slate-400">
                Get up and running on your Android phone in under a minute
              </p>
            </div>

            {/* 3 Step Cards Grid */}
            <div className="mt-14 grid gap-6 sm:gap-8 md:grid-cols-3">
              {/* Card 01: Download the APK */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-blue-100/90 bg-white p-5 shadow-xl shadow-blue-900/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-500/10 dark:border-slate-800 dark:bg-card">
                {/* Step Number Badge */}
                <div className="absolute top-5 left-5 z-10 flex size-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-md shadow-blue-500/30">
                  01
                </div>

                {/* Illustration Image Area */}
                <div className="flex h-56 w-full items-center justify-center pt-6 pb-3 sm:h-64">
                  <img
                    src={apkStep01Img}
                    alt="Step 01: Download the APK"
                    className="h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Step Content */}
                <div className="mt-2 border-t border-slate-100/90 pt-4 dark:border-slate-800/80">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <Download className="size-4.5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Download the APK
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Tap either download button above to save the .apk file directly to your phone's Downloads folder.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 02: Allow Unknown Sources */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-purple-100/90 bg-white p-5 shadow-xl shadow-purple-900/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-purple-500/10 dark:border-slate-800 dark:bg-card">
                {/* Step Number Badge */}
                <div className="absolute top-5 left-5 z-10 flex size-9 items-center justify-center rounded-2xl bg-purple-600 text-sm font-black text-white shadow-md shadow-purple-500/30">
                  02
                </div>

                {/* Illustration Image Area */}
                <div className="flex h-56 w-full items-center justify-center pt-6 pb-3 sm:h-64">
                  <img
                    src={apkStep02Img}
                    alt="Step 02: Allow Unknown Sources"
                    className="h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Step Content */}
                <div className="mt-2 border-t border-slate-100/90 pt-4 dark:border-slate-800/80">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                      <ShieldCheck className="size-4.5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Allow Unknown Sources
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Tap the downloaded file. When prompted, open Settings and enable 'Allow from this source' for Chrome or your File Manager.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 03: Install & Open */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-emerald-100/90 bg-white p-5 shadow-xl shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald-500/10 dark:border-slate-800 dark:bg-card">
                {/* Step Number Badge */}
                <div className="absolute top-5 left-5 z-10 flex size-9 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-md shadow-emerald-500/30">
                  03
                </div>

                {/* Illustration Image Area */}
                <div className="flex h-56 w-full items-center justify-center pt-6 pb-3 sm:h-64">
                  <img
                    src={apkStep03Img}
                    alt="Step 03: Install & Open"
                    className="h-full w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Step Content */}
                <div className="mt-2 border-t border-slate-100/90 pt-4 dark:border-slate-800/80">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                      <Rocket className="size-4.5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Install & Open
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Tap 'Install' and launch the app once finished. Log in with your account and start exploring verified rooms!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Swoosh & "Your Next Room Awaits" */}
            <div className="mt-14 flex flex-col items-center justify-center">
              {/* Swoop Line with Paper Plane */}
              <div className="relative flex w-full max-w-md items-center justify-center">
                <svg
                  className="h-9 w-full text-blue-300/80 dark:text-blue-500/40"
                  viewBox="0 0 320 30"
                  fill="none"
                >
                  <path
                    d="M 10 26 Q 160 2 310 26"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    fill="none"
                  />
                </svg>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 p-2 text-white shadow-md shadow-blue-500/30">
                  <Send className="size-3.5 -rotate-45" strokeWidth={2.5} />
                </div>
              </div>

              {/* Tagline */}
              <div className="mt-4 flex items-center gap-3 text-xs font-black tracking-wider text-slate-400 dark:text-slate-500">
                <span className="h-px w-6 bg-slate-300 dark:bg-slate-700" />
                <span>Your Next Room Awaits</span>
                <span className="h-px w-6 bg-slate-300 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. FAQ Section */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-black text-ink sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-card"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-black text-ink hover:text-brand"
                >
                  <span>{faq.q}</span>
                  {openFaq === index ? (
                    <ChevronUp className="size-4 shrink-0 text-brand" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-slate-400" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="border-t border-slate-100 px-5 py-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-black text-brand hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to RoomsFind Website</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-card dark:text-slate-400">
        <p>© 2026 RoomsFind India Pvt. Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
}
