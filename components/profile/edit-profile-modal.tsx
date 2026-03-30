"use client";

import UserAvatar from "@/components/user-avatar";
import {
  PROFILE_ACCENT_OPTIONS,
  PROFILE_COVER_OPTIONS,
  getProfileAccentMeta,
  getProfileCoverBackground,
} from "@/lib/profile-styles";
import type { ProfileAccent, ProfileCoverTheme } from "@/lib/server/types";

type EditProfileModalProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  firstName: string;
  lastName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  coverImageUrl: string;
  coverTheme: ProfileCoverTheme;
  profileAccent: ProfileAccent;
  avatarUploading: boolean;
  coverUploading: boolean;
  previewName: string;
  previewGradient: string;
  onClose: () => void;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangeHandle: (value: string) => void;
  onChangeBio: (value: string) => void;
  onSelectCoverTheme: (value: ProfileCoverTheme) => void;
  onSelectProfileAccent: (value: ProfileAccent) => void;
  onUploadAvatar: (file: File) => void;
  onUploadCover: (file: File) => void;
  onRemoveAvatar: () => void;
  onRemoveCover: () => void;
  onSave: () => void;
};

export default function EditProfileModal({
  open,
  saving,
  error,
  firstName,
  lastName,
  handle,
  bio,
  avatarUrl,
  coverImageUrl,
  coverTheme,
  profileAccent,
  avatarUploading,
  coverUploading,
  previewName,
  previewGradient,
  onClose,
  onChangeFirstName,
  onChangeLastName,
  onChangeHandle,
  onChangeBio,
  onSelectCoverTheme,
  onSelectProfileAccent,
  onUploadAvatar,
  onUploadCover,
  onRemoveAvatar,
  onRemoveCover,
  onSave,
}: EditProfileModalProps) {
  if (!open) {
    return null;
  }

  const accent = getProfileAccentMeta(profileAccent);
  const coverBackground = getProfileCoverBackground(coverTheme);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-sm"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <section
        className="motion-surface w-full max-w-2xl p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Edit Profile
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update your profile details, cover styling, and avatar look.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-white text-slate-500"
            aria-label="Close edit profile"
            disabled={saving}
          >
            x
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Cover</label>
              <div className="overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--plain-bg)]">
                <div className="relative h-40" style={{ background: coverBackground }}>
                  {coverImageUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${coverImageUrl})` }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 inline-flex rounded-full bg-[var(--plain-bg)]/90 p-1.5 backdrop-blur-sm">
                    <UserAvatar
                      name={previewName}
                      avatarGradient={previewGradient}
                      avatarUrl={avatarUrl || undefined}
                      className="h-16 w-16 text-sm font-bold ring-4 ring-white/70"
                      textClassName="text-sm font-bold text-white"
                      sizes="64px"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] px-4 py-3">
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                    {coverUploading ? "Uploading..." : "Upload Cover"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={coverUploading || saving}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          onUploadCover(file);
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {coverImageUrl ? (
                    <button
                      type="button"
                      onClick={onRemoveCover}
                      className="h-9 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600"
                    >
                      Remove cover
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Cover Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROFILE_COVER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelectCoverTheme(option.id)}
                    className={`rounded-2xl border p-2 text-left transition ${
                      coverTheme === option.id
                        ? "border-[var(--brand)] bg-[var(--brand)]/10"
                        : "border-[var(--line)] bg-white hover:border-[var(--brand)]/40"
                    }`}
                  >
                    <span
                      className="block aspect-[1.75/1] rounded-xl border border-white/20"
                      style={{ background: option.background }}
                    />
                    <span className="mt-2 block text-xs font-semibold text-slate-700">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Profile Accent
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROFILE_ACCENT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelectProfileAccent(option.id)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      profileAccent === option.id
                        ? "border-[var(--brand)] bg-[var(--brand)]/10"
                        : "border-[var(--line)] bg-white hover:border-[var(--brand)]/40"
                    }`}
                  >
                    <span
                      className="h-8 w-8 rounded-full border border-white/30"
                      style={{
                        background: option.solid,
                        boxShadow: `0 0 0 5px ${option.glow}`,
                      }}
                    />
                    <span className="text-xs font-semibold text-slate-700">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => onChangeFirstName(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                  placeholder="First Name"
                  maxLength={25}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => onChangeLastName(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                  placeholder="Last Name"
                  maxLength={25}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Username</label>
              <div className="flex items-center gap-0">
                <span className="flex h-10 items-center rounded-l-xl border border-r-0 border-[var(--line)] bg-slate-50 px-3 text-sm text-slate-500">
                  @
                </span>
                <input
                  type="text"
                  value={handle}
                  onChange={(event) =>
                    onChangeHandle(event.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                  }
                  className="h-10 flex-1 rounded-r-xl border border-[var(--line)] bg-white px-3 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                  placeholder="username"
                  maxLength={30}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Profile Picture
              </label>
              <div className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <div
                  className="rounded-[1.2rem] p-1.5"
                  style={{
                    background: `linear-gradient(135deg, ${accent.solid}, color-mix(in srgb, ${accent.solid} 45%, white 55%))`,
                    boxShadow: `0 14px 32px -24px ${accent.glow}`,
                  }}
                >
                  <UserAvatar
                    name={previewName}
                    avatarGradient={previewGradient}
                    avatarUrl={avatarUrl || undefined}
                    className="h-16 w-16 text-sm font-bold ring-2 ring-white/80"
                    textClassName="text-sm font-bold text-white"
                    sizes="64px"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                    {avatarUploading ? "Uploading..." : "Choose Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={avatarUploading || saving}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          onUploadAvatar(file);
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={onRemoveAvatar}
                      className="text-left text-[11px] text-red-500 hover:underline"
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Bio</span>
                <span className="text-[10px] text-slate-500">{bio.length}/160</span>
              </label>
              <textarea
                value={bio}
                onChange={(event) => onChangeBio(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm transition focus:border-[var(--brand)] focus:outline-none"
                placeholder="Tell people about yourself..."
                maxLength={160}
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
}
