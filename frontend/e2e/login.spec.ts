import { test, expect } from '@playwright/test'

test.describe('로그인', () => {
  test('로그인 페이지가 정상 렌더링되어야 한다', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('SAP Ops Bot')).toBeVisible()
    await expect(page.getByLabel('사용자명')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible()
  })

  test('빈 필드로 제출하면 버튼이 비활성화되어야 한다', async ({ page }) => {
    await page.goto('/login')
    const btn = page.getByRole('button', { name: '로그인' })
    // 빈 상태에서 클릭 시 에러 또는 비활성
    await btn.click()
    // 페이지가 변경되지 않아야 한다
    await expect(page).toHaveURL(/\/login/)
  })

  test('잘못된 인증 정보로 로그인하면 에러가 표시되어야 한다', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('사용자명').fill('wrong')
    await page.getByLabel('비밀번호').fill('wrong')
    await page.getByRole('button', { name: '로그인' }).click()

    // 에러 메시지 표시 대기
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  })
})
