import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import type { VirtualElement } from '@floating-ui/dom'
import type { Editor, Range } from '@tiptap/core'
import type { Variable } from '@/lib/variables'
import {
  VariableSuggestionList,
  type VariableSuggestionListRef,
  type VariableSuggestionListProps,
} from '../VariableSuggestionList'

/**
 * Inline variable search. Typing `#` in the document opens a searchable list of
 * the vendor's merge-field variables and inserts the chosen `#TOKEN#`, so the
 * side panel is optional rather than required.
 *
 * Variables are admin-managed (see /api/variables), so the list is fetched once
 * per vendor and cached for the session. The cache is module-level because the
 * Suggestion plugin's `items` callback is synchronous.
 */

/**
 * `Suggestion()` defaults to the plugin key `suggestion$`. The slash menu
 * already owns that key, and ProseMirror rejects two plugins sharing one key
 * ("Adding different instances of a keyed plugin"), so this one is namespaced.
 */
const variableSuggestionKey = new PluginKey('variableSuggestion')

const cache = new Map<string, Variable[]>()
const inflight = new Map<string, Promise<Variable[]>>()

function cacheKey(vendorId: number | null) {
  return vendorId == null ? 'global' : String(vendorId)
}

/** Fetch and memoize the variable list for a vendor. */
function loadVariables(vendorId: number | null): Promise<Variable[]> {
  const key = cacheKey(vendorId)
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)

  const pending = inflight.get(key)
  if (pending) return pending

  const qs = vendorId != null ? `?vendorId=${vendorId}` : ''
  const p = fetch(`/api/variables${qs}`)
    .then((r) => (r.ok ? r.json() : { variables: [] }))
    .then((d) => {
      const list: Variable[] = Array.isArray(d.variables) ? d.variables : []
      cache.set(key, list)
      return list
    })
    .catch(() => [] as Variable[])
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, p)
  return p
}

/** Drop the cache so a newly added variable shows up without a reload. */
export function invalidateVariableCache() {
  cache.clear()
  inflight.clear()
}

function filter(list: Variable[], query: string): Variable[] {
  if (!query) return list
  const q = query.toLowerCase()
  return list.filter(
    (v) =>
      v.token.toLowerCase().includes(q) ||
      v.label.toLowerCase().includes(q) ||
      v.group_name.toLowerCase().includes(q)
  )
}

export interface VariableSuggestionOptions {
  /** Vendor whose variables to offer. Null means globals only. */
  vendorId: number | null
}

export const VariableSuggestion = Extension.create<VariableSuggestionOptions>({
  name: 'variableSuggestion',

  addOptions() {
    return { vendorId: null }
  },

  addProseMirrorPlugins() {
    const getVendorId = () => this.options.vendorId

    // Warm the cache so the first `#` shows results immediately.
    if (typeof window !== 'undefined') void loadVariables(getVendorId())

    const suggestion: Omit<SuggestionOptions, 'editor'> = {
      char: '#',
      pluginKey: variableSuggestionKey,
      // Tokens have no spaces, so a space ends the search.
      allowSpaces: false,
      startOfLine: false,

      items: ({ query }) => filter(cache.get(cacheKey(getVendorId())) ?? [], query),

      command: ({
        editor,
        range,
        props,
      }: {
        editor: Editor
        range: Range
        props: Variable
      }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertMergeField(props.token)
          .run()
      },

      render: () => {
        let component:
          | ReactRenderer<VariableSuggestionListRef, VariableSuggestionListProps>
          | null = null
        let wrapper: HTMLDivElement | null = null

        const position = (clientRect: (() => DOMRect | null) | null | undefined) => {
          if (!wrapper || !clientRect) return
          const virtual: VirtualElement = {
            getBoundingClientRect: () => clientRect() ?? new DOMRect(),
          }
          void computePosition(virtual, wrapper, {
            placement: 'bottom-start',
            strategy: 'absolute',
            middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
          }).then(({ x, y }) => {
            if (!wrapper) return
            wrapper.style.left = `${x}px`
            wrapper.style.top = `${y}px`
          })
        }

        const teardown = () => {
          component?.destroy()
          wrapper?.remove()
          component = null
          wrapper = null
        }

        return {
          onStart: (props) => {
            // A hash inside a code block is literal text, not a trigger.
            if (props.editor.isActive('codeBlock')) return

            const list = cache.get(cacheKey(getVendorId()))

            component = new ReactRenderer(VariableSuggestionList, {
              editor: props.editor,
              props: { ...props, loading: list == null },
            })

            wrapper = document.createElement('div')
            wrapper.style.position = 'absolute'
            wrapper.style.top = '0'
            wrapper.style.left = '0'
            wrapper.style.zIndex = '50'
            wrapper.appendChild(component.element)
            document.body.appendChild(wrapper)
            position(props.clientRect)

            // If the fetch had not landed yet, refresh once it does.
            if (list == null) {
              void loadVariables(getVendorId()).then((loaded) => {
                component?.updateProps({
                  items: filter(loaded, props.query),
                  loading: false,
                })
              })
            }
          },

          onUpdate: (props) => {
            component?.updateProps({ ...props, loading: false })
            position(props.clientRect)
          },

          onKeyDown: (props) => {
            if (props.event.key === 'Escape') {
              teardown()
              return true
            }
            return component?.ref?.onKeyDown(props) ?? false
          },

          onExit: teardown,
        }
      },
    }

    return [Suggestion({ editor: this.editor, ...suggestion })]
  },
})
