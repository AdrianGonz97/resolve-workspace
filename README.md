# resolve-workspace

A resolver for workspaces. Supports detecting workspaces for `npm`, `pnpm`, `yarn`, `deno`, and `bun`.

## Usage

Given the following directory structure:

```
workspace
├── package.json
├── app
│   └── package.json
└── packages
    ├── pkg-1
    │   └── package.json
    ├── pkg-2
    │   └── package.json
    └── ignored-pkg
        └── package.json
```

with the following `package.json`:

```jsonc
// workspace/package.json
{
	//...
	"workspaces": ["app", "packages/*", "!packages/ignored-pkg"],
}
```

we can resolve the details of the workspace:

```js
import { resolve, findWorkspaceRoot } from 'resolve-workspace';

const workspace = resolve('workspace/path/to/some/child/directory');
// => { root: "/workspace", packages: ["/workspace/app", "/workspace/pkg-1", "/workspace/pkg-2"] }

const workspaceRoot = findWorkspaceRoot('workspace/path/to/some/child/directory');
// => { path: "/workspace", globs: ["app", "packages/*", "!packages/ignored-pkg"] }
```

## API Reference

### `resolve(cwd)`

Returns `{ root: string; packages: string[] }` or `undefined` (if `cwd` is not within a workspace)

- `root` - the absolute path to the root of the workspace
- `packages` - the absolute paths to each workspace package
-

### `findWorkspaceRoot(cwd)`

Returns `{ path: string; globs: string[] }` or `undefined` (if `cwd` is not within a workspace)

- `path` - the absolute path to the root of the workspace
- `globs` - glob patterns used to determine the packages of the workspace

## License

Published under the [MIT](https://github.com/AdrianGoz98/resolve-workspace/blob/main/LICENSE) license.
