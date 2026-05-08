'use client';

import { useState } from 'react';
import { Eye, EyeOff, LoaderCircle, Lock, UserRound } from 'lucide-react';

type ApiResponse = {
  success: boolean;
  message: string;
  remaining?: string;
};

type Lang = 'en' | 'fr';

const copy = {
  en: {
    titleCreate: 'Create account',
    titleLicense: 'Activate license',
    introCreate: 'Choose your username and password first.',
    introLicense: 'Now enter your license key to unlock the loader.',
    username: 'Username',
    usernamePlaceholder: 'Your username',
    password: 'Password',
    passwordPlaceholder: 'Password',
    license: 'License key',
    create: 'Create account',
    creating: 'Creating...',
    activate: 'Activate license',
    activating: 'Activating...',
    createdTitle: 'Account created',
    activatedTitle: 'License activated',
    errorTitle: 'Error',
    accountCreatedMessage: 'Account created. Enter your license key to continue.',
    licenseActivatedMessage: 'License activated. Download starting...',
    serverError: 'Server error. Try again in a moment.',
    remaining: 'License',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    accountValidation: 'Enter a username with 3+ characters and a password with 6+ characters.',
    licenseValidation: 'Enter your license key.',
  },
  fr: {
    titleCreate: 'Créer un compte',
    titleLicense: 'Activer la licence',
    introCreate: "Choisis d'abord ton pseudo et ton mot de passe.",
    introLicense: 'Entre maintenant ta license key pour débloquer le loader.',
    username: 'Pseudo',
    usernamePlaceholder: 'Ton pseudo',
    password: 'Mot de passe',
    passwordPlaceholder: 'Mot de passe',
    license: 'License key',
    create: 'Créer le compte',
    creating: 'Création...',
    activate: 'Activer la licence',
    activating: 'Activation...',
    createdTitle: 'Compte créé',
    activatedTitle: 'Licence activée',
    errorTitle: 'Erreur',
    accountCreatedMessage: 'Compte créé. Entre ta license key pour continuer.',
    licenseActivatedMessage: 'Licence activée. Téléchargement en cours...',
    serverError: 'Erreur serveur. Réessaie dans un instant.',
    remaining: 'Licence',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    accountValidation: 'Entre un pseudo de 3 caractères minimum et un mot de passe de 6 caractères minimum.',
    licenseValidation: 'Entre ta license key.',
  },
};

function getBrowserHwid() {
  const key = 'loader_portal_hwid';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const random = crypto.randomUUID();
  window.localStorage.setItem(key, random);
  return random;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    const savedLang = window.localStorage.getItem('portal_lang');
    return savedLang === 'fr' ? 'fr' : 'en';
  });
  const [step, setStep] = useState<'account' | 'license'>('account');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const t = copy[lang];

  function changeLanguage(nextLang: Lang) {
    setLang(nextLang);
    window.localStorage.setItem('portal_lang', nextLang);
    setResult(null);
  }

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username.trim().length < 3 || password.length < 6) {
      setResult({ success: false, message: t.accountValidation });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/account/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          hwid: getBrowserHwid(),
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (data.success) {
        setResult({ ...data, message: t.accountCreatedMessage });
        setStep('license');
      } else {
        setResult(data);
      }
    } catch {
      setResult({ success: false, message: t.serverError });
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateLicense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!licenseKey.trim()) {
      setResult({ success: false, message: t.licenseValidation });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/account/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          licenseKey: licenseKey.trim(),
          hwid: getBrowserHwid(),
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (data.success) {
        setResult({ ...data, message: t.licenseActivatedMessage });
        window.setTimeout(() => {
          window.location.href = '/api/download';
        }, 600);
      } else {
        setResult(data);
      }
    } catch {
      setResult({ success: false, message: t.serverError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <Lock size={22} />
          </div>
          <div className="auth-title-copy" key={`title-${lang}-${step}`}>
            <h1>{step === 'account' ? t.titleCreate : t.titleLicense}</h1>
            <p>{step === 'account' ? t.introCreate : t.introLicense}</p>
          </div>
        </div>

        {step === 'account' ? (
          <form className="auth-form form-enter" key={`account-${lang}`} onSubmit={handleCreateAccount} noValidate>
            <div className="field">
              <label htmlFor="username">{t.username}</label>
              <div className="input-shell">
                <UserRound size={18} />
                <input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t.usernamePlaceholder}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">{t.password}</label>
              <div className="input-shell">
                <Lock size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t.passwordPlaceholder}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading && <LoaderCircle className="spin" size={18} />}
              {loading ? t.creating : t.create}
            </button>
          </form>
        ) : (
          <form className="auth-form form-enter" key={`license-${lang}`} onSubmit={handleActivateLicense} noValidate>
            <div className="field">
              <label htmlFor="license">{t.license}</label>
              <input
                id="license"
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
              />
            </div>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading && <LoaderCircle className="spin" size={18} />}
              {loading ? t.activating : t.activate}
            </button>
          </form>
        )}

        {result && (
          <div className={`auth-message message-enter ${result.success ? 'ok' : 'bad'}`}>
            <strong>
              {result.success
                ? step === 'license'
                  ? t.activatedTitle
                  : t.createdTitle
                : t.errorTitle}
            </strong>
            <span>{result.message}</span>
            {result.remaining && <small>{t.remaining}: {result.remaining}</small>}
          </div>
        )}
      </section>

      <div className="language-switcher" aria-label="Language">
        <button
          className={lang === 'en' ? 'active' : ''}
          onClick={() => changeLanguage('en')}
          type="button"
          aria-label="English"
          title="English"
        >
          <span className="flag flag-us" aria-hidden="true">
            <span />
          </span>
        </button>
        <button
          className={lang === 'fr' ? 'active' : ''}
          onClick={() => changeLanguage('fr')}
          type="button"
          aria-label="Français"
          title="Français"
        >
          <span className="flag flag-fr" aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
