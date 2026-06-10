import { create } from "zustand";
import { getSession, signOut, subscribeSession, type Session } from "./auth";

interface WalletSessionState {
  session: Session | null;
  refreshSession: () => void;
  clearSession: () => void;
}

export const useWalletSessionStore = create<WalletSessionState>((set) => ({
  session: getSession(),
  refreshSession: () => set({ session: getSession() }),
  clearSession: () => {
    signOut();
    set({ session: null });
  },
}));

let subscribed = false;

export function ensureWalletSessionStoreSubscription(): void {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  subscribeSession(() => useWalletSessionStore.getState().refreshSession());
}
