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