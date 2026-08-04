/**
 * Proforma invoice PDF generator.
 *
 * Uses pdfkit with embedded Roboto font for Polish character support (ą, ć, ę, ł, ń, ó, ś, ź, ż).
 * Generated PDF is uploaded to S3 (same bucket as media photos) under `invoices/{campaignId}/`.
 *
 * Font files required in `public/fonts/`:
 *   - Roboto-Regular.ttf
 *   - Roboto-Bold.ttf
 *
 */

import PDFDocument from "pdfkit";
import path from "path";
import { getStorage } from "@/lib/storage";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import * as mediaRepo from "@/lib/db/mediaRepo";
import * as invoiceCounterRepo from "@/lib/db/invoiceCounterRepo";
import * as settingsRepo from "@/lib/db/settingsRepo";
import { VAT_RATE, PERIOD_LABELS, type PeriodDays } from "@/lib/constants";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_REGULAR = path.join(FONT_DIR, "Roboto-Regular.ttf");
const FONT_BOLD = path.join(FONT_DIR, "Roboto-Bold.ttf");

interface InvoiceItem {
  lp: number;
  name: string;
  quantity: number;
  netPrice: number;
  vatRate: number;
  vatAmount: number;
  grossPrice: number;
}

export interface GenerateResult {
  invoiceNumber: string;
  invoiceUrl: string;
  pdfKey: string;
}


export async function generateProforma(campaignId: string): Promise<GenerateResult> {
  const campaign = await campaignsRepo.findById(campaignId);
  if (!campaign) throw new Error("Kampania nie istnieje");

  const settings = await settingsRepo.load();

  const now = new Date();
  const invoiceNumber = await invoiceCounterRepo.getNextNumber(
    now.getFullYear(),
    now.getMonth() + 1
  );

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 14);


  const mediaDetails = new Map<string, { code: string; address: string }>();
  for (const item of campaign.items) {
    if (!mediaDetails.has(item.mediaId)) {
      const media = await mediaRepo.findById(item.mediaId);
      if (media) {
        mediaDetails.set(item.mediaId, { code: media.code, address: media.address });
      }
    }
  }

  const invoiceItems: InvoiceItem[] = campaign.items.map((item, idx) => {
    const media = mediaDetails.get(item.mediaId);
    const periodLabel = PERIOD_LABELS[item.periodDays as PeriodDays] ?? `${item.periodDays} dni`;
    const name = media
      ? `${media.code} — ${media.address} (${periodLabel})`
      : `Nośnik ${item.mediaId.slice(0, 8)} (${periodLabel})`;

    const netPrice = item.priceSnapshot.total;
    const vatAmount = Math.round(netPrice * VAT_RATE * 100) / 100;
    const grossPrice = Math.round((netPrice + vatAmount) * 100) / 100;

    return {
      lp: idx + 1,
      name,
      quantity: 1,
      netPrice,
      vatRate: VAT_RATE * 100,
      vatAmount,
      grossPrice,
    };
  });

  const totalNet = campaign.totals.grandTotal;
  const totalVat = Math.round(totalNet * VAT_RATE * 100) / 100;
  const totalGross = Math.round((totalNet + totalVat) * 100) / 100;

  const pdfBuffer = await buildPdf({
    invoiceNumber,
    issueDate: now,
    dueDate,
    seller: {
      name: settings.companyName || "Media House Sp. z o.o.",
      address: settings.companyAddress || "",
      nip: settings.companyNip || "",
      bankAccount: settings.companyBankAccount || "",
      bankName: settings.companyBankName || "",
    },
    buyer: {
      name: campaign.billing.name,
      address: campaign.billing.address,
      nip: campaign.billing.nip,
      email: campaign.billing.email,
    },
    items: invoiceItems,
    totalNet,
    totalVat,
    totalGross,
  });

  const storage = getStorage();
  const { url, key } = await storage.upload(
    {
      data: pdfBuffer,
      filename: `${invoiceNumber.replace(/\//g, "-")}.pdf`,
      contentType: "application/pdf",
    },
    `invoices/${campaignId}`
  );

  await campaignsRepo.setInvoice(campaignId, url, invoiceNumber);

  return { invoiceNumber, invoiceUrl: url, pdfKey: key };
}

interface PdfData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  seller: {
    name: string;
    address: string;
    nip: string;
    bankAccount: string;
    bankName: string;
  };
  buyer: {
    name: string;
    address: string;
    nip?: string;
    email: string;
  };
  items: InvoiceItem[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildPdf(data: PdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    doc.registerFont("Roboto", FONT_REGULAR);
    doc.registerFont("Roboto-Bold", FONT_BOLD);
    doc.font("Roboto");

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .font("Roboto-Bold")
      .fontSize(18)
      .fillColor("#1e293b")
      .text("FAKTURA PRO FORMA", { align: "center" });

    doc
      .font("Roboto")
      .fontSize(10)
      .fillColor("#64748b")
      .text(`Nr: ${data.invoiceNumber}`, { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(9)
      .fillColor("#334155")
      .text(`Data wystawienia: ${formatDate(data.issueDate)}`, { align: "right" })
      .text(`Termin płatności: ${formatDate(data.dueDate)}`, { align: "right" })
      .moveDown(1.5);

    const boxY = doc.y;
    const colWidth = (pageWidth - 30) / 2;

    doc
      .font("Roboto-Bold")
      .fontSize(9)
      .fillColor("#64748b")
      .text("SPRZEDAWCA", doc.page.margins.left, boxY);
    doc
      .font("Roboto")
      .fontSize(10)
      .fillColor("#1e293b")
      .text(data.seller.name, doc.page.margins.left, doc.y + 4, { width: colWidth });
    if (data.seller.address) {
      doc.text(data.seller.address, { width: colWidth });
    }
    if (data.seller.nip) {
      doc.text(`NIP: ${data.seller.nip}`, { width: colWidth });
    }
    const sellerEndY = doc.y;

    const rightX = doc.page.margins.left + colWidth + 30;
    doc
      .font("Roboto-Bold")
      .fontSize(9)
      .fillColor("#64748b")
      .text("NABYWCA", rightX, boxY);
    doc
      .font("Roboto")
      .fontSize(10)
      .fillColor("#1e293b")
      .text(data.buyer.name, rightX, doc.y + 4, { width: colWidth });
    if (data.buyer.address) {
      doc.text(data.buyer.address, rightX, doc.y, { width: colWidth });
    }
    if (data.buyer.nip) {
      doc.text(`NIP: ${data.buyer.nip}`, rightX, doc.y, { width: colWidth });
    }
    doc.text(data.buyer.email, rightX, doc.y, { width: colWidth });
    const buyerEndY = doc.y;

    doc.y = Math.max(sellerEndY, buyerEndY) + 20;

    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor("#e2e8f0")
      .lineWidth(1)
      .stroke();
    doc.y += 15;

    const tableX = doc.page.margins.left;
    const cols = {
      lp: 30,
      name: pageWidth - 30 - 60 - 70 - 50 - 60 - 70,
      qty: 60,
      netPrice: 70,
      vat: 50,
      vatAmt: 60,
      gross: 70,
    };

    function drawRow(
      y: number,
      cells: { x: number; w: number; text: string; align?: "left" | "center" | "right" }[]
    ) {
      for (const cell of cells) {
        doc.text(cell.text, cell.x, y, {
          width: cell.w,
          align: cell.align ?? "left",
          lineBreak: false,
        });
      }
    }

    const colX = {
      lp: tableX,
      name: tableX + cols.lp,
      qty: tableX + cols.lp + cols.name,
      netPrice: tableX + cols.lp + cols.name + cols.qty,
      vat: tableX + cols.lp + cols.name + cols.qty + cols.netPrice,
      vatAmt: tableX + cols.lp + cols.name + cols.qty + cols.netPrice + cols.vat,
      gross: tableX + cols.lp + cols.name + cols.qty + cols.netPrice + cols.vat + cols.vatAmt,
    };

    doc.font("Roboto-Bold").fontSize(8).fillColor("#64748b");
    const headerY = doc.y;
    drawRow(headerY, [
      { x: colX.lp, w: cols.lp, text: "Lp.", align: "center" },
      { x: colX.name, w: cols.name, text: "Nazwa" },
      { x: colX.qty, w: cols.qty, text: "Ilość", align: "center" },
      { x: colX.netPrice, w: cols.netPrice, text: "Cena netto", align: "right" },
      { x: colX.vat, w: cols.vat, text: "VAT %", align: "center" },
      { x: colX.vatAmt, w: cols.vatAmt, text: "Kwota VAT", align: "right" },
      { x: colX.gross, w: cols.gross, text: "Brutto", align: "right" },
    ]);

    doc.y = headerY + 14;

    doc
      .moveTo(tableX, doc.y)
      .lineTo(tableX + pageWidth, doc.y)
      .strokeColor("#cbd5e1")
      .lineWidth(0.5)
      .stroke();
    doc.y += 6;

    doc.font("Roboto").fontSize(8).fillColor("#334155");

    for (const item of data.items) {
      const rowY = doc.y;

      const nameHeight = doc.heightOfString(item.name, { width: cols.name - 4 });

      drawRow(rowY, [
        { x: colX.lp, w: cols.lp, text: String(item.lp), align: "center" },
        { x: colX.qty, w: cols.qty, text: String(item.quantity), align: "center" },
        { x: colX.netPrice, w: cols.netPrice, text: `${formatCurrency(item.netPrice)} zł`, align: "right" },
        { x: colX.vat, w: cols.vat, text: `${item.vatRate}%`, align: "center" },
        { x: colX.vatAmt, w: cols.vatAmt, text: `${formatCurrency(item.vatAmount)} zł`, align: "right" },
        { x: colX.gross, w: cols.gross, text: `${formatCurrency(item.grossPrice)} zł`, align: "right" },
      ]);

      doc.text(item.name, colX.name, rowY, { width: cols.name - 4 });

      doc.y = rowY + Math.max(nameHeight, 14) + 4;

      doc
        .moveTo(tableX, doc.y)
        .lineTo(tableX + pageWidth, doc.y)
        .strokeColor("#f1f5f9")
        .lineWidth(0.3)
        .stroke();
      doc.y += 4;
    }

    doc.y += 10;

    const totalsX = tableX + pageWidth - 200;
    const valX = totalsX + 110;
    const tw = 90;

    doc.font("Roboto").fontSize(9).fillColor("#334155");
    let totY = doc.y;
    drawRow(totY, [
      { x: totalsX, w: 110, text: "Razem netto:" },
      { x: valX, w: tw, text: `${formatCurrency(data.totalNet)} zł`, align: "right" },
    ]);
    totY += 16;

    drawRow(totY, [
      { x: totalsX, w: 110, text: "VAT (23%):" },
      { x: valX, w: tw, text: `${formatCurrency(data.totalVat)} zł`, align: "right" },
    ]);
    totY += 16;

    doc.font("Roboto-Bold").fontSize(11).fillColor("#1e293b");
    drawRow(totY, [
      { x: totalsX, w: 110, text: "Razem brutto:" },
      { x: valX, w: tw, text: `${formatCurrency(data.totalGross)} zł`, align: "right" },
    ]);
    doc.y = totY;

    doc.y += 30;

    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor("#e2e8f0")
      .lineWidth(1)
      .stroke();
    doc.y += 15;

    doc.font("Roboto-Bold").fontSize(9).fillColor("#64748b").text("DANE DO PRZELEWU");
    doc.y += 6;

    doc.font("Roboto").fontSize(9).fillColor("#334155");
    if (data.seller.bankName) {
      doc.text(`Bank: ${data.seller.bankName}`);
    }
    if (data.seller.bankAccount) {
      doc.text(`Nr konta: ${data.seller.bankAccount}`);
    }
    doc.text(`Tytuł przelewu: ${data.invoiceNumber}`);
    doc.text(`Kwota: ${formatCurrency(data.totalGross)} zł`);

    doc.y += 20;

    doc
      .font("Roboto")
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(
        "Dokument nie wymaga podpisu ani pieczątki. Faktura pro forma nie jest dokumentem księgowym.",
        doc.page.margins.left,
        doc.y,
        { align: "center", width: pageWidth }
      );

    doc.end();
  });
}
