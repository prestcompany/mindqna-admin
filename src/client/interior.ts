import client from "./@base";
import { CreateInteriorTemplateParams } from "./types";

export async function createInteriorTemplate(params: CreateInteriorTemplateParams) {
  const { img, name, isPaid, height, price, type, width, category, disablePositions } = params;

  const formData = new FormData();

  formData.append("img", img);
  formData.append("name", name);
  formData.append("isPaid", String(isPaid)); // boolean을 문자열로 변환
  formData.append("height", String(height));
  formData.append("price", String(price));
  formData.append("type", type);
  formData.append("width", String(width));
  formData.append("category", category);
  formData.append("disablePositions", disablePositions);

  const res = await client.post("/interior", formData);

  return res.data;
}
