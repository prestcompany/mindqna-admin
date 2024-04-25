export type CreateCardTemplateParams = {
  name: string;
  locale: string;
  type: CardTemplateType;
  spaceTypes: SpaceType[];
};

export type UpdateCardTemplateParams = CreateCardTemplateParams & {
  templateId: number;
};

export type SpaceType = "couple" | "family" | "friends" | "alone";

export type CardTemplateType = "basic" | "random" | "bonus";

export type TotalPageInfo = {
  totalPage: number;
};

export type CardTemplate = {
  id: number;
  order: number;
  locale: string;
  name: string;
  spaceType: SpaceType;
  type: CardTemplateType;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GetCardTemplatesParams = {
  page: number;
  type?: CardTemplateType[];
  spaceType?: SpaceType[];
  locale?: string[];
};

export type GetCardTemplatesResult = {
  pageInfo: TotalPageInfo;
  templates: CardTemplate[];
};

export type InteriorTemplateType = "item" | "todayFrame";

export type CreateInteriorTemplateParams = {
  img: File;
  type: InteriorTemplateType;
  name: string;
  category: string;
  price: number;
  isPaid: boolean;
  width: number;
  height: number;
  disablePositions: string; // format (x,y) sperator " " | ex (0,0) (0,4)
};

export type ImgItem = {
  id: number;
  uri: string;
  createdAt: string;
};

export type PageInfo = {
  hasNext: boolean;
  endCursor: number | undefined;
};

export type GetAssetsResult = {
  pageInfo: PageInfo;
  imgs: ImgItem[];
};
