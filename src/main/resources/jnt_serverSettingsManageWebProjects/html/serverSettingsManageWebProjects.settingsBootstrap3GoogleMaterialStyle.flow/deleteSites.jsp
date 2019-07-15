<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<template:addResources type="javascript" resources="jquery.min.js,jquery.blockUI.js,workInProgress.js"/>
<fmt:message key="label.workInProgressTitle" var="i18nWaiting"/><c:set var="i18nWaiting" value="${functions:escapeJavaScript(i18nWaiting)}"/>
<template:addResources>
    <script type="text/javascript">
        $(document).ready(function() {
            $('#${currentNode.identifier}-deleteSitesConfirmed').click(function() {workInProgress('${i18nWaiting}');});
        });
    </script>
</template:addResources>

<div class="page-header">
    <h2><fmt:message key="label.confirmContinue"/></h2>
</div>

<div class="row">
    <div class="col-md-offset-2 col-md-8">
        <div class="panel panel-default">
            <div class="panel-heading">
                <h4 class="text-danger">
                    <fmt:message key="serverSettings.manageWebProjects.delete.warning"/>
                </h4>
            </div>
            <div class="panel-body">
                <form action="${flowExecutionUrl}" method="post">
                    <table class="table table-no-border">
                        <thead>
                        <tr>
                            <th>
                                <fmt:message key="label.name" />
                            </th>
                            <th>
                                <fmt:message key="serverSettings.manageWebProjects.webProject.siteKey" />
                            </th>
                            <th>
                                <fmt:message key="serverSettings.manageWebProjects.webProject.serverName" />
                            </th>
                            <th>
                                <fmt:message key="serverSettings.manageWebProjects.webProject.templateSet" />
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        <input name="_sites" type="hidden"/>
                        <c:forEach items="${webprojectHandler.sites}" var="site">
                            <tr>
                                <td><strong>${fn:escapeXml(site.title)}</strong></td>
                                <td>${fn:escapeXml(site.siteKey)}</td>
                                <td>${fn:escapeXml(site.serverName)}</td>
                                <td title="${fn:escapeXml(site.templatePackageName)}">${fn:escapeXml(site.templateFolder)}</td>
                            </tr>
                        </c:forEach>
                        </tbody>
                    </table>

                    <div class="form-group form-group-sm">
                        <button class="btn btn-danger btn-raised pull-right" type="submit" name="_eventId_deleteSitesConfirmed" id="${currentNode.identifier}-deleteSitesConfirmed">
                            <fmt:message key='label.delete' />
                        </button>
                        <button class="btn btn-default pull-right" type="submit" name="_eventId_cancel">
                            <fmt:message key='label.cancel' />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>



