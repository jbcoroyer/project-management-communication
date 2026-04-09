"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  User,
  UserRound,
} from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { ServiceCommunicationIdenaHeading } from "../../components/IdenaBrand";

type AuthMode = "signin" | "signup";
type SignupStep = 1 | 2;

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Email ou mot de passe incorrect.";
  if (message.includes("Email not confirmed"))
    return "Votre email n'est pas encore confirmé. Vérifiez votre boite mail.";
  if (message.includes("User already registered"))
    return "Un compte avec cet email existe déjà. Connectez-vous.";
  if (message.includes("Password should be at least"))
    return "Le mot de passe doit contenir au moins 6 caractères.";
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<SignupStep>(1);

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign-up fields – étape 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Sign-up fields – étape 2
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ── Changement de photo ── */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* ── Étape 1 → 2 ── */
  const goToStep2 = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Veuillez renseigner votre prénom et nom.");
      return;
    }
    setError(null);
    setStep(2);
  };

  /* ── Connexion ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(translateAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  /* ── Inscription ── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail.trim() || !signupPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setError(null);
    setLoading(true);

    const displayName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: {
            display_name: displayName,
            job_title: jobTitle.trim() || null,
          },
        },
      });
      if (signUpError) throw signUpError;

      // Si session immédiate (email confirmation désactivé), on upload la photo
      if (data.session && photoFile) {
        const ext = photoFile.name.split(".").pop() ?? "jpg";
        // On récupère le member_id depuis le profil fraîchement créé
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("team_member_id")
          .eq("id", data.session.user.id)
          .maybeSingle();

        if (profileRow?.team_member_id) {
          const path = `${String(profileRow.team_member_id)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("member-avatars")
            .upload(path, photoFile, { upsert: true });
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage
              .from("member-avatars")
              .getPublicUrl(path);
            await supabase
              .from("team_members")
              .update({ avatar_url: publicUrl })
              .eq("id", String(profileRow.team_member_id));
          }
        }
        router.push("/");
        router.refresh();
        return;
      }

      // Email confirmation requis
      setSuccess(
        "Compte créé ! Vérifiez votre boite mail pour confirmer votre adresse, puis connectez-vous.",
      );
      setMode("signin");
      setStep(1);
    } catch (err: unknown) {
      setError(translateAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const resetMode = (m: AuthMode) => {
    setMode(m);
    setStep(1);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md">
        <ServiceCommunicationIdenaHeading size="login">
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            {mode === "signin"
              ? "Connectez-vous à votre espace Service Communication IDENA."
              : step === 1
                ? "Parlez-nous de vous."
                : "Créez vos identifiants de connexion."}
          </p>
        </ServiceCommunicationIdenaHeading>

        <div className="ui-surface rounded-2xl p-6">
          {/* Tabs */}
          <div className="mb-6 flex overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
            {(["signin", "signup"] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => resetMode(m)}
                className={[
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition",
                  mode === m
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                    : "text-[color:var(--foreground)]/60 hover:text-[var(--foreground)]",
                ].join(" ")}
              >
                {m === "signin" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          {/* ── CONNEXION ── */}
          {mode === "signin" && (
            <form onSubmit={(e) => void handleSignIn(e)} className="space-y-4">
              <Field
                id="email"
                label="Adresse email"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="vous@example.com"
              />
              <PasswordField
                id="signin-password"
                label="Mot de passe"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                autoComplete="current-password"
              />
              <AlertBox error={error} success={success} />
              <SubmitBtn loading={loading} label="Se connecter" />
            </form>
          )}

          {/* ── INSCRIPTION – Étape 1 : Identité ── */}
          {mode === "signup" && step === 1 && (
            <div className="space-y-5">
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-[var(--line)]/90 bg-[var(--surface-soft)] transition hover:border-[var(--line-strong)]"
                  title="Ajouter une photo de profil"
                >
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Aperçu"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1">
                      <Camera className="h-6 w-6 text-[color:var(--foreground)]/35 group-hover:text-[color:var(--foreground)]/50" />
                      <span className="text-[10px] font-semibold text-[color:var(--foreground)]/40">
                        Photo
                      </span>
                    </div>
                  )}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoChange}
                />
                <p className="text-[11px] text-[color:var(--foreground)]/45">
                  Optionnel — modifiable plus tard
                </p>
              </div>

              {/* Nom & Prénom */}
              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="firstName"
                  label="Prénom"
                  icon={<User className="h-4 w-4" />}
                  type="text"
                  value={firstName}
                  onChange={setFirstName}
                  autoComplete="given-name"
                  placeholder="Prénom Nom"
                />
                <Field
                  id="lastName"
                  label="Nom"
                  icon={<UserRound className="h-4 w-4" />}
                  type="text"
                  value={lastName}
                  onChange={setLastName}
                  autoComplete="family-name"
                  placeholder="Coroyer"
                />
              </div>

              {/* Poste */}
              <Field
                id="jobTitle"
                label="Poste"
                icon={<Briefcase className="h-4 w-4" />}
                type="text"
                value={jobTitle}
                onChange={setJobTitle}
                autoComplete="organization-title"
                placeholder="ex : Responsable Communication"
              />

              <AlertBox error={error} />

              <button
                type="button"
                onClick={goToStep2}
                className="ui-transition flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[#fffdf9] shadow-[0_14px_30px_rgba(20,17,13,0.18)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
              >
                Continuer
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── INSCRIPTION – Étape 2 : Identifiants ── */}
          {mode === "signup" && step === 2 && (
            <form onSubmit={(e) => void handleSignUp(e)} className="space-y-4">
              {/* Récapitulatif identité */}
              <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2">
                {photoPreview ? (
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                    <Image src={photoPreview} alt="Photo" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)]">
                    <User className="h-4 w-4 text-[color:var(--foreground)]/75" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {firstName} {lastName}
                  </p>
                  {jobTitle && (
                    <p className="text-xs text-[color:var(--foreground)]/55">{jobTitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="ui-transition shrink-0 rounded-lg border border-[var(--line)] px-2 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)]"
                >
                  <ArrowLeft className="h-3 w-3" />
                </button>
              </div>

              <Field
                id="signup-email"
                label="Adresse email"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                value={signupEmail}
                onChange={setSignupEmail}
                autoComplete="email"
                placeholder="vous@example.com"
              />
              <PasswordField
                id="signup-password"
                label="Mot de passe"
                value={signupPassword}
                onChange={setSignupPassword}
                show={showSignupPassword}
                onToggleShow={() => setShowSignupPassword((v) => !v)}
                autoComplete="new-password"
                hint="Minimum 6 caractères."
              />

              <AlertBox error={error} success={success} />
              <SubmitBtn loading={loading} label="Créer mon compte" />
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-[color:var(--foreground)]/45">
          Outil interne — IDENA · Service Communication
        </p>
      </div>
    </div>
  );
}

/* ─── Composants utilitaires ─── */

function Field(props: {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={props.id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55"
      >
        {props.label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground)]/40">
          {props.icon}
        </span>
        <input
          id={props.id}
          type={props.type}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          autoComplete={props.autoComplete}
          placeholder={props.placeholder}
          className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/35 focus:outline-none"
        />
      </div>
    </div>
  );
}

function PasswordField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={props.id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55"
      >
        {props.label}
      </label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground)]/40" />
        <input
          id={props.id}
          type={props.show ? "text" : "password"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          autoComplete={props.autoComplete}
          placeholder="••••••••"
          className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-2.5 pl-10 pr-10 text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/35 focus:outline-none"
        />
        <button
          type="button"
          onClick={props.onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground)]/40 hover:text-[color:var(--foreground)]/70"
          aria-label={props.show ? "Masquer" : "Afficher"}
        >
          {props.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {props.hint && (
        <p className="mt-1.5 text-[11px] text-[color:var(--foreground)]/50">{props.hint}</p>
      )}
    </div>
  );
}

function AlertBox(props: { error?: string | null; success?: string | null }) {
  if (props.error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {props.error}
      </div>
    );
  }
  if (props.success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {props.success}
      </div>
    );
  }
  return null;
}

function SubmitBtn(props: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={props.loading}
      className="ui-transition w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[#fffdf9] shadow-[0_14px_30px_rgba(20,17,13,0.18)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:opacity-60"
    >
      {props.loading ? "Chargement…" : props.label}
    </button>
  );
}
