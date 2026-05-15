import Root from '@enso-ui/ui/bulma';
import App from '@enso-ui/ui/src/core/app';
import serializeParams from '@enso-ui/ui/src/modules/paramsSerializer';
import router from '@enso-ui/ui/src/core/services/router';
import VTooltipPlugin from 'v-tooltip';
import axios from 'axios';
import { createApp } from 'vue';
import { pinia } from './pinia';
import { bootstrapStores } from './pinia/bootstrapStores';
import '../sass/enso.scss';
import './app';

axios.defaults.paramsSerializer = { serialize: serializeParams };

window.__ensoRouter = router;
window.__ensoPinia = pinia;

bootstrapStores(pinia);

const app = createApp(Root);

app.use(router)
    .use(pinia)
    .use(VTooltipPlugin);

App.boot(app, pinia, router);

app.mount('#app');

window.app = App;
