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
  file: File;
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

export type ImgType = 'asset' | 'interiorTemplate' | 'petCustomTemplate' | 'petSnack' | 'profileId';

export type ImgItem = {
  id: number;
  uri: string;
  type: ImgType;
  createdAt: string;
  diaryId?: number;
  interiorTemplateId?: number;
  petCustomTemplateId?: number;
  petSnackId?: number;
  profileId?: string;
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
  | 'main_popup'
  | 'square_library_top'
  | 'partner_charge';

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

export type RevokeTicketParams = {
  username: string;
  amount: number;
  message: string;
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

export type GiveCoinBulkFailureReason = 'not_found' | 'insufficient_balance';

export type GiveCoinBulkFailure = {
  spaceId: string;
  success: false;
  reason: GiveCoinBulkFailureReason;
};

export type GiveCoinBulkResult = GiveCoinBulkFailure[] | { success: boolean };

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

export type UserSummary = {
  id: string;
  username: string;
  code: number;
  locale: string;
  spaceMaxCount: number;
  reserveUnregisterAt: string | null;
  createdAt: string;
  updateAt: string;
  representativeNickname?: string | null;
  socialAccount: SocialAccountSummary;
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

export type UserDetail = Omit<UserSummary, 'socialAccount'> & {
  latestAccessAt?: string | null;
  ticketSummary?: UserTicketSummary;
  socialAccount: SocialAccount;
};

export type User = UserDetail;

export type UserTicketSummary = {
  owned: number;
  applied: number;
  unapplied: number;
  used: number;
  expired: number;
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

export type SocialAccountSummary = Pick<SocialAccount, 'email' | 'provider'>;

export type Space = {
  id: string;
  coin: number;
  coinPaid: number;
  pet: Pet;
  cardOrder: number;
  cardGenDate: string | null;
  dueRemovedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  latestCardIssuedAt?: string | null;
  hasPremiumMember?: boolean;
  hasGoldClubMember?: boolean;
  spaceInfo: SpaceInfo;
  profiles: Profile[];
  rooms: Room[];
  InteriorItem: InteriorItem[];
};

export type SpaceCoinHistoryMeta = {
  id: number;
  spaceId: string;
  profileId?: string | null;
  isPaid: boolean;
  amount: number;
  isUse: boolean;
  description?: string | null;
  createdAt: string;
  profile?: Partial<Pick<Profile, 'id' | 'nickname'>> & {
    user?: Partial<Pick<User, 'id' | 'username'>>;
  };
};

export type UpdateSpaceParams = {
  name?: string;
  petName?: string;
  type?: SpaceType;
  startedAt?: string;
  locale?: Locale;
  noticeTime?: string;
  isActive?: boolean;
  dueRemovedAt?: string | null;
};

export type SpaceDetail = Space & {
  recentCoinMetas: SpaceCoinHistoryMeta[];
};

export type SearchPageResult<T> = {
  items: T[];
  totalCount: number;
  pageInfo: TotalPageInfo;
};

export type SpaceCardRow = {
  id: number;
  templateId: number;
  order: number;
  createdAt: string;
  replyCount: number;
  commentCount: number;
};

export type SpaceCardReply = {
  id: number;
  content: string;
  createdAt: string;
  profile?: { id: string; nickname: string } | null;
};

export type SpaceCardRepliesResult = {
  id: number;
  order: number;
  createdAt: string;
  templateName: string | null;
  replies: SpaceCardReply[];
};

export type SpaceCoinRow = {
  id: number;
  isPaid: boolean;
  amount: number;
  isUse: boolean;
  description?: string | null;
  createdAt: string;
  profile?: { id: string; nickname: string; user?: { id: string; username: string } } | null;
};

export type SpaceMemberRow = {
  id: string;
  nickname: string;
  userId: string;
  isPremium: boolean;
  isGoldClub: boolean;
  disabled: boolean;
  removed: boolean;
  removedAt: string | null;
  createdAt: string;
  user?: { id: string; username: string };
  img?: { uri: string } | null;
};

export type SpaceMembersResult = {
  ownerId: string | null;
  profiles: SpaceMemberRow[];
};

export type SpacePremiumTicket = {
  id: number;
  platform: string;
  productId: string;
  dueAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type SpaceMemberDetail = {
  profile: {
    id: string;
    nickname: string;
    createdAt: string;
    disabled: boolean;
    removed: boolean;
    removedAt: string | null;
    isPremium: boolean;
    isGoldClub: boolean;
    user?: { id: string; username: string };
  };
  counts: {
    replyCount: number;
    diaryCount: number;
    scheduleCount: number;
    cardCommentCount: number;
    diaryCommentCount: number;
  };
  coin: { given: number; used: number };
  premiumTickets: SpacePremiumTicket[];
};

export type SpaceDiaryRow = {
  id: number;
  date: string;
  emotion: string;
  createdAt: string;
  profile?: { id: string; nickname: string };
  commentCount: number;
  likeCount: number;
};

export type SpaceDiaryDetail = SpaceDiaryRow & {
  content: string;
};

export type SpaceDiaryStats = {
  total: number;
  byEmotion: { emotion: string; count: number }[];
};

export type SpaceScheduleRow = {
  id: number;
  title: string;
  startedAt: string;
  endedAt: string;
  color: string;
  intervalType: string;
  createdAt: string;
  profile?: { id: string; nickname: string };
};

export type SpaceScheduleDetail = {
  id: number;
  title: string;
  startedAt: string;
  endedAt: string;
  color: string;
  memo: string | null;
  intervalType: string;
  intervalEndedAt: string | null;
  createdAt: string;
  profile?: { id: string; nickname: string };
  items: { id: number; date: string }[];
  memberMetas: { id: number; profile?: { id: string; nickname: string } }[];
};

export type SpacePetInteriorResult = {
  pet: { type: string | null; level: number; exp: number; updatedAt: string } | null;
  customs: {
    id: number;
    petCustomTemplateId: number;
    customType: string;
    isEquipped: boolean;
    template?: { name: string | null; type: string; img?: { uri: string } | null } | null;
  }[];
  rooms: { id: number; category: string; type: string; name: string; order: number }[];
  interiorItems: {
    id: number;
    interiorTemplateId: number;
    createdAt: string;
    template?: { name: string; category: string; type: string; img?: { uri: string } | null } | null;
  }[];
};

export type SpaceAccessRow = {
  id: number;
  userId: string;
  heart: number;
  createdAt: string;
  user?: { username: string } | null;
};

export type SpaceAdsRow = {
  id: number;
  userId: string;
  description: string | null;
  createdAt: string;
  user?: { username: string } | null;
};

export type SpaceActivityResult = SearchPageResult<SpaceAccessRow> & { recentAds: SpaceAdsRow[] };

export type SpaceActivitySummary = {
  access7d: number;
  diary30d: number;
  lastCard: { order: number; replyCount: number; activeMembers: number; rate: number } | null;
};

export type CoinDirectionSum = { given: number; used: number; net: number };

export type CoinStatWindow = {
  days: number;
  current: CoinDirectionSum;
  previous: CoinDirectionSum;
  changeRate: number | null;
};

export type SpaceCoinStatsResult = { week: CoinStatWindow; month: CoinStatWindow };

export type CardEligibilityCheck = { key: string; label: string; passed: boolean; detail?: string | null };

export type CardEligibilityStatus =
  | 'issuable'
  | 'waitingSchedule'
  | 'waitingParticipation'
  | 'inactive'
  | 'needsMembers'
  | 'noTemplate'
  | 'scheduledRemoval'
  | 'error';

export type CardEligibilityResult = {
  canIssue: boolean;
  status: CardEligibilityStatus;
  cardOrder: number;
  nextGenAt: string | null;
  activeMembers: number;
  lastCard: { order: number; replyCount: number } | null;
  checks: CardEligibilityCheck[];
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

export type AppPlatform = 'ios' | 'android';

export type AppVersionPolicy = {
  platform: AppPlatform;
  minVersionCode: number;
  minVersionName: string;
  forceEnabled: boolean;
  updatedAt: string;
};

export type AppVersionPolicies = { ios: AppVersionPolicy | null; android: AppVersionPolicy | null };

export type UpdateAppVersionParams = Omit<AppVersionPolicy, 'platform' | 'updatedAt'>;

export type UserTabPageResult<T> = {
  items: T[];
  totalCount: number;
  pageInfo: { totalPage: number };
};

export type UserProfileRow = {
  id: string;
  nickname: string;
  spaceId: string | null;
  spaceName: string | null;
  isPremium: boolean;
  isGoldClub: boolean;
  disabled: boolean;
  removed: boolean;
  createdAt: string;
};

export type UserPurchaseRow = {
  id: number;
  productId: string;
  platform: string;
  price: string;
  isSubscribe: boolean;
  createdAt: string;
};

// PremiumTicket.dueAt은 nullable, GoldClub.dueAt은 non-null이지만 공유 타입은 nullable로 둔다.
export type UserEntitlementTicket = {
  id: number;
  productId: string;
  platform: string;
  isActive: boolean;
  dueAt: string | null;
  profileId: string | null;
  createdAt: string;
};

export type UserSubscriptionRow = {
  id: number;
  productId: string;
  platform: string;
  transactionId: string;
  createdAt: string;
};

export type UserEntitlements = {
  premiumTickets: UserEntitlementTicket[];
  goldClubs: UserEntitlementTicket[];
  subscriptions: UserSubscriptionRow[];
};

export type UserAccessRow = {
  id: number;
  spaceId: string;
  spaceName: string | null;
  heart: number;
  createdAt: string;
};

export type UserPushRow = {
  id: number;
  title: string;
  desc: string | null;
  isChecked: boolean;
  spaceId: string | null;
  createdAt: string;
};

export type LiveSubscriptionStatus =
  | 'active'
  | 'grace'
  | 'billingRetry'
  | 'expired'
  | 'revoked'
  | 'canceled'
  | 'error';

export type LiveSubscriptionRow = {
  id: number;
  platform: 'IOS' | 'AOS';
  productId: string;
  status: LiveSubscriptionStatus;
  expiresAt: string | null;
  autoRenew: boolean | null;
};
