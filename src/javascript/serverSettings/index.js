import {registerRoutes as registerAboutRoutes} from './aboutJahia/registerRoutes';
import {registerRoutes as registerSystemHealthRoutes} from './systemHealth/registerRoutes';
import {registerRoutes as registerConfigurationRoutes} from './configuration/registerRoutes';
import {registerRoutes as registerSystemComponentsRoutes} from './systemComponents/registerRoutes';
import {registerRoutes as registerUsersAndRolesRoutes} from './usersAndRoles/registerRoutes';
import {registerRoutes as registerWebProjectsRoutes} from './webProjects/registerRoutes';

registerAboutRoutes();
registerSystemHealthRoutes();
registerConfigurationRoutes();
registerSystemComponentsRoutes();
registerUsersAndRolesRoutes();
registerWebProjectsRoutes();
