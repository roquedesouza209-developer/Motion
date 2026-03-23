"use client";

import type { FormEvent, ReactNode } from "react";
import type { InterestKey } from "@/lib/interests";

type AuthMode = "signin" | "signup";

type InterestOption = {
  id: InterestKey;
  label: string;
};

type RememberCandidate = {
  name: string;
};

type AuthScreenProps = {
  themePicker: ReactNode;
  authMode: AuthMode;
  authFirstName: string;
  authLastName: string;
  authUsername: string;
  authInterests: string[];
  interestOptions: readonly InterestOption[];
  email: string;
  password: string;
  demoEmail: string;
  demoPassword: string;
  authHint: string | null;
  error: string | null;
  rememberPromptOpen: boolean;
  rememberCandidate: RememberCandidate | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeAuthMode: (mode: AuthMode) => void;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangeUsername: (value: string) => void;
  onToggleInterest: (interestId: InterestKey) => void;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onRememberChoice: (shouldSave: boolean) => void;
  onClearFeedback: () => void;
};

export default function AuthScreen({
  themePicker,
  authMode,
  authFirstName,
  authLastName,
  authUsername,
  authInterests,
  interestOptions,
  email,
  password,
  demoEmail,
  demoPassword,
  authHint,
  error,
  rememberPromptOpen,
  rememberCandidate,
  onSubmit,
  onChangeAuthMode,
  onChangeFirstName,
  onChangeLastName,
  onChangeUsername,
  onToggleInterest,
  onChangeEmail,
  onChangePassword,
  onRememberChoice,
  onClearFeedback,
}: AuthScreenProps) {
  return (
    <>
      <div className="auth-theme-toggle">{themePicker}</div>
      <div className="auth-grid">
        <div className="auth-preview" aria-hidden="true">
          <div className="auth-phone">
            <div className="auth-phone-screen">
              <div className="auth-phone-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="auth-phone-story-row">
                {["A", "B", "C", "D", "E"].map((item) => (
                  <span key={item} className="auth-phone-story" />
                ))}
              </div>
              <div className="auth-phone-post">
                <div className="auth-phone-post-media" />
                <div className="auth-phone-post-lines">
                  <span />
                  <span />
                </div>
              </div>
              <div className="auth-phone-post">
                <div className="auth-phone-post-media is-short" />
                <div className="auth-phone-post-lines">
                  <span />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-stack">
          <main className="auth-card">
            <div className="auth-logo" style={{ fontFamily: "var(--font-heading)" }}>
              Motion
            </div>
            <p className="auth-tagline">
              {authMode === "signup"
                ? "Create an account to start sharing."
                : "Sign in to keep up with friends and creators."}
            </p>
            <form className="auth-form" onSubmit={onSubmit}>
              {authMode === "signup" ? (
                <>
                  <div className="auth-name-row">
                    <input
                      className="auth-input"
                      value={authFirstName}
                      onChange={(event) => onChangeFirstName(event.target.value)}
                      type="text"
                      placeholder="First name"
                    />
                    <input
                      className="auth-input"
                      value={authLastName}
                      onChange={(event) => onChangeLastName(event.target.value)}
                      type="text"
                      placeholder="Last name"
                    />
                  </div>
                  <input
                    className="auth-input"
                    value={authUsername}
                    onChange={(event) => onChangeUsername(event.target.value)}
                    type="text"
                    placeholder="Username"
                  />
                  <div className="rounded-[24px] border border-[var(--line)] bg-white px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Interests
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Pick what you want Motion to prioritize in your feed.
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        {authInterests.length} selected
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {interestOptions.map((interest) => {
                        const active = authInterests.includes(interest.id);

                        return (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => onToggleInterest(interest.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              active
                                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                                : "border-[var(--line)] bg-white text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)]"
                            }`}
                            aria-pressed={active}
                          >
                            {interest.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
              <input
                className="auth-input"
                value={email}
                onChange={(event) => onChangeEmail(event.target.value)}
                type="email"
                placeholder={
                  authMode === "signup" ? "Email address" : "Email address or username"
                }
              />
              {authMode === "signup" ? (
                <p className="auth-help">Email address is not shown on your profile.</p>
              ) : null}
              <input
                className="auth-input"
                value={password}
                onChange={(event) => onChangePassword(event.target.value)}
                type="password"
                placeholder="Password"
              />
              <button className="auth-button" type="submit">
                {authMode === "signup" ? "Sign Up" : "Sign In"}
              </button>
            </form>
            <div className="auth-divider">
              <span>OR</span>
            </div>
            <p className="auth-demo">
              Demo login: <strong>{demoEmail}</strong> / <strong>{demoPassword}</strong>
            </p>
            {authHint ? <p className="auth-hint">{authHint}</p> : null}
            {error ? <p className="auth-error">{error}</p> : null}
          </main>
          <div className="auth-card auth-card-sub">
            {authMode === "signup" ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  className="auth-inline-button"
                  onClick={() => {
                    onClearFeedback();
                    onChangeAuthMode("signin");
                  }}
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="auth-inline-button"
                  onClick={() => {
                    onClearFeedback();
                    onChangeAuthMode("signup");
                  }}
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
          <div className="auth-apps">
            <p>Get the app.</p>
            <div className="auth-store-row">
              <span>App Store</span>
              <span>Google Play</span>
            </div>
          </div>
        </div>
      </div>

      {rememberPromptOpen && rememberCandidate ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm"
          onClick={() => onRememberChoice(false)}
        >
          <section
            className="auth-remember-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Save your login"
          >
            <div className="auth-remember-avatar">
              {rememberCandidate.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <h2>Save your login info?</h2>
            <p>We can save your login details so you can quickly switch accounts.</p>
            <div className="auth-remember-actions">
              <button
                type="button"
                className="auth-remember-secondary"
                onClick={() => onRememberChoice(false)}
              >
                Not now
              </button>
              <button
                type="button"
                className="auth-remember-primary"
                onClick={() => onRememberChoice(true)}
              >
                Save info
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
