import * as commitlint from '@commitlint/cli';
import * as execa from 'execa';

export default async function commitlintAzurePipelines() {
  if (process.env.TF_BUILD !== 'True') {
    throw new Error(
      'commitlint-azure-pipelines-cli is designed to be used in Azure Pipelines.'
    );
  }

  const { from, to } = await getCommitRange();

  await lint(from, to);
}

function isPR() {
  return process.env.BUILD_REASON === 'PullRequest';
}

async function getCommitRange(): Promise<{ from: string; to: string }> {
  if (isPR()) {
    return {
      from: await lastTargetCommit(),
      to: await lastPrCommit(),
    };
  }

  const commit = process.env.BUILD_SOURCEVERSION!;
  return { from: commit, to: commit };
}

async function lastPrCommit(): Promise<string> {
  const { stdout } = await execa('git', ['rev-parse', 'HEAD^2']);
  return stdout;
}

async function lastTargetCommit(): Promise<string> {
  const { stdout } = await execa('git', ['rev-parse', 'HEAD^1']);
  return stdout;
}

async function lint(fromHash: string, toHash: string): Promise<void> {
  if (fromHash === toHash) {
    const { stdout } = await execa('git', [
      'log',
      '-n',
      '1',
      '--pretty=format:%B',
      fromHash,
    ]);
    await execa(commitlint, [], {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: stdout,
    });
  } else {
    await execa(commitlint, ['--from', fromHash, '--to', toHash], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  }
}
