// Minimal store implementation that avoids external dependencies.
// This provides an initializeWorkStore factory that returns a per-request store on the server
// and a single shared instance on the client. It exposes a tiny subscribe/getState/setState API.

export type WorkState = {
  initialized: boolean;
  data?: any;
  setData: (d: any) => void;
};

function createWorkStore(preloadedState: Partial<WorkState> = {}) {
  let state: WorkState = {
    initialized: true,
    data: undefined,
    setData: (d: any) => {
      setState({ data: d });
    },
    ...preloadedState,
  } as WorkState;

  const listeners = new Set<() => void>();

  function getState() {
    return state;
  }

  function setState(partial: Partial<WorkState>) {
    state = Object.assign({}, state, partial);
    for (const l of Array.from(listeners)) l();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe } as const;
}

let clientStore: ReturnType<typeof createWorkStore> | undefined;

export function initializeWorkStore(preloadedState: Partial<WorkState> = {}) {
  if (typeof window === "undefined") {
    // Server: always create a fresh store
    return createWorkStore(preloadedState);
  }

  // Client: reuse a single store instance
  if (!clientStore) {
    clientStore = createWorkStore(preloadedState);
  } else if (preloadedState && Object.keys(preloadedState).length) {
    // Merge incoming preloaded state into the client store
    clientStore.setState(preloadedState as Partial<WorkState>);
  }
  return clientStore;
}
