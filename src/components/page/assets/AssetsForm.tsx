import { uploadAssets } from '@/client/assets';
import { Button, message, Progress, Upload, UploadProps } from 'antd';
import { RcFile } from 'antd/es/upload';
import { Image as ImageIcon, Upload as UploadIcon } from 'lucide-react';
import { useState } from 'react';

function AssetsForm() {
  const [images, setImages] = useState<RcFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const props: UploadProps = {
    accept: 'image/png, image/jpeg, image/jpg, image/webp',
    name: 'file',
    multiple: true,
    listType: 'picture-card',
    beforeUpload: () => false, // 자동 업로드 방지
    onChange(info) {
      setImages(info.fileList.map((file) => file.originFileObj as RcFile).filter(Boolean));
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  const upload = async () => {
    if (!images.length) return;

    setUploading(true);
    try {
      await uploadAssets(images);
      message.success(`${images.length}개 이미지가 성공적으로 업로드되었습니다.`);
      setImages([]);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      message.error(`업로드 실패: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setImages([]);
  };

  return (
    <div className='p-6 bg-white rounded-xl border border-gray-200 shadow-sm'>
      {/* 헤더 */}
      <div className='mb-6'>
        <div className='flex gap-3 items-center mb-2'>
          <div className='p-2 bg-blue-100 rounded-lg'>
            <UploadIcon size={20} className='text-blue-600' />
          </div>
          <h2 className='text-lg font-semibold text-gray-800'>이미지 업로드</h2>
        </div>
        <p className='text-sm text-gray-600'>PNG, JPEG, WebP 파일을 업로드할 수 있습니다.</p>
      </div>

      {/* 업로드 영역 */}
      <div className='mb-6'>
        <Upload.Dragger {...props} className='transition-colors hover:border-blue-400'>
          <div className='flex flex-col justify-center items-center py-8'>
            <div className='p-4 mb-4 bg-blue-50 rounded-full'>
              <ImageIcon size={32} className='text-blue-500' />
            </div>
            <p className='mb-2 text-lg font-medium text-gray-700'>이미지를 드래그하거나 클릭하여 업로드</p>
            <p className='text-sm text-gray-500'>여러 파일을 한 번에 선택할 수 있습니다</p>
          </div>
        </Upload.Dragger>
      </div>

      {/* 선택된 파일 정보 */}
      {images.length > 0 && (
        <div className='p-4 mb-6 bg-gray-50 rounded-lg'>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-sm font-medium text-gray-700'>선택된 파일: {images.length}개</span>
            <Button size='small' type='text' onClick={handleClear} disabled={uploading}>
              전체 삭제
            </Button>
          </div>
          <div className='text-xs text-gray-500'>
            총 크기: {(images.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      )}

      {/* 업로드 진행률 */}
      {uploading && (
        <div className='mb-6'>
          <Progress percent={100} status='active' />
          <p className='mt-2 text-sm text-gray-600'>업로드 중...</p>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className='flex gap-3'>
        <Button
          onClick={upload}
          type='primary'
          size='large'
          disabled={images.length === 0 || uploading}
          loading={uploading}
          icon={<UploadIcon size={16} />}
          className='flex-1 h-12'
        >
          {uploading ? '업로드 중...' : `${images.length > 0 ? `${images.length}개 파일 ` : ''}업로드`}
        </Button>
      </div>
    </div>
  );
}

export default AssetsForm;
