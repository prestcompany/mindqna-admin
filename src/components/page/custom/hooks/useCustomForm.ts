import { PetCustomTemplate } from '@/client/types';
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
  const [formData, setFormData] = useState<CustomFormData>(initialFormData);
  const [focusedId, setFocusedId] = useState<number | undefined>();
  const [hasFile, setHasFile] = useState(false);

  const updateFormData = useCallback((updates: Partial<CustomFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const setFileUploaded = useCallback((uploaded: boolean) => {
    setHasFile(uploaded);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setFocusedId(undefined);
    setHasFile(false);
  }, []);

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

  return {
    formData,
    focusedId,
    hasFile,
    updateFormData,
    setFileUploaded,
    resetForm,
  };
};
