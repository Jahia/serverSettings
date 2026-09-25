<%@ page language="java" contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<%--@elvariable id="mailSettings" type="org.jahia.services.mail.MailSettings"--%>
<%--@elvariable id="flowRequestContext" type="org.springframework.webflow.execution.RequestContext"--%>
<%--@elvariable id="flowExecutionUrl" type="java.lang.String"--%>
<%--@elvariable id="webprojectHandler" type="org.jahia.modules.serversettings.flow.WebprojectHandler"--%>
<template:addResources type="javascript" resources="jquery.min.js,jquery-ui.min.js,jquery.blockUI.js,workInProgress.js,admin-bootstrap.js"/>
<template:addResources type="css" resources="jquery-ui.smoothness.css,jquery-ui.smoothness-jahia.css"/>
<fmt:message key="label.workInProgressTitle" var="i18nWaiting"/><c:set var="i18nWaiting" value="${functions:escapeJavaScript(i18nWaiting)}"/>
<template:addResources>
<script type="text/javascript">
    $(document).ready(function() {
        $('#${currentNode.identifier}-processImport').click(function() {workInProgress('${i18nWaiting}');});
    });
</script>
</template:addResources>

    <c:forEach items="${flowRequestContext.messageContext.allMessages}" var="message">
        <c:if test="${message.severity eq 'ERROR' or message.severity eq 'WARNING'}">
            <div class="alert${message.severity eq 'ERROR' ? ' alert-error' : ''}">
                <button type="button" class="close" data-dismiss="alert">&times;</button>
                    ${fn:escapeXml(message.text)}
            </div>
        </c:if>
    </c:forEach>

<form action="${flowExecutionUrl}" method="post">
        <div class="box-1">
            <jsp:useBean id="validationErrors" class="java.util.HashMap" scope="request"/>
            <c:forEach items="${webprojectHandler.importsInfos}" var="importInfoMap" varStatus="importRow">
                    <%-- the entry name is display text only; DOM ids come from the row index --%>
                    <c:set var="rowId" value="importEntry${importRow.index}"/>
                    <label for="${rowId}">
                        <input type="checkbox" class="importCheckbox${importInfoMap.value.validationResult.blocking ? ' importBlocking' : ''}" id="${rowId}" name="importsInfos['${fn:escapeXml(importInfoMap.key)}'].selected" value="true"
                               <c:if test="${importInfoMap.value.selected}">checked="checked"</c:if>/> ${fn:escapeXml(importInfoMap.key)}
                        <input type="hidden" id="${rowId}Selected" name="_importsInfos['${fn:escapeXml(importInfoMap.key)}'].selected"/>
                        <c:if test="${importInfoMap.value.validationResult.blocking}"> (<input type="checkbox" onchange="swicthClass($(this).prev().prev())"/>
                            <fmt:message key="serverSettings.manageWebProjects.import.ignore.errors"/>)</c:if>
                    </label>
                    <%@include file="importValidation.jspf"%>
                    <c:if test="${importInfoMap.value.site}">
                        <div class="container-fluid">
                            <div class="row-fluid">
                                <div class="span4">
                                    <label for="${fn:escapeXml(importInfoMap.value.siteKey)}siteTitle">
                                        <fmt:message key="label.name"/> <span class="text-error"><strong>*</strong></span>
                                    </label>
                                    <input class="span12" type="text" id="${fn:escapeXml(importInfoMap.value.siteKey)}siteTitle"
                                           name="importsInfos['${fn:escapeXml(importInfoMap.key)}'].siteTitle"
                                           value="${fn:escapeXml(importInfoMap.value.siteTitle)}"/>
                                </div>
                                <div class="span4">
                                    <label for="${fn:escapeXml(importInfoMap.value.siteKey)}siteServerName">
                                        <fmt:message key="serverSettings.manageWebProjects.webProject.serverName"/> <span class="text-error"><strong>*</strong></span>
                                    </label>
                                    <input class="span12" type="text" id="${fn:escapeXml(importInfoMap.value.siteKey)}siteServerName"
                                           name="importsInfos['${fn:escapeXml(importInfoMap.key)}'].siteServername"
                                           value="${fn:escapeXml(importInfoMap.value.siteServername)}"/>
                                </div>
                            </div>
                            <div class="row-fluid">
                                <div class="span4">
                                    <label for="${fn:escapeXml(importInfoMap.value.siteKey)}siteKey">
                                        <fmt:message key="serverSettings.manageWebProjects.webProject.siteKey"/> <span class="text-error"><strong>*</strong></span>
                                    </label>
                                    <input class="span12" type="text" id="${fn:escapeXml(importInfoMap.value.siteKey)}siteKey"
                                           name="importsInfos['${fn:escapeXml(importInfoMap.key)}'].siteKey"
                                           value="${fn:escapeXml(importInfoMap.value.siteKey)}"/>
                                </div>
                                <div class="span4">
                                    <label for="${fn:escapeXml(importInfoMap.value.siteKey)}siteServerNameAliases">
                                        <fmt:message key="serverSettings.manageWebProjects.webProject.serverNameAliases"/>
                                    </label>
                                    <input class="span12" type="text" id="${fn:escapeXml(importInfoMap.value.siteKey)}siteServerNameAliases"
                                           name="importsInfos['${fn:escapeXml(importInfoMap.key)}'].siteServernameAliases"
                                           value="${fn:escapeXml(importInfoMap.value.siteServernameAliases)}"/>
                                </div>
                            </div>
                            <div class="row-fluid">
                                <div class="span4">
                                    <label for="${fn:escapeXml(importInfoMap.value.siteKey)}templates">
                                        <fmt:message key="serverSettings.webProjectSettings.pleaseChooseTemplateSet"/>
                                    </label>
                                    <select class="span12" id="${fn:escapeXml(importInfoMap.value.siteKey)}templates" name="importsInfos['${fn:escapeXml(importInfoMap.key)}'].templates">
                                        <c:forEach items="${requestScope.templateSets}" var="module">
                                            <option value="${module}" <c:if test="${importInfoMap.value.templates eq module}"> selected="selected"</c:if>>${module}</option>
                                        </c:forEach>
                                    </select>
                                </div>
                            </div>
                            <c:if test="${importInfoMap.value.legacyImport}">
                                <div class="row-fluid">
                                    <div class="span4">
                                        <label for="${fn:escapeXml(importInfoMap.value.siteKey)}legacyMapping">
                                            <fmt:message key="serverSettings.manageWebProjects.selectDefinitionMapping"/>
                                        </label>
                                        <select class="span12" id="${fn:escapeXml(importInfoMap.value.siteKey)}legacyMapping"
                                                name="importsInfos['${fn:escapeXml(importInfoMap.key)}'].selectedLegacyMapping">
                                            <c:forEach items="${importInfoMap.value.legacyMappings}" var="module">
                                                <option value="${module}" <c:if
                                                        test="${importInfoMap.value.selectedLegacyMapping eq module}"> selected="selected"</c:if>>${module}</option>
                                            </c:forEach>
                                        </select>
                                    </div>
                                    <div class="span4">
                                        <label for="${fn:escapeXml(importInfoMap.value.siteKey)}legacyDefinitions">
                                            <fmt:message key="serverSettings.manageWebProjects.selectLegacyDefinitions"/>
                                        </label>
                                        <select class="span12" id="${fn:escapeXml(importInfoMap.value.siteKey)}legacyDefinitions"
                                                name="importsInfos['${fn:escapeXml(importInfoMap.key)}'].selectedLegacyDefinitions">
                                            <c:forEach items="${importInfoMap.value.legacyDefinitions}" var="module">
                                                <option value="${module}" <c:if
                                                        test="${importInfoMap.value.selectedLegacyDefinitions eq module}"> selected="selected"</c:if>>${module}</option>
                                            </c:forEach>
                                        </select>
                                    </div>
                                </div>
                            </c:if>
                        </div>
                    </c:if>
            </c:forEach>
            <button class="btn btn-primary" type="submit" name="_eventId_processImport" id="${currentNode.identifier}-processImport"
                    <c:if test="${not empty validationErrors or empty webprojectHandler.importsInfos}"> disabled="disabled"</c:if> >
                <i class="icon-chevron-right icon-white"></i>
                &nbsp;<fmt:message key='serverSettings.manageWebProjects.fileImport'/>
            </button>
            <button class="btn" type="submit" name="_eventId_cancel">
                <i class="icon-ban-circle"></i>
                &nbsp;<fmt:message key='label.cancel'/>
            </button>
    </div>
</form>
<c:if test="${not empty validationErrors}">
<script type="text/javascript">
    $(document).ready(function () {
        checkBlockingImports();
        $(".importBlocking").change(checkBlockingImports);
    });
    function checkBlockingImports() {
        if ($(".importBlocking:checked").length == 0) {
            $("#${currentNode.identifier}-processImport").removeAttr("disabled");
        } else {
            $("#${currentNode.identifier}-processImport").attr("disabled", "disabled");
        }
    }
    function swicthClass(el) {
        if (el.hasClass("importBlocking")) {
            el.removeClass("importBlocking");
        } else {
            el.addClass("importBlocking");
        }
        checkBlockingImports();
    }
</script>
</c:if>

