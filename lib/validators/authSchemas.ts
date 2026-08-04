import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Podaj prawidłowy adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Imię musi mieć co najmniej 2 znaki").max(100),
    email: z.string().email("Podaj prawidłowy adres email"),
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków").max(128),
    passwordConfirm: z.string(),
    phone: z.string().max(20).optional().or(z.literal("")),
    company: z.string().max(200).optional().or(z.literal("")),
    nip: z.string().regex(/^\d{10}$/, "NIP musi mieć 10 cyfr").optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Hasła nie są identyczne",
    path: ["passwordConfirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
