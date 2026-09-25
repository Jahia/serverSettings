---
serverSettings: patch
---

Fixed the web project import preview for an archive entry whose name contains a quote character. Such an entry was listed incorrectly and could not be selected. It can now be selected and imported, where it previously could not be submitted at all; an entry whose name contains an apostrophe is still refused.
