import { z } from 'zod';
import { periodError } from './banner-period';

// Only a complete date-time or a fully empty field. A cleared time input leaves
// `YYYY-MM-DDT`, which must not quietly save as "no limit".
const kstDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, '날짜와 시각을 모두 입력해주세요.')
  .or(z.literal(''));

export const bannerFormSchema = z
  .object({
    locale: z.string().min(1, '언어를 선택해주세요.'),
    name: z.string().min(1, '이름을 입력해주세요.'),
    location: z.string().min(1, '위치를 선택해주세요.'),
    link: z.string().min(1, '링크를 입력해주세요.'),
    orderIndex: z.coerce.number().int().min(1, '1 이상의 숫자를 입력해주세요.'),
    isActive: z.boolean(),
    /** KST wall clock, `YYYY-MM-DDTHH:mm`; empty means no limit. */
    startAt: kstDateTime,
    endAt: kstDateTime,
  })
  .superRefine((values, ctx) => {
    const message = periodError(values.startAt, values.endAt);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message });
  });

export type BannerFormValues = z.infer<typeof bannerFormSchema>;
