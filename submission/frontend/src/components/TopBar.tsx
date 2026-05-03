import { useState, useEffect } from 'react';
import { ArrowUpRight, Search, ShieldCheck, Sparkles, LogOut, Globe } from 'lucide-react';
import { GoogleLogin, googleLogout, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface GoogleUser {
  name: string;
  picture: string;
  email: string;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
  { code: 'ur', label: 'اردو (Urdu)' }
];

const browseLinks = [
  { href: '#quick-actions', label: 'Voting guide' },
  { href: '#election-timeline', label: 'Timeline' },
  { href: '#polling-locator', label: 'Booth map' },
] as const;

export default function TopBar() {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [currentLang, setCurrentLang] = useState('en');

  // Sync Google Translate when currentLang changes
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setCurrentLang(lang);
    
    // Find the hidden Google Translate select and trigger it
    const translateSelect = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (translateSelect) {
      translateSelect.value = lang;
      translateSelect.dispatchEvent(new Event('change'));
    }
  };

  const handleLoginSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      const decoded = jwtDecode<GoogleUser>(credentialResponse.credential);
      setUser(decoded);
      // Here you would typically store the token in localStorage
      // localStorage.setItem('auth_token', credentialResponse.credential);
    }
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    // localStorage.removeItem('auth_token');
  };

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8 xl:px-0 xl:pt-0">
      <div className="panel rounded-[28px] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white xl:hidden">
              Election Copilot
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Non-partisan learning workspace
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                Learn the process, verify your booth, and ask questions with context.
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[420px] xl:max-w-[460px] xl:flex-1">
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
                size={18}
              />
              <input
                type="text"
                placeholder="Search voter ID rules or counting phases"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-4 text-sm outline-none transition focus:border-primary/25 focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative group flex items-center">
              <Globe size={18} className="absolute left-3 text-slate-500 pointer-events-none group-focus-within:text-primary transition-colors" />
              <select
                aria-label="Select Language"
                value={currentLang}
                onChange={handleLanguageChange}
                className="h-10 pl-9 pr-8 rounded-2xl border border-slate-200 bg-white/90 text-sm font-medium text-slate-700 outline-none transition focus:border-primary/25 focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer hover:border-slate-300"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <div className="absolute right-3 pointer-events-none text-slate-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {user ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 pl-2 pr-4 py-1.5 border border-slate-200 shadow-sm">
                <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full border border-slate-200" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-500 leading-tight">Voter</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl">
                <GoogleLogin
                  onSuccess={handleLoginSuccess}
                  onError={() => {
                    // In a production app, trigger a toast notification here
                    console.error('Google OAuth Authentication Failed');
                  }}
                  theme="outline"
                  shape="pill"
                  text="continue_with"
                />
              </div>
            )}
            
            <a
              href="#copilot-panel"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.18)]"
            >
              Open copilot
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 xl:hidden">
          {browseLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
