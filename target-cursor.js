/**
 * TargetCursor — vanilla adaptation of React Bits TargetCursor (GSAP).
 * Tuned for Vibe Coder: cream cursor, lime on targets.
 */
(function () {
  var CURSOR_COLOR = "#f3eee4";
  var CURSOR_COLOR_ON_TARGET = "#d6ff3e";
  var TARGET_SELECTOR = ".cursor-target";
  var SPIN_DURATION = 2;
  var HOVER_DURATION = 0.2;
  var PARALLAX_ON = true;
  var HIDE_DEFAULT = true;
  var BORDER_WIDTH = 3;
  var CORNER_SIZE = 12;

  function isMobileDevice() {
    var hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    var small = window.innerWidth <= 768;
    var ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();
    var mobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    return (hasTouch && small) || mobileUA;
  }

  function getContainingBlock(element) {
    var node = element && element.parentElement;
    while (node && node !== document.documentElement) {
      var style = getComputedStyle(node);
      if (
        style.transform !== "none" ||
        style.perspective !== "none" ||
        style.filter !== "none" ||
        style.willChange.indexOf("transform") !== -1 ||
        style.willChange.indexOf("perspective") !== -1 ||
        style.willChange.indexOf("filter") !== -1 ||
        /paint|layout|strict|content/.test(style.contain)
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function getContainingBlockOffset(block) {
    if (!block) return { x: 0, y: 0 };
    var rect = block.getBoundingClientRect();
    return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
  }

  function markTargets() {
    var selector = [
      ".btn",
      ".logo",
      ".nav a",
      ".nav-burger",
      ".project",
      ".skill-row",
      ".step",
      ".badges span",
      ".audience__list li",
      ".footer a",
      ".testimonial-card",
      ".testimonial-card__arrow",
      ".testimonial-carousel__dots button",
      ".hero__portrait-frame"
    ].join(",");
    document.querySelectorAll(selector).forEach(function (el) {
      el.classList.add("cursor-target");
    });
  }

  function boot() {
    if (typeof gsap === "undefined") return;
    if (isMobileDevice()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    markTargets();

    var wrapper = document.createElement("div");
    wrapper.className = "target-cursor-wrapper";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML =
      '<div class="target-cursor-dot"></div>' +
      '<div class="target-cursor-corner corner-tl"></div>' +
      '<div class="target-cursor-corner corner-tr"></div>' +
      '<div class="target-cursor-corner corner-br"></div>' +
      '<div class="target-cursor-corner corner-bl"></div>';
    document.body.appendChild(wrapper);

    var cursor = wrapper;
    var dot = wrapper.querySelector(".target-cursor-dot");
    var corners = wrapper.querySelectorAll(".target-cursor-corner");
    var containingBlock = getContainingBlock(cursor);
    var spinTl = null;
    var activeTarget = null;
    var currentLeaveHandler = null;
    var resumeTimeout = null;
    var targetCornerPositions = null;
    var activeStrength = { current: 0 };
    var originalCursor = document.body.style.cursor;

    document.documentElement.classList.add("has-target-cursor");
    if (HIDE_DEFAULT) document.body.style.cursor = "none";

    corners.forEach(function (corner) {
      corner.style.borderColor = CURSOR_COLOR;
    });
    dot.style.backgroundColor = CURSOR_COLOR;

    function getOffset() {
      return getContainingBlockOffset(containingBlock);
    }

    function moveCursor(x, y) {
      var off = getOffset();
      gsap.to(cursor, {
        x: x - off.x,
        y: y - off.y,
        duration: 0.1,
        ease: "power3.out"
      });
    }

    function createSpinTimeline() {
      if (spinTl) spinTl.kill();
      spinTl = gsap.timeline({ repeat: -1 }).to(cursor, {
        rotation: "+=360",
        duration: SPIN_DURATION,
        ease: "none"
      });
    }

    var initialOffset = getOffset();
    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2 - initialOffset.x,
      y: window.innerHeight / 2 - initialOffset.y
    });
    createSpinTimeline();

    function tickerFn() {
      if (!targetCornerPositions || !corners.length) return;
      var strength = activeStrength.current;
      if (strength === 0) return;

      var cursorX = gsap.getProperty(cursor, "x");
      var cursorY = gsap.getProperty(cursor, "y");

      Array.prototype.forEach.call(corners, function (corner, i) {
        var currentX = gsap.getProperty(corner, "x");
        var currentY = gsap.getProperty(corner, "y");
        var targetX = targetCornerPositions[i].x - cursorX;
        var targetY = targetCornerPositions[i].y - cursorY;
        var finalX = currentX + (targetX - currentX) * strength;
        var finalY = currentY + (targetY - currentY) * strength;
        var duration = strength >= 0.99 ? (PARALLAX_ON ? 0.2 : 0) : 0.05;

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: duration,
          ease: duration === 0 ? "none" : "power1.out",
          overwrite: "auto"
        });
      });
    }

    function cleanupTarget(target) {
      if (currentLeaveHandler && target) {
        target.removeEventListener("mouseleave", currentLeaveHandler);
      }
      currentLeaveHandler = null;
    }

    function moveHandler(e) {
      moveCursor(e.clientX, e.clientY);
    }

    function scrollHandler() {
      if (!activeTarget) return;
      var off = getOffset();
      var mouseX = gsap.getProperty(cursor, "x") + off.x;
      var mouseY = gsap.getProperty(cursor, "y") + off.y;
      var under = document.elementFromPoint(mouseX, mouseY);
      var still =
        under &&
        (under === activeTarget || (under.closest && under.closest(TARGET_SELECTOR) === activeTarget));
      if (!still && currentLeaveHandler) currentLeaveHandler();
    }

    function mouseDownHandler() {
      gsap.to(dot, { scale: 0.7, duration: 0.3 });
      gsap.to(cursor, { scale: 0.9, duration: 0.2 });
    }

    function mouseUpHandler() {
      gsap.to(dot, { scale: 1, duration: 0.3 });
      gsap.to(cursor, { scale: 1, duration: 0.2 });
    }

    function enterHandler(e) {
      var directTarget = e.target;
      var allTargets = [];
      var current = directTarget;
      while (current && current !== document.body) {
        if (current.matches && current.matches(TARGET_SELECTOR)) allTargets.push(current);
        current = current.parentElement;
      }
      var target = allTargets[0] || null;
      if (!target) return;
      if (activeTarget === target) return;
      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }

      activeTarget = target;
      Array.prototype.forEach.call(corners, function (corner) {
        gsap.killTweensOf(corner, "x,y");
      });

      gsap.killTweensOf(cursor, "rotation");
      if (spinTl) spinTl.pause();
      gsap.set(cursor, { rotation: 0 });

      gsap.to(corners, {
        borderColor: CURSOR_COLOR_ON_TARGET,
        duration: 0.15,
        ease: "power2.out"
      });
      gsap.to(dot, {
        backgroundColor: CURSOR_COLOR_ON_TARGET,
        duration: 0.15,
        ease: "power2.out"
      });

      var rect = target.getBoundingClientRect();
      var off = getOffset();
      var cursorX = gsap.getProperty(cursor, "x");
      var cursorY = gsap.getProperty(cursor, "y");

      targetCornerPositions = [
        { x: rect.left - BORDER_WIDTH - off.x, y: rect.top - BORDER_WIDTH - off.y },
        {
          x: rect.right + BORDER_WIDTH - CORNER_SIZE - off.x,
          y: rect.top - BORDER_WIDTH - off.y
        },
        {
          x: rect.right + BORDER_WIDTH - CORNER_SIZE - off.x,
          y: rect.bottom + BORDER_WIDTH - CORNER_SIZE - off.y
        },
        {
          x: rect.left - BORDER_WIDTH - off.x,
          y: rect.bottom + BORDER_WIDTH - CORNER_SIZE - off.y
        }
      ];

      gsap.ticker.add(tickerFn);
      gsap.to(activeStrength, {
        current: 1,
        duration: HOVER_DURATION,
        ease: "power2.out"
      });

      Array.prototype.forEach.call(corners, function (corner, i) {
        gsap.to(corner, {
          x: targetCornerPositions[i].x - cursorX,
          y: targetCornerPositions[i].y - cursorY,
          duration: 0.2,
          ease: "power2.out"
        });
      });

      function leaveHandler() {
        gsap.ticker.remove(tickerFn);
        targetCornerPositions = null;
        gsap.set(activeStrength, { current: 0, overwrite: true });
        activeTarget = null;

        gsap.to(corners, {
          borderColor: CURSOR_COLOR,
          duration: 0.15,
          ease: "power2.out"
        });
        gsap.to(dot, {
          backgroundColor: CURSOR_COLOR,
          duration: 0.15,
          ease: "power2.out"
        });

        Array.prototype.forEach.call(corners, function (corner) {
          gsap.killTweensOf(corner, "x,y");
        });

        var positions = [
          { x: -CORNER_SIZE * 1.5, y: -CORNER_SIZE * 1.5 },
          { x: CORNER_SIZE * 0.5, y: -CORNER_SIZE * 1.5 },
          { x: CORNER_SIZE * 0.5, y: CORNER_SIZE * 0.5 },
          { x: -CORNER_SIZE * 1.5, y: CORNER_SIZE * 0.5 }
        ];
        var tl = gsap.timeline();
        Array.prototype.forEach.call(corners, function (corner, index) {
          tl.to(
            corner,
            {
              x: positions[index].x,
              y: positions[index].y,
              duration: 0.3,
              ease: "power3.out"
            },
            0
          );
        });

        resumeTimeout = setTimeout(function () {
          if (!activeTarget && spinTl) {
            var currentRotation = gsap.getProperty(cursor, "rotation");
            var normalizedRotation = currentRotation % 360;
            spinTl.kill();
            spinTl = gsap.timeline({ repeat: -1 }).to(cursor, {
              rotation: "+=360",
              duration: SPIN_DURATION,
              ease: "none"
            });
            gsap.to(cursor, {
              rotation: normalizedRotation + 360,
              duration: SPIN_DURATION * (1 - normalizedRotation / 360),
              ease: "none",
              onComplete: function () {
                if (spinTl) spinTl.restart();
              }
            });
          }
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      }

      currentLeaveHandler = leaveHandler;
      target.addEventListener("mouseleave", leaveHandler);
    }

    function resizeHandler() {
      containingBlock = getContainingBlock(cursor);
    }

    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("mouseover", enterHandler, { passive: true });
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("resize", resizeHandler);
    window.addEventListener("mousedown", mouseDownHandler);
    window.addEventListener("mouseup", mouseUpHandler);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
