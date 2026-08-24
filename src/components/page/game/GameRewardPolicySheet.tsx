import { GameRewardPolicy, updateGameRewardPolicy } from '@/client/game';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { DefinitionRow, PanelBand } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const rankSchema = z.object({
  hearts: z.coerce.number().optional(),
});

const gameRewardPolicySchema = z.object({
  condition: z.object({
    individualRanks: z.record(rankSchema).optional(),
    rangeRank: z
      .object({
        hearts: z.coerce.number().optional(),
        rankStart: z.coerce.number().optional(),
        rankEnd: z.coerce.number().optional(),
      })
      .optional(),
  }),
});

type GameRewardPolicyFormValues = z.infer<typeof gameRewardPolicySchema>;

interface GameRewardPolicyProps {
  gameRewardPolicy?: GameRewardPolicy;
  isOpen: boolean;
  close: () => void;
  refetch: () => void;
}

const GameRewardPolicySheet = ({ gameRewardPolicy, isOpen, close, refetch }: GameRewardPolicyProps) => {
  const form = useForm<GameRewardPolicyFormValues>({
    resolver: zodResolver(gameRewardPolicySchema),
    defaultValues: {
      condition: {
        individualRanks: {},
        rangeRank: { hearts: undefined, rankStart: undefined, rankEnd: undefined },
      },
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [individualRankKeys, setIndividualRankKeys] = useState<string[]>([]);

  const rankTitleMap: Record<string, string> = {
    rank1: '1등',
    rank2: '2등',
    rank3: '3등',
    rank4: '4등',
    rank5: '5등',
  };

  const handleClose = () => {
    form.reset();
    setIndividualRankKeys([]);
    close();
  };

  const handleFinish = async (values: GameRewardPolicyFormValues) => {
    setIsLoading(true);

    try {
      await updateGameRewardPolicy({ ...values, id: gameRewardPolicy!.id } as any);
      toast.success('수정되었습니다');
    } catch (error) {
      toast.error('에러가 발생했습니다');
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        handleClose();
        refetch();
      }, 500);
    }
  };

  useEffect(() => {
    if (isOpen && gameRewardPolicy) {
      const condition = gameRewardPolicy.condition || {};
      const keys = Object.keys(condition.individualRanks || {});
      setIndividualRankKeys(keys);
      form.reset({ condition });
    } else if (isOpen && !gameRewardPolicy) {
      setIndividualRankKeys([]);
      form.reset();
    }
  }, [isOpen, gameRewardPolicy, form]);

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <AdminSideSheetContent title='보상 정책 수정' size='md' bodyClassName='overflow-hidden p-0'>
        {isLoading && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinish)} className='flex h-full flex-col'>
            <div className='min-h-0 flex-1 overflow-y-auto'>
              {/* Keyed on the rank count, same as before the conversion — a batch of rank
                  fields resets as a whole when which ranks exist changes, rather than
                  reconciling field-by-field against the previous set. */}
              <div key={individualRankKeys.length}>
                <PanelBand title='상위 랭킹 보상' />
                {individualRankKeys.map((key) => (
                  <DefinitionRow key={key} label={rankTitleMap[key]}>
                    <FormField
                      control={form.control}
                      name={`condition.individualRanks.${key}.hearts`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type='number'
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </DefinitionRow>
                ))}
              </div>

              <PanelBand title='그 외 랭킹 보상' />

              <DefinitionRow label='보상'>
                <FormField
                  control={form.control}
                  name='condition.rangeRank.hearts'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type='number'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DefinitionRow>
              <DefinitionRow label='랭킹 범위 - 시작'>
                <FormField
                  control={form.control}
                  name='condition.rangeRank.rankStart'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type='number'
                          min={1}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DefinitionRow>
              <DefinitionRow label='랭킹 범위 - 끝'>
                <FormField
                  control={form.control}
                  name='condition.rangeRank.rankEnd'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type='number'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DefinitionRow>
            </div>

            <div className='flex items-center justify-end gap-2 border-t bg-card px-4 py-3'>
              <Button type='button' variant='outline' onClick={handleClose} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {gameRewardPolicy ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </Form>
      </AdminSideSheetContent>
    </Sheet>
  );
};

export default GameRewardPolicySheet;
