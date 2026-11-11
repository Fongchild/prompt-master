import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register } from 'claude-code'

import type { Status } from '../types'

const status = atom({ plugin: 'prompt-master', key: 'status' } as const, 'idle' as Status)
const suggestion = atom({ plugin: 'prompt-master', key: 'suggestion' } as const, null as string | null)
const original = atom({ plugin: 'prompt-master', key: 'original' } as const, null as string | null)

const SYSTEM = `You are Prompt Master. You rewrite a user's rough draft into a better prompt for an AI assistant.
Rules:
- Keep the user's intent, facts, names, file paths and constraints exactly; never invent requirements.
- Make the goal explicit, surface the context the draft implies, state constraints and the expected output or definition of done.
- Use short paragraphs or a compact bullet list; no preamble, no filler.
- Write in the user's voice (first person), addressed to the assistant.
- If the draft is already clear, tighten it lightly.
Reply with ONLY the rewritten prompt text, nothing else.`

async function improve($: Engine, draftIn?: string) {
  if ((await read($, status)) === 'working') return null
  const draft = (draftIn ?? (await $.prompt.read()).text).trim()
  if (!draft) {
    $.ui.toast('Prompt Master: type a rough prompt first')
    return null
  }
  await update($, status, () => 'working' as Status)
  $.ui.status('✨ Prompt Master: rewriting…')
  const r = await $.model.complete({
    model: 'sonnet',
    system: SYSTEM,
    prompt: `Rough draft:\n"""\n${draft}\n"""`,
    maxTokens: 2048,
    effort: 'low',
    timeoutMs: 60000,
  })
  $.ui.status(undefined)
  if (!r.isAnswered || !r.text.trim()) {
    await update($, status, () => 'error' as Status)
    $.ui.toast('Prompt Master: rewrite failed, your draft is unchanged')
    return null
  }
  await update($, original, () => draft)
  const better = r.text.trim()
  await update($, suggestion, () => better)
  const filled = await $.prompt.fill({ text: better, mode: 'replace' })
  await update($, status, () => 'idle' as Status)
  $.ui.toast('Prompt Master: draft improved. Review it, then press Enter')
  return { better, isFilled: filled.isFilled }
}

async function rewriteOnly($: Engine, draft: string) {
  $.ui.status('✨ Prompt Master: rewriting…')
  const r = await $.model.complete({
    model: 'sonnet',
    system: SYSTEM,
    prompt: `Rough draft:\n"""\n${draft}\n"""`,
    maxTokens: 2048,
    effort: 'low',
    timeoutMs: 60000,
  })
  $.ui.status(undefined)
  return r.isAnswered && r.text.trim() ? r.text.trim() : null
}

async function undo($: Engine) {
  const prev = await read($, original)
  if (prev === null) return
  await $.prompt.fill({ text: prev, mode: 'replace' })
  await update($, original, () => null)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master',
      description: 'Rewrite your rough prompt into a better one and put it back in the prompt box',
    })
    return next(e)
  })

  on('command.run', { command: 'prompt-master' }, async ($, e) => {
    const out = await improve($, e.args.trim() || undefined)
    if (!out) {
      return { text: 'Prompt Master: nothing rewritten. Usage: /prompt-master <your rough prompt>' }
    }
    const lead = out.isFilled
      ? 'Prompt Master put this in your prompt box. Review it, then press Enter:'
      : 'Prompt Master rewrote your prompt. Type "pm send" to send it, or copy and edit it:'
    return { text: `${lead}\n\n${out.better}` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const s = await read($, status)
    const prev = await read($, original)
    return (
      <Box>
        <Button key="pm" label={s === 'working' ? '✨ Rewriting…' : '✨ Prompt Master'} onPress={() => improve($)} />
        {prev !== null && s !== 'working' ? <Button key="undo" label="Undo" onPress={() => undo($)} /> : null}
        {s === 'error' ? <Text dimColor> last rewrite failed</Text> : null}
      </Box>
    )
  })

  on('prompt.submit', async ($, e, next) => {
    if (!e.command && !e.isMeta) {
      const send = /^\s*pm\s+send\s*$/i.test(e.text)
      if (send) {
        const kept = await read($, suggestion)
        if (!kept) return { drop: 'Prompt Master: no suggestion to send yet. Start a message with pm: first.' }
        await update($, suggestion, () => null)
        return next({ ...e, text: kept })
      }
      const now = /^\s*pm!\s*:\s*([\s\S]+)$/i.exec(e.text)
      const preview = /^\s*pm\s*:\s*([\s\S]+)$/i.exec(e.text)
      const draft = (now?.[1] ?? preview?.[1] ?? '').trim()
      if (draft) {
        const better = await rewriteOnly($, draft)
        if (now) {
          return next({ ...e, text: better ?? draft })
        }
        if (!better) return { drop: 'Prompt Master: the rewrite failed. Nothing was sent; try again.' }
        await update($, suggestion, () => better)
        await $.prompt.fill({ text: better, mode: 'replace' })
        return {
          drop:
            `✨ Prompt Master suggestion (not sent yet):\n\n${better}\n\n` +
            `Type "pm send" to send it as is, or copy it, edit it and send it yourself.`,
        }
      }
    }
    await update($, original, () => null)
    await update($, status, () => 'idle' as Status)
    return next(e)
  })
}
