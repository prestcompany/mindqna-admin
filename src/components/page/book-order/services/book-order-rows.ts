import type { BookOrderValidation } from '../../../../client/types';

export type BookOrderRow = BookOrderValidation & { rowKey: string };

export function toBookOrderRows<Order>(orders: Order[]): (Order & { rowKey: string })[] {
  return orders.map((order, index) => ({ ...order, rowKey: String(index) }));
}
