# commitlint-azure-pipelines-cli

[![Build Status](https://dev.azure.com/princjef/github-ci/_apis/build/status/princjef.commitlint-azure-pipelines-cli?branchName=master)](https://dev.azure.com/princjef/github-ci/_build/latest?definitionId=1&branchName=master)
[![Code Coverage](https://img.shields.io/azure-devops/coverage/princjef/github-ci/1.svg)](https://dev.azure.com/princjef/github-ci/_build/latest?definitionId=1&branchName=master&view=codecoverage-tab)
[![npm version](https://img.shields.io/npm/v/commitlint-azure-pipelines-cli.svg)](https://npmjs.org/package/commitlint-azure-pipelines-cli)

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

This package is only tested against Node.js 10.x and up. This task is tested
against all of the hosted operating systems (win, mac, linux).

[azure pipelines]: https://azure.microsoft.com/en-us/services/devops/pipelines/
[commitlint]: https://github.com/conventional-changelog/commitlint
