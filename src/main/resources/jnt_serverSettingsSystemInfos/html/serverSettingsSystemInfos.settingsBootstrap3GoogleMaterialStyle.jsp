<%@ page language="java" contentType="text/html;charset=UTF-8" %>
<%@ page import="java.util.TreeMap"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<div class="page-header">
    <h2><fmt:message key="serverSettings.systemInfos"/></h2>
</div>

<div class="panel panel-default">
    <div class="panel-body">
        <ul class="nav nav-tabs">
            <li role="presentation" class="active">
                <a href="#systemProps" aria-controls="systemProps" role="tab" data-toggle="tab">
                    <fmt:message key="serverSettings.systemInfo.systemProperties"/>
                </a>
            </li>
        </ul>

        <div class="tab-content">
            <div role="tabpanel" class="tab-pane active" id="systemProps">
                <br />
                <% pageContext.setAttribute("systemProperties", new TreeMap(System.getProperties())); %>
                <table class="table table-bordered table-striped">
                    <c:forEach items="${systemProperties}" var="prop" varStatus="loopStatus">
                        <tr class="${(loopStatus.index + 1) % 2 == 0 ? 'evenLine' : 'oddLine'}">
                            <c:if test="${not fn:containsIgnoreCase(prop.key,'pass') or fn:containsIgnoreCase(prop.key, 'secret')}" >
                                <td style="width: 30%;" title="${fn:escapeXml(prop.key)}">
                                    <strong>${fn:escapeXml(prop.key)}</strong>
                                </td>
                                <td style="width: 70%; word-break: break-all;" title="${fn:escapeXml(prop.value)}">
                                        ${fn:escapeXml(prop.value)}
                                </td>
                            </c:if>
                        </tr>
                    </c:forEach>
                </table>
            </div>
        </div>
    </div>
</div>
