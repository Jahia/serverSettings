/*
 * ==========================================================================================
 * =                   JAHIA'S DUAL LICENSING - IMPORTANT INFORMATION                       =
 * ==========================================================================================
 *
 *                                 http://www.jahia.com
 *
 *     Copyright (C) 2002-2020 Jahia Solutions Group SA. All rights reserved.
 *
 *     THIS FILE IS AVAILABLE UNDER TWO DIFFERENT LICENSES:
 *     1/GPL OR 2/JSEL
 *
 *     1/ GPL
 *     ==================================================================================
 *
 *     IF YOU DECIDE TO CHOOSE THE GPL LICENSE, YOU MUST COMPLY WITH THE FOLLOWING TERMS:
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 *
 *     2/ JSEL - Commercial and Supported Versions of the program
 *     ===================================================================================
 *
 *     IF YOU DECIDE TO CHOOSE THE JSEL LICENSE, YOU MUST COMPLY WITH THE FOLLOWING TERMS:
 *
 *     Alternatively, commercial and supported versions of the program - also known as
 *     Enterprise Distributions - must be used in accordance with the terms and conditions
 *     contained in a separate written agreement between you and Jahia Solutions Group SA.
 *
 *     If you are unsure which license is appropriate for your use,
 *     please contact the sales department at sales@jahia.com.
 */
package org.jahia.modules.serversettings.flow;

import java.io.Serializable;
import java.util.Map;

import org.apache.commons.lang.StringUtils;
import org.jahia.modules.serversettings.cache.CacheManagement;
import org.jahia.services.cache.CacheHelper;
import org.jahia.services.cache.ehcache.CacheManagerInfo;

/**
 * Handler class for cache management information screen.
 * 
 * @author david
 */
public class CacheManagerHandler implements Serializable {

    private static final long serialVersionUID = 8547213229629335665L;

    private CacheManagement cacheManagement = new CacheManagement();

    /**
     * Returns {@link CacheManagement} bean instance.
     * 
     * @return {@link CacheManagement} bean instance
     */
    public CacheManagement getCacheManagement() {
        return cacheManagement;
    }

    /**
     * Returns a map with information for all available cache managers.
     * 
     * @return a map with information for all available cache managers
     */
    public Map<String, CacheManagerInfo> getCacheManagers() {
        return CacheHelper.getCacheManagerInfos(cacheManagement.isShowConfig(), cacheManagement.isShowBytes());
    }

    /**
     * Returns <code>true</code> if Jahia cluster is activated.
     * 
     * @return <code>true</code> if Jahia cluster is activated
     */
    public boolean getClusterActivated() {
        return Boolean.getBoolean("cluster.activated");
    }

    /**
     * Processes the requested cache action.
     */
    public void performAction() {
        boolean propagate = StringUtils.equals(cacheManagement.getPropagate(), "true");
        String action = StringUtils.defaultString(cacheManagement.getAction());
        switch (action) {
            case "flushOutputCaches":
                CacheHelper.flushOutputCaches(propagate);
                break;
            case "flushCaches":
                CacheHelper.flushCachesForManager(cacheManagement.getName(), propagate);
                break;
            case "flush":
                CacheHelper.flushEhcacheByName(cacheManagement.getName(), propagate);
                break;
            case "flushAllCaches":
                CacheHelper.flushAllCaches(propagate);
                break;
        }
    }
}
