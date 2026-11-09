export function useToast() {
  const message = useState<string>('toast-message', () => '')
  const visible = useState<boolean>('toast-visible', () => false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function toast(msg: string, ms = 1800) {
    message.value = msg
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { visible.value = false }, ms)
  }

  return { message, visible, toast }
}
