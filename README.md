# commitlint-azure-pipelines-cli

Lint relevant commits for a branch or Pull Request in [Azure Pipelines][] using
[commitlint][] with no configuration needed.

## Getting Started

Add this package and commitlint to your dev dependencies:

```
npm install --save-dev @commitlint/cli commitlint-azure-pipelines-cli
```

Then, in your `azure-pipelines.yml` file, add a step to invoke it:

```yml
steps:
  # Other steps (e.g. install, setup)
  - script: ./node_modules/.bin/commitlint-azure-pipelines
```

Alternatively, you can add a standalone job for running commitlint:

```yml
jobs:
  - job: commitlint
    pool:
      vmImage: 'ubuntu-16.04'
    steps:
      - task: NodeTool@0
        inputs:
          versionSpec: 10.x
      - script: npm ci
      - script: ./node_modules/.bin/commitlint-azure-pipelines
        name: Lint commits
```

## Compatibility

This package is only tested against the latest Node.js LTS release. Make sure
you select the latest LTS release for your commitlint step/job. This task is
tested against all of the hosted operating systems (win, mac, linux).

[azure pipelines]: https://azure.microsoft.com/en-us/services/devops/pipelines/
[commitlint]: https://github.com/conventional-changelog/commitlint
