
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
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

    function sorter (a, b) {
      if (a.index < b.index) return -1
      if (a.index > b.index) return 1
      return 0
    }

    function tracer (init = []) { // init is filled with objects that have a min point, a max point, and a value
      const tracer = {
        x: [],
        y: [],
        checks: {}
      };

      return concat(tracer, init)
    }

    function insert$1 (tracer, {min, max, value, check}) {
      tracer.checks[value] = check;
      tracer.x.push({index: Math.floor(min.x), value});
      tracer.x.push({index: Math.floor(max.x), value});
      tracer.x.sort(sorter);

      tracer.y.push({index: Math.floor(min.y), value});
      tracer.y.push({index: Math.floor(max.y), value});
      tracer.y.sort(sorter);
    }

    function concat (tracer, boxes) {
      boxes.forEach(box => tracer.checks[box.value]=box.check);

      tracer.x = boxes.map(({min, value}) => {
        return {index: Math.floor(min.x), value}
      }).concat(boxes.map(({max, value}) => {
        return {index: Math.floor(max.x), value}
      }));

      tracer.y = boxes.map(({min, value}) => {
        return {index: Math.floor(min.y), value}
      }).concat(boxes.map(({max, value}) => {
        return {index: Math.floor(max.y), value}
      }));

      tracer.x.sort(sorter);
      tracer.y.sort(sorter);

      return tracer
    }

    function intersectPoint (tracer, point) {
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
      return possibles.filter(val => tracer.checks[val](point.x, point.y))
    }

    function intersectBox (tracer, {min, max}) {
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

      return [...xintersects].filter(val => active.has(val))
    }

    function boxesIntersect(one, two) {
      if (one.max.x < two.min.x) return false
      if (two.max.x < one.min.x) return false
      if (one.max.y < two.min.y) return false
      if (two.max.y < two.max.y) return false
      return true
    }

    function generateHitChecker$1(context, path, transform) {
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
      insert: insert$1,
      concat,
      intersectPoint,
      intersectBox,
      boxesIntersect,
      generateHitChecker: generateHitChecker$1,
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

    var events = {

    };

    function enforceBoundaries (geo) {
      let zoom = geo.camera.transform[0];
      const width = geo.camera.area.width;
      const height = geo.camera.area.height;
      const right = geo.camera.extents.max.x;
      const left = geo.camera.extents.min.x;
      const top = geo.camera.extents.min.y;
      const bottom = geo.camera.extents.max.y;

      if (zoom < minZoom(geo)) {
        zoom = minZoom;
      } else if (geo.camera.extents.max.zoom && zoom > geo.camera.extents.max.zoom) {
        zoom = geo.camera.extents.max.zoom;
      }

      geo.camera.transform[0] = zoom;
      geo.camera.transform[3] = zoom;

      let x = geo.camera.transform[4];
      let y = geo.camera.transform[5];
      let maxX = -left;
      let minX = width - right*zoom;
      let maxY = -top;
      let minY = height - bottom*zoom;

      if (left !== null && x < minX) geo.camera.transform[4] = minX;
      if (right !== null && x > maxX) geo.camera.transform[4] = maxX;
      if (top !== null && y < minY) geo.camera.transform[5] = minY;
      if (bottom !== null && y > maxY) geo.camera.transform[5] = maxY;
    }

    function minZoom(geo) {
      const width = geo.camera.area.width;
      const height = geo.camera.area.height;
      const right = geo.camera.extents.max.x;
      const left = geo.camera.extents.min.x;
      const top = geo.camera.extents.min.y;
      const bottom = geo.camera.extents.max.y;

      const possibleMinZoom = [geo.camera.extents.min.zoom];
      if (right !== null && left !== null) possibleMinZoom.push(width/(right-left));
      if (top !== null && bottom !== null) possibleMinZoom.push(height/(bottom-top));
      const minZoom = Math.max(...possibleMinZoom);

      return minZoom
    }

    function mouseZoom (mouse, geo, speed=1.2) {
      let zoom = geo.camera.transform[0] * (speed ** -Math.sign(mouse.deltaY));
      zoom = zoom > geo.camera.extents.max.zoom ? geo.camera.extents.max.zoom : zoom;
      const min = minZoom(geo);
      zoom = zoom < min ? min : zoom;
      if (zoom !== geo.camera.transform) {
        let factor = zoom / geo.camera.transform[0];
        let x = mouse.clientX;
        let y = mouse.clientY;
        geo.camera.transform[4] = x - factor * (x-geo.camera.transform[4]);
        geo.camera.transform[5] = y - factor * (y-geo.camera.transform[5]);
        geo.camera.transform[0] = zoom;
        geo.camera.transform[3] = zoom;
        enforceBoundaries(geo);
      }

      mouse.preventDefault();
      mouse.stopPropagation();
    }

    var view = {
      enforceBoundaries,
      mouseZoom
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

    renderer("simple", (context, {shape, style, trace}, {viewport, hitChecker, tome}) => {
      const t = context.getTransform();
      const transform = [t.a, t.b, t.c, t.d, t.e, t.f];
      const {box, path} = tome.shape(shape);
      const finalBox = measure.transformBox(box, transform);
      if (tracer$1.boxesIntersect(viewport, finalBox)) {
        if (trace) {
          tracer$1.insert(hitChecker, {...finalBox, value: trace, check: tracer$1.generateHitChecker(context, path.shape, transform)});
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
            x: mouse.clientX,
            y: mouse.clientY,
            geo,
            elem,
            previousMode: "default",
            previousState: { geo, elem }
          });
        },
        wheel: (mouse, {geo}) => {
          view.mouseZoom(mouse, geo);
        }
      },
      (state) => state
    );

    mode(
      "panning",
      {
      	mouseup: (mouse, { elem, previousMode, previousState }) => { elem.set(previousMode, previousState); },
      	mouseout: (mouse, { elem, previousMode, previousState }) => { elem.set(previousMode, previousState); },
        mouseenter: (mouse, state) => {
          state.lastX = mouse.clientX;
          state.lastY = mouse.clientY;
        },
      	mousemove: (mouse, state) => {
          state.geo.camera.transform[4] = state.geo.camera.transform[4] + mouse.clientX - state.lastX;
          state.geo.camera.transform[5] = state.geo.camera.transform[5] + mouse.clientY - state.lastY;
          state.lastX = mouse.clientX;
          state.lastY = mouse.clientY;
          view.enforceBoundaries(state.geo);
        },
      },
      ({x, y, geo, elem, previousMode, previousState}) => {
        return {
          lastX: x,
          lastY: y,
          geo,
          elem,
          previousMode,
          previousState
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
        tome
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
        const hitChecker = tracer$1.tracer();
        geomancer.scene.forEach(sub => {
          const subject = tome.subject(sub);
          const render = tome.renderer(subject.renderer);
          if (render) render(context, subject, {viewport, hitChecker, tome});
        });
      };

      return geomancer
    }

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
    // find the complete implementation of crypto (msCrypto) on IE11.
    var getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);
    var rnds8 = new Uint8Array(16);
    function rng() {
      if (!getRandomValues) {
        throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
      }

      return getRandomValues(rnds8);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */
    var byteToHex = [];

    for (var i = 0; i < 256; ++i) {
      byteToHex.push((i + 0x100).toString(16).substr(1));
    }

    function bytesToUuid(buf, offset_) {
      var offset = offset_ || 0; // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434

      return (byteToHex[buf[offset + 0]] + byteToHex[buf[offset + 1]] + byteToHex[buf[offset + 2]] + byteToHex[buf[offset + 3]] + '-' + byteToHex[buf[offset + 4]] + byteToHex[buf[offset + 5]] + '-' + byteToHex[buf[offset + 6]] + byteToHex[buf[offset + 7]] + '-' + byteToHex[buf[offset + 8]] + byteToHex[buf[offset + 9]] + '-' + byteToHex[buf[offset + 10]] + byteToHex[buf[offset + 11]] + byteToHex[buf[offset + 12]] + byteToHex[buf[offset + 13]] + byteToHex[buf[offset + 14]] + byteToHex[buf[offset + 15]]).toLowerCase();
    }

    function v4(options, buf, offset) {
      options = options || {};
      var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        offset = offset || 0;

        for (var i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }

        return buf;
      }

      return bytesToUuid(rnds);
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
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
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function path(instructions) {
      const pathStore = writable(instructions);
      let shapeStore = derived(pathStore, instructions =>({
        shape: measure.pathToCanvas(instructions),
        box: measure.pathToBox(instructions),
        instructions: instructions
      }));

      return {
        set: newInstructions => pathStore.set(newInstructions),
        subscribe: callback => shapeStore.subscribe(callback)
      }
    }

    function pallette(styling) {
      const palletteStore = writable(styling);
      let painterStore = derived(palletteStore, styling => ({
        draw: style.palletteToPainter(styling),
        styling
      }));

      return {
        set: newStyle => palletteStore.set(newStyle),
        subscribe: callback => painterStore.subscribe(callback)
      }
    }

    function resetStore(store, subscribers) {
      subscribers.forEach(sub => {
        sub.unsubscribe = store.subscribe(sub.callback);
      });
      return store
    }

    function subscription(store, subscribers, callback) {
      const index = v4();
      const unsubscribe = store.subscribe(callback);
      subscribers[index] = {callback, unsubscribe};

      return () => {
        subscribers[index].unsubscribe();
        delete subscribers[index];
      }
    }

    function pattern$1(path, pallette) {
      function reaction([path, pallette]) {
        return {
          draw: context => pallette.draw(context, path.shape),
          path,
          pallette
        }
      }

      let store = derived([path, pallette], reaction);
      const subscribers = {};

      return {
        set: (newPath, newPallette) => {
          path = newPath;
          pallette = newPallette;
          store = resetStore(derived([path, pallette], reaction), subscribers);
        },
        setPath: (newPath) => {
          path = newPath;
          store = resetStore(derived([path, pallette], reaction), subscribers);
        },
        setPallette: (newPallette) => {
          pallette = newPallette;
          store = resetStore(derived([path, pallette], reaction), subscribers);
        },
        subscribe: (callback) => {
          return subscription(store, subscribers, callback)
        }
      }
    }

    function subject(pattern, transform, visible, trace=null) {
      const transformStore = writable(transform);
      const visibleStore = writable(visible);

      function reaction([pattern, transform, visible]) {
        return {
          draw: (context, viewport, hull) => {
            context.save();
            context.transform(...transform);
            const t = context.getTransform();
            const currentTransform = [t.a, t.b, t.c, t.d, t.e, t.f];
            const subjectBox = measure.transformBox(pattern.path.box, currentTransform);
            if (trace) {
              tracer$1.insert(hull, {...subjectBox, value: trace, check: tracer$1.generateHitChecker(context, pattern.path.shape, currentTransform)});
            }
            if (visible && tracer$1.boxesIntersect(viewport, subjectBox)) {
              pattern.draw(context);
              context.restore();
            }
          },
          pattern,
          transform,
          visible
        }
      }

      let store = derived([pattern, transformStore, visibleStore], reaction);
      const subscribers = {};

      return {
        set: (newPattern, newTransform, newVisible) => {
          subscribers.forEach(sub => {sub.unsubscribe();});
          const newStore = derived([newPattern, transformStore, visibleStore], reaction);
          transformStore.set(newTransform);
          visibleStore.set(newVisible);
          store = resetStore(newStore, subscribers);
        },
        setTransform: (newTransform) => {
          transformStore.set(newTransform);
        },
        setVisible: (newVisible) => {
          visibleStore.set(newVisible);
        },
        setPattern: (newPattern) => {
          subscribers.forEach(sub => {sub.unsubscribe();});
          store = resetStore(derived([newPattern, transformStore, visibleStore], reaction));
        },
        subscribe: (callback) => {
          return subscription(store, subscribers, callback)
        }
      }
    }

    function frame(subjects, transform, visible) {
      const transformStore = writable(transform);
      const visibleStore = writable(visible);

      function reaction([transform, visible, ...subjects]) {
        return {
          draw: (context, viewport, hull) => {
            if (visible) {
              context.save();
              context.transform(...transform);
              subjects.forEach(subject => subject.draw(context, viewport, hull));
              context.restore();
            }
          },
          transform,
          visible,
          subjects
        }
      }

      let store = derived([transformStore, visibleStore, ...subjects], reaction);
      const subscribers = {};

      return {
        set: (newSubjects, newTransform, newVisible) => {
          subscribers.forEach(sub => {sub.unsubscribe();});
          const newStore = derived([transformStore, visibleStore, ...newSubjects], reaction);
          transformStore.set(newTransform);
          visibleStore.set(newVisible);
          store = resetStore(newStore, subscribers);
        },
        setTransform: (newTransform) => {
          transformStore.set(newTransform);
        },
        setVisible: (newVisible) => {
          visibleStore.set(newVisible);
        },
        setSubjects: (newSubjects) => {
          subscribers.forEach(sub => {sub.unsubscribe();});
          const newStore = derived([transformStore, visibleStore, ...newSubjects], reaction);
          store = resetStore(newStore, subscribers);
        },
        subscribe: (callback) => {
          return subscription(store, subscribers, callback)
        }
      }
    }

    function camera(subjects, transform, width, height) {
      const transformStore = writable(transform);
      const widthStore = writable(width);
      const heightStore = writable(height);
      let hull = tracer$1.tracer();

      function reaction([transform, width, height, ...subjects]) {
        const viewport = measure.transformBox({min: {x: 0, y: 0}, max: {x: width, y: height}}, transform);
        return {
          draw: (context) => {
            context.setTransform(...transform);
            context.save();
            hull = tracer$1.tracer();
            subjects.forEach(subject => subject.draw(context, viewport, hull));
            context.restore();
            return hull
          },
          transform,
          width,
          height,
          subjects,
          itemsAt: (x, y) => {
            return tracer$1.intersectPoint(hull, {x, y})
          }
        }
      }

      let store = derived([transformStore, widthStore, heightStore, ...subjects], reaction);
      const subscribers = {};

      return {
        set: (newLayers, newTransform, newWidth, newHeight) => {
          subscribers.forEach(sub => {sub.unsubscribe();});
          const newStore = derived([transformStore, widthStore, heightStore, ...newSubjects], reaction);
          widthStore.set(newWidth);
          heightStore.set(newHeight);
          transformStore.set(newTransform);
          store = resetStore(newStore, subscribers);
        },
        setTransform: (newTransform) => {
          transformStore.set(newTransform);
        },
        setWidth: (newWidth) => {
          widthStore.set(newWidth);
        },
        setHeight: (newHeight) => {
          heightStore.set(newHeight);
        },
        setSubjects: (newSubjects) => {
          subscribers.forEach(sub => {sub.unsubscribe();});
          const newStore = derived([transformStore, widthStore, heightStore, ...newSubjects], reaction);
          store = resetStore(newStore, subscribers);
        },
        subscribe: (callback) => {
          return subscription(store, subscribers, callback)
        },
      }
    }

    const hexPath = path([
      ['moveTo', 2.5, 43.3],
      ['lineTo', 26.25, 84.77],
      ['lineTo', 73.75, 84.77],
      ['lineTo', 97.5, 43.3],
      ['lineTo', 73.75, 2.165],
      ['lineTo', 26.25, 2.165],
      ['closePath'],
    ]);
    const boundingPath = path([['rect', 10, 10, 780, 780]]);
    const blackPallette = pallette({
      fillStyle: 'black',
      lineWidth: 3,
      lineJoin: 'round'
    });
    const thinBlackPallette = pallette({
      lineWidth: 5,
      strokeStyle: 'black',
      lineJoin: 'round'
    });
    const hexPattern = pattern$1(hexPath, blackPallette);
    const boundaryPattern = pattern$1(boundingPath, thinBlackPallette);
    const boundarySubject = subject(boundaryPattern, [1, 0, 0, 1, 0, 0], true, "boundaries");
    const hexSubject = subject(hexPattern, [1, 0, 0, 1, 100, 100], true, "lone hexagon");
    const baseLayer = frame([boundarySubject, hexSubject], [1, 0, 0, 1, 0, 0], true);
    const geomancer$1 = camera([baseLayer], [1, 0, 0, 1, 0, 0], 800, 800);

    let extents = {left: 0, right: 800, top: 0, bottom: 800};
    let maxZoom = 5;
    const handlers = {
    	mousedown: (mouse, {camera, id}) => {
        view.startPanning(mouse.clientX, mouse.clientY, id);
      },
    	mouseup: (mouse, {camera, id}) => { view.stopPanning(id); },
    	mouseout: (mouse, {camera, id}) => { view.stopPanning(id); },
    	mousemove: (mouse, {camera, id}) => {
        let state = get_store_value(camera);
        console.log(state.itemsAt(mouse.clientX, mouse.clientY));

        let target = view.panning(mouse.clientX, mouse.clientY, state.transform, id);
        view.enforceBoundaries(state.width, state.height, target, extents);
        camera.setTransform(target);
      },
    	wheel: (mouse, {camera}) => {
        let state = get_store_value(camera);
        let target = view.mouseZoom(mouse, state.transform);
        view.enforceBoundaries(state.width, state.height, target, extents, maxZoom);

        camera.setTransform(target);
      },
    };

    var example = {
      camera: geomancer$1,
      handlers
    };

    function order (layer, subjects = []) {
      layer.subjects.forEach(subject => {
    		subjects.push(subject.id);
      });

      layer.layers.forEach(subLayer => {
        order(subLayer, subjects);
      });

      return subjects
    }


    function resolve (transform, layer, subjects = {}) {
      const layerTransform = measure.applyTransform(transform, layer.transform);

      layer.subjects.forEach(subject => {
    		let subjectTransform = measure.applyTransform(layerTransform, subject.transform);
    		subjects[subject.id] = {
          ...subject,
          transform: subjectTransform
        };
      });

      layer.layers.forEach(subLayer => {
        resolve(reference, layerTransform, subLayer);
      });

      return subjects
    }


    var subjects$1 = {
      order,
      resolve
    };

    function makeHull(context, course, id) {
      const subject = course.subjects[id];
      if (subject.handle) {
        context.save();
        context.transform(...subject.transform);

        const matrix = context.getTransform();
        const transform = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];

        const shape = course.shapes[subject.path];
        const check = generateHitChecker(context, shape, transform);
        const box = course.boxes[subject.path];

        context.restore();
        return {
          ...measure.transformBox(box, transform),
          value: id,
          check
        }
      }

    }

    function hulls(context, course, scene, hitChecker=tracer$1.tracer()) {
      context.save();

      context.transform(...scene.transform);

      scene.subjects.forEach(id => {
        const hull = makeHull(context, course, id);
        if (hull) {
          tracer$1.insert(hitChecker, hull);
        }
      });

      scene.layers.forEach(layer => {
        hulls(context, course, layer, hitChecker);
      });

      context.restore();

      return hitChecker
    }

    var handles = {
      hulls
    };

    function paintSubject (context, course, subject) {
      context.save();
      context.transform(...subject.transform);

      let shape = course.shapes[subject.path];
      let painter = course.painters[subject.pallette];

      painter(context, shape);
      context.restore();
    }

    function paint (context, course, scene) {
      context.transform(...scene.transform);

      scene.subjects.forEach(id => {
        let subject = course.subjects[id];
        paintSubject(context, course, subject);
      });

      scene.layers.forEach(layer => {
        context.save();
        paint(context, course, layer);
        context.restore();
      });
    }

    var scene = {
      paint
    };

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
    			add_location(canvas_1, file, 60, 0, 1166);
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
    		derived,
    		get: get_store_value,
    		onMount,
    		style,
    		scene,
    		measure,
    		tracer: tracer$1,
    		events,
    		handles,
    		view,
    		subjects: subjects$1,
    		example,
    		uuidv4: v4,
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
        'default': Geomancer,
        style: style,
        scene: scene,
        measure: measure,
        tracer: tracer$1
    });

    /* src/Example.svelte generated by Svelte v3.20.1 */

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
    			trace: "lone hex"
    		},
    		transform: [1, 0, 0, 1, 0, 0],
    		visible: true,
    		renderer: "simple"
    	});

    	tome.register.subject("base layer", {
    		details: { subjects: ["lone hex", "boundaries"] },
    		transform: [1, 0, 0, 1, 0, 0],
    		visible: true,
    		renderer: "nested"
    	});

    	let geo = geomancer();

    	geo.camera.extents = {
    		min: { x: 0, y: 0, zoom: null },
    		max: { x: 800, y: 800, zoom: 5 }
    	};

    	geo.scene = ["base layer"];
    	let mode = { name: "default", state: {} };
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<geomancer-example> was created with unknown prop '${key}'`);
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
