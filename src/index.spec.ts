import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import * as execa from 'execa';
import * as rimraf from 'rimraf';

import commitlintAzurePipelines from './';

const REPO_DIR = path.join(__dirname, '../test');

jest.setTimeout(15000);

describe('commitlint-azure-pipelines-cli', () => {
  let repo: RepoOps;

  beforeEach(async () => {
    repo = await initRepo();
  });

  afterEach(async () => {
    await repo.cleanUp();
  });

  it('fails when running outside Azure Pipelines', async () => {
    await expect(run({})).rejects.toThrow(
      /commitlint-azure-pipelines-cli is designed to be used in Azure Pipelines/
    );
  });

  it('runs on the latest commit for non-forks', async () => {
    await repo.commit('chore(test): file a');
    const hash = await repo.commit('chore(test): file b');

    await run({
      TF_BUILD: 'True',
      BUILD_REASON: 'IndividualCI',
      BUILD_SOURCEVERSION: hash,
    });
  });

  it('fails if the last commit is not in the correct style', async () => {
    await repo.commit('chore(test): file a');
    const hash = await repo.commit('bad commit message');

    await expect(
      run({
        TF_BUILD: 'True',
        BUILD_REASON: 'IndividualCI',
        BUILD_SOURCEVERSION: hash,
      })
    ).rejects.toThrow();
  });

  it('succeeds even if an older commit is invalid', async () => {
    await repo.commit('bad commit message');
    const hash = await repo.commit('chore(test): file b');

    await run({
      TF_BUILD: 'True',
      BUILD_REASON: 'IndividualCI',
      BUILD_SOURCEVERSION: hash,
    });
  });

  it('validates all added commits for pull requests', async () => {
    await repo.commit('chore: main commit');
    await repo.fork('fork');

    await repo.commit('chore: fork commit 1');
    await repo.commit('chore: fork commit 2');
    await repo.pr('fork', 'pr');

    await run({
      TF_BUILD: 'True',
      BUILD_REASON: 'PullRequest',
      BUILD_SOURCEBRANCH: 'refs/heads/pr',
      SYSTEM_PULLREQUEST_TARGETBRANCH: 'refs/heads/main',
    });
  });

  it('fails if the latest PR commit is invalid', async () => {
    await repo.commit('chore: main commit');
    await repo.fork('fork');

    await repo.commit('chore: fork commit 1');
    await repo.commit('bad commit message');
    await repo.pr('fork', 'pr');

    await expect(
      run({
        TF_BUILD: 'True',
        BUILD_REASON: 'PullRequest',
        BUILD_SOURCEBRANCH: 'refs/heads/pr',
        SYSTEM_PULLREQUEST_TARGETBRANCH: 'refs/heads/main',
      })
    ).rejects.toThrow();
  });

  it('fails if another PR commit is invalid', async () => {
    await repo.commit('chore: main commit');
    await repo.fork('fork');

    await repo.commit('bad commit message');
    await repo.commit('chore: fork commit 2');
    await repo.pr('fork', 'pr');

    await expect(
      run({
        TF_BUILD: 'True',
        BUILD_REASON: 'PullRequest',
        BUILD_SOURCEBRANCH: 'refs/heads/pr',
        SYSTEM_PULLREQUEST_TARGETBRANCH: 'refs/heads/main',
      })
    ).rejects.toThrow();
  });

  it('succeeds if a commit on the target branch is invalid', async () => {
    await repo.commit('bad commit message');
    await repo.fork('fork');

    await repo.commit('chore: fork commit 1');
    await repo.commit('chore: fork commit 2');
    await repo.pr('fork', 'pr');

    await run({
      TF_BUILD: 'True',
      BUILD_REASON: 'PullRequest',
      BUILD_SOURCEBRANCH: 'refs/heads/pr',
      SYSTEM_PULLREQUEST_TARGETBRANCH: 'refs/heads/main',
    });
  });
});

async function run(env: { [key: string]: string }) {
  const restore = mockEnvironment(env);
  try {
    await commitlintAzurePipelines();
  } finally {
    restore();
  }
}

function mockEnvironment(env: NodeJS.ProcessEnv) {
  const currentDir = process.cwd();
  process.chdir(REPO_DIR);
  const processEnv = { ...process.env };

  const newProcessEnv: NodeJS.ProcessEnv = {};

  for (const [k, v] of Object.entries(processEnv)) {
    if (
      k.startsWith('BUILD_') ||
      k.startsWith('AGENT_') ||
      k.startsWith('SYSTEM_') ||
      k.startsWith('TF_')
    ) {
      continue;
    }

    newProcessEnv[k] = v;
  }

  process.env = {
    ...newProcessEnv,
    ...env,
  };

  return () => {
    process.env = processEnv;
    process.chdir(currentDir);
  };
}

async function initRepo(): Promise<RepoOps> {
  await util.promisify(fs.mkdir)(REPO_DIR);
  await execa('git', ['init', '-b', 'main'], { cwd: REPO_DIR });
  await execa('git', ['config', 'user.email', 'test@test.com'], {
    cwd: REPO_DIR,
  });
  await execa('git', ['config', 'user.name', 'Test'], { cwd: REPO_DIR });

  let fileNum = 0;

  return {
    async commit(message: string) {
      const file = path.join(REPO_DIR, `${fileNum}.txt`);
      fileNum += 1;
      await util.promisify(fs.writeFile)(file, 'data');
      await execa('git', ['add', '-A'], { cwd: REPO_DIR });
      await execa('git', ['commit', '-am', message], { cwd: REPO_DIR });

      const { stdout } = await execa(
        'git',
        ['log', '-n', '1', '--pretty=format:%H'],
        { cwd: REPO_DIR }
      );
      return stdout;
    },

    async fork(branch: string, commitsBehind: number = 0) {
      if (commitsBehind > 0) {
        await execa('git', ['checkout', `HEAD~${commitsBehind}`], {
          cwd: REPO_DIR,
        });
      }

      await execa('git', ['checkout', '-b', branch], { cwd: REPO_DIR });
    },

    async pr(branch: string, prBranch: string) {
      await execa('git', ['checkout', 'main'], { cwd: REPO_DIR });
      await execa('git', ['checkout', '-b', prBranch], { cwd: REPO_DIR });
      await execa(
        'git',
        ['merge', '--no-ff', '--allow-unrelated-histories', branch],
        { cwd: REPO_DIR }
      );
      return prBranch;
    },

    async cleanUp() {
      await util.promisify(rimraf)(path.join(REPO_DIR));
    },
  };
}

interface RepoOps {
  commit(message: string): Promise<string>;
  fork(branch: string, commitsBehind?: number): Promise<void>;
  pr(branch: string, prBranch: string): Promise<string>;
  cleanUp(): Promise<void>;
}
