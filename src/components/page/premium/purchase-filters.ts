export type PaymentFilters = {
  search?: string;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  isProduction?: boolean;
  isSubscribe?: boolean;
  startDate?: string;
  endDate?: string;
  purchaseStatus?: 'success' | 'failed' | 'expired';
  entitlementStatus?: 'active' | 'expired';
};
