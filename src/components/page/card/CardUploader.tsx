import { getCardUploaderFileMeta } from '@/components/page/card/services/card-uploader-file-meta';
import { InboxIcon } from 'lucide-react';
import { useRef, useState } from 'react';

interface CardUploaderProps {
  setFile: (file: File[]) => void;
  accept: string;
}

export const CardUploader = ({ setFile, accept }: CardUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSelectFile = (file?: File | null) => {
    if (file) {
      setSelectedFile(file);
      setFile([file]);
      return;
    }

    setSelectedFile(null);
    setFile([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSelectFile(e.target.files?.[0] ?? null);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleSelectFile(e.dataTransfer.files?.[0] ?? null);
  };

  const fileMeta = getCardUploaderFileMeta(selectedFile);

  return (
    <div className='flex'>
      <div
        className='flex-1 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer transition-colors hover:border-primary'
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type='file'
          className='hidden'
          accept={accept}
          onChange={handleFileChange}
        />
        <div className='flex flex-col items-center justify-center gap-2'>
          <p className='items-center self-center'>
            <InboxIcon size={40} />
          </p>
          <p>업로드할 파일을 드래그하거나 해당 영역을 클릭하세요!</p>
          <p className='text-xs text-muted-foreground'>지원 형식: {accept.replaceAll(',', ', ')}</p>
          {fileMeta ? (
            <div className='mt-2 w-full max-w-sm rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-center'>
              <p className='truncate text-sm font-medium text-foreground'>{fileMeta.name}</p>
              <p className='text-xs text-muted-foreground'>{fileMeta.sizeText}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
