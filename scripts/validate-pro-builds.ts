/**
 * Validate pro build items across all heroes.
 * Checks every item name against local catalog and icon files.
 *
 * Run: npx tsx scripts/validate-pro-builds.ts
 */
import fs from 'fs';
import path from 'path';
import { resolveItem } from '../src/lib/itemResolver';

const ROOT = process.cwd();
const HERO_DIR = path.join(ROOT, 'data', 'heroes');

interface Issue {
  hero: string;
  buildIndex: number;
  itemName: string;
  issue: string;
}

const issues: Issue[] = [];
let totalBuilds = 0;
let totalItems = 0;
let resolvedCount = 0;
let unresolvedCount = 0;
let compoundCount = 0;
let aliasCount = 0;

const heroFiles = fs.readdirSync(HERO_DIR).filter(f => f.endsWith('.json'));

for (const file of heroFiles) {
  const heroId = file.replace('.json', '');
  const raw = fs.readFileSync(path.join(HERO_DIR, file), 'utf-8').replace(/^\uFEFF/, '');
  const hero = JSON.parse(raw);
  const heroName = hero.name || hero.heroName || heroId;

  const builds = hero.proBuilds || hero.pro_builds || [];
  for (let bi = 0; bi < builds.length; bi++) {
    const build = builds[bi];
    if (!build.items || !Array.isArray(build.items)) continue;
    totalBuilds++;

    for (const item of build.items) {
      if (!item || typeof item !== 'string' || item.trim() === '') {
        issues.push({ hero: heroName, buildIndex: bi, itemName: String(item), issue: 'Empty/null item slot' });
        unresolvedCount++;
        totalItems++;
        continue;
      }

      totalItems++;
      const resolved = resolveItem(item);

      if (!resolved.isResolved) {
        issues.push({ hero: heroName, buildIndex: bi, itemName: item, issue: `Unresolved — no catalog match for "${item}"` });
        unresolvedCount++;
      } else {
        resolvedCount++;
        if (resolved.isCompound) compoundCount++;
        if (resolved.canonicalName !== item) aliasCount++;
      }
    }
  }
}

// Print report
console.log('\n=== PRO BUILDS ITEM AUDIT ===\n');
console.log(`Heroes checked: ${heroFiles.length}`);
console.log(`Total builds: ${totalBuilds}`);
console.log(`Total item slots: ${totalItems}`);
console.log(`Resolved: ${resolvedCount}`);
console.log(`  - Aliases resolved: ${aliasCount}`);
console.log(`  - Compound items: ${compoundCount}`);
console.log(`Unresolved: ${unresolvedCount}`);
console.log(`Issues found: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n=== ISSUES ===\n');
  for (const issue of issues.slice(0, 50)) {
    console.log(`  [${issue.hero}] Build #${issue.buildIndex + 1}: "${issue.itemName}" — ${issue.issue}`);
  }
  if (issues.length > 50) {
    console.log(`  ... and ${issues.length - 50} more`);
  }
}

// Write to file
const reportPath = path.join(ROOT, 'reports', 'pro-builds-audit.md');
const reportDir = path.dirname(reportPath);
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

let report = `# Pro Builds Item Audit — ${new Date().toISOString().split('T')[0]}\n\n`;
report += `## Summary\n`;
report += `- Heroes checked: ${heroFiles.length}\n`;
report += `- Total builds: ${totalBuilds}\n`;
report += `- Total item slots: ${totalItems}\n`;
report += `- Resolved: ${resolvedCount} (${((resolvedCount / totalItems) * 100).toFixed(1)}%)\n`;
report += `- Aliases resolved: ${aliasCount}\n`;
report += `- Compound items: ${compoundCount}\n`;
report += `- Unresolved: ${unresolvedCount}\n\n`;

if (issues.length > 0) {
  report += `## Issues (${issues.length})\n\n`;
  report += `| Hero | Build # | Item | Issue |\n|------|---------|------|-------|\n`;
  for (const issue of issues) {
    report += `| ${issue.hero} | ${issue.buildIndex + 1} | ${issue.itemName} | ${issue.issue} |\n`;
  }
} else {
  report += `## Issues\n\nNo issues found — all items resolved successfully.\n`;
}

fs.writeFileSync(reportPath, report, 'utf-8');
console.log(`\nReport saved to: ${reportPath}`);

process.exit(issues.length > 0 ? 1 : 0);
