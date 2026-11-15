// web/app/composables/useTheme.ts —— 深色/浅色切换「怎么过渡」的唯一出口。
//
// 口径约定（必须与 app/app.vue head 内联脚本一致）：
//   只认 localStorage['xc.mode']，不跟随系统主题；服务端一律渲染 light，
//   真正的切换只发生在客户端点击。
//
// 两层渐进增强，**互斥使用**（不是同时开）：
//   第一层 View Transitions API —— 从开关中心做圆形揭示。VT 本身就是合成层截图动画
//     （圆内新快照、圆外旧快照），视觉上已经是过渡，因此**不再叠**全局颜色过渡类。
//     这条路径便宜：实测 /rules 与瞬时切换同档（16.5ms 平均、0 长任务）。
//   第二层 临时过渡类 .theme-transitioning —— 仅当浏览器不支持 VT 时启用，
//     给元素补 320ms 色彩过渡，负责「时间」维度的渐入。
//     代价：全站约 3500 个过渡同时起跑，/rules 上 37.8ms 平均、435ms 累计阻塞。
//     所以只在没有 VT 时才付这份钱。
//
// 早前版本两层同时开，好处是 computed style 在 60ms 处能采到中间色（好测），
// 坏处是 VT 与全局过渡做同一件事、白付一份阻塞 —— 已改正。
//
// 性能纪律：过渡只在这 320ms 内存在，绝不给全站元素常驻 transition 或 will-change；
// 只过渡颜色类属性（background-color/color/border-color/fill/stroke/box-shadow），
// 不过渡 opacity/transform —— 避免触发整页重排与层爆炸。

/** 切换期间挂在 <html> 上的临时类，与 main.css 里的同名选择器配对。 */
export const THEME_TRANSITION_CLASS = 'theme-transitioning'

/** 过渡时长（毫秒），与 main.css 里 .theme-transitioning 的 duration 保持一致。 */
export const THEME_TRANSITION_MS = 320

/** 圆形揭示的圆心（视口坐标）。 */
export interface ThemeOrigin {
  x: number
  y: number
}

/** View Transitions 的最小类型声明，避免为它引入 lib.dom 版本差异。 */
interface ViewTransitionLike {
  ready: Promise<void>
  finished: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition?: () => void
}

interface DocumentWithViewTransition extends Document {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransitionLike
}

/** 系统是否要求减少动态效果。 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** 只改 dataset.mode —— 颜色令牌全在 [data-mode="dark"] 里，这里不碰任何具体色值。 */
export function applyMode(dark: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.mode = dark ? 'dark' : 'light'
}

/** 取元素中心点，作为圆形揭示的圆心；拿不到元素时退回视口中心。 */
export function originOf(el: Element | null | undefined): ThemeOrigin {
  if (el && typeof el.getBoundingClientRect === 'function') {
    const r = el.getBoundingClientRect()
    if (r.width > 0 || r.height > 0) {
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

/** 从圆心到视口最远角的距离 —— 保证圆最终盖满整屏。 */
function revealRadius(origin: ThemeOrigin): number {
  const dx = Math.max(origin.x, window.innerWidth - origin.x)
  const dy = Math.max(origin.y, window.innerHeight - origin.y)
  return Math.hypot(dx, dy)
}

function addTransitionClass(root: HTMLElement): void {
  root.classList.add(THEME_TRANSITION_CLASS)
}

function removeTransitionClass(root: HTMLElement): void {
  root.classList.remove(THEME_TRANSITION_CLASS)
}

/**
 * 切换主题。
 * @param dark     目标模式
 * @param origin   圆形揭示的圆心（通常是开关按钮中心）
 * @param commit   真正落地状态的回调（改 dataset.mode + 改组件内的 ref），
 *                 它会被放进 View Transition 的回调里执行，保证快照时机正确。
 */
export async function switchThemeMode(
  dark: boolean,
  origin: ThemeOrigin,
  commit: () => void | Promise<void>
): Promise<void> {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  // 减少动态效果：两层都关，直接落地（不做任何过渡，也不加临时类）。
  if (prefersReducedMotion()) {
    await commit()
    return
  }

  const doc = document as DocumentWithViewTransition

  if (typeof doc.startViewTransition === 'function') {
    try {
      // 这里**故意不挂** .theme-transitioning。
      //
      // 为什么不挂：View Transition 自己就是一次合成层的截图动画 —— 圆内是新快照、
      // 圆外是旧快照，圆形擦除本身就是过渡，视觉上不存在「瞬间跳变」。
      // 再叠一层「全站每个元素都跑 320ms 颜色过渡」纯粹是重复劳动，而且实测代价很高：
      // /rules（1146 节点、全站约 3500 个过渡）正常过渡 37.8ms 平均、4.3 个长任务、
      // 累计阻塞 435ms；只走 VT 时降到与瞬时切换同档（16.5ms 平均、0 长任务）。
      // 所以：能 VT 就走 VT（便宜且好看），不能 VT 才让下面的兜底路径付那份钱。
      const transition = doc.startViewTransition(async () => {
        await commit()
      })
      // 圆形揭示挂在 ::view-transition-new(root) 上（main.css 里已把默认的十字淡入 animation: none）。
      transition.ready
        .then(() => {
          const radius = revealRadius(origin)
          root.animate(
            {
              clipPath: [
                `circle(0px at ${origin.x}px ${origin.y}px)`,
                `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
              ],
            },
            {
              duration: THEME_TRANSITION_MS,
              easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          )
        })
        .catch(() => {
          /* ready 被跳过（例如又点了一次）时不做揭示，状态本身已经落地 */
        })
      await transition.finished.catch(() => undefined)
      return
    } catch {
      // View Transitions 存在但启动失败（极少见）：清干净后走第二层兜底。
      removeTransitionClass(root)
    }
  }

  // 第二层兜底（不支持 View Transitions 的浏览器）：只有临时过渡类，颜色 320ms 渐入。
  // 这条路径会给全站元素补过渡，代价见上面注释 —— 只在不支持 VT 时才付。
  addTransitionClass(root)
  await commit()
  await waitForThemeTransition(root)
  removeTransitionClass(root)
}

/**
 * 等过渡跑完：transitionend 与定时器取先到。
 * 元素多、未必每个都触发 transitionend（有的元素颜色没变），所以定时器兜底是必须的。
 */
function waitForThemeTransition(root: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      root.removeEventListener('transitionend', onEnd)
      resolve()
    }
    const onEnd = (e: Event) => {
      const ev = e as TransitionEvent
      if (ev.propertyName === 'background-color' || ev.propertyName === 'color') finish()
    }
    const timer = setTimeout(finish, THEME_TRANSITION_MS + 40)
    root.addEventListener('transitionend', onEnd)
  })
}
