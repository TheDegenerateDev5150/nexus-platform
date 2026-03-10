import type { WorldPlugin, GeoEntity, PluginContext } from "@/core/plugins/PluginTypes";

interface ManagedPlugin {
    plugin: WorldPlugin;
    enabled: boolean;
    entities: GeoEntity[];
    context: PluginContext;
}

// wip: plugin registry — will wire DataBus and polling later
class PluginManager {
    private plugins: Map<string, ManagedPlugin> = new Map();
    private initialized = false;

    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        console.log("[PluginManager] initialized");
    }

    async registerPlugin(plugin: WorldPlugin): Promise<void> {
        if (this.plugins.has(plugin.id)) {
            console.warn(`[PluginManager] Plugin "${plugin.id}" already registered`);
            return;
        }

        const context: PluginContext = {
            apiBaseUrl: "",
            timeRange: {
                start: new Date(Date.now() - 24 * 60 * 60 * 1000),
                end: new Date(),
            },
            onDataUpdate: (entities) => {
                this.handleDataUpdate(plugin.id, entities);
            },
            onError: (error) => {
                console.error(`[Plugin:${plugin.id}]`, error);
            },
        };

        this.plugins.set(plugin.id, {
            plugin,
            enabled: false,
            entities: [],
            context,
        });

        try {
            await plugin.initialize(context);
            console.log(`[PluginManager] "${plugin.id}" initialized`);
        } catch (err) {
            console.error(`[PluginManager] Failed to initialize "${plugin.id}":`, err);
        }
    }

    async enablePlugin(pluginId: string): Promise<void> {
        const managed = this.plugins.get(pluginId);
        if (!managed) return;
        managed.enabled = true;
        console.log(`[PluginManager] "${pluginId}" enabled`);
    }

    disablePlugin(pluginId: string): void {
        const managed = this.plugins.get(pluginId);
        if (!managed) return;
        managed.enabled = false;
        managed.entities = [];
    }

    getAllPlugins(): ManagedPlugin[] {
        return Array.from(this.plugins.values());
    }

    getEnabledPlugins(): ManagedPlugin[] {
        return this.getAllPlugins().filter((p) => p.enabled);
    }

    destroy(): void {
        this.plugins.clear();
    }

    private handleDataUpdate(pluginId: string, entities: GeoEntity[]): void {
        const managed = this.plugins.get(pluginId);
        if (!managed) return;
        managed.entities = entities;
    }
}

export const pluginManager = new PluginManager();
