import url from 'node:url';
import path from 'node:path';
import { it, describe, expect } from 'vitest';
import { resolve } from '../src/index.ts';

const trailingSlashRegex = /(\\|\/)$/;
const fixtureRoot = url
	.fileURLToPath(new URL('./fixtures', import.meta.url))
	.replace(trailingSlashRegex, '');

describe.for(['pnpm', 'workspaces'])('resolve', (fixture) => {
	const root = path.resolve(fixtureRoot, fixture);
	const workspacePkg = (name: string) => path.resolve(root, 'packages', name);

	const packages = [
		path.resolve(root, 'direct-ref-pkg'),
		workspacePkg('workspace-app'),
		workspacePkg('workspace-pkg-1'),
		workspacePkg('workspace-pkg-2'),
	];

	it('is resolvable from the workspace root', () => {
		const result = resolve(root);
		expect(result).toEqual({ root, packages });
	});

	it('is resolvable from a child package', () => {
		const result = resolve(path.resolve(root, 'packages', 'workspace-app'));
		expect(result).toEqual({ root, packages });
	});

	it('is resolvable when pointing to a file', () => {
		const result = resolve(path.resolve(root, 'packages', 'workspace-app', 'package.json'));
		expect(result).toEqual({ root, packages });
	});

	it('is unresolvable outside of the workspace', () => {
		const result = resolve(path.resolve(root, '..'));
		expect(result).toBeUndefined();
	});
});
