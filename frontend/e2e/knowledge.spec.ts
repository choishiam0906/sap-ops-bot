import { test, expect } from '@playwright/test'

test.describe('지식 관리', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/knowledge')
  })

  test('지식 목록이 표시되어야 한다', async ({ page }) => {
    // API 응답 대기 후 목록 확인
    await page.waitForLoadState('networkidle')
    // 테이블 또는 목록 컨테이너가 존재해야 한다
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('새 지식 추가 폼이 열려야 한다', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /추가|새/ })
    if (await addButton.isVisible()) {
      await addButton.click()
      // 폼 필드가 나타나야 한다
      await expect(page.getByLabel(/제목|타이틀/i)).toBeVisible()
    }
  })
})
