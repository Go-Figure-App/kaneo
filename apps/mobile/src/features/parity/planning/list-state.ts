import { isAccessError } from "../foundation/access-error";
import { uniquePageItems } from "./unique-page-items";

export function planningListState<T extends { id: string }>(query: {
  data?: { pages: Array<{ items: T[] }> };
  isSuccess: boolean;
  error: unknown;
}) {
  const items = isAccessError(query.error)
    ? []
    : uniquePageItems(query.data?.pages);
  return { items, showEmpty: query.isSuccess && items.length === 0 };
}
