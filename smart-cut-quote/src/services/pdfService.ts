/**
 * PDF Service
 * Generate and save PDF quotes with professional layout
 */

import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { DxfFile, QuoteSummary } from '../types/quote';
import { getCompanyInfo, getAppSettings } from './database';
import { Client as DbClient, CompanyInfo } from './database/types';

// VIETNAMESE FONT SUPPORT:
import { robotoFont, fontName, fontStyle } from '../assets/fonts/roboto-font';

// Colors
const PRIMARY_BLUE = '#4A90D9';

export interface PdfGenerationOptions {
  files: DxfFile[];
  summary: QuoteSummary;
  quoteNumber?: string;
  client?: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
  };
  clientDetails?: DbClient;
  validUntil?: Date;
  notes?: string;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Format currency in Vietnamese style (no decimals, space-separated thousands)
 * Example: 1250370 -> "1 250 370"
 */
function formatVND(amount: number): string {
  const rounded = Math.round(amount);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Generate and save PDF quote
 */
export async function generateAndSavePdf(options: PdfGenerationOptions): Promise<boolean> {
  const { files, summary, quoteNumber, client, clientDetails, validUntil, notes } = options;

  try {
    // Load company info and settings
    const companyInfo = await getCompanyInfo();
    const settings = await getAppSettings();

    // Initialize PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: false, // Disable compression for custom font support
    });

    // VIETNAMESE FONT SUPPORT:
    // Add custom font to jsPDF
    doc.addFileToVFS(`${fontName}.ttf`, robotoFont);
    doc.addFont(`${fontName}.ttf`, fontName, fontStyle);
    doc.setFont(fontName);

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // ========================================
    // HEADER SECTION
    // ========================================
    y = drawHeader(doc, companyInfo, quoteNumber, validUntil, settings.default_validity_days, margin, y, contentWidth);

    // ========================================
    // BILL TO / SHIP TO SECTION
    // ========================================
    y = drawBillToShipTo(doc, client, clientDetails, margin, y, contentWidth);

    // ========================================
    // PARTS TABLE
    // ========================================
    y = drawPartsTable(doc, files, margin, y, contentWidth, pageHeight);

    // ========================================
    // FOOTER SECTION (Shipping, Note, Summary)
    // ========================================
    y = drawFooter(doc, summary, companyInfo, notes, margin, y, contentWidth, pageHeight);

    // ========================================
    // SAVE PDF
    // ========================================
    const pdfBlob = doc.output('blob');
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfUint8Array = new Uint8Array(pdfArrayBuffer);

    // Generate filename
    const filename = quoteNumber
      ? `${quoteNumber}.pdf`
      : `quote_${new Date().toISOString().split('T')[0]}.pdf`;

    // Open save dialog
    const filePath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: filename,
    });

    if (!filePath) {
      return false;
    }

    await writeFile(filePath, pdfUint8Array);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Draw header section with company info and quote details
 */
function drawHeader(
  doc: jsPDF,
  companyInfo: CompanyInfo | null,
  quoteNumber: string | undefined,
  validUntil: Date | undefined,
  defaultValidityDays: number,
  margin: number,
  y: number,
  contentWidth: number
): number {
  const blue = hexToRgb(PRIMARY_BLUE);

  // Company name (large, blue)
  doc.setFontSize(20);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(blue.r, blue.g, blue.b);
  doc.text(companyInfo?.company_name || 'Company Name', margin, y);

  // Company address and contact (left side)
  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100, 100, 100);

  let leftY = y + 8;
  if (companyInfo?.address_line1) {
    doc.text(companyInfo.address_line1, margin, leftY);
    leftY += 4;
  }
  if (companyInfo?.address_line2 || (companyInfo?.city && companyInfo?.state)) {
    const addr2 = companyInfo.address_line2 || `${companyInfo.city || ''} ${companyInfo.state || ''} ${companyInfo.zip || ''}`.trim();
    doc.text(addr2, margin, leftY);
    leftY += 4;
  }
  if (companyInfo?.phone) {
    doc.text(`Phone: ${companyInfo.phone}`, margin, leftY);
    leftY += 4;
  }
  if (companyInfo?.email) {
    doc.text(`Email: ${companyInfo.email}`, margin, leftY);
    leftY += 4;
  }
  if (companyInfo?.website) {
    doc.text(companyInfo.website, margin, leftY);
    leftY += 4;
  }

  // Quote details (right side)
  const rightX = margin + contentWidth - 50;
  let rightY = y;

  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(50, 50, 50);

  if (quoteNumber) {
    doc.text('Số báo giá:', rightX, rightY);
    doc.setFont(fontName, 'normal');
    doc.text(quoteNumber, rightX + 28, rightY);
    rightY += 5;
    doc.setFont(fontName, 'normal');
  }

  doc.text('Ngày:', rightX, rightY);
  doc.setFont(fontName, 'normal');
  doc.text(new Date().toLocaleDateString('vi-VN'), rightX + 28, rightY);
  rightY += 5;

  doc.setFont(fontName, 'normal');
  doc.text('Hiệu lực đến:', rightX, rightY);
  doc.setFont(fontName, 'normal');
  const validDate = validUntil || new Date(Date.now() + defaultValidityDays * 24 * 60 * 60 * 1000);
  doc.text(validDate.toLocaleDateString('vi-VN'), rightX + 28, rightY);

  return Math.max(leftY, rightY) + 10;
}

/**
 * Draw Bill To / Ship To section
 */
function drawBillToShipTo(
  doc: jsPDF,
  client: PdfGenerationOptions['client'],
  clientDetails: DbClient | undefined,
  margin: number,
  y: number,
  contentWidth: number
): number {
  const blue = hexToRgb(PRIMARY_BLUE);
  const colWidth = contentWidth / 2 - 5;

  // Bill To header
  doc.setFillColor(blue.r, blue.g, blue.b);
  doc.rect(margin, y, colWidth, 6, 'F');
  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Thông tin khách hàng', margin + 3, y + 4.5);

  // Ship To header
  const shipX = margin + colWidth + 10;
  doc.rect(shipX, y, colWidth, 6, 'F');
  doc.text('Địa chỉ giao hàng', shipX + 3, y + 4.5);

  y += 10;

  // Bill To content
  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(50, 50, 50);

  let billY = y;
  if (client?.name || clientDetails?.company_name) {
    doc.setFont(fontName, 'normal');
    doc.text(client?.name || clientDetails?.company_name || '', margin, billY);
    doc.setFont(fontName, 'normal');
    billY += 4;
  }
  if (clientDetails?.billing_address_line1) {
    doc.text(clientDetails.billing_address_line1, margin, billY);
    billY += 4;
  }
  if (clientDetails?.billing_city || clientDetails?.billing_state) {
    const cityState = `${clientDetails.billing_city || ''} ${clientDetails.billing_state || ''} ${clientDetails.billing_zip || ''}`.trim();
    doc.text(cityState, margin, billY);
    billY += 4;
  }
  if (client?.phone || clientDetails?.phone) {
    doc.text(`Phone: ${client?.phone || clientDetails?.phone}`, margin, billY);
    billY += 4;
  }
  if (client?.email || clientDetails?.email) {
    doc.text(client?.email || clientDetails?.email || '', margin, billY);
    billY += 4;
  }

  // Ship To content
  let shipY = y;
  if (client?.name || clientDetails?.company_name) {
    doc.setFont(fontName, 'normal');
    doc.text(client?.name || clientDetails?.company_name || '', shipX, shipY);
    doc.setFont(fontName, 'normal');
    shipY += 4;
  }
  if (clientDetails?.shipping_address_line1) {
    doc.text(clientDetails.shipping_address_line1, shipX, shipY);
    shipY += 4;
  } else if (clientDetails?.billing_address_line1) {
    doc.text(clientDetails.billing_address_line1, shipX, shipY);
    shipY += 4;
  }
  if (clientDetails?.shipping_city || clientDetails?.shipping_state) {
    const cityState = `${clientDetails.shipping_city || ''} ${clientDetails.shipping_state || ''} ${clientDetails.shipping_zip || ''}`.trim();
    doc.text(cityState, shipX, shipY);
    shipY += 4;
  } else if (clientDetails?.billing_city || clientDetails?.billing_state) {
    const cityState = `${clientDetails.billing_city || ''} ${clientDetails.billing_state || ''} ${clientDetails.billing_zip || ''}`.trim();
    doc.text(cityState, shipX, shipY);
    shipY += 4;
  }

  return Math.max(billY, shipY) + 8;
}

/**
 * Draw parts table with thumbnails and operations
 */
function drawPartsTable(
  doc: jsPDF,
  files: DxfFile[],
  margin: number,
  y: number,
  contentWidth: number,
  pageHeight: number
): number {
  const blue = hexToRgb(PRIMARY_BLUE);

  // Column widths
  const cols = {
    num: 8,
    name: 35,
    preview: 25,
    material: 45,
    qty: 15,
    unitCost: 25,
    totalCost: 27,
  };

  // Table header
  doc.setFillColor(blue.r, blue.g, blue.b);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setFontSize(8);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(255, 255, 255);

  let x = margin + 2;
  doc.text('#', x, y + 5);
  x += cols.num;
  doc.text('Tên chi tiết', x, y + 5);
  x += cols.name;
  doc.text('Hình ảnh', x, y + 5);
  x += cols.preview;
  doc.text('Vật liệu', x, y + 5);
  x += cols.material;
  doc.text('SL', x, y + 5);
  x += cols.qty;
  doc.text('Đơn giá', x, y + 5);
  x += cols.unitCost;
  doc.text('Thành tiền', x, y + 5);

  y += 7;

  // Table rows
  doc.setTextColor(50, 50, 50);
  doc.setFont(fontName, 'normal');

  files.forEach((file, index) => {
    // Check if need new page
    const rowHeight = 20 + (file.operations.length > 0 ? 4 : 0);
    if (y + rowHeight > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    // Alternating row background
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    // Draw border
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, rowHeight, 'S');

    const textY = y + 8;
    x = margin + 2;

    // Number
    doc.setFontSize(8);
    doc.text((index + 1).toString(), x, textY);
    x += cols.num;

    // Name
    const name = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
    doc.text(name, x, textY);
    x += cols.name;

    // Preview (placeholder dotted rectangle)
    const previewSize = 15;
    const previewX = x + 2;
    const previewY = y + 2;
    doc.setDrawColor(150, 150, 150);
    doc.setLineDashPattern([1, 1], 0);
    doc.rect(previewX, previewY, previewSize, previewSize, 'S');
    doc.setLineDashPattern([], 0);

    // If we have preview data (base64), try to add it
    if (file.preview && file.preview.startsWith('data:')) {
      try {
        doc.addImage(file.preview, 'PNG', previewX, previewY, previewSize, previewSize);
      } catch {
        // Fallback: just show placeholder
      }
    }
    x += cols.preview;

    // Material (3 lines)
    if (file.material) {
      doc.setFontSize(7);
      doc.text(file.material.name, x, textY - 2);
      doc.text(file.material.grade, x, textY + 2);
      doc.text(`${file.material.thickness}mm`, x, textY + 6);
    } else {
      doc.text('N/A', x, textY);
    }
    x += cols.material;

    // Quantity
    doc.setFontSize(8);
    doc.text(file.quantity.toString(), x, textY);
    x += cols.qty;

    // Unit Cost
    const unitCost = file.unitCost || 0;
    doc.setFontSize(7);
    doc.text(formatVND(unitCost), x, textY);
    x += cols.unitCost;

    // Total Cost
    const totalCost = file.totalCost || 0;
    doc.setFont(fontName, 'normal');
    doc.text(formatVND(totalCost), x, textY);
    doc.setFont(fontName, 'normal');

    // Operations (if any)
    if (file.operations.length > 0) {
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      const opsText = `Operations: ${file.operations.join(', ')}`;
      doc.text(opsText, margin + 10, y + rowHeight - 3);
      doc.setTextColor(50, 50, 50);
    }

    y += rowHeight;
  });

  return y + 5;
}

/**
 * Draw footer section with shipping, note, and summary
 */
function drawFooter(
  doc: jsPDF,
  summary: QuoteSummary,
  companyInfo: CompanyInfo | null,
  notes: string | undefined,
  margin: number,
  y: number,
  contentWidth: number,
  pageHeight: number
): number {
  // Check if need new page for footer
  if (y + 60 > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }

  const rightColX = margin + contentWidth - 70;

  // Shipping
  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Vận chuyển:', rightColX, y);
  doc.text(formatVND(summary.shipping), rightColX + 50, y, { align: 'right' });
  y += 8;

  // Note section
  if (notes || companyInfo?.phone) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const noteText = notes || `Nếu có câu hỏi về báo giá này, vui lòng liên hệ ${companyInfo?.phone || 'chúng tôi'}`;
    const noteLines = doc.splitTextToSize(noteText, 90);
    doc.text('Ghi chú:', margin, y);
    doc.text(noteLines, margin + 18, y);
    y += noteLines.length * 4 + 5;
  }

  // Summary box
  doc.setDrawColor(200, 200, 200);
  doc.rect(rightColX - 5, y - 3, 75, 25, 'S');

  // Sub Total
  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Tạm tính:', rightColX, y);
  doc.text(formatVND(summary.subtotal), rightColX + 65, y, { align: 'right' });
  y += 6;

  // Tax
  doc.text('Thuế (10%):', rightColX, y);
  doc.text(formatVND(summary.tax), rightColX + 65, y, { align: 'right' });
  y += 6;

  // Total
  const blue = hexToRgb(PRIMARY_BLUE);
  doc.setFontSize(11);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(blue.r, blue.g, blue.b);
  doc.text('Tổng cộng:', rightColX, y);
  doc.text(formatVND(summary.total), rightColX + 65, y, { align: 'right' });

  return y + 10;
}

export default {
  generateAndSavePdf,
};
