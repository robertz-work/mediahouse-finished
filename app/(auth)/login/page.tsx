"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/authSchemas";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    setServerError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setServerError("Nieprawidłowy email lub hasło");
      } else if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setServerError("Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Zaloguj się</h1>
        <p className="mb-6 text-sm text-slate-500">
          Witaj z powrotem w Media House
        </p>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="jan@firma.pl"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                errors.email
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:border-pink-500 focus:ring-pink-200"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Hasło
            </label>
            <input
              id="password"
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
                errors.password
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:border-pink-500 focus:ring-pink-200"
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Nie masz konta?{" "}
          <Link
            href="/register"
            className="font-medium text-pink-600 hover:underline"
          >
            Zarejestruj się
          </Link>
        </p>
      </div>
    </main>
  );
}
