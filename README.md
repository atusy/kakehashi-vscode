# kakehashi for VSCode

VSCode client for the [kakehashi](https://github.com/atusy/kakehashi) language server.

This extension does **not** attach to any document by default. Configure
`kakehashi.documentSelector` to tell the extension which documents to attach to.

## Example configuration (settings.json)

```json
{
  "kakehashi.command": ["kakehashi"],
  "[markdown]": {
    "editor.quickSuggestions": {
      "other": "on"
    }
  },
  "kakehashi.documentSelector": ["markdown", "quarto", "rmd"],
  "kakehashi.env": null,
  "kakehashi.initializationOptions": null,
  "kakehashi.trace.server": "off"
}
```

To work on Quarto and R Markdown on VSCode, you should also install following extensions respectively:

- [quarto.quarto](https://marketplace.visualstudio.com/items?itemName=quarto.quarto)
- [REditorSupport.r](https://marketplace.visualstudio.com/items?itemName=REditorSupport.r)

Note that Positron does not support [REditorSupport.r](https://marketplace.visualstudio.com/items?itemName=REditorSupport.r).
Instead, add a folowing entry to your `settings.json` .

```json
"files.associations": { "*.Rmd": "markdown" }
```

## Settings

| Setting                           | Type                               | Default         | Description                                                                                                                                  |
| --------------------------------- | ---------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `kakehashi.command`               | `string[]`                         | `["kakehashi"]` | Argv used to spawn the server. First element is the executable; the rest are arguments.                                                      |
| `kakehashi.documentSelector`      | `(string \| object)[]`             | `[]`            | Documents to attach to. Each entry is either a language id string or a `{ language?, scheme?, pattern? }` object. Empty disables the client. |
| `kakehashi.env`                   | `Record<string, string> \| null`   | `null`          | Environment variables merged onto the extension process environment when spawning the server.                                                |
| `kakehashi.initializationOptions` | `object \| null`                   | `null`          | Passed verbatim as LSP `initializationOptions`.                                                                                              |
| `kakehashi.trace.server`          | `"off" \| "messages" \| "verbose"` | `"off"`         | Controls LSP message tracing for the language server.                                                                                        |

Changing any of these settings restarts the language client automatically.

## Commands

- `kakehashi: Configure Document Selector` — opens settings filtered to `kakehashi.documentSelector`.
- `kakehashi: Restart Server` — stops and restarts the language client.

## Requirements

- VSCode `>= 1.100.0`
- The [kakehashi](https://github.com/atusy/kakehashi) binary on `PATH` (or set `kakehashi.command` to an absolute path)

If the executable is missing, the extension shows a dialog with a
**Visit download page** button that opens the
[GitHub Releases](https://github.com/atusy/kakehashi/releases) page.

## Release

Releases are tag-driven. Pushing a `v*` tag runs the Release workflow,
which publishes the extension to the VS Code Marketplace and Open VSX,
and creates a GitHub release with the `.vsix` attached:

```sh
npm version patch -m "chore(release): %s"
git push origin main --follow-tags
```

The workflow requires the `VSCE_PAT` and `OVSX_PAT` repository secrets.
To release manually instead, run `make release` with the same variables
set in the environment.

## License

MIT
