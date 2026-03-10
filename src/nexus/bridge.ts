import { nexusEngine } from "@/nexus/engine";
import { useStore } from "@/core/state/store";
import type { NexusEvent, SourceHealth } from "@/nexus/types";

let initialized = false;
let unsubscribeEngine: (() => void) | null = null;
let healthInterval: ReturnType<typeof setInterval> | null = null;

export function initNexusBridge() {
  if (initialized) return;
  initialized = true;

  unsubscribeEngine = nexusEngine.onEvents((events: NexusEvent[]) => {
    useStore.setState({
      nexusLiveEvents: events,
      nexusSignalCount: nexusEngine.getSignals().length,
      nexusLastUpdate: new Date(),
    });
  });

  healthInterval = setInterval(() => {
    useStore.setState({ nexusSourceHealth: nexusEngine.getSourceHealth() });
  }, 15_000);

  useStore.setState({
    nexusSourceHealth: nexusEngine.getSourceHealth(),
    nexusLiveEvents: nexusEngine.getEvents(),
    nexusSignalCount: 0,
    nexusLastUpdate: new Date(),
  });
}

export function destroyNexusBridge() {
  unsubscribeEngine?.();
  if (healthInterval) clearInterval(healthInterval);
  initialized = false;
  unsubscribeEngine = null;
  healthInterval = null;
}

export const nexusBridge = {
  acknowledge: (id: string) => {
    nexusEngine.acknowledge(id);
    useStore.setState({ nexusLiveEvents: nexusEngine.getEvents() });
  },
  dismiss: (id: string) => {
    nexusEngine.dismiss(id);
    useStore.setState({ nexusLiveEvents: nexusEngine.getEvents() });
  },
};
