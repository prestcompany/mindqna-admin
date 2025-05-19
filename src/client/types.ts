import { RcFile } from 'antd/es/upload';

export type CreateCardTemplateParams = {
  name: string;
  locale: string;
  type: CardTemplateType;
  spaceTypes: SpaceType[];
  order?: number;
};

export type CreateBulkCardTemplatesParams = {
  locale: string;
  cardType: CardTemplateType;
  spaceType: SpaceType;
  file: RcFile;
};

export type UpdateCardTemplateParams = CreateCardTemplateParams & {
  templateId: number;
};

export type SpaceType = 'couple' | 'family' | 'friends' | 'alone';

export type CardTemplateType = 'basic' | 'random' | 'bonus';

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

export type Card = {
  id: number;
  templateId: number;
  spaceId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  space: Space;
  template: CardTemplate;
  comments: CardComment[];
  metas: CardMeta[];
  stat?: CardStat;
  replies: Reply[];
};

export type CardStat = {
  cardId: number;
  views: number;
  replies: number;
  comments: number;
  card: Card;
};

export type CardComment = {
  id: number;
  cardId: number;
  profileId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  card: Card;
  profile: Profile;
};

export type CardMeta = {
  id: number;
  cardId: number;
  profileId: string;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
  card: Card;
  profile: Profile;
};

export type Reply = {
  id: number;
  profileId: string;
  cardId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  card: Card;
  profile: Profile;
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

export type InteriorTemplateType = 'item' | 'wall' | 'floor' | 'todayFrame' | 'event';

export type CreateInteriorTemplateParams = {
  imgId: number;
  type: InteriorTemplateType;
  room: string;
  name: string;
  category: string;
  price: number;
  isPaid: boolean;
  isActive: boolean;
  width: number;
  height: number;
  disablePositions: string; // format (x,y) sperator " " | ex (0,0) (0,4)
};

export type InteriorTemplate = {
  id: number;
  type: InteriorTemplateType;
  name: string;
  room: string;
  category: string;
  price: number;
  isPaid: boolean;
  isActive: boolean;
  width: number;
  height: number;
  disablePositions: string;
  img: ImgItem;
  createdAt: string;
  updatedAt: string;
};

export type PetCustomTemplateType = 'effect' | 'closet' | 'buddy';

export type CreatePetCustomTemplateParams = {
  imgId: number;
  name: string;
  type: PetCustomTemplateType;
  order: number;
  petType: PetType | null;
  petLevel: number;
  fileKey: string;
  fileUrl: string;
  price: number;
  isPaid: boolean;
  isActive: boolean;
};

export type PetCustomTemplate = {
  id: number;
  name: string;
  type: PetCustomTemplateType;
  order: number;
  petType: PetType | null;
  petLevel: number;
  price: number;
  isPaid: boolean;
  isActive: boolean;
  img: ImgItem;
  fileKey: string;
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
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

export type GetInteriorTemplatesResult = {
  pageInfo: TotalPageInfo;
  templates: InteriorTemplate[];
};

export type GetPetCustomTemplatesResult = {
  pageInfo: TotalPageInfo;
  templates: PetCustomTemplate[];
};

export type CreateLocaleParams = {
  key: string;
  value: string;
  locale: Locale;
};

export type Locale = 'ko' | 'en' | 'zh' | 'ja' | 'zhTw' | 'es' | 'id';

export type GetLocalesResult = {
  pageInfo: TotalPageInfo;
  words: LocaleWord[];
};

export type LocaleWord = {
  id: number;
  locale: Locale;
  key: string;
  value: string;
  createdAt: string;
  updated: string;
};

export type CreateBubbleParams = {
  message: string;
  level: number;
  locale: Locale;
  type: BubbleType;
};

export type BubbleType = 'general' | 'day' | 'night' | 'custom';
export type BannerLocationType =
  | 'main_bottom'
  | 'main_right_small'
  | 'push_top'
  | 'wallet_charge_top'
  | 'wallet_charge'
  | 'main_poup'
  | 'square_library_top';

export type GetBubblesResult = {
  pageInfo: TotalPageInfo;
  items: PetBubble[];
};

export type PetBubble = {
  id: number;

  type: BubbleType;
  message: string;
  level: number;
  locale: Locale;

  heart: number;
  // interiorTemplateId In

  // customName            String?
  // customTargetDate      DateTime?
  // customTargetCardOrder Int?
  // customHasAction       Boolean?  @default(false)
};

export type CreateSnackParams = {
  imgId: number;
  kind: SnackKind;
  desc?: string;
  exp: number;
  name: string;
  price: number;
  type?: PetType;
  isPaid: boolean;
  order: number;
  isActive: boolean;
};

export type PetType = 'dog' | 'cat' | 'rebbit' | 'squirrel' | 'bear' | 'hamster' | 'chick' | 'penguin';
export type PetTypeForCustom = PetType | 'null';

export type GetSnacksResult = {
  pageInfo: TotalPageInfo;
  items: Snack[];
};

export type Snack = {
  id: number;
  name: string;
  desc?: string;
  type: PetType;
  exp: number;
  price: number;
  isPaid: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  Img: ImgItem;
  isActive: boolean;
  kind: SnackKind;
};

export type SnackKind = 'normal' | 'special';

export type GiveTicketParams = {
  username: string;
  amount: number;
  message: string;
  dueDayNum?: number;
};

export type GiveCoinParams = {
  spaceId: string;
  amount: number;
  isStar: boolean;
  message: string;
};

export type GiveCoinBulkParams = {
  spaceIds: string[];
  amount: number;
  isStar: boolean;
  message: string;
};

export type PurchaseMeta = {
  id: number;
  userId: string;
  username: string;
  platform: 'EVENT' | 'IOS' | 'EVENT';
  transactionId: string;
  productId: string;
  log?: string;
  isSuccess: boolean;
  isExpired: boolean;
  isProduction: boolean;

  createdAt: string;
};

export type User = {
  id: string;
  username: string;
  code: number;
  locale: string;
  spaceMaxCount: number;
  reserveUnregisterAt: string | null;
  createdAt: string;
  updateAt: string;

  socialAccount: SocialAccount;
  _count: {
    profiles: number;
  };

  // profiles: {
  //   _count: {
  //     PushMeta: number;
  //     cardCommentLikeMetas: number;
  //     cardComments: number;
  //     cardMetas: number;
  //     coinMetas: number;
  //     diaries: number;
  //     diaryCommentLikeMeta: number;
  //     diaryComments: number;
  //     diaryLikeMetas: number;
  //     diaryMemberMetas: number;
  //     goldClubMeta: number;
  //     premiumTickets: number;
  //     replies: number;
  //     spaceJoinMetas: number;
  //   };
  // }[];
};

export type QueryResultWithPagination<T> = {
  items: T[];
  pageInfo: TotalPageInfo;
};

export type SocialAccount = {
  userId: string;
  email: string;
  provider: string;
  socialId: string;
  createdAt: string;
  updatedAt: string;
};

export type Space = {
  id: string;
  coin: number;
  coinPaid: number;
  profiles: Profile[];
  rooms: Room[];
  pet: Pet;
  InteriorItem: InteriorItem[];
  cardOrder: number;
  cardGenDate: string;
  dueRemovedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  spaceInfo: SpaceInfo;
};

export type InteriorItem = {
  id: number;
  interiorTemplateId: number;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type SpaceInfo = {
  spaceId: string;
  ownerId: string;
  members: number;
  replies: number;
  type: string;
  name: string;
  petName: string;
  startedAt: string;
  locale: string;
  noticeTime: string;
  createdAt: string;
  updatedAt: string;
};

export type Profile = {
  id: string;
  spaceId: string;
  userId: string;
  nickname: string;
  img?: ImgItem;
  isAccepted: boolean;
  isPremium: boolean;
  isGoldClub: boolean;
  disabled: boolean;
  removed: boolean;
  removedAt?: string;
  renew: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
};

export type Pet = {
  level: number;
  exp: number;
  type?: PetType;

  isSnackable: boolean;
  isPatable: boolean;
};

export type Room = {
  id: number;
  category: RoomCategory;
  type: string;
  order: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type RoomCategory = 'rooftop' | 'inner' | 'outer';

export type AppRule = {
  id: number;
  key: string;
  value: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRuleParams = {
  key: string;
  value: number;
};

export type UpdateRuleParams = CreateRuleParams & {
  id: number;
  isActive: boolean;
};
