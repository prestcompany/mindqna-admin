import { GameRewardPolicy, updateGameRewardPolicy } from '@/client/game';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
    rangeRank: z.object({
      hearts: z.coerce.number().optional(),
      rankStart: z.coerce.number().optional(),
      rankEnd: z.coerce.number().optional(),
    }).optional(),
  }),
});

type GameRewardPolicyFormValues = z.infer<typeof gameRewardPolicySchema>;

interface GameRewardPolicyModalProps {
  gameRewardPolicy?: GameRewardPolicy;
  isOpen: boolean;
  close: () => void;
  refetch: () => void;
}

const GameRewardPolicyModal = ({ gameRewardPolicy, isOpen, close, refetch }: GameRewardPolicyModalProps) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>보상 정책 수정</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20'>
            <Loader2 className='h-8 w-8 animate-spin' />
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinish)} className='space-y-4'>
            <FormSection title='상위 랭킹 보상' description='상위 랭킹 보상 정책을 수정하세요.' key={individualRankKeys.length}>
              {individualRankKeys.map((key) => (
                <div key={key}>
                  <FormGroup title={rankTitleMap[key]}>
                    <FormField
                      control={form.control}
                      name={`condition.individualRanks.${key}.hearts`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type='number' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormGroup>
                  <Separator className='my-4' />
                </div>
              ))}
            </FormSection>

            <FormSection title='그 외 랭킹 보상' description='하위 랭킹 보상 정책을 수정하세요.'>
              <FormGroup title='보상'>
                <FormField
                  control={form.control}
                  name='condition.rangeRank.hearts'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <FormGroup title='랭킹 범위 - 시작'>
                <FormField
                  control={form.control}
                  name='condition.rangeRank.rankStart'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' min={1} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <FormGroup title='랭킹 범위 - 끝'>
                <FormField
                  control={form.control}
                  name='condition.rangeRank.rankEnd'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />
            </FormSection>
            <div className='text-center'>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {gameRewardPolicy ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default GameRewardPolicyModal;
