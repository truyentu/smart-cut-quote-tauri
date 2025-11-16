/**
 * PDF Service
 * Generate and save PDF quotes
 * Based on IMPLEMENTATION_PLAN.md section 10
 */

import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, readTextFile } from '@tauri-apps/plugin-fs';
import { DxfFile, QuoteSummary } from '../types/quote';

export interface PdfGenerationOptions {
  files: DxfFile[];
  summary: QuoteSummary;
  nestingSvgPath?: string;
  clientName?: string;
}

/**
 * Generate and save PDF quote
 * @param options - PDF generation options including files, summary, SVG path, and client name
 * @returns Promise<boolean> - Success status
 */
export async function generateAndSavePdf(options: PdfGenerationOptions): Promise<boolean> {
  const { files, summary, nestingSvgPath, clientName } = options;

  try {
    // Step 1: Initialize PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPosition = 20;

    // Step 2: Add header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SMART CUT QUOTE', 105, yPosition, { align: 'center' });
    yPosition += 15;

    // Step 3: Add client info and date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    if (clientName) {
      doc.text(`Client: ${clientName}`, 20, yPosition);
      yPosition += 7;
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Date: ${currentDate}`, 20, yPosition);
    yPosition += 15;

    // Step 4: Add parts list section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Parts List', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Table header
    doc.setFont('helvetica', 'bold');
    doc.text('Part Name', 20, yPosition);
    doc.text('Qty', 90, yPosition);
    doc.text('Material', 110, yPosition);
    doc.text('Machine', 150, yPosition);
    yPosition += 7;

    // Table rows
    doc.setFont('helvetica', 'normal');
    files.forEach((file) => {
      if (yPosition > 270) {
        // Add new page if running out of space
        doc.addPage();
        yPosition = 20;
      }

      doc.text(file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name, 20, yPosition);
      doc.text(file.quantity.toString(), 90, yPosition);
      doc.text(file.material ? `${file.material.name} (${file.material.thickness}mm)` : 'N/A', 110, yPosition);
      doc.text(file.machine || 'N/A', 150, yPosition);
      yPosition += 7;
    });

    yPosition += 10;

    // Step 5: Add cost breakdown section
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Cost Breakdown', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    // Cost items
    const costItems = [
      { label: 'Material Cost:', value: `$${summary.materialCost.toFixed(2)}` },
      { label: 'Cutting Cost:', value: `$${summary.cuttingCost.toFixed(2)}` },
      { label: 'Operations Cost:', value: `$${summary.operationsCost.toFixed(2)}` },
      { label: 'Subtotal:', value: `$${summary.subtotal.toFixed(2)}` },
      { label: 'Tax (5%):', value: `$${summary.tax.toFixed(2)}` },
    ];

    costItems.forEach((item) => {
      doc.text(item.label, 20, yPosition);
      doc.text(item.value, 150, yPosition, { align: 'right' });
      yPosition += 8;
    });

    // Total with emphasis
    yPosition += 5;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 20, yPosition);
    doc.text(`$${summary.total.toFixed(2)}`, 150, yPosition, { align: 'right' });
    yPosition += 15;

    // Step 6: Embed nesting SVG if available
    if (nestingSvgPath) {
      try {
        // Check if we need a new page
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Nesting Layout', 20, yPosition);
        yPosition += 10;

        // Read SVG file
        const svgContent = await readTextFile(nestingSvgPath);

        // Convert SVG to data URL
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Create an image element to load the SVG
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load SVG'));
          img.src = svgUrl;
        });

        // Calculate dimensions to fit on page
        const maxWidth = 170;
        const maxHeight = 200;
        let imgWidth = maxWidth;
        let imgHeight = (img.height / img.width) * maxWidth;

        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = (img.width / img.height) * maxHeight;
        }

        // Add image to PDF
        doc.addImage(img.src, 'PNG', 20, yPosition, imgWidth, imgHeight);

        // Clean up
        URL.revokeObjectURL(svgUrl);
      } catch (err) {
        console.error('Failed to embed SVG in PDF:', err);
        // Continue without SVG if it fails
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('(Nesting layout not available)', 20, yPosition);
      }
    }

    // Step 7: Save PDF
    const pdfBlob = doc.output('blob');
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfUint8Array = new Uint8Array(pdfArrayBuffer);

    // Open save dialog
    const filePath = await save({
      filters: [
        {
          name: 'PDF',
          extensions: ['pdf'],
        },
      ],
      defaultPath: `quote_${Date.now()}.pdf`,
    });

    if (!filePath) {
      // User cancelled the save dialog
      return false;
    }

    // Write PDF file
    await writeFile(filePath, pdfUint8Array);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
