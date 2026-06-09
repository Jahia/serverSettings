/// @ts-check
import jahiaFederationPlugin from '@jahia/vite-federation-plugin';
import sbom from 'rollup-plugin-sbom';
import {defineConfig} from 'vite';

export default defineConfig({
    build: {
        outDir: 'src/main/resources/javascript/apps'
    },

    plugins: [
        sbom({
            specVersion: '1.4',
            rootComponentType: 'library'
        }),
        jahiaFederationPlugin({
            exposes: {
                './init': './src/javascript/init.js'
            },
            dts: false
        })
    ]
});
