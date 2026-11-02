import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 jconnect-bg">
      {/* Orb overlays are in CSS, just ensure content is above them */}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-purple-900/50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <Icon className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-white/50 mt-2 text-sm">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 p-8 backdrop-blur-sm shadow-2xl"
          style={{ backgroundColor: 'rgba(19,21,42,0.95)' }}>
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-white/40 mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}