import { Locale, PetCustomTemplate } from '@/client/types';
import { Form } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { CustomFormData } from '../types';

const initialFormData: CustomFormData = {
  name: '',
  type: 'buddy',
  petType: 'bear',
  petLevel: 0,
  fileKey: '',
  isActive: true,
  isPremium: true,
  price: 0,
};

export const useCustomForm = (init?: PetCustomTemplate) => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<CustomFormData>(initialFormData);
  const [locale, setLocale] = useState<Locale>('ko');
  const [focusedId, setFocusedId] = useState<number | undefined>();
  const [hasFile, setHasFile] = useState(false);

  const updateFormData = useCallback((updates: Partial<CustomFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateLocale = useCallback((locale: Locale) => {
    setLocale(locale);
  }, []);

  const setFileUploaded = useCallback((uploaded: boolean) => {
    setHasFile(uploaded);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setLocale('ko');
    setFocusedId(undefined);
    setHasFile(false);
    form.resetFields();
  }, [form]);

  const loadInitialData = useCallback(() => {
    if (!init) {
      resetForm();
      return;
    }

    setFocusedId(init.id);
    setFormData({
      name: init.name,
      type: init.type,
      petType: init.petType ?? 'bear',
      petLevel: init.petLevel,
      fileKey: init.fileKey,
      isActive: init.isActive,
      isPremium: init.isPaid,
      price: init.price,
      image: init.img,
    });

    setHasFile(true);
  }, [init, resetForm]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Form fields for Ant Design
  const fields = [
    { name: 'name', value: formData.name },
    { name: 'type', value: formData.type },
    { name: 'petType', value: formData.petType },
    { name: 'petLevel', value: formData.petLevel },
    { name: 'isActive', value: formData.isActive },
    { name: 'isPremium', value: formData.isPremium },
    { name: 'price', value: formData.price },
    { name: 'img', value: formData.image },
    { name: 'fileKey', value: formData.fileKey },
    { name: 'file', value: hasFile ? 'uploaded' : '' },
  ];

  return {
    form,
    formData,
    locale,
    focusedId,
    fields,
    hasFile,
    updateFormData,
    updateLocale,
    setFileUploaded,
    resetForm,
  };
};
