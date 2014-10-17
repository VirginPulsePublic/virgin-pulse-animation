
/* Copyright (C) 2013 Justin Windle, http://soulwire.co.uk */

(function ( root, factory ) {
    
    if ( typeof exports === 'object' ) {

        // CommonJS like
        module.exports = factory(root, root.document);

    } else if ( typeof define === 'function' && define.amd ) {

        // AMD
        define( function() { return factory( root, root.document ); });

    } else {

        // Browser global
        root.Sketch = factory( root, root.document );
    }

}( this, function ( window, document ) {

    "use strict";

    /*
    ----------------------------------------------------------------------

        Config

    ----------------------------------------------------------------------
    */

    var MATH_PROPS = 'E LN10 LN2 LOG2E LOG10E PI SQRT1_2 SQRT2 abs acos asin atan ceil cos exp floor log round sin sqrt tan atan2 pow max min'.split( ' ' );
    var HAS_SKETCH = '__hasSketch';
    var M = Math;

    var CANVAS = 'canvas';
    var WEBGL = 'webgl';
    var DOM = 'dom';

    var doc = document;
    var win = window;

    var instances = [];

    var defaults = {

        fullscreen: true,
        autostart: true,
        autoclear: true,
        autopause: true,
        container: doc.body,
        interval: 1,
        globals: true,
        retina: false,
        type: CANVAS
    };

    var keyMap = {

         8: 'BACKSPACE',
         9: 'TAB',
        13: 'ENTER',
        16: 'SHIFT',
        27: 'ESCAPE',
        32: 'SPACE',
        37: 'LEFT',
        38: 'UP',
        39: 'RIGHT',
        40: 'DOWN'
    };

    /*
    ----------------------------------------------------------------------

        Utilities

    ----------------------------------------------------------------------
    */

    function isArray( object ) {

        return Object.prototype.toString.call( object ) == '[object Array]';
    }

    function isFunction( object ) {

        return typeof object == 'function';
    }

    function isNumber( object ) {

        return typeof object == 'number';
    }

    function isString( object ) {

        return typeof object == 'string';
    }

    function keyName( code ) {

        return keyMap[ code ] || String.fromCharCode( code );
    }

    function extend( target, source, overwrite ) {

        for ( var key in source )

            if ( overwrite || !( key in target ) )

                target[ key ] = source[ key ];

        return target;
    }

    function proxy( method, context ) {

        return function() {

            method.apply( context, arguments );
        };
    }

    function clone( target ) {

        var object = {};

        for ( var key in target ) {

            if ( isFunction( target[ key ] ) )

                object[ key ] = proxy( target[ key ], target );

            else

                object[ key ] = target[ key ];
        }

        return object;
    }

    /*
    ----------------------------------------------------------------------

        Constructor

    ----------------------------------------------------------------------
    */

    function constructor( context ) {

        var request, handler, target, parent, bounds, index, suffix, clock, node, copy, type, key, val, min, max, w, h;

        var counter = 0;
        var touches = [];
        var resized = false;
        var setup = false;
        var ratio = win.devicePixelRatio;
        var isDiv = context.type == DOM;
        var is2D = context.type == CANVAS;

        var mouse = {
            x:  0.0, y:  0.0,
            ox: 0.0, oy: 0.0,
            dx: 0.0, dy: 0.0
        };

        var eventMap = [

            context.element,

                pointer, 'mousedown', 'touchstart',
                pointer, 'mousemove', 'touchmove',
                pointer, 'mouseup', 'touchend',
                pointer, 'click',
                pointer, 'mouseout',
                pointer, 'mouseover',

            doc,

                keypress, 'keydown', 'keyup',

            win,

                active, 'focus', 'blur',
                resize, 'resize'
        ];

        var keys = {}; for ( key in keyMap ) keys[ keyMap[ key ] ] = false;

        function trigger( method ) {

            if ( isFunction( method ) )

                method.apply( context, [].splice.call( arguments, 1 ) );
        }

        function bind( on ) {

            for ( index = 0; index < eventMap.length; index++ ) {

                node = eventMap[ index ];

                if ( isString( node ) )

                    target[ ( on ? 'add' : 'remove' ) + 'EventListener' ].call( target, node, handler, false );

                else if ( isFunction( node ) )

                    handler = node;

                else target = node;
            }
        }

        function update() {

            cAF( request );
            request = rAF( update );

            if ( !setup ) {

                trigger( context.setup );
                setup = isFunction( context.setup );
            }

            if ( !resized ) {
                trigger( context.resize );
                resized = isFunction( context.resize );
            }

            if ( context.running && !counter ) {

                context.dt = ( clock = +new Date() ) - context.now;
                context.millis += context.dt;
                context.now = clock;

                trigger( context.update );

                if ( context.autoclear && is2D )

                    context.clear();

                trigger( context.draw );
            }

            counter = ++counter % context.interval;
        }

        function resize() {

            target = isDiv ? context.style : context.canvas;
            suffix = isDiv ? 'px' : '';

            w = context.width;
            h = context.height;

            if ( context.fullscreen ) {

                h = context.height = win.innerHeight;
                w = context.width = win.innerWidth;
            }

            if ( context.retina && is2D && ratio ) {

                target.style.height = h + 'px';
                target.style.width = w + 'px';

                w *= ratio;
                h *= ratio;

                context.scale( ratio, ratio );
            }

            if ( target.height !== h )

                target.height = h + suffix;

            if ( target.width !== w )

                target.width = w + suffix;

            if ( setup ) trigger( context.resize );
        }

        function align( touch, target ) {

            bounds = target.getBoundingClientRect();

            touch.x = touch.pageX - bounds.left - (win.scrollX || win.pageXOffset);
            touch.y = touch.pageY - bounds.top - (win.scrollY || win.pageYOffset);

            return touch;
        }

        function augment( touch, target ) {

            align( touch, context.element );

            target = target || {};

            target.ox = target.x || touch.x;
            target.oy = target.y || touch.y;

            target.x = touch.x;
            target.y = touch.y;

            target.dx = target.x - target.ox;
            target.dy = target.y - target.oy;

            return target;
        }

        function process( event ) {

            event.preventDefault();

            copy = clone( event );
            copy.originalEvent = event;

            if ( copy.touches ) {

                touches.length = copy.touches.length;

                for ( index = 0; index < copy.touches.length; index++ )

                    touches[ index ] = augment( copy.touches[ index ], touches[ index ] );

            } else {

                touches.length = 0;
                touches[0] = augment( copy, mouse );
            }

            extend( mouse, touches[0], true );

            return copy;
        }

        function pointer( event ) {

            event = process( event );

            min = ( max = eventMap.indexOf( type = event.type ) ) - 1;

            context.dragging =

                /down|start/.test( type ) ? true :

                /up|end/.test( type ) ? false :

                context.dragging;

            while( min )

                isString( eventMap[ min ] ) ?

                    trigger( context[ eventMap[ min-- ] ], event ) :

                isString( eventMap[ max ] ) ?

                    trigger( context[ eventMap[ max++ ] ], event ) :

                min = 0;
        }

        function keypress( event ) {

            key = event.keyCode;
            val = event.type == 'keyup';
            keys[ key ] = keys[ keyName( key ) ] = !val;

            trigger( context[ event.type ], event );
        }

        function active( event ) {

            if ( context.autopause )

                ( event.type == 'blur' ? stop : start )();

            trigger( context[ event.type ], event );
        }

        // Public API

        function start() {

            context.now = +new Date();
            context.running = true;
        }

        function stop() {

            context.running = false;
        }

        function toggle() {

            ( context.running ? stop : start )();
        }

        function clear() {

            if ( is2D )

                context.clearRect( 0, 0, context.width, context.height );
        }

        function destroy() {

            parent = context.element.parentNode;
            index = instances.indexOf( context );

            if ( parent ) parent.removeChild( context.element );
            if ( ~index ) instances.splice( index, 1 );

            bind( false );
            stop();
        }

        extend( context, {

            touches: touches,
            mouse: mouse,
            keys: keys,

            dragging: false,
            running: false,
            millis: 0,
            now: NaN,
            dt: NaN,

            destroy: destroy,
            toggle: toggle,
            clear: clear,
            start: start,
            stop: stop
        });

        instances.push( context );

        return ( context.autostart && start(), bind( true ), resize(), update(), context );
    }

    /*
    ----------------------------------------------------------------------

        Global API

    ----------------------------------------------------------------------
    */

    var element, context, Sketch = {

        CANVAS: CANVAS,
        WEB_GL: WEBGL,
        WEBGL: WEBGL,
        DOM: DOM,

        instances: instances,

        install: function( context ) {

            if ( !context[ HAS_SKETCH ] ) {

                for ( var i = 0; i < MATH_PROPS.length; i++ )

                    context[ MATH_PROPS[i] ] = M[ MATH_PROPS[i] ];

                extend( context, {

                    TWO_PI: M.PI * 2,
                    HALF_PI: M.PI / 2,
                    QUATER_PI: M.PI / 4,

                    random: function( min, max ) {

                        if ( isArray( min ) )

                            return min[ ~~( M.random() * min.length ) ];

                        if ( !isNumber( max ) )

                            max = min || 1, min = 0;

                        return min + M.random() * ( max - min );
                    },

                    lerp: function( min, max, amount ) {

                        return min + amount * ( max - min );
                    },

                    map: function( num, minA, maxA, minB, maxB ) {

                        return ( num - minA ) / ( maxA - minA ) * ( maxB - minB ) + minB;
                    }
                });

                context[ HAS_SKETCH ] = true;
            }
        },

        create: function( options ) {

            options = extend( options || {}, defaults );

            if ( options.globals ) Sketch.install( self );

            element = options.element = options.element || doc.createElement( options.type === DOM ? 'div' : 'canvas' );

            context = options.context = options.context || (function() {

                switch( options.type ) {

                    case CANVAS:

                        return element.getContext( '2d', options );

                    case WEBGL:

                        return element.getContext( 'webgl', options ) || element.getContext( 'experimental-webgl', options );

                    case DOM:

                        return element.canvas = element;
                }

            })();

            ( options.container || doc.body ).appendChild( element );

            return Sketch.augment( context, options );
        },

        augment: function( context, options ) {

            options = extend( options || {}, defaults );

            options.element = context.canvas || context;
            options.element.className += ' sketch';

            extend( context, options, true );

            return constructor( context );
        }
    };

    /*
    ----------------------------------------------------------------------

        Shims

    ----------------------------------------------------------------------
    */

    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];
    var scope = self;
    var then = 0;

    var a = 'AnimationFrame';
    var b = 'request' + a;
    var c = 'cancel' + a;

    var rAF = scope[ b ];
    var cAF = scope[ c ];

    for ( var i = 0; i < vendors.length && !rAF; i++ ) {

        rAF = scope[ vendors[ i ] + 'Request' + a ];
        cAF = scope[ vendors[ i ] + 'Cancel' + a ];
    }

    scope[ b ] = rAF = rAF || function( callback ) {

        var now = +new Date();
        var dt = M.max( 0, 16 - ( now - then ) );
        var id = setTimeout( function() {
            callback( now + dt );
        }, dt );

        then = now + dt;
        return id;
    };

    scope[ c ] = cAF = cAF || function( id ) {
        clearTimeout( id );
    };

    /*
    ----------------------------------------------------------------------

        Output

    ----------------------------------------------------------------------
    */

    return Sketch;

}));

/**
 * @license
 *
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2010 David Aurelio. All Rights Reserved.
 * Copyright (C) 2010 uxebu Consulting Ltd. & Co. KG. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC., DAVID AURELIO, AND UXEBU
 * CONSULTING LTD. & CO. KG ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL APPLE INC. OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Represents a two-dimensional cubic bezier curve with the starting
 * point (0, 0) and the end point (1, 1). The two control points p1 and p2
 * have x and y coordinates between 0 and 1.
 *
 * This type of bezier curves can be used as CSS transform timing functions.
 */
function CubicBezier(p1x, p1y, p2x, p2y){
    if (!(p1x >= 0 && p1x <= 1)) {
        throw new RangeError("'p1x' must be a number between 0 and 1. "
                               + "Got " + p1x + "instead.");
    }
    if (!(p1y >= 0 && p1y <= 1)) {
        throw new RangeError("'p1y' must be a number between 0 and 1. "
                               + "Got " + p1y + "instead.");
    }
    if (!(p2x >= 0 && p2x <= 1)) {
        throw new RangeError("'p2x' must be a number between 0 and 1. "
                               + "Got " + p2x + "instead.");
    }
    if (!(p2y >= 0 && p2y <= 1)) {
        throw new RangeError("'p2y' must be a number between 0 and 1. "
                               + "Got " + p2y + "instead.");
    }

    // Control points
    this._p1 = { x: p1x, y: p1y };
    this._p2 = { x: p2x, y: p2y };
}

CubicBezier.prototype._getCoordinateForT = function(t, p1, p2){
    var c = 3 * p1,
        b = 3 * (p2 - p1) - c,
        a = 1 - c - b;

    return ((a * t + b) * t + c) * t;
};

CubicBezier.prototype._getCoordinateDerivateForT = function(t, p1, p2){
    var c = 3 * p1,
        b = 3 * (p2 - p1) - c,
        a = 1 - c - b;

    return (3 * a * t + 2 * b) * t + c;
};

CubicBezier.prototype._getTForCoordinate = function(c, p1, p2, epsilon){
    if (!isFinite(epsilon) || epsilon <= 0) {
        throw new RangeError("'epsilon' must be a number greater than 0.");
    }

    // First try a few iterations of Newton's method -- normally very fast.
    for (var t2 = c, i = 0, c2, d2; i < 8; i++) {
        c2 = this._getCoordinateForT(t2, p1, p2) - c;
        if (Math.abs(c2) < epsilon){
            return t2;
        }
        d2 = this._getCoordinateDerivateForT(t2, p1, p2);
        if (Math.abs(d2) < 1e-6){
            break;
        }
        t2 = t2 - c2 / d2;
    }

    // Fall back to the bisection method for reliability.
    t2 = c;
    var t0 = 0,
        t1 = 1,
        c2;

    if (t2 < t0){
        return t0;
    }
    if (t2 > t1){
        return t1;
    }

    while (t0 < t1) {
        c2 = this._getCoordinateForT(t2, p1, p2);
        if (Math.abs(c2 - c) < epsilon){
            return t2;
        }
        if (c > c2){
            t0 = t2;
        }
        else{
            t1 = t2;
        }
        t2 = (t1 - t0) * .5 + t0;
    }

    // Failure.
    return t2;
};

/**
 * Computes the point for a given t value.
 *
 * @param {number} t
 * @returns {Object} Returns an object with x and y properties
 */
CubicBezier.prototype.getPointForT = function(t) {
    // Special cases: starting and ending points
    if (t == 0 || t == 1) {
        return { x: t, y: t };
    }
    // check for correct t value (must be between 0 and 1)
    else if (!(t > 0) || !(t < 1)) {
        throw new RangeError("'t' must be a number between 0 and 1"
                             + "Got " + t + " instead.");
    }

    return {
        x: this._getCoordinateForT(t, this._p1.x, this._p2.x),
        y: this._getCoordinateForT(t, this._p1.y, this._p2.y)
    }
};

CubicBezier.prototype.getTforX = function(x, epsilon){
    return this._getTForCoordinate(x, this._p1.x, this._p2.x, epsilon);
};

CubicBezier.prototype.getTforY = function(y, epsilon){
    return this._getTForCoordinate(y, this._p1.y, this._p2.y, epsilon);
};

/**
 * Computes auxiliary points using De Casteljau's algorithm.
 *
 * @param {number} t must be greater than 0 and lower than 1.
 * @returns {Object} with members i0, i1, i2 (first iteration),
 *     j1, j2 (second iteration) and k (the exact point for t)
 */
CubicBezier.prototype._getAuxPoints = function(t){
    if (!(t > 0) || !(t < 1)) {
        throw new RangeError("'t' must be greater than 0 and lower than 1");
    }

    // First series of auxiliary points
    var i0 = { // first control point of the left curve
            x: t * this._p1.x,
            y: t * this._p1.y
        },
        i1 = {
            x: this._p1.x + t*(this._p2.x - this._p1.x),
            y: this._p1.y + t*(this._p2.y - this._p1.y)
        },
        i2  = { // second control point of the right curve
            x: this._p2.x + t*(1 - this._p2.x),
            y: this._p2.y + t*(1 - this._p2.y)
        };

    // Second series of auxiliary points
    var j0 = { // second control point of the left curve
            x: i0.x + t*(i1.x - i0.x),
            y: i0.y + t*(i1.y - i0.y)
        },
        j1 = { // first control point of the right curve
            x: i1.x + t*(i2.x - i1.x),
            y: i1.y + t*(i2.y - i1.y)
        };

    // The division point (ending point of left curve, starting point of right curve)
    var k = {
            x: j0.x + t*(j1.x - j0.x),
            y: j0.y + t*(j1.y - j0.y)
        };

    return {
        i0: i0,
        i1: i1,
        i2: i2,
        j0: j0,
        j1: j1,
        k: k
    }
};

/**
 * Divides the bezier curve into two bezier functions.
 *
 * De Casteljau's algorithm is used to compute the new starting, ending, and
 * control points.
 *
 * @param {number} t must be greater than 0 and lower than 1.
 *     t == 1 or t == 0 are the starting/ending points of the curve, so no
 *     division is needed.
 *
 * @returns {CubicBezier[]} Returns an array containing two bezier curves
 *     to the left and the right of t.
 */
CubicBezier.prototype.divideAtT = function(t){
    if (t < 0 || t > 1) {
        throw new RangeError("'t' must be a number between 0 and 1. "
                             + "Got " + t + " instead.");
    }

    // Special cases t = 0, t = 1: Curve can be cloned for one side, the other
    // side is a linear curve (with duration 0)
    if (t === 0 || t === 1){
        var curves = [];
        curves[t] = CubicBezier.linear();
        curves[1-t] = this.clone();
        return curves;
    }

    var left = {},
        right = {},
        points = this._getAuxPoints(t);

    var i0 = points.i0,
        i1 = points.i1,
        i2 = points.i2,
        j0 = points.j0,
        j1 = points.j1,
        k = points.k;

    // Normalize derived points, so that the new curves starting/ending point
    // coordinates are (0, 0) respectively (1, 1)
    var factorX = k.x,
        factorY = k.y;

    left.p1 = {
        x: i0.x / factorX,
        y: i0.y / factorY
    };
    left.p2 = {
        x: j0.x / factorX,
        y: j0.y / factorY
    };

    right.p1 = {
        x: (j1.x - factorX) / (1 - factorX),
        y: (j1.y - factorY) / (1 - factorY)
    };

    right.p2 = {
        x: (i2.x - factorX) / (1 - factorX),
        y: (i2.y - factorY) / (1 - factorY)
    };

    return [
        new CubicBezier(left.p1.x, left.p1.y, left.p2.x, left.p2.y),
        new CubicBezier(right.p1.x, right.p1.y, right.p2.x, right.p2.y)
    ];
};

CubicBezier.prototype.divideAtX = function(x, epsilon) {
    if (x < 0 || x > 1) {
        throw new RangeError("'x' must be a number between 0 and 1. "
                             + "Got " + x + " instead.");
    }

    var t = this.getTforX(x, epsilon);
    return this.divideAtT(t);
};

CubicBezier.prototype.divideAtY = function(y, epsilon) {
    if (y < 0 || y > 1) {
        throw new RangeError("'y' must be a number between 0 and 1. "
                             + "Got " + y + " instead.");
    }

    var t = this.getTforY(y, epsilon);
    return this.divideAtT(t);
};

CubicBezier.prototype.clone = function() {
    return new CubicBezier(this._p1.x, this._p1.y, this._p2.x, this._p2.y);
};

CubicBezier.prototype.toString = function(){
    return "cubic-bezier(" + [
        this._p1.x,
        this._p1.y,
        this._p2.x,
        this._p2.y
    ].join(", ") + ")";
};

CubicBezier.linear = function(){
    return new CubicBezier
};

CubicBezier.ease = function(){
    return new CubicBezier(0.25, 0.1, 0.25, 1.0);
};
CubicBezier.linear = function(){
    return new CubicBezier(0.0, 0.0, 1.0, 1.0);
};
CubicBezier.easeIn = function(){
    return new CubicBezier(0.42, 0, 1.0, 1.0);
};
CubicBezier.easeOut = function(){
    return new CubicBezier(0, 0, 0.58, 1.0);
};
CubicBezier.easeInOut = function(){
    return new CubicBezier(0.42, 0, 0.58, 1.0);
};

/*
 * Virgin Pulse Achievement Effect
 *********************************/

(function($, Sketch, CubicBezier) {

  Sketch.install(window);

  /*
   * Animation Controller
   **********************/

  function CardAnim(opts, $el) {

    $.extend(this.opts, opts)

    // jQuery element setup

    this.$el = $el

    if(this.$el.css('z-index') == 'auto') {
      this.$el.css('z-index', '1')
    }

    this.$content = this.$el.find(this.opts.content)

    if(this.$content.css('z-index') == 'auto') {
      this.$content.css('z-index', '1')
    }

    this.$wrapper = $('<div></div>')
      .addClass(this.opts.wrapperClass)
      .css(this.opts.wrapperStyles)
      .insertAfter(this.$content)

    // Sketch.js settings

    this.container = this.$wrapper[0]
    this.autostart = false
    this.fullscreen = false
    this.width = this.$wrapper.width()
    this.height = this.$wrapper.height()

    this.started = false

    this.getDimensions()

    this.callback = this.opts.callback.bind(this.$el)
    this.timing = new CubicBezier.ease()

  }

  CardAnim.prototype = {

    opts: {
      // Bubble color
      color: '#FC8D25',
      // Card content selector (within element)
      content: '.content',
      // CSS class for animation wrapper element (appended after content)
      wrapperClass: 'animation-layer',
      // CSS styles to apply to animation wrapper
      wrapperStyles: {
        'position': 'absolute',
        'top': '-100px',
        'bottom': '-100px',
        'left': '-100px',
        'right': '-100px',
        'z-index': '0'
      },
      // Speed of individual particle animation (ms)
      particleSpeed: 1200,
      // Number of particles
      particleCount: 100,
      // Do something after the animation finishes
      callback: function() {}
    },

    // Object pool

    particles: [],

    getDimensions: function() {

      // Position at card center

      this.x = this.$content.width() / 2
      this.y = this.$content.height() / 2

      // Trigonometry for placing particles along the card's edge

      this.h = sqrt((this.x * this.x) + (this.y * this.y))
      this.cornerAngle = asin(this.x / this.h) * 180 / PI

    },

    // Add particles to object pool

    addParticles: function(n) {

      n = n || this.opts.particleCount

      for(var i = 0; i < n; i++) {
        this.particles.push(new Particle(this))
      }

    },

    update: function() {
      var living = 0

      for(var i = this.particles.length - 1; i >= 0; i--) {
        var particle = this.particles[i]

        if(particle.dead) {
          continue
        }

        if(particle.delay > 0) {
          particle.delay -= this.dt
        } else {
          particle.delay = 0
          particle.move()
        }

        living++
      }

      if(this.started && living == 0) {
        this.stop()
        this.started = false
        this.callback()
      }
    },

    draw: function() {
      for (var i = this.particles.length - 1; i >= 0; i--) {
        if(!this.particles[i].dead) {
          this.particles[i].draw(this)
        }
      }
    },

    reset: function() {
      if(this.particles.length > 0) {
        for(var i = this.particles.length - 1; i >= 0; i--) {
          this.particles[i].reset()
        }
      } else {
        this.addParticles(this.opts.particleCount)
      }
    }

  }

  /*
   * Particles
   ************/

  function Particle(card) {

    this.card = card

    this.x = card.width / 2
    this.y = card.height / 2

    this.life = this.card.opts.particleSpeed

    this.reset()

  }

  Particle.prototype = {

    reset: function() {

      // Generate randomized values

      this.radius = random(15, this.card.y / 2)
      this.opacity = random(.25, .75)
      this.scale = random(-0.5, 0.125)

      this.theta = random(90)

      // Calculate starting distance along the edge
      if(this.theta > this.card.cornerAngle) {
        var angle = 90 - this.theta
        this.distance = this.card.x / cos(angle * PI / 180)
      } else {
        this.distance = this.card.y / cos(this.theta * PI / 180)
      }

      // Move back towards the center
      this.distance -= this.radius * 2 + 10

      this.theta = (this.theta + (round(random()) * 180)) * (1 - (round(random()) * 2))


      // Initialize movement variables
      this.goal = random(this.radius, 100)
      this.delay = random(1000)

      this.traveled = 0
      this.direction = random(-45,45)

      this.death = 0
      this.dead = false

    },

    move: function() {
      this.traveled = this.card.timing.getPointForT(this.death / this.life).y * this.goal

      this.death += this.card.dt
      
      if(this.death >= this.life) {

        this.dead = true

      }
    },

    draw: function(ctx) {

      var elapsed = this.death / this.life

      if(elapsed > 0.5) {
        ctx.globalAlpha = this.opacity * (1 - ((elapsed - 0.5) / 0.5))
      } else {
        ctx.globalAlpha = this.opacity
      }

      ctx.save()

      ctx.translate(this.x, this.y)
      ctx.rotate(this.theta * PI / 180)
      ctx.translate(0, this.distance)
      ctx.rotate(this.direction * PI / 180)
      ctx.translate(0, this.traveled)

      ctx.beginPath()
      ctx.arc(0, 0, abs(this.radius * (1 + (this.scale * elapsed))), 0, TWO_PI)
      ctx.fillStyle = this.card.opts.color
      ctx.fill()

      ctx.restore()
    }

  }

  /*
   * jQuery methods
   *****************/

  $.fn.initCardAnim = function(opts) {

    var animation = Sketch.create(new CardAnim(opts, this))
    this.data('CardAnim', animation)

    return this

  }

  $.fn.triggerCardAnim = function() {

    var animation = this.data('CardAnim')

    if(!animation.started) {
      animation.reset()
      animation.started = true
      animation.start()
    }

    return this

  }

  return $
  
})(jQuery, Sketch, CubicBezier)