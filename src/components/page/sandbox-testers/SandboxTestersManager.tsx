import {
  getSandboxTesters,
  removeSandboxTester,
  saveSandboxTester,
  type SandboxTesterRow,
} from '@/client/sandbox-testers';
import DataTable from '@/components/shared/ui/data-table';
import TableRowActions from '@/components/shared/ui/table-row-actions';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toErrorMessage } from '@/lib/error-message';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { MEMO_MAX, sandboxTesterProblems, saveErrorMessage, toSaveInput } from './sandbox-tester-form';

function SandboxTestersManager() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['sandbox-testers'], queryFn: getSandboxTesters });
  const [draft, setDraft] = useState({ userId: '', memo: '' });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<SandboxTesterRow | null>(null);

  const rows = data?.items ?? [];

  const save = async () => {
    const problems = sandboxTesterProblems(draft);
    if (problems.length) {
      toast.warning(problems.join(' '));
      return;
    }
    const { userId, memo } = toSaveInput(draft);
    const existed = rows.some((row) => row.userId === userId);
    setSaving(true);
    try {
      await saveSandboxTester(userId, memo);
      await refetch();
      setDraft({ userId: '', memo: '' });
      toast.success(existed ? '메모를 바꿨습니다.' : '테스터를 넣었습니다.');
    } catch (err) {
      toast.error(saveErrorMessage(err));
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    try {
      await removeSandboxTester(target.userId);
      await refetch();
      toast.success('테스터를 뺐습니다.');
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  };

  const columns: ColumnDef<SandboxTesterRow>[] = [
    {
      accessorKey: 'userId',
      header: 'userId',
      size: 300,
      cell: ({ row }) => <span className='font-mono text-xs'>{row.original.userId}</span>,
    },
    {
      accessorKey: 'username',
      header: '이름',
      size: 160,
      cell: ({ row }) => row.original.username ?? <span className='text-muted-foreground'>탈퇴한 계정</span>,
    },
    // 문자열 셀이라 DataTable 이 말줄임과 툴팁을 붙인다.
    { accessorKey: 'memo', header: '메모', size: 320 },
    {
      accessorKey: 'createdAt',
      header: '넣은 날',
      size: 150,
      cell: ({ row }) => (
        <span className='tabular-nums'>{dayjs(row.original.createdAt).format('YYYY-MM-DD HH:mm')}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 64,
      cell: ({ row }) => (
        <TableRowActions
          items={[
            {
              label: '메모 수정',
              onClick: () => setDraft({ userId: row.original.userId, memo: row.original.memo }),
            },
            { label: '삭제', onClick: () => setRemoving(row.original), destructive: true },
          ]}
        />
      ),
    },
  ];

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border border-warning/35 bg-warning/15 px-4 py-3 text-sm text-warning-foreground'>
        운영, 스테이징, 중국에서는 이 목록의 계정만 Sandbox·TestFlight 테스트 결제로 실제 유료 혜택을 받습니다. 바꾸면 바로
        적용됩니다.
      </div>

      <form
        className='space-y-3 rounded-lg border border-border bg-card p-5'
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className='grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end'>
          <div className='space-y-1.5'>
            <Label htmlFor='sandbox-user-id' className='text-xs text-muted-foreground'>
              userId
            </Label>
            <Input
              id='sandbox-user-id'
              value={draft.userId}
              onChange={(e) => setDraft((p) => ({ ...p, userId: e.target.value }))}
              placeholder='사용자 id(uuid)'
              className='font-mono'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='sandbox-memo' className='text-xs text-muted-foreground'>
              메모
            </Label>
            <Input
              id='sandbox-memo'
              value={draft.memo}
              maxLength={MEMO_MAX}
              onChange={(e) => setDraft((p) => ({ ...p, memo: e.target.value }))}
              placeholder='예: QA 담당자, TestFlight 테스터'
            />
          </div>
          <Button type='submit' disabled={saving}>
            {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
            저장
          </Button>
        </div>
        <p className='text-xs text-muted-foreground'>이미 있는 userId 를 넣으면 메모만 바뀝니다.</p>
      </form>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        rowKey='userId'
        emptyState={<span className='text-sm text-muted-foreground'>넣은 테스터가 없습니다.</span>}
      />

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>테스터에서 뺄까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.username ?? '탈퇴한 계정'} ({removing?.memo}). 빼면 이 계정의 테스트 결제는 바로 유료 혜택을
              받지 못합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>빼기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SandboxTestersManager;
