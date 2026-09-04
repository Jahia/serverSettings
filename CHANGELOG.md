# serverSettings Changelog

## 10.0.0

### Breaking Changes

* Updated background jobs tables to use the latest design system components (available since Jahia 8.2.4.0) for improved compatibility, visual consistency, and better rendering for the shared DataTable implementation.(#198)

### New Features

* Remove Mail settings UI, now replaced by mail-service module OSGI config (#218)

* Bump minimal Jahia version from 8.2.0.0 to 8.2.4.0 (#202)

### Bug Fixes

* Check the caller administers the server before saving administration properties

* Changed the memory screen so it is shown only to callers holding the permission it requires.

* Changed the system information and About screens so they are shown only to callers holding the permission each screen requires.
