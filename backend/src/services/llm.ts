import OpenAI from 'openai';
import type {
  AIAnalysis,
  BuildFailureDetails,
  DeploymentInfo,
  GitHubCommit,
  MetricsSummary,
} from '../types.js';
import type { CommitWithFiles } from './github.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

export async function analyzeIncident(
  alertMessage: string,
  alertSource: string,
  deployments: DeploymentInfo[],
  commits: GitHubCommit[],
  metrics: MetricsSummary | null,
  buildFailure: BuildFailureDetails | null = null,
  commitWithFiles: CommitWithFiles | null = null
): Promise<{ analysis: AIAnalysis; slackSummary: string; suggestedActions: string[] }> {
  if (!process.env.OPENAI_API_KEY) {
    return getFallbackAnalysis(alertMessage, deployments, commits, buildFailure);
  }

  const context = buildContext(
    alertMessage,
    alertSource,
    deployments,
    commits,
    metrics,
    buildFailure,
    commitWithFiles
  );

  const systemPrompt = `You are an incident response assistant. Your job is to give SPECIFIC, ACTIONABLE analysis—not generic advice.

CRITICAL RULES:
1. **Root cause**: Cite the EXACT error message, file name, and line if available. Example: "Build failed in step BUILD: 'TypeError: Cannot read property X of undefined' at src/Component.tsx:42" — NOT "check build logs".
2. **Impact**: Be specific. "Build blocked; no new deploys until fixed" or "Users in region X affected" — NOT "scope unknown".
3. **Suggested actions**: Concrete steps. "Revert commit abc1234" or "Fix the undefined reference in Component.tsx line 42" — NOT "review logs" or "check application logs".
4. **Confidence**: high when you have the actual error + code; medium when you have partial evidence; low only when context is missing.

If you have build failure output (statusReason) or commit diff (patch), USE THEM. Point to the exact line or error. Never give advice a human could give without reading the data.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty LLM response');

    const parsed = JSON.parse(content) as {
      suspectedRootCause: string;
      impactEstimate: string;
      suggestedActions: string[];
      confidence: 'low' | 'medium' | 'high';
      slackSummary: string;
    };

    const analysis: AIAnalysis = {
      suspectedRootCause: parsed.suspectedRootCause,
      impactEstimate: parsed.impactEstimate,
      suggestedActions: parsed.suggestedActions ?? [],
      confidence: parsed.confidence ?? 'medium',
    };

    return {
      analysis,
      slackSummary: parsed.slackSummary ?? formatSlackSummary(alertMessage, analysis),
      suggestedActions: parsed.suggestedActions ?? analysis.suggestedActions,
    };
  } catch (err) {
    console.error('LLM analysis error:', err);
    return getFallbackAnalysis(alertMessage, deployments, commits, buildFailure);
  }
}

function buildContext(
  alertMessage: string,
  alertSource: string,
  deployments: DeploymentInfo[],
  commits: GitHubCommit[],
  metrics: MetricsSummary | null,
  buildFailure: BuildFailureDetails | null,
  commitWithFiles: CommitWithFiles | null
): string {
  const parts = [
    `## Alert`,
    `Source: ${alertSource}`,
    `Message: ${alertMessage}`,
    '',
    '## Recent Deployments',
    deployments.length
      ? deployments.map((d) => `- ${d.timestamp} | ${d.service} | ${d.status} | ${d.commitSha ?? 'N/A'}`).join('\n')
      : 'None found',
    '',
    '## Recent Commits',
    commits.length
      ? commits.map((c) => `- ${c.sha} | ${c.author} | ${c.message}`).join('\n')
      : 'None found',
  ];

  if (buildFailure && buildFailure.failedSteps.length > 0) {
    parts.push('', '## Build Failure Details (USE THIS - actual error output)');
    for (const step of buildFailure.failedSteps) {
      parts.push(`Step: ${step.stepName} | Status: ${step.status}`);
      if (step.statusReason) {
        parts.push(`Error: ${step.statusReason}`);
      }
      if (step.logUrl) parts.push(`Logs: ${step.logUrl}`);
    }
    if (buildFailure.commitId) parts.push(`Failing commit: ${buildFailure.commitId}`);
    if (buildFailure.commitMessage) parts.push(`Commit message: ${buildFailure.commitMessage}`);
  }

  if (commitWithFiles && commitWithFiles.files.length > 0) {
    parts.push('', '## Code Changes in Suspect Commit (USE THIS - actual diff)');
    parts.push(`Commit: ${commitWithFiles.sha} | ${commitWithFiles.message} | ${commitWithFiles.author}`);
    for (const f of commitWithFiles.files) {
      parts.push(`\n--- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions}) ---`);
      if (f.patch) {
        parts.push(f.patch.length > 2000 ? f.patch.slice(0, 2000) + '\n...(truncated)' : f.patch);
      }
    }
  }

  if (metrics) {
    parts.push('', '## Metrics Summary', JSON.stringify(metrics, null, 2));
  }

  parts.push('', 'Respond with JSON: { suspectedRootCause, impactEstimate, suggestedActions, confidence, slackSummary }');
  return parts.join('\n');
}

function formatSlackSummary(alertMessage: string, analysis: AIAnalysis): string {
  return [
    `🚨 *Incident Alert*`,
    `_${alertMessage}_`,
    '',
    `*Suspected cause:* ${analysis.suspectedRootCause}`,
    `*Impact:* ${analysis.impactEstimate}`,
    `*Suggested actions:*`,
    ...analysis.suggestedActions.map((a) => `• ${a}`),
  ].join('\n');
}

function getFallbackAnalysis(
  alertMessage: string,
  deployments: DeploymentInfo[],
  commits: GitHubCommit[],
  buildFailure: BuildFailureDetails | null = null
): { analysis: AIAnalysis; slackSummary: string; suggestedActions: string[] } {
  let suspectedRootCause: string;
  let suggestedActions: string[];

  if (buildFailure && buildFailure.failedSteps.length > 0) {
    const step = buildFailure.failedSteps[0];
    suspectedRootCause = step.statusReason
      ? `Build failed in ${step.stepName}: ${step.statusReason}`
      : `Build failed in step ${step.stepName}. Check logs: ${step.logUrl ?? 'Amplify console'}`;
    suggestedActions = [
      step.logUrl ? `View build logs: ${step.logUrl}` : 'Check Amplify build logs in AWS console',
      buildFailure.commitId ? `Inspect commit ${buildFailure.commitId} for the breaking change` : 'Review recent commits',
      'Fix the error and push a new commit to trigger rebuild',
    ];
  } else if (commits[0]) {
    suspectedRootCause = `Recent commit ${commits[0].sha} (${commits[0].message}) may have introduced the issue.`;
    suggestedActions = [
      `Review commit ${commits[0].sha}: ${commits[0].url}`,
      'Check the diff for syntax errors or breaking changes',
      'Consider reverting if the change is clearly problematic',
    ];
  } else {
    suspectedRootCause = 'Insufficient context. Configure GITHUB_REPO, AWS credentials, and ensure EventBridge passes jobId/branchName/appId.';
    suggestedActions = [
      'Check Amplify build logs in AWS console',
      'Verify GITHUB_REPO and GITHUB_TOKEN are set for commit context',
      'Ensure the webhook receives appId, branchName, jobId from Amplify events',
    ];
  }

  const analysis: AIAnalysis = {
    suspectedRootCause,
    impactEstimate: buildFailure ? 'Build blocked; no new deploys until fixed' : 'Scope unknown without build details',
    suggestedActions,
    confidence: buildFailure ? 'medium' : 'low',
  };

  return {
    analysis,
    slackSummary: formatSlackSummary(alertMessage, analysis),
    suggestedActions: analysis.suggestedActions,
  };
}

export async function generatePostmortemDraft(
  incidentId: string,
  alertMessage: string,
  analysis: AIAnalysis,
  resolutionNotes?: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return getFallbackPostmortem(alertMessage, analysis, resolutionNotes);
  }

  const prompt = `Generate a concise postmortem draft for incident ${incidentId}.

Alert: ${alertMessage}
Suspected root cause: ${analysis.suspectedRootCause}
Impact: ${analysis.impactEstimate}
Resolution: ${resolutionNotes ?? 'To be documented'}

Include: Summary, Timeline, Root Cause, Impact, Resolution, Action Items. Be professional and factual.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    return completion.choices[0]?.message?.content ?? getFallbackPostmortem(alertMessage, analysis, resolutionNotes);
  } catch {
    return getFallbackPostmortem(alertMessage, analysis, resolutionNotes);
  }
}

function getFallbackPostmortem(
  alertMessage: string,
  analysis: AIAnalysis,
  resolutionNotes?: string
): string {
  return `# Postmortem

## Summary
${alertMessage}

## Suspected Root Cause
${analysis.suspectedRootCause}

## Impact
${analysis.impactEstimate}

## Resolution
${resolutionNotes ?? 'To be documented after resolution.'}

## Action Items
${analysis.suggestedActions.map((a) => `- [ ] ${a}`).join('\n')}
`;
}
