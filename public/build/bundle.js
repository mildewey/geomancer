
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
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
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

    const contexts = {};
    const hitCheckers = {};
    const transforms = {};

    var events = {
      contexts,
      hitCheckers,
      transforms
    };

    const lastX = {};
    const lastY = {};
    const isPanning = {};

    function enforceBoundaries (width, height, extents, transform) {
      let zoom = transform[0];
      let x = transform[4];
      let y = transform[5];
      let maxX = -extents.left*zoom;
      let minX = width-extents.right*zoom;
      let maxY = -extents.top*zoom;
      let minY = height-extents.bottom*zoom;

      console.log("enforce boundaries", transform, minX, maxX, minY, maxY);
      if (x < minX) transform[4] = minX;
      if (x > maxX) transform[4] = maxX;
      if (y < minY) transform[5] = minY;
      if (y > maxY) transform[5] = maxY;
    }

    function stableZoom ( x, y, zoom, transform ) {
      let target = [...transform];
      target[0] = zoom;
      target[3] = zoom;
      let factor = zoom/transform[0];
      target[4] = x - factor * (x-transform[4]);
      target[5] = y - factor * (y-transform[5]);
      return target
    }

    function startPanning (mouse) {
      lastX[mouse.target.id] = mouse.clientX;
      lastY[mouse.target.id] = mouse.clientY;
      isPanning[mouse.target.id] = true;
      console.log("Start panning");
    }

    function panning (mouse, width, height, extents, transform) {
      if (!isPanning[mouse.target.id]) {
        return transform
      }
      console.log("panning");
      let target = [...transform];
      target[4] = transform[4] + mouse.clientX - lastX[mouse.target.id];
      target[5] = transform[5] + mouse.clientY - lastY[mouse.target.id];
      lastX[mouse.target.id] = mouse.clientX;
      lastY[mouse.target.id] = mouse.clientY;
      enforceBoundaries(width, height, extents, target);
      events.transforms[mouse.target.id].set(target);
    }

    function stopPanning (mouse) {
      console.log("Stop panning");
      isPanning[mouse.target.id] = false;
    }

    function zooming (mouse, width, height, extents, transform) {
      let delta = -Math.sign(mouse.deltaY);
      let zoom = transform[0] * (1.2 ** delta);
      let minZoom = Math.max(
        width/(extents.right - extents.left),
        height/(extents.bottom - extents.top),
        0.5
      );
      if (zoom > 5) zoom = 5;
      if (zoom < minZoom) zoom = minZoom;

      let target = stableZoom(mouse.offsetX, mouse.offsetY, zoom, transform);
      enforceBoundaries(width, height, extents, target);

      mouse.preventDefault();
      mouse.stopPropagation();
      events.transforms[mouse.target.id].set(target);
    }

    var view = {
      enforceBoundaries,
      stableZoom,
      startPanning,
      panning,
      stopPanning,
      zooming,
    };

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
      if (!path.length) return 'Paths must have at least 2 instructions'

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

    var measure = {
      pathsToShapes,
      pathToBox,
      transformBox,
      pathToCanvas,
      pathValidate
    };

    var measure$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': measure
    });

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

    var tracer$1 = {
      tracer,
      insert: insert$1,
      concat,
      intersectPoint,
      intersectBox
    };

    var tracer$2 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': tracer$1
    });

    function generateHitChecker(context, path, transform) {
      return (x, y) => {
        context.save();
        context.setTransform(...transform);
        const inPath = context.isPointInPath(path, x, y);
        context.restore();
        return inPath
      }
    }

    function makeHull(context, course, id, boxes) {
      const subject = course.subjects[id];
      if (subject.handle) {
        context.save();
        const matrix = context.getTransform();
        const transform = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f];
        context.transform(...subject.transform);

        const shape = course.shapes[subject.path];
        const check = generateHitChecker(context, shape, transform);
        const box = !boxes[subject.path] ? measure.pathToBox(course.paths[subject.path]) : boxes[subject.path];

        context.restore();
        return {
          ...measure.transformBox(box, transform),
          value: id,
          check
        }
      }

    }

    function hulls(context, course, scene, boxes={}, hitChecker=tracer$1.tracer()) {
      context.save();

      context.transform(...scene.transform);

      scene.subjects.forEach(id => {
        const hull = makeHull(context, course, id, boxes);
        if (hull) {
          tracer$1.insert(hitChecker, hull);
        }
      });

      scene.layers.forEach(layer => {
        hulls(context, course, layer, boxes, hitChecker);
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

    /* src/Geomancer.svelte generated by Svelte v3.20.1 */

    const { console: console_1 } = globals;
    const file = "src/Geomancer.svelte";

    function create_fragment(ctx) {
    	let canvas_1;
    	let canvas_1_width_value;
    	let canvas_1_height_value;
    	let eventHandlers_action;
    	let dispose;

    	const block = {
    		c: function create() {
    			canvas_1 = element("canvas");
    			this.c = noop;
    			attr_dev(canvas_1, "id", /*sceneID*/ ctx[1]);
    			attr_dev(canvas_1, "width", canvas_1_width_value = "" + (/*width*/ ctx[2] + "px"));
    			attr_dev(canvas_1, "height", canvas_1_height_value = "" + (/*height*/ ctx[3] + "px"));
    			add_location(canvas_1, file, 179, 0, 4088);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[14](canvas_1);
    			if (remount) run_all(dispose);

    			dispose = [
    				action_destroyer(eventHandlers_action = eventHandlers.call(null, canvas_1, /*handlers*/ ctx[4])),
    				listen_dev(canvas_1, "panZoomRotate", /*panZoomRotate_handler*/ ctx[15], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*sceneID*/ 2) {
    				attr_dev(canvas_1, "id", /*sceneID*/ ctx[1]);
    			}

    			if (dirty & /*width*/ 4 && canvas_1_width_value !== (canvas_1_width_value = "" + (/*width*/ ctx[2] + "px"))) {
    				attr_dev(canvas_1, "width", canvas_1_width_value);
    			}

    			if (dirty & /*height*/ 8 && canvas_1_height_value !== (canvas_1_height_value = "" + (/*height*/ ctx[3] + "px"))) {
    				attr_dev(canvas_1, "height", canvas_1_height_value);
    			}

    			if (eventHandlers_action && is_function(eventHandlers_action.update) && dirty & /*handlers*/ 16) eventHandlers_action.update.call(null, /*handlers*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas_1);
    			/*canvas_1_binding*/ ctx[14](null);
    			run_all(dispose);
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

    function eventHandlers(node, events) {
    	for (const ev in events) {
    		console.log(ev, events);
    		node.addEventListener(ev, events[ev]);
    	}

    	console.log(node);
    	let prevEvents = events;

    	return {
    		update(newEvents) {
    			for (const ev in prevEvents) {
    				node.removeEventListener(ev, prevEvents[ev]);
    			}

    			for (const ev in newEvents) {
    				node.addEventListener(ev, newEvents[ev]);
    			}

    			prevEvents = newEvents;
    		},
    		destroy() {
    			for (const ev in prevEvents) {
    				node.removeEventListener(ev, prevEvents[ev]);
    			}
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { sceneID = "geomancer-viewport" } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;
    	let { extents = { left: 0, right: 800, top: 0, bottom: 800 } } = $$props;

    	let { handlers = {
    		mousedown: view.startPanning,
    		mouseup: view.stopPanning,
    		mouseout: view.stopPanning,
    		mousemove: event => view.panning(event, width, height, extents, transform),
    		wheel: event => view.zooming(event, width, height, extents, transform)
    	} } = $$props;

    	let { paths = {
    		hexagon: [
    			["moveTo", 2.5, 43.3],
    			["lineTo", 26.25, 84.77],
    			["lineTo", 73.75, 84.77],
    			["lineTo", 97.5, 43.3],
    			["lineTo", 73.75, 2.165],
    			["lineTo", 26.25, 2.165],
    			["closePath"]
    		],
    		boundaries: [["rect", 10, 10, 780, 780]]
    	} } = $$props; // a dictionary of step by step instructions for building shapes

    	let { pallettes = {
    		black: {
    			fillStyle: "black",
    			lineWidth: 3,
    			lineJoin: "round"
    		},
    		thinBlackLines: {
    			lineWidth: 5,
    			strokeStyle: "black",
    			lineJoin: "round"
    		}
    	} } = $$props; // a dictionary of coloring and brush information

    	let { subjects = {
    		hex: {
    			path: "hexagon",
    			pallette: "black",
    			transform: [1, 0, 0, 1, 100, 100],
    			handle: true
    		},
    		boundaries: {
    			path: "boundaries",
    			pallette: "thinBlackLines",
    			transform: [1, 0, 0, 1, 0, 0]
    		}
    	} } = $$props;

    	let { transform = [1, 0, 0, 1, 0, 0] } = $$props;

    	let { layers = [
    		{
    			transform: [1, 0, 0, 1, 0, 0],
    			subjects: ["hex"],
    			layers: []
    		}
    	] } = $$props;

    	// a list of scene objects which look like this:
    	// {
    	//   transform: defaultTransform(),
    	//   subjects: [], // a list of subjects to draw, the subjects will be drawn in order, so the 0th subject will be behind the others
    	//   layers: [] // list of nested scene objects
    	// }
    	// the layers will be drawn in order, so the 0th layer is the bottom layer
    	events.contexts[sceneID] = writable(null);

    	events.hitCheckers[sceneID] = writable(null);
    	events.transforms[sceneID] = writable(transform);

    	events.transforms[sceneID].subscribe(newTransform => {
    		console.log("Changing transform to", newTransform);
    		$$invalidate(0, transform = newTransform);
    	});

    	let canvas;

    	function draw() {
    		const context = canvas.getContext("2d");
    		context.setTransform(1, 0, 0, 1, 0, 0);
    		console.log("clear rect", width, height);
    		context.clearRect(0, 0, width, height);
    		scene.paint(context, course, viewport);
    		events.contexts[sceneID].set(context);
    		events.hitCheckers[sceneID].set(handles.hulls(context, course, viewport));
    	}

    	onMount(() => {
    		console.log("Mounting Geomancer canvas");
    		view.enforceBoundaries(width, height, extents, transform);
    		draw();
    	});

    	afterUpdate(() => {
    		console.log("Updated Geomancer canvas");
    		draw();
    	});

    	onDestroy(() => {
    		delete events.contexts[sceneID];
    		delete events.hitCheckers[sceneID];
    		delete events.transforms[sceneID];
    	});

    	const writable_props = [
    		"sceneID",
    		"width",
    		"height",
    		"extents",
    		"handlers",
    		"paths",
    		"pallettes",
    		"subjects",
    		"transform",
    		"layers"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<geomancer-scene> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("geomancer-scene", $$slots, []);

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, canvas = $$value);
    		});
    	}

    	const panZoomRotate_handler = change => $$invalidate(0, transform = change);

    	$$self.$set = $$props => {
    		if ("sceneID" in $$props) $$invalidate(1, sceneID = $$props.sceneID);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("extents" in $$props) $$invalidate(6, extents = $$props.extents);
    		if ("handlers" in $$props) $$invalidate(4, handlers = $$props.handlers);
    		if ("paths" in $$props) $$invalidate(7, paths = $$props.paths);
    		if ("pallettes" in $$props) $$invalidate(8, pallettes = $$props.pallettes);
    		if ("subjects" in $$props) $$invalidate(9, subjects = $$props.subjects);
    		if ("transform" in $$props) $$invalidate(0, transform = $$props.transform);
    		if ("layers" in $$props) $$invalidate(10, layers = $$props.layers);
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		style,
    		scene,
    		measure,
    		tracer: tracer$1,
    		events,
    		handles,
    		view,
    		onMount,
    		afterUpdate,
    		onDestroy,
    		sceneID,
    		width,
    		height,
    		extents,
    		handlers,
    		paths,
    		pallettes,
    		subjects,
    		transform,
    		layers,
    		canvas,
    		draw,
    		eventHandlers,
    		course,
    		viewport
    	});

    	$$self.$inject_state = $$props => {
    		if ("sceneID" in $$props) $$invalidate(1, sceneID = $$props.sceneID);
    		if ("width" in $$props) $$invalidate(2, width = $$props.width);
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("extents" in $$props) $$invalidate(6, extents = $$props.extents);
    		if ("handlers" in $$props) $$invalidate(4, handlers = $$props.handlers);
    		if ("paths" in $$props) $$invalidate(7, paths = $$props.paths);
    		if ("pallettes" in $$props) $$invalidate(8, pallettes = $$props.pallettes);
    		if ("subjects" in $$props) $$invalidate(9, subjects = $$props.subjects);
    		if ("transform" in $$props) $$invalidate(0, transform = $$props.transform);
    		if ("layers" in $$props) $$invalidate(10, layers = $$props.layers);
    		if ("canvas" in $$props) $$invalidate(5, canvas = $$props.canvas);
    		if ("course" in $$props) course = $$props.course;
    		if ("viewport" in $$props) viewport = $$props.viewport;
    	};

    	let course;
    	let viewport;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*paths, pallettes, subjects*/ 896) {
    			 course = {
    				paths,
    				shapes: measure.pathsToShapes(paths),
    				painters: style.pallettesToPainters(pallettes),
    				subjects
    			};
    		}

    		if ($$self.$$.dirty & /*transform, layers*/ 1025) {
    			 viewport = { transform, layers, subjects: [] };
    		}
    	};

    	return [
    		transform,
    		sceneID,
    		width,
    		height,
    		handlers,
    		canvas,
    		extents,
    		paths,
    		pallettes,
    		subjects,
    		layers,
    		course,
    		viewport,
    		draw,
    		canvas_1_binding,
    		panZoomRotate_handler
    	];
    }

    class Geomancer extends SvelteElement {
    	constructor(options) {
    		super();

    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, {
    			sceneID: 1,
    			width: 2,
    			height: 3,
    			extents: 6,
    			handlers: 4,
    			paths: 7,
    			pallettes: 8,
    			subjects: 9,
    			transform: 0,
    			layers: 10
    		});

    		const { ctx } = this.$$;
    		const props = this.attributes;

    		if (/*width*/ ctx[2] === undefined && !("width" in props)) {
    			console_1.warn("<geomancer-scene> was created without expected prop 'width'");
    		}

    		if (/*height*/ ctx[3] === undefined && !("height" in props)) {
    			console_1.warn("<geomancer-scene> was created without expected prop 'height'");
    		}

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
    		return [
    			"sceneID",
    			"width",
    			"height",
    			"extents",
    			"handlers",
    			"paths",
    			"pallettes",
    			"subjects",
    			"transform",
    			"layers"
    		];
    	}

    	get sceneID() {
    		return this.$$.ctx[1];
    	}

    	set sceneID(sceneID) {
    		this.$set({ sceneID });
    		flush();
    	}

    	get width() {
    		return this.$$.ctx[2];
    	}

    	set width(width) {
    		this.$set({ width });
    		flush();
    	}

    	get height() {
    		return this.$$.ctx[3];
    	}

    	set height(height) {
    		this.$set({ height });
    		flush();
    	}

    	get extents() {
    		return this.$$.ctx[6];
    	}

    	set extents(extents) {
    		this.$set({ extents });
    		flush();
    	}

    	get handlers() {
    		return this.$$.ctx[4];
    	}

    	set handlers(handlers) {
    		this.$set({ handlers });
    		flush();
    	}

    	get paths() {
    		return this.$$.ctx[7];
    	}

    	set paths(paths) {
    		this.$set({ paths });
    		flush();
    	}

    	get pallettes() {
    		return this.$$.ctx[8];
    	}

    	set pallettes(pallettes) {
    		this.$set({ pallettes });
    		flush();
    	}

    	get subjects() {
    		return this.$$.ctx[9];
    	}

    	set subjects(subjects) {
    		this.$set({ subjects });
    		flush();
    	}

    	get transform() {
    		return this.$$.ctx[0];
    	}

    	set transform(transform) {
    		this.$set({ transform });
    		flush();
    	}

    	get layers() {
    		return this.$$.ctx[10];
    	}

    	set layers(layers) {
    		this.$set({ layers });
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

    var index = {
      Geomancer: Geomancer$1,
      measure: measure$1,
      style: style$1,
      tracer: tracer$2
    };

    return index;

}());
//# sourceMappingURL=bundle.js.map
