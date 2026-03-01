import { InboxIcon } from 'lucide-react';
import { useRef } from 'react';

interface CardUploaderProps {
  setFile: (file: File[]) => void;
  accept: string;
}

export const CardUploader = ({ setFile, accept }: CardUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile([e.target.files[0]]);
    } else {
      setFile([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile([e.dataTransfer.files[0]]);
    }
  };

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
        </div>
      </div>
    </div>
  );
};
