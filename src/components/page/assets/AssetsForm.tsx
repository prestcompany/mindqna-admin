import { uploadAssets } from '@/client/assets';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Upload as UploadIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

function AssetsForm() {
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setImages((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const upload = async () => {
    if (!images.length) return;

    setUploading(true);
    try {
      await uploadAssets(images as any);
      toast.success(`${images.length}개 이미지가 성공적으로 업로드되었습니다.`);
      setImages([]);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error(`업로드 실패: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className='p-6 bg-white rounded-xl border border-gray-200 shadow-sm'>
      <div className='mb-6'>
        <div className='flex gap-3 items-center mb-2'>
          <div className='p-2 bg-blue-100 rounded-lg'>
            <UploadIcon size={20} className='text-blue-600' />
          </div>
          <h2 className='text-lg font-semibold text-gray-800'>이미지 업로드</h2>
        </div>
        <p className='text-sm text-gray-600'>PNG, JPEG, WebP 파일을 업로드할 수 있습니다.</p>
      </div>

      <div className='mb-6'>
        <div
          className='border-2 border-dashed border-border rounded-lg cursor-pointer transition-colors hover:border-blue-400'
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type='file'
            className='hidden'
            accept='image/png, image/jpeg, image/jpg, image/webp'
            multiple
            onChange={handleFileChange}
          />
          <div className='flex flex-col justify-center items-center py-8'>
            <div className='p-4 mb-4 bg-blue-50 rounded-full'>
              <ImageIcon size={32} className='text-blue-500' />
            </div>
            <p className='mb-2 text-lg font-medium text-gray-700'>이미지를 드래그하거나 클릭하여 업로드</p>
            <p className='text-sm text-gray-500'>여러 파일을 한 번에 선택할 수 있습니다</p>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className='p-4 mb-6 bg-gray-50 rounded-lg'>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-sm font-medium text-gray-700'>선택된 파일: {images.length}개</span>
            <Button size='sm' variant='ghost' onClick={handleClear} disabled={uploading}>
              전체 삭제
            </Button>
          </div>
          <div className='text-xs text-gray-500'>
            총 크기: {(images.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      )}

      {uploading && (
        <div className='mb-6'>
          <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
            <div className='h-full animate-pulse rounded-full bg-blue-500' style={{ width: '100%' }} />
          </div>
          <p className='mt-2 text-sm text-gray-600'>업로드 중...</p>
        </div>
      )}

      <div className='flex gap-3'>
        <Button
          onClick={upload}
          size='lg'
          disabled={images.length === 0 || uploading}
          className='flex-1 h-12'
        >
          <UploadIcon size={16} />
          {uploading ? '업로드 중...' : `${images.length > 0 ? `${images.length}개 파일 ` : ''}업로드`}
        </Button>
      </div>
    </div>
  );
}

export default AssetsForm;
