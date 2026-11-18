#!/usr/bin/env node
/**
 * Fails when the version in package.json, app.json and the newest changelog entry disagree,
 * or when a changelog entry is missing a language. Run before tagging: `npm run release:check`.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const appVersion = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.version;
const changelog = fs.readFileSync(path.join(root, 'src/data/changelog.ts'), 'utf8');

const versions = [...changelog.matchAll(/^\s+version: '([^']+)'/gm)].map((m) => m[1]);
const problems = [];

if (!versions.length) problems.push('No entries found in src/data/changelog.ts');
if (pkgVersion !== appVersion) {
  problems.push(`package.json (${pkgVersion}) and app.json (${appVersion}) versions differ`);
}
if (versions[0] !== pkgVersion) {
  problems.push(`Newest changelog entry (${versions[0]}) does not match package.json (${pkgVersion})`);
}
if (new Set(versions).size !== versions.length) problems.push('Duplicate versions in changelog');

const enCount = (changelog.match(/^\s+en: \[/gm) || []).length;
const idCount = (changelog.match(/^\s+id: \[/gm) || []).length;
if (enCount !== versions.length || idCount !== versions.length) {
  problems.push('Every changelog entry needs both `en` and `id` notes');
}

if (problems.length) {
  console.error('Release check failed:\n- ' + problems.join('\n- '));
  process.exit(1);
}

console.log(`Release check OK for v${pkgVersion}.`);
console.log(`Next: commit, then  git tag -a v${pkgVersion} -m "Servizio v${pkgVersion}"  &&  git push origin main --follow-tags`);
