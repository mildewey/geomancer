
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
        console.log(subpath);
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


    var subjects = {
      order,
      resolve
    };

    var events = {

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

      if (x < minX) transform[4] = minX;
      if (x > maxX) transform[4] = maxX;
      if (y < minY) transform[5] = minY;
      if (y > maxY) transform[5] = maxY;
    }

    function stableZoom (x, y, zoom, transform) {
      let target = [...transform];
      target[0] = zoom;
      target[3] = zoom;
      let factor = zoom/transform[0];
      target[4] = x - factor * (x-transform[4]);
      target[5] = y - factor * (y-transform[5]);
      return target
    }

    function startPanning (mouse, context) {
      lastX[context.element.id] = mouse.clientX;
      lastY[context.element.id] = mouse.clientY;
      isPanning[context.element.id] = true;
    }

    function panning (mouse, context) {
      if (!isPanning[context.element.id]) {
        return;
      }
      let transform = context.transform;
      let target = [...$transform];
      target[4] = transform[4] + mouse.clientX - lastX[context.element.id];
      target[5] = transform[5] + mouse.clientY - lastY[context.element.id];
      lastX[context.element.id] = mouse.clientX;
      lastY[context.element.id] = mouse.clientY;
      enforceBoundaries(width, height, extents, target);
      context.transform.set(target);
    }

    function stopPanning (mouse, node) {
      isPanning[node.id] = false;
    }

    function zooming (mouse, node, width, height, extents, transform) {
      console.log(width, height, extents, transform);
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
      console.log(target);
      node.dispatchEvent(new CustomEvent("panZoomRotate", {transform: target}));
    }

    var view = {
      enforceBoundaries,
      stableZoom,
      startPanning,
      panning,
      stopPanning,
      zooming,
    };

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

    var tracer$1 = {
      tracer,
      insert: insert$1,
      concat,
      intersectPoint,
      intersectBox,
      boxesIntersect,
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
      console.log(options);
      let pallette = {...defaults, ...options};
      function painter(context, path) {
        console.log(context, path, pallette);
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

    function path(instructions) {
      const pathStore = writable(instructions);
      let shapeStore = derived(pathStore, $path =>({
        shape: measure.pathToCanvas($path),
        box: measure.pathToBox($path)
      }));

      return {
        set: newInstructions => pathStore.set(newInstructions),
        subscribe: callback => shapeStore.subscribe(callback)
      }
    }

    function pallette(styling) {
      console.log(styling);
      const palletteStore = writable(styling);
      let painterStore = derived(palletteStore, $pallette => style.palletteToPainter($pallette));

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
          draw: context => pallette(context, path.shape),
          box: path.box
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

    function subject(pattern, transform, visible) {
      const transformStore = writable(transform);
      const visibleStore = writable(visible);

      function reaction([pattern, transform, visible]) {
        return {
          draw: (context, viewport) => {
            context.save();
            context.transform(...transform);
            const t = context.getTransform();
            const subjectBox = measure.transformBox(pattern.box, [t.a, t.b, t.c, t.d, t.e, t.f]);
            if (visible && tracer$1.boxesIntersect(viewport, subjectBox)) {
              pattern.draw(context);
              context.restore();
            }
          }
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

    function layer(subjects, transform, visible) {
      const transformStore = writable(transform);
      const visibleStore = writable(visible);

      function reaction([transform, visible, ...subjects]) {
        console.log(transform);
        return {
          draw: (context, viewport) => {
            if (visible) {
              context.save();
              context.transform(...transform);
              subjects.forEach(sub => console.log("layer", sub));
              subjects.forEach(subject => subject.draw(context, viewport));
              context.restore();
            }
          }
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

      function reaction([transform, width, height, ...subjects]) {
        const viewport = measure.transformBox({min: {x: 0, y: 0}, max: {x: width, y: height}}, transform);
        return {
          draw: (context) => {
            console.time("full draw");
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.save();
            subjects.forEach(sub => console.log(sub));
            subjects.forEach(subject => subject.draw(context, viewport));
            context.restore();
            context.transform(...transform);
            console.timeEnd("full draw");
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
          console.log("camera subscribed");
          return subscription(store, subscribers, callback)
        },
      }
    }

    /* src/Geomancer.svelte generated by Svelte v3.20.1 */

    const { console: console_1 } = globals;
    const file = "src/Geomancer.svelte";

    function create_fragment(ctx) {
    	let canvas_1;
    	let canvas_1_width_value;
    	let canvas_1_height_value;

    	const block = {
    		c: function create() {
    			canvas_1 = element("canvas");
    			this.c = noop;
    			attr_dev(canvas_1, "width", canvas_1_width_value = "" + (/*width*/ ctx[0] + "px"));
    			attr_dev(canvas_1, "height", canvas_1_height_value = "" + (/*height*/ ctx[1] + "px"));
    			add_location(canvas_1, file, 115, 0, 3007);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[15](canvas_1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*width*/ 1 && canvas_1_width_value !== (canvas_1_width_value = "" + (/*width*/ ctx[0] + "px"))) {
    				attr_dev(canvas_1, "width", canvas_1_width_value);
    			}

    			if (dirty & /*height*/ 2 && canvas_1_height_value !== (canvas_1_height_value = "" + (/*height*/ ctx[1] + "px"))) {
    				attr_dev(canvas_1, "height", canvas_1_height_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas_1);
    			/*canvas_1_binding*/ ctx[15](null);
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
    	let { width = 800 } = $$props;
    	let { height = 800 } = $$props;

    	const hexPath = path([
    		["moveTo", 2.5, 43.3],
    		["lineTo", 26.25, 84.77],
    		["lineTo", 73.75, 84.77],
    		["lineTo", 97.5, 43.3],
    		["lineTo", 73.75, 2.165],
    		["lineTo", 26.25, 2.165],
    		["closePath"]
    	]);

    	const boundingPath = path([["rect", 10, 10, 780, 780]]);

    	const blackPallette = pallette({
    		fillStyle: "black",
    		lineWidth: 3,
    		lineJoin: "round"
    	});

    	const thinBlackPallette = pallette({
    		lineWidth: 5,
    		strokeStyle: "black",
    		lineJoin: "round"
    	});

    	const hexPattern = pattern$1(hexPath, blackPallette);
    	const boundaryPattern = pattern$1(boundingPath, thinBlackPallette);
    	const boundarySubject = subject(boundaryPattern, [1, 0, 0, 1, 0, 0], true);
    	const hexSubject = subject(hexPattern, [1, 0, 0, 1, 100, 100], true);
    	const baseLayer = layer([boundarySubject, hexSubject], [1, 0, 0, 1, 0, 0], true);
    	const geomancer = camera([baseLayer], [1, 0, 0, 1, 0, 0], width, height);
    	let canvas;
    	const context = writable(null);

    	const paintStore = derived([context, geomancer], ([context, geomancer]) => {
    		return () => {
    			console.log("painting?");

    			if (context) {
    				console.log("painting!");
    				context.clearRect(0, 0, width, height);
    				geomancer.draw(context);
    			}
    		};
    	});

    	paintStore.subscribe(draw => draw());

    	// export let handlers = {
    	// 	mousedown: view.startPanning,
    	// 	mouseup: view.stopPanning,
    	// 	mouseout: view.stopPanning,
    	// 	mousemove: view.panning,
    	// 	wheel: view.zooming,
    	// }
    	// function eventHandlers (node, events) {
    	// 	let context = {
    	// 		element: node,
    	// 		extents: extentsStore,
    	// 		width: widthStore,
    	// 		height: heightStore,
    	// 		transform: transformStore,
    	// 		paths: pathsStore,
    	// 		pallettes: pallettesStore,
    	// 		layers: layersStore,
    	// 	}
    	// 	let handlers = []
    	// 	for (const ev in events) {
    	// 		handlers.push([ev, (event) => events[ev](event, context)])
    	// 	}
    	// 	handlers.forEach(([ev, handler]) => node.addEventListener(ev, handler))
    	// 	return {
    	// 		update (newHandlers) {
    	// 			handlers.forEach(([ev, handler]) => node.removeEventListener(ev, handler))
    	// 			handlers = []
    	// 			for (const ev in newHandlers) {
    	// 				handlers.push([ev, (event) => events[ev](event, context)])
    	// 			}
    	// 			handlers.forEach(([ev, handler]) => node.addEventListener(ev, handler))
    	// 		},
    	// 		destroy () {
    	// 			handlers.forEach(([ev, handler]) => node.removeEventListener(ev, handler))
    	// 		}
    	// 	}
    	// }
    	onMount(() => {
    		console.log(get_store_value(geomancer));
    		context.set(canvas.getContext("2d"));
    	});

    	const writable_props = ["width", "height"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<geomancer-scene> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("geomancer-scene", $$slots, []);

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, canvas = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		derived,
    		get: get_store_value,
    		onMount,
    		path,
    		pallette,
    		pattern: pattern$1,
    		subject,
    		layer,
    		camera,
    		style,
    		scene,
    		measure,
    		tracer: tracer$1,
    		events,
    		handles,
    		view,
    		subjects,
    		width,
    		height,
    		hexPath,
    		boundingPath,
    		blackPallette,
    		thinBlackPallette,
    		hexPattern,
    		boundaryPattern,
    		boundarySubject,
    		hexSubject,
    		baseLayer,
    		geomancer,
    		canvas,
    		context,
    		paintStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("canvas" in $$props) $$invalidate(2, canvas = $$props.canvas);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		width,
    		height,
    		canvas,
    		hexPath,
    		boundingPath,
    		blackPallette,
    		thinBlackPallette,
    		hexPattern,
    		boundaryPattern,
    		boundarySubject,
    		hexSubject,
    		baseLayer,
    		geomancer,
    		context,
    		paintStore,
    		canvas_1_binding
    	];
    }

    class Geomancer extends SvelteElement {
    	constructor(options) {
    		super();
    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, { width: 0, height: 1 });

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
    		return ["width", "height"];
    	}

    	get width() {
    		return this.$$.ctx[0];
    	}

    	set width(width) {
    		this.$set({ width });
    		flush();
    	}

    	get height() {
    		return this.$$.ctx[1];
    	}

    	set height(height) {
    		this.$set({ height });
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
