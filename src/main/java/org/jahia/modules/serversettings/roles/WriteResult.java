package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * What a write to a target's permission set did.
 * <p>
 * A write carries the revision a read returned. When the stored set moved in between, the write is
 * refused rather than applied, so two administrators editing one role cannot overwrite each other in
 * silence. The refusal answers the revision the repository holds now, so the interface can reload and
 * say what happened.
 */
public final class WriteResult {

    private final WriteOutcome outcome;
    private final String revision;
    private final List<String> permissions;

    WriteResult(WriteOutcome outcome, String revision, Collection<String> permissions) {
        this.outcome = outcome;
        this.revision = revision;
        this.permissions = new ArrayList<>(permissions);
    }

    /** Whether the write was applied. */
    public WriteOutcome getOutcome() {
        return outcome;
    }

    /** The revision the repository holds after the call, applied or refused. */
    public String getRevision() {
        return revision;
    }

    /** The permission set the repository holds after the call, sorted. */
    public List<String> getPermissions() {
        return Collections.unmodifiableList(permissions);
    }
}
