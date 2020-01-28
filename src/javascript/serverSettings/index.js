import React from 'react';
import {registerRoutes as registerAboutRoutes} from './aboutJahia/registerRoutes';
import {registerRoutes as registerSystemHealthRoutes} from './systemHealth/registerRoutes';
import {registerRoutes as registerConfigurationRoutes} from './configuration/registerRoutes';
import {registerRoutes as registerSystemComponentsRoutes} from './systemComponents/registerRoutes';
import {registerRoutes as registerUsersAndRolesRoutes} from './usersAndRoles/registerRoutes';
import {registerRoutes as registerWebProjectsRoutes} from './webProjects/registerRoutes';
import {useTranslation} from "react-i18next";

export default function() {
    const {t} = useTranslation('serverSettings');

    registerAboutRoutes(t);
    registerSystemHealthRoutes(t);
    registerConfigurationRoutes(t);
    registerSystemComponentsRoutes(t);
    registerUsersAndRolesRoutes(t);
    registerWebProjectsRoutes(t);

    return null;
}
