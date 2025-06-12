import client from './@base';
import { GetAssetsResult, ImgItem } from './types';

export async function getAssets(cursor: number) {
  const res = await client.get<GetAssetsResult>('/assets', { params: { cursor } });

  return res.data;
}

export async function getAsset(id: number) {
  const res = await client.get<ImgItem>(`/assets/${id}`);

  return res.data;
}

export async function uploadAssets(imges: File[]) {
  const formdata = new FormData();

  for (const image of imges) {
    // 한글 파일명을 영어/숫자로 변환
    const fileExtension = image.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedName = `img_${randomString}.${fileExtension}`;

    // 새 파일명으로 파일 생성
    const renamedFile = new File([image], sanitizedName, { type: image.type });

    formdata.append('images', renamedFile);
  }

  const res = await client.post<GetAssetsResult>('/assets', formdata);

  return res.data;
}

export async function uploadSingleFile(file: File) {
  const formdata = new FormData();

  // 한글 파일명을 영어/숫자로 변환
  const fileExtension = file.name.split('.').pop();
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedName = `file_${randomString}.${fileExtension}`;

  // 새 파일명으로 파일 생성
  const renamedFile = new File([file], sanitizedName, { type: file.type });

  formdata.append('file', renamedFile);

  const res = await client.post('/file-upload', formdata);

  return res.data;
}

export async function removeAsset(id: number) {
  const res = await client.delete(`/assets/${id}`);

  return res.data;
}
