import tome from './tome'

export default function (el) {
  const internal = {
    mode: null,
    listeners: [],
  }

  return {
    set: (nextMode, initParams) => {
      const state = tome.mode(nextMode).init(initParams)
      internal.listeners.forEach(([ev, handler]) => el.removeEventListener(ev, handler))

      let handlers = []
      let controls = tome.mode(nextMode).controls
      for (const ev in controls) {
        handlers.push([ev, (event) => controls[ev](event, state, el)])
      }
      handlers.forEach(([ev, handler]) => el.addEventListener(ev, handler))

      internal.listeners = handlers
      internal.mode = nextMode
    },
    element: () => el,
    mode: () => internal.mode
  }
}
