<%@ page language="java" contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<div class="page-header">
    <h2><fmt:message key="serverSettings.reportAnIssue"/></h2>
</div>

<div class="row">
    <div class="col-md-offset-2 col-md-8">
        <div class="panel panel-default">
            <div class="panel-heading">
                <h4><fmt:message key="serverSettings.reportAnIssue.description"/></h4>
            </div>
            <div class="panel-body text-right">
                <a class="btn btn-primary btn-raised" href="http://support.jahia.com" target="_blank">
                    <fmt:message key="serverSettings.reportAnIssue.jira"/>
                </a>
            </div>
        </div>
    </div>
</div>
