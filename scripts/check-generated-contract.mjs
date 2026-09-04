import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const contractPath = new URL('../contracts/headless-commerce-v1.openapi.yaml', import.meta.url);
const digestPath = new URL('../contracts/headless-commerce-v1.openapi.sha256', import.meta.url);
const generatedPath = new URL('../src/generated/headless-contract.ts', import.meta.url);
const expectedDigests = new Map(
  (await readFile(digestPath, 'utf8')).trim().split('\n').map((line) => {
    const [digest, path] = line.trim().split(/\s+/);
    return [path, digest];
  }),
);
const actualDigest = createHash('sha256').update(await readFile(contractPath)).digest('hex');
const generatedDigest = createHash('sha256').update(await readFile(generatedPath)).digest('hex');

if (actualDigest !== expectedDigests.get('headless-commerce-v1.openapi.yaml')) {
  throw new Error('OpenAPI snapshot changed. Review it, regenerate types, and update both recorded digests.');
}
if (generatedDigest !== expectedDigests.get('../src/generated/headless-contract.ts')) {
  throw new Error('Generated OpenAPI types changed. Regenerate from the reviewed snapshot and update both recorded digests.');
}
console.log(`Reviewed OpenAPI snapshot ${actualDigest}; generated types ${generatedDigest}`);
