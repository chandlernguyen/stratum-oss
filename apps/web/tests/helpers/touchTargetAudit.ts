import type { Page } from '@playwright/test'

export interface TouchTargetViolation {
  selector: string
  size: { width: number; height: number }
  text?: string
}

export interface TouchTargetAuditResult {
  violations: TouchTargetViolation[]
  passes: number
  total: number
}

/**
 * Audits all interactive elements on a page to ensure they meet
 * touch target size standards (48x48px minimum for Android, 44x44px for iOS)
 *
 * @param page - Playwright Page object
 * @param minSize - Minimum touch target size in pixels (default: 48)
 * @returns Audit result with violations and passes
 */
export async function auditTouchTargets(
  page: Page,
  minSize: number = 48
): Promise<TouchTargetAuditResult> {
  // Find all interactive elements
  const interactiveElements = await page.locator(
    'button, a, input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], [role="button"], [role="link"], [role="tab"], [role="menuitem"]'
  ).all()

  const violations: TouchTargetViolation[] = []
  let passes = 0

  for (const element of interactiveElements) {
    try {
      // Check if element is visible
      const isVisible = await element.isVisible()
      if (!isVisible) continue

      const box = await element.boundingBox()
      if (!box) continue

      // Check if element meets minimum size requirements
      if (box.width < minSize || box.height < minSize) {
        // Get element identifier for reporting
        const selector = await element.evaluate(el => {
          const tag = el.tagName.toLowerCase()
          const id = el.id ? `#${el.id}` : ''
          const className = el.className ? `.${el.className.toString().split(' ')[0]}` : ''
          const ariaLabel = el.getAttribute('aria-label') ? `[aria-label="${el.getAttribute('aria-label')}"]` : ''
          return `${tag}${id}${className}${ariaLabel}`
        })

        // Get element text for context
        const text = await element.evaluate(el => {
          return el.textContent?.trim().substring(0, 50) || ''
        })

        violations.push({
          selector,
          size: { width: Math.round(box.width), height: Math.round(box.height) },
          text: text || undefined
        })
      } else {
        passes++
      }
    } catch (error) {
      // Skip elements that throw errors (hidden, detached, etc.)
      continue
    }
  }

  return {
    violations,
    passes,
    total: violations.length + passes
  }
}

/**
 * Formats audit results for console output
 */
export function formatAuditReport(result: TouchTargetAuditResult): string {
  const passRate = result.total > 0
    ? ((result.passes / result.total) * 100).toFixed(1)
    : '0'

  let report = `\n${'='.repeat(80)}\n`
  report += `Touch Target Audit Report\n`
  report += `${'='.repeat(80)}\n\n`
  report += `Total interactive elements: ${result.total}\n`
  report += `Passed: ${result.passes} (${passRate}%)\n`
  report += `Failed: ${result.violations.length}\n\n`

  if (result.violations.length > 0) {
    report += `Violations (size < 48x48px):\n`
    report += `${'-'.repeat(80)}\n`

    result.violations.forEach((violation, index) => {
      report += `\n${index + 1}. ${violation.selector}\n`
      report += `   Size: ${violation.size.width}x${violation.size.height}px\n`
      if (violation.text) {
        report += `   Text: "${violation.text}"\n`
      }
    })
  }

  report += `\n${'='.repeat(80)}\n`
  return report
}
