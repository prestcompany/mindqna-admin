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

export type PageInfo = {
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
  pageInfo: PageInfo;
  templates: CardTemplate[];
};
