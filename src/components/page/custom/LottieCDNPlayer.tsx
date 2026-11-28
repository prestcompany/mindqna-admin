import { assetProxyPath } from '@/lib/s3-asset';
import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';

const Lottie = dynamic(() => import('react-lottie-player'), { ssr: false });

interface LottieCDNPlayerProps {
  fileUrl: string;
  width?: number;
  height?: number;
}

const LottieCDNPlayer: React.FC<LottieCDNPlayerProps> = ({ fileUrl, width = 150, height = 150 }) => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    const fetchAnimationData = async () => {
      try {
        // S3 는 CORS 가 없어 같은 출처의 /api/s3-asset 으로 받는다(어드민 Lottie JSON 만 통과).
        const proxyUrl = assetProxyPath(fileUrl);
        if (!proxyUrl) throw new Error(`Not a file URL: ${fileUrl}`);
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAnimationData(data);
      } catch (error) {
        console.error('Error fetching Lottie animation:', error);
      }
    };

    fetchAnimationData();
  }, [fileUrl]);

  if (!animationData) {
    return <div>Loading...</div>;
  }

  return <Lottie loop animationData={animationData} play style={{ width, height }} />;
};

export default LottieCDNPlayer;
