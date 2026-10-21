import org.jahia.services.usermanager.JahiaUser
import org.jahia.services.usermanager.JahiaUserManagerService
import org.jahia.services.workflow.WorkflowService
import org.jahia.services.workflow.WorkflowTask

// Local counterpart to @jahia/cypress's shipped groovy/admin/completeWorkflows.groovy, which only
// completes with outcome "accept". FT-026 (Jahia/selenium#1604) needs the "reject" outcome so the
// "Publication rejected by %s for %s" notification actually fires - completing/aborting the task any
// other way would not exercise the path under test.
final JahiaUser rootUser = JahiaUserManagerService.getInstance().lookupRootUser().getJahiaUser();
List<WorkflowTask> tasks = WorkflowService.getInstance().getTasksForUser(rootUser, Locale.ENGLISH);
for (WorkflowTask task : tasks) {
    WorkflowService.getInstance().assignAndCompleteTask(task.getId(), task.getProvider(), "reject", null, rootUser);
}
log.info("Rejected {} workflow task(s)", tasks.size());
