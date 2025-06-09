import { Upload, UploadProps } from 'antd';
import { RcFile } from 'antd/es/upload';
import { InboxIcon } from 'lucide-react';

interface CardUploaderProps {
  setFile: (file: RcFile[]) => void;
  accept: string;
}

export const CardUploader = ({ setFile, accept }: CardUploaderProps) => {
  const props: UploadProps = {
    accept,
    name: 'file',
    multiple: false,
    maxCount: 1,
    beforeUpload: () => false,
    onChange(info) {
      const { status } = info.file;

      if (info.fileList.length > 0) {
        const latestFile = info.fileList[info.fileList.length - 1];
        if (latestFile.originFileObj) {
          setFile([latestFile.originFileObj as RcFile]);
        }
      } else {
        setFile([]);
      }

      if (status === 'error') {
        console.error(`${info.file.name} file upload failed.`);
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  return (
    <div className='flex'>
      <Upload.Dragger {...props}>
        <div className='flex flex-col items-center justify-center gap-2'>
          <p className='items-center self-center'>
            <InboxIcon size={40} />
          </p>
          <p>업로드할 파일을 드래그하거나 해당 영역을 클릭하세요!</p>
        </div>
      </Upload.Dragger>
    </div>
  );
};
