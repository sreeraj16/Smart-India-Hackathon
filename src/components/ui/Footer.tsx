import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center space-x-2 bg-white p-1.5 px-2.5 rounded-xl border border-slate-700/60 shadow-sm">
                <img src="/rgukt-logo.png" alt="RGUKT Logo" className="h-8 w-auto object-contain" />
                <div className="h-5 w-px bg-slate-200" />
                <img src="/sih-logo.png" alt="SIH Logo" className="h-8 w-auto object-contain" />
              </div>
              <div>
                <span className="font-bold text-white text-base block leading-tight">RGUKT Nuzvid</span>
                <span className="text-xs text-rose-400 font-semibold">Smart India Hackathon 2026</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              Official platform for the Smart India Hackathon — Internal Hackathon 2026. Empowering student innovators to present groundbreaking solutions for nation-building challenges.
            </p>

            {/* HACKHUB Branding Card */}
            <div className="inline-flex flex-col items-start gap-2.5 mt-2">
              <div className="bg-white rounded-xl border border-slate-700/60 shadow-sm overflow-hidden max-w-[150px] p-1 flex items-center justify-center">
                <img
                  src="/hackhub-logo.png"
                  alt="HACKHUB - Coded For Hackathons"
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="text-[9px] font-black tracking-wider text-slate-900 bg-amber-400 px-2 py-0.5 rounded border border-amber-500 font-mono shadow-xs">
                @Team_HACKHUB-RGUKT NUZVID
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/guidelines" className="hover:text-white transition-colors">Guidelines & Rules</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Team Registration</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Portals</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Team Lead Login</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Jury Portal Login</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Admin Controller Login</Link></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
          <p>© 2026 Rajiv Gandhi University of Knowledge Technologies (RGUKT) Nuzvid. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-extrabold text-amber-400 font-mono">@Team_HACKHUB-RGUKT NUZVID</p>
        </div>
      </div>
    </footer>
  );
}
