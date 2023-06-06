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
<template:addResources type="javascript" resources="jquery.min.js,jquery.blockUI.js,workInProgress.js"/>
<fmt:message key="label.workInProgressTitle" var="i18nWaiting"/><c:set var="i18nWaiting" value="${functions:escapeJavaScript(i18nWaiting)}"/>

<template:addResources>
    <script type="text/javascript">
        $(document).ready(function() {
            $('#${currentNode.identifier}-processImport').click(function() {workInProgress('${i18nWaiting}');});
        });
    </script>
</template:addResources>

<div class="page-header">
    <h2><fmt:message key="serverSettings.manageWebProjects.fileImport"/></h2>
</div>

<c:forEach items="${flowRequestContext.messageContext.allMessages}" var="message">
    <c:if test="${message.severity eq 'ERROR' or message.severity eq 'WARNING'}">
        <div class="alert${message.severity eq 'ERROR' ? ' alert-danger' : 'alert-info'}">
            <button type="button" class="close" data-dismiss="alert">&times;</button>
                ${fn:escapeXml(message.text)}
        </div>
    </c:if>
</c:forEach>

<div class="row">
    <div class="col-md-6 col-md-offset-3">
        <form action="${flowExecutionUrl}" method="post">
            <div class="panel panel-default">
                <div class="panel-body">
                    <jsp:useBean id="validationErrors" class="java.util.HashMap" scope="request"/>
                    <c:forEach items="${webprojectHandler.importsInfos}" var="importInfoMap">
                        <div class="form-group">
                            <div class="checkbox">
                                <label for="${importInfoMap.key}">
                                    <input type="checkbox" id="${importInfoMap.key}"
                                           class="importCheckbox${importInfoMap.value.validationResult.blocking ? ' importBlocking' : ''}"
                                           id="${importInfoMap.key}"
                                           name="importsInfos['${importInfoMap.key}'].selected" value="true"
                                           <c:if test="${importInfoMap.value.selected}">checked="checked"</c:if>/>
                                        ${fn:escapeXml(importInfoMap.key)}
                                </label>
                            </div>
                            <input type="hidden" id="${importInfoMap.key}" name="_importsInfos['${importInfoMap.key}'].selected"/>
                            <c:if test="${importInfoMap.value.validationResult.blocking}">
                                <div class="checkbox"
                                     onchange="switchClass($(this).prev().prev().children().children([id='${importInfoMap.key}']))">
                                    <label>
                                        <input type="checkbox"/>
                                        <fmt:message key="serverSettings.manageWebProjects.import.ignore.errors"/>
                                    </label>
                                </div>
                            </c:if>
                        </div>

                        <%@ include file="importValidation.jspf" %>

                        <c:if test="${importInfoMap.value.site}">
                            <div class="form-group label-floating">
                                <label class="control-label" for="${importInfoMap.value.siteKey}siteTitle">
                                    <fmt:message key="label.name"/> <strong class="text-danger">*</strong>
                                </label>
                                <input class="form-control" type="text" id="${importInfoMap.value.siteKey}siteTitle"
                                       name="importsInfos['${importInfoMap.key}'].siteTitle"
                                       value="${fn:escapeXml(importInfoMap.value.siteTitle)}"/>
                            </div>

                            <div class="form-group label-floating">
                                <label class="control-label" for="${importInfoMap.value.siteKey}siteKey">
                                    <fmt:message key="serverSettings.manageWebProjects.webProject.siteKey"/> <strong class="text-danger">*</strong>
                                </label>
                                <input class="form-control" type="text" id="${importInfoMap.value.siteKey}siteKey"
                                       name="importsInfos['${importInfoMap.key}'].siteKey"
                                       value="${fn:escapeXml(importInfoMap.value.siteKey)}"/>
                            </div>

                            <div class="form-group label-floating">
                                <label class="control-label" for="${importInfoMap.value.siteKey}siteServerName">
                                    <fmt:message key="serverSettings.manageWebProjects.webProject.serverName"/> <strong class="text-danger">*</strong>
                                </label>
                                <input class="form-control" type="text" id="${importInfoMap.value.siteKey}siteServerName"
                                       name="importsInfos['${importInfoMap.key}'].siteServername"
                                       value="${fn:escapeXml(importInfoMap.value.siteServername)}"/>
                            </div>

                            <div class="form-group label-floating">
                                <label class="control-label" for="${importInfoMap.value.siteKey}siteServerNameAliases">
                                    <fmt:message key="serverSettings.manageWebProjects.webProject.serverNameAliases"/>
                                </label>
                                <input class="form-control" type="text" id="${importInfoMap.value.siteKey}siteServerNameAliases"
                                       name="importsInfos['${importInfoMap.key}'].siteServernameAliases"
                                       value="${fn:escapeXml(importInfoMap.value.siteServernameAliases)}"/>
                            </div>

                            <div class="form-group label-floating">
                                <label class="control-label" for="${importInfoMap.value.siteKey}templates">
                                    <fmt:message key="serverSettings.webProjectSettings.pleaseChooseTemplateSet"/>
                                </label>
                                <select class="form-control" id="${importInfoMap.value.siteKey}templates" name="importsInfos['${importInfoMap.key}'].templates">
                                    <c:forEach items="${requestScope.templateSets}" var="module">
                                        <option value="${module}" <c:if test="${importInfoMap.value.templates eq module}"> selected="selected"</c:if>>${module}</option>
                                    </c:forEach>
                                </select>
                            </div>

                            <c:if test="${importInfoMap.value.legacyImport}">
                                <div class="form-group label-floating">
                                    <label class="control-label" for="${importInfoMap.value.siteKey}legacyMapping">
                                        <fmt:message key="serverSettings.manageWebProjects.selectDefinitionMapping"/>
                                    </label>
                                    <select class="form-control" id="${importInfoMap.value.siteKey}legacyMapping"
                                            name="importsInfos['${importInfoMap.key}'].selectedLegacyMapping">
                                        <c:forEach items="${importInfoMap.value.legacyMappings}" var="module">
                                            <option value="${module}" <c:if
                                                    test="${importInfoMap.value.selectedLegacyMapping eq module}"> selected="selected"</c:if>>${module}</option>
                                        </c:forEach>
                                    </select>
                                </div>
                                <div class="form-group label-floating">
                                    <label class="control-label" for="${importInfoMap.value.siteKey}legacyDefinitions">
                                        <fmt:message key="serverSettings.manageWebProjects.selectLegacyDefinitions"/>
                                    </label>
                                    <select class="form-control" id="${importInfoMap.value.siteKey}legacyDefinitions"
                                            name="importsInfos['${importInfoMap.key}'].selectedLegacyDefinitions">
                                        <c:forEach items="${importInfoMap.value.legacyDefinitions}" var="module">
                                            <option value="${module}" <c:if
                                                    test="${importInfoMap.value.selectedLegacyDefinitions eq module}"> selected="selected"</c:if>>${module}</option>
                                        </c:forEach>
                                    </select>
                                </div>
                            </c:if>
                        </c:if>
                    </c:forEach>

                    <div class="form-group form-group-sm">
                        <button class="btn btn-primary btn-raised pull-right" type="submit" name="_eventId_processImport" id="${currentNode.identifier}-processImport"
                                <c:if test="${not empty validationErrors or empty webprojectHandler.importsInfos}"> disabled="disabled"</c:if> >
                            <fmt:message key='serverSettings.manageWebProjects.fileImport'/>
                        </button>
                        <button class="btn btn-default pull-right" type="submit" name="_eventId_cancel">
                            <fmt:message key='label.cancel'/>
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </div>
</div>

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
        function switchClass(el) {
            if (el.hasClass("importBlocking")) {
                el.removeClass("importBlocking");
            } else {
                el.addClass("importBlocking");
            }
            checkBlockingImports();
        }
    </script>
</c:if>

