/**
 * Zod schemas for Media (billboards / banners).
 *
 * Used for:
 *   - Server-side validation in API routes (POST/PATCH /api/media)
 *   - Client-side validation in react-hook-form (via @hookform/resolvers/zod)
 */

import { z } from "zod";
import {
  VOIVODESHIPS,
  ROAD_TYPES,
  EXPOSITION_TYPES,
} from "../constants";

export const pricingSchema = z.object({
  month1: z.coerce.number().positive("Cena musi być dodatnia").optional().or(z.literal("")),
  month3: z.coerce.number().positive("Cena musi być dodatnia").optional().or(z.literal("")),
  month6: z.coerce.number().positive("Cena musi być dodatnia").optional().or(z.literal("")),
  month12: z.coerce.number().positive("Cena musi być dodatnia").optional().or(z.literal("")),
  printCost: z.coerce.number().nonnegative().optional().or(z.literal("")),
  installCost: z.coerce.number().nonnegative().optional().or(z.literal("")),
}).refine(
  (data) => data.month1 || data.month3 || data.month6 || data.month12,
  { message: "Podaj cenę dla co najmniej jednego okresu", path: ["month1"] }
);

const gpsSchema = z.object({
  lat: z.coerce.number().min(49, "Szerokość poza Polską").max(55, "Szerokość poza Polską"),
  lng: z.coerce.number().min(14, "Długość poza Polską").max(24.2, "Długość poza Polską"),
});

const sizeSchema = z.object({
  widthCm: z.coerce.number().int().positive("Podaj szerokość w cm"),
  heightCm: z.coerce.number().int().positive("Podaj wysokość w cm"),
});

export const mediaCreateSchema = z.object({
  code: z
    .string()
    .min(1, "Kod tablicy jest wymagany")
    .max(50, "Maksymalnie 50 znaków")
    .trim(),

  address: z.string().min(3, "Podaj adres").max(300).trim(),
  voivodeship: z.enum(VOIVODESHIPS, {
    errorMap: () => ({ message: "Wybierz województwo" }),
  }),
  city: z.string().max(100).trim().optional().or(z.literal("")),
  gps: gpsSchema,
  roadType: z.enum(ROAD_TYPES, {
    errorMap: () => ({ message: "Wybierz rodzaj drogi" }),
  }),

  size: sizeSchema,
  heightFromGroundCm: z.coerce.number().int().nonnegative("Podaj wysokość od ziemi"),
  distanceFromRoadM: z.coerce.number().nonnegative("Podaj odległość od drogi"),

  expositionType: z.enum(EXPOSITION_TYPES, {
    errorMap: () => ({ message: "Wybierz rodzaj ekspozycji" }),
  }),
  illuminated: z.coerce.boolean(),
  requiresLift: z.coerce.boolean(),
  description: z.string().max(2000).trim().optional().or(z.literal("")),

  locationTags: z.array(z.string().max(50)).max(10).optional().default([]),

  nearbyPoi: z.array(z.string().max(80)).optional().default([]),

  pricing: pricingSchema,
});

export type MediaCreateInput = z.infer<typeof mediaCreateSchema>;

export const mediaPatchSchema = mediaCreateSchema.partial();

export type MediaPatchInput = z.infer<typeof mediaPatchSchema>;
