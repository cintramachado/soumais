import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildReportDocument, generateReportPdf } from './generate-report-pdf';
import { reportFilterSchema, type ClassReport } from './schemas';

const report: ClassReport = {
  className: 'Adolescentes', schoolYear: 2026, periodName: 'Etapa 1', groupName: null, timezone: 'America/Sao_Paulo', generatedAt: '2026-10-06T12:00:00Z',
  teachers: ['Professora Raquel'], groupTeachers: [{ groupName: 'Soul Queens', teacherName: 'Professora Raquel', teacherActive: true }],
  students: Array.from({ length: 80 }, (_, index) => ({ id: `c0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name: `João da Conceição ${index + 1}`, active: true, groups: ['Soul Queens'], score: 75, maximumScore: 100, assigned: 1, completed: 1 })),
};
describe('PDF report', () => {
  it('validates filters', () => expect(reportFilterSchema.safeParse({ classId: 'invalid' }).success).toBe(false));
  it('includes requested fields in the definition', () => {
    const text = JSON.stringify(buildReportDocument(report, 'Raquel'));
    expect(text).toContain('Adolescentes');
    expect(text).toContain('Soul Queens');
    expect(text).toContain('Professora Raquel');
    expect(text).toContain('João da Conceição');
    expect(text).toContain('Pontos atuais');
  });
  it('generates a valid multipage PDF with Portuguese names', async () => {
    const bytes = await generateReportPdf(report, 'Raquel');
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const parsed = await PDFDocument.load(bytes);
    expect(parsed.getPageCount()).toBeGreaterThan(1);
    expect(parsed.getTitle()).toContain('Relatório de pontos');
  });
});