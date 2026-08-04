"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validators/authSchemas";

export default function RegisterPage() {
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirm: "",
      phone: "",
      company: "",
      nip: "",
    },
  });

  async function onSubmit(data: RegisterInput) {
    setServerError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone || undefined,
          company: data.company || undefined,
          nip: data.nip || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.details?.fieldErrors) {
          const msgs = Object.values(json.details.fieldErrors).flat();
          setServerError((msgs as string[]).join(". "));
        } else {
          setServerError(json.error ?? "Błąd rejestracji");
        }
        return;
      }

      await signIn("credentials", {
        email: data.email,
        password: data.password,
        callbackUrl: "/",
      });
    } catch {
      setServerError("Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Załóż konto
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Dołącz do Media House i zamów kampanię outdoorową
        </p>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <Field label="Imię i nazwisko *" error={errors.name?.message}>
            <input
              {...register("name")}
              type="text"
              autoComplete="name"
              className={inputCx(!!errors.name)}
            />
          </Field>


          <Field label="Email *" error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="jan@firma.pl"
              className={inputCx(!!errors.email)}
            />
          </Field>


          <Field label="Hasło * (min. 8 znaków)" error={errors.password?.message}>
            <input
              {...register("password")}
              type="password"
              autoComplete="new-password"
              className={inputCx(!!errors.password)}
            />
          </Field>


          <Field label="Powtórz hasło *" error={errors.passwordConfirm?.message}>
            <input
              {...register("passwordConfirm")}
              type="password"
              autoComplete="new-password"
              className={inputCx(!!errors.passwordConfirm)}
            />
          </Field>


          <Field label="Telefon" error={errors.phone?.message}>
            <input
              {...register("phone")}
              type="tel"
              autoComplete="tel"
              placeholder="+48 123 456 789"
              className={inputCx(!!errors.phone)}
            />
          </Field>


          <Field label="Firma" error={errors.company?.message}>
            <input
              {...register("company")}
              type="text"
              autoComplete="organization"
              className={inputCx(!!errors.company)}
            />
          </Field>


          <Field label="NIP" error={errors.nip?.message}>
            <input
              {...register("nip")}
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="0000000000"
              className={inputCx(!!errors.nip)}
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? "Rejestracja…" : "Zarejestruj się"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Masz już konto?{" "}
          <Link
            href="/login"
            className="font-medium text-pink-600 hover:underline"
          >
            Zaloguj się
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inputCx(hasError: boolean) {
  return `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-slate-300 focus:border-pink-500 focus:ring-pink-200"
  }`;
}
