import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import path from 'path';
import sirv from 'sirv';

const packageAliases = (packagesRoot, scope) => {
    if (!fs.existsSync(packagesRoot)) {
        return [];
    }

    return fs.readdirSync(packagesRoot)
        .filter(name => fs.existsSync(path.join(packagesRoot, name, 'package.json')))
        .flatMap(name => {
            const pkg = `${scope}/${name}`;
            const packageRoot = path.resolve(packagesRoot, name);

            return [
                { find: new RegExp(`^${pkg}$`), replacement: packageRoot },
                { find: new RegExp(`^${pkg}/`), replacement: `${packageRoot}/` },
                {
                    find: new RegExp(`.*?/node_modules/${pkg.replace('/', '\\/')}/`),
                    replacement: `${packageRoot}/`,
                },
            ];
        });
};

const packageNames = (packagesRoot, scope) => {
    if (!fs.existsSync(packagesRoot)) {
        return [];
    }

    return fs.readdirSync(packagesRoot)
        .filter(name => fs.existsSync(path.join(packagesRoot, name, 'package.json')))
        .map(name => `${scope}/${name}`);
};

const libraryAliases = (libraryRoot, name) => {
    if (!fs.existsSync(path.join(libraryRoot, 'package.json'))) {
        return [];
    }

    return [
        { find: new RegExp(`^${name}$`), replacement: libraryRoot },
        { find: new RegExp(`^${name}/`), replacement: `${libraryRoot}/` },
        {
            find: new RegExp(`.*?/node_modules/${name.replace('/', '\\/')}/`),
            replacement: `${libraryRoot}/`,
        },
    ];
};

const stripTildeImports = code => code.replace(/(@import\s+['"])~([^'"]+)(['"])/g, '$1$2$3');

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    const apiUrl = env.API_URL || 'http://127.0.0.1:8000';
    const ensoPackagesRoot = path.resolve(__dirname, 'node_modules/@enso-ui');
    const resourcesPath = path.resolve(__dirname, '../resources');
    const fontawesomePackagesRoot = path.resolve(__dirname, 'node_modules/@fortawesome');
    const axiosRoot = path.resolve(__dirname, 'node_modules/axios');
    const bulmaRoot = path.resolve(__dirname, 'node_modules/bulma');
    const pusherRoot = path.resolve(__dirname, 'node_modules/pusher-js');
    const ensoPackages = packageNames(ensoPackagesRoot, '@enso-ui');
    const fontawesomePackages = packageNames(fontawesomePackagesRoot, '@fortawesome');
    const ensoSourcePattern = /node_modules\/@enso-ui\/.+\/src\/.+\.(vue|js|jsx|ts|tsx|scss|sass|css)$/;

    return {
        root: __dirname,
        base: '/',
        plugins: [
            {
                name: 'dev-images',
                configureServer(server) {
                    server.middlewares.use('/images', sirv(path.resolve(__dirname, '../resources/images'), { dev: true }));
                    server.watcher.add(path.resolve(__dirname, 'node_modules/@enso-ui'));
                },
            },
            {
                name: 'reload-enso-ui-source',
                handleHotUpdate(ctx) {
                    if (!ensoSourcePattern.test(ctx.file)) {
                        return;
                    }

                    ctx.modules.forEach(module => ctx.server.moduleGraph.invalidateModule(module));

                    if (ctx.modules.length > 0) {
                        return ctx.modules;
                    }

                    ctx.server.ws.send({ type: 'full-reload' });

                    return [];
                },
            },
            {
                name: 'strip-tilde-imports',
                enforce: 'pre',
                transform(code, id) {
                    if (!/\.(vue|scss|sass|css)$/.test(id) || !code.includes('@import "~')) {
                        return null;
                    }

                    return {
                        code: stripTildeImports(code),
                        map: null,
                    };
                },
            },
            vue(),
            viteStaticCopy({
                targets: [
                    {
                        src: path.resolve(__dirname, '../resources/images/**/*'),
                        dest: 'images',
                    },
                ],
            }),
        ],
        resolve: {
            preserveSymlinks: true,
            alias: [
                ...packageAliases(ensoPackagesRoot, '@enso-ui'),
                ...packageAliases(fontawesomePackagesRoot, '@fortawesome'),
                ...libraryAliases(axiosRoot, 'axios'),
                ...libraryAliases(bulmaRoot, 'bulma'),
                ...libraryAliases(pusherRoot, 'pusher-js'),
                { find: '/images/', replacement: `${path.resolve(__dirname, '../resources/images')}/` },
                { find: '@root', replacement: path.resolve(__dirname, 'src/js') },
                { find: '@pages', replacement: path.resolve(__dirname, 'src/js/pages') },
                { find: '@components', replacement: path.resolve(__dirname, 'src/js/components') },
            ],
            dedupe: ['vue', 'pinia'],
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify(mode),
        },
        server: {
            host: '127.0.0.1',
            port: 8080,
            fs: {
                allow: [
                    __dirname,
                    resourcesPath,
                    ensoPackagesRoot,
                ],
            },
            watch: {
                ignored: watchPath => watchPath.includes('/node_modules/')
                    && !watchPath.includes('/node_modules/@enso-ui/'),
            },
            proxy: {
                '^/api': {
                    target: apiUrl,
                    changeOrigin: true,
                },
                '^/broadcasting': {
                    target: apiUrl,
                    changeOrigin: true,
                },
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    quietDeps: true,
                    silenceDeprecations: ['import', 'if-function'],
                },
            },
        },
        build: {
            outDir: path.resolve(__dirname, '../public'),
            emptyOutDir: false,
            manifest: true,
            rollupOptions: {
                input: path.resolve(__dirname, 'index.html'),
            },
        },
        optimizeDeps: {
            include: [
                'highlight.js',
                'tiny-emitter/instance',
                'vuedraggable',
            ],
            exclude: ensoPackages,
        },
    };
});
