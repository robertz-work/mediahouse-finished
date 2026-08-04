/**
 * POST /api/auth/register
 * Creates a new user with role "client".
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { create, findByEmail } from "@/lib/db/usersRepo";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const registerSchema = z.object({
  email: z.string().email("Podaj prawidłowy adres email"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .max(128),
  name: z
    .string()
    .min(2, "Imię musi mieć co najmniej 2 znaki")
    .max(100),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  nip: z
    .string()
    .regex(/^\d{10}$/, "NIP musi mieć 10 cyfr")
    .optional()
    .or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    // Rate limit: max 5 registrations per IP per 10 minutes.
    const ip = clientIp(request.headers);
    const limit = rateLimit(`register:${ip}`, 5, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Zbyt wiele prób. Spróbuj ponownie później." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
        { status: 400 }
      );
    }


    const existing = await findByEmail(parsed.data.email);
    if (existing) {
      return NextResponse.json(
        { error: "Użytkownik z tym adresem email już istnieje" },
        { status: 409 }
      );
    }

    const user = await create({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      role: "client",
      phone: parsed.data.phone || undefined,
      company: parsed.data.company || undefined,
      nip: parsed.data.nip || undefined,
    });

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Użytkownik z tym adresem email już istnieje" },
        { status: 409 }
      );
    }
    console.error("[register] Unexpected error:", err);
    return NextResponse.json(
      { error: "Błąd serwera" },
      { status: 500 }
    );
  }
}
