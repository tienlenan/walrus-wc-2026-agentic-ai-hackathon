import { create } from "zustand";
import { getGameSnapshot, syncGameIndex, type GameSnapshot } from "./game-api";

interface GameSnapshotState {
  snapshot: GameSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<GameSnapshot>;
  syncIndex: () => Promise<GameSnapshot>;
}

async function loadSnapshot(
  set: (state: Partial<GameSnapshotState>) => void,
  loader: () => Promise<GameSnapshot>,
): Promise<GameSnapshot> {
  set({ loading: true, error: null });
  try {
    const snapshot = await loader();
    set({ snapshot, loading: false, error: null });
    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    set({ loading: false, error: message });
    throw error;
  }
}

export const useGameSnapshotStore = create<GameSnapshotState>((set) => ({
  snapshot: null,
  loading: false,
  error: null,
  refresh: () => loadSnapshot(set, getGameSnapshot),
  syncIndex: () => loadSnapshot(set, async () => (await syncGameIndex()).snapshot),
}));
