<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%--@elvariable id="webprojectHandler" type="org.jahia.modules.serversettings.flow.WebprojectHandler"--%>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<jcr:node var="sites" path="/sites"/>
<jcr:nodeProperty name="j:defaultSite" node="${sites}" var="defaultSite"/>
<c:set var="defaultPrepackagedSite" value="acmespaceelektra.zip"/>
<template:addResources type="javascript" resources="jquery.min.js,workInProgress.js"/>
<template:addResources type="javascript" resources="datatables/jquery.dataTables.js,i18n/jquery.dataTables-${currentResource.locale}.js,datatables/dataTables.bootstrap-ext.js,settings/dataTables.initializer.js"/>
<template:addResources type="css" resources="datatables/css/bootstrap-theme.css"/>
<template:addResources type="css" resources="manageWebProjects.css"/>
<jsp:useBean id="nowDate" class="java.util.Date" />
<fmt:formatDate value="${nowDate}" pattern="yyyy-MM-dd-HH-mm" var="now"/>
<fmt:message key="label.workInProgressTitle" var="i18nWaiting"/><c:set var="i18nWaiting" value="${functions:escapeJavaScript(i18nWaiting)}"/>
<fmt:message key="serverSettings.manageWebProjects.noWebProjectSelected" var="i18nNoSiteSelected"/>
<fmt:message key="serverSettings.manageWebProjects.exportPath.error" var="i18nNoExportPath"/>
<fmt:message key="serverSettings.manageWebProjects.fileImport.error" var="i18nNothingToImport"/>
<c:set var="i18nNoSiteSelected" value="${functions:escapeJavaScript(i18nNoSiteSelected)}"/>
<script type="text/javascript">
    function submitSiteForm(act, site) {
    	if (typeof site != 'undefined') {
    		$("<input type='hidden' name='sitesKey' />").attr("value", site).appendTo('#sitesForm');
    	} else {
    		$("#sitesForm input:checkbox[name='selectedSites']:checked").each(function() {
    			$("<input type='hidden' name='sitesKey' />").attr("value", $(this).val()).appendTo('#sitesForm');
    		});
    	}
        if (act == 'exportToFile' || act == 'exportToFileStaging') {
            workInProgress('${i18nWaiting}');
        }
        $('#sitesFormAction').val(act);
    	$('#sitesForm').submit();
    }

    function validateUploadForm() {
        if (!$('#importPath').val().trim() && document.getElementById('importFile').files.length !== 1) {
            $.snackbar({
                content: "${i18nNothingToImport}",
                style: "error"
            });
            return false;
        }

        $('#importForm').submit();
    }

    $(document).ready(function () {
    	$("a.sitesAction").click(function () {
    		var act=$(this).attr('id');
    		if (act != 'createSite' && $("#sitesForm input:checkbox[name='selectedSites']:checked").length == 0) {
                $.snackbar({
                    content: "${i18nNoSiteSelected}",
                    style: "error"
                });
    			return false;
    		}
            if ((act === 'exportToFile' || act === 'exportToFileStaging') && !$('#exportPath').val().trim()) {
                $.snackbar({
                    content: "${i18nNoExportPath}",
                    style: "error"
                });
                return false;
            }
    		submitSiteForm(act);
    		return false;
    	});
        $("#exportSites").click(function (){
            var selectedSites = [];
            var checkedSites = $("input[name='selectedSites']:checked");
            checkedSites.each(function(){
                selectedSites.push($(this).val());
            });
            if(selectedSites.length==0) {
                $.snackbar({
                    content: "${i18nNoSiteSelected}",
                    style: "error"
                });
                return false;
            }
            var name = selectedSites.length>1?"sites":selectedSites;
            var sitebox = "";
            for (i = 0; i < selectedSites.length; i++) {
                sitebox = sitebox + "&sitebox=" + selectedSites[i];
            }
            $(this).target = "_blank";
            window.open("${url.context}/cms/export/default/"+name+ '_export_${now}.zip?exportformat=site&live=true'+sitebox);
        });

        $("#exportStagingSites").click(function (){
            var selectedSites = [];
            var checkedSites = $("input[name='selectedSites']:checked");
            checkedSites.each(function(){
                selectedSites.push($(this).val());
            });
            if(selectedSites.length==0) {
                $.snackbar({
                    content: "${i18nNoSiteSelected}",
                    style: "error"
                });
                return false;
            }
            var name = selectedSites.length>1?"sites":selectedSites;
            var sitebox = "";
            for (i = 0; i < selectedSites.length; i++) {
                sitebox = sitebox + "&sitebox=" + selectedSites[i];
            }
            $(this).target = "_blank";
            window.open("${url.context}/cms/export/default/"+name+ '_staging_export_${now}.zip?exportformat=site&live=false'+sitebox);
        });
    })
</script>
<script type="text/javascript" charset="utf-8">
    $(document).ready(function() {
        dataTablesSettings.init('sitesTable', 10, [], null, null);
    });
</script>

<div class="page-header">
    <h2>
        <fmt:message key="serverSettings.manageWebProjects"/>
    </h2>
</div>

<c:forEach var="msg" items="${flowRequestContext.messageContext.allMessages}">
    <div class="alert ${msg.severity == 'ERROR' ? ' validationError alert-danger' : ' alert-success'}">
        <button type="button" class="close" data-dismiss="alert">&times;</button>
            ${fn:escapeXml(msg.text)}
    </div>
</c:forEach>

<c:if test="${isSiteLimitReached}">
    <div class="alert alert-warning">
        <fmt:message key="serverSettings.manageWebProjects.reachedLicenseLimit"/>
        <u><a href="https://www.jahia.com/contact" title="Get a quote" target="_blank">
            <fmt:message key="serverSettings.manageWebProjects.contactUs"/></a></u>
        <fmt:message key="serverSettings.manageWebProjects.newLicense"/>
    </div>
</c:if>

<form id="sitesForm" action="${flowExecutionUrl}" method="post">
    <div class="panel panel-default">
        <div class="panel-heading">
            <h4><fmt:message key="serverSettings.manageWebProjects.sitesManagement"/></h4>
        </div>
        <div class="panel-body">
            <input type="hidden" id="sitesFormAction" name="_eventId" value="" />

            <a href="#create" id="createSite" class="btn btn-primary btn-raised sitesAction" ${isSiteLimitReached ? 'disabled' : '' }>
                <fmt:message key="serverSettings.manageWebProjects.add"/>
            </a>
            <a href="#export" id="exportSites" class="btn btn-default sitesAction-hide">
                <fmt:message key="label.export"/>
            </a>
            <a href="#exportStaging" id="exportStagingSites" class="btn btn-default sitesAction-hide">
                <fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)
            </a>
            <a href="#delete" id="deleteSites" class="btn btn-danger sitesAction">
                <fmt:message key="label.delete"/>
            </a>

            <table id="sitesTable" class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th class="{sorter: false}">&nbsp;</th>
                        <th>#</th>
                        <th>
                            <fmt:message key="label.name"/>
                        </th>
                        <th>
                            <fmt:message key="serverSettings.manageWebProjects.webProject.siteKey"/>
                        </th>
                        <th>
                            <fmt:message key="serverSettings.manageWebProjects.webProject.serverName"/>
                        </th>
                        <th>
                            <fmt:message key="serverSettings.manageWebProjects.webProject.templateSet"/>
                        </th>
                        <th class="{sorter: false}">
                            <fmt:message key="label.actions"/>
                        </th>
                    </tr>
                </thead>

                <tbody>
                    <c:forEach items="${webprojectHandler.allSites}" var="site" varStatus="loopStatus">
                        <c:if test="${site.name ne 'systemsite'}">
                            <tr>
                                <td>
                                    <div class="checkbox">
                                        <label>
                                            <input name="selectedSites" type="checkbox" value="${site.name}"/>
                                        </label>
                                    </div>
                                </td>
                                <td>
                                    ${loopStatus.index + 1}
                                    <c:if test="${site.identifier == defaultSite.string}">
                                        <i class="material-icons material-icons-small" style="vertical-align: text-top;">star_rate</i>
                                    </c:if>
                                </td>
                                <td><a href="#edit" onclick="submitSiteForm('editSite', '${site.name}'); return false;">${fn:escapeXml(site.title)}</a></td>
                                <td>${fn:escapeXml(site.name)}</td>
                                <td>${fn:escapeXml(site.serverName)}</td>
                                <td title="${fn:escapeXml(site.templatePackageName)}">${fn:escapeXml(site.templateFolder)}</td>
                                <td>
                                    <c:set var="i18nExportStaging"><fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)</c:set>
                                    <c:set var="i18nExportStaging" value="${fn:escapeXml(i18nExportStaging)}"/>
                                    <c:if test="${jcr:hasPermission(site,'editModeAccess')}">
                                        <c:choose>
                                            <c:when test="${renderContext.settings.distantPublicationServerMode}">
                                                <c:url var="editUrl" value="/cms/settings/default/${site.defaultLanguage}${site.path}.manageLanguages.html"/>
                                                <a style="margin-bottom:0;" class="btn btn-fab btn-fab-xs btn-default" href="${editUrl}" title="<fmt:message key='serverSettings.manageWebProjects.exitToEdit'/>">
                                                    <i class="material-icons">exit_to_app</i>
                                                </a>
                                            </c:when>
                                            <c:otherwise>
                                                <jcr:node var="editSite" path="${site.path}"/>
                                                <c:if test="${not jcr:isNodeType(editSite, 'jmix:remotelyPublished')}">
                                                    <c:url var="editUrl" value="/cms/edit/default/${site.defaultLanguage}${editSite.home.path}.html"/>
                                                    <a style="margin-bottom:0;" class="btn btn-fab btn-fab-xs btn-default" href="${editUrl}" title="<fmt:message key='serverSettings.manageWebProjects.exitToEdit'/>">
                                                        <i class="material-icons">exit_to_app</i>
                                                    </a>
                                                </c:if>
                                            </c:otherwise>
                                        </c:choose>
                                    </c:if>
                                    <a style="margin-bottom:0;" class="btn btn-fab btn-fab-xs btn-default" href="#edit" title="<fmt:message key='serverSettings.manageWebProjects.editSite'/>" onclick="submitSiteForm('editSite', '${site.name}'); return false;">
                                        <i class="material-icons">mode_edit</i>
                                    </a>
                                    <%--
                                        <a style="margin-bottom:0;" class="btn btn-fab btn-fab-xs btn-default" href="#edit" title="<fmt:message key='label.export'/>" onclick="submitSiteForm('exportSites', '${site.name}'); return false;">
                                            <i class="material-icons">file_download</i>
                                        </a>
                                        <a style="margin-bottom:0;" class="btn btn-fab btn-fab-xs btn-default" href="#edit" title="${i18nExportStaging}" onclick="submitSiteForm('exportStagingSites', '${site.name}'); return false;">
                                            <i class="material-icons">file_download</i>
                                        </a>
                                    --%>
                                    <a style="margin-bottom:0;" class="btn btn-fab btn-fab-xs btn-danger" title="<fmt:message key='label.delete'/>" href="#delete" onclick="submitSiteForm('deleteSites', '${site.name}'); return false;">
                                        <i class="material-icons">delete</i>
                                    </a>
                                </td>
                            </tr>
                        </c:if>
                    </c:forEach>
                </tbody>
            </table>

            <div class="form-group label-floating is-empty">
                <div class="input-group">
                    <label class="control-label"><fmt:message key="serverSettings.manageWebProjects.exportServerDirectory"/></label>
                    <input class="form-control" type="text" name="exportPath" id="exportPath"/>
                    <span class="input-group-btn">
                        <a class="btn btn-default sitesAction" id="exportToFile" href="#exportToFile" title="<fmt:message key='label.export'/>">
                            <fmt:message key='label.export'/>
                        </a>
                        <a class="btn btn-default sitesAction" id="exportToFileStaging" href="#exportToFileStaging" title="<fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)">
                            <fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)
                        </a>
                    </span>
                </div>
            </div>
        </div>
    </div>

    <div class="panel panel-default ${isSiteLimitReached ? 'site-limit-reached' : ''}">
        <div class="panel-heading">
            <h4><fmt:message key="serverSettings.manageWebProjects.importprepackaged"/></h4>
        </div>
        <div class="panel-body">
            <div class="form-group is-empty">
                <div class="input-group">
                    <select class="form-control" name="selectedPrepackagedSite" ${isSiteLimitReached ? 'disabled' : ''}>
                        <c:forEach items="${webprojectHandler.prepackagedSites}" var="file">
                            <option value="${file.key}"${file.value == defaultPrepackagedSite ? ' selected="selected"':''}>${fn:escapeXml(file.value)}</option>
                        </c:forEach>
                    </select>
                    <span class="input-group-btn">
                        <button class="btn btn-primary btn-raised" type="submit" name="importPrepackaged"
                                onclick="submitSiteForm('importPrepackaged'); return false;" ${isSiteLimitReached ? 'disabled' : ''}>
                            <fmt:message key='label.next'/>
                        </button>
                    </span>
                </div>
                <span class="material-input"></span>
            </div>
        </div>
    </div>
</form>

<div class="panel panel-default ${isSiteLimitReached ? 'site-limit-reached' : ''}">
    <div class="panel-heading">
        <h4><fmt:message key="serverSettings.manageWebProjects.multipleimport"/></h4>
    </div>
    <div class="panel-body">
        <form id="importForm" action="${flowExecutionUrl}" method="post" enctype="multipart/form-data">
            <input type="hidden" name="_eventId" value="import" />
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group is-empty is-fileinput label-floating">
                        <input type="file" name="importFile" id="importFile" ${isSiteLimitReached ? 'disabled' : ''} />
                        <div class="input-group">
                            <span class="input-group-addon"><i class="material-icons">touch_app</i></span>
                            <label class="control-label"><fmt:message key="serverSettings.manageWebProjects.multipleimport.fileselect"/></label>
                            <input class="form-control" type="text" readonly ${isSiteLimitReached ? 'disabled' : ''}>
                        </div>
                        <span class="material-input"></span>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group is-empty label-floating">
                        <div class="input-group">
                            <label class="control-label"><fmt:message key="serverSettings.manageWebProjects.multipleimport.fileinput"/></label>
                            <input class="form-control" type="text" name="importPath"
                                   id="importPath" ${isSiteLimitReached ? 'disabled' : ''} />
                            <span class="input-group-btn">
                                <button class="btn btn-primary btn-raised" type="button"
                                        onclick="validateUploadForm()" ${isSiteLimitReached ? 'disabled' : ''}>
                                    <fmt:message key='serverSettings.manageWebProjects.import.upload'/>
                                </button>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="panel panel-default">
	<div class="panel-heading">
		<h4><fmt:message key="serverSettings.manageWebProjects.systemsite"/></h4>
	</div>
	<div class="panel-body">
		<div class="form-group is-empty">
			<div class="input-group">
				<span class="input-group-btn">
					<a class="btn btn-default" href="<c:url value='/cms/export/default/systemsite_export_${now}.zip?exportformat=site&live=true&sitebox=systemsite' />">
						<fmt:message key='label.export' />
					</a>
					<a class="btn btn-default" href="<c:url value='/cms/export/default/systemsite_staging_export_${now}.zip?exportformat=site&live=false&sitebox=systemsite' />">
						<fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)
					</a>
				</span>
			</div>
		</div>
	</div>
</div>

