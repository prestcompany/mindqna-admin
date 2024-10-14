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
        // URL을 프록시 경로로 변경
        const proxyUrl = `/s3-proxy${new URL(fileUrl).pathname}`;
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
