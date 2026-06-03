import SourceOfTruthPanel from './SourceOfTruthPanel';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof SourceOfTruthPanel> = {
  title: 'Components/Workspaces/Source of Truth Panel',
  component: SourceOfTruthPanel,
  args: {
    projectId: 'proj-123',
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
type Story = StoryObj<typeof SourceOfTruthPanel>;

export const Loading: Story = {
  decorators: [
    (Story) => {
      global.fetch = () => new Promise(() => {});
      return <Story />;
    },
  ],
};

export const NotInitialized: Story = {
  decorators: [
    (Story) => {
      // Mock 404 response
      global.fetch = () => Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not Found' }),
      } as Response);
      return <Story />;
    },
  ],
};

export const ActiveSpec: Story = {
  decorators: [
    (Story) => {
      // Mock valid specification loaded
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          id: 'sot-1',
          projectId: 'proj-123',
          content: '# Core Software Requirements (SRS)\n\n## 1. User Management\nAll employees must authenticating using single-sign-on (SSO).\n\n## 2. Notification Pipeline\nSystem must dispatch an SMS alert on high priority database failures.',
          versionNumber: 1,
          versionHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as Response);
      return <Story />;
    },
  ],
};

export const ExtendedVersionHistory: Story = {
  decorators: [
    (Story) => {
      // Mock specification with multiple historical versions
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          id: 'sot-1',
          projectId: 'proj-123',
          content: '# Compiled Requirements Spec\n\n- Version 3 is currently active with fully merged client guidelines.',
          versionNumber: 3,
          versionHistory: [
            { versionNumber: 1, content: '# Draft Spec v1', savedAt: new Date(Date.now() - 3600000 * 2) },
            { versionNumber: 2, content: '# Revised Spec v2', savedAt: new Date(Date.now() - 3600000 * 1) }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as Response);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    // Open version history automatically in story preview
    const historyBtn = canvasElement.querySelector('button:has(svg.lucide-history)') as HTMLButtonElement;
    if (historyBtn) {
      historyBtn.click();
    }
  },
};
