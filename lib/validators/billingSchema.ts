import { z } from "zod";

export const billingSchema = z.object({
  name: z.string().min(2, "Podaj imię i nazwisko lub nazwę firmy"),
  address: z.string().min(5, "Podaj adres"),
  nip: z
    .string()
    .regex(/^\d{10}$/, "NIP musi mieć 10 cyfr")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Podaj prawidłowy adres email"),
});

export type BillingInput = z.infer<typeof billingSchema>;
