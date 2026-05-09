'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, EyeOff, LoaderCircle, Lock, LogIn, LogOut, Save, UserPlus, UserRound } from 'lucide-react';

type ApiResponse = {
  success: boolean;
  message: string;
  remaining?: string;
  licenseKey?: string;
  username?: string;
  profile?: UserProfile;
};

type UserProfile = {
  username: string;
  avatarUrl: string | null;
  licenseKey: string | null;
  remaining: string | null;
  status: string | null;
};

type Lang = 'en' | 'fr';

const copy = {
  en: {
    createTitle: 'Create account',
    loginTitle: 'Log in',
    welcomeTitle: 'Welcome',
    createIntro: 'Choose your username and password first.',
    loginIntro: 'Enter your username and password to open your dashboard.',
    welcomeIntro: 'Choose how you want to continue.',
    dashboardTitle: 'Dashboard',
    dashboardIntro: 'Manage your account and activate your license key.',
    username: 'Username',
    usernamePlaceholder: 'Your username',
    password: 'Password',
    passwordPlaceholder: 'Password',
    newPasswordPlaceholder: 'New password',
    license: 'License key',
    create: 'Create account',
    login: 'Log in',
    loggingIn: 'Logging in...',
    creating: 'Creating...',
    back: 'Back',
    save: 'Save changes',
    saving: 'Saving...',
    activate: 'Activate license',
    activating: 'Activating...',
    download: 'Download loader',
    logout: 'Log out',
    activeLicense: 'Active license',
    noLicense: 'No active license yet',
    remaining: 'Time remaining',
    createdTitle: 'Account created',
    savedTitle: 'Account updated',
    activatedTitle: 'License activated',
    errorTitle: 'Error',
    accountCreatedMessage: 'Account created. You are now in your dashboard.',
    loginMessage: 'Logged in. Welcome back.',
    accountSavedMessage: 'Account updated.',
    licenseActivatedMessage: 'License activated. You can download the loader below.',
    serverError: 'Server error. Try again in a moment.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    accountValidation: 'Enter a username with 3+ characters and a password with 6+ characters.',
    loginValidation: 'Enter your username and password.',
    updateValidation: 'Username must contain at least 3 characters.',
    licenseValidation: 'Enter your license key.',
    uploadAvatar: 'Upload avatar',
    uploading: 'Uploading...',
    avatarTitle: 'Profile picture',
    avatarSuccess: 'Avatar updated.',
  },
  fr: {
    createTitle: 'Créer un compte',
    loginTitle: 'Se connecter',
    welcomeTitle: 'Bienvenue',
    createIntro: "Choisis d'abord ton pseudo et ton mot de passe.",
    loginIntro: 'Entre ton pseudo et ton mot de passe pour ouvrir ton dashboard.',
    welcomeIntro: 'Choisis comment tu veux continuer.',
    dashboardTitle: 'Dashboard',
    dashboardIntro: 'Gère ton compte et active ta license key.',
    username: 'Pseudo',
    usernamePlaceholder: 'Ton pseudo',
    password: 'Mot de passe',
    passwordPlaceholder: 'Mot de passe',
    newPasswordPlaceholder: 'Nouveau mot de passe',
    license: 'License key',
    create: 'Créer le compte',
    login: 'Se connecter',
    loggingIn: 'Connexion...',
    creating: 'Création...',
    back: 'Retour',
    save: 'Sauvegarder',
    saving: 'Sauvegarde...',
    activate: 'Activer la licence',
    activating: 'Activation...',
    download: 'Télécharger le loader',
    logout: 'Se déconnecter',
    activeLicense: 'Licence active',
    noLicense: 'Aucune licence active',
    remaining: 'Temps restant',
    createdTitle: 'Compte créé',
    savedTitle: 'Compte modifié',
    activatedTitle: 'Licence activée',
    errorTitle: 'Erreur',
    accountCreatedMessage: 'Compte créé. Tu es maintenant dans ton dashboard.',
    loginMessage: 'Connecté. Bon retour.',
    accountSavedMessage: 'Compte modifié.',
    licenseActivatedMessage: 'Licence activée. Tu peux télécharger le loader ci-dessous.',
    serverError: 'Erreur serveur. Réessaie dans un instant.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    accountValidation: 'Entre un pseudo de 3 caractères minimum et un mot de passe de 6 caractères minimum.',
    loginValidation: 'Entre ton pseudo et ton mot de passe.',
    updateValidation: 'Le pseudo doit contenir au moins 3 caractères.',
    licenseValidation: 'Entre ta license key.',
    uploadAvatar: "Changer l'avatar",
    uploading: 'Envoi...',
    avatarTitle: 'Photo de profil',
    avatarSuccess: 'Avatar mis à jour.',
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

function getSavedUsername() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('portal_username') ?? '';
}

export default function Home() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    const savedLang = window.localStorage.getItem('portal_lang');
    return savedLang === 'fr' ? 'fr' : 'en';
  });
  const [mode, setMode] = useState<'menu' | 'register' | 'login' | 'dashboard'>(() => (getSavedUsername() ? 'dashboard' : 'menu'));
  const [username, setUsername] = useState(getSavedUsername);
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState('');
  const [resultKind, setResultKind] = useState<'created' | 'saved' | 'activated' | 'error'>('created');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const t = copy[lang];

  useEffect(() => {
    const savedUsername = getSavedUsername();
    if (savedUsername) {
      void (async () => {
        const params = new URLSearchParams({ username: savedUsername, hwid: getBrowserHwid() });
        const response = await fetch(`/api/account/profile?${params.toString()}`);

        if (!response.ok) return;

        const data = (await response.json()) as ApiResponse;
        if (data.profile) {
          setProfile(data.profile);
          setUsername(data.profile.username);
          setLicenseKey('');
        }
      })();
    }
  }, []);

  function changeLanguage(nextLang: Lang) {
    setLang(nextLang);
    window.localStorage.setItem('portal_lang', nextLang);
    setResult(null);
  }

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username.trim().length < 3 || password.length < 6) {
      setResultKind('error');
      setResult({ success: false, message: t.accountValidation });
      return;
    }

    setLoading('create');
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
        const createdUsername = username.trim();
        window.localStorage.setItem('portal_username', createdUsername);
        setPassword('');
        setMode('dashboard');
        setProfile({
          username: createdUsername,
          licenseKey: null,
          remaining: null,
          status: null,
        });
        setResultKind('created');
        setResult({ ...data, message: t.accountCreatedMessage });
      } else {
        setResultKind('error');
        setResult(data);
      }
    } catch {
      setResultKind('error');
      setResult({ success: false, message: t.serverError });
    } finally {
      setLoading('');
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setResultKind('error');
      setResult({ success: false, message: t.loginValidation });
      return;
    }

    setLoading('login');
    setResult(null);

    try {
      const response = await fetch('/api/account/login', {
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
        const loggedUsername = data.username ?? username.trim();
        window.localStorage.setItem('portal_username', loggedUsername);
        setUsername(loggedUsername);
        setPassword('');
        setMode('dashboard');
        setProfile(data.profile ?? null);
        setLicenseKey('');
        setResultKind('saved');
        setResult({ ...data, message: t.loginMessage });
      } else {
        setResultKind('error');
        setResult(data);
      }
    } catch {
      setResultKind('error');
      setResult({ success: false, message: t.serverError });
    } finally {
      setLoading('');
    }
  }

  async function handleSaveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username.trim().length < 3) {
      setResultKind('error');
      setResult({ success: false, message: t.updateValidation });
      return;
    }

    setLoading('save');
    setResult(null);

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUsername: profile?.username ?? getSavedUsername(),
          username: username.trim(),
          password: password || undefined,
          hwid: getBrowserHwid(),
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (data.success) {
        const nextUsername = data.username ?? username.trim();
        window.localStorage.setItem('portal_username', nextUsername);
        setUsername(nextUsername);
        setPassword('');
        setProfile((current) => current ? { ...current, username: nextUsername } : current);
        setResultKind('saved');
        setResult({ ...data, message: t.accountSavedMessage });
      } else {
        setResultKind('error');
        setResult(data);
      }
    } catch {
      setResultKind('error');
      setResult({ success: false, message: t.serverError });
    } finally {
      setLoading('');
    }
  }

  async function handleActivateLicense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!licenseKey.trim()) {
      setResultKind('error');
      setResult({ success: false, message: t.licenseValidation });
      return;
    }

    setLoading('license');
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
        setProfile((current) => ({
          username,
          licenseKey: data.licenseKey ?? licenseKey.trim(),
          remaining: data.remaining ?? current?.remaining ?? null,
          status: 'active',
        }));
        setLicenseKey('');
        setResultKind('activated');
        setResult({ ...data, message: t.licenseActivatedMessage });
      } else {
        setResultKind('error');
        setResult(data);
      }
    } catch {
      setResultKind('error');
      setResult({ success: false, message: t.serverError });
    } finally {
      setLoading('');
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setLoading('avatar');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', profile.username);
    formData.append('hwid', getBrowserHwid());

    try {
      const response = await fetch('/api/account/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as ApiResponse & { avatar_url?: string };

      if (data.success && data.avatar_url) {
        setProfile((current) => current ? { ...current, avatarUrl: data.avatar_url! } : current);
        setResultKind('saved');
        setResult({ success: true, message: t.avatarSuccess });
      } else {
        setResultKind('error');
        setResult(data);
      }
    } catch {
      setResultKind('error');
      setResult({ success: false, message: t.serverError });
    } finally {
      setLoading('');
    }
  }

  function handleLogout() {
    window.localStorage.removeItem('portal_username');
    setMode('menu');
    setUsername('');
    setPassword('');
    setLicenseKey('');
    setProfile(null);
    setResult(null);
  }

  const isDashboard = mode === 'dashboard';
  const hasActiveLicense = profile?.status === 'active' && Boolean(profile.remaining);
  const title =
    mode === 'dashboard'
      ? t.dashboardTitle
      : mode === 'register'
        ? t.createTitle
        : mode === 'login'
          ? t.loginTitle
          : t.welcomeTitle;
  const intro =
    mode === 'dashboard'
      ? t.dashboardIntro
      : mode === 'register'
        ? t.createIntro
        : mode === 'login'
          ? t.loginIntro
          : t.welcomeIntro;

  return (
    <main className="auth-page">
      <section className={`auth-card ${isDashboard ? 'dashboard-card' : ''}`}>
        <div className="auth-brand">
          <div className="brand-mark">
            <Lock size={22} />
          </div>
          <div className="auth-title-copy" key={`title-${lang}-${mode}`}>
            <h1>{title}</h1>
            <p>{intro}</p>
          </div>
        </div>

        {mode === 'menu' && (
          <div className="choice-grid form-enter">
            <button className="choice-button" type="button" onClick={() => { setResult(null); setMode('register'); }}>
              <UserPlus size={20} />
              <span>{t.create}</span>
            </button>
            <button className="choice-button" type="button" onClick={() => { setResult(null); setMode('login'); }}>
              <LogIn size={20} />
              <span>{t.login}</span>
            </button>
          </div>
        )}

        {mode === 'register' && (
          <form className="auth-form form-enter" key={`register-${lang}`} onSubmit={handleCreateAccount} noValidate>
            <AccountFields
              t={t}
              username={username}
              password={password}
              showPassword={showPassword}
              setUsername={setUsername}
              setPassword={setPassword}
              setShowPassword={setShowPassword}
            />

            <button className="primary-button" type="submit" disabled={loading === 'create'}>
              {loading === 'create' && <LoaderCircle className="spin" size={18} />}
              {loading === 'create' ? t.creating : t.create}
            </button>

            <button className="text-button" type="button" onClick={() => { setResult(null); setMode('menu'); }}>
              {t.back}
            </button>
          </form>
        )}

        {mode === 'login' && (
          <form className="auth-form form-enter" key={`login-${lang}`} onSubmit={handleLogin} noValidate>
            <AccountFields
              t={t}
              username={username}
              password={password}
              showPassword={showPassword}
              setUsername={setUsername}
              setPassword={setPassword}
              setShowPassword={setShowPassword}
            />

            <button className="primary-button" type="submit" disabled={loading === 'login'}>
              {loading === 'login' ? <LoaderCircle className="spin" size={18} /> : <LogIn size={18} />}
              {loading === 'login' ? t.loggingIn : t.login}
            </button>

            <button className="text-button" type="button" onClick={() => { setResult(null); setMode('menu'); }}>
              {t.back}
            </button>
          </form>
        )}

        {isDashboard && (
          <div className="dashboard-panels form-enter" key={`dashboard-${lang}`}>
            <div className="dashboard-actions">
              <div className="avatar-section">
                <div className="avatar-wrapper">
                  {loading === 'avatar' ? (
                    <LoaderCircle className="spin" size={24} />
                  ) : (
                    <img src={profile?.avatarUrl || '/logo.png'} alt="Avatar" />
                  )}
                  <label className="avatar-edit" htmlFor="avatar-input" title={t.uploadAvatar}>
                    <UserPlus size={14} />
                    <input
                      id="avatar-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={loading === 'avatar'}
                      hidden
                    />
                  </label>
                </div>
                <div className="avatar-info">
                   <span className="username-display">{profile?.username}</span>
                   <span className="avatar-label">{t.avatarTitle}</span>
                </div>
              </div>

              <button className="text-button logout-button" type="button" onClick={handleLogout}>
                <LogOut size={16} />
                {t.logout}
              </button>
            </div>

            <form className="dashboard-panel" onSubmit={handleSaveAccount} noValidate>
              <AccountFields
                t={t}
                username={username}
                password={password}
                showPassword={showPassword}
                setUsername={setUsername}
                setPassword={setPassword}
                setShowPassword={setShowPassword}
                passwordPlaceholder={t.newPasswordPlaceholder}
              />

              <button className="secondary-button" type="submit" disabled={loading === 'save'}>
                {loading === 'save' ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
                {loading === 'save' ? t.saving : t.save}
              </button>
            </form>

            <form className="dashboard-panel" onSubmit={handleActivateLicense} noValidate>
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

              <button className="secondary-button" type="submit" disabled={loading === 'license'}>
                {loading === 'license' && <LoaderCircle className="spin" size={18} />}
                {loading === 'license' ? t.activating : t.activate}
              </button>
            </form>

            <div className="license-summary">
              <span>{hasActiveLicense ? t.activeLicense : t.noLicense}</span>
              <strong>{hasActiveLicense ? profile?.remaining : '-'}</strong>
              {hasActiveLicense && (
                <a className="download-button" href="/api/download">
                  <Download size={19} />
                  {t.download}
                </a>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className={`auth-message message-enter ${result.success ? 'ok' : 'bad'}`}>
            <strong>
              {result.success && resultKind === 'saved' && t.savedTitle}
              {result.success && resultKind === 'activated' && t.activatedTitle}
              {result.success && resultKind === 'created' && t.createdTitle}
              {!result.success && t.errorTitle}
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

function AccountFields({
  t,
  username,
  password,
  showPassword,
  setUsername,
  setPassword,
  setShowPassword,
  passwordPlaceholder,
}: {
  t: typeof copy.en;
  username: string;
  password: string;
  showPassword: boolean;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  setShowPassword: (value: boolean | ((current: boolean) => boolean)) => void;
  passwordPlaceholder?: string;
}) {
  return (
    <>
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
            placeholder={passwordPlaceholder ?? t.passwordPlaceholder}
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
    </>
  );
}
