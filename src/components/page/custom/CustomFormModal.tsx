import DefaultModal from '@/components/shared/ui/default-modal';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import AssetsDrawer from '../assets/AssetsDrawer';
import AnimationFileUploader from './components/AnimationFileUploader';
import LocaleInputGroup from './components/LocaleInputGroup';
import { PetCustomTypeOptions, petTypeOptions, premiumOptions } from './constant';
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
      console.log(err);
      toast.error(`${err}`);
      setLoading(false);
    }
  };

  const handleLocaleChange = (updates: Partial<LocaleTexts>) => {
    setLocaleData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <DefaultModal handleHide={close} open={isOpen} className='max-w-[900px]'>
      {isLoading && <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'><div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' /></div>}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className='space-y-4'>
          <FormSection
            title={focusedId ? '펫 커스텀 수정' : '펫 커스텀 등록'}
            description='추가할 펫 커스텀 정보를 입력해주세요.'
          >
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

            <Separator />

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
                        className='flex gap-2'
                      >
                        {PetCustomTypeOptions.map((opt) => (
                          <div key={opt.value} className='flex items-center gap-1.5'>
                            <RadioGroupItem value={opt.value} id={`type-${opt.value}`} />
                            <Label htmlFor={`type-${opt.value}`}>{opt.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <Separator />

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
                        className='flex flex-wrap gap-2'
                      >
                        {petTypeOptions.map((opt) => (
                          <div key={opt.value} className='flex items-center gap-1.5'>
                            <RadioGroupItem value={opt.value} id={`petType-${opt.value}`} />
                            <Label htmlFor={`petType-${opt.value}`}>{opt.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <Separator />

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

            <Separator />

            <FormGroup title='키 값*'>
              <FormField
                control={form.control}
                name='fileKey'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder='로티 파일명으로 자동입력 됩니다.'
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

            <FormGroup title='결제 설정*'>
              <div className='flex items-center gap-6'>
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
                          className='flex gap-2'
                        >
                          {premiumOptions.map((opt) => (
                            <div key={String(opt.value)} className='flex items-center gap-1.5'>
                              <RadioGroupItem value={String(opt.value)} id={`isPremium-${opt.value}`} />
                              <Label htmlFor={`isPremium-${opt.value}`}>{opt.label}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>
            </FormGroup>

            <Separator />

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
                        className='flex gap-2'
                      >
                        <div className='flex items-center gap-1.5'>
                          <RadioGroupItem value='true' id='isActive-true' />
                          <Label htmlFor='isActive-true'>활성화</Label>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <RadioGroupItem value='false' id='isActive-false' />
                          <Label htmlFor='isActive-false'>비활성화</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <Separator />

            <FormGroup title='썸네일*'>
              <FormField
                control={form.control}
                name='img'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AssetsDrawer onClick={(image) => {
                        updateFormData({ image });
                        field.onChange(image);
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {formData.image && (
                <div>
                  <div className='relative inline-block'>
                    <img width={100} height={100} src={formData.image.uri} alt='img' className='object-contain' />
                    <Button
                      variant='ghost'
                      size='sm'
                      type='button'
                      className='absolute bg-white shadow-md -top-2 -right-2 text-destructive'
                      onClick={() => {
                        updateFormData({ image: undefined });
                        form.setValue('img', undefined);
                      }}
                    >
                      X
                    </Button>
                  </div>
                  <div className='mt-2 text-sm text-gray-500'>
                    {(() => {
                      const fileName = formData.image.uri.split('/').pop() || '';
                      const imgPart = fileName.includes('img') ? 'img' + fileName.split('img')[1] : fileName;
                      return imgPart || `이미지 ID: ${formData.image.id}`;
                    })()}
                  </div>
                </div>
              )}
            </FormGroup>

            <Separator />

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

          <div className='text-center'>
            <Button type='submit' disabled={isLoading}>
              저장
            </Button>
          </div>
        </form>
      </Form>
    </DefaultModal>
  );
};

export default React.memo(CustomFormModal);
