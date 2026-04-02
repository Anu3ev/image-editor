import fs from 'node:fs'
import path from 'node:path'

const summaryPath = path.resolve('coverage/coverage-summary.json')
const outputPath = path.resolve('coverage/unit-coverage.svg')

if (!fs.existsSync(summaryPath)) {
  throw new Error(`coverage summary not found: ${summaryPath}`)
}

const coverage = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
const linesPct = Math.round(coverage.total.lines.pct)

const label = 'unit coverage'
const value = `${linesPct}%`
const color = resolveBadgeColor(linesPct)

const labelWidth = resolveTextWidth(label)
const valueWidth = resolveTextWidth(value)
const width = labelWidth + valueWidth
const valueX = labelWidth
const valueTextX = labelWidth + (valueWidth / 2)
const labelTextX = labelWidth / 2

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${value}">
<linearGradient id="s" x2="0" y2="100%">
  <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
  <stop offset="1" stop-opacity=".1"/>
</linearGradient>
<clipPath id="r">
  <rect width="${width}" height="20" rx="3" fill="#fff"/>
</clipPath>
<g clip-path="url(#r)">
  <rect width="${labelWidth}" height="20" fill="#555"/>
  <rect x="${valueX}" width="${valueWidth}" height="20" fill="${color}"/>
  <rect width="${width}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
  <text x="${labelTextX}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
  <text x="${labelTextX}" y="14">${label}</text>
  <text x="${valueTextX}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
  <text x="${valueTextX}" y="14">${value}</text>
</g>
</svg>
`

fs.writeFileSync(outputPath, svg)

function resolveTextWidth(text) {
  return (text.length * 7) + 10
}

function resolveBadgeColor(linesPct) {
  if (linesPct >= 90) {
    return '#4c1'
  }

  if (linesPct >= 80) {
    return '#97ca00'
  }

  if (linesPct >= 70) {
    return '#dfb317'
  }

  if (linesPct >= 60) {
    return '#fe7d37'
  }

  return '#e05d44'
}
