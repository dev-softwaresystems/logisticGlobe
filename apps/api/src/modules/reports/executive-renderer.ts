import PDFDocument from 'pdfkit';
import writeXlsxFile from 'write-excel-file/node';
import type { Row, SheetData, Feature } from 'write-excel-file/node';
import {
  insertElementMarkupAccordingToOrderOfSiblings,
  getOrderOfSiblings,
} from 'write-excel-file/utility';
import type { ExecutiveReport } from '@logistics-globe/shared';
import type { Blob } from 'node:buffer';
import type { Stream } from 'node:stream';
const metrics = [
  ['Envíos activos', 'activeShipments'],
  ['Capacidad de almacén (%)', 'warehouseCapacityPercent'],
  ['Flota disponible', 'availableVehicles'],
  ['En mantenimiento', 'vehiclesInMaintenance'],
  ['Entregas pendientes', 'pendingDeliveries'],
  ['Alta prioridad', 'highPriorityDeliveries'],
] as const;
type Value = string | number | Date | null;
export function reportSections(
  data: ExecutiveReport,
): { title: string; headers: string[]; rows: Value[][] }[] {
  const daily = data.summary.dailyActiveComparison;
  const weekly = data.summary.shipmentPeriodComparison;
  return [
    {
      title: 'Información del reporte',
      headers: ['Concepto', 'Valor'],
      rows: [
        ['Producto', 'LogisticsGlobe · Software Systems'],
        ['Generación UTC', new Date(data.generatedAt)],
        ['Zona operativa', data.timeZone],
        ['Periodo desde UTC', new Date(data.period.from)],
        ['Periodo hasta UTC', new Date(data.period.to)],
        ['Estado', data.filters.status ?? 'Todos'],
        ['Prioridad', data.filters.priority ?? 'Todas'],
        ['Corte SQL UTC', new Date(data.summary.generatedAt)],
      ],
    },
    {
      title: 'Métricas al corte',
      headers: ['Métrica', 'Valor'],
      rows: metrics.map(([label, key]) => [label, data.summary[key]]),
    },
    {
      title: 'Comparativas de envíos',
      headers: ['Concepto', 'Valor'],
      rows: [
        ['Corte actual UTC', daily?.currentCut ?? 'N/D'],
        ['Activos al corte', daily?.current ?? null],
        ['Corte anterior UTC', daily?.previousCut ?? 'N/D'],
        ['Activos anteriores', daily?.previous ?? null],
        ['Diferencia', daily?.difference ?? null],
        ['Variación (%)', daily?.percent ?? null],
        ['Motivo N/D diario', daily?.reason ?? 'Sin limitación adicional'],
        ['Nuevos envíos: últimos 7 días', weekly?.currentCreated ?? null],
        ['Nuevos envíos: 7 días anteriores', weekly?.previousCreated ?? null],
        [
          'Inicio actual semanal UTC',
          weekly ? new Date(weekly.currentFrom) : null,
        ],
        [
          'Inicio anterior semanal UTC',
          weekly ? new Date(weekly.previousFrom) : null,
        ],
        ['Fin semanal UTC', weekly ? new Date(weekly.to) : null],
        [
          'Nota semanal',
          'Compara creación, no activos históricos; N/D sin 14 días de registros.',
        ],
      ],
    },
    {
      title: 'Envíos creados en el periodo: estados al corte',
      headers: ['Estado', 'Cantidad'],
      rows: data.states.map((r) => [r.name, r.count]),
    },
    {
      title: 'Envíos creados en el periodo: prioridades',
      headers: ['Prioridad', 'Cantidad'],
      rows: data.priorities.map((r) => [r.name, r.count]),
    },
    {
      title: 'Flota actual',
      headers: ['Estado', 'Cantidad'],
      rows: data.fleet.map((r) => [r.name, r.count]),
    },
    {
      title: 'Almacenes al corte',
      headers: ['Almacén', 'Capacidad', 'Ocupado'],
      rows: data.warehouses.map((r) => [r.name, r.capacity, r.occupied]),
    },
    {
      title: 'Alertas críticas actuales',
      headers: ['SKU', 'Almacén', 'Existencia', 'Mínimo'],
      rows: data.alerts.map((r) => [r.sku, r.warehouse, r.quantity, r.minimum]),
    },
    {
      title: 'Salud funcional',
      headers: ['Componente', 'Estado', 'Sondeado UTC', 'Motivo'],
      rows: data.health.components.map((r) => [
        r.name,
        r.status,
        new Date(r.checkedAt),
        r.reason,
      ]),
    },
    {
      title: 'Alcance y limitaciones',
      headers: ['Nota'],
      rows: data.limitations.map((r) => [r]),
    },
  ];
}
export async function executivePdf(data: ExecutiveReport): Promise<Buffer> {
  const started = performance.now();
  const doc = new PDFDocument({
    size: 'A4',
    margin: 42,
    bufferPages: true,
    info: {
      Title: 'LogisticsGlobe - Reporte ejecutivo',
      Author: 'Software Systems',
    },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const header = () => {
    doc.x = 42;
    doc
      .fillColor('#154c79')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('LogisticsGlobe');
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#333333')
      .text('Software Systems · Reporte ejecutivo');
    doc.moveDown();
  };
  header();
  const width = doc.page.width - 84;
  for (const section of reportSections(data)) {
    if (doc.y > 680) {
      doc.addPage();
      header();
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#154c79')
      .text(section.title);
    doc.moveDown(0.4);
    const row = (cells: Value[], heading = false) => {
      if (performance.now() - started > 5000)
        throw new Error('Report renderer deadline exceeded');
      const count = cells.length,
        cellWidth = width / count;
      const texts = cells.map((c) =>
        c === null ? 'N/D' : c instanceof Date ? c.toISOString() : String(c),
      );
      doc.font(heading ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      const height =
        Math.max(
          16,
          ...texts.map((t) => doc.heightOfString(t, { width: cellWidth - 12 })),
        ) + 10;
      if (doc.y + height > doc.page.height - 58) {
        doc.addPage();
        header();
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(section.title + ' (continuación)');
        doc.moveDown(0.5);
        row(section.headers, true);
      }
      const y = doc.y;
      doc
        .rect(42, y, width, height)
        .fill(heading ? '#e4edf5' : '#f6f8fa')
        .fillColor('#1e293b');
      texts.forEach((text, i) => {
        doc
          .font(heading ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .text(text, 48 + i * cellWidth, y + 5, { width: cellWidth - 12 });
      });
      doc.y = y + height + 2;
      doc.x = 42;
    };
    row(section.headers, true);
    for (const values of section.rows) row(values);
    if (!section.rows.length)
      row(section.headers.map((_, i) => (i === 0 ? 'Sin registros' : '')));
    doc.moveDown(0.8);
  }
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text(
        'Página ' + (i + 1) + ' de ' + range.count + ' · ' + data.generatedAt,
        42,
        doc.page.height - 38,
        { lineBreak: false },
      );
  }
  doc.end();
  return result;
}
export async function executiveXlsx(data: ExecutiveReport): Promise<Buffer> {
  const sections = reportSections(data);
  const sheets = sections.map((section, index) => {
    const headers: Row = section.headers.map((value) => ({
      value,
      type: String,
      fontWeight: 'bold',
      backgroundColor: '#154c79',
      textColor: '#ffffff',
      wrap: true,
    }));
    const rows: SheetData = section.rows.map((values) =>
      values.map((value) =>
        value === null
          ? { value: 'N/D', type: String }
          : value instanceof Date
            ? { value, type: Date, format: 'yyyy-mm-dd hh:mm:ss' }
            : typeof value === 'number'
              ? { value, type: Number, format: '0.00' }
              : { value, type: String, wrap: true },
      ),
    );
    return {
      sheet: index + 1 + ' ' + section.title.slice(0, 26),
      data: [headers, ...rows],
      columns: section.headers.map((_, i) => ({ width: i === 0 ? 38 : 26 })),
      stickyRowsCount: 1,
      showGridLines: false,
    };
  });
  const feature: Feature<Buffer | Stream | Blob> = {
    files: {
      transform: {
        'xl/worksheets/sheet{id}.xml': {
          transform: (xml, _options, properties) => {
            const sheet = sheets[properties.sheetIndex],
              last = String.fromCharCode(64 + sheet.columns.length);
            return insertElementMarkupAccordingToOrderOfSiblings(
              xml,
              '<autoFilter ref="A1:' + last + sheet.data.length + '"/>',
              getOrderOfSiblings('xl/worksheets/sheet{id}.xml', 'worksheet')!,
              'worksheet',
            );
          },
        },
      },
    },
  };
  return writeXlsxFile(sheets, {
    fontFamily: 'Calibri',
    fontSize: 11,
    features: [feature],
  }).toBuffer();
}
