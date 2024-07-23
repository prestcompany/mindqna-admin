import { uploadAssets } from '@/client/assets';
import { Button, Upload, UploadProps, message } from 'antd';
import { RcFile } from 'antd/es/upload';
import { InboxIcon } from 'lucide-react';
import { useState } from 'react';

function AssetsForm() {
  const [images, setImages] = useState<RcFile[]>([]);

  const props: UploadProps = {
    accept: 'image/png, image/jpeg',
    name: 'file',
    multiple: true,
    listType: 'picture-card',
    onChange(info) {
      const { status } = info.file;
      if (status !== 'uploading') {
        console.log(info.file, info.fileList);
        setImages(info.fileList.map((file) => file.originFileObj as RcFile));
      }
      if (status === 'done') {
      } else if (status === 'error') {
        // message.error(`${info.file.name} file upload failed.`);
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  const upload = async () => {
    if (!images.length) return;
    try {
      await uploadAssets(images);
      window.location.reload();
    } catch (err) {
      message.error(`${err}`);
    }
  };

  return (
    <div>
      <Upload.Dragger {...props}>
        <div className='flex flex-col items-center justify-center gap-2'>
          <p className='items-center self-center'>
            <InboxIcon size={40} />
          </p>
          <p className='ant-upload-text'>Click or drag file to this area to upload</p>
          <p className='ant-upload-hint'>Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned files.</p>
        </div>
      </Upload.Dragger>
      <Button onClick={upload} size='large' type='primary' disabled={images.length <= 0}>
        업로드
      </Button>
    </div>
  );
}

export default AssetsForm;
