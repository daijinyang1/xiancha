/**
 * direction-aware-hover 的指针换算
 *
 * 用法：
 *   <NuxtLink class="dir-hover" @mouseenter="dirHoverEnter" @mouseleave="dirHoverLeave">
 *
 * 进入时把「鼠标落点相对元素中心」的偏移归一化成 -1..1，写进 --dir-x / --dir-y，
 * 由 motion.css 的 .dir-hover 换算成 3px 级别的位移。离开时归零，避免残留。
 * 只在 mouseenter 算一次，不跟 mousemove —— 跟手会变成「卡片追逐光标」，对工具站太吵。
 */

type DirTarget = HTMLElement | null

function writeVars(node: DirTarget, x: number, y: number) {
  if (!node) return
  node.style.setProperty('--dir-x', x.toFixed(3))
  node.style.setProperty('--dir-y', y.toFixed(3))
}

export function dirHoverEnter(e: MouseEvent) {
  const node = e.currentTarget as HTMLElement | null
  if (!node) return
  const box = node.getBoundingClientRect()
  if (!box.width || !box.height) return
  const cx = box.left + box.width / 2
  const cy = box.top + box.height / 2
  const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (box.width / 2)))
  const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (box.height / 2)))
  writeVars(node, nx, ny)
}

export function dirHoverLeave(e: MouseEvent) {
  const node = e.currentTarget as HTMLElement | null
  writeVars(node, 0, 0)
}

export function useDirHover() {
  return { dirHoverEnter, dirHoverLeave }
}
