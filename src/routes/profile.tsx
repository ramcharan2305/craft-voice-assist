import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { artisanApi } from "@/api/artisanApi";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile — H Connect" },
      {
        name: "description",
        content: "Your name, craft, place and experience, saved in the database.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, profileStatus, profileError, refreshProfile, say } = useStore();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    language: "en",
    location: "",
    craft_type: "",
    experience_years: "0",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name,
      phone: profile.phone,
      language: profile.language,
      location: profile.location,
      craft_type: profile.craft_type,
      experience_years: String(profile.experience_years ?? 0),
    });
  }, [profile]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);

    try {
      await artisanApi.updateProfile({
        name: form.name,
        phone: form.phone,
        language: form.language,
        location: form.location,
        craft_type: form.craft_type,
        experience_years: Number(form.experience_years) || 0,
      });
      await refreshProfile();
      setSaved(true);
      say("Your profile has been saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <h1 className="text-3xl">My profile</h1>
      <p className="mt-2 text-base text-ink/60">Your details are saved in the database.</p>

      {profile?.verification_status ? (
        <section className="glass mt-5 p-4" aria-label="Artisan verification status">
          <p className="text-sm font-semibold capitalize text-clay">
            Verification: {profile.verification_status.replace("_", " ")}
          </p>
          {profile.verification_feedback ? (
            <p className="mt-1 text-sm text-ink/65">{profile.verification_feedback}</p>
          ) : null}
        </section>
      ) : null}

      {profileStatus === "loading" ? (
        <p className="mt-6 flex items-center gap-2 text-base text-ink/60">
          <Loader2 className="size-5 animate-spin" /> Loading your profile…
        </p>
      ) : null}

      {profileStatus === "error" ? (
        <p className="mt-6 text-base text-destructive">
          {profileError ?? "Unable to load your profile."}
        </p>
      ) : null}

      <form onSubmit={save} className="mt-6 space-y-4">
        {[
          { key: "name", label: "Your name" },
          { key: "phone", label: "Phone number" },
          { key: "location", label: "Village or town" },
          { key: "craft_type", label: "What do you make?" },
        ].map((field) => (
          <label key={field.key} className="block">
            <span className="text-sm font-medium text-ink/60">{field.label}</span>
            <input
              value={form[field.key as keyof typeof form]}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
              className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
            />
          </label>
        ))}

        <label className="block">
          <span className="text-sm font-medium text-ink/60">Years of experience</span>
          <input
            type="number"
            min={0}
            value={form.experience_years}
            onChange={(event) => setForm({ ...form, experience_years: event.target.value })}
            className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink/60">Language</span>
          <select
            value={form.language}
            onChange={(event) => setForm({ ...form, language: event.target.value })}
            className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
          >
            <option value="en">English</option>
            <option value="te">Telugu</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="kn">Kannada</option>
            <option value="mr">Marathi</option>
          </select>
        </label>

        {error ? <p className="text-base text-destructive">{error}</p> : null}
        {saved ? <p className="text-base text-sage">Profile saved successfully.</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="min-h-16 w-full rounded-2xl bg-clay text-lg font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save my profile"}
        </button>
      </form>
    </AppShell>
  );
}
