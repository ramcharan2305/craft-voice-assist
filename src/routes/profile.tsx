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
    age: "",
    gender: "",
    state: "",
    district: "",
    city: "",
    product_category: "",
    business_size: "",
  });
  const [busy, setBusy] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrSaved, setQrSaved] = useState<string | null>(null);
  const [paymentQrUrl, setPaymentQrUrl] = useState("");
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
      age: String(profile.age ?? ""),
      gender: profile.gender ?? "",
      state: profile.state ?? "",
      district: profile.district ?? "",
      city: profile.city ?? "",
      product_category: profile.product_category ?? "",
      business_size: profile.business_size ?? "",
    });
    setPaymentQrUrl(profile.payment_qr_url ?? "");
  }, [profile]);

  const uploadPaymentQr = async (file: File | null) => {
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setQrError("Upload a PNG, JPG or WebP QR code image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setQrError("Keep the QR code under 2 MB.");
      return;
    }
    try {
      setQrBusy(true);
      setQrError(null);
      const result = await artisanApi.savePaymentQr(file);
      setPaymentQrUrl(result.payment_qr_url);
      setQrSaved("UPI QR code saved successfully.");
      await refreshProfile();
    } catch (caught) {
      setQrError(caught instanceof Error ? caught.message : "Unable to upload the QR code.");
    } finally {
      setQrBusy(false);
    }
  };

  const removePaymentQr = async () => {
    try {
      setQrBusy(true);
      setQrError(null);
      await artisanApi.removePaymentQr();
      setPaymentQrUrl("");
      setQrSaved("UPI QR code removed.");
      await refreshProfile();
    } catch (caught) {
      setQrError(caught instanceof Error ? caught.message : "Unable to remove the QR code.");
    } finally {
      setQrBusy(false);
    }
  };

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
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        state: form.state,
        district: form.district,
        city: form.city,
        product_category: form.product_category,
        business_size: form.business_size,
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

      <section className="glass mt-5 p-4">
        <h2 className="text-xl">UPI payment QR</h2>
        <p className="mt-1 text-sm text-ink/60">
          Add your QR code once so buyers can pay without repeated uploads.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="flex min-h-14 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-clay/30 bg-white/60 px-4 text-sm font-medium text-clay">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void uploadPaymentQr(event.target.files?.[0] ?? null)}
            />
            {qrBusy ? "Saving QR…" : "Upload QR code"}
          </label>
          {paymentQrUrl ? (
            <button
              type="button"
              onClick={() => void removePaymentQr()}
              className="min-h-14 rounded-2xl bg-white/70 px-4 text-sm font-medium text-destructive"
            >
              Remove
            </button>
          ) : null}
        </div>
        {paymentQrUrl ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <img
              src={paymentQrUrl}
              alt="Merchant UPI QR code preview"
              className="h-32 w-32 rounded-2xl border border-black/5 bg-white object-cover"
            />
            <p className="text-sm text-ink/65">Buyers will see this QR in the payment step.</p>
          </div>
        ) : null}
        {qrError ? <p className="mt-3 text-sm text-destructive">{qrError}</p> : null}
        {qrSaved ? <p className="mt-3 text-sm text-sage">{qrSaved}</p> : null}
      </section>

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
        {(
          [
            { key: "name", label: "Your name" },
            { key: "phone", label: "Phone number" },
            { key: "state", label: "State" },
            { key: "district", label: "District" },
            { key: "city", label: "City or town" },
            { key: "location", label: "Village or local area" },
            { key: "craft_type", label: "Business type" },
            { key: "product_category", label: "Product category" },
          ] as const
        ).map((field) => (
          <label key={field.key} className="block">
            <span className="text-sm font-medium text-ink/60">{field.label}</span>
            <input
              value={form[field.key]}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
              className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
            />
          </label>
        ))}

        <label className="block">
          <span className="text-sm font-medium text-ink/60">Age</span>
          <input
            type="number"
            min={1}
            max={120}
            required
            value={form.age}
            onChange={(event) => setForm({ ...form, age: event.target.value })}
            className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink/60">Gender (optional)</span>
          <select
            value={form.gender}
            onChange={(event) => setForm({ ...form, gender: event.target.value })}
            className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Another identity</option>
          </select>
        </label>

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
          <span className="text-sm font-medium text-ink/60">Business size</span>
          <select
            value={form.business_size}
            onChange={(event) => setForm({ ...form, business_size: event.target.value })}
            className="mt-1 min-h-14 w-full rounded-2xl bg-white/70 px-4 text-base ring-1 ring-black/5 outline-none"
          >
            <option value="">Select business size</option>
            <option value="individual">Individual artisan</option>
            <option value="micro">Micro business</option>
            <option value="small">Small business</option>
            <option value="medium">Medium business</option>
          </select>
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
