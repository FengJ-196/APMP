import ConflictPanel from './ConflictPanel';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ConflictPanel> = {
  title: 'Components/Workspaces/Conflict & Ambiguity Panel',
  component: ConflictPanel,
  args: {
    projectId: 'proj-123',
    sourceOfTruthContent: '# Spec Content\nAdmin accounts must use MFA.',
    onApplyFix: (fix) => alert(`Mock callback trigger: "${fix}"`),
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/projects/proj-123',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof ConflictPanel>;

export const Default: Story = {
  decorators: [
    (Story) => {
      global.fetch = () => new Promise(() => {});
      return <Story />;
    },
  ],
};

export const ScanningInProgress: Story = {
  decorators: [
    (Story) => {
      global.fetch = () => new Promise(() => {});
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    // Automatically trigger scan loading state
    const scanBtn = canvasElement.querySelector('button') as HTMLButtonElement;
    if (scanBtn) {
      scanBtn.click();
    }
  },
};

export const PerfectSpecNoConflicts: Story = {
  decorators: [
    (Story) => {
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as Response);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const scanBtn = canvasElement.querySelector('button') as HTMLButtonElement;
    if (scanBtn) {
      scanBtn.click();
    }
  },
};

export const InconsistenciesDetected: Story = {
  decorators: [
    (Story) => {
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          {
            id: 'CF-1',
            type: 'Contradiction',
            severity: 'High',
            description: 'MFA logic contradiction',
            sourceReferences: {
              textSnippets: ['Admin accounts must use MFA.'],
              imageIds: ['file-diagram-auth'],
            },
            llmExplanation: 'The logic flowchart drawn in diagram file file-diagram-auth allows users to login directly without enforcing or routing through MFA blocks.',
            suggestedFix: 'Incorporate MFA verification block inside the flowchart immediately after login.',
          },
          {
            id: 'CF-2',
            type: 'Ambiguity',
            severity: 'Medium',
            description: 'Scalability boundary vagueness',
            sourceReferences: {
              textSnippets: ['System should scale under heavy traffic.'],
              imageIds: [],
            },
            llmExplanation: 'The requirement is highly vague. It does not define exact threshold load parameters (e.g. CPU load, network bandwidth, or transaction concurrency).',
            suggestedFix: 'Specify exact threshold limits (e.g. scale up when node average CPU load exceeds 80% for 5 minutes).',
          },
          {
            id: 'CF-3',
            type: 'Duplicate',
            severity: 'Low',
            description: 'Redundant profile field rule',
            sourceReferences: {
              textSnippets: [
                'User profile holds firstName and lastName fields.',
                'The system records user profile name as fullName.'
              ],
              imageIds: [],
            },
            llmExplanation: 'The structure of the user profile entity is redundant, defining name storage in two conflicting schemas.',
            suggestedFix: 'Unify name storage structure: keep firstName and lastName, and let fullName be a computed property.',
          },
        ]),
      } as Response);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const scanBtn = canvasElement.querySelector('button') as HTMLButtonElement;
    if (scanBtn) {
      scanBtn.click();
    }
  },
};
