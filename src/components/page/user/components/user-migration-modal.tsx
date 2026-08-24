import { transferUser } from '@/client/user';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  SAME_USER_CODE_ERROR_MESSAGE,
  USER_CODE_ERROR_MESSAGE,
  USER_CODE_MIN_LENGTH,
  areDifferentUserCodes,
} from '../services/user-migration-validation';

const migrationSchema = z
  .object({
    oldUserName: z.string().trim().min(USER_CODE_MIN_LENGTH, USER_CODE_ERROR_MESSAGE),
    newUserName: z.string().trim().min(USER_CODE_MIN_LENGTH, USER_CODE_ERROR_MESSAGE),
  })
  .refine((values) => areDifferentUserCodes(values.oldUserName, values.newUserName), {
    message: SAME_USER_CODE_ERROR_MESSAGE,
    path: ['newUserName'],
  });

type MigrationFormValues = z.infer<typeof migrationSchema>;

interface UserMigrationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function UserMigrationModal({ open, onClose, onSuccess }: UserMigrationModalProps) {
  const form = useForm<MigrationFormValues>({
    resolver: zodResolver(migrationSchema),
    defaultValues: {
      oldUserName: '',
      newUserName: '',
    },
  });
  const [loading, setLoading] = useState(false);
  // Selection and execution used to be the same click. This holds the values the operator
  // just submitted while the confirm dialog names exactly what is about to move, so the
  // last thing they see before a real, unrecoverable data change is a fact, not a guess.
  const [pendingValues, setPendingValues] = useState<MigrationFormValues | null>(null);

  const executeTransfer = async (values: MigrationFormValues) => {
    try {
      setLoading(true);

      await transferUser({
        oldUserName: values.oldUserName,
        newUserName: values.newUserName,
      });

      toast.success('로그인 수단 교체가 완료되었습니다');
      onSuccess();
      onClose();
      form.reset();
    } catch (err) {
      toast.error(`로그인 수단 교체 실패: ${err}`);
    } finally {
      setLoading(false);
      setPendingValues(null);
    }
  };

  const handleSubmit = (values: MigrationFormValues) => {
    setPendingValues(values);
  };

  const handleCancel = () => {
    onClose();
    form.reset();
  };

  // AlertDialogAction renders Radix's DialogPrimitive.Close, which calls onOpenChange(false)
  // right after this handler — before the awaited transferUser call even starts. Without
  // preventDefault the confirm surface would vanish mid-request, which is the opposite of
  // what a confirm step in front of an irreversible transfer is for.
  const handleConfirmTransfer = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!pendingValues) return;
    executeTransfer(pendingValues);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && handleCancel()}>
        <AdminSideSheetContent title='로그인 수단 교체' size='md'>
          <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700'>
            <p className='font-medium'>주의: 되돌릴 수 없는 작업입니다</p>
            <p className='mt-1'>
              기존 계정의 로그인 수단이 새 계정의 로그인 정보로 교체되며, 새 계정은 임시 상태로 변경됩니다.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='flex flex-col gap-4 pb-2'>
              <div className='-mx-6 mt-4'>
                <DefinitionRow label='기존 계정 (유지할 데이터)' hint='데이터를 유지할 계정의 유저코드'>
                  <FormField
                    control={form.control}
                    name='oldUserName'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder='예: 01234567' {...field} />
                        </FormControl>
                        <FormDescription>이 계정의 모든 데이터는 유지되며, 로그인 수단만 교체됩니다.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </DefinitionRow>

                <DefinitionRow label='새 로그인 계정 (로그인 정보 제공)' hint='로그인 정보를 가져올 계정의 유저코드'>
                  <FormField
                    control={form.control}
                    name='newUserName'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder='예: fedcba98' {...field} />
                        </FormControl>
                        <FormDescription>이 계정의 로그인 정보가 기존 계정으로 이동합니다.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </DefinitionRow>
              </div>

              <div className='rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800'>
                <div className='mb-2 font-medium'>교체되는 정보:</div>
                <ul className='ml-4 list-disc space-y-1'>
                  <li>로그인 제공자 (Google, Kakao, Apple, Line 등)</li>
                  <li>소셜 계정 ID</li>
                  <li>이메일 주소</li>
                </ul>
                <div className='mb-2 mt-3 font-medium'>작업 과정:</div>
                <ol className='ml-4 list-decimal space-y-1'>
                  <li>새 계정을 임시 상태로 변경</li>
                  <li>기존 계정에 새 로그인 정보 적용</li>
                  <li>기존 계정의 모든 데이터는 그대로 유지</li>
                </ol>
              </div>

              <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' type='button' onClick={handleCancel} disabled={loading}>
                    취소
                  </Button>
                  <Button variant='destructive' type='submit' disabled={loading}>
                    {loading && <Loader2 className='w-4 h-4 animate-spin' />}
                    교체 실행
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </AdminSideSheetContent>
      </Sheet>

      <AlertDialog open={!!pendingValues} onOpenChange={(o) => !o && !loading && setPendingValues(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그인 수단 교체를 실행하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingValues && (
                <>
                  <strong>{pendingValues.newUserName}</strong> 계정의 로그인 수단(제공자, 소셜 계정 ID, 이메일 주소)이{' '}
                  <strong>{pendingValues.oldUserName}</strong> 계정으로 이동합니다.{' '}
                  <strong>{pendingValues.oldUserName}</strong> 계정의 기존 데이터는 그대로 유지되며,{' '}
                  <strong>{pendingValues.newUserName}</strong> 계정은 임시 상태로 전환됩니다. 이 작업은 되돌릴 수
                  없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer} disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              교체 실행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default UserMigrationModal;
