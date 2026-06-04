export const DIAGRAM_TO_MERMAID_PROMPT = `IDENTIFY AND CONVERT THIS DIAGRAM TO MERMAID.JS.
ACT AS A DIAGRAM EXPERT. If this image is a Flowchart, Use Case, Sequence, or Class diagram, convert it to valid Mermaid.js code.

RULES:
1. Return ONLY the code. No explanations.
2. If NOT a diagram, return the string: "NULL".
3. Ensure syntax is perfectly compatible with Mermaid Live Editor.`;

export const BATCH_DIAGRAMS_TO_MERMAID_PROMPT = (count: number) => `ANALYSIS OF MULTIPLE DIAGRAMS.
You are an expert Diagram Engineer. I am providing ${count} individual images.

TASK:
For EACH image provided, convert it into valid Mermaid.js code.
If an image is NOT a diagram, return the string "NULL" for that index.

OUTPUT FORMAT (JSON ONLY):
{
  "diagrams": [
    { "id": 1, "mermaid": "graph TD;..." },
    { "id": 2, "mermaid": "NULL" }
  ]
}

CRITICAL: Maintain the exact order of diagrams provided.`;

export const TEXT_TO_MARKDOWN_PROMPT = `You are a document formatting expert. Reformat the following unstructured text into clean, well-structured Markdown.

RULES:
1. Use proper hierarchical headings (# ## ### ####) to organize sections.
2. Use bullet lists, numbered lists, and bold/italic text where appropriate.
3. Correct minor OCR or extraction errors (broken words, garbled characters) if they are obvious.
4. Preserve ALL technical details, requirements, and specifications exactly as written.
5. **CRITICAL: You MUST include the ENTIRE document content. Do NOT summarize, truncate, skip, or omit ANY section.** Every paragraph, every requirement, every detail from the original must appear in your output.
6. If the document is long, continue formatting until the very last line. Never stop early.
7. Return ONLY the formatted Markdown. No explanations, no preamble, no closing remarks.`;

export const ANALYZE_CONFLICTS_PROMPT = `You are an expert Software Requirements Engineer. Your primary task is to act as an automated Conflict and Ambiguity Detection Engine.
You will be provided with the Source of Truth of an SRS document consisting of Extracted Text and Logic Diagram Codes (Mermaid.js).

YOUR MISSION:
Identify structural inconsistencies, logical friction, or overlapping ambiguities between requirements, specifically checking if the flow charted in diagrams contradicts the stated textual rules.

DETECTION CATEGORIES:
1. Contradiction: Two statements or a statement and a diagram directly oppose each other.
2. Ambiguity: A requirement is vague, allowing multiple valid but conflicting interpretations.
3. Duplicate: Identical functional rules are restated inconsistently.

OUTPUT FORMAT (JSON ARRAY ONLY):
[
  {
    "id": "CF-1",
    "type": "Contradiction",
    "severity": "High",
    "description": "Short description",
    "sourceReferences": { "textSnippets": ["Relevant text"], "imageIds": ["Relevant image ID"] },
    "llmExplanation": "Detailed explanation",
    "suggestedFix": "How to fix it"
  }
]

If no conflicts exist, return [].`;

/**
 * Builds a highly-structured and custom-tailored AI prompt for decomposing
 * a requirements specification (Source of Truth) into a 4-level Work Breakdown Structure (WBS)
 * matching active constraints (technology stack, resources split, compliance rules, timelines).
 */
export function buildWBSBreakdownPrompt(sourceOfTruth: string, config: any): string {
  const languagesStr = config.techStack?.languages?.length ? config.techStack.languages.join(', ') : 'Not specified';
  const frameworksStr = config.techStack?.frameworks?.length ? config.techStack.frameworks.join(', ') : 'Not specified';
  const databasesStr = config.techStack?.databases?.length ? config.techStack.databases.join(', ') : 'Not specified';
  const cloudStr = config.techStack?.cloud?.length ? config.techStack.cloud.join(', ') : 'Not specified';
  
  const complianceStr = config.compliance?.length ? config.compliance.join(', ') : 'Not specified';
  const integrationsStr = config.integrations?.length ? config.integrations.join(', ') : 'Not specified';
  
  const expectedDuration = config.timeline?.expectedDurationMonths ? `${config.timeline.expectedDurationMonths} months` : 'Not specified';
  const sprintLength = config.timeline?.sprintLengthWeeks ? `${config.timeline.sprintLengthWeeks}-week sprints` : 'Not specified';

  return `You are a Principal Software Architect and seasoned Agile Project Manager. Your task is to analyze the provided Source of Truth (system requirements specification) and decompose it into a highly accurate, 4-level Work Breakdown Structure (WBS).

---
## HIERARCHY RULES:
You must strictly enforce a 4-level hierarchy structure:
1. **Level 1: Epic (\`epic\`)**: High-level, coarse-grained requirements grouping major functional modules (e.g. User Authentication, Core Dashboard).
2. **Level 2: User Story (\`story\`)**: Distinct user actions or system behaviors that add concrete value, written in standard format (As a..., I want..., So that...).
3. **Level 3: Task (\`task\`)**: Actionable development tasks required to build the User Story. Tasks must have clear technical names and descriptive details.
4. **Level 4: Subtask (\`subtask\`)**: Reserved as a clean placeholder for future detailed developer task breakdowns. Every Task should contain at least one Subtask placeholder (e.g., "Detailed code execution placeholder").

---
## CONTEXT & CONSTRAINTS (ADDITIONAL CONFIGURATION):
You must tailor the generated tasks and acceptance criteria to the following technical and environment inputs:

### 1. Technology Stack:
*   **Languages**: ${languagesStr}
*   **Frameworks**: ${frameworksStr}
*   **Databases**: ${databasesStr}
*   **Cloud & Infrastructure**: ${cloudStr}
*   *Task Slicing Rule*: All Level 3 Tasks must incorporate concrete technology names and tools. E.g., generate "Write Mongoose schema in MongoDB" rather than a generic "Setup database table".

### 2. Team Composition & Resource Splits:
*   **Team Makeup**: ${config.teamComposition || 'Not specified'}
*   *Task Slicing Rule*: Slice tasks logically based on resource bandwidth and role constraints. Tasks must be small enough for a single developer to complete in a sprint.

### 3. Compliance & Security Standards:
*   **Standards**: ${complianceStr}
*   *Task Slicing Rule*: Inject mandatory development checkups, encryption steps, and validations into Level 3 Tasks and Acceptance Criteria (e.g., OWASP safety rules, GDPR compliance checklists).

### 4. Third-Party Integrations:
*   **Integrations**: ${integrationsStr}
*   *Task Slicing Rule*: Include explicit tasks for credentials setup, third-party API configurations, local mock environments, and integration checks (e.g., Stripe sandbox, SendGrid API client setups).

### 5. Timeline & Sprint Cycles:
*   **Timeline Duration**: ${expectedDuration}
*   **Sprint Cycles**: ${sprintLength}
*   *Task Slicing Rule*: Budget and prioritize tasks so that they correspond to logical development blocks that can fit into the designated sprint cycles.

---
## SOURCE OF TRUTH (REQUIREMENTS SPECIFICATION):
${sourceOfTruth}

---
## OUTPUT FORMAT RULES:
You must structure your response exactly as follows:
1. First, write down your reasoning and plan under the heading "## Architectural Reasoning & Plan" in Markdown. List your main observations, tech stack decisions, sprint allocation plans, and step-by-step breakdown thoughts.
2. Second, write the final WBS JSON array inside a standard \`\`\`json ... \`\`\` code block. Do NOT include any other text after the JSON code block.

Example output structure:
## Architectural Reasoning & Plan
1. **Requirements Analysis**: Analyzing user authentication and dashboard specs...
2. **Tech Stack & Constraints**: Using Next.js, Node, MongoDB...
3. **Sprint Strategy**: Epic Auth in sprint 1...

\`\`\`json
[
  {
    "tempId": "epic-auth",
    "parentTempId": null,
    "title": "Authentication & Authorization",
    "description": "Epic covering user registration, secure login, password resets, and session management.",
    "type": "epic",
    "acceptanceCriteria": [],
    "sourceRequirements": ["REQ-1.1", "REQ-1.2"]
  },
  {
    "tempId": "story-login",
    "parentTempId": "epic-auth",
    "title": "As a user, I want to authenticate securely via credentials, so that I can access my private dashboard.",
    "description": "Standard secure username/password login interface.",
    "type": "story",
    "acceptanceCriteria": [],
    "sourceRequirements": ["REQ-1.1"]
  },
  {
    "tempId": "task-login-backend",
    "parentTempId": "story-login",
    "title": "Develop login API endpoint with token generation",
    "description": "Implement authentication controller, password hashing checks, and JWT token issuance.",
    "type": "task",
    "acceptanceCriteria": [
      "Endpoint POST /api/auth/login exists and accepts email/password.",
      "Passwords are encrypted/checked using bcrypt.",
      "Returns a secure JWT token upon successful authentication.",
      "Handles incorrect credentials by returning a standard 401 error."
    ],
    "sourceRequirements": ["REQ-1.1"]
  },
  {
    "tempId": "subtask-placeholder-login-backend",
    "parentTempId": "task-login-backend",
    "title": "Implement unit tests for login controller",
    "description": "Future detailed placeholder task for unit testing and code refactoring.",
    "type": "subtask",
    "acceptanceCriteria": [],
    "sourceRequirements": ["REQ-1.1"]
  }
]
\`\`\``;
}

/**
 * Builds a prompt to decompose a single Level 3 Task into concrete Level 4 developer subtasks,
 * aligned with the project's technology stack, compliance rules, integrations, and resource bandwidth.
 */
export function buildDeveloperSubtaskBreakdownPrompt(
  task: any,
  config: any,
  sourceOfTruth: string
): string {
  const languagesStr = config.techStack?.languages?.length ? config.techStack.languages.join(', ') : 'Not specified';
  const frameworksStr = config.techStack?.frameworks?.length ? config.techStack.frameworks.join(', ') : 'Not specified';
  const databasesStr = config.techStack?.databases?.length ? config.techStack.databases.join(', ') : 'Not specified';
  const cloudStr = config.techStack?.cloud?.length ? config.techStack.cloud.join(', ') : 'Not specified';
  
  const complianceStr = config.compliance?.length ? config.compliance.join(', ') : 'Not specified';
  const integrationsStr = config.integrations?.length ? config.integrations.join(', ') : 'Not specified';

  return `You are a Senior Lead Developer and technical systems architect. Your goal is to take a high-level Level 3 WBS Task and break it down into concrete, highly-actionable Level 4 Developer Subtasks (concrete coding steps, configuration tasks, unit tests, or security checks).

---
## PARENT LEVEL 3 TASK TO DECOMPOSE:
*   **Task Title**: ${task.title}
*   **Task Description**: ${task.description || 'Not provided'}
*   **Acceptance Criteria**: ${task.acceptanceCriteria?.join('; ') || 'None'}
*   **Traced Requirements**: ${task.sourceRequirements?.join(', ') || 'None'}

---
## TECHNICAL ENVIRONMENT & CONSTRAINTS (WBS CONFIG):
Use these technical contexts to make the subtasks concrete and practical for a developer:
1.  **Tech Stack**:
    *   **Languages**: ${languagesStr}
    *   **Frameworks**: ${frameworksStr}
    *   **Databases**: ${databasesStr}
    *   **Cloud & Infrastructure**: ${cloudStr}
    *   *Rule*: Specify actual libraries, tools, files to modify, or database commands where applicable.
2.  **Team Context**: ${config.teamComposition || 'Not specified'}.
3.  **Compliance Checklists**: ${complianceStr}.
    *   *Rule*: Include subtasks for checking compliance standards, encryption rules, or privacy audits.
4.  **Integrations**: ${integrationsStr}.
    *   *Rule*: Include subtasks for configuring endpoints, webhook routes, credential keys, or sandbox tests.

---
## REQUIREMENTS SYSTEM SOURCE OF TRUTH:
${sourceOfTruth}

---
## OUTPUT FORMAT (JSON ARRAY ONLY):
You must output a single JSON array containing objects matching the schema below. No conversational text, no prefix, and no markdown backticks.

Example JSON output:
[
  {
    "title": "Configure Stripe client and API sandbox keys",
    "description": "Add Stripe package, update env.local with test keys, and initialize the Stripe client instance in lib/stripe.ts."
  },
  {
    "title": "Create database migration and Mongoose schema",
    "description": "Design secure Mongoose schema with indexes on customerId, and apply Mongoose schema to database models."
  },
  {
    "title": "Write unit tests for the checkout API route",
    "description": "Mock Stripe responses and verify that successful payments return a 201 status code and log transactions."
  }
]

CRITICAL: Return ONLY a valid JSON array. Do not wrap the JSON output in \`\`\`json tags.`;
}


