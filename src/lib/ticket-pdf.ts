import jsPDF from "jspdf";
import QRCode from "qrcode";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TicketPdfData {
  eventTitle: string;
  eventDate: Date;
  venueName?: string | null;
  ticketTypeName?: string | null;
  holderName?: string | null;
  qrToken: string;
  ticketCode?: string | null;
  organizerName?: string | null;
}

export async function downloadTicketPdf(t: TicketPdfData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 16;

  // Header band
  doc.setFillColor(255, 45, 45);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("UPPLIN", margin, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Ingresso oficial", W - margin, 18, { align: "right" });

  // Event title
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const title = doc.splitTextToSize(t.eventTitle, W - margin * 2);
  doc.text(title, margin, 44);

  let y = 44 + title.length * 8 + 4;

  // Info block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);

  const info: Array<[string, string]> = [
    ["Data", format(t.eventDate, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })],
  ];
  if (t.venueName) info.push(["Local", t.venueName]);
  if (t.ticketTypeName) info.push(["Tipo", t.ticketTypeName]);
  if (t.holderName) info.push(["Titular", t.holderName]);
  if (t.organizerName) info.push(["Organizador", t.organizerName]);

  info.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}: `, margin, y);
    const labelW = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, W - margin * 2 - labelW);
    doc.text(lines, margin + labelW, y);
    y += lines.length * 6 + 2;
  });

  y += 6;

  // QR Code
  const qrDataUrl = await QRCode.toDataURL(t.qrToken, {
    margin: 1,
    width: 600,
    errorCorrectionLevel: "H",
  });
  const qrSize = 90;
  const qrX = (W - qrSize) / 2;
  doc.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);
  y += qrSize + 6;

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("Apresente este QR Code na entrada do evento", W / 2, y, { align: "center" });
  y += 6;
  if (t.ticketCode) {
    doc.setFont("courier", "normal");
    doc.text(`Código: ${t.ticketCode}`, W / 2, y, { align: "center" });
    y += 6;
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Ingresso pessoal e intransferível. Válido apenas para a data/horário indicados.",
    W / 2,
    285,
    { align: "center" }
  );
  doc.text("upplin.com", W / 2, 290, { align: "center" });

  const safeTitle = t.eventTitle.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`ingresso-${safeTitle || "upplin"}.pdf`);
}
