import { test, expect } from '@playwright/test'

test.describe('네비게이션', () => {
  test('대시보드 페이지가 로드되어야 한다', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('지식 관리 페이지로 이동할 수 있어야 한다', async ({ page }) => {
    await page.goto('/')
    await page.click('text=지식 관리')
    await expect(page).toHaveURL(/\/knowledge/)
  })

  test('채팅 이력 페이지로 이동할 수 있어야 한다', async ({ page }) => {
    await page.goto('/')
    await page.click('text=채팅 이력')
    await expect(page).toHaveURL(/\/history/)
  })
})
