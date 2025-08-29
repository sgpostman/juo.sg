// SCRIPT V 1.013
gsap.registerPlugin(ScrollTrigger, SplitText);

// Global variable to hold SplitText instances and split state
const splitTextData = {
  instances: [], // An array for storing SplitText instances
  elements: new Map() // Map to keep track of which elements are already broken
};

// SWUP.JS
// Global object to track loaded scripts
const loadedScripts = {};

// Function to dynamically load a script if it hasn't been loaded yet
function loadScript(src, position = 'head', async = false, scriptId = null) {
  // If scriptId is provided and the script is already loaded, skip loading
  if (scriptId && loadedScripts[scriptId]) {
    return;
  }

  // Check if the script already exists in the DOM
  if (scriptId && document.querySelector(`script[data-script-id="${scriptId}"]`)) {
    loadedScripts[scriptId] = true;
    return;
  }

  const script = document.createElement('script');
  script.src = src;
  if (async) script.async = true;
  if (scriptId) script.setAttribute('data-script-id', scriptId);

  if (position === 'head') {
    document.head.appendChild(script);
  } else if (position === 'after-body') {
    document.body.appendChild(script);
  }

  // Mark the script as loaded
  if (scriptId) {
    loadedScripts[scriptId] = true;
  }
}

// Function to load scripts based on the current page URL
function loadScriptsForPage(url) {
  // Normalize URL to remove query parameters or hash
  const path = url.split('?')[0].split('#')[0];

  // Scripts for Home (/) and /portfolio (load after </body>)
  /*if (path === '/' || path === '/portfolio') {
    loadScript('https://www.youtube.com/iframe_api', 'after-body', false, 'youtube-iframe-api');
    loadScript('https://player.vimeo.com/api/player.js', 'after-body', false, 'vimeo-player');
  }*/

  // Scripts for /portfolio and /blog (load in <head>)
  if (path === '/portfolio' || path === '/blog') {
    loadScript('https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsfilter@1/cmsfilter.js', 'head',
      true, 'finsweet-cmsfilter');
  }

  // Script for /contact (load in <head>)
  if (path === '/contact') {
    loadScript('https://assets.calendly.com/assets/external/widget.js', 'head', true,
      'calendly-widget');
  }
}

// Function to initialize scripts after page load or transition
function initScriptsForPage(url) {
  // Normalize URL to remove query parameters or hash
  const path = url.split('?')[0].split('#')[0];

  // Initialize YouTube and Vimeo players for Home (/) and /portfolio
  if (path === '/' || path === '/portfolio') {
    // YouTube IFrame API
    if (window.YT && window.YT.Player) {
      // Find all YouTube iframes and initialize players
      document.querySelectorAll('iframe[src*="youtube.com"]').forEach(iframe => {
        new YT.Player(iframe, {
          events: {
            onReady: (event) => {
              // Optional: Add logic for YouTube player readiness
            }
          }
        });
      });
    }

    // Vimeo Player API
    if (window.Vimeo && window.Vimeo.Player) {
      // Find all Vimeo iframes and initialize players
      document.querySelectorAll('iframe[src*="vimeo.com"]').forEach(iframe => {
        new Vimeo.Player(iframe);
      });
    }
  }

  // Initialize Finsweet CMS Filter for /portfolio and /blog
  if (path === '/portfolio' || path === '/blog') {
    if (window.fsAttributes && window.fsAttributes.cmsfilter) {
      window.fsAttributes.cmsfilter.init();
    }
  }

  // Initialize Calendly for /contact
  if (path === '/contact') {
    // Wait for Calendly script to load before initializing
    const initCalendlyWithRetry = (attempts = 10, delay = 500) => {
      if (attempts <= 0) {
        console.error('Failed to initialize Calendly: Script did not load in time.');
        return;
      }

      if (window.Calendly) {
        // Check for Calendly inline widgets in the DOM
        const calendlyWidgets = document.querySelectorAll('[data-calendly]');
        if (calendlyWidgets.length) {
          // If initInlineWidgets is available, use it; otherwise, assume auto-initialization
          if (typeof window.Calendly.initInlineWidgets === 'function') {
            window.Calendly.initInlineWidgets();
          } else {
            console.log(
              'Calendly auto-initializes widgets. Ensure data-calendly attributes are set correctly.'
            );
          }
        }
      } else {
        // Retry after delay if Calendly is not yet loaded
        setTimeout(() => initCalendlyWithRetry(attempts - 1, delay), delay);
      }
    };

    // Start the retry process
    initCalendlyWithRetry();
  }
}

function SwupJS() {
  const swup = new Swup({
    containers: ['.page-container'],
    animationSelector: false
  });

  let nextPageUrl = null;

  swup.hooks.on('visit:start', (visit) => {
    if (visit.to && visit.to.url) {
      nextPageUrl = visit.to.url;
    }
    if (lenis) {
      lenis.stop();
    }

    /*// Show loading screen during page transition
    const loadingScreen = document.querySelector('.loading-screen-block');
    if (loadingScreen) {
      gsap.set(loadingScreen, { display: 'block' }); // Show the loading screen
    }*/
  });

  swup.hooks.on('animation:out:start', (visit, args, defaultHandler) => {
    return new Promise((resolve) => {
      gsap.to('.page-container', {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => resolve()
      });
    });
  });

  swup.hooks.on('content:replace', () => {
    const newPageContainer = document.querySelector('.page-container');
    gsap.set(newPageContainer, { opacity: 0 }); // Initially set container to invisible

    if (nextPageUrl) {
      webflowReinit(nextPageUrl);
    }
  });

  function webflowReinit(url) {
    if (!url) return;

    fetch(url)
      .then(response => response.text())
      .then(htmlContent => {
        let parser = new DOMParser();
        let dom = parser.parseFromString(htmlContent, 'text/html');
        let webflowPageId = dom.querySelector('html').getAttribute('data-wf-page');

        if (webflowPageId) {
          document.documentElement.setAttribute('data-wf-page', webflowPageId);
        }

        setTimeout(() => {
          if (window.Webflow) {
            window.Webflow.destroy();
            window.Webflow.ready();
            if (window.Webflow.require && window.Webflow.require('ix2')) {
              window.Webflow.require('ix2').init();
            }
          }

          if (window.ScrollTrigger) {
            ScrollTrigger.refresh();
          }

          if (lenis) {
            lenis.destroy();
          }

          Smooth();
          loadScriptsForPage(url);
          initScriptsForPage(url);

          setTimeout(() => {
            const newPageContainer = document.querySelector('.page-container');
            gsap.set(newPageContainer, { opacity: 1 }); // Make container visible
            if (lenis) {
              lenis.start();
            }

            // Hide loading screen and start animations after everything is ready
            hideLoadingScreen();
          }, 100);
        }, 100);
      });
  }

  // Load and initialize scripts for the initial page load
  loadScriptsForPage(window.location.pathname);
  initScriptsForPage(window.location.pathname);
} // SWUP.JS

// SMOOTH
// Declare lenis globally
let lenis;

function Smooth() {
  // Destroy previous Lenis instance if it exists
  if (lenis) {
    lenis.destroy();
  }

  // Initialize Lenis with your original settings
  lenis = new Lenis({
    duration: 0.5,
    smoothTouch: false
  });

  // Attach ScrollTrigger update
  lenis.on('scroll', ScrollTrigger.update);

  // Attach GSAP ticker for Lenis RAF
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  // Ensure lag smoothing is disabled
  gsap.ticker.lagSmoothing(0);

  // Remove previous keydown event listeners to prevent duplication
  $(document).off('keydown.lenis');

  // Handle keyboard scrolling with Arrow Up and Arrow Down
  $(document).on('keydown.lenis', function (event) {
    // Define the scroll step (in pixels)
    const scrollStep = 300; // You can adjust this value
    const currentScroll = lenis.actualScroll; // Current scroll position

    // Arrow Down
    if (event.key === 'ArrowDown') {
      event.preventDefault(); // Prevent default browser scrolling
      lenis.scrollTo(currentScroll + scrollStep, {
        duration: 1, // Smooth scroll duration
        easing: (t) => 1 - Math.pow(1 - t, 2.5) // Custom easing (cubic ease-out)
      });
    }

    // Arrow Up
    if (event.key === 'ArrowUp') {
      event.preventDefault(); // Prevent default browser scrolling
      lenis.scrollTo(currentScroll - scrollStep, {
        duration: 1, // Smooth scroll duration
        easing: (t) => 1 - Math.pow(1 - t, 2.5) // Custom easing (cubic ease-out)
      });
    }
  });
} // SMOOTH

// Arrays to store timelines for each animation type
let headingIntoViewTimelines = [];
let textIntoViewTimelines = [];
let buttonIntoViewTimelines = [];
let dropdownArrowTimelines = [];
let separatorLineTimelines = [];
let footerTimelines = [];
let lightboxTimelines = [];
let mediaFormTimelines = [];
let socialIconsTimelines = [];

function IntoView() {
  // Media query handling with GSAP matchMedia
  const mm = gsap.matchMedia();

  // HEADING INTO VIEW
  let headingIntoView = $('.text-block .heading').not(
    '.section.hero .heading, .section.footer .heading, .cta-block .heading, .menu-overlay-block .heading'
  );

  if (headingIntoView.length) {
    gsap.utils.toArray(headingIntoView).forEach(function (elem) {
      const innerSplit = new SplitText(elem, {
        type: 'lines',
        linesClass: 'text-line'
      });
      const outerSplit = new SplitText(elem, {
        type: 'lines',
        linesClass: 'text-mask'
      });

      // Set initial state (hide lines)
      gsap.set(innerSplit.lines, {
        y: '150%',
        willChange: 'transform'
      });
      gsap.set(outerSplit.lines, {
        overflow: 'hidden',
        display: 'block'
      });

      // Create paused timeline without auto-triggering
      const splitTimeline = gsap.timeline({
        paused: true,
        onComplete: () => {
          outerSplit.revert();
          innerSplit.revert();
        }
      });

      splitTimeline.to(innerSplit.lines, {
        duration: 0.8,
        y: 0,
        ease: 'Power4.easeOut',
        stagger: 0.12
      });

      // Create ScrollTrigger to track visibility
      const scrollTrigger = ScrollTrigger.create({
        trigger: elem,
        scrub: false,
        start: 'top 90%',
        end: 'bottom 0%',
      });

      headingIntoViewTimelines.push({
        timeline: splitTimeline,
        scrollTrigger: scrollTrigger,
        element: elem
      });
    });
  }

  // TEXT INTO VIEW
  let textIntoView = $('.text-block .text, .text.w-richtext p').not(
    '.text.w-richtext, .section.hero .text, .section.hero .text.w-richtext p, .section.footer .text, .cta-block .text, .button-block .text, .form-wrapper .text, .menu-overlay-block .text'
  );

  if (textIntoView.length) {
    gsap.utils.toArray(textIntoView).forEach(function (elem) {
      // Fixing empty rows manually
      elem.innerHTML = elem.innerHTML.replace(/<br><br>/g,
        "<br><div class='empty-line'> </div><br>");

      const innerSplit = new SplitText(elem, {
        type: 'lines',
        linesClass: 'text-line'
      });
      const outerSplit = new SplitText(elem, {
        type: 'lines',
        linesClass: 'text-mask'
      });

      // Set initial state (hide lines)
      gsap.set(innerSplit.lines, {
        y: '150%',
        willChange: 'transform'
      });
      gsap.set(outerSplit.lines, {
        overflow: 'hidden',
        display: 'block'
      });

      // Create paused timeline
      const splitTimeline = gsap.timeline({
        paused: true,
        onComplete: () => {
          outerSplit.revert();
          innerSplit.revert();
          // Deleting empty lines
          elem.querySelectorAll('.empty-line').forEach(line => line.remove());
        }
      });

      splitTimeline.to(innerSplit.lines, {
        duration: 0.8,
        y: 0,
        ease: 'Power4.easeOut',
        stagger: 0.12
      });

      // Create ScrollTrigger to track visibility
      const scrollTrigger = ScrollTrigger.create({
        trigger: elem,
        scrub: false,
        start: 'top 90%',
        end: 'bottom 0%',
      });

      textIntoViewTimelines.push({
        timeline: splitTimeline,
        scrollTrigger: scrollTrigger,
        element: elem
      });
    });
  }

  // BUTTON INTO VIEW
  let buttonIntoView = $('.button-block').not(
    '.section.hero .button-block, .navbar-block .button-block, .cta-block .button-block, .section.footer .button-block, .back-to-top-wrapper .button-block'
  );

  if (buttonIntoView.length) {
    gsap.utils.toArray(buttonIntoView).forEach((elem) => {
      const buttonText = elem.querySelector('.text');
      const buttonLineContainer = elem.querySelector('.button-line-container');
      const arrowMask = elem.querySelector('.arrow-mask');

      let textLine = null; // Variable for text-line

      // Set initial state for elements
      if (buttonText) {
        // Create text-mask wrapper
        const textMask = document.createElement('div');
        textMask.className = 'text-mask';

        // Create text-line wrapper
        textLine = document.createElement('div');
        textLine.className = 'text-line';

        // Move buttonText content into textLine
        while (buttonText.firstChild) {
          textLine.appendChild(buttonText.firstChild);
        }
        // Add textLine to textMask, and textMask to buttonText
        textMask.appendChild(textLine);
        buttonText.appendChild(textMask);

        // Set initial state for textLine
        gsap.set(textLine, {
          y: '150%',
          willChange: 'transform'
        });
      }
      if (buttonLineContainer) {
        gsap.set(buttonLineContainer, { scaleX: 0, transformOrigin: 'left' });
      }
      if (arrowMask) {
        gsap.set(arrowMask, { scale: 0, transformOrigin: '0% 100%' });
      }

      // Create paused timeline
      const tl = gsap.timeline({
        paused: true
      });

      if (textLine) {
        tl.to(textLine, {
          duration: 0.8,
          y: 0,
          ease: 'Power4.easeOut',
          stagger: 0.12,
        }, 0);
      }

      if (buttonLineContainer) {
        tl.to(buttonLineContainer, {
          duration: 0.7,
          scaleX: 1,
          ease: 'Power3.easeOut',
        }, 0.15);
      }

      if (arrowMask) {
        tl.to(arrowMask, {
          duration: 0.7,
          scale: 1,
          ease: 'Power4.easeOut',
        }, 0.15);
      }

      // Create ScrollTrigger to track visibility
      const scrollTrigger = ScrollTrigger.create({
        trigger: elem,
        scrub: false,
        start: 'top 90%',
        end: 'bottom 0%',
      });

      buttonIntoViewTimelines.push({
        timeline: tl,
        scrollTrigger: scrollTrigger,
        element: elem
      });
    });
  }

  // ARROWS.02
  gsap.set('.vector.arrow._02', { display: 'flex', width: '0%', height: '0%' });

  // FOOTER ANIMATION ON SCROLL
  let footerSection = $('.section.footer');

  if (footerSection.length) {
    gsap.utils.toArray(footerSection).forEach(function (elem) {
      // Select all text elements to animate
      let footerText = $(elem).find('.text, .button-text .text, .text._14px');
      let footerSocialIcons = $(elem).find('.vector.social');
      let footerButtonBlocks = $(elem).find('.button-block');

      // Split text into lines using SplitText
      let footerTextSpitted = false;

      function splitFooterText() {
        gsap.utils.toArray(footerText).forEach(function (textElem) {
          textElem.innerHTML = textElem.innerHTML.replace(/<br><br>/g,
            "<br><div class='empty-line'> </div><br>");

          const innerSplit = new SplitText(textElem, {
            type: 'lines',
            linesClass: 'text-line'
          });
          const outerSplit = new SplitText(textElem, {
            type: 'lines',
            linesClass: 'text-mask'
          });

          gsap.set(innerSplit.lines, {
            y: '150%',
            willChange: 'transform'
          });
          gsap.set(outerSplit.lines, {
            overflow: 'hidden',
            display: 'block'
          });
        });
        footerTextSpitted = true;
      }

      // Initial setup for social icons and button lines
      gsap.set(footerSocialIcons, { opacity: 0, scale: 0.5 });
      gsap.set(footerButtonBlocks.find('.button-line-container'), {
        scaleX: 0,
        transformOrigin: 'left'
      });

      // Split text if not already done
      if (!footerTextSpitted) {
        splitFooterText();
      }

      // Create paused timeline
      const tl = gsap.timeline({
        paused: true
      });

      tl.to($(elem).find('.text-line'), {
          duration: 0.8,
          y: 0,
          ease: 'Power4.easeOut',
          stagger: 0.1
        }, 0)
        .to(footerButtonBlocks.find('.button-line-container'), {
          duration: 0.5,
          scaleX: 1,
          ease: 'Power3.easeOut',
          stagger: 0.1
        }, 0.2)
        .to(footerSocialIcons, {
          duration: 0.5,
          opacity: 1,
          scale: 1,
          ease: 'Power2.easeOut',
          stagger: 0.05
        }, 0.3);

      // Create ScrollTrigger to track visibility
      const scrollTrigger = ScrollTrigger.create({
        trigger: elem,
        start: 'top 90%'
      });

      footerTimelines.push({ timeline: tl, scrollTrigger: scrollTrigger, element: elem });
    });
  }

  /* DROPDOWN ARROWS INTO VIEW */
  const dropdownArrowBlock = $('.dropdown-arrow-block');

  gsap.utils.toArray(dropdownArrowBlock).forEach((elem) => {
    const dropdownArrowMask = $('.arrow-mask', elem);

    // Set initial state
    gsap.set(dropdownArrowMask, { scale: 0, transformOrigin: '100% 100%' });

    // Create paused timeline
    const tl = gsap.timeline({
      paused: true
    });

    tl.to(dropdownArrowMask, {
      duration: 0.8,
      scale: 1,
      ease: 'Power4.easeOut',
    }, 0);

    // Create ScrollTrigger to track visibility
    const scrollTrigger = ScrollTrigger.create({
      trigger: elem,
      scrub: false,
      start: 'top 90%',
      end: 'bottom 0%'
    });

    dropdownArrowTimelines.push({ timeline: tl, scrollTrigger: scrollTrigger, element: elem });
  });

  // SEPARATOR LINES INTO VIEW
  let separatorLine = $('.separator-line').not(
    '.section.hero .separator-line, .navbar-block .separator-line');

  if (separatorLine.length) {
    gsap.utils.toArray(separatorLine).forEach(function (elem) {
      // Set initial state
      gsap.set(elem, { width: '0%' });

      // Create paused timeline
      const tl = gsap.timeline({
        paused: true
      });

      tl.to(elem, {
        duration: 1.2,
        width: '100%',
        ease: 'power4'
      });

      // Create ScrollTrigger to track visibility
      const scrollTrigger = ScrollTrigger.create({
        trigger: elem,
        scrub: false,
        start: 'top 90%',
        end: 'bottom 0%',
      });

      separatorLineTimelines.push({
        timeline: tl,
        scrollTrigger: scrollTrigger,
        element: elem
      });
    });
  }

  // FOOTER INTO VIEW
  if (footerSection.length) {
    gsap.utils.toArray(footerSection).forEach(function (elem) {
      // Select all text elements to animate
      let footerText = $(elem).find('.text, .button-text .text, .text._14px');
      let footerSocialIcons = $(elem).find('.vector.social');
      let footerButtonBlocks = $(elem).find('.button-block');

      // Split text into lines using SplitText
      let footerTextSpitted = false;

      function splitFooterText() {
        gsap.utils.toArray(footerText).forEach(function (textElem) {
          textElem.innerHTML = textElem.innerHTML.replace(/<br><br>/g,
            "<br><div class='empty-line'> </div><br>");

          const innerSplit = new SplitText(textElem, {
            type: 'lines',
            linesClass: 'text-line'
          });
          const outerSplit = new SplitText(textElem, {
            type: 'lines',
            linesClass: 'text-mask'
          });

          gsap.set(innerSplit.lines, {
            y: '150%',
            willChange: 'transform'
          });
          gsap.set(outerSplit.lines, {
            overflow: 'hidden',
            display: 'block'
          });
        });
        footerTextSpitted = true;
      }

      // Initial setup for social icons and button lines
      gsap.set(footerSocialIcons, { opacity: 0, scale: 0.5 });
      gsap.set(footerButtonBlocks.find('.button-line-container'), {
        scaleX: 0,
        transformOrigin: 'left'
      });

      // Split text if not already done
      if (!footerTextSpitted) {
        splitFooterText();
      }

      // Create paused timeline
      const tl = gsap.timeline({
        paused: true
      });

      // Animate non-button text (address and "Social links:")
      let nonButtonTextLines = $(elem).find('.text-line').not(footerButtonBlocks.find(
        '.text-line'));
      tl.to(nonButtonTextLines, {
        duration: 0.8,
        y: 0,
        ease: 'Power4.easeOut',
        stagger: 0.1
      }, 0);

      // Animate button text and lines together
      footerButtonBlocks.each(function (index) {
        const buttonTextLine = $(this).find('.text-line');
        const buttonLineContainer = $(this).find('.button-line-container');

        tl.to(buttonTextLine, {
            duration: 0.8,
            y: 0,
            ease: 'Power4.easeOut'
          }, 0.3 + index * 0.1)
          .to(buttonLineContainer, {
            duration: 0.5,
            scaleX: 1,
            ease: 'Power3.easeOut'
          }, 0.3 + index * 0.1 + 0.2);
      });

      // Animate social icons
      tl.to(footerSocialIcons, {
        duration: 0.5,
        opacity: 1,
        scale: 1,
        ease: 'Power2.easeOut',
        stagger: 0.05
      }, 1.0);

      // Create ScrollTrigger to track visibility
      const scrollTrigger = ScrollTrigger.create({
        trigger: elem,
        start: 'top 90%'
      });

      footerTimelines.push({ timeline: tl, scrollTrigger: scrollTrigger, element: elem });
    });
  }

  // LIGHTBOX INTO VIEW
  const lightboxWrapper = $('.showreel-lightbox-wrapper').not(
    '.menu-overlay-block .showreel-lightbox-wrapper'
  );;

  if (lightboxWrapper.length) {
    gsap.utils.toArray(lightboxWrapper).forEach(function (elem) {
      const lightboxBlock = $(elem).find('.showreel-lightbox-block');
      const playButton = $(elem).find('.play-button');
      const lightboxText = $(elem).find('.text');
      const innerLightboxText = $(elem).find('.showreel-lightbox-block .text');

      let lightboxTextSpitted = false;

      function splitLightboxText() {
        gsap.utils.toArray(lightboxText).forEach(function (textElem) {
          textElem.innerHTML = textElem.innerHTML.replace(/<br><br>/g,
            "<br><div class='empty-line'> </div><br>");

          const innerSplit = new SplitText(textElem, {
            type: 'lines',
            linesClass: 'text-line'
          });
          const outerSplit = new SplitText(textElem, {
            type: 'lines',
            linesClass: 'text-mask'
          });

          gsap.set(innerSplit.lines, {
            y: '150%',
            willChange: 'transform'
          });
          gsap.set(outerSplit.lines, {
            overflow: 'hidden',
            display: 'block'
          });
        });

        gsap.utils.toArray(innerLightboxText).forEach(function (textElem) {
          textElem.innerHTML = textElem.innerHTML.replace(/<br><br>/g,
            "<br><div class='empty-line'> </ div><br>");

          const innerSplit = new SplitText(textElem, {
            type: 'lines',
            linesClass: 'text-line'
          });
          const outerSplit = new SplitText(textElem, {
            type: 'lines',
            linesClass: 'text-mask'
          });

          gsap.set(innerSplit.lines, {
            y: '150%',
            willChange: 'transform'
          });
          gsap.set(outerSplit.lines, {
            overflow: 'hidden',
            display: 'block'
          });
        });

        lightboxTextSpitted = true;
      }

      gsap.set(lightboxBlock, { opacity: 0, y: '10%' });
      gsap.set(playButton, { scale: 0.5 });

      if (!lightboxTextSpitted) {
        splitLightboxText();
      }

      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          lightboxText.each(function () {
            $(this).find('.empty-line').remove();
          });
          innerLightboxText.each(function () {
            $(this).find('.empty-line').remove();
          });
        }
      });

      tl.to(lightboxBlock, { duration: 0.8, opacity: 1, y: 0, ease: 'Power2.easeOut' }, 0)
        .to(playButton, { duration: 0.8, scale: 1, ease: 'Power2.easeOut' }, 0)
        .to($(elem).find('.text-line'), {
          duration: 0.8,
          y: 0,
          ease: 'Power4.easeOut',
          stagger: 0.12
        }, 0.2);

      const scrollTrigger = ScrollTrigger.create({
        trigger: elem,
        scrub: false,
        start: 'top 90%',
        end: 'bottom 0%'
      });

      lightboxTimelines.push({ timeline: tl, scrollTrigger: scrollTrigger, element: elem });
    });
  }

  // MEDIA AND FORM BLOCKS INTO VIEW
  // Select only .image-block .image and .video-block elements for animation
  const mediaBlocks = $('.image-block .image, .video-block');

  // Check if there are any elements to animate
  if (mediaBlocks.length) {
    // Array to store timelines for delayed playback
    const mediaFormTimelines = [];

    // Loop through each element to set up the animation
    gsap.utils.toArray(mediaBlocks).forEach(function (elem) {
      // Cache the jQuery element for reuse
      const $elem = $(elem);
      // Get the dimensions of the element for SVG sizing
      const width = $elem.width();
      const height = $elem.height();

      // Define SVG namespace for creating SVG elements
      const svgNS = "http://www.w3.org/2000/svg";
      // Create an SVG wrapper for the mask
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);
      svg.style.position = "absolute";
      svg.style.top = "0";
      svg.style.left = "0";

      // Create a mask element for the SVG
      const mask = document.createElementNS(svgNS, "mask");
      // Generate a unique ID for the mask to avoid conflicts
      mask.setAttribute("id", "reveal-mask-" + Math.random().toString(36).substr(2, 9));
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("width", width);
      rect.setAttribute("height", height);
      rect.setAttribute("fill", "white");

      // Create a path for the animation (a rectangle that follows the element's perimeter)
      const path = document.createElementNS(svgNS, "path");
      // Define the path as a rectangle that matches the element's dimensions
      const pathD = `M0,0 H${width} V${height} H0 V0 Z`;
      path.setAttribute("d", pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "black");
      path.setAttribute("stroke-width", "2");

      // Append the rectangle and path to the mask
      mask.appendChild(rect);
      mask.appendChild(path);
      // Append the mask to the SVG
      svg.appendChild(mask);

      // Create a wrapper div to position the SVG and element
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = width + "px";
      wrapper.style.height = height + "px";
      // Wrap the element with the wrapper div
      $elem.wrap(wrapper);
      // Insert the SVG after the element
      $elem.after(svg);
      // Apply the mask to the element using CSS
      $elem.css({
        "-webkit-mask": `url(#${mask.id})`,
        "mask": `url(#${mask.id})`,
        "opacity": 1 // Ensure the element is initially visible
      });

      // Calculate the total length of the path for animation
      const pathLength = path.getTotalLength();
      // Set the stroke dash array to the path length for the drawing effect
      path.setAttribute("stroke-dasharray", pathLength);
      // Initially offset the stroke to hide the path
      path.setAttribute("stroke-dashoffset", pathLength);

      // Create a GSAP timeline for the animation, initially paused
      const tl = gsap.timeline({ paused: true });
      // Animate the strokeDashoffset to reveal the element
      tl.to(path, {
        strokeDashoffset: 0,
        duration: 1.5,
        ease: "power2.inOut"
      });

      // Create ScrollTrigger to track visibility (but not to trigger animation directly)
      const scrollTrigger = ScrollTrigger.create({
        trigger: $elem.parent()[0], // Use the wrapper as the trigger
        scrub: false,
        start: "top 90%",
        end: "bottom 0%"
      });

      // Push the timeline and scrollTrigger to the array
      mediaFormTimelines.push({
        timeline: tl,
        scrollTrigger: scrollTrigger,
        element: elem
      });
    });
  };

  // SOCIAL ICONS INTO VIEW
  const socialLinkLists = $('.social-link-list').not(
    '.menu-overlay-block .social-link-list, .section.footer .social-link-list');

  if (socialLinkLists.length) {
    gsap.utils.toArray(socialLinkLists).forEach(function (list) {
      const socialIconsInList = $(list).find('.vector.social');

      if (socialIconsInList.length) {
        gsap.set(socialIconsInList, { opacity: 0, scale: 0.5 });

        const tl = gsap.timeline({
          paused: true
        });

        tl.to(socialIconsInList, {
          duration: 0.8,
          opacity: 1,
          scale: 1,
          ease: 'Power2.easeOut',
          stagger: 0.08
        });

        const scrollTrigger = ScrollTrigger.create({
          trigger: list, // Тригером є весь блок .social-link-list
          scrub: false,
          start: 'top 90%',
          end: 'bottom 0%'
        });

        socialIconsTimelines.push({
          timeline: tl,
          scrollTrigger: scrollTrigger,
          element: list
        });
      }
    });
  }

} // INTO VIEW

// INTO VIEW ANIMATIONS START
function IntoViewAnimationsStart() {

  // Heading Into View Start
  if (headingIntoViewTimelines.length) {
    headingIntoViewTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

  // Text Into View Start
  if (textIntoViewTimelines.length) {
    textIntoViewTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

  // Button Into View Start
  if (buttonIntoViewTimelines.length) {
    buttonIntoViewTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

  // Dropdown Arrow Into View Start
  if (dropdownArrowTimelines.length) {
    dropdownArrowTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

  // Separator Line Into View Start
  if (separatorLineTimelines.length) {
    separatorLineTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

  // Footer Into View Start
  if (footerTimelines.length) {
    footerTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

  // Lightbox Into View Start
  if (lightboxTimelines.length) {
    lightboxTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

  // Media and Forms Into View Start
  if (mediaFormTimelines.length) {
    mediaFormTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

  // Social Icons Into View Start
  if (socialIconsTimelines.length) {
    socialIconsTimelines.forEach(({ timeline, element }) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const isInViewport = rect.top <= windowHeight * 0.9;

      if (isInViewport) {
        timeline.play();
      } else {
        const onScroll = () => {
          const updatedRect = element.getBoundingClientRect();
          if (updatedRect.top <= windowHeight * 0.9) {
            timeline.play();
            window.removeEventListener('scroll', onScroll);
          }
        };
        window.addEventListener('scroll', onScroll);
      }
    });
  }

} // INTO VIEW ANIMATIONS START

// INTERACTIONS
function Interactions() {

  // Media query handling with GSAP matchMedia
  const mm = gsap.matchMedia();

  // MODE CLASSES CLEAN
  let darkModeClasses = $('.dark-mode');
  let lightModeClasses = $('.light-mode');

  darkModeClasses.removeClass('dark-mode');
  lightModeClasses.removeClass('light-mode');

  // COLOR THEME
  $("[data-animate-theme-to]").each(function () {
    let theme = $(this).attr("data-animate-theme-to");

    ScrollTrigger.create({
      trigger: $(this),
      start: "top center",
      end: "bottom center",
      //markers: true,
      onToggle: ({ self, isActive }) => {
        if (isActive) gsap.to("body", { ...colorThemes.getTheme(theme) });
      }
    });
  });

  // NAVBAR BG AND LOGO ANIMATION
  const navbarBGwrapper = $('.navbar-bg-wrapper');
  const navbarBlur = navbarBGwrapper.find('.navbar-blur');

  // Select the logo text elements in reverse order (3rd to 1st) for scroll animation
  const logoTextElementsForScroll = [
    document.querySelector('.logo_text._03'),
    document.querySelector('.logo_text._02'),
    document.querySelector('.logo_text._01')
  ];

  // Select the logo text elements in normal order (1st to 3rd) for menu open animation
  const logoTextElementsForMenuOpen = [
    document.querySelector('.logo_text._01'),
    document.querySelector('.logo_text._02'),
    document.querySelector('.logo_text._03')
  ];

  // Run animation only if all elements exist
  if (navbarBGwrapper.length && navbarBlur.length && logoTextElementsForScroll.every(el => el)) {
    // --- Navbar Blur Animation ---
    // Create a timeline for the blur effect with ScrollTrigger (scrubbed)
    let blurTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.main',
        start: 'top top',
        end: '400px top',
        scrub: true, // Blur animates gradually from 0 to 400px
      },
    });

    // Add navbar blur animation
    blurTl.fromTo(navbarBlur, { backdropFilter: 'blur(0px)' }, {
      backdropFilter: 'blur(10px)',
      duration: 0.5
    }, 0);

    // --- Logo Animation ---
    // Initial setup for logo letters (start at their normal position)
    gsap.set(logoTextElementsForScroll, { x: '0%' });

    // Create a separate animation for the logo (triggered at 400px, no scrub)
    gsap.to(logoTextElementsForScroll, {
      x: '-120%',
      duration: 0.5, // Total duration of 0.5 seconds
      ease: 'Power3.easeInOut',
      stagger: 0.08, // Stagger of 0.1 seconds between each letter
      scrollTrigger: {
        trigger: '.main',
        start: '400px top', // Start exactly at 400px
        toggleActions: 'play none none reverse', // Play on enter, reverse on leave back
      },
    });
  }

  // HANDLE ENTER KEY PRESS TO SIMULATE CLICK
  $(document).on('keydown', function (event) {
    if (event.keyCode === 13) { // 13 is the keycode for Enter
      const activeElement = document.activeElement;
      if (activeElement) {
        $(activeElement).trigger('click'); // Use jQuery to trigger the click
      }
    }
  });

  // MENU OVERLAY
  let menuOpened = false;
  const menuOverlayBlock = $('.menu-overlay-block');
  const menuOverlayContainer = $('.menu-overlay-container', menuOverlayBlock);
  const menuOverlayBG = $('.menu-overlay-bg', menuOverlayBlock);
  const menuButton = $('.nav-menu-button');
  const menuButtonLine01BG = $('.menu-button-line._01 .menu-button-line-bg', menuButton);
  const menuButtonLine02BG = $('.menu-button-line._02 .menu-button-line-bg', menuButton);
  const menuButtonLine03BG = $('.menu-button-line._03 .menu-button-line-bg', menuButton);
  const menuButtonLine04BG = $('.menu-button-line._04 .menu-button-line-bg', menuButton);

  const menuSocialIcons = menuOverlayBlock.find('.vector.social');
  const menuShowreelBlock = menuOverlayBlock.find('.showreel-lightbox-block');
  const menuPlayButton = menuShowreelBlock.find('.play-button');
  const menuText = menuOverlayBlock.find('.text, .menu-overlay-links .button-block .text');

  let menuTimeline = null;

  // Main content container (including footer)
  const mainContainer = $('.main, footer');
  // Focusable elements in the main container and footer
  const mainFocusableElements = $('.main, footer').find(
    'a, button, input, textarea, select, [tabindex="0"]').not('.menu-overlay-block *');
  // Focusable elements inside the menu
  const insideMenuFocusableElements = menuOverlayBlock.find(
    'a, .social-link-block, .play-button');

  // Initial setup for elements
  gsap.set(menuOverlayBlock, { display: 'none' }, 0);
  gsap.set(menuOverlayContainer, { pointerEvents: 'none' }, 0);
  gsap.set(menuOverlayBG, { opacity: 0 }, 0);
  gsap.set(menuSocialIcons, { opacity: 0, scale: 0.5 }, 0);
  gsap.set(menuShowreelBlock, { opacity: 0, y: '10%' }, 0);
  gsap.set(menuPlayButton, { scale: 0.5 }, 0);

  // Split text into lines for animation
  function menuSplitText() {
    gsap.utils.toArray(menuText).forEach(function (elem) {
      // Check if the element has already been split
      if (splitTextData.elements.has(elem)) {
        return; // Skip if element is already split
      }

      // Mark the element as split
      splitTextData.elements.set(elem, true);

      // Replace double <br> with an empty line div for spacing
      elem.innerHTML = elem.innerHTML.replace(/<br><br>/g,
        "<br><div class='empty-line'> </div><br>");

      // Split the text only once
      const split = new SplitText(elem, {
        type: 'lines',
        linesClass: 'text-line'
      });

      // Add mask wrapper manually via jQuery
      $(split.lines).wrap('<div class="text-mask"></div>');

      // Store the SplitText instance
      splitTextData.instances.push(split);

      gsap.set(split.lines, {
        y: '150%',
        willChange: 'transform'
      });
      gsap.set('.text-mask', {
        overflow: 'hidden',
        display: 'block'
      });
    });
  }

  // Perform text splitting immediately upon initialization
  menuSplitText();

  // Function to disable focus and interactions on the main content and footer
  function disableMainContent() {
    mainContainer.css('pointer-events', 'none');
    mainFocusableElements.each(function () {
      const $el = $(this);
      $el.data('original-tabindex', $el.attr('tabindex') || 0);
      $el.attr('tabindex', '-1').attr('aria-hidden', 'true');
    });
    insideMenuFocusableElements.each(function () {
      $(this).attr('tabindex', '0').removeAttr('aria-hidden');
    });
  }

  // Function to restore focus and interactions on the main content and footer
  function enableMainContent() {
    mainContainer.css('pointer-events', 'auto');
    mainFocusableElements.each(function () {
      const $el = $(this);
      const originalTabindex = $el.data('original-tabindex') || 0;
      $el.attr('tabindex', originalTabindex).removeAttr('aria-hidden');
    });
    insideMenuFocusableElements.each(function () {
      $(this).attr('tabindex', '-1').attr('aria-hidden', 'true');
    });
  }

  // Animation for opening the menu
  function menuOpens() {
    if (menuTimeline) {
      menuTimeline.kill();
    }

    menuTimeline = gsap.timeline({
      onComplete: () => {
        menuText.each(function () {
          $(this).find('.empty-line').remove();
        });
      }
    });

    gsap.set(menuOverlayBlock, { display: 'flex' }, 0);

    // Reset element states before animation
    gsap.set(menuOverlayBlock.find('.text-line'), { y: '150%' });
    gsap.set(menuSocialIcons, { opacity: 0, scale: 0.5 });
    gsap.set(menuShowreelBlock, { opacity: 0, y: '10%' });
    gsap.set(menuPlayButton, { scale: 0.5 });

    menuTimeline
      .to(menuOverlayBG, { duration: 0.5, opacity: 1, ease: 'Power1.easeInOut' }, 0)
      .to(menuButtonLine01BG, { duration: 0.3, width: '0%', ease: 'Power2.easeInOut' }, 0)
      .to(menuButtonLine02BG, { duration: 0.3, width: '0%', ease: 'Power2.easeInOut' }, 0.1)
      .to(menuButtonLine03BG, { duration: 0.3, width: '100%', ease: 'Power2.easeInOut' }, 0.4)
      .to(menuButtonLine04BG, { duration: 0.3, width: '100%', ease: 'Power2.easeInOut' }, 0.5)
      .to(menuOverlayBlock.find('.text-line'), {
        duration: 0.8,
        y: 0,
        ease: 'Power4.easeOut',
        stagger: 0.1
      }, 0.5)
      .to(menuSocialIcons, {
        duration: 0.8,
        opacity: 1,
        scale: 1,
        ease: 'Power2.easeOut',
        stagger: 0.08
      }, 1.3)
      .to(menuShowreelBlock, { duration: 0.8, opacity: 1, y: 0, ease: 'Power2.easeOut' }, 1.4)
      .to(menuPlayButton, { duration: 0.8, scale: 1, ease: 'Power2.easeOut' }, 1.4)
      .set(menuOverlayContainer, { pointerEvents: 'auto' }, 1.5)
      .add(() => {
        disableMainContent();
      }, 0);

    if (logoTextElementsForMenuOpen.every(el => el)) {
      menuTimeline.to(logoTextElementsForMenuOpen, {
        x: '0%',
        duration: 0.5,
        ease: 'Power3.easeInOut',
        stagger: 0.08
      }, 0);
    }

    menuOpened = !menuOpened;
    lenis.stop();
  }

  // Animation for closing the menu
  function menuCloses() {
    if (menuTimeline) {
      menuTimeline.kill();
    }

    menuTimeline = gsap.timeline({
      onComplete: () => {
        menuText.each(function () {
          $(this).find('.empty-line').remove();
        });
        enableMainContent();
      }
    });

    menuTimeline
      .to(menuOverlayBlock.find('.text-line'), {
          duration: 0.5,
          y: '150%',
          ease: 'Power4.easeIn'
        },
        0)
      .to(menuSocialIcons, { duration: 0.5, opacity: 0, scale: 0.5, ease: 'Power4.easeIn' }, 0)
      .to(menuShowreelBlock, { duration: 0.5, opacity: 0, y: '10%', ease: 'Power4.easeIn' }, 0)
      .to(menuPlayButton, { duration: 0.5, scale: 0.5, ease: 'Power4.easeIn' }, 0)
      .to(menuOverlayBG, { duration: 0.5, opacity: 0, ease: 'Power1.easeInOut' }, 0.5)
      .to(menuButtonLine03BG, { duration: 0.3, width: '0%', ease: 'Power2.easeInOut' }, 0)
      .to(menuButtonLine04BG, { duration: 0.3, width: '0%', ease: 'Power2.easeInOut' }, 0.1)
      .to(menuButtonLine01BG, { duration: 0.3, width: '100%', ease: 'Power2.easeInOut' }, 0.4)
      .to(menuButtonLine02BG, { duration: 0.3, width: '100%', ease: 'Power2.easeInOut' }, 0.5)
      .set(menuOverlayBlock, { display: 'none' }, 1)
      .set(menuOverlayContainer, { pointerEvents: 'none' }, 0);

    if (logoTextElementsForScroll.every(el => el)) {
      const scrollPosition = window.scrollY || window.pageYOffset;
      if (scrollPosition >= 400) {
        menuTimeline.to(logoTextElementsForScroll, {
          x: '-120%',
          duration: 0.5,
          ease: 'Power3.easeInOut',
          stagger: 0.1
        }, 0);
      }
    }

    menuOpened = !menuOpened;
    lenis.start();
  }

  // Handle menu button click to toggle open/close
  $(menuButton).click(function () {
    if (!menuOpened) {
      menuOpens();
    } else {
      menuCloses();
    }
  });

  // Handle ESC key press to toggle menu
  $(document).on('keydown', function (event) {
    if (event.keyCode === 27) {
      if (!isVideoOverlayOpen) {
        if (!menuOpened) {
          menuOpens();
        } else {
          menuCloses();
        }
      }
    }
  });

  // Handle click on menu buttons to close the menu
  const menuButtons = menuOverlayBlock.find('.menu-overlay-links .button-block');
  $(menuButtons).click(function () {
    if (menuOpened) {
      menuCloses();
    }
  });

  // Handle click on logo link to close the menu if open
  const logoLink = $('.brand.top'); // Find the logo link by updated class selector
  $(logoLink).click(function (e) {
    if (menuOpened) {
      menuCloses();
    }
    // If menu is not open, default navigation will occur (handled by Swup)
  });

  // CTA SHOWREEL REPLACE
  let ctaSpanReplace = $('.cta-showreel-span-peplace');

  if (ctaSpanReplace.length) {
    let showreelLightboxBlock = $('.showreel-lightbox-block.cta');
    if (showreelLightboxBlock.length) {
      ctaSpanReplace.replaceWith(
        showreelLightboxBlock);
    }
  }

  // CTA BLOCK WHILE SCROLLING
  let ctaBlock = $('.cta-block');

  if (ctaBlock.length) {
    gsap.utils.toArray(ctaBlock).forEach(function (elem) {
      let ctaShapeImage = $(elem).find(
        '.image.cta-shape'); // Corrected selector to find the image

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: elem,
          scrub: true,
          start: 'top 100%',
          end: 'bottom 0%'
        }
      });

      tl.fromTo(ctaShapeImage, {
        scale: 0.75,
        ease: 'linear'
      }, {
        scale: 1.1
      });
    });
  }

  // FEATURED PROJECTS OVERLAPPING
  mm.add("(min-width: 1281px)", () => {
    const featuredWrapper = $('.featured-projects-wrapper');

    if (featuredWrapper.length) {
      const title = featuredWrapper.find('.text-block.featured-projects');
      const featuredProjectBlocks = featuredWrapper.find('.featured-project-block');
      const lastFeaturedProjectBlock = featuredProjectBlocks.last();

      let calculateEnd = () => {
        let lastFeaturedBlockCenterOffset = lastFeaturedProjectBlock.offset().top - title
          .offset().top +
          lastFeaturedProjectBlock.outerHeight() / 2 - title.outerHeight() / 2;
        return `+=${lastFeaturedBlockCenterOffset}`;
      };

      let tl = gsap.timeline({
        scrollTrigger: {
          id: 'featured-projects-pin',
          trigger: title,
          start: 'center center',
          end: calculateEnd,
          pin: true
        }
      });

      featuredProjectBlocks.each((index, block) => {
        const $block = $(block);
        const $videoBlock = $block.find('.video-block');
        const $scaleVideoFilter = $block.find('.video-scale-filter');
        const $playButtonArea = $block.find('.play-button-area');

        let calculateBlockEnd = () => {
          let lastFeaturedBlockCenterOffset = lastFeaturedProjectBlock.offset().top -
            $block.offset().top +
            lastFeaturedProjectBlock.outerHeight() / 2 - $block.outerHeight() / 2;
          return `+=${lastFeaturedBlockCenterOffset}`;
        };

        ScrollTrigger.create({
          trigger: $block,
          start: 'center center',
          end: calculateBlockEnd,
          pin: true,
          pinSpacing: false
        });

        if (index < featuredProjectBlocks.length - 1) {
          let nextBlock = featuredProjectBlocks.eq(index + 1);

          let calculateScaleEnd = () => {
            let offset = nextBlock.offset().top - $block.offset().top;
            return `+=${offset}`;
          };

          let scaleTl = gsap.timeline({
              scrollTrigger: {
                trigger: $block,
                start: 'center center',
                end: calculateScaleEnd,
                scrub: true
              }
            }, 0)
            .to($videoBlock, {
              scale: 0.8,
              ease: 'linear'
            }, 0)
            .to($scaleVideoFilter, {
              opacity: 0.75,
              ease: 'linear'
            }, 0)
            .to($playButtonArea, {
              scale: 1.22,
              ease: 'linear'
            }, 0);
        }
      });

      // Add resize handler with a check for ScrollTrigger existence
      window.addEventListener('resize', () => {
        const trigger = ScrollTrigger.getById('featured-projects-pin');
        if (trigger) { // Only update if the ScrollTrigger exists
          trigger.end = calculateEnd();
        }
      });
    }
  });

  // DROPDOWN EXPANDING
  const dropdowns = document.querySelectorAll('.dropdown-block');

  if (dropdowns.length) {
    dropdowns.forEach((dropdown) => {
      // Find child elements
      const dropdownList = dropdown.querySelector('.dropdown-list');
      const arrow01 = dropdown.querySelector('.vector.arrow._01');
      const arrow02 = dropdown.querySelector('.vector.arrow._02');

      // Set initial state: dropdown closed
      gsap.set(dropdownList, {
        height: 0,
        overflow: 'hidden',
        onComplete: () => {
          ScrollTrigger.refresh();
          if (window.lenis) lenis.resize();
        },
      });

      // Create a single timeline for opening/closing animation
      const tl = gsap.timeline({ paused: true });

      // Add animations to the timeline
      tl.to(dropdownList, {
          height: 'auto',
          duration: 0.5,
          ease: 'power2.inOut',
        })
        .to(arrow01, {
          width: '0%',
          height: '0%',
          duration: 0.5,
          ease: 'power2.inOut',
        }, 0)
        .to(arrow02, {
          width: '100%',
          height: '100%',
          duration: 0.5,
          ease: 'power2.inOut',
        }, 0.05);

      // Add click event listener to toggle the dropdown
      dropdown.addEventListener('click', () => {
        const isOpen = dropdown.classList.contains('is-open');

        if (isOpen) {
          tl.reverse();
        } else {
          tl.play();
        }

        // Toggle the is-open class after animation completes
        tl.eventCallback('onComplete', () => {
          dropdown.classList.toggle('is-open');
          ScrollTrigger.refresh();
          if (window.lenis) lenis.resize();
        });
        tl.eventCallback('onReverseComplete', () => {
          dropdown.classList.toggle('is-open');
          ScrollTrigger.refresh();
          if (window.lenis) lenis.resize();
        });
      });
    });
  }

  // PROJECT LIST - SCROLLTRIGGER UPDATE AFTER FILTERING
  const filterList = document.querySelector('[fs-cmsfilter-element="list"]');
  const filterControls = document.querySelector('[fs-cmsfilter-element="filters"]');

  if (filterList && filterControls) {

    window.fsAttributes = window.fsAttributes || [];
    window.fsAttributes.push([
      'cmsfilter',
      (filterInstances) => {
        const [filterInstance] = filterInstances;
        filterInstance.listInstance.on('renderitems', (renderedItems) => {
          setTimeout(() => {
            ScrollTrigger.refresh();
            if (lenis) {
              lenis.resize();
            }
          }, 500);
        });
      },
    ]);
  }

  // BLOG FILTERS STICKY
  /*mm.add("(min-width: 992px)", () => {
    const blogFiltersWrapper = document.querySelector('.blog-filters-wrapper');
    const parentContainer = document.querySelector('.grid-col.span-4.end--1.relative');
    const searchInput = document.querySelector('.text-field.search.w-input');
    const checkboxes = document.querySelectorAll(
      '.filter-checkbox-block input[type="checkbox"]');

    if (blogFiltersWrapper && parentContainer && searchInput && checkboxes.length) {
      const updateWidth = () => {
        const parentRect = parentContainer.getBoundingClientRect();
        gsap.set(blogFiltersWrapper, { width: parentRect.width });
      };

      updateWidth();

      window.addEventListener('resize', updateWidth);

      const scrollTriggerInstance = gsap.to(blogFiltersWrapper, {
        scrollTrigger: {
          id: 'blogFiltersTrigger',
          trigger: blogFiltersWrapper,
          start: 'bottom bottom',
          end: () => `${window.scrollY + parentContainer.offsetHeight} bottom`,
          onEnter: () => {
            blogFiltersWrapper.classList.add('fixed');
          },
          onLeaveBack: () => {
            blogFiltersWrapper.classList.remove('fixed');
          },
          onLeave: () => {
            blogFiltersWrapper.classList.remove('fixed');
            gsap.set(blogFiltersWrapper, { position: 'absolute', bottom: 0, left: 0 });
          },
          onEnterBack: () => {
            blogFiltersWrapper.classList.add('fixed');
            gsap.set(blogFiltersWrapper, { position: '', bottom: '', left: '' });
          },
        },
      });
    }
  });*/

  // VIDEO PLAYER OVERLAY
  // Variable to store the current player (YouTube or Vimeo)
  let player = null;
  let isVideoOverlayOpen = false;

  // Focusable elements outside the video overlay (excluding menu overlay elements)
  const outsideFocusableElements = $('body').find(
    'a, button, input, textarea, select, [tabindex="0"]'
  ).not('.video-overlay-block *, .menu-overlay-block *');

  // Function to extract YouTube video ID from URL
  function getYouTubeVideoId(url) {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    const videoId = match ? match[1] : null;
    return videoId;
  }

  // Function to extract Vimeo video ID from URL
  function getVimeoVideoId(url) {
    const regex = /(?:vimeo\.com\/)([^"&?\/\s]+)/;
    const match = url.match(regex);
    const videoId = match ? match[1] : null;
    return videoId;
  }

  // Function to disable focus on elements outside the video overlay
  function disableOutsideFocus() {
    outsideFocusableElements.each(function () {
      const $el = $(this);
      $el.data('original-tabindex', $el.attr('tabindex') || 0); // Save original tabindex
      $el.attr('tabindex', '-1').attr('aria-hidden', 'true');
    });
  }

  // Function to restore focus on elements outside the video overlay
  function enableOutsideFocus() {
    outsideFocusableElements.each(function () {
      const $el = $(this);
      const originalTabindex = $el.data('original-tabindex') || 0;
      $el.attr('tabindex', originalTabindex).removeAttr('aria-hidden');
    });
  }

  // Function to initialize the video overlay logic
  function initializeVideoOverlay() {
    // Select all video-click-block elements
    const videoClickBlocks = document.querySelectorAll('.video-click-block');

    // If no video-click-block elements exist, exit the function
    if (!videoClickBlocks.length) {
      return;
    }

    const overlayBlock = document.querySelector('.video-overlay-block');
    const overlayBg = document.querySelector('.video-overlay-bg');
    const playerContainer = document.querySelector('#player');
    const closeButton = document.querySelector('.video-overlay-close-button');
    const closeButtonLine01BG = document.querySelector('.close-button-line._01 .button-line-bg');
    const closeButtonLine02BG = document.querySelector('.close-button-line._02 .button-line-bg');

    if (!overlayBlock || !overlayBg || !playerContainer || !closeButton || !closeButtonLine01BG ||
      !
      closeButtonLine02BG) {
      return;
    }

    // Animation timeline for the popup
    const tl = gsap.timeline({
      paused: true
    });

    // Initial setup for close button lines
    gsap.set(closeButtonLine01BG, { width: '0%' }, 0);
    gsap.set(closeButtonLine02BG, { width: '0%' }, 0);

    // Animation for opening the video overlay
    tl.to(overlayBlock, {
        display: 'flex', // Change display to flex when opening
        duration: 0
      }, 0)
      .fromTo(overlayBlock, {
        opacity: 0,
        duration: 0.3,
        ease: 'Power1.easeOut'
      }, {
        opacity: 1
      }, 0)
      .to(overlayBg, {
        opacity: 0.95, // Updated opacity to 0.95
        duration: 0.3,
        ease: 'Power1.easeOut'
      }, 0)
      .to(closeButtonLine01BG, {
        duration: 0.3,
        width: '100%',
        ease: 'Power2.easeInOut'
      }, 0.4)
      .to(closeButtonLine02BG, {
        duration: 0.3,
        width: '100%',
        ease: 'Power2.easeInOut'
      }, 0.5);

    // Animation for closing the video overlay (will be played in reverse)
    tl.to(closeButtonLine01BG, {
      duration: 0.3,
      width: '0%',
      ease: 'Power2.easeInOut'
    }, 0);
    tl.to(closeButtonLine02BG, {
      duration: 0.3,
      width: '0%',
      ease: 'Power2.easeInOut'
    }, 0.1);

    // Function to close the video overlay
    const closeVideoOverlay = () => {
      tl.reverse();
      lenis.start();
      if (player) {
        if (videoType === 'youtube' && player.pauseVideo) {
          player.pauseVideo(); // Pause YouTube video
        } else if (videoType === 'vimeo' && player.pause) {
          player.pause(); // Pause Vimeo video
        }
      }
      isVideoOverlayOpen = false;
      enableOutsideFocus();
    };

    // Variable to store the video type (needed for closing)
    let videoType = null;

    // Function to handle video seeking with arrow keys and ESC key
    function handleVideoControls(event) {
      if (!isVideoOverlayOpen) return; // Only handle if video overlay is open

      const seekStep = 5; // Number of seconds to seek forward/backward
      let currentTime;

      if (event.key === 'Escape') { // Handle ESC key
        event.preventDefault();
        closeVideoOverlay();
      } else if (player) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault(); // Prevent default scrolling behavior
          if (player.getCurrentTime) { // YouTube
            currentTime = player.getCurrentTime();
            player.seekTo(Math.max(0, currentTime - seekStep), true);
          } else if (player.getCurrentTime) { // Vimeo
            player.getCurrentTime().then((time) => {
              player.setCurrentTime(Math.max(0, time - seekStep));
            });
          }
        } else if (event.key === 'ArrowRight') {
          event.preventDefault(); // Prevent default scrolling behavior
          if (player.getCurrentTime) { // YouTube
            currentTime = player.getCurrentTime();
            player.getDuration().then((duration) => {
              player.seekTo(Math.min(duration, currentTime + seekStep), true);
            });
          } else if (player.getCurrentTime) { // Vimeo
            player.getCurrentTime().then((time) => {
              player.getDuration().then((duration) => {
                player.setCurrentTime(Math.min(duration, time + seekStep));
              });
            });
          }
        }
      }
    }

    // Add keydown event listener for seeking and ESC
    document.addEventListener('keydown', handleVideoControls);

    // Add click event listener to each video-click-block
    videoClickBlocks.forEach((block) => {
      block.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior

        // Open the popup immediately
        tl.play();
        lenis.stop();
        isVideoOverlayOpen = true;
        disableOutsideFocus(); // Disable focus on elements outside the video overlay

        // Get the video link and type
        const videoLinkElement = block.querySelector('a[data-video-link]');
        const videoLink = videoLinkElement ? videoLinkElement.getAttribute('href') : null;
        videoType = block.getAttribute('data-overlay-type');

        // Destroy the existing player if it exists
        if (player) {
          if (videoType === 'youtube' && player.destroy) {
            player.destroy();
          } else if (videoType === 'vimeo' && player.destroy) {
            player.destroy();
          }
          player = null;
        }

        // Clear the player container
        playerContainer.innerHTML = '';

        if (videoType === 'youtube') {
          // Extract YouTube video ID
          const videoId = getYouTubeVideoId(videoLink);
          if (!videoId) {
            return;
          }

          // Initialize YouTube player
          player = new YT.Player('player', {
            height: '390',
            width: '640',
            videoId: videoId,
            playerVars: {
              'playsinline': 1
            },
            events: {
              'onReady': (event) => {
                // Fade in the player when ready
                gsap.fromTo(playerContainer, {
                  opacity: 0,
                  duration: 0.3,
                  ease: 'Power1.easeOut'
                }, {
                  opacity: 1
                });
                // Start playing the video
                event.target.playVideo();
              }
            }
          });
        } else if (videoType === 'vimeo') {
          // Extract Vimeo video ID
          const videoId = getVimeoVideoId(videoLink);
          if (!videoId) {
            return;
          }

          // Create a new div for Vimeo player
          const vimeoPlayerDiv = document.createElement('div');
          vimeoPlayerDiv.id = 'player';
          playerContainer.appendChild(vimeoPlayerDiv);

          // Initialize Vimeo player
          player = new Vimeo.Player('player', {
            id: videoId,
            width: 640,
            height: 390,
            playsinline: true
          });

          // Fade in the player when ready
          player.on('loaded', () => {
            gsap.fromTo(playerContainer, {
              opacity: 0,
              duration: 0.3,
              ease: 'Power1.easeOut'
            }, {
              opacity: 1
            });
            // Start playing the video
            player.play();
          });
        }
      });
    });

    // Close the popup when clicking on the background
    overlayBg.addEventListener('click', closeVideoOverlay);

    // Close the popup when clicking on the close button
    closeButton.addEventListener('click', closeVideoOverlay);

    // Close the popup when pressing Enter or Space on the close button
    closeButton.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); // Prevent default behavior (e.g., scrolling on Space)
        closeVideoOverlay();
      }
    });

    // Ensure display is set to none and clear player container when the animation reverses (closes)
    tl.eventCallback('onReverseComplete', () => {
      gsap.set(overlayBlock, { display: 'none' });
      // Clear the player container and destroy the player after animation completes
      if (player) {
        if (videoType === 'youtube' && player.destroy) {
          player.destroy(); // Destroy YouTube player
        } else if (videoType === 'vimeo' && player.destroy) {
          player.destroy(); // Destroy Vimeo player
        }
        player = null;
      }
      playerContainer.innerHTML = ''; // Clear the player container
    });
  }

  // Define onYouTubeIframeAPIReady as a global function
  window.onYouTubeIframeAPIReady = function () {
    initializeVideoOverlay();
  };

  // Fallback: If the API is already loaded, call the function manually
  if (window.YT && window.YT.Player) {
    window.onYouTubeIframeAPIReady();
  }

  // PROJECTS FILTER CHECKBOX ALL
  let checkboxAll = $('#chackbox-all'); // Select the #chackbox-all element
  let projectFilterList = $('.project-filter-list'); // Select the .project-filter-list container

  // Check if both elements exist, then move #chackbox-all to the beginning of .project-filter-list
  if (checkboxAll.length && projectFilterList.length) {
    projectFilterList.prepend(checkboxAll);
  }

}; // INTERACTIONS

// HOVERS
function Hovers() {

  // BUTTON HOVER
  const buttonBlock = document.querySelectorAll(
    '.button-block'
  );

  // Check if there are any buttons to animate
  if (buttonBlock.length) {
    gsap.utils.toArray(buttonBlock).forEach((elem) => {
      // Find child elements within the current button
      const buttonLine = elem.querySelector('.button-line');
      const buttonLineContainer = elem.querySelector('.button-line-container');
      const arrowMask = elem.querySelector('.arrow-mask');
      const arrow01 = elem.querySelector('.vector.arrow._01');
      const arrow02 = elem.querySelector('.vector.arrow._02');

      // Create a GSAP timeline for scroll-triggered animation (if needed)
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: elem,
          scrub: false,
          start: 'top 90%',
          end: 'bottom 0%',
        },
      });

      // Create a GSAP timeline for hover animation
      const hoverTimeline = gsap.timeline({ paused: true });

      // Add animations for hover effect if elements exist
      if (arrowMask) {
        hoverTimeline.to(arrow01, {
            duration: 0.5,
            width: '0%',
            height: '0%',
            ease: 'power2.inOut',
          }, 0)
          .to(
            arrow02, {
              duration: 0.5,
              width: '100%',
              height: '100%',
              ease: 'power2.inOut',
            }, 0.05);
      }

      // Add animation for buttonLine if it exists
      if (buttonLineContainer) {
        const buttonLine01 = elem.querySelector('.button-line._01');
        const buttonLine02 = elem.querySelector('.button-line._02');

        gsap.set(buttonLine02, { width: '0%' });

        hoverTimeline.to(buttonLine01, {
            duration: 0.4,
            width: '0%',
            ease: 'Power3.easeOut',
          }, 0)
          .to(buttonLine02, {
            duration: 0.3,
            width: '100%',
            ease: 'Power3.easeOut',
          }, 0.2);
      }

      // Play the timeline when the mouse enters the element
      elem.addEventListener('mouseenter', () => {
        hoverTimeline.play();
      });

      // Reverse the timeline when the mouse leaves the element
      elem.addEventListener('mouseleave', () => {
        hoverTimeline.reverse();
      });
    });
  }

  // FEATURED VIDEO BLOCK HOVER
  let currentClientX = 0;
  let currentClientY = 0;

  // Select all video blocks
  const videoBlocks = document.querySelectorAll(
    '.video-block.featured,  .video-block.portfolio-showreel');
  //const videoBlocksHover = document.querySelectorAll('.video-block.featured, .video-block.portfolio-showreel');

  // Check if there are any video blocks
  if (videoBlocks.length) {
    // Update global cursor position on mousemove
    document.addEventListener('mousemove', (e) => {
      currentClientX = e.clientX;
      currentClientY = e.clientY;
    });

    videoBlocks.forEach((videoBlock) => {
      // Find the play button wrapper
      const playButtonWrapper = videoBlock.querySelector('.play-button-wrapper');

      // Variables to store the state
      let isMouseOver = false;

      // Function to update the play button position
      const updateButtonPosition = () => {
        // Get the current bounding rectangle (reflects scaling and position)
        const rect = videoBlock.getBoundingClientRect();

        // Check if the cursor is within the current block
        const isCursorOver = currentClientX >= rect.left && currentClientX <= rect.right &&
          currentClientY >= rect.top && currentClientY <= rect.bottom;

        // Only update if the mouse is over the block
        if (!isMouseOver || !isCursorOver) {
          return;
        }

        // Calculate the center of the video block (relative to the viewport)
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate the offset from the center based on current dimensions
        const offsetX = currentClientX - centerX;
        const offsetY = currentClientY - centerY;

        // Constrain the button position within the current video block
        const maxX = rect.width / 2;
        const maxY = rect.height / 2;
        const constrainedX = Math.max(-maxX, Math.min(offsetX, maxX));
        const constrainedY = Math.max(-maxY, Math.min(offsetY, maxY));

        // Animate the play button position relative to the center
        gsap.to(playButtonWrapper, {
          x: constrainedX,
          y: constrainedY,
          duration: 0,
          ease: 'power2.out',
        });
      };

      // On mouse enter: animate the play button size and set flag
      videoBlock.addEventListener('mouseenter', () => {
        isMouseOver = true;
        gsap.to(playButtonWrapper, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'power2.out',
        });
        updateButtonPosition(); // Initialize position on enter
      });

      // On mouse leave: reset the play button size and clear flag
      videoBlock.addEventListener('mouseleave', () => {
        isMouseOver = false;
        gsap.to(playButtonWrapper, {
          opacity: 0,
          scale: 0.3,
          duration: 0.2,
          ease: 'power2.in',
        });
      });

      // On mouse move: update the button position
      videoBlock.addEventListener('mousemove', () => {
        updateButtonPosition();
      });

      // On scroll: update the button position for the current block
      window.addEventListener('scroll', () => {
        updateButtonPosition();
      });
    });
  }

}; // HOVERS

// CASE STUDIES THREE DOTS
/*function CaseStudiesThreeDots() {

  const caseBlocksCaseStudies = document.querySelectorAll('.bento-cell.case.studies-page');

  if (caseBlocksCaseStudies.length > 0) {

    caseBlocksCaseStudies.forEach(caseBlockCaseStudy => {

      let caseHeadings = caseBlockCaseStudy.querySelectorAll('.text-block .heading');

      let caseHeadingsresult = caseBlockCaseStudy.querySelectorAll(
        '.text-block .heading.case-result');

      caseHeadingsresult.forEach(heading => {
        // Check if the element has already been processed
        if (!heading.classList.contains('processed')) {
          let text = heading.textContent.trim();
          if (text.length > 0) {
            // Append three dots to the text
            heading.textContent = text + ' ...';
          }
          // Add a class to mark the element as processed
          heading.classList.add('processed');
        }
      });

    });
  };

};*/

// Animations  
function Animations() {
  let mm = gsap.matchMedia();

  mm.add('(min-width: 768px)', () => {
    AnimationsDesktop();

    let mm = gsap.matchMedia();

    mm.add('(min-width: 1281px)', () => {
      Hovers();
    });
  });

  mm.add('(max-width: 767px)', () => {
    AnimationsMobile();
  });
}

function AnimationsDesktop() {
  Interactions();
  IntoView();
}

function AnimationsMobile() {
  Interactions();
  IntoView();
}

// Function to hide the loading screen and start animations
function hideLoadingScreen() {
  const loadingScreen = document.querySelector('.loading-screen-block');
  if (loadingScreen) {
    gsap.set(loadingScreen, { display: 'none' }); // Hide the loading screen
  }

  // Start animations immediately after hiding the loading screen
  Animations();
  setTimeout(() => {
    IntoViewAnimationsStart();
  }, 10);
}

// Initial page load
window.addEventListener('load', function () {
  window.history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  SwupJS();
  Smooth();

  // Hide loading screen and start animations
  hideLoadingScreen();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
      if (lenis) {
        lenis.resize();
      }
    }, 200);
  });
});
