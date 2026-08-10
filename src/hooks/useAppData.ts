import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchData, saveAllData } from '../utils/api';
import { migrateEnelBaseCost, migrateMonthDiscounts } from '../utils/calculations';
import { ensureCostDefaults } from '../utils/costDefaults';
import type { AppData, Member, MonthData, Settings } from '../types';

export const QUERY_KEY = ['appData'] as const;

function migrateSettings(settings: Settings): { settings: Settings; changed: boolean } {
  const ensured = ensureCostDefaults(settings);
  return {
    settings: ensured,
    changed: !settings.costDefaults,
  };
}

async function fetchAndMigrateData(): Promise<AppData> {
  const data = await fetchData();
  const { data: baseMigrated, changed: baseChanged } = migrateEnelBaseCost(data);
  const { data: discountMigrated, changed: discountChanged } = migrateMonthDiscounts(baseMigrated);
  const { settings, changed: costDefaultsChanged } = migrateSettings(discountMigrated.settings);
  const migrated: AppData = { ...discountMigrated, settings };
  if (baseChanged || discountChanged || costDefaultsChanged) {
    await saveAllData(migrated);
  }
  return migrated;
}

/** Shared query – fetches the full AppData from JSONBin */
export function useAppData() {
  return useQuery<AppData>({
    queryKey: QUERY_KEY,
    queryFn: fetchAndMigrateData,
  });
}

/** Save a single month with optimistic cache update */
export function useSaveMonth() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ monthKey, monthData }: { monthKey: string; monthData: MonthData }) => {
      // Build full payload from current cache
      const prev = qc.getQueryData<AppData>(QUERY_KEY);
      if (!prev) throw new Error('No cached data');
      const next: AppData = {
        ...prev,
        months: { ...prev.months, [monthKey]: monthData },
      };
      return saveAllData(next);
    },

    onMutate: async ({ monthKey, monthData }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<AppData>(QUERY_KEY);
      if (previous) {
        qc.setQueryData<AppData>(QUERY_KEY, {
          ...previous,
          months: { ...previous.months, [monthKey]: monthData },
        });
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/** Save updated members array with optimistic cache update */
export function useSaveMembers() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (members: Member[]) => {
      const prev = qc.getQueryData<AppData>(QUERY_KEY);
      if (!prev) throw new Error('No cached data');
      const next: AppData = { ...prev, members };
      return saveAllData(next);
    },

    onMutate: async (members: Member[]) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<AppData>(QUERY_KEY);
      if (previous) {
        qc.setQueryData<AppData>(QUERY_KEY, { ...previous, members });
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/** Save updated settings with optimistic cache update */
export function useSaveSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Settings) => {
      const prev = qc.getQueryData<AppData>(QUERY_KEY);
      if (!prev) throw new Error('No cached data');
      const next: AppData = { ...prev, settings };
      return saveAllData(next);
    },

    onMutate: async (settings: Settings) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<AppData>(QUERY_KEY);
      if (previous) {
        qc.setQueryData<AppData>(QUERY_KEY, { ...previous, settings });
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/** Delete a month with optimistic cache update */
export function useDeleteMonth() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (monthKey: string) => {
      const prev = qc.getQueryData<AppData>(QUERY_KEY);
      if (!prev) throw new Error('No cached data');
      const { [monthKey]: _, ...rest } = prev.months;
      const next: AppData = { ...prev, months: rest };
      return saveAllData(next);
    },

    onMutate: async (monthKey: string) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<AppData>(QUERY_KEY);
      if (previous) {
        const { [monthKey]: _, ...rest } = previous.months;
        qc.setQueryData<AppData>(QUERY_KEY, { ...previous, months: rest });
      }
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
