"use client";

import UserAvatar from "@/components/user-avatar";

type EditProfileModalProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  firstName: string;
  lastName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  avatarUploading: boolean;
  previewName: string;
  previewGradient: string;
  onClose: () => void;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangeHandle: (value: string) => void;
  onChangeBio: (value: string) => void;
  onUploadAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
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
  avatarUploading,
  previewName,
  previewGradient,
  onClose,
  onChangeFirstName,
  onChangeLastName,
  onChangeHandle,
  onChangeBio,
  onUploadAvatar,
  onRemoveAvatar,
  onSave,
}: EditProfileModalProps) {
  if (!open) {
    return null;
  }

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
        className="motion-surface w-full max-w-md p-5"
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
              Update your profile picture, name, username, and bio.
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

        <div className="mt-4 space-y-4">
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
            <div className="flex items-center gap-4">
              <UserAvatar
                name={previewName}
                avatarGradient={previewGradient}
                avatarUrl={avatarUrl || undefined}
                className="h-16 w-16 text-sm font-bold ring-2 ring-[var(--line)]"
                textClassName="text-sm font-bold text-white"
                sizes="64px"
              />
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
              className="min-h-20 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm transition focus:border-[var(--brand)] focus:outline-none"
              placeholder="Tell people about yourself..."
              maxLength={160}
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
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
        </div>
      </section>
    </div>
  );
}
