import {registry} from '@jahia/ui-extender';
import registrations from './serverSettings';
import i18next from 'i18next';

registry.add('callback', 'serverSettings', {
    targets: ['jahiaApp-init:50'],
    callback: async () => {
        await i18next.loadNamespaces('serverSettings');
        registrations();
        console.log('%c Server Settings routes have been registered', 'color: #3c8cba');
    }
});
