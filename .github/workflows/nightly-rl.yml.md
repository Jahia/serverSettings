This workflow has been disabled.

It was testing the latest snapshot of this module against the latest Jahia release,
which is not a relevant scenario for serverSettings: this module is exclusively
bundled within Jahia releases and is never distributed or installed independently.
As a result, there will never be a case where a newer version of this module needs
to be installed on an older release of Jahia.

Only the nightly workflow testing againts Jahia snapshot is meaningful for this module.


```yaml
name: Nightly Test run (Jahia Release)

on:
  workflow_dispatch:
  schedule:
    - cron:  '0 3 * * *'

jobs:
 integration-tests-rl:
   name: Integration Tests (Jahia RL)
   secrets: inherit
   uses: Jahia/jahia-modules-action/.github/workflows/reusable-integration-tests.yml@v2
   with:
     module_id: serverSettings
     module_branch: main
     jahia_image: jahia/jahia-ee:8
     provisioning_manifest: provisioning-manifest-snapshot.yml
     incident_service: serverSettings-JahiaRL
     testrail_project: ServerSettings Module
     artifact_prefix: serset-rl
     timeout_job: 45
```