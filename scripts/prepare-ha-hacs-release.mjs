import { writeFile } from 'node:fs/promises';
import { verifyPublishedRelease } from './ha-hacs-acceptance-provision.mjs';

const [repository, tag, receipt] = process.argv.slice(2);
if (!receipt) throw new Error('Supply a temporary path for the public release receipt');
const release = await verifyPublishedRelease(repository, tag, { token: process.env.BAYIT_QA_HACS_TOKEN });
await writeFile(receipt, JSON.stringify(release), { mode: 0o600, flag: 'wx' });
console.log('Public release bytes and GitHub credential verified.');
