import { documentMetadata } from "./document-format.js";
import type { Profile } from "../core/types.js";
import type { TopicContract } from "./topics/contract.js";
import { workerServiceTopics } from "./topics/worker-service.js";
import { infraModuleTopics } from "./topics/infra-module.js";
import { dataPipelineTopics } from "./topics/data-pipeline.js";
import { libraryTopics } from "./topics/library.js";
import { sdkTopics } from "./topics/sdk.js";
import { desktopAppTopics } from "./topics/desktop-app.js";
import { apiServiceTopics } from "./topics/api-service.js";
import { engineeringOperationsTopics } from "./topics/engineering-operations.js";
import { cliToolTopics } from "./topics/cli-tool.js";
import { webAppTopics } from "./topics/web-app.js";
import { mobileAppTopics } from "./topics/mobile-app.js";
import { githubActionTopics } from "./topics/github-action.js";
import { browserExtensionTopics } from "./topics/browser-extension.js";
import { pluginTopics } from "./topics/plugin.js";
import { docsSiteTopics } from "./topics/docs-site.js";
import { monorepoTopics } from "./topics/monorepo.js";

const topicContracts: Readonly<Record<string, TopicContract>> = {
  ...workerServiceTopics,
  ...infraModuleTopics,
  ...dataPipelineTopics,
  ...libraryTopics,
  ...sdkTopics,
  ...desktopAppTopics,
  ...apiServiceTopics,
  ...engineeringOperationsTopics,
  ...cliToolTopics,
  ...webAppTopics,
  ...mobileAppTopics,
  ...githubActionTopics,
  ...browserExtensionTopics,
  ...pluginTopics,
  ...docsSiteTopics,
  ...monorepoTopics,
};

export function renderTopicDocument(filePath: string, title: string, profile?: Profile): string | undefined {
  const topic = topicContracts[filePath];
  if (topic === undefined) return undefined;
  return `# ${title}

${documentMetadata([["Status", "Draft"], ...(profile === undefined ? [] : [["Repository Type", profile] as const])])}

## Contract

${topic.purpose}
${topic.source ? `\nProject-wide decisions: ${topic.source}\n` : ""}
## Required Decisions

${topic.decisions.map((decision) => `- ${decision}`).join("\n")}

## Verification

- Owner: UNASSIGNED
- Source of truth and related ADR: UNDECIDED
- Required evidence and remaining gaps: UNDECIDED
- Validation route: VALIDATION.md
`;
}
