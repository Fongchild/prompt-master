# ✨ Prompt Master

A Claude Code mod that rewrites your rough draft into a clear, effective prompt before you send it.

Type a rough prompt, click **✨ Prompt Master** in the band above the prompt box, and your draft is replaced by a better rewritten prompt. Review it, edit if you like, then press Enter. Changed your mind? Click **Undo** to get your original draft back.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install prompt-master --marketplace Fongchild/prompt-master
```

Answer `y` to add the marketplace, then pick a scope (user scope is first; press Enter).

Or from a shell:

```
claude plugin install prompt-master --marketplace Fongchild/prompt-master
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `Fongchild/prompt-master`, then **Add plugin**.

## Usage

| How | What happens |
| --- | --- |
| **✨ Prompt Master** button | Rewrites what's in the prompt box and puts the result back for you to review. |
| **Undo** button | Restores your original draft after a rewrite. |
| `/prompt-master <draft>` | Rewrites the draft (or the prompt box, if no draft is given) and fills the prompt box. |
| `pm: <draft>` | Previews the rewrite without sending anything. |
| `pm send` | Sends the last suggestion as is. |
| `pm!: <draft>` | Rewrites and sends in one step. |

The rewrite keeps your intent, facts, names, file paths and constraints, and never invents requirements. It makes the goal explicit, states constraints and the expected outcome, and writes in your voice.

## License

[MIT](LICENSE)
