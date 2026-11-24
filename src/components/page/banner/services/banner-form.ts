import { z } from 'zod';
import { periodError } from './banner-period';

export const bannerFormSchema = z
  .object({
    locale: z.string().min(1, '언어를 선택해주세요.'),
    name: z.string().min(1, '이름을 입력해주세요.'),
    location: z.string().min(1, '위치를 선택해주세요.'),
    link: z.string().min(1, '링크를 입력해주세요.'),
    orderIndex: z.coerce.number().int().min(1, '1 이상의 숫자를 입력해주세요.'),
    isActive: z.boolean(),
    /** KST wall clock, `YYYY-MM-DDTHH:mm`; empty means no limit. */
    startAt: z.string(),
    endAt: z.string(),
  })
  .superRefine((values, ctx) => {
    const message = periodError(values.startAt, values.endAt);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message });
  });

export type BannerFormValues = z.infer<typeof bannerFormSchema>;
