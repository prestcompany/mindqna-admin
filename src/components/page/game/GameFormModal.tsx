import { createGame, Game, GameCreateParams, GameType, updateGame } from '@/client/game';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PauseIcon, PlayIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const GAME_TYPE_OPTIONS = [
  { label: '사칙연산 빨리하기', value: 'SPEED_MATH' },
  { label: '기억하고 누르기', value: 'MEMORY_TAP' },
  { label: '따라 누르기', value: 'SEQUENCE_TAP' },
  { label: '따라 누르기 2', value: 'SEQUENCE_TAP_2' },
  { label: '문지르기', value: 'SWIPE_MATCH' },
  { label: '물건 피하고 재화 받기', value: 'DODGE_AND_COLLECT' },
  { label: '기타', value: 'ETC' },
] as const;

const gameFormSchema = z.object({
  type: z.nativeEnum(GameType, { required_error: '게임 타입을 선택해주세요' }),
  name: z.string().min(1, '게임명은 필수입니다'),
  stageScore: z.coerce.number().optional(),
  playLimitLife: z.coerce.number().optional(),
  timeLimitSecond: z.coerce.number().optional(),
  dailyPlayLimit: z.coerce.number().optional(),
  ticketRechargeHeart: z.coerce.number().optional(),
  ticketRechargeStar: z.coerce.number().optional(),
  bgmUrl: z.string().optional(),
  backgroundColor: z.string().optional(),
  primaryKeyColor: z.string().optional(),
  secondaryKeyColor: z.string().optional(),
  primaryAccentColor: z.string().optional(),
  secondaryAccentColor: z.string().optional(),
  headerTextColor: z.string().optional(),
  isActive: z.boolean().optional(),
});

type GameFormValues = z.infer<typeof gameFormSchema>;

interface GameFormProps {
  game?: Game;
  isOpen: boolean;
  close: () => void;
  refetch: () => void;
}

const COLOR_FIELDS = [
  { name: 'backgroundColor' as const, label: '게임 배경색' },
  { name: 'primaryKeyColor' as const, label: '게임 주요 색상' },
  { name: 'secondaryKeyColor' as const, label: '게임 보조 색상' },
  { name: 'primaryAccentColor' as const, label: '게임 주요 강조 색상' },
  { name: 'secondaryAccentColor' as const, label: '게임 보조 강조 색상' },
  { name: 'headerTextColor' as const, label: '헤더 텍스트 색상' },
] as const;

const GameFormModal = ({ game, isOpen, close, refetch }: GameFormProps) => {
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      type: undefined,
      name: '',
      stageScore: undefined,
      playLimitLife: undefined,
      timeLimitSecond: undefined,
      dailyPlayLimit: undefined,
      ticketRechargeHeart: undefined,
      ticketRechargeStar: undefined,
      bgmUrl: '',
      backgroundColor: '#000000',
      primaryKeyColor: '#000000',
      secondaryKeyColor: '#000000',
      primaryAccentColor: '#000000',
      secondaryAccentColor: '#000000',
      headerTextColor: '#000000',
      isActive: false,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = (url: string) => {
    if (!url) {
      toast.warning('URL을 입력해주세요');
      return;
    }

    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    } else {
      const newAudio = new Audio(url);
      newAudio.addEventListener('ended', () => setIsPlaying(false));
      newAudio.play();
      setAudio(newAudio);
      setIsPlaying(true);
    }
  };

  const handleFinish = async (formValue: GameFormValues) => {
    try {
      setIsLoading(true);
      const params: GameCreateParams = { ...formValue };

      if (game?.id) {
        await updateGame({ ...params, id: game.id });
        toast.success('수정되었습니다');
      } else {
        await createGame(params);
        toast.success('생성되었습니다');
      }
    } catch (e) {
      toast.error('에러가 발생했습니다');
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        handleClose();
        refetch();
      }, 500);
    }
  };

  const handleClose = () => {
    if (audio) {
      audio.pause();
      setAudio(null);
      setIsPlaying(false);
    }
    form.reset();
    close();
  };

  useEffect(() => {
    if (isOpen && game) {
      form.reset({
        type: game.type,
        name: game.name,
        stageScore: game.stageScore,
        playLimitLife: game.playLimitLife,
        timeLimitSecond: game.timeLimitSecond,
        dailyPlayLimit: game.dailyPlayLimit,
        ticketRechargeHeart: game.ticketRechargeHeart,
        ticketRechargeStar: game.ticketRechargeStar,
        bgmUrl: game.bgmUrl ?? '',
        backgroundColor: game.backgroundColor || '#000000',
        primaryKeyColor: game.primaryKeyColor || '#000000',
        secondaryKeyColor: game.secondaryKeyColor || '#000000',
        primaryAccentColor: game.primaryAccentColor || '#000000',
        secondaryAccentColor: game.secondaryAccentColor || '#000000',
        headerTextColor: game.headerTextColor || '#000000',
        isActive: game.isActive,
      });
    } else if (isOpen && !game) {
      form.reset();
    }
  }, [isOpen, game, form]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{game ? '게임 수정' : '게임 등록'}</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20'>
            <Loader2 className='h-8 w-8 animate-spin' />
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinish)} className='space-y-4'>
            <FormSection title={game ? '게임 수정' : '게임 등록'} description={game ? '게임 정보를 수정해주세요' : '등록할 게임 정보를 입력해주세요.'}>
              <FormGroup title='게임 타입*'>
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select value={field.value || ''} onValueChange={field.onChange} disabled={!!game}>
                          <SelectTrigger>
                            <SelectValue placeholder='선택' />
                          </SelectTrigger>
                          <SelectContent>
                            {GAME_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              <Separator className='my-4' />

              <FormGroup title='게임명*'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder='게임 제목을 입력해주세요.' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />
              <FormGroup title='스테이지 점수'>
                <FormField
                  control={form.control}
                  name='stageScore'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' placeholder='스테이지 점수를 입력해주세요.' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />
              <FormGroup title='라이프 제한'>
                <FormField
                  control={form.control}
                  name='playLimitLife'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' placeholder='라이프 제한을 입력해주세요.' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />
              <FormGroup title='제한시간 (초)'>
                <FormField
                  control={form.control}
                  name='timeLimitSecond'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' placeholder='제한시간을 입력해주세요.' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />
              <FormGroup title='일일 플레이 제한'>
                <FormField
                  control={form.control}
                  name='dailyPlayLimit'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' placeholder='일일 플레이 제한을 입력해주세요.' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />
              <FormGroup title='이용권 충전 (하트)'>
                <FormField
                  control={form.control}
                  name='ticketRechargeHeart'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' placeholder='하트 충전량을 입력해주세요.' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />
              <FormGroup title='이용권 충전 (별)'>
                <FormField
                  control={form.control}
                  name='ticketRechargeStar'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' placeholder='별 충전량을 입력해주세요.' {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />

              <FormGroup title='게임 배경음'>
                <FormField
                  control={form.control}
                  name='bgmUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className='flex gap-1'>
                          <Input placeholder='게임 배경음 URL을 입력해주세요.' {...field} className='flex-1' />
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='h-9 w-10 shrink-0'
                            onClick={() => handlePlayAudio(form.getValues('bgmUrl') || '')}
                          >
                            {isPlaying ? <PauseIcon className='h-4 w-4' /> : <PlayIcon className='h-4 w-4' />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
              <Separator className='my-4' />

              {COLOR_FIELDS.map(({ name, label }) => (
                <div key={name}>
                  <FormGroup title={label}>
                    <FormField
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className='flex items-center gap-2'>
                              <input
                                type='color'
                                value={field.value || '#000000'}
                                onChange={(e) => field.onChange(e.target.value)}
                                className='h-9 w-9 rounded border border-input cursor-pointer'
                              />
                              <Input
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                                placeholder='#000000'
                                className='w-32'
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormGroup>
                  <Separator className='my-4' />
                </div>
              ))}

              <FormGroup title='활성 상태'>
                <FormField
                  control={form.control}
                  name='isActive'
                  render={({ field }) => (
                    <FormItem className='flex items-center gap-2'>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </FormGroup>
            </FormSection>

            <div className='text-center'>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {game ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default GameFormModal;
