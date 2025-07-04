import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as yaml from 'yaml';
import { globSync } from 'tinyglobby';
import { find, readJSON } from './utils.ts';

const PKG_NAMES = ['package.json', 'deno.json'];

export interface Workspace {
	/** The absolute path to the workspace root. */
	root: string;
	/** An array of absolute paths to each workspace package. */
	packages: string[];
}

/**
 * Resolves the details of the current workspace.
 *
 * @param cwd The current working directory of the operation.
 *
 * @returns The details of the workspace, `undefined` if {@link cwd} is not within a workspace.
 */
export function resolve(cwd: string): Workspace | undefined {
	// ensure it's an absolute path
	cwd = path.resolve(cwd);

	let workspaceRoot = findWorkspaceRoot(cwd);
	if (!workspaceRoot) return undefined;

	const packages = resolveWorkspacePackages(workspaceRoot);

	return { root: workspaceRoot.path, packages };
}

export interface WorkspaceRoot {
	/** The absolute path to the workspace root. */
	path: string;
	/** An array of glob patterns used to determine the packages of the workspace. */
	globs: string[];
}

/**
 * Finds the root of a workspace.
 *
 * @param cwd The current working directory of the operation.
 *
 * @returns The details of a workspace's root, `undefined` if {@link cwd} is not within a workspace.
 */
export function findWorkspaceRoot(cwd: string): WorkspaceRoot | undefined {
	// ensure it's an absolute path
	cwd = path.resolve(cwd);

	let pkgPath = find(cwd, PKG_NAMES);
	// no package root could be found in any parent directory
	if (!pkgPath) return undefined;

	const pkg = readJSON(pkgPath);
	const root = resolveWorkspaceRoot(pkgPath, pkg);
	if (root) return root;

	return findWorkspaceRoot(path.resolve(pkgPath, '../..'));
}

function resolveWorkspaceRoot(pkgPath: string, pkg: any): WorkspaceRoot | undefined {
	const root = path.resolve(pkgPath, '..');

	// `package.json` defines workspaces in `pkg.workspaces` (covers npm, yarn, bun, and deno)
	if (Array.isArray(pkg.workspaces)) return { path: root, globs: pkg.workspaces };

	// `deno.json` defines workspaces in `pkg.workspace`
	if (Array.isArray(pkg.workspace)) return { path: root, globs: pkg.workspace };

	const pnpmWorkspacePath = path.resolve(pkgPath, '..', 'pnpm-workspace.yaml');
	if (fs.existsSync(pnpmWorkspacePath)) {
		const pnpmYaml = fs.readFileSync(pnpmWorkspacePath, 'utf8');
		const { packages = [] } = yaml.parse(pnpmYaml);
		return { path: root, globs: packages };
	}
}

const TRAILING_SLASH_REGEX = /(\\|\/)$/;

function resolveWorkspacePackages(workspace: WorkspaceRoot) {
	let packagePaths = globSync(workspace.globs, {
		cwd: workspace.path,
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
