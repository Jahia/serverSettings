# 0001 — The roles and permissions screen renders the runtime permission graph

- Status: accepted
- Date: 2026-09-02
- Deciders: Jahia CMS engineering

## Context and problem statement

Jahia administers roles and permissions through a screen that builds a second permission tree in
front of the repository. Three configured maps drive it. One declares synthetic permission nodes and
maps each one onto a list of real permissions. One lists which top-level permission groups to show
per role type and per node type. One collects into a bucket named `other` every permission that no
group lists.

The repository model that screen sits on has two properties an interface cannot argue with.

A permission is a Jackrabbit privilege keyed by its NAME, and the node path is only organisational.
`JahiaPrivilegeRegistry` walks the `jnt:permission` tree and gives each node the privileges of its
children as aggregate privileges. `AccessManagerUtils` reads a role's privileges and then reads
their aggregates, so a role that grants a permission also grants every permission below it. There is
no way to grant a permission and refuse one of its descendants.

The same permission name is declared by core and by any module that nests a permission under it.
Core seeds its own subtree, and a module seeds one per installed version. Each declaration of a name
is the same privilege at runtime.

The configured maps fight both properties. A synthetic parent has no node in the repository, so it
cannot be granted, and granting it means granting the permissions it maps onto. Removing one of them
means expanding the parent into all of them. The screen then has to keep three things in agreement:
the synthetic tree, the repository tree, and three boolean flags per row.

Those three flags feed a tri-state checkbox. An administrator reading that screen cannot tell which
permission the repository actually holds. A permission that no configured group lists is reachable
only through a bucket.

## Decision drivers

- An administrator must be able to read what a role grants, and where.
- A row the administrator cannot clear must say what holds it.
- A permission must never be unreachable because of configuration.
- The screen must not become a second authority on what a permission means.

## Decision outcome

The new screen renders the permission graph the repository holds and the runtime evaluates. It
carries no re-arrangement layer.

### One row per logical permission

The path of a permission with any module and version prefix removed is its logical path. Two
declarations of one name share that path, so the screen shows one row per logical path and lists the
modules that declared it. A row keeps the parent its logical path gives it, because that parent is
also the privilege that aggregates it.

The merge is only sound while every name resolves to exactly one logical path. The screen reports
each name that does not, and a test asserts the report is empty. A module that declares a name at a
second logical path fails that test and is named by it. The alternative is an interface that shows
one of the two parents and hides the other.

### Two facts per row, not one state

A permission on one target of one role carries two independent facts.

- Whether the target's own `j:permissionNames` names it. This is the fact a checkbox writes.
- What keeps the permission granted when the target stops naming it. This is what locks the row, and
  it is either a granted ancestor permission or a parent role.

A permission can be named by the target and be held granted by a parent role at the same time. A
single state has to choose between the two facts. The interface then shows a clearable checkbox on a
permission that clearing does not remove. So the two facts are kept apart, and the four states an
administrator reads are derived from them.

A parent role lock is reported ahead of a granted ancestor permission, because no edit on this role
frees it.

### An explicit operation instead of a hidden one

Removing one descendant of a granted permission requires replacing that grant with an explicit grant
on each of its direct children. That is the operation the configured maps performed silently. It
becomes a named operation with a read-only preview that states what it adds and what it removes.
Nothing is written before the administrator confirms it. The reverse operation replaces the grants
on every direct child with one grant on the parent.

### Facets filter, and never re-parent

A permission node carries no property for its scope. Three facets are derived and used for filtering
and ordering only.

- The workspace, from the `_default` and `_live` name suffix. `AccessManagerUtils` treats that suffix
  as the workspace marker, and no property carries it.
- The area, which is the first path segment under the permissions root.
- The modules that declare the name.

A facet never moves a permission to another parent, and never hides one. Configuration gives an area
a label, an icon and an order. An area the configuration does not name is shown under its own path
segment.

### Reads go through the caller's session

Every read uses the calling user's own repository session. The GraphQL surface is gated on the
`adminRoles` permission, at the one field that opens it. The repository access control still applies
underneath. So a caller never reads a role node the repository would refuse them. The gate
is not the only thing standing between a caller and the data.

## Consequences

The screen states four facts the previous one hid, and each is empty or false on a healthy instance.

- A permission name declared at two logical paths.
- A role name carried by two role nodes.
- A granted permission no installed module declares.
- A target only an ancestor role declares.

An administrator now sees the real permission names and the real tree. A name is longer and less
grouped than a synthetic label. So each row carries the label from the permission resource bundles,
and the humanised name when no bundle answers.

A permission set is written back as the repository holds it. `j:permissionNames` is declared
protected in the node type, and Jahia still allows a write to it. A repository rule flushes the
privilege cache when the property is set on a role or on an external permissions node. So no cache
call belongs in this module.

Two roles of one name make the applied permissions undefined, because core resolves a role name with
a query and takes the first result. This module reports the name and resolves it the same way for
every caller, rather than choosing a node the runtime might not choose.

Every walk up the role parent chain goes by repository path. A role is addressed by name, because a
name is what an access control entry holds. But a role node may contain a role node of the same
name. A walk by name would then read the inner role as its own parent and never stop.

The previous screen stays installed and is not changed, so the two can be compared on one instance.
