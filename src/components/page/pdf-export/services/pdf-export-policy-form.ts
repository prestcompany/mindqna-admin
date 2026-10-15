import type { PdfExportCurrency, PdfExportPolicy, UpdatePdfExportPolicyParams } from '@/client/types';

export const PDF_EXPORT_CURRENCY_LABEL: Record<PdfExportCurrency, string> = {
  STAR: '스타',
  HEART: '하트',
};

export type PdfExportPolicyForm = {
  currency: PdfExportCurrency;
  coinPerQuestion: number;
  heartPerQuestion: number;
  maxDownloadCount: number;
  expiryDays: number;
};

export const EMPTY_PDF_EXPORT_POLICY_FORM: PdfExportPolicyForm = {
  currency: 'STAR',
  coinPerQuestion: 0,
  heartPerQuestion: 0,
  maxDownloadCount: 0,
  expiryDays: 0,
};

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;

export function toPdfExportPolicyForm(policy: PdfExportPolicy): PdfExportPolicyForm {
  return {
    currency: policy.currency,
    coinPerQuestion: policy.coinPerQuestion,
    heartPerQuestion: policy.heartPerQuestion,
    maxDownloadCount: policy.maxDownloadCount,
    expiryDays: policy.expiryDays,
  };
}

/** 저장을 막을 첫 오류 문구. 문제가 없으면 null. */
export function pdfExportPolicyError(form: PdfExportPolicyForm): string | null {
  // 구버전 앱은 결제 화폐와 관계없이 스타 단가로 결제하므로 스타 단가는 항상 필요하다.
  if (!isPositiveInteger(form.coinPerQuestion)) return '카드당 스타는 1 이상의 정수여야 합니다.';
  if (form.currency === 'HEART' && !isPositiveInteger(form.heartPerQuestion)) {
    return '하트로 결제하려면 카드당 하트를 1 이상의 정수로 입력해 주세요.';
  }
  if (!isPositiveInteger(form.maxDownloadCount)) return '최대 다운로드 횟수는 1 이상의 정수여야 합니다.';
  if (!isPositiveInteger(form.expiryDays)) return '유효 기간은 1 이상의 정수여야 합니다.';
  return null;
}

/**
 * 저장 요청 본문. 스타 결제 중 비워 둔 하트 단가(0)는 보내지 않는다 —
 * 서버가 1 미만을 거부하므로 보내면 스타 정책 저장까지 실패한다.
 */
export function toUpdatePdfExportPolicyParams(form: PdfExportPolicyForm): UpdatePdfExportPolicyParams {
  const params: UpdatePdfExportPolicyParams = {
    currency: form.currency,
    coinPerQuestion: form.coinPerQuestion,
    maxDownloadCount: form.maxDownloadCount,
    expiryDays: form.expiryDays,
  };
  if (isPositiveInteger(form.heartPerQuestion)) params.heartPerQuestion = form.heartPerQuestion;
  return params;
}
