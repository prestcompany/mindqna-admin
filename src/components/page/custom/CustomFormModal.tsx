import DefaultForm from '@/components/shared/form/ui/default-form';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import DefaultModal from '@/components/shared/ui/default-modal';
import { Button, Divider, Form, Image, Input, InputNumber, Radio, Spin, message } from 'antd';
import React, { useEffect, useState } from 'react';
import AssetsDrawer from '../assets/AssetsDrawer';
import AnimationFileUploader from './components/AnimationFileUploader';
import LocaleInputGroup from './components/LocaleInputGroup';
import { PetCustomTypeOptions, petTypeOptions, premiumOptions } from './constant';
import { useAnimationFile } from './hooks/useAnimationFile';
import { useCustomForm } from './hooks/useCustomForm';
import { saveCustomTemplate } from './services/customService';
import { CustomFormProps, LocaleTexts } from './types';

const CustomFormModal: React.FC<CustomFormProps> = ({ isOpen, init, reload, close }) => {
  const [isLoading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [localeData, setLocaleData] = useState<LocaleTexts>({
    ko: '',
    en: '',
    es: '',
    ja: '',
    zh: '',
    zhTw: '',
    id: '',
  });

  const { form, formData, focusedId, fields, hasFile, updateFormData, setFileUploaded, resetForm } =
    useCustomForm(init);

  const { fileState, loadExistingAnimation, handleFileUpload, resetToExisting, removeFile, resetFile } =
    useAnimationFile();

  // 초기 데이터 로드시 기존 파일 불러오기
  useEffect(() => {
    if (init?.fileUrl) {
      loadExistingAnimation(init.fileUrl);
    } else {
      resetFile();
    }
  }, [init?.fileUrl, loadExistingAnimation, resetFile]);

  // 파일 상태 변경 시 Form 상태 동기화
  useEffect(() => {
    const hasFileUploaded = !!(fileState.animationData || fileState.existingFileUrl);
    setFileUploaded(hasFileUploaded);
  }, [fileState.animationData, fileState.existingFileUrl, setFileUploaded]);

  const handleFileUploadWithKey = (files: any[]) => {
    handleFileUpload(files, (key) => {
      if (!focusedId) {
        updateFormData({ fileKey: key });
      }
    });
  };

  const handleRemoveFile = () => {
    removeFile();
    // 신규 생성 시 fileKey도 초기화
    if (!focusedId) {
      updateFormData({ fileKey: '' });
    }
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
      setLoading(true);

      await saveCustomTemplate({
        formData,
        locale: localeData,
        fileState,
        focusedId,
      });

      messageApi.success(focusedId ? '수정되었습니다' : '생성되었습니다');

      setTimeout(async () => {
        await reload();
        resetForm();
        resetFile();
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
      message.error(`${err}`);
      setLoading(false);
    }
  };

  const handleLocaleChange = (updates: Partial<LocaleTexts>) => {
    setLocaleData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <DefaultModal handleHide={close} open={isOpen} maskClosable={false} width={900}>
      {contextHolder}
      <Spin spinning={isLoading} fullscreen />

      <DefaultForm form={form} fields={fields}>
        <FormSection
          title={focusedId ? '펫 커스텀 수정' : '펫 커스텀 등록'}
          description='추가할 펫 커스텀 정보를 입력해주세요.'
        >
          <FormGroup title='이름*'>
            <Form.Item name='name' rules={[{ required: true, message: '이름은 필수입니다.' }]}>
              <Input
                placeholder='커스텀 명을 입력하세요.'
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
              />
            </Form.Item>
          </FormGroup>

          <Divider />

          {!focusedId && (
            <FormGroup title='다국어*'>
              <LocaleInputGroup locale={localeData} onLocaleChange={handleLocaleChange} />
            </FormGroup>
          )}

          <FormGroup title='타입*'>
            <Form.Item name='type' rules={[{ required: true, message: '타입은 필수입니다.' }]}>
              <Radio.Group
                options={PetCustomTypeOptions}
                optionType='button'
                buttonStyle='solid'
                value={formData.type}
                onChange={(e) => updateFormData({ type: e.target.value })}
              />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='펫 타입*'>
            <Form.Item name='petType' rules={[{ required: true, message: '펫 타입은 필수입니다.' }]}>
              <Radio.Group
                options={petTypeOptions}
                optionType='button'
                buttonStyle='solid'
                value={formData.petType}
                onChange={(e) => updateFormData({ petType: e.target.value })}
              />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='펫 레벨*'>
            <Form.Item name='petLevel' rules={[{ required: true, message: '펫 레벨은 필수입니다.' }]}>
              <InputNumber
                type='number'
                min={0}
                max={16}
                value={formData.petLevel}
                onChange={(value) => updateFormData({ petLevel: value ?? 0 })}
              />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='키 값*'>
            <Form.Item name='fileKey' rules={[{ required: true, message: '키 값은 필수입니다.' }]}>
              <Input
                placeholder='로티 파일명으로 자동입력 됩니다.'
                disabled={!focusedId}
                value={formData.fileKey}
                onChange={(e) => updateFormData({ fileKey: e.target.value })}
              />
            </Form.Item>
          </FormGroup>

          <FormGroup title='결제 설정*'>
            <div className='flex items-center gap-6'>
              <Form.Item name='isPremium' rules={[{ required: true, message: '결제 설정은 필수입니다.' }]}>
                <Radio.Group
                  options={premiumOptions}
                  optionType='button'
                  buttonStyle='solid'
                  value={formData.isPremium}
                  onChange={(e) => updateFormData({ isPremium: e.target.value })}
                />
              </Form.Item>
              <Form.Item name='price' rules={[{ required: true, message: '가격은 필수입니다.' }]}>
                <InputNumber
                  type='number'
                  min={0}
                  placeholder='금액'
                  value={formData.price}
                  onChange={(value) => updateFormData({ price: value ?? 0 })}
                />
              </Form.Item>
            </div>
          </FormGroup>

          <Divider />

          <FormGroup title='활성화*'>
            <Form.Item name='isActive' rules={[{ required: true, message: '활성화 설정은 필수입니다.' }]}>
              <Radio.Group
                options={[
                  { label: '활성화', value: true },
                  { label: '비활성화', value: false },
                ]}
                optionType='button'
                buttonStyle='solid'
                value={formData.isActive}
                onChange={(e) => updateFormData({ isActive: e.target.value })}
              />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='썸네일*'>
            <Form.Item name='img' rules={[{ required: true, message: '썸네일은 필수입니다.' }]}>
              <AssetsDrawer onClick={(image) => updateFormData({ image })} />
            </Form.Item>
            {formData.image && (
              <Form.Item>
                <div className='relative inline-block'>
                  <Image width={100} height={100} src={formData.image.uri} alt='img' style={{ objectFit: 'contain' }} />
                  <Button
                    type='text'
                    danger
                    size='small'
                    className='absolute bg-white shadow-md -top-2 -right-2'
                    onClick={() => updateFormData({ image: undefined })}
                  >
                    ✕
                  </Button>
                </div>
                <div className='mt-2 text-sm text-gray-500'>
                  {(() => {
                    const fileName = formData.image.uri.split('/').pop() || '';
                    const imgPart = fileName.includes('img') ? 'img' + fileName.split('img')[1] : fileName;
                    return imgPart || `이미지 ID: ${formData.image.id}`;
                  })()}
                </div>
              </Form.Item>
            )}
          </FormGroup>

          <Divider />

          <FormGroup title='로티 파일*'>
            <Form.Item
              name='file'
              rules={[
                {
                  required: !focusedId,
                  message: '로티 파일은 필수입니다.',
                  validator: async (_, value) => {
                    if (!focusedId && !hasFile) {
                      throw new Error('로티 파일을 업로드해주세요.');
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <AnimationFileUploader
                fileState={fileState}
                isEditMode={!!focusedId}
                onFileUpload={handleFileUploadWithKey}
                onResetToExisting={resetToExisting}
                onRemoveFile={handleRemoveFile}
              />
            </Form.Item>
          </FormGroup>
        </FormSection>

        <div className='text-center'>
          <Button htmlType='submit' type='primary' loading={isLoading} onClick={handleSave}>
            저장
          </Button>
        </div>
      </DefaultForm>
    </DefaultModal>
  );
};

export default React.memo(CustomFormModal);
