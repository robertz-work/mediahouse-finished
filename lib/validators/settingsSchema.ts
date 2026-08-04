import { z } from "zod";

export const settingsSchema = z.object({
  holdTimeoutMinutes: z
    .number()
    .min(1, "Minimum 1 minuta")
    .max(120, "Maksimum 120 minut"),
  contactEmail: z.string().email("Podaj prawidłowy adres email"),
  contactPhone: z.string().max(20).optional().or(z.literal("")),
  requireOrderApproval: z.boolean(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
