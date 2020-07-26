
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set() {
                // overridden by instance, if it has props
            }
        };
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const validate = {
      moveTo: params => params.length === 2 ? 'moveTo must have 2 parameters' : null,
      lineTo: params => params.length === 2 ? 'lineTo must have 2 parameters' : null,
      bezierCurveTo: params => params.length === 6 ? 'bezierCurveTo must have 6 parameters' : null,
      quadraticCurveTo: params => params.length === 4 ? 'quadraticCurveTo must have 4 parameters' : null,
      arc: params => (params.length === 5 || params.length === 6) ? 'arc must have 5 or 6 parameters' : null,
      arcTo: params => params.length === 5 ? 'arcTo must have 5 parameters' : null,
      ellipse: params => (params.length === 7 || params.length === 8) ? 'ellipse must have 7 or 8 parameters' : null,
      rect: params => params.length === 4 ? 'rect must have 4 parameters' : null,
      closePath: params => params.length === 0 ? 'closePath must have 0 parameters' : null
    };

    const subBox = {
      moveTo: (x, y) => ({
        xmin: x,
        ymin: y,
        xmax: x,
        ymax: y
      }),
      lineTo: (x, y) => ({
        xmin: x,
        ymin: y,
        xmax: x,
        ymax: y
      }),
      bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) => ({
        xmin: Math.min(cp1x, cp2x, x),
        ymin: Math.min(cp1y, cp2y, y),
        xmax: Math.max(cp1x, cp2x, x),
        ymax: Math.max(cp1y, cp2y, y)
      }),
      quadraticCurveTo: (cpx, cpy, x, y) => ({
        xmin: Math.min(cpx, x),
        ymin: Math.min(cpy, y),
        xmax: Math.max(cpx, x),
        ymax: Math.max(cpy, y)
      }),
      arc: (x, y, radius) => ({
        xmin: x-radius,
        ymin: y-radius,
        xmax: x+radius,
        ymax: y+radius
      }),
      arcTo: (x1, y1, x2, y2) => ({
        xmin: Math.min(x1, x2),
        ymin: Math.min(y1, y2),
        xmax: Math.max(x1, x2),
        ymax: Math.max(y1, y2)
      }),
      ellipse: (x, y, radiusX, radiusY) => ({
        xmin: Math.min(x-radiusX, x-radiusY),
        ymin: Math.min(y-radiusY, y-radiusY),
        xmax: Math.max(x+radiusX, x+radiusX),
        ymax: Math.max(y+radiusY, y+radiusY)
      }),
      rect: (x, y, width, height) => ({
        xmin: x,
        ymin: y,
        xmax: x+width,
        ymax: y+height
      })
    };

    function pathToBox(path) {
      if (!path.length) return null

      let xmins = [];
      let ymins = [];
      let xmaxs = [];
      let ymaxs = [];
      path.forEach(subpath => {
        if (subpath[0] in subBox) {
          let box = subBox[subpath[0]](...subpath.slice(1));
          xmins.push(box.xmin);
          ymins.push(box.ymin);
          xmaxs.push(box.xmax);
          ymaxs.push(box.ymax);
        }
      });

      let box = {
        min: {
          x: Math.min(...xmins),
          y: Math.min(...ymins)
        },
        max: {
          x: Math.max(...xmaxs),
          y: Math.max(...ymaxs)
        }
      };

      return box
    }

    function transformBox({min, max}, transform) {
      let xmin = Math.min(
        transformX(min.x, min.y, transform),
        transformX(min.x, max.y, transform),
        transformX(max.x, min.y, transform),
        transformX(max.x, max.y, transform)
      );
      let xmax = Math.max(
        transformX(min.x, min.y, transform),
        transformX(min.x, max.y, transform),
        transformX(max.x, min.y, transform),
        transformX(max.x, max.y, transform)
      );
      let ymin = Math.min(
        transformY(min.x, min.y, transform),
        transformY(min.x, max.y, transform),
        transformY(max.x, min.y, transform),
        transformY(max.x, max.y, transform)
      );
      let ymax = Math.max(
        transformY(min.x, min.y, transform),
        transformY(min.x, max.y, transform),
        transformY(max.x, min.y, transform),
        transformY(max.x, max.y, transform)
      );

      return {
        min: {x: xmin, y: ymin},
        max: {x: xmax, y: ymax}
      }
    }

    function transformX(x, y, transform) {
      return x*transform[0]+y*transform[2]+transform[4]
    }

    function transformY(x, y, transform) {
      return y*transform[1]+x*transform[3]+transform[5]
    }

    function pathToCanvas(path) {
      if (path.text) return path
      if (!path.length) return null

      let p2d = new Path2D();
      path.forEach(subpath => {
        p2d[subpath[0]](...subpath.slice(1));
      });

      return p2d
    }

    function pathValidate(path) {
      if (!path.length) return 'Paths must have at least 1 instruction'

      let errors = [];
      path.forEach(subpath => {
        let error = validate[subpath[0]](subpath.slice(1));
        if (error) errors.push(error);
      });

      return errors
    }

    function pathsToShapes (paths) {
      let shapes = {};
      for (let id in paths) {
        let shape = pathToCanvas(paths[id]);
        shapes[id] = shape;
      }
      return shapes
    }

    function applyTransform (base, apply) {
      return [
        base[0]*apply[0] + base[2]*apply[1],
        base[1]*apply[0] + base[3]*apply[1],
        base[0]*apply[2] + base[2]*apply[3],
        base[1]*apply[2] + base[3]*apply[3],
        base[0]*apply[4] + base[2]*apply[5] + base[4],
        base[1]*apply[4] + base[3]*apply[5] + base[5],
      ]
    }

    var measure = {
      pathsToShapes,
      pathToBox,
      transformBox,
      pathToCanvas,
      pathValidate,
      applyTransform
    };

    var measure$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': measure
    });

    function tracer (init = []) { // init is filled with objects that have a min point, a max point, and a value
      const tracer = {
        x: [],
        y: [],
        checks: {},
        order: {}
      };
      let order = 0;

      function orderSort(a, b) {
        console.log(a, b, tracer.order[a], tracer.order[b]);
        if (tracer.order[a] < tracer.order[b]) return 1
        if (tracer.order[a] > tracer.order[b]) return -1
        return 0
      }

      function sorter (a, b) {
        if (a.index < b.index) return -1
        if (a.index > b.index) return 1
        return 0
      }

      return {
        insert: (min, max, value, check) => {
          tracer.checks[value] = check;
          tracer.order[value] = order;
          order = order + 1;

          tracer.x.push({index: Math.floor(min.x), value});
          tracer.x.push({index: Math.floor(max.x), value});
          tracer.x.sort(sorter);

          tracer.y.push({index: Math.floor(min.y), value});
          tracer.y.push({index: Math.floor(max.y), value});
          tracer.y.sort(sorter);
        },
        intersectPoint: (point) => {
          let active = new Set();
          let x = Math.floor(point.x);
          let y = Math.floor(point.y);

          for (let i in tracer.x) {
            let box = tracer.x[i];
            if (box.index <= x) {
              if (active.has(box.value)) {
                active.delete(box.value);
              } else {
                active.add(box.value);
              }
            } else {
              break
            }
          }

          let xintersects = [...active];
          active = new Set();

          for (let i in tracer.y) {
            let box = tracer.y[i];
            if (box.index <= y) {
              if (active.has(box.value)) {
                active.delete(box.value);
              } else {
                active.add(box.value);
              }
            } else {
              break
            }
          }

          let possibles = [...xintersects].filter(val => active.has(val));
          return possibles.filter(val => tracer.checks[val](point.x, point.y)).sort(orderSort)
        },
        intersectBox: ({min, max}) => {
          let active = new Set();
          let xmin = Math.floor(min.x);
          let xmax = Math.floor(max.x);
          let ymin = Math.floor(min.y);
          let ymax = Math.floor(max.y);

          for (let i in tracer.x) {
            let box = tracer.x[i];
            if (box.index <= xmin) {
              if (active.has(box.value)) {
                active.delete(box.value);
              } else {
                active.add(box.value);
              }
            } else if (box.index <= xmax) {
              active.add(box.value);
            } else {
              break
            }
          }

          let xintersects = [...active];
          active = new Set();

          for (let i in tracer.y) {
            let box = tracer.y[i];
            if (box.index <= ymin) {
              if (active.has(box.value)) {
                active.delete(box.value);
              } else {
                active.add(box.value);
              }
            } else if (box.index <= ymax) {
              active.add(box.value);
            } else {
              break
            }
          }

          return [...xintersects].filter(val => active.has(val)).sort(orderSort)
        }
      }
    }

    function boxesIntersect(one, two) {
      if (one.max.x < two.min.x) return false
      if (two.max.x < one.min.x) return false
      if (one.max.y < two.min.y) return false
      if (two.max.y < two.max.y) return false
      return true
    }

    function boxBox(boxes) {
      return {
        max: {
          x: Math.max(...boxes.map(box => box.max.x)),
          y: Math.max(...boxes.map(box => box.max.y))
        },
        min: {
          x: Math.min(...boxes.map(box => box.min.x)),
          y: Math.min(...boxes.map(box => box.min.y))
        }
      }
    }

    function generateHitChecker(context, path, transform) {
      return (x, y) => {
        context.save();
        context.setTransform(...transform);
        const inPath = context.isPointInPath(path, x, y);
        context.restore();
        return inPath
      }
    }

    var tracer$1 = {
      tracer,
      boxesIntersect,
      boxBox,
      generateHitChecker,
    };

    var tracer$2 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': tracer$1
    });

    const defaults = {
      fillStyle: null,
      strokeStyle: null,
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10.0,
      lineDash: [],
      lineDashOffset: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowBlur: 0,
      shadowColor: 'transparent',
      fill: 'nonzero',
      font: 'sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'inherit'
    };

    function palletteToPainter(options) {
      let pallette = {...defaults, ...options};
      function painter(context, path) {
        context.lineWidth = pallette.lineWidth;
        context.lineCap = pallette.lineCap;
        context.lineJoin = pallette.lineJoin;
        context.miterLimit = pallette.miterLimit;
        context.setLineDash(pallette.lineDash);
        context.lineDashOffset = pallette.lineDashOffset;
        context.font = pallette.font;
        context.textAlign = pallette.textAlign;
        context.textBaseline = pallette.textBaseline;
        context.direction = pallette.direction;
        context.shadowOffsetX = pallette.shadowOffsetX;
        context.shadowOffsetY = pallette.shadowOffsetY;
        context.shadowBlur = pallette.shadowBlur;
        context.shadowColor = pallette.shadowColor;
        context.fillStyle = pallette.fillStyle;
        context.strokeStyle = pallette.strokeStyle;

        if (path.text) {
          if (pallette.fillStyle) context.fillText(path.text, path.x, path.y, path.maxWidth);
          if (pallette.strokeStyle) context.strokeText(path.text, path.x, path.y, path.maxWidth);
        } else {
          if (pallette.fillStyle) context.fill(path);
          if (pallette.strokeStyle) context.stroke(path);
        }
      }

      return painter
    }

    function linearGradient(context, start, end, stops) {
      let grad = context.createLinearGradient(start.x, start.y, end.x, end.y);
      stops.forEach(({loc, color}) => grad.addColorStop(loc, color));

      return grad
    }

    function radialGradient(context, start, end, stops) {
      let grad = context.createRadialGradient(start.x, start.y, start.radius, end.x, end.y, end.radius);
      stops.forEach(({loc, color}) => grad.addColorStop(loc, color));

      return grad
    }

    function pattern(context, url, type) {
      let img = new Image();
      img.src(url);
      let ptrn = context.createPattern(img, type);

      return ptrn
    }

    function pallettesToPainters (pallettes) {
      let painters = {};
      for (let id in pallettes) {
        let painter = palletteToPainter(pallettes[id]);
        painters[id] = painter;
      }
      return painters
    }

    var style = {
      linearGradient,
      radialGradient,
      pattern,
      palletteToPainter,
      pallettesToPainters
    };

    var style$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': style
    });

    function minZoom({extents, area}) {
      const possibleMinZoom = [extents.min.zoom];
      if (extents.max.x !== null && extents.min.x !== null) possibleMinZoom.push(area.width/(extents.max.x-extents.min.x));
      if (extents.min.y !== null && extents.max.y !== null) possibleMinZoom.push(area.height/(extents.max.y-extents.min.y));
      const minZoom = Math.max(...possibleMinZoom);

      return minZoom
    }

    function enforceExtents ({area, extents, transform}) {
      let maxX = -extents.min.x;
      let minX = area.width - extents.max.x*transform[0];
      let maxY = -extents.min.y;
      let minY = area.height - extents.max.y*transform[3];

      if (extents.min.x !== null && transform[4] < minX) transform[4] = minX;
      if (extents.max.x !== null && transform[4] > maxX) transform[4] = maxX;
      if (extents.min.y !== null && transform[5] < minY) transform[5] = minY;
      if (extents.max.y !== null && transform[5] > maxY) transform[5] = maxY;
    }

    function zoom ({transform}, zoom, x=null, y=null) {
      x = x === null ? transform[4] + (area.width / (2 * transform[0])) : x;
      y = y === null ? transform[5] + (area.height / (2 * transform[3])) : y;
      transform[4] = x - zoom * (x-transform[4]) / transform[0];
      transform[5] = y - zoom * (y-transform[5]) / transform[3];
      transform[0] = zoom;
      transform[3] = zoom;
    }

    var view = {
      mouse: {
        zoom: (mouse, camera, speed=1.2) => {
          let factor = camera.transform[0] * (speed ** -Math.sign(mouse.deltaY));

          factor = factor > camera.extents.max.zoom ? camera.extents.max.zoom : factor;
          const min = minZoom(camera);

          factor = factor < min ? min : factor;

          zoom(camera, factor, mouse.clientX, mouse.clientY);
          enforceExtents(camera);

          mouse.preventDefault();
          mouse.stopPropagation();
        },
        pan: (mouse, camera) => {
          let lastX = mouse.clientX;
          let lastY = mouse.clientY;

          return (mouse) => {
            camera.transform[4] = camera.transform[4] + mouse.clientX - lastX;
            camera.transform[5] = camera.transform[5] + mouse.clientY - lastY;
            lastX = mouse.clientX;
            lastY = mouse.clientY;
            enforceExtents(camera);
          }
        }
      }

    };

    const shapes = {};
    const styles = {};
    const subjects = {};
    const renderers = {};
    const modes = {};

    function renderer(id, func) {
      renderers[id] = (context, subject, assets) => {
        if (subject.visible) {
          context.save();
          context.transform(...(subject.transform));
          func(context, subject.details, assets);
          context.restore();
        }
      };
    }

    renderer("simple", (context, {shape, style, trace}, {viewport, handles, tome}) => {
      const t = context.getTransform();
      const transform = [t.a, t.b, t.c, t.d, t.e, t.f];
      const {box, path} = tome.shape(shape);
      const finalBox = measure.transformBox(box, transform);
      if (tracer$1.boxesIntersect(viewport, finalBox)) {
        if (trace) {
          handles.insert(finalBox.min, finalBox.max, trace, tracer$1.generateHitChecker(context, path, transform));
        }
        tome.style(style).painter(context, path);
      }
    });

    renderer("nested", (context, {subjects}, assets) => {
      subjects.forEach(sub => {
        const subject = assets.tome.subject(sub);
        const render = assets.tome.renderer(subject.renderer);
        render(context, subject, assets);
      });
    });

    renderer("text", (context, {style, text, x, y, maxWidth}, {tome}) => {
      tome.style(style).painter(context, {text, x, y, maxWidth});
    });

    function mode(id, controls, init) {
      modes[id] = {
        controls,
        init
      };
    }

    mode(
      null,
      {},
      () => null
    );

    mode(
      "default",
      {
        mousedown: (mouse, {geo, elem}) => {
          elem.set("panning", {
            mouse,
            geo,
            end: () => {elem.set("default", {geo, elem});}
          });
        },
        wheel: (mouse, {geo}) => {
          view.mouse.zoom(mouse, geo.camera);
        }
      },
      (state) => state
    );

    mode(
      "panning",
      {
      	mouseup: (mouse, { end }) => { end(); },
      	mouseout: (mouse, { end }) => { end(); },
      	mousemove: (mouse, { pan }) => { pan(mouse); },
      },
      ({mouse, geo, end}) => {
        return {
          pan: view.mouse.pan(mouse, geo.camera),
          end
        }
      }
    );

    var tome = {
      register: {
        shape: (id, instructions) => {
          shapes[id] = {
            instructions,
            path: measure.pathToCanvas(instructions),
            box: measure.pathToBox(instructions)
          };
        },
        style: (id, styling) => {
          styles[id] = {
            styling,
            painter: style.palletteToPainter(styling)
          };
        },
        subject: (id, {renderer, details, visible, transform}) => {
          subjects[id] = {
            renderer,
            details,
            visible,
            transform
          };
        },
        renderer,
        mode,
      },
      shape: (id) => shapes[id],
      style: (id) => styles[id],
      subject: (id) => subjects[id],
      renderer: (id) => renderers[id],
      mode: (id) => modes[id],
      export: () => JSON.stringify({subjects, shapes, styles}),
      import: (json) => {
        imports = JSON.parse(json);
        shapes = {
          ...shapes,
          ...(imports.shapes)
        };
        styles = {
          ...styles,
          ...(imports.styles)
        };
        subjects = {
          ...subjects,
          ...(imports.subjects)
        };
      }
    };

    function elemental (el) {
      const internal = {
        mode: null,
        listeners: [],
      };

      return {
        set: (nextMode, initParams) => {
          const state = tome.mode(nextMode).init(initParams);
          internal.listeners.forEach(([ev, handler]) => el.removeEventListener(ev, handler));

          let handlers = [];
          let controls = tome.mode(nextMode).controls;
          for (const ev in controls) {
            handlers.push([ev, (event) => controls[ev](event, state, el)]);
          }
          handlers.forEach(([ev, handler]) => el.addEventListener(ev, handler));

          internal.listeners = handlers;
          internal.mode = nextMode;
        },
        element: () => el,
        mode: () => internal.mode
      }
    }

    function geomancer () {
      const geomancer = {
        camera: {
          transform: [1, 0, 0, 1, 0, 0],
          extents: {
            min: {x: null, y: null, zoom: null},
            max: {x: null, y: null, zoom: null},
          },
          area: {
            width: 800,
            height: 800
          }
        },
        scene: [],
        tome,
        handles: tracer$1.tracer()
      };

      geomancer.render = (context) => {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, geomancer.camera.area.width, geomancer.camera.area.height);
        context.setTransform(...geomancer.camera.transform);
        const viewport = measure.transformBox(
          {
            min: {x: 0, y: 0},
            max: {x: geomancer.camera.area.width, y: geomancer.camera.area.height}
          },
          geomancer.camera.transform
        );
        geomancer.handles = tracer$1.tracer();
        geomancer.scene.forEach(sub => {
          const subject = tome.subject(sub);
          const render = tome.renderer(subject.renderer);
          if (render) render(context, subject, {viewport, handles: geomancer.handles, tome});
        });
      };

      return geomancer
    }

    /* src/Geomancer.svelte generated by Svelte v3.20.1 */
    const file = "src/Geomancer.svelte";

    function create_fragment(ctx) {
    	let canvas_1;
    	let canvas_1_width_value;
    	let canvas_1_height_value;

    	const block = {
    		c: function create() {
    			canvas_1 = element("canvas");
    			this.c = noop;
    			attr_dev(canvas_1, "width", canvas_1_width_value = "" + (/*geo*/ ctx[0].camera.area.width + "px"));
    			attr_dev(canvas_1, "height", canvas_1_height_value = "" + (/*geo*/ ctx[0].camera.area.height + "px"));
    			add_location(canvas_1, file, 40, 0, 760);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[6](canvas_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*geo*/ 1 && canvas_1_width_value !== (canvas_1_width_value = "" + (/*geo*/ ctx[0].camera.area.width + "px"))) {
    				attr_dev(canvas_1, "width", canvas_1_width_value);
    			}

    			if (dirty & /*geo*/ 1 && canvas_1_height_value !== (canvas_1_height_value = "" + (/*geo*/ ctx[0].camera.area.height + "px"))) {
    				attr_dev(canvas_1, "height", canvas_1_height_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas_1);
    			/*canvas_1_binding*/ ctx[6](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { geo = geomancer() } = $$props;
    	let { mode = { name: "default", state: {} } } = $$props;
    	let canvas;
    	let controls = writable(mode);
    	let frame;

    	function drawingLoop(context) {
    		(function loop() {
    			frame = requestAnimationFrame(loop);
    			geo.render(context);
    		})();

    		return () => {
    			cancelAnimationFrame(frame);
    		};
    	}

    	onMount(() => {
    		geo.render(canvas.getContext("2d"));
    		const elem = elemental(canvas);

    		controls.subscribe(() => {
    			elem.set(mode.name, { elem, geo, ...mode.state });
    		});

    		return drawingLoop(canvas.getContext("2d"));
    	});

    	const writable_props = ["geo", "mode"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<geomancer-scene> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("geomancer-scene", $$slots, []);

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, canvas = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("geo" in $$props) $$invalidate(0, geo = $$props.geo);
    		if ("mode" in $$props) $$invalidate(2, mode = $$props.mode);
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		onMount,
    		geomancer,
    		elemental,
    		geo,
    		mode,
    		canvas,
    		controls,
    		frame,
    		drawingLoop
    	});

    	$$self.$inject_state = $$props => {
    		if ("geo" in $$props) $$invalidate(0, geo = $$props.geo);
    		if ("mode" in $$props) $$invalidate(2, mode = $$props.mode);
    		if ("canvas" in $$props) $$invalidate(1, canvas = $$props.canvas);
    		if ("controls" in $$props) $$invalidate(4, controls = $$props.controls);
    		if ("frame" in $$props) frame = $$props.frame;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*mode*/ 4) {
    			 controls.set(mode);
    		}
    	};

    	return [geo, canvas, mode, frame, controls, drawingLoop, canvas_1_binding];
    }

    class Geomancer extends SvelteElement {
    	constructor(options) {
    		super();
    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, { geo: 0, mode: 2 });

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["geo", "mode"];
    	}

    	get geo() {
    		return this.$$.ctx[0];
    	}

    	set geo(geo) {
    		this.$set({ geo });
    		flush();
    	}

    	get mode() {
    		return this.$$.ctx[2];
    	}

    	set mode(mode) {
    		this.$set({ mode });
    		flush();
    	}
    }

    customElements.define("geomancer-scene", Geomancer);

    var Geomancer$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': Geomancer
    });

    /* src/Example.svelte generated by Svelte v3.20.1 */

    const { console: console_1 } = globals;

    function create_fragment$1(ctx) {
    	let updating_geo;
    	let updating_mode;
    	let current;

    	function geomancer_1_geo_binding(value) {
    		/*geomancer_1_geo_binding*/ ctx[2].call(null, value);
    	}

    	function geomancer_1_mode_binding(value) {
    		/*geomancer_1_mode_binding*/ ctx[3].call(null, value);
    	}

    	let geomancer_1_props = {};

    	if (/*geo*/ ctx[0] !== void 0) {
    		geomancer_1_props.geo = /*geo*/ ctx[0];
    	}

    	if (/*mode*/ ctx[1] !== void 0) {
    		geomancer_1_props.mode = /*mode*/ ctx[1];
    	}

    	const geomancer_1 = new Geomancer({ props: geomancer_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(geomancer_1, "geo", geomancer_1_geo_binding));
    	binding_callbacks.push(() => bind(geomancer_1, "mode", geomancer_1_mode_binding));

    	const block = {
    		c: function create() {
    			create_component(geomancer_1.$$.fragment);
    			this.c = noop;
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(geomancer_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const geomancer_1_changes = {};

    			if (!updating_geo && dirty & /*geo*/ 1) {
    				updating_geo = true;
    				geomancer_1_changes.geo = /*geo*/ ctx[0];
    				add_flush_callback(() => updating_geo = false);
    			}

    			if (!updating_mode && dirty & /*mode*/ 2) {
    				updating_mode = true;
    				geomancer_1_changes.mode = /*mode*/ ctx[1];
    				add_flush_callback(() => updating_mode = false);
    			}

    			geomancer_1.$set(geomancer_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(geomancer_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(geomancer_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(geomancer_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	tome.register.shape("hexagon", [
    		["moveTo", 2.5, 43.3],
    		["lineTo", 26.25, 84.77],
    		["lineTo", 73.75, 84.77],
    		["lineTo", 97.5, 43.3],
    		["lineTo", 73.75, 2.165],
    		["lineTo", 26.25, 2.165],
    		["closePath"]
    	]);

    	tome.register.shape("boundary", [["rect", 10, 10, 780, 780]]);

    	tome.register.style("black", {
    		fillStyle: "black",
    		lineWidth: 3,
    		lineJoin: "round"
    	});

    	tome.register.style("thinBlackLines", {
    		lineWidth: 5,
    		strokeStyle: "black",
    		lineJoin: "round"
    	});

    	tome.register.subject("lone hex", {
    		details: {
    			shape: "hexagon",
    			style: "black",
    			trace: "lone hex"
    		},
    		transform: [1, 0, 0, 1, 100, 100],
    		visible: true,
    		renderer: "simple"
    	});

    	tome.register.subject("boundaries", {
    		details: {
    			shape: "boundary",
    			style: "thinBlackLines",
    			trace: "boundaries"
    		},
    		transform: [1, 0, 0, 1, 0, 0],
    		visible: true,
    		renderer: "simple"
    	});

    	tome.register.subject("base layer", {
    		details: { subjects: ["boundaries", "lone hex"] },
    		transform: [1, 0, 0, 1, 0, 0],
    		visible: true,
    		renderer: "nested"
    	});

    	tome.register.mode(
    		"tracing",
    		{
    			mousedown: (mouse, { geo }) => {
    				console.log(geo.handles.intersectPoint({ x: mouse.offsetX, y: mouse.offsetY }));
    			}
    		},
    		state => state
    	);

    	let geo = geomancer();

    	geo.camera.extents = {
    		min: { x: 0, y: 0, zoom: null },
    		max: { x: 800, y: 800, zoom: 5 }
    	};

    	geo.scene = ["base layer"];
    	let mode = { name: "tracing", state: {} };
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<geomancer-example> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("geomancer-example", $$slots, []);

    	function geomancer_1_geo_binding(value) {
    		geo = value;
    		$$invalidate(0, geo);
    	}

    	function geomancer_1_mode_binding(value) {
    		mode = value;
    		$$invalidate(1, mode);
    	}

    	$$self.$capture_state = () => ({ Geomancer, geomancer, tome, geo, mode });

    	$$self.$inject_state = $$props => {
    		if ("geo" in $$props) $$invalidate(0, geo = $$props.geo);
    		if ("mode" in $$props) $$invalidate(1, mode = $$props.mode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [geo, mode, geomancer_1_geo_binding, geomancer_1_mode_binding];
    }

    class Example extends SvelteElement {
    	constructor(options) {
    		super();
    		init(this, { target: this.shadowRoot }, instance$1, create_fragment$1, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("geomancer-example", Example);

    var Example$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': Example
    });

    var index = {
      Example: Example$1,
      Geomancer: Geomancer$1,
      measure: measure$1,
      style: style$1,
      tracer: tracer$2,
      tome,
    };

    return index;

}());
//# sourceMappingURL=bundle.js.map
