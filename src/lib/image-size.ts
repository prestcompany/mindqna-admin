/** 그림 원본 px. 읽지 못하면 reject 한다. */
export function readImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve({ width: img.naturalWidth, height: img.naturalHeight });
      else reject(new Error('그림 크기를 읽지 못했습니다.'));
    };
    img.onerror = () => reject(new Error('그림 크기를 읽지 못했습니다.'));
    img.src = uri;
  });
}
