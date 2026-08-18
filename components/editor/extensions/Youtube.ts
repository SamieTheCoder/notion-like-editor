import BaseYoutube from '@tiptap/extension-youtube'

export const Youtube = BaseYoutube.configure({
  controls: true,
  nocookie: true,
  modestBranding: true,
  width: 640,
  height: 360,
  HTMLAttributes: {
    class: 'w-full aspect-video rounded-lg my-4 shadow-sm',
  },
})
