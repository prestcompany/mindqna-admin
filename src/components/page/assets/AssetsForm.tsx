import { uploadAssets } from '@/client/assets';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Upload as UploadIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

function AssetsForm() {
  const queryClient = useQueryClient();
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
      toast.success(`이미지 ${images.length}개를 업로드했습니다.`);
      setImages([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // 전체 새로고침 대신 목록 쿼리만 무효화한다.
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
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

  const totalSizeMb = (images.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2);

  return (
    <section className='w-full overflow-hidden rounded-lg border border-border bg-card'>
      <div className='border-b border-border px-6 py-4'>
        <h2 className='text-base font-semibold tracking-heading text-foreground'>이미지 업로드</h2>
        <p className='mt-1 text-sm text-muted-foreground'>PNG · JPEG · WebP 파일을 올릴 수 있습니다.</p>
      </div>

      <div className='space-y-4 px-6 py-4'>
        <div
          role='button'
          tabIndex={0}
          className='cursor-pointer rounded-lg border border-dashed border-border transition-colors duration-fast hover:border-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type='file'
            className='hidden'
            accept='image/png, image/jpeg, image/jpg, image/webp'
            multiple
            onChange={handleFileChange}
          />
          <div className='flex flex-col items-center justify-center gap-2 py-8'>
            <ImageIcon size={24} className='text-mute' aria-hidden='true' />
            <p className='text-sm font-medium text-foreground'>이미지를 끌어다 놓거나 클릭해서 선택하세요</p>
            <p className='text-xs text-muted-foreground'>여러 파일을 한 번에 선택할 수 있습니다</p>
          </div>
        </div>

        {images.length > 0 && (
          <div className='flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-3'>
            <div className='min-w-0'>
              <span className='text-sm font-medium text-foreground'>선택한 파일 {images.length}개</span>
              <span className='ml-2 text-xs tabular-nums text-muted-foreground'>{totalSizeMb} MB</span>
            </div>
            <Button size='sm' variant='ghost' onClick={handleClear} disabled={uploading}>
              전체 해제
            </Button>
          </div>
        )}

        {uploading && (
          <div className='space-y-2'>
            <Progress value={100} className='h-1' />
            <p className='text-sm text-muted-foreground'>업로드 중…</p>
          </div>
        )}

        <div className='flex justify-end'>
          <Button onClick={upload} disabled={images.length === 0 || uploading}>
            <UploadIcon size={16} aria-hidden='true' />
            {uploading ? '업로드 중…' : images.length > 0 ? `${images.length}개 업로드` : '업로드'}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default AssetsForm;
