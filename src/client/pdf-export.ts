import client from './@base';
import {
  PdfExportDownloadResult,
  PdfExportHistoryParams,
  PdfExportHistoryResult,
  PdfExportPolicy,
  PdfExportRecord,
  UpdatePdfExportPolicyParams,
  UpdatePdfExportRecordParams,
} from './types';

export async function getPdfExportPolicy() {
  const res = await client.get<PdfExportPolicy>('/pdf-export/policy');

  return res.data;
}

export async function updatePdfExportPolicy(body: UpdatePdfExportPolicyParams) {
  const res = await client.patch<PdfExportPolicy>('/pdf-export/policy', body);

  return res.data;
}

export async function getPdfExportHistory(params: PdfExportHistoryParams) {
  const res = await client.get<PdfExportHistoryResult>('/pdf-export/history', { params });

  return res.data;
}

export async function getPdfExportAdminDownloadUrl(id: number) {
  const res = await client.post<PdfExportDownloadResult>(`/pdf-export/history/${id}/download`);

  return res.data;
}

export async function deletePdfExportRecord(id: number) {
  const res = await client.delete(`/pdf-export/history/${id}`);

  return res.data;
}

export async function updatePdfExportRecord(id: number, body: UpdatePdfExportRecordParams) {
  const res = await client.patch<PdfExportRecord>(`/pdf-export/history/${id}`, body);

  return res.data;
}
