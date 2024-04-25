import client from "./@base";
import { GetAssetsResult } from "./types";

export async function getAssets(cursor: number) {
  const res = await client.get<GetAssetsResult>("/assets", { params: { cursor } });

  return res.data;
}

export async function uploadAssets(imges: File[]) {
  const formdata = new FormData();

  for (const image of imges) {
    formdata.append("images", image);
  }

  const res = await client.post<GetAssetsResult>("/assets", formdata);

  return res.data;
}

export async function removeAsset(id: number) {
  const res = await client.delete(`/assets/${id}`);

  return res.data;
}
