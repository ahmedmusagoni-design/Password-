import { by, device, element, expect } from 'detox';

describe('family account entry', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('explains what the Expo app can and cannot access before sign-in', async () => {
    await expect(element(by.id('auth-title'))).toBeVisible();
    await expect(element(by.id('privacy-disclosure'))).toBeVisible();
  });
});
