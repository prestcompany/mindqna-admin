import {
  createSquareLibrary,
  LibraryData,
  LibrarySubType,
  LibraryType,
  updateSquareLibrary,
} from '@/client/square-library';
import { Locale } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { subCategoryOptions } from './constants';

type Props = {
  init?: LibraryData;
  type: LibraryType;
  reload: () => Promise<any>;
  close: () => void;
};

function LibraryForm({ init, type, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [img, setImg] = useState<string>('');
  const [category, setCategory] = useState<LibraryType>(type);
  const [subCategory, setSubCategory] = useState<LibrarySubType>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [locale, setLocale] = useState<Locale>('ko');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!init) {
      setImg('');
      setFocusedId(undefined);
      setLocale('ko');
      setSubCategory(undefined);
      setTitle('');
      setContent('');
      setLink('');
      setIsActive(false);
      setIsFixed(false);
      setName('');
      return;
    }
    setImg(init.img ?? '');
    setFocusedId(init.id);
    setLocale(init.locale);
    setSubCategory(init.subCategory);
    setTitle(init.title);
    setContent(init.content || '');
    setLink(init.link || '');
    setIsActive(init.isActive);
    setIsFixed(init.isFixed);
    setName(init.name);
  }, [init]);

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateSquareLibrary(focusedId, {
          img,
          locale,
          subCategory,
          title,
          content,
          isFixed,
          link,
          isActive,
          name,
        });
      } else {
        await createSquareLibrary({
          name,
          img,
          category,
          subCategory: subCategory as LibrarySubType,
          title,
          content,
          link,
          isActive,
          isFixed,
          locale,
        });
      }

      await reload();
      setImg('');
      setFocusedId(undefined);
      setLocale('ko');
      setSubCategory(undefined);
      setTitle('');
      setContent('');
      setLink('');
      setIsActive(false);
      setIsFixed(false);
      setName('');
      close();
    } catch (err) {
      toast.error(`${err}`);
    }
    setLoading(false);
  };

  return (
    <>
      {isLoading && <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'><div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' /></div>}
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label>이미지</Label>
          <Input value={img} onChange={(e) => setImg(e.target.value)} />
        </div>
        <div className='space-y-2'>
          <Label>타입</Label>
          <RadioGroup
            value={subCategory}
            onValueChange={(v) => setSubCategory(v as LibrarySubType)}
            className='flex flex-wrap gap-4'
          >
            {subCategoryOptions[type]?.map((opt) => (
              <div key={opt.value} className='flex items-center gap-2'>
                <RadioGroupItem value={opt.value} id={`subcat-${opt.value}`} />
                <Label htmlFor={`subcat-${opt.value}`}>{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className='space-y-2'>
          <Label>이름</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className='space-y-2'>
          <Label>제목키</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className='space-y-2'>
          <Label>내용키</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <div className='space-y-2'>
          <Label>링크</Label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div className='space-y-2'>
          <Label>활성화</Label>
          <RadioGroup
            value={String(isActive)}
            onValueChange={(v) => setIsActive(v === 'true')}
            className='flex gap-4'
          >
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='true' id='active-true' />
              <Label htmlFor='active-true'>활성화</Label>
            </div>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='false' id='active-false' />
              <Label htmlFor='active-false'>비활성화</Label>
            </div>
          </RadioGroup>
        </div>
        <div className='space-y-2'>
          <Label>고정</Label>
          <RadioGroup
            value={String(isFixed)}
            onValueChange={(v) => setIsFixed(v === 'true')}
            className='flex gap-4'
          >
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='true' id='fixed-true' />
              <Label htmlFor='fixed-true'>고정</Label>
            </div>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='false' id='fixed-false' />
              <Label htmlFor='fixed-false'>고정 안함</Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={save} size='lg'>
          저장
        </Button>
      </div>
    </>
  );
}

export default LibraryForm;
