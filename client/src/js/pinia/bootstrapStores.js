const packageModules = import.meta.glob(
    '/node_modules/@enso-ui/**/src/pinia/*.js',
    { eager: true },
);

const localModules = import.meta.glob(
    '/src/js/pinia/stores/*.js',
    { eager: true },
);

const isStore = store => typeof store === 'function' && typeof store.$id === 'string';

const factory = ({ __esModule, ...moduleExports }) => Object.values(moduleExports)
    .find(isStore);

const registry = Object.values({ ...packageModules, ...localModules })
    .map(factory)
    .filter(Boolean)
    .reduce((stores, store) => ({ ...stores, [store.$id]: store }), {});

export const bootstrapStores = activePinia => Object.values(registry)
    .forEach(store => store(activePinia));

export const loadStore = (name, payload, activePinia) => {
    const storeFactory = registry[name];

    if (!storeFactory) {
        throw new Error(`Unknown Pinia store "${name}"`);
    }

    const store = storeFactory(activePinia);

    if (typeof store.set !== 'function') {
        throw new Error(`Store "${name}" must expose set(payload)`);
    }

    store.set(payload);

    return store;
};
