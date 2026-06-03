import RegisterPage from './page';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof RegisterPage> = {
  title: 'Screens/Authentication/Register Screen',
  component: RegisterPage,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/register',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof RegisterPage>;

export const Default: Story = {
  decorators: [
    (Story) => {
      global.fetch = () => new Promise(() => {});
      return <Story />;
    },
  ],
};

export const WeakPasswordStrength: Story = {
  play: async ({ canvasElement }) => {
    const passwordInput = canvasElement.querySelector('#register-password') as HTMLInputElement;
    if (passwordInput) {
      passwordInput.value = '12345';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
};

export const StrongPasswordStrength: Story = {
  play: async ({ canvasElement }) => {
    const passwordInput = canvasElement.querySelector('#register-password') as HTMLInputElement;
    if (passwordInput) {
      passwordInput.value = 'Super!Secure123@Admin';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
};

export const AccountCreationError: Story = {
  decorators: [
    (Story) => {
      // Mock existing account duplicate email error
      global.fetch = () => Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'This email address is already associated with an active account.' }),
      } as Response);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const emailInput = canvasElement.querySelector('#register-email') as HTMLInputElement;
    const passwordInput = canvasElement.querySelector('#register-password') as HTMLInputElement;
    const confirmInput = canvasElement.querySelector('#register-confirm-password') as HTMLInputElement;
    const submitBtn = canvasElement.querySelector('#register-submit') as HTMLButtonElement;

    if (emailInput && passwordInput && confirmInput && submitBtn) {
      emailInput.value = 'duplicate@company.com';
      passwordInput.value = 'complexPassword123!';
      confirmInput.value = 'complexPassword123!';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      submitBtn.click();
    }
  },
};
