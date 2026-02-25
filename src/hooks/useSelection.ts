import { useState } from "react";

interface UseSelectionReturn {
  selectedIds: Set<string>;
  toggle(id: string): void;
  toggleGroup(groupItemIds: string[]): void;
  toggleAll(allIds: string[]): void;
  clear(): void;
  isSelected(id: string): boolean;
  isGroupAllSelected(groupItemIds: string[]): boolean;
  isAllSelected(allIds: string[]): boolean;
  count: number;
}

export function useSelection(): UseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleGroup(groupItemIds: string[]): void {
    setSelectedIds((prev) => {
      const allSelected = groupItemIds.length > 0 && groupItemIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        groupItemIds.forEach((id) => next.delete(id));
      } else {
        groupItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleAll(allIds: string[]): void {
    setSelectedIds((prev) => {
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      if (allSelected) {
        return new Set();
      }
      return new Set(allIds);
    });
  }

  function clear(): void {
    setSelectedIds(new Set());
  }

  function isSelected(id: string): boolean {
    return selectedIds.has(id);
  }

  function isGroupAllSelected(groupItemIds: string[]): boolean {
    return groupItemIds.length > 0 && groupItemIds.every((id) => selectedIds.has(id));
  }

  function isAllSelected(allIds: string[]): boolean {
    return allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  }

  return {
    selectedIds,
    toggle,
    toggleGroup,
    toggleAll,
    clear,
    isSelected,
    isGroupAllSelected,
    isAllSelected,
    count: selectedIds.size,
  };
}
