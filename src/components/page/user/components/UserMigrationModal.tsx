import { transferUser } from '@/client/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const migrationSchema = z.object({
  oldUserName: z.string().min(10, '유효한 유저코드를 입력해주세요'),
  newUserName: z.string().min(10, '유효한 유저코드를 입력해주세요'),
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

  const handleSubmit = async (values: MigrationFormValues) => {
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
    }
  };

  const handleCancel = () => {
    onClose();
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className='max-w-[600px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <ArrowDownUp className='w-5 h-5' />
            로그인 수단 교체
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700'>
            <p className='font-medium'>주의: 되돌릴 수 없는 작업입니다</p>
            <p className='mt-1'>
              기존 계정의 로그인 수단이 새 계정의 로그인 정보로 교체되며, 새 계정은 임시 상태로 변경됩니다.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <Card className='mb-4'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base'>기존 계정 (유지할 데이터)</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name='oldUserName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>데이터를 유지할 계정의 유저코드</FormLabel>
                        <FormControl>
                          <Input placeholder='예: 01234567' className='h-10' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className='text-sm text-gray-600 mt-2'>이 계정의 모든 데이터는 유지되며, 로그인 수단만 교체됩니다.</div>
                </CardContent>
              </Card>

              <div className='mb-4 text-center'>
                <ArrowDownUp className='w-6 h-6 mx-auto text-gray-400' />
                <div className='text-sm text-gray-500'>로그인 수단 교체</div>
              </div>

              <Card className='mb-4'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base'>새 로그인 계정 (로그인 정보 제공)</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name='newUserName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>로그인 정보를 가져올 계정의 유저코드</FormLabel>
                        <FormControl>
                          <Input placeholder='예: fedcba98' className='h-10' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className='text-sm text-gray-600 mt-2'>이 계정의 로그인 정보가 기존 계정으로 이동합니다.</div>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button variant='outline' type='button' onClick={handleCancel} disabled={loading}>
                  취소
                </Button>
                <Button variant='destructive' type='submit' disabled={loading}>
                  {loading && <Loader2 className='w-4 h-4 animate-spin' />}
                  교체 실행
                </Button>
              </DialogFooter>
            </form>
          </Form>

          <Card className='bg-blue-50 border-blue-200'>
            <CardContent className='p-4'>
              <div className='text-sm text-blue-800'>
                <div className='mb-2 font-medium'>교체되는 정보:</div>
                <ul className='ml-4 space-y-1 list-disc'>
                  <li>로그인 제공자 (Google, Kakao, Apple, Line 등)</li>
                  <li>소셜 계정 ID</li>
                  <li>이메일 주소</li>
                </ul>
                <div className='mt-3 mb-2 font-medium'>작업 과정:</div>
                <ol className='ml-4 space-y-1 list-decimal'>
                  <li>새 계정을 임시 상태로 변경</li>
                  <li>기존 계정에 새 로그인 정보 적용</li>
                  <li>기존 계정의 모든 데이터는 그대로 유지</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UserMigrationModal;
