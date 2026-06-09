import {registry} from '@jahia/ui-extender';
import registrations from './serverSettings';
import i18next from 'i18next';

export default function () {
    i18next.loadNamespaces('serverSettings');
    registry.add('callback', 'serverSettings', {
        targets: ['jahiaApp-init:50'],
        callback: async () => {
            registrations();
            console.debug('%c Server Settings routes have been registered', 'color: #3c8cba');
        }
    });
}
