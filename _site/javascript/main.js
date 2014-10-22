$(function() {

        // Initialize card animation
        // (Default options shown)

        $('#CardOne').initCardAnim({
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
        });

        // Trigger animation on click
        $('#CardOne').on('click', function() {
          $(this).triggerCardAnim();
        });

      });