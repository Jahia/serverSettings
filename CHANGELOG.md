# serverSettings Changelog

## 10.0.0

### Breaking Changes

* Updated background jobs tables to use the latest design system components (available since Jahia 8.2.4.0) for improved compatibility, visual consistency, and better rendering for the shared DataTable implementation.(#198)

### New Features

* Remove Mail settings UI, now replaced by mail-service module OSGI config (#218)

* Bump minimal Jahia version from 8.2.0.0 to 8.2.4.0 (#202)

### Bug Fixes

* Check the caller administers the server before saving administration properties

* Restricted the administration properties screen to the server administration section and to holders of its own permission.

* Changed the memory screen so it is shown only to callers holding the permission it requires.

* Fixed the web project import preview for an archive entry whose name contains a double quote. Such an entry is now listed with its full name, and it can be selected and imported.

* Fixed the import validation details so that node paths read from the archive are displayed correctly, including a path that contains an apostrophe or angle brackets.

* Changed the system information and About screens so they are shown only to callers holding the permission each screen requires.
