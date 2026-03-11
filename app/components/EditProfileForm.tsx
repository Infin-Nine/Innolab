"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

type ProfileType = "innovator" | "sharer";
type ActiveTab = "builder" | "sharer";

type EditProfileValues = {
  profileType: ProfileType;
  displayName: string;
  about: string;
  areasOfWork: string;
};

type EditProfileModalProps = {
  initialValues?: Partial<EditProfileValues>;
  onClose?: () => void;
  onCancel?: () => void;
  onSave?: (values: EditProfileValues) => void;
  saving?: boolean;
  message?: string | null;
};

export default function EditProfileModal({
  initialValues,
  onClose,
  onCancel,
  onSave,
  saving = false,
  message = null,
}: EditProfileModalProps) {
  const initialTab: ActiveTab = initialValues?.profileType === "innovator" ? "builder" : "sharer";
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab ?? "sharer");
  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
  const [about, setAbout] = useState(initialValues?.about ?? "");
  const [areasOfWork, setAreasOfWork] = useState(initialValues?.areasOfWork ?? "");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave?.({
      profileType: activeTab === "builder" ? "innovator" : "sharer",
      displayName: displayName.trim(),
      about: about.trim(),
      areasOfWork: areasOfWork.trim(),
    });
  };

  return (
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-800 bg-[#111827] p-6 text-white shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold sm:text-2xl">Edit Your Profile</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-gray-700 p-2 text-gray-400 transition hover:border-gray-500 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Choose your role</p>
          <div className="grid grid-cols-2 rounded-xl border border-gray-800 bg-[#0b1121] p-1">
            <label
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition ${
                activeTab === "sharer"
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <input
                type="button"
                onClick={() => setActiveTab("sharer")}
                className="sr-only"
              />
              Share Problems
            </label>

            <label
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition ${
                activeTab === "builder"
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <input
                type="button"
                onClick={() => setActiveTab("builder")}
                className="sr-only"
              />
              Build Solutions
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0b1121] px-3 py-2">
          {activeTab === "sharer" ? (
            <span className="rounded-full border border-blue-800 bg-blue-900/50 px-2 py-1 text-xs text-blue-400">
              Problem Sharer
            </span>
          ) : (
            <span className="rounded-full border border-emerald-800 bg-emerald-900/50 px-2 py-1 text-xs text-emerald-400">
              Builder
            </span>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="display-name" className="text-sm font-medium text-white">
              Display Name
            </label>
            <input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={activeTab === "builder" ? "e.g., Rishabh Rajput" : "e.g., Rahul Sahu"}
              className="w-full rounded-xl border border-gray-800 bg-[#0a1020] px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {activeTab === "sharer" ? (
            <div className="space-y-2">
              <label htmlFor="about" className="text-sm font-medium text-white">
                Your Focus Area
              </label>
              <textarea
                id="about"
                value={about}
                onChange={(event) => setAbout(event.target.value)}
                placeholder="e.g., I run a local shop and want to share problems related to inventory, customer udhaar, and logistics. No tech jargon needed."
                className="min-h-32 w-full rounded-xl border border-gray-800 bg-[#0a1020] px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="about" className="text-sm font-medium text-white">
                  About You
                </label>
                <textarea
                  id="about"
                  value={about}
                  onChange={(event) => setAbout(event.target.value)}
                  placeholder="Briefly describe your skill set and background."
                  className="min-h-28 w-full rounded-xl border border-gray-800 bg-[#0a1020] px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="areas-of-work" className="text-sm font-medium text-white">
                  Areas of Work
                </label>
                <input
                  id="areas-of-work"
                  value={areasOfWork}
                  onChange={(event) => setAreasOfWork(event.target.value)}
                  placeholder="How do you usually contribute? (e.g., Next.js, AI Models, Hardware)"
                  className="w-full rounded-xl border border-gray-800 bg-[#0a1020] px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 flex flex-col-reverse gap-3 border-t border-gray-800 bg-[#111827]/95 px-6 pb-1 pt-4 backdrop-blur sm:-mx-8 sm:flex-row sm:justify-end sm:px-8">
          {message ? <p className="text-sm text-rose-300 sm:mr-auto">{message}</p> : null}
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-gray-700 bg-transparent px-5 py-2.5 text-sm font-semibold text-gray-400 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full border border-emerald-500 bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-[#0b1121] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
