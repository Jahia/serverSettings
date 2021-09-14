<%@page import="org.jahia.settings.SettingsBean"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="internal" uri="http://www.jahia.org/tags/internalLib" %>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<template:addResources>
    <link type="text/css" href="${url.context}/gwt/resources/css/gwt.min.css" rel="stylesheet"/>
</template:addResources>
<% pageContext.setAttribute("cfg", SettingsBean.getInstance()); %>
<template:addResources>
<script type="text/javascript">
    var portletDeployment =  {
        formActionUrl: "<c:url value='${url.base}${renderContext.mainResource.node.path}.managePortlets.do'/>",
        autoDeploySupported: "${cfg.serverDeployer.autoDeploySupported}",
        appserverDeployerUrl: "${cfg.jahiaWebAppsDeployerBaseURL}"
    }
</script>
</template:addResources>
<internal:gwtGenerateDictionary/>
<internal:gwtInit/>
<internal:gwtImport module="manager" />

<template:gwtJahiaModule id="contentmanager" jahiaType="contentmanager" config="portletdefinitionmanager" embedded="true" />

