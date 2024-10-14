import { uploadSingleFile } from '@/client/assets';
import { createCustomTemplate, updateCustomTemplate } from '@/client/custom';
import { createLocale } from '@/client/locale';
import { CreatePetCustomTemplateParams, ImgItem, PetCustomTemplate, PetCustomTemplateType, PetType } from '@/client/types';
import DefaultForm from '@/components/shared/form/ui/default-form';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Divider, Form, Image, Input, InputNumber, Modal, Radio, Spin, message } from 'antd';
import { RcFile } from 'antd/es/upload';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useState } from 'react';
import AssetsDrawer from '../assets/AssetsDrawer';
import { CardUploader } from '../card/CardUploader';

const Lottie = dynamic(() => import('react-lottie-player'), { ssr: false });

type CustomFormProps = {
  isOpen: boolean;
  init?: PetCustomTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

const typeOptions = [
  { label: '효과', value: 'effect' },
  { label: '옷장', value: 'closet' },
  { label: '짝궁', value: 'buddy' },
];

const petTypeOptions: { label: string; value: PetType }[] = [
  { label: '곰', value: 'bear' },
  { label: '고양이', value: 'cat' },
  { label: '강아지', value: 'dog' },
  { label: '펭귄', value: 'penguin' },
  { label: '병아리', value: 'chick' },
  { label: '토끼', value: 'rebbit' },
  { label: '햄스터', value: 'hamster' },
  { label: '다람쥐', value: 'squirrel' },
];

const premiumOptions = [
  { label: '스타', value: true },
  { label: '하트', value: false },
];

const CustomFormModal = ({ isOpen, init, reload, close }: CustomFormProps) => {
  const [form] = Form.useForm();
  const [isLoading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const [focusedId, setFocusedId] = useState<number | undefined>(undefined);

  const [image, setImage] = useState<ImgItem>();
  const [name, setName] = useState('');
  const [type, setType] = useState<PetCustomTemplateType>('buddy');
  const [petType, setPetType] = useState<PetType>('bear');
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

  const resetForm = useCallback(() => {
    form.resetFields();
    setFocusedId(undefined);
    setImage(undefined);
    setUploadFile(undefined);
    setAnimationData(undefined);
  }, [form]);

  useEffect(() => {
    if (!init) {
      resetForm();
      return;
    }

    setFocusedId(init.id);
    setType(init.type);
    if (init.name) setName(init.name);
    setPetLevel(init.petLevel);
    setPetType(init.petType);
    setIsPremium(init.isPaid);
    setIsActive(init.isActive);
    setPrice(init.price);

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
          petType: petType,
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
          petType: petType,
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
    <Modal closeIcon open={isOpen} onCancel={close} maskClosable={false} width={800} okText='저장' onOk={save}>
      {contextHolder}
      <Spin spinning={isLoading} fullscreen />
      <DefaultForm<CreatePetCustomTemplateParams> form={form}>
        <FormSection title={focusedId ? '펫 커스텀 수정' : '펫 커스텀 등록'} description='추가할 펫 커스텀 정보를 입력해주세요.'>
          <FormGroup title='이름*'>
            <Form.Item name='name' rules={[{ required: true, message: '' }]}>
              <Input placeholder='커스텀 명을 입력하세요.' value={name} onChange={(e) => setName(e.target.value)} />
            </Form.Item>
          </FormGroup>

          <Divider />
          {!focusedId && (
            <FormGroup title='다국어*'>
              <Form.Item name='ko' rules={[{ required: true, message: '' }]}>
                <Input placeholder='ko' value={valueKo} onChange={(e) => setValueKo(e.target.value)} />
              </Form.Item>
              <Form.Item name='en' rules={[{ required: true, message: '' }]}>
                <Input placeholder='en' value={valueEn} onChange={(e) => setValueEn(e.target.value)} />
              </Form.Item>
              <Form.Item name='ja' rules={[{ required: true, message: '' }]}>
                <Input placeholder='ja' value={valueJa} onChange={(e) => setValueJa(e.target.value)} />
              </Form.Item>
              <Form.Item name='zh' rules={[{ required: true, message: '' }]}>
                <Input placeholder='zh' value={valueZh} onChange={(e) => setValueZh(e.target.value)} />
              </Form.Item>
            </FormGroup>
          )}
          <FormGroup title='타입*'>
            <Form.Item name='type' rules={[{ required: true, message: '' }]}>
              <Radio.Group options={typeOptions} optionType='button' buttonStyle='solid' value={type} onChange={(e) => setType(e.target.value)} />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='펫 타입*'>
            <Form.Item name='petType' rules={[{ required: true, message: '' }]}>
              <Radio.Group options={petTypeOptions} optionType='button' buttonStyle='solid' value={petType} onChange={(e) => setPetType(e.target.value)} />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='펫 레벨*'>
            <Form.Item name='petLevel' rules={[{ required: true, message: '' }]}>
              <InputNumber type='number' min={0} max={16} value={petLevel} onChange={(value) => setPetLevel(value ?? 0)} />
            </Form.Item>
          </FormGroup>

          <Divider />

          {/* <FormGroup title='키 값*'>
            <Form.Item name='fileKey' rules={[{ required: true, message: '' }]}>
              <Input placeholder='로티 파일명으로 자동입력 됩니다.' value={fileKey} />
            </Form.Item>
          </FormGroup> */}

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
      </DefaultForm>
    </Modal>
  );
};

export default React.memo(CustomFormModal);
