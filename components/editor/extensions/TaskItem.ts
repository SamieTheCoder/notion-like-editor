import { mergeAttributes } from '@tiptap/core'
import { TaskItem as BaseTaskItem } from '@tiptap/extension-list'

export const TaskItem = BaseTaskItem.extend({
  renderHTML({ node, HTMLAttributes }) {
    const contentStyle = 'flex:1;min-width:0;'
    const contentClass = node.attrs.checked
      ? 'flex-1 min-w-0 line-through text-gray-400'
      : 'flex-1 min-w-0'

    return [
      'li',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'taskItem',
        'data-checked': node.attrs.checked ? 'true' : 'false',
        style: 'list-style:none;display:flex;flex-direction:row;align-items:baseline;gap:8px;margin-bottom:4px;',
      }),
      [
        'input',
        {
          type: 'checkbox',
          style: 'width:16px;height:16px;margin:0;flex-shrink:0;vertical-align:middle;',
          ...(node.attrs.checked ? { checked: 'checked' } : {}),
        },
      ],
      [
        'span',
        {
          class: contentClass,
          style: contentStyle,
        },
        0,
      ],
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li')
      listItem.classList.add('flex', 'items-center', 'gap-2')
      listItem.dataset.checked = String(node.attrs.checked)

      const checkboxWrapper = document.createElement('label')
      checkboxWrapper.contentEditable = 'false'
      checkboxWrapper.classList.add('flex', 'items-center', 'select-none')

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = node.attrs.checked
      checkbox.classList.add(
        'h-4', 'w-4', 'rounded', 'border-gray-300',
        'text-blue-600', 'focus:ring-blue-500', 'cursor-pointer'
      )
      checkbox.setAttribute('aria-label', `Task: ${node.textContent || 'empty'}`)

      checkbox.addEventListener('mousedown', (e) => e.preventDefault())
      checkbox.addEventListener('change', (event) => {
        if (!editor.isEditable) {
          checkbox.checked = !checkbox.checked
          return
        }
        const { checked } = event.target as HTMLInputElement
        if (typeof getPos === 'function') {
          editor
            .chain()
            .focus(undefined, { scrollIntoView: false })
            .command(({ tr }) => {
              const position = getPos()
              if (typeof position !== 'number') return false
              const currentNode = tr.doc.nodeAt(position)
              tr.setNodeMarkup(position, undefined, {
                ...currentNode?.attrs,
                checked,
              })
              return true
            })
            .run()
        }
      })

      const content = document.createElement('div')
      content.classList.add('flex-1')
      // Neutralize paragraph margin so checkbox stays vertically centered
      content.style.cssText = '--tw-space-y-reverse:0;'
      content.setAttribute('style', '')

      checkboxWrapper.append(checkbox)
      listItem.append(checkboxWrapper, content)

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (key === 'class') return
        listItem.setAttribute(key, value)
      })

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) return false
          listItem.dataset.checked = String(updatedNode.attrs.checked)
          checkbox.checked = updatedNode.attrs.checked

          if (updatedNode.attrs.checked) {
            content.classList.add('line-through', 'text-gray-400')
          } else {
            content.classList.remove('line-through', 'text-gray-400')
          }

          checkbox.setAttribute('aria-label', `Task: ${updatedNode.textContent || 'empty'}`)
          return true
        },
      }
    }
  },
}).configure({ nested: true })
