import { uploadSingleFile } from '@/client/assets';
import { createCustomTemplate, updateCustomTemplate } from '@/client/custom';
import { createLocale } from '@/client/locale';
import { CreatePetCustomTemplateParams, ImgItem, PetCustomTemplate, PetCustomTemplateType, PetTypeForCustom } from '@/client/types';
import DefaultForm from '@/components/shared/form/ui/default-form';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import DefaultModal from '@/components/shared/ui/default-modal';
import { Button, Divider, Form, Image, Input, InputNumber, Radio, Spin, message } from 'antd';
import { RcFile } from 'antd/es/upload';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useState } from 'react';
import AssetsDrawer from '../assets/AssetsDrawer';
import { CardUploader } from '../card/CardUploader';
import { PetCustomTypeOptions, petTypeOptions, premiumOptions } from './constant';

const Lottie = dynamic(() => import('react-lottie-player'), { ssr: false });

type CustomFormProps = {
  isOpen: boolean;
  init?: PetCustomTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

const CustomFormModal = ({ isOpen, init, reload, close }: CustomFormProps) => {
  const [form] = Form.useForm();
  const [isLoading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const [focusedId, setFocusedId] = useState<number | undefined>(undefined);

  const [image, setImage] = useState<ImgItem>();
  const [name, setName] = useState('');
  const [type, setType] = useState<PetCustomTemplateType>('buddy');
  const [petType, setPetType] = useState<PetTypeForCustom>('null');
  const [petLevel, setPetLevel] = useState(0);
  const [fileKey, setFileKey] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPremium, setIsPremium] = useState(true);
  const [price, setPrice] = useState(0);
  const [uploadFile, setUploadFile] = useState<RcFile>();
  const [animationData, setAnimationData] = useState<any>();
  const [valueKo, setValueKo] = useState('');
  const [valueEn, setValueEn] = useState('');
  const [valueJa, setValueJa] = useState('');
  const [valueZh, setValueZh] = useState('');

  const fields = [
    { name: 'name', value: name },
    { name: 'type', value: type },
    { name: 'petType', value: petType },
    { name: 'petLevel', value: petLevel },
    { name: 'isActive', value: isActive },
    { name: 'isPremium', value: isPremium },
    { name: 'price', value: price },
    { name: 'img', value: image },
    { name: 'file', value: uploadFile },
    { name: 'fileKey', value: fileKey },
  ];

  const resetForm = useCallback(() => {
    form.resetFields();
  }, [form]);

  useEffect(() => {
    if (!init) {
      resetForm();
      handleReset();
      return;
    }
    setFocusedId(init.id);
    setType(init.type);
    setName(init.name);
    setPetLevel(init.petLevel);
    setPetType(init.petType == null ? 'null' : init.petType);
    setIsPremium(init.isPaid);
    setIsActive(init.isActive);
    setPrice(init.price);
    setFileKey(init.fileKey);

    if (init.img) setImage(init.img);
  }, [init, form, resetForm]);

  const handleReset = () => {
    setFocusedId(undefined);
    setType('buddy');
    setName('');
    setPetLevel(0);
    setPetType('bear');
    setIsPremium(true);
    setIsActive(true);
    setPrice(0);
    setImage(undefined);
    setUploadFile(undefined);
    setAnimationData(undefined);
    setFileKey('');
    setValueKo('');
    setValueEn('');
    setValueJa('');
    setValueZh('');
  };

  const handleFile = (file: RcFile[]) => {
    if (file.length === 0) return;
    const selectedFile = file[0];
    setFileKey(selectedFile.name.split('.')[0]);
    setUploadFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (result) {
          const json = JSON.parse(result as string);
          setAnimationData(json);
        }
      } catch (error) {
        console.error('JSON 파싱 오류:', error);
        message.error('업로드한 파일이 유효한 JSON 형식인지 확인해주세요.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const save = async () => {
    const values = await form.validateFields();
    if (!image || !uploadFile) return;

    try {
      setLoading(true);
      const fileUrl = await uploadSingleFile(uploadFile);
      if (focusedId) {
        await updateCustomTemplate({
          id: focusedId,
          imgId: image.id,
          name: name,
          fileKey: fileKey,
          fileUrl: fileUrl,
          petLevel: petLevel,
          petType: petType == 'null' ? null : petType,
          isActive: isActive,
          isPaid: isPremium,
          price: price,
          type: type,
          order: 0,
        });
        messageApi.success('수정되었습니다');
      } else {
        await createCustomTemplate({
          imgId: image.id,
          name: name,
          fileKey: fileKey,
          fileUrl: fileUrl,
          petLevel: petLevel,
          petType: petType == 'null' ? null : petType,
          isActive: isActive,
          isPaid: isPremium,
          price: price,
          type: type,
          order: 0,
        });
        messageApi.success('생성되었습니다');
        await createLocale({
          key: fileKey,
          locale: 'ko',
          value: valueKo,
        });
        await createLocale({
          key: fileKey,
          locale: 'en',
          value: valueEn,
        });
        await createLocale({
          key: fileKey,
          locale: 'ja',
          value: valueJa,
        });
        await createLocale({
          key: fileKey,
          locale: 'zh',
          value: valueZh,
        });
      }
    } catch (err) {
      message.error(`${err}`);
    } finally {
      setTimeout(async () => {
        await reload();
        handleReset();
        resetForm();
        setLoading(false);
        close();
      }, 500);
    }
  };

  return (
    <DefaultModal handleHide={close} open={isOpen} maskClosable={false} width={800}>
      {contextHolder}
      <Spin spinning={isLoading} fullscreen />
      <DefaultForm<CreatePetCustomTemplateParams> form={form} fields={fields}>
        <FormSection title={focusedId ? '펫 커스텀 수정' : '펫 커스텀 등록'} description='추가할 펫 커스텀 정보를 입력해주세요.'>
          <FormGroup title='이름*'>
            <Form.Item name='name' rules={[{ required: true, message: '' }]}>
              <Input placeholder='커스텀 명을 입력하세요.' onChange={(e) => setName(e.target.value)} />
            </Form.Item>
          </FormGroup>

          <Divider />
          {!focusedId && (
            <FormGroup title='다국어*'>
              <Form.Item name='ko' rules={[{ required: true, message: '' }]}>
                <Input placeholder='ko' onChange={(e) => setValueKo(e.target.value)} />
              </Form.Item>
              <Form.Item name='en' rules={[{ required: true, message: '' }]}>
                <Input placeholder='en' onChange={(e) => setValueEn(e.target.value)} />
              </Form.Item>
              <Form.Item name='ja' rules={[{ required: true, message: '' }]}>
                <Input placeholder='ja' onChange={(e) => setValueJa(e.target.value)} />
              </Form.Item>
              <Form.Item name='zh' rules={[{ required: true, message: '' }]}>
                <Input placeholder='zh' onChange={(e) => setValueZh(e.target.value)} />
              </Form.Item>
            </FormGroup>
          )}
          <FormGroup title='타입*'>
            <Form.Item name='type' rules={[{ required: true, message: '' }]}>
              <Radio.Group options={PetCustomTypeOptions} optionType='button' buttonStyle='solid' onChange={(e) => setType(e.target.value)} />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='펫 타입*'>
            <Form.Item name='petType' rules={[{ required: true, message: '' }]}>
              <Radio.Group options={petTypeOptions} optionType='button' buttonStyle='solid' onChange={(e) => setPetType(e.target.value)} />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='펫 레벨*'>
            <Form.Item name='petLevel' rules={[{ required: true, message: '' }]}>
              <InputNumber type='number' min={0} max={16} onChange={(value) => setPetLevel(value ?? 0)} />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='키 값*'>
            <Form.Item name='fileKey' rules={[{ required: true, message: '' }]}>
              <Input placeholder='로티 파일명으로 자동입력 됩니다.' disabled={!focusedId} />
            </Form.Item>
          </FormGroup>

          <FormGroup title='결제 설정*'>
            <div className='flex items-center gap-6'>
              <Form.Item name='isPremium' rules={[{ required: true, message: '' }]}>
                <Radio.Group
                  options={premiumOptions}
                  optionType='button'
                  buttonStyle='solid'
                  value={isPremium}
                  onChange={(e) => setIsPremium(e.target.value)}
                />
              </Form.Item>
              <Form.Item name='price' rules={[{ required: true, message: '' }]}>
                <InputNumber type='number' min={0} placeholder='금액' onChange={(value) => setPrice(value ?? 0)} />
              </Form.Item>
            </div>
          </FormGroup>

          <Divider />

          <FormGroup title='활성화*'>
            <Form.Item name='isActive' rules={[{ required: true, message: '' }]}>
              <Radio.Group
                options={[
                  { label: '활성화', value: true },
                  { label: '비활성화', value: false },
                ]}
                optionType='button'
                buttonStyle='solid'
                onChange={(e) => setIsActive(e.target.value)}
              />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='썸네일*'>
            <Form.Item name='img'>
              <AssetsDrawer onClick={setImage} />
            </Form.Item>
            <Form.Item>{image && <Image width={100} height={100} src={image.uri} alt='img' style={{ objectFit: 'contain' }} />}</Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='로티 파일*'>
            <Form.Item name='file'>
              {!animationData && <CardUploader setFile={handleFile} accept='.json' />}
              {animationData && <Lottie loop animationData={animationData} play style={{ width: 150, height: 150 }} />}
            </Form.Item>
          </FormGroup>
        </FormSection>
        <div className='text-center'>
          <Button htmlType='submit' type='primary' loading={isLoading} onClick={save}>
            저장
          </Button>
        </div>
      </DefaultForm>
    </DefaultModal>
  );
};

export default React.memo(CustomFormModal);
