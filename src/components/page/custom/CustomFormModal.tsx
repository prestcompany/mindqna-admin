import DefaultModal from '@/components/shared/ui/default-modal';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import AssetsDrawer from '../assets/AssetsDrawer';
import AnimationFileUploader from './components/AnimationFileUploader';
import LocaleInputGroup from './components/LocaleInputGroup';
import { PetCustomTypeOptions, petTypeOptions, premiumOptions } from './constants';
import { useAnimationFile } from './hooks/useAnimationFile';
import { useCustomForm } from './hooks/useCustomForm';
import { saveCustomTemplate } from './services/customService';
import { CustomFormProps, LocaleTexts } from './types';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';

const customFormSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다.'),
  type: z.string().min(1, '타입은 필수입니다.'),
  petType: z.string().min(1, '펫 타입은 필수입니다.'),
  petLevel: z.coerce.number({ required_error: '펫 레벨은 필수입니다.' }).min(0).max(16),
  fileKey: z.string().min(1, '키 값은 필수입니다.'),
  isPremium: z.string().min(1, '결제 설정은 필수입니다.'),
  price: z.coerce.number({ required_error: '가격은 필수입니다.' }).min(0),
  isActive: z.string().min(1, '활성화 설정은 필수입니다.'),
  img: z.any().optional(),
  file: z.any().optional(),
});

type CustomFormValues = z.infer<typeof customFormSchema>;

const CustomFormModal: React.FC<CustomFormProps> = ({ isOpen, init, reload, close }) => {
  const [isLoading, setLoading] = useState(false);
  const [localeData, setLocaleData] = useState<LocaleTexts>({
    ko: '',
    en: '',
    es: '',
    ja: '',
    zh: '',
    zhTw: '',
    id: '',
  });

  const { formData, focusedId, hasFile, updateFormData, setFileUploaded, resetForm } =
    useCustomForm(init);

  const form = useForm<CustomFormValues>({
    resolver: zodResolver(customFormSchema),
    defaultValues: {
      name: '',
      type: 'buddy',
      petType: 'bear',
      petLevel: 0,
      fileKey: '',
      isPremium: 'true',
      price: 0,
      isActive: 'true',
      img: undefined,
      file: undefined,
    },
  });

  useEffect(() => {
    if (init) {
      form.reset({
        name: init.name,
        type: init.type,
        petType: init.petType ?? 'bear',
        petLevel: init.petLevel,
        fileKey: init.fileKey,
        isPremium: String(init.isPaid),
        price: init.price,
        isActive: String(init.isActive),
        img: init.img,
        file: 'uploaded',
      });
    } else {
      form.reset({
        name: '',
        type: 'buddy',
        petType: 'bear',
        petLevel: 0,
        fileKey: '',
        isPremium: 'true',
        price: 0,
        isActive: 'true',
        img: undefined,
        file: undefined,
      });
    }
  }, [init, form]);

  const { fileState, loadExistingAnimation, handleFileUpload, resetToExisting, removeFile, resetFile } =
    useAnimationFile();

  useEffect(() => {
    if (init?.fileUrl) {
      loadExistingAnimation(init.fileUrl);
    } else {
      resetFile();
    }
  }, [init?.fileUrl, loadExistingAnimation, resetFile]);

  useEffect(() => {
    const hasFileUploaded = !!(fileState.animationData || fileState.existingFileUrl);
    setFileUploaded(hasFileUploaded);
    if (hasFileUploaded) {
      form.setValue('file', 'uploaded');
    }
  }, [fileState.animationData, fileState.existingFileUrl, setFileUploaded, form]);

  const handleFileUploadWithKey = (files: any[]) => {
    handleFileUpload(files, (key) => {
      if (!focusedId) {
        updateFormData({ fileKey: key });
        form.setValue('fileKey', key);
      }
    });
  };

  const handleRemoveFile = () => {
    removeFile();
    form.setValue('file', undefined);
    if (!focusedId) {
      updateFormData({ fileKey: '' });
      form.setValue('fileKey', '');
    }
  };

  const handleSave = async (values: CustomFormValues) => {
    if (!focusedId && !hasFile) {
      form.setError('file', { message: '로티 파일을 업로드해주세요.' });
      return;
    }

    try {
      setLoading(true);

      await saveCustomTemplate({
        formData: {
          ...formData,
          name: values.name,
          type: values.type as any,
          petType: values.petType as any,
          petLevel: values.petLevel,
          fileKey: values.fileKey,
          isPremium: values.isPremium === 'true',
          price: values.price,
          isActive: values.isActive === 'true',
        },
        locale: localeData,
        fileState,
        focusedId,
      });

      toast.success(focusedId ? '수정되었습니다' : '생성되었습니다');

      setTimeout(async () => {
        await reload();
        resetForm();
        resetFile();
        form.reset();
        setLocaleData({
          ko: '',
          en: '',
          es: '',
          ja: '',
          zh: '',
          zhTw: '',
          id: '',
        });
        setLoading(false);
        close();
      }, 500);
    } catch (err) {
      toast.error(`${err}`);
      setLoading(false);
    }
  };

  const handleLocaleChange = (updates: Partial<LocaleTexts>) => {
    setLocaleData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <DefaultModal handleHide={close} open={isOpen} className='w-[calc(100vw-1rem)] sm:max-w-[920px] max-h-[90vh] overflow-hidden p-0'>
      {isLoading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className='flex max-h-[90vh] flex-col'>
          <div className='border-b px-6 py-4'>
            <h2 className='pr-8 text-base font-semibold tracking-tight'>{focusedId ? '펫 커스텀 수정' : '펫 커스텀 등록'}</h2>
            <p className='mt-1 text-sm text-muted-foreground'>추가할 펫 커스텀 정보를 입력해주세요.</p>
          </div>

          <div className='flex-1 space-y-4 overflow-y-auto px-6 py-5'>
            <FormSection title='기본 정보'>
              <FormGroup title='이름*'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder='커스텀 명을 입력하세요.'
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData({ name: e.target.value });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              {!focusedId && (
                <FormGroup title='다국어*'>
                  <LocaleInputGroup locale={localeData} onLocaleChange={handleLocaleChange} />
                </FormGroup>
              )}

              <FormGroup title='타입*'>
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            updateFormData({ type: v as any });
                          }}
                          className='grid grid-cols-2 gap-2 sm:grid-cols-3'
                        >
                          {PetCustomTypeOptions.map((opt) => (
                            <div key={opt.value}>
                              <RadioGroupItem value={opt.value} id={`type-${opt.value}`} className='peer sr-only' />
                              <Label
                                htmlFor={`type-${opt.value}`}
                                className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              <FormGroup title='펫 타입*'>
                <FormField
                  control={form.control}
                  name='petType'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            updateFormData({ petType: v as any });
                          }}
                          className='grid grid-cols-2 gap-2 sm:grid-cols-4'
                        >
                          {petTypeOptions.map((opt) => (
                            <div key={opt.value}>
                              <RadioGroupItem value={opt.value} id={`petType-${opt.value}`} className='peer sr-only' />
                              <Label
                                htmlFor={`petType-${opt.value}`}
                                className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              <FormGroup title='펫 레벨*'>
                <FormField
                  control={form.control}
                  name='petLevel'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          max={16}
                          className='w-full sm:w-[220px]'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : 0;
                            field.onChange(val);
                            updateFormData({ petLevel: val });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              <FormGroup title='키 값*' description='신규 생성 시 로티 파일 업로드 이름으로 자동 입력됩니다.'>
                <FormField
                  control={form.control}
                  name='fileKey'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder='로티 파일명으로 자동 입력됩니다.'
                          disabled={!focusedId}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData({ fileKey: e.target.value });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
            </FormSection>

            <FormSection title='판매/노출 설정'>
              <FormGroup title='결제 설정*'>
                <FormField
                  control={form.control}
                  name='isPremium'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            updateFormData({ isPremium: v === 'true' });
                          }}
                          className='grid grid-cols-2 gap-2 sm:max-w-[280px]'
                        >
                          {premiumOptions.map((opt) => (
                            <div key={String(opt.value)}>
                              <RadioGroupItem value={String(opt.value)} id={`isPremium-${opt.value}`} className='peer sr-only' />
                              <Label
                                htmlFor={`isPremium-${opt.value}`}
                                className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              <FormGroup title='가격*'>
                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder='금액'
                          className='w-full sm:w-[220px]'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : 0;
                            field.onChange(val);
                            updateFormData({ price: val });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              <FormGroup title='활성화*'>
                <FormField
                  control={form.control}
                  name='isActive'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            updateFormData({ isActive: v === 'true' });
                          }}
                          className='grid grid-cols-2 gap-2 sm:max-w-[280px]'
                        >
                          <div>
                            <RadioGroupItem value='true' id='isActive-true' className='peer sr-only' />
                            <Label
                              htmlFor='isActive-true'
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                            >
                              활성화
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value='false' id='isActive-false' className='peer sr-only' />
                            <Label
                              htmlFor='isActive-false'
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                            >
                              비활성화
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
            </FormSection>

            <FormSection title='미디어'>
              <FormGroup title='썸네일*'>
                <FormField
                  control={form.control}
                  name='img'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <AssetsDrawer
                          onClick={(image) => {
                            updateFormData({ image });
                            field.onChange(image);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {formData.image && (
                  <div>
                    <div className='relative inline-flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed border-border/60 bg-transparent p-2'>
                      <img src={formData.image.uri} alt='custom-thumbnail' className='h-full w-full object-contain' />
                      <Button
                        variant='ghost'
                        size='sm'
                        type='button'
                        className='absolute -right-2 -top-2 bg-background/90 shadow-md text-destructive'
                        onClick={() => {
                          updateFormData({ image: undefined });
                          form.setValue('img', undefined);
                        }}
                      >
                        X
                      </Button>
                    </div>
                    <div className='mt-2 text-sm text-muted-foreground'>
                      {(() => {
                        const fileName = formData.image.uri.split('/').pop() || '';
                        const imgPart = fileName.includes('img') ? 'img' + fileName.split('img')[1] : fileName;
                        return imgPart || `이미지 ID: ${formData.image.id}`;
                      })()}
                    </div>
                  </div>
                )}
              </FormGroup>

              <FormGroup title='로티 파일*'>
                <FormField
                  control={form.control}
                  name='file'
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <AnimationFileUploader
                          fileState={fileState}
                          isEditMode={!!focusedId}
                          onFileUpload={handleFileUploadWithKey}
                          onResetToExisting={resetToExisting}
                          onRemoveFile={handleRemoveFile}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
            </FormSection>
          </div>

          <div className='border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {focusedId ? '변경사항 저장' : '커스텀 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </DefaultModal>
  );
};

export default React.memo(CustomFormModal);
