import { resolve } from 'node:path';
import pdfmake from 'pdfmake';
import fonts from 'pdfmake/fonts/Roboto';
import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import { classReportSchema, type ClassReport } from './schemas';

pdfmake.addFonts(fonts);
const allowedFonts = new Set(Object.values(fonts.Roboto).filter((value): value is string => typeof value === 'string').map((value) => resolve(value)));
pdfmake.setLocalAccessPolicy((path) => allowedFonts.has(resolve(path)));
pdfmake.setUrlAccessPolicy(() => false);

export function buildReportDocument(report: ClassReport, generatedBy: string): TDocumentDefinitions {
  const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const timestamp = new Intl.DateTimeFormat('pt-BR', { timeZone: report.timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.generatedAt));
  const body: TableCell[][] = [[
    { text: 'Aluno', bold: true }, { text: 'Grupo', bold: true }, { text: 'Pontos atuais', bold: true, alignment: 'right' },
    { text: 'Máximo', bold: true, alignment: 'right' }, { text: 'Aproveitamento', bold: true, alignment: 'right' },
  ]];
  let totalCents = 0;
  for (const student of report.students) {
    const cents = Math.round(student.score * 100);
    totalCents += cents;
    if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(totalCents)) throw new RangeError('Report points exceed supported precision');
    body.push([
      `${student.name}${student.active ? '' : ' (inativo)'}`,
      student.groups.join(', ') || 'Sem grupo',
      { text: number.format(student.score), alignment: 'right' },
      { text: number.format(student.maximumScore), alignment: 'right' },
      { text: `${number.format(student.maximumScore === 0 ? 0 : student.score * 100 / student.maximumScore)}%`, alignment: 'right' },
    ]);
  }
  if (!report.students.length) body.push([{ text: 'Nenhum aluno encontrado para os filtros.', colSpan: 5 }, '', '', '', '']);
  return {
    info: { title: `Soul+ · Relatório de pontos · ${report.className}`, author: generatedBy, creator: 'Soul+' },
    pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [36, 36, 36, 40],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#172522' },
    footer: (currentPage, pageCount) => ({ text: `Soul+ · ${currentPage} / ${pageCount}`, alignment: 'right', margin: [36, 12, 36, 0], fontSize: 8, color: '#667873' }),
    content: [
      { text: 'Soul+ · Relatório de pontuação', fontSize: 18, bold: true, color: '#126b63', margin: [0, 0, 0, 12] },
      { text: `Turma: ${report.className} · Ano letivo: ${report.schoolYear}`, bold: true, margin: [0, 0, 0, 5] },
      { text: `Período: ${report.periodName ?? 'Ano letivo completo'} · Grupo: ${report.groupName ?? 'Todos'}`, margin: [0, 0, 0, 5] },
      { text: `Professores responsáveis pela turma: ${report.teachers.join(', ') || 'Não informado'}`, margin: [0, 0, 0, 5] },
      { text: `Emitido em ${timestamp} por ${generatedBy}`, color: '#667873', margin: [0, 0, 0, 12] },
      { table: { headerRows: 1, widths: ['*', 170, 80, 70, 80], body }, layout: 'lightHorizontalLines' },
      { text: `Alunos: ${report.students.length} · Total de pontos: ${number.format(totalCents / 100)}`, bold: true, margin: [0, 12, 0, 12] },
      { text: 'Professores responsáveis pelos grupos', bold: true, margin: [0, 0, 0, 5] },
      ...report.groupTeachers.map((group) => ({ text: `${group.groupName}: ${group.teacherName ?? 'Sem responsável'}${group.teacherName && !group.teacherActive ? ' (inativo)' : ''}`, margin: [0, 0, 0, 3] as [number, number, number, number] })),
      { text: 'Pontuação vigente: ajuste manual quando existente, senão pontuação calculada. Tarefas canceladas não integram os totais. Grupos e matrícula correspondem ao cadastro atual.', fontSize: 8, color: '#667873', margin: [0, 12, 0, 0] },
    ],
  };
}

export async function generateReportPdf(input: unknown, generatedBy: string): Promise<Buffer> {
  const report = classReportSchema.parse(input);
  return pdfmake.createPdf(buildReportDocument(report, generatedBy)).getBuffer();
}