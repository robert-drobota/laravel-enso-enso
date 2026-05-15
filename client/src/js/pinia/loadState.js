import axios from 'axios';
import App from '@enso-ui/ui/src/core/app';
import { auth } from '@enso-ui/auth/src/pinia/auth';
import { localisation } from '@enso-ui/localisation/src/pinia/localisation';
import { app } from '@enso-ui/ui/src/pinia/app';
import { layout } from '@enso-ui/ui/src/pinia/layout';
import { preferences } from '@enso-ui/ui/src/pinia/preferences';
import { websockets } from '@enso-ui/ui/src/pinia/websockets';
import { pinia } from '.';
import { loadStore } from './bootstrapStores';

export const loadAppState = async (state = app()) => {
    try {
        const { data } = await axios.get('/api/core/home');

        data.forEach(({ store, state: payload }) => loadStore(store, payload, pinia));

        layout().updateSidebar(preferences().global.expandedSidebar);
        window.Laravel = state.meta.csrfToken;

        if (state.meta.sentryDsn) {
            const { default: Sentry } = await import('@enso-ui/ui/src/modules/sentry');
            const sentry = new Sentry(App.instance, App.router);
            sentry.init(state);
        }

        await layout().setTheme();
        await websockets().connect(state.meta.csrfToken);

        if (state.meta.env === 'local') {
            window.http = axios;
        }

        return true;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            auth().logoutState();
            App.router.push({ name: 'login' });
            return false;
        }

        throw error;
    }
};

export const loadGuestState = async (state = app()) => {
    const { data } = await axios.get('/api/meta', {
        params: { locale: localStorage.getItem('locale') },
    });

    const { meta, i18n, routes } = data;
    const lang = Object.keys(i18n).shift();

    localisation().setI18n(i18n);
    preferences().global.lang = lang;
    state.$patch({ meta, routes });

    const loginRoutes = ['login', 'password.email', 'password.reset'];
    const route = App.router?.currentRoute?.value;

    if (!route || !loginRoutes.includes(route.name)) {
        App.router?.push({ name: 'login' });
    }
};
