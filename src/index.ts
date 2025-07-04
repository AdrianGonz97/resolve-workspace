import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as yaml from 'yaml';
import { globSync } from 'tinyglobby';

export interface Workspace {
	/** The absolute path to the workspace root. */
	root: string;
	/** An array of absolute paths to each workspace package. */
	packages: string[];
}

const PKG_NAMES = ['package.json', 'deno.json'];

/**
 * Resolves the details of the current workspace.
 *
 * @param cwd The current working directory of the operation.
 *
 * @returns The details of the workspace, `undefined` if {@link cwd} is not in a workspace.
 */
export function resolve(cwd: string): Workspace | undefined {
	cwd = path.resolve(cwd); // ensure it's an absolute path.

	// find workspace root
	let pkgPath = find(cwd, PKG_NAMES);
	if (!pkgPath) return;

	let workspace: RawWorkspace | undefined;
	while (workspace === undefined && pkgPath !== undefined) {
		const pkg = readJSON(pkgPath);
		workspace = findWorkspace(pkgPath, pkg);
		if (workspace === undefined) {
			pkgPath = find(path.resolve(pkgPath, '..', '..'), PKG_NAMES);
		}
	}

	if (!workspace || !pkgPath) return;

	const packages = resolveWorkspacePackages(workspace);

	return { root: workspace.root, packages };
}

interface RawWorkspace {
	root: string;
	globs: string[];
}

function findWorkspace(pkgPath: string, pkg: any): RawWorkspace | undefined {
	const root = path.resolve(pkgPath, '..');

	// `package.json` defines workspaces in `pkg.workspaces` (covers npm, yarn, bun, and deno)
	if (Array.isArray(pkg.workspaces)) return { root, globs: pkg.workspaces };

	// `deno.json` defines workspaces in `pkg.workspace`
	if (Array.isArray(pkg.workspace)) return { root, globs: pkg.workspace };

	const pnpmWorkspacePath = path.resolve(pkgPath, '..', 'pnpm-workspace.yaml');
	if (fs.existsSync(pnpmWorkspacePath)) {
		const pnpmYaml = fs.readFileSync(pnpmWorkspacePath, 'utf8');
		const { packages = [] } = yaml.parse(pnpmYaml);
		return { root, globs: packages };
	}
}

const TRAILING_SLASH_REGEX = /(\\|\/)$/;

function resolveWorkspacePackages(workspace: RawWorkspace) {
	let packagePaths = globSync(workspace.globs, {
		cwd: workspace.root,
		onlyDirectories: true,
		absolute: true,
	});

	// use window's path separator instead
	if (process.platform === 'win32') {
		packagePaths = packagePaths.map((p) => p.split('/').join(path.sep));
	}

	const packages: string[] = [];

	for (const pkgDir of packagePaths) {
		const isWorkspacePkg = PKG_NAMES.some((name) => fs.existsSync(path.resolve(pkgDir, name)));
		if (isWorkspacePkg) {
			// removes any trailing slashes
			packages.push(pkgDir.replace(TRAILING_SLASH_REGEX, ''));
		}
	}

	return packages;
}

function find(cwd: string, filenames: string[]): string | undefined {
	for (const filename of filenames) {
		const filepath = path.resolve(cwd, filename);
		if (fs.existsSync(filepath)) {
			return filepath;
		}
	}

	const next = path.resolve(cwd, '..');
	// reached the root
	if (cwd === next) {
		return undefined;
	}

	return find(next, filenames);
}

function readJSON(path: string) {
	const json = fs.readFileSync(path, 'utf8');
	return JSON.parse(json);
}
