import { notFound } from "next/navigation";
import type { Metadata } from "next";
import * as mediaRepo from "@/lib/db/mediaRepo";
import {
  VOIVODESHIP_LABELS,
  ROAD_TYPE_LABELS,
  PERIOD_LABELS,
  PERIOD_PRICE_FIELD,
  PERIOD_DAYS,
} from "@/lib/constants";
import MediaDetailClient from "./MediaDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const media = await mediaRepo.findById(id);
  if (!media || media.status !== "published") {
    return { title: "Nośnik nie znaleziony | Media House" };
  }

  return {
    title: `${media.code} — ${media.address} | Media House`,
    description: `Nośnik reklamowy ${media.code} w lokalizacji ${media.address}, ${VOIVODESHIP_LABELS[media.voivodeship]}. ${media.size.widthCm}×${media.size.heightCm} cm, ${media.expositionType}.`,
  };
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const media = await mediaRepo.findById(id);

  if (!media || media.status !== "published") {
    notFound();
  }


  const pricingRows = PERIOD_DAYS.map((days) => {
    const field = PERIOD_PRICE_FIELD[days];
    const price = media.pricing[field];
    return {
      label: PERIOD_LABELS[days],
      price,
      days,
    };
  }).filter((r) => r.price !== undefined);

  return (
    <MediaDetailClient
      media={media}
      pricingRows={pricingRows}
      voivodeshipLabel={VOIVODESHIP_LABELS[media.voivodeship]}
      roadTypeLabel={ROAD_TYPE_LABELS[media.roadType]}
    />
  );
}
