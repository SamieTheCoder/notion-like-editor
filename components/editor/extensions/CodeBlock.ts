import { mergeAttributes } from '@tiptap/core'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const lowlight = createLowlight()

lowlight.register({ bash, css, go, java, javascript, json, markdown, python, rust, sql, typescript, xml, yaml })
lowlight.registerAlias({
  bash: ['sh', 'shell', 'zsh'],
  javascript: ['js', 'jsx'],
  typescript: ['ts', 'tsx'],
  xml: ['html', 'vue', 'svelte'],
  markdown: ['md'],
  python: ['py'],
  yaml: ['yml'],
})

/** Languages offered in the code-block language picker. */
export const CODE_LANGUAGES = [
  'plaintext',
  'bash',
  'css',
  'go',
  'html',
  'java',
  'javascript',
  'json',
  'markdown',
  'python',
  'rust',
  'sql',
  'typescript',
  'yaml',
] as const

export const CodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    const language = node.attrs.language as string | null
    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class:
          'relative bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto font-mono text-sm leading-relaxed',
        ...(language ? { 'data-language': language } : {}),
      }),
      [
        'code',
        {
          class: language ? `${this.options.languageClassPrefix}${language}` : null,
        },
        0,
      ],
    ]
  },
}).configure({
  lowlight,
  defaultLanguage: 'plaintext',
})
