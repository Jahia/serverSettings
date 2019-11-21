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
<template:addResources type="javascript" resources="jquery.min.js,jquery-ui.min.js,admin-bootstrap.js,bootstrap-filestyle.min.js,jquery.metadata.js,jquery.tablesorter.js,jquery.tablecloth.js,workInProgress.js"/>
<template:addResources type="css" resources="jquery-ui.smoothness.css,jquery-ui.smoothness-jahia.css,tablecloth.css"/>
<template:addResources type="javascript" resources="datatables/jquery.dataTables.js,i18n/jquery.dataTables-${currentResource.locale}.js,datatables/dataTables.bootstrap-ext.js"/>
<template:addResources type="css" resources="manageWebProjects.css"/>
<jsp:useBean id="nowDate" class="java.util.Date" />
<fmt:formatDate value="${nowDate}" pattern="yyyy-MM-dd-HH-mm" var="now"/>
<fmt:message key="label.workInProgressTitle" var="i18nWaiting"/><c:set var="i18nWaiting" value="${functions:escapeJavaScript(i18nWaiting)}"/>
<fmt:message key="serverSettings.manageWebProjects.noWebProjectSelected" var="i18nNoSiteSelected"/>
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

    $(document).ready(function () {
    	$("a.sitesAction").click(function () {
    		var act=$(this).attr('id');
    		if (act != 'createSite' && $("#sitesForm input:checkbox[name='selectedSites']:checked").length == 0) {
        		alert("${i18nNoSiteSelected}");
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
                alert("${i18nNoSiteSelected}");
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
                alert("${i18nNoSiteSelected}");
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
        $(":file").filestyle({classButton: "btn",classIcon: "icon-folder-open"/*,buttonText:"Translation"*/});
    })
</script>
<script type="text/javascript" charset="utf-8">
    $(document).ready(function() {
        var sitesTable = $('#sitesTable');

        sitesTable.dataTable({
            "sDom": "<'row-fluid'<'span6'l><'span6 text-right'f>r>t<'row-fluid'<'span6'i><'span6 text-right'p>>",
            "iDisplayLength": 10,
            "sPaginationType": "bootstrap",
            "aaSorting": [] //this option disable sort by default, the user steal can use column names to sort the table
        });
    });
</script>

<c:if test="${isSiteLimitReached}">
    <div class="alert alert-warning">
        <fmt:message key="serverSettings.manageWebProjects.reachedLicenseLimit"/>
        <u><a href="https://www.jahia.com/contact" title="Get a quote" target="_blank">
            <fmt:message key="serverSettings.manageWebProjects.contactUs"/></a></u>
        <fmt:message key="serverSettings.manageWebProjects.newLicense"/>
    </div>
</c:if>

<form id="sitesForm" action="${flowExecutionUrl}" method="post">
    <fieldset>
        <h2><fmt:message key="label.virtualSitesManagement"/></h2>
        <input type="hidden" id="sitesFormAction" name="_eventId" value="" />
        <div class="btn-group">
            <a href="#create" id="createSite" class="btn sitesAction" ${isSiteLimitReached ? 'disabled' : '' }>
                <i class="icon-plus"></i>
                <fmt:message key="serverSettings.manageWebProjects.add"/>
            </a>
            <a href="#export" id="exportSites" class="btn sitesAction-hide">
                <i class="icon-upload"></i>
                <fmt:message key="label.export"/>
            </a>
            <a href="#exportStaging" id="exportStagingSites" class="btn sitesAction-hide">
                <i class=" icon-circle-arrow-up"></i>
                <fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)
            </a>
            <a href="#delete" id="deleteSites" class="btn sitesAction">
                <i class="icon-remove"></i>
                <fmt:message key="label.delete"/>
            </a>
        </div>
    </fieldset>

    <fieldset>
        <h2><fmt:message key="serverSettings.manageWebProjects.virtualSitesListe"/></h2>

        <c:forEach var="msg" items="${flowRequestContext.messageContext.allMessages}">
            <div class="alert ${msg.severity == 'ERROR' ? 'validationError' : ''} ${msg.severity == 'ERROR' ? 'alert-error' : 'alert-success'}">
                <button type="button" class="close" data-dismiss="alert">&times;</button>
                ${fn:escapeXml(msg.text)}
            </div>
        </c:forEach>

        <table id="sitesTable" class="table table-bordered table-striped table-hover">
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
                            <td><input name="selectedSites" type="checkbox" value="${site.name}"/></td>
                            <td>
                                ${loopStatus.index + 1}
                                <c:if test="${site.identifier == defaultSite.string}">
                                    &nbsp;<i class="icon-star"></i>
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
                                            <a style="margin-bottom:0;" class="btn btn-small" href="${editUrl}" title="<fmt:message key='serverSettings.manageWebProjects.exitToEdit'/>">
                                                <i class="icon-pencil"></i>
                                            </a>
                                        </c:when>
                                        <c:otherwise>
                                            <jcr:node var="editSite" path="${site.path}"/>
                                            <c:if test="${not jcr:isNodeType(editSite, 'jmix:remotelyPublished')}">
                                                <c:url var="editUrl" value="/cms/edit/default/${site.defaultLanguage}${editSite.home.path}.html"/>
                                                <a style="margin-bottom:0;" class="btn btn-small" href="${editUrl}" title="<fmt:message key='serverSettings.manageWebProjects.exitToEdit'/>">
                                                    <i class="icon-pencil"></i>
                                                </a>
                                            </c:if>
                                        </c:otherwise>
                                    </c:choose>
                                </c:if>
                                <a style="margin-bottom:0;" class="btn btn-small" href="#edit" title="<fmt:message key='serverSettings.manageWebProjects.editSite'/>" onclick="submitSiteForm('editSite', '${site.name}'); return false;">
                                    <i class=" icon-edit"></i>
                                </a>
                                <%--
                                    <a style="margin-bottom:0;" class="btn btn-small" href="#edit" title="<fmt:message key='label.export'/>" href="#edit" onclick="submitSiteForm('exportSites', '${site.name}'); return false;">
                                        <i class="icon-upload"></i>
                                    </a>
                                    <a style="margin-bottom:0;" class="btn btn-small" href="#edit" title="${i18nExportStaging}" href="#edit" onclick="submitSiteForm('exportStagingSites', '${site.name}'); return false;">
                                        <i class="icon-circle-arrow-up"></i>
                                    </a>
                                --%>
                                <a style="margin-bottom:0;" class="btn btn-danger btn-small" title="<fmt:message key='label.delete'/>" href="#delete" onclick="submitSiteForm('deleteSites', '${site.name}'); return false;">
                                    <i class="icon-remove icon-white"></i>
                                </a>
                            </td>
                        </tr>
                    </c:if>
                </c:forEach>
            </tbody>
        </table>

        <div class="box-1">
            <p><fmt:message key="serverSettings.manageWebProjects.exportServerDirectory"/></p>
            <input class="span5" type="text"  name="exportPath"/>

            <a  class="btn btn-primary sitesAction" id="exportToFile" href="#exportToFile" title="<fmt:message key='label.export'/>">
                <i class="icon-download icon-white"></i>
                &nbsp;<fmt:message key='label.export'/>
            </a>
            <a  class="btn btn-primary sitesAction" id="exportToFileStaging" href="#exportToFileStaging" title="<fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)">
                <i class="icon-download icon-white"></i>
                &nbsp; <fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)
            </a>
        </div>

    </fieldset>

    <fieldset>
        <h2><fmt:message key="serverSettings.manageWebProjects.systemsite"/></h2>
        <div class="btn-group">
            <a class="btn" href="<c:url value='/cms/export/default/systemsite_export_${now}.zip?exportformat=site&live=true&sitebox=systemsite' />">
                <i class="icon-upload"></i>
                <fmt:message key='label.export' />
            </a>
            <a class="btn" href="<c:url value='/cms/export/default/systemsite_staging_export_${now}.zip?exportformat=site&live=false&sitebox=systemsite' />">
                <i class=" icon-circle-arrow-up"></i>
                <fmt:message key="label.export"/> (<fmt:message key="label.stagingContent"/>)
            </a>
        </div>
    </fieldset>

    <fieldset ${isSiteLimitReached ? 'class="site-limit-reached"' : '' }>
        <h2><fmt:message key="serverSettings.manageWebProjects.importprepackaged"/></h2>
        <select class="span5" name="selectedPrepackagedSite" ${isSiteLimitReached ? 'disabled' : '' }>
            <c:forEach items="${webprojectHandler.prepackagedSites}" var="file">
                <option value="${file.key}"${file.value == defaultPrepackagedSite ? ' selected="selected"':''}>${fn:escapeXml(file.value)}</option>
            </c:forEach>
        </select>
        <button class="btn btn-primary" type="submit" name="importPrepackaged"
                onclick="submitSiteForm('importPrepackaged'); return false;" ${isSiteLimitReached ? 'disabled' : '' }>
            <i class="icon-ok icon-white"></i>
            &nbsp;<fmt:message key='label.next'/>
        </button>
    </fieldset>
</form>

<fieldset ${isSiteLimitReached ? 'class="site-limit-reached"' : '' }>
    <h2><fmt:message key="serverSettings.manageWebProjects.multipleimport"/></h2>
    <form action="${flowExecutionUrl}" method="post" enctype="multipart/form-data">
        <div class="alert alert-info">
            <p><fmt:message key="serverSettings.manageWebProjects.multipleimport.fileselect"/></p>
            <input type="file" name="importFile" ${isSiteLimitReached ? 'disabled' : '' } />
            <button class="btn btn-primary" type="submit" name="_eventId_import"
                    onclick="" ${isSiteLimitReached ? 'disabled' : '' }>
                <i class="icon-download icon-white"></i>
                &nbsp;<fmt:message key='serverSettings.manageWebProjects.import.upload'/>
            </button>
        </div>
        <div class="box-1">
            <p><fmt:message key="serverSettings.manageWebProjects.multipleimport.fileinput"/></p>
            <input class="span5" type="text"  name="importPath" ${isSiteLimitReached ? 'disabled' : '' } />
            <button class="btn btn-primary" type="submit" name="_eventId_import"
                    onclick="" ${isSiteLimitReached ? 'disabled' : '' }>
                <i class="icon-download icon-white"></i>
                &nbsp;<fmt:message key='serverSettings.manageWebProjects.import.upload'/>
            </button>
        </div>
    </form>
</fieldset>
