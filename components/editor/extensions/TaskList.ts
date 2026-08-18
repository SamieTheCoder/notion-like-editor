import { mergeAttributes } from '@tiptap/core'
import { TaskList as BaseTaskList } from '@tiptap/extension-list'

export const TaskList = BaseTaskList.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'ul',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'list-none pl-0 my-4 space-y-1',
        'data-type': 'taskList',
      }),
      0,
    ]
  },
})
