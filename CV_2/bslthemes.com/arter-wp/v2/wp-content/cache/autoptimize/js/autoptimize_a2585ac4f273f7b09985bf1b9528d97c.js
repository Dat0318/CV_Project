(function ($) {
  'use strict';
  $(window).on('elementor/frontend/init', function () {
    elementorFrontend.hooks.addAction(
      'frontend/element_ready/arter-started-section.default',
      function () {}
    );
    elementorFrontend.hooks.addAction(
      'frontend/element_ready/global',
      function ($scope) {}
    );
    elementorFrontend.hooks.addAction(
      'frontend/element_ready/widget',
      function ($scope) {}
    );
  });
})(jQuery);
(function ($) {
  'use strict';
  if (typeof wpcf7 === 'undefined' || wpcf7 === null) {
    return;
  }
  wpcf7 = $.extend({ cached: 0, inputs: [] }, wpcf7);
  $(function () {
    wpcf7.supportHtml5 = (function () {
      var features = {};
      var input = document.createElement('input');
      features.placeholder = 'placeholder' in input;
      var inputTypes = ['email', 'url', 'tel', 'number', 'range', 'date'];
      $.each(inputTypes, function (index, value) {
        input.setAttribute('type', value);
        features[value] = input.type !== 'text';
      });
      return features;
    })();
    $('div.wpcf7 > form').each(function () {
      var $form = $(this);
      wpcf7.initForm($form);
      if (wpcf7.cached) {
        wpcf7.refill($form);
      }
    });
  });
  wpcf7.getId = function (form) {
    return parseInt($('input[name="_wpcf7"]', form).val(), 10);
  };
  wpcf7.initForm = function (form) {
    var $form = $(form);
    wpcf7.setStatus($form, 'init');
    $form.submit(function (event) {
      if (!wpcf7.supportHtml5.placeholder) {
        $('[placeholder].placeheld', $form).each(function (i, n) {
          $(n).val('').removeClass('placeheld');
        });
      }
      if (typeof window.FormData === 'function') {
        wpcf7.submit($form);
        event.preventDefault();
      }
    });
    $('.wpcf7-submit', $form).after('<span class="ajax-loader"></span>');
    wpcf7.toggleSubmit($form);
    $form.on('click', '.wpcf7-acceptance', function () {
      wpcf7.toggleSubmit($form);
    });
    $('.wpcf7-exclusive-checkbox', $form).on(
      'click',
      'input:checkbox',
      function () {
        var name = $(this).attr('name');
        $form
          .find('input:checkbox[name="' + name + '"]')
          .not(this)
          .prop('checked', false);
      }
    );
    $('.wpcf7-list-item.has-free-text', $form).each(function () {
      var $freetext = $(':input.wpcf7-free-text', this);
      var $wrap = $(this).closest('.wpcf7-form-control');
      if ($(':checkbox, :radio', this).is(':checked')) {
        $freetext.prop('disabled', false);
      } else {
        $freetext.prop('disabled', true);
      }
      $wrap.on('change', ':checkbox, :radio', function () {
        var $cb = $('.has-free-text', $wrap).find(':checkbox, :radio');
        if ($cb.is(':checked')) {
          $freetext.prop('disabled', false).focus();
        } else {
          $freetext.prop('disabled', true);
        }
      });
    });
    if (!wpcf7.supportHtml5.placeholder) {
      $('[placeholder]', $form).each(function () {
        $(this).val($(this).attr('placeholder'));
        $(this).addClass('placeheld');
        $(this).focus(function () {
          if ($(this).hasClass('placeheld')) {
            $(this).val('').removeClass('placeheld');
          }
        });
        $(this).blur(function () {
          if ('' === $(this).val()) {
            $(this).val($(this).attr('placeholder'));
            $(this).addClass('placeheld');
          }
        });
      });
    }
    if (wpcf7.jqueryUi && !wpcf7.supportHtml5.date) {
      $form.find('input.wpcf7-date[type="date"]').each(function () {
        $(this).datepicker({
          dateFormat: 'yy-mm-dd',
          minDate: new Date($(this).attr('min')),
          maxDate: new Date($(this).attr('max')),
        });
      });
    }
    if (wpcf7.jqueryUi && !wpcf7.supportHtml5.number) {
      $form.find('input.wpcf7-number[type="number"]').each(function () {
        $(this).spinner({
          min: $(this).attr('min'),
          max: $(this).attr('max'),
          step: $(this).attr('step'),
        });
      });
    }
    wpcf7.resetCounter($form);
    $form.on('change', '.wpcf7-validates-as-url', function () {
      var val = $.trim($(this).val());
      if (
        val &&
        !val.match(/^[a-z][a-z0-9.+-]*:/i) &&
        -1 !== val.indexOf('.')
      ) {
        val = val.replace(/^\/+/, '');
        val = 'http://' + val;
      }
      $(this).val(val);
    });
  };
  wpcf7.submit = function (form) {
    if (typeof window.FormData !== 'function') {
      return;
    }
    var $form = $(form);
    $('.ajax-loader', $form).addClass('is-active');
    wpcf7.clearResponse($form);
    var formData = new FormData($form.get(0));
    var detail = {
      id: $form.closest('div.wpcf7').attr('id'),
      status: 'init',
      inputs: [],
      formData: formData,
    };
    $.each($form.serializeArray(), function (i, field) {
      if ('_wpcf7' == field.name) {
        detail.contactFormId = field.value;
      } else if ('_wpcf7_version' == field.name) {
        detail.pluginVersion = field.value;
      } else if ('_wpcf7_locale' == field.name) {
        detail.contactFormLocale = field.value;
      } else if ('_wpcf7_unit_tag' == field.name) {
        detail.unitTag = field.value;
      } else if ('_wpcf7_container_post' == field.name) {
        detail.containerPostId = field.value;
      } else if (field.name.match(/^_/)) {
      } else {
        detail.inputs.push(field);
      }
    });
    wpcf7.triggerEvent($form.closest('div.wpcf7'), 'beforesubmit', detail);
    var ajaxSuccess = function (data, status, xhr, $form) {
      detail.id = $(data.into).attr('id');
      detail.status = data.status;
      detail.apiResponse = data;
      switch (data.status) {
        case 'init':
          wpcf7.setStatus($form, 'init');
          break;
        case 'validation_failed':
          $.each(data.invalid_fields, function (i, n) {
            $(n.into, $form).each(function () {
              wpcf7.notValidTip(this, n.message);
              $('.wpcf7-form-control', this).addClass('wpcf7-not-valid');
              $('.wpcf7-form-control', this).attr(
                'aria-describedby',
                n.error_id
              );
              $('[aria-invalid]', this).attr('aria-invalid', 'true');
            });
          });
          wpcf7.setStatus($form, 'invalid');
          wpcf7.triggerEvent(data.into, 'invalid', detail);
          break;
        case 'acceptance_missing':
          wpcf7.setStatus($form, 'unaccepted');
          wpcf7.triggerEvent(data.into, 'unaccepted', detail);
          break;
        case 'spam':
          wpcf7.setStatus($form, 'spam');
          wpcf7.triggerEvent(data.into, 'spam', detail);
          break;
        case 'aborted':
          wpcf7.setStatus($form, 'aborted');
          wpcf7.triggerEvent(data.into, 'aborted', detail);
          break;
        case 'mail_sent':
          wpcf7.setStatus($form, 'sent');
          wpcf7.triggerEvent(data.into, 'mailsent', detail);
          break;
        case 'mail_failed':
          wpcf7.setStatus($form, 'failed');
          wpcf7.triggerEvent(data.into, 'mailfailed', detail);
          break;
        default:
          wpcf7.setStatus(
            $form,
            'custom-' + data.status.replace(/[^0-9a-z]+/i, '-')
          );
      }
      wpcf7.refill($form, data);
      wpcf7.triggerEvent(data.into, 'submit', detail);
      if ('mail_sent' == data.status) {
        $form.each(function () {
          this.reset();
        });
        wpcf7.toggleSubmit($form);
        wpcf7.resetCounter($form);
      }
      if (!wpcf7.supportHtml5.placeholder) {
        $form.find('[placeholder].placeheld').each(function (i, n) {
          $(n).val($(n).attr('placeholder'));
        });
      }
      $('.wpcf7-response-output', $form)
        .html('')
        .append(data.message)
        .slideDown('fast');
      $('.screen-reader-response', $form.closest('.wpcf7')).each(function () {
        var $response = $(this);
        $('[role="status"]', $response).html(data.message);
        if (data.invalid_fields) {
          $.each(data.invalid_fields, function (i, n) {
            if (n.idref) {
              var $li = $('<li></li>').append(
                $('<a></a>')
                  .attr('href', '#' + n.idref)
                  .append(n.message)
              );
            } else {
              var $li = $('<li></li>').append(n.message);
            }
            $li.attr('id', n.error_id);
            $('ul', $response).append($li);
          });
        }
      });
      if (data.posted_data_hash) {
        $form
          .find('input[name="_wpcf7_posted_data_hash"]')
          .first()
          .val(data.posted_data_hash);
      }
    };
    $.ajax({
      type: 'POST',
      url: wpcf7.apiSettings.getRoute(
        '/contact-forms/' + wpcf7.getId($form) + '/feedback'
      ),
      data: formData,
      dataType: 'json',
      processData: false,
      contentType: false,
    })
      .done(function (data, status, xhr) {
        ajaxSuccess(data, status, xhr, $form);
        $('.ajax-loader', $form).removeClass('is-active');
      })
      .fail(function (xhr, status, error) {
        var $e = $('<div class="ajax-error"></div>').text(error.message);
        $form.after($e);
      });
  };
  wpcf7.triggerEvent = function (target, name, detail) {
    var event = new CustomEvent('wpcf7' + name, {
      bubbles: true,
      detail: detail,
    });
    $(target).get(0).dispatchEvent(event);
  };
  wpcf7.setStatus = function (form, status) {
    var $form = $(form);
    var prevStatus = $form.attr('data-status');
    $form.data('status', status);
    $form.addClass(status);
    $form.attr('data-status', status);
    if (prevStatus && prevStatus !== status) {
      $form.removeClass(prevStatus);
    }
  };
  wpcf7.toggleSubmit = function (form, state) {
    var $form = $(form);
    var $submit = $('input:submit', $form);
    if (typeof state !== 'undefined') {
      $submit.prop('disabled', !state);
      return;
    }
    if ($form.hasClass('wpcf7-acceptance-as-validation')) {
      return;
    }
    $submit.prop('disabled', false);
    $('.wpcf7-acceptance', $form).each(function () {
      var $span = $(this);
      var $input = $('input:checkbox', $span);
      if (!$span.hasClass('optional')) {
        if (
          ($span.hasClass('invert') && $input.is(':checked')) ||
          (!$span.hasClass('invert') && !$input.is(':checked'))
        ) {
          $submit.prop('disabled', true);
          return false;
        }
      }
    });
  };
  wpcf7.resetCounter = function (form) {
    var $form = $(form);
    $('.wpcf7-character-count', $form).each(function () {
      var $count = $(this);
      var name = $count.attr('data-target-name');
      var down = $count.hasClass('down');
      var starting = parseInt($count.attr('data-starting-value'), 10);
      var maximum = parseInt($count.attr('data-maximum-value'), 10);
      var minimum = parseInt($count.attr('data-minimum-value'), 10);
      var updateCount = function (target) {
        var $target = $(target);
        var length = $target.val().length;
        var count = down ? starting - length : length;
        $count.attr('data-current-value', count);
        $count.text(count);
        if (maximum && maximum < length) {
          $count.addClass('too-long');
        } else {
          $count.removeClass('too-long');
        }
        if (minimum && length < minimum) {
          $count.addClass('too-short');
        } else {
          $count.removeClass('too-short');
        }
      };
      $(':input[name="' + name + '"]', $form).each(function () {
        updateCount(this);
        $(this).keyup(function () {
          updateCount(this);
        });
      });
    });
  };
  wpcf7.notValidTip = function (target, message) {
    var $target = $(target);
    $('.wpcf7-not-valid-tip', $target).remove();
    $('<span></span>')
      .attr({ class: 'wpcf7-not-valid-tip', 'aria-hidden': 'true' })
      .text(message)
      .appendTo($target);
    if ($target.is('.use-floating-validation-tip *')) {
      var fadeOut = function (target) {
        $(target)
          .not(':hidden')
          .animate({ opacity: 0 }, 'fast', function () {
            $(this).css({ 'z-index': -100 });
          });
      };
      $target.on('mouseover', '.wpcf7-not-valid-tip', function () {
        fadeOut(this);
      });
      $target.on('focus', ':input', function () {
        fadeOut($('.wpcf7-not-valid-tip', $target));
      });
    }
  };
  wpcf7.refill = function (form, data) {
    var $form = $(form);
    var refillCaptcha = function ($form, items) {
      $.each(items, function (i, n) {
        $form.find(':input[name="' + i + '"]').val('');
        $form.find('img.wpcf7-captcha-' + i).attr('src', n);
        var match = /([0-9]+)\.(png|gif|jpeg)$/.exec(n);
        $form
          .find('input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]')
          .attr('value', match[1]);
      });
    };
    var refillQuiz = function ($form, items) {
      $.each(items, function (i, n) {
        $form.find(':input[name="' + i + '"]').val('');
        $form
          .find(':input[name="' + i + '"]')
          .siblings('span.wpcf7-quiz-label')
          .text(n[0]);
        $form
          .find('input:hidden[name="_wpcf7_quiz_answer_' + i + '"]')
          .attr('value', n[1]);
      });
    };
    if (typeof data === 'undefined') {
      $.ajax({
        type: 'GET',
        url: wpcf7.apiSettings.getRoute(
          '/contact-forms/' + wpcf7.getId($form) + '/refill'
        ),
        beforeSend: function (xhr) {
          var nonce = $form.find(':input[name="_wpnonce"]').val();
          if (nonce) {
            xhr.setRequestHeader('X-WP-Nonce', nonce);
          }
        },
        dataType: 'json',
      }).done(function (data, status, xhr) {
        if (data.captcha) {
          refillCaptcha($form, data.captcha);
        }
        if (data.quiz) {
          refillQuiz($form, data.quiz);
        }
      });
    } else {
      if (data.captcha) {
        refillCaptcha($form, data.captcha);
      }
      if (data.quiz) {
        refillQuiz($form, data.quiz);
      }
    }
  };
  wpcf7.clearResponse = function (form) {
    var $form = $(form);
    $form.siblings('.screen-reader-response').each(function () {
      $('[role="status"]', this).html('');
      $('ul', this).html('');
    });
    $('.wpcf7-not-valid-tip', $form).remove();
    $('[aria-invalid]', $form).attr('aria-invalid', 'false');
    $('.wpcf7-form-control', $form).removeClass('wpcf7-not-valid');
    $('.wpcf7-response-output', $form).hide().empty();
  };
  wpcf7.apiSettings.getRoute = function (path) {
    var url = wpcf7.apiSettings.root;
    url = url.replace(
      wpcf7.apiSettings.namespace,
      wpcf7.apiSettings.namespace + path
    );
    return url;
  };
})(jQuery);
(function () {
  if (typeof window.CustomEvent === 'function') return false;
  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(
      event,
      params.bubbles,
      params.cancelable,
      params.detail
    );
    return evt;
  }
  CustomEvent.prototype = window.Event.prototype;
  window.CustomEvent = CustomEvent;
})();
(function ($) {
  'use strict';
  var container, button, menu, links, i, len;
  container = document.getElementById('site-navigation');
  if (!container) {
    return;
  }
  button = container.getElementsByTagName('button')[0];
  if ('undefined' === typeof button) {
    return;
  }
  menu = container.getElementsByTagName('ul')[0];
  if ('undefined' === typeof menu) {
    button.style.display = 'none';
    return;
  }
  menu.setAttribute('aria-expanded', 'false');
  if (-1 === menu.className.indexOf('nav-menu')) {
    menu.className += ' nav-menu';
  }
  button.onclick = function () {
    if (-1 !== container.className.indexOf('toggled')) {
      container.className = container.className.replace(' toggled', '');
      button.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-expanded', 'false');
    } else {
      container.className += ' toggled';
      button.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-expanded', 'true');
    }
  };
  links = menu.getElementsByTagName('a');
  for (i = 0, len = links.length; i < len; i++) {
    links[i].addEventListener('focus', toggleFocus, true);
    links[i].addEventListener('blur', toggleFocus, true);
  }
  function toggleFocus() {
    var self = this;
    while (-1 === self.className.indexOf('nav-menu')) {
      if ('li' === self.tagName.toLowerCase()) {
        if (-1 !== self.className.indexOf('focus')) {
          self.className = self.className.replace(' focus', '');
        } else {
          self.className += ' focus';
        }
      }
      self = self.parentElement;
    }
  }
  (function (container) {
    var touchStartFn,
      i,
      parentLink = container.querySelectorAll(
        '.menu-item-has-children > a, .page_item_has_children > a'
      );
    if ('ontouchstart' in window) {
      touchStartFn = function (e) {
        var menuItem = this.parentNode,
          i;
        if (!menuItem.classList.contains('focus')) {
          e.preventDefault();
          for (i = 0; i < menuItem.parentNode.children.length; ++i) {
            if (menuItem === menuItem.parentNode.children[i]) {
              continue;
            }
            menuItem.parentNode.children[i].classList.remove('focus');
          }
          menuItem.classList.add('focus');
        } else {
          menuItem.classList.remove('focus');
        }
      };
      for (i = 0; i < parentLink.length; ++i) {
        parentLink[i].addEventListener('touchstart', touchStartFn, false);
      }
    }
  })(container);
})(jQuery);
(function ($) {
  'use strict';
  var isIe = /(trident|msie)/i.test(navigator.userAgent);
  if (isIe && document.getElementById && window.addEventListener) {
    window.addEventListener(
      'hashchange',
      function () {
        var id = location.hash.substring(1),
          element;
        if (!/^[A-z0-9_-]+$/.test(id)) {
          return;
        }
        element = document.getElementById(id);
        if (element) {
          if (!/^(?:a|select|input|button|textarea)$/i.test(element.tagName)) {
            element.tabIndex = -1;
          }
          element.focus();
        }
      },
      false
    );
  }
})(jQuery);
!(function (n, e) {
  'object' == typeof exports && 'undefined' != typeof module
    ? (module.exports = e())
    : 'function' == typeof define && define.amd
    ? define(e)
    : (n.anime = e());
})(this, function () {
  'use strict';
  var n = {
      update: null,
      begin: null,
      loopBegin: null,
      changeBegin: null,
      change: null,
      changeComplete: null,
      loopComplete: null,
      complete: null,
      loop: 1,
      direction: 'normal',
      autoplay: !0,
      timelineOffset: 0,
    },
    e = {
      duration: 1e3,
      delay: 0,
      endDelay: 0,
      easing: 'easeOutElastic(1, .5)',
      round: 0,
    },
    r = [
      'translateX',
      'translateY',
      'translateZ',
      'rotate',
      'rotateX',
      'rotateY',
      'rotateZ',
      'scale',
      'scaleX',
      'scaleY',
      'scaleZ',
      'skew',
      'skewX',
      'skewY',
      'perspective',
    ],
    t = { CSS: {}, springs: {} };
  function a(n, e, r) {
    return Math.min(Math.max(n, e), r);
  }
  function i(n, e) {
    return n.indexOf(e) > -1;
  }
  function o(n, e) {
    return n.apply(null, e);
  }
  var u = {
    arr: function (n) {
      return Array.isArray(n);
    },
    obj: function (n) {
      return i(Object.prototype.toString.call(n), 'Object');
    },
    pth: function (n) {
      return u.obj(n) && n.hasOwnProperty('totalLength');
    },
    svg: function (n) {
      return n instanceof SVGElement;
    },
    inp: function (n) {
      return n instanceof HTMLInputElement;
    },
    dom: function (n) {
      return n.nodeType || u.svg(n);
    },
    str: function (n) {
      return 'string' == typeof n;
    },
    fnc: function (n) {
      return 'function' == typeof n;
    },
    und: function (n) {
      return void 0 === n;
    },
    hex: function (n) {
      return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(n);
    },
    rgb: function (n) {
      return /^rgb/.test(n);
    },
    hsl: function (n) {
      return /^hsl/.test(n);
    },
    col: function (n) {
      return u.hex(n) || u.rgb(n) || u.hsl(n);
    },
    key: function (r) {
      return (
        !n.hasOwnProperty(r) &&
        !e.hasOwnProperty(r) &&
        'targets' !== r &&
        'keyframes' !== r
      );
    },
  };
  function s(n) {
    var e = /\(([^)]+)\)/.exec(n);
    return e
      ? e[1].split(',').map(function (n) {
          return parseFloat(n);
        })
      : [];
  }
  function c(n, e) {
    var r = s(n),
      i = a(u.und(r[0]) ? 1 : r[0], 0.1, 100),
      o = a(u.und(r[1]) ? 100 : r[1], 0.1, 100),
      c = a(u.und(r[2]) ? 10 : r[2], 0.1, 100),
      f = a(u.und(r[3]) ? 0 : r[3], 0.1, 100),
      l = Math.sqrt(o / i),
      d = c / (2 * Math.sqrt(o * i)),
      p = d < 1 ? l * Math.sqrt(1 - d * d) : 0,
      v = 1,
      h = d < 1 ? (d * l - f) / p : -f + l;
    function g(n) {
      var r = e ? (e * n) / 1e3 : n;
      return (
        (r =
          d < 1
            ? Math.exp(-r * d * l) * (v * Math.cos(p * r) + h * Math.sin(p * r))
            : (v + h * r) * Math.exp(-r * l)),
        0 === n || 1 === n ? n : 1 - r
      );
    }
    return e
      ? g
      : function () {
          var e = t.springs[n];
          if (e) return e;
          for (var r = 0, a = 0; ; )
            if (1 === g((r += 1 / 6))) {
              if (++a >= 16) break;
            } else a = 0;
          var i = r * (1 / 6) * 1e3;
          return (t.springs[n] = i), i;
        };
  }
  function f(n, e) {
    void 0 === n && (n = 1), void 0 === e && (e = 0.5);
    var r = a(n, 1, 10),
      t = a(e, 0.1, 2);
    return function (n) {
      return 0 === n || 1 === n
        ? n
        : -r *
            Math.pow(2, 10 * (n - 1)) *
            Math.sin(
              ((n - 1 - (t / (2 * Math.PI)) * Math.asin(1 / r)) *
                (2 * Math.PI)) /
                t
            );
    };
  }
  function l(n) {
    return (
      void 0 === n && (n = 10),
      function (e) {
        return Math.round(e * n) * (1 / n);
      }
    );
  }
  var d = (function () {
      var n = 11,
        e = 1 / (n - 1);
      function r(n, e) {
        return 1 - 3 * e + 3 * n;
      }
      function t(n, e) {
        return 3 * e - 6 * n;
      }
      function a(n) {
        return 3 * n;
      }
      function i(n, e, i) {
        return ((r(e, i) * n + t(e, i)) * n + a(e)) * n;
      }
      function o(n, e, i) {
        return 3 * r(e, i) * n * n + 2 * t(e, i) * n + a(e);
      }
      return function (r, t, a, u) {
        if (0 <= r && r <= 1 && 0 <= a && a <= 1) {
          var s = new Float32Array(n);
          if (r !== t || a !== u)
            for (var c = 0; c < n; ++c) s[c] = i(c * e, r, a);
          return function (n) {
            return r === t && a === u
              ? n
              : 0 === n || 1 === n
              ? n
              : i(f(n), t, u);
          };
        }
        function f(t) {
          for (var u = 0, c = 1, f = n - 1; c !== f && s[c] <= t; ++c) u += e;
          var l = u + ((t - s[--c]) / (s[c + 1] - s[c])) * e,
            d = o(l, r, a);
          return d >= 0.001
            ? (function (n, e, r, t) {
                for (var a = 0; a < 4; ++a) {
                  var u = o(e, r, t);
                  if (0 === u) return e;
                  e -= (i(e, r, t) - n) / u;
                }
                return e;
              })(t, l, r, a)
            : 0 === d
            ? l
            : (function (n, e, r, t, a) {
                for (
                  var o, u, s = 0;
                  (o = i((u = e + (r - e) / 2), t, a) - n) > 0
                    ? (r = u)
                    : (e = u),
                    Math.abs(o) > 1e-7 && ++s < 10;

                );
                return u;
              })(t, u, u + e, r, a);
        }
      };
    })(),
    p = (function () {
      var n = [
          'Quad',
          'Cubic',
          'Quart',
          'Quint',
          'Sine',
          'Expo',
          'Circ',
          'Back',
          'Elastic',
        ],
        e = {
          In: [
            [0.55, 0.085, 0.68, 0.53],
            [0.55, 0.055, 0.675, 0.19],
            [0.895, 0.03, 0.685, 0.22],
            [0.755, 0.05, 0.855, 0.06],
            [0.47, 0, 0.745, 0.715],
            [0.95, 0.05, 0.795, 0.035],
            [0.6, 0.04, 0.98, 0.335],
            [0.6, -0.28, 0.735, 0.045],
            f,
          ],
          Out: [
            [0.25, 0.46, 0.45, 0.94],
            [0.215, 0.61, 0.355, 1],
            [0.165, 0.84, 0.44, 1],
            [0.23, 1, 0.32, 1],
            [0.39, 0.575, 0.565, 1],
            [0.19, 1, 0.22, 1],
            [0.075, 0.82, 0.165, 1],
            [0.175, 0.885, 0.32, 1.275],
            function (n, e) {
              return function (r) {
                return 1 - f(n, e)(1 - r);
              };
            },
          ],
          InOut: [
            [0.455, 0.03, 0.515, 0.955],
            [0.645, 0.045, 0.355, 1],
            [0.77, 0, 0.175, 1],
            [0.86, 0, 0.07, 1],
            [0.445, 0.05, 0.55, 0.95],
            [1, 0, 0, 1],
            [0.785, 0.135, 0.15, 0.86],
            [0.68, -0.55, 0.265, 1.55],
            function (n, e) {
              return function (r) {
                return r < 0.5
                  ? f(n, e)(2 * r) / 2
                  : 1 - f(n, e)(-2 * r + 2) / 2;
              };
            },
          ],
        },
        r = { linear: [0.25, 0.25, 0.75, 0.75] },
        t = function (t) {
          e[t].forEach(function (e, a) {
            r['ease' + t + n[a]] = e;
          });
        };
      for (var a in e) t(a);
      return r;
    })();
  function v(n, e) {
    if (u.fnc(n)) return n;
    var r = n.split('(')[0],
      t = p[r],
      a = s(n);
    switch (r) {
      case 'spring':
        return c(n, e);
      case 'cubicBezier':
        return o(d, a);
      case 'steps':
        return o(l, a);
      default:
        return u.fnc(t) ? o(t, a) : o(d, t);
    }
  }
  function h(n) {
    try {
      return document.querySelectorAll(n);
    } catch (n) {
      return;
    }
  }
  function g(n, e) {
    for (
      var r = n.length,
        t = arguments.length >= 2 ? arguments[1] : void 0,
        a = [],
        i = 0;
      i < r;
      i++
    )
      if (i in n) {
        var o = n[i];
        e.call(t, o, i, n) && a.push(o);
      }
    return a;
  }
  function m(n) {
    return n.reduce(function (n, e) {
      return n.concat(u.arr(e) ? m(e) : e);
    }, []);
  }
  function y(n) {
    return u.arr(n)
      ? n
      : (u.str(n) && (n = h(n) || n),
        n instanceof NodeList || n instanceof HTMLCollection
          ? [].slice.call(n)
          : [n]);
  }
  function b(n, e) {
    return n.some(function (n) {
      return n === e;
    });
  }
  function x(n) {
    var e = {};
    for (var r in n) e[r] = n[r];
    return e;
  }
  function M(n, e) {
    var r = x(n);
    for (var t in n) r[t] = e.hasOwnProperty(t) ? e[t] : n[t];
    return r;
  }
  function w(n, e) {
    var r = x(n);
    for (var t in e) r[t] = u.und(n[t]) ? e[t] : n[t];
    return r;
  }
  function k(n) {
    return u.rgb(n)
      ? (r = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec((e = n)))
        ? 'rgba(' + r[1] + ',1)'
        : e
      : u.hex(n)
      ? ((t = n.replace(
          /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
          function (n, e, r, t) {
            return e + e + r + r + t + t;
          }
        )),
        (a = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(t)),
        'rgba(' +
          parseInt(a[1], 16) +
          ',' +
          parseInt(a[2], 16) +
          ',' +
          parseInt(a[3], 16) +
          ',1)')
      : u.hsl(n)
      ? (function (n) {
          var e,
            r,
            t,
            a =
              /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(n) ||
              /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(n),
            i = parseInt(a[1], 10) / 360,
            o = parseInt(a[2], 10) / 100,
            u = parseInt(a[3], 10) / 100,
            s = a[4] || 1;
          function c(n, e, r) {
            return (
              r < 0 && (r += 1),
              r > 1 && (r -= 1),
              r < 1 / 6
                ? n + 6 * (e - n) * r
                : r < 0.5
                ? e
                : r < 2 / 3
                ? n + (e - n) * (2 / 3 - r) * 6
                : n
            );
          }
          if (0 == o) e = r = t = u;
          else {
            var f = u < 0.5 ? u * (1 + o) : u + o - u * o,
              l = 2 * u - f;
            (e = c(l, f, i + 1 / 3)),
              (r = c(l, f, i)),
              (t = c(l, f, i - 1 / 3));
          }
          return (
            'rgba(' + 255 * e + ',' + 255 * r + ',' + 255 * t + ',' + s + ')'
          );
        })(n)
      : void 0;
    var e, r, t, a;
  }
  function C(n) {
    var e = /([\+\-]?[0-9#\.]+)(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(
      n
    );
    if (e) return e[2];
  }
  function O(n, e) {
    return u.fnc(n) ? n(e.target, e.id, e.total) : n;
  }
  function P(n, e) {
    return n.getAttribute(e);
  }
  function I(n, e, r) {
    if (b([r, 'deg', 'rad', 'turn'], C(e))) return e;
    var a = t.CSS[e + r];
    if (!u.und(a)) return a;
    var i = document.createElement(n.tagName),
      o =
        n.parentNode && n.parentNode !== document
          ? n.parentNode
          : document.body;
    o.appendChild(i),
      (i.style.position = 'absolute'),
      (i.style.width = 100 + r);
    var s = 100 / i.offsetWidth;
    o.removeChild(i);
    var c = s * parseFloat(e);
    return (t.CSS[e + r] = c), c;
  }
  function B(n, e, r) {
    if (e in n.style) {
      var t = e.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
        a = n.style[e] || getComputedStyle(n).getPropertyValue(t) || '0';
      return r ? I(n, a, r) : a;
    }
  }
  function D(n, e) {
    return u.dom(n) && !u.inp(n) && (P(n, e) || (u.svg(n) && n[e]))
      ? 'attribute'
      : u.dom(n) && b(r, e)
      ? 'transform'
      : u.dom(n) && 'transform' !== e && B(n, e)
      ? 'css'
      : null != n[e]
      ? 'object'
      : void 0;
  }
  function T(n) {
    if (u.dom(n)) {
      for (
        var e,
          r = n.style.transform || '',
          t = /(\w+)\(([^)]*)\)/g,
          a = new Map();
        (e = t.exec(r));

      )
        a.set(e[1], e[2]);
      return a;
    }
  }
  function F(n, e, r, t) {
    var a,
      o = i(e, 'scale')
        ? 1
        : 0 +
          (i((a = e), 'translate') || 'perspective' === a
            ? 'px'
            : i(a, 'rotate') || i(a, 'skew')
            ? 'deg'
            : void 0),
      u = T(n).get(e) || o;
    return (
      r && (r.transforms.list.set(e, u), (r.transforms.last = e)),
      t ? I(n, u, t) : u
    );
  }
  function N(n, e, r, t) {
    switch (D(n, e)) {
      case 'transform':
        return F(n, e, t, r);
      case 'css':
        return B(n, e, r);
      case 'attribute':
        return P(n, e);
      default:
        return n[e] || 0;
    }
  }
  function A(n, e) {
    var r = /^(\*=|\+=|-=)/.exec(n);
    if (!r) return n;
    var t = C(n) || 0,
      a = parseFloat(e),
      i = parseFloat(n.replace(r[0], ''));
    switch (r[0][0]) {
      case '+':
        return a + i + t;
      case '-':
        return a - i + t;
      case '*':
        return a * i + t;
    }
  }
  function E(n, e) {
    if (u.col(n)) return k(n);
    var r = C(n),
      t = r ? n.substr(0, n.length - r.length) : n;
    return e && !/\s/g.test(n) ? t + e : t;
  }
  function L(n, e) {
    return Math.sqrt(Math.pow(e.x - n.x, 2) + Math.pow(e.y - n.y, 2));
  }
  function S(n) {
    for (var e, r = n.points, t = 0, a = 0; a < r.numberOfItems; a++) {
      var i = r.getItem(a);
      a > 0 && (t += L(e, i)), (e = i);
    }
    return t;
  }
  function j(n) {
    if (n.getTotalLength) return n.getTotalLength();
    switch (n.tagName.toLowerCase()) {
      case 'circle':
        return (i = n), 2 * Math.PI * P(i, 'r');
      case 'rect':
        return 2 * P((a = n), 'width') + 2 * P(a, 'height');
      case 'line':
        return L(
          { x: P((t = n), 'x1'), y: P(t, 'y1') },
          { x: P(t, 'x2'), y: P(t, 'y2') }
        );
      case 'polyline':
        return S(n);
      case 'polygon':
        return (
          (r = (e = n).points),
          S(e) + L(r.getItem(r.numberOfItems - 1), r.getItem(0))
        );
    }
    var e, r, t, a, i;
  }
  function q(n, e) {
    var r = e || {},
      t =
        r.el ||
        (function (n) {
          for (
            var e = n.parentNode;
            u.svg(e) && ((e = e.parentNode), u.svg(e.parentNode));

          );
          return e;
        })(n),
      a = t.getBoundingClientRect(),
      i = P(t, 'viewBox'),
      o = a.width,
      s = a.height,
      c = r.viewBox || (i ? i.split(' ') : [0, 0, o, s]);
    return {
      el: t,
      viewBox: c,
      x: c[0] / 1,
      y: c[1] / 1,
      w: o / c[2],
      h: s / c[3],
    };
  }
  function $(n, e) {
    function r(r) {
      void 0 === r && (r = 0);
      var t = e + r >= 1 ? e + r : 0;
      return n.el.getPointAtLength(t);
    }
    var t = q(n.el, n.svg),
      a = r(),
      i = r(-1),
      o = r(1);
    switch (n.property) {
      case 'x':
        return (a.x - t.x) * t.w;
      case 'y':
        return (a.y - t.y) * t.h;
      case 'angle':
        return (180 * Math.atan2(o.y - i.y, o.x - i.x)) / Math.PI;
    }
  }
  function X(n, e) {
    var r = /-?\d*\.?\d+/g,
      t = E(u.pth(n) ? n.totalLength : n, e) + '';
    return {
      original: t,
      numbers: t.match(r) ? t.match(r).map(Number) : [0],
      strings: u.str(n) || e ? t.split(r) : [],
    };
  }
  function Y(n) {
    return g(n ? m(u.arr(n) ? n.map(y) : y(n)) : [], function (n, e, r) {
      return r.indexOf(n) === e;
    });
  }
  function Z(n) {
    var e = Y(n);
    return e.map(function (n, r) {
      return { target: n, id: r, total: e.length, transforms: { list: T(n) } };
    });
  }
  function Q(n, e) {
    var r = x(e);
    if ((/^spring/.test(r.easing) && (r.duration = c(r.easing)), u.arr(n))) {
      var t = n.length;
      2 === t && !u.obj(n[0])
        ? (n = { value: n })
        : u.fnc(e.duration) || (r.duration = e.duration / t);
    }
    var a = u.arr(n) ? n : [n];
    return a
      .map(function (n, r) {
        var t = u.obj(n) && !u.pth(n) ? n : { value: n };
        return (
          u.und(t.delay) && (t.delay = r ? 0 : e.delay),
          u.und(t.endDelay) &&
            (t.endDelay = r === a.length - 1 ? e.endDelay : 0),
          t
        );
      })
      .map(function (n) {
        return w(n, r);
      });
  }
  function V(n, e) {
    var r = [],
      t = e.keyframes;
    for (var a in (t &&
      (e = w(
        (function (n) {
          for (
            var e = g(
                m(
                  n.map(function (n) {
                    return Object.keys(n);
                  })
                ),
                function (n) {
                  return u.key(n);
                }
              ).reduce(function (n, e) {
                return n.indexOf(e) < 0 && n.push(e), n;
              }, []),
              r = {},
              t = function (t) {
                var a = e[t];
                r[a] = n.map(function (n) {
                  var e = {};
                  for (var r in n)
                    u.key(r) ? r == a && (e.value = n[r]) : (e[r] = n[r]);
                  return e;
                });
              },
              a = 0;
            a < e.length;
            a++
          )
            t(a);
          return r;
        })(t),
        e
      )),
    e))
      u.key(a) && r.push({ name: a, tweens: Q(e[a], n) });
    return r;
  }
  function z(n, e) {
    var r;
    return n.tweens.map(function (t) {
      var a = (function (n, e) {
          var r = {};
          for (var t in n) {
            var a = O(n[t], e);
            u.arr(a) &&
              1 ===
                (a = a.map(function (n) {
                  return O(n, e);
                })).length &&
              (a = a[0]),
              (r[t] = a);
          }
          return (
            (r.duration = parseFloat(r.duration)),
            (r.delay = parseFloat(r.delay)),
            r
          );
        })(t, e),
        i = a.value,
        o = u.arr(i) ? i[1] : i,
        s = C(o),
        c = N(e.target, n.name, s, e),
        f = r ? r.to.original : c,
        l = u.arr(i) ? i[0] : f,
        d = C(l) || C(c),
        p = s || d;
      return (
        u.und(o) && (o = f),
        (a.from = X(l, p)),
        (a.to = X(A(o, l), p)),
        (a.start = r ? r.end : 0),
        (a.end = a.start + a.delay + a.duration + a.endDelay),
        (a.easing = v(a.easing, a.duration)),
        (a.isPath = u.pth(i)),
        (a.isColor = u.col(a.from.original)),
        a.isColor && (a.round = 1),
        (r = a),
        a
      );
    });
  }
  var H = {
    css: function (n, e, r) {
      return (n.style[e] = r);
    },
    attribute: function (n, e, r) {
      return n.setAttribute(e, r);
    },
    object: function (n, e, r) {
      return (n[e] = r);
    },
    transform: function (n, e, r, t, a) {
      if ((t.list.set(e, r), e === t.last || a)) {
        var i = '';
        t.list.forEach(function (n, e) {
          i += e + '(' + n + ') ';
        }),
          (n.style.transform = i);
      }
    },
  };
  function G(n, e) {
    Z(n).forEach(function (n) {
      for (var r in e) {
        var t = O(e[r], n),
          a = n.target,
          i = C(t),
          o = N(a, r, i, n),
          u = A(E(t, i || C(o)), o),
          s = D(a, r);
        H[s](a, r, u, n.transforms, !0);
      }
    });
  }
  function R(n, e) {
    return g(
      m(
        n.map(function (n) {
          return e.map(function (e) {
            return (function (n, e) {
              var r = D(n.target, e.name);
              if (r) {
                var t = z(e, n),
                  a = t[t.length - 1];
                return {
                  type: r,
                  property: e.name,
                  animatable: n,
                  tweens: t,
                  duration: a.end,
                  delay: t[0].delay,
                  endDelay: a.endDelay,
                };
              }
            })(n, e);
          });
        })
      ),
      function (n) {
        return !u.und(n);
      }
    );
  }
  function W(n, e) {
    var r = n.length,
      t = function (n) {
        return n.timelineOffset ? n.timelineOffset : 0;
      },
      a = {};
    return (
      (a.duration = r
        ? Math.max.apply(
            Math,
            n.map(function (n) {
              return t(n) + n.duration;
            })
          )
        : e.duration),
      (a.delay = r
        ? Math.min.apply(
            Math,
            n.map(function (n) {
              return t(n) + n.delay;
            })
          )
        : e.delay),
      (a.endDelay = r
        ? a.duration -
          Math.max.apply(
            Math,
            n.map(function (n) {
              return t(n) + n.duration - n.endDelay;
            })
          )
        : e.endDelay),
      a
    );
  }
  var J = 0;
  var K,
    U = [],
    _ = [],
    nn = (function () {
      function n() {
        K = requestAnimationFrame(e);
      }
      function e(e) {
        var r = U.length;
        if (r) {
          for (var t = 0; t < r; ) {
            var a = U[t];
            if (a.paused) {
              var i = U.indexOf(a);
              i > -1 && (U.splice(i, 1), (r = U.length));
            } else a.tick(e);
            t++;
          }
          n();
        } else K = cancelAnimationFrame(K);
      }
      return n;
    })();
  function en(r) {
    void 0 === r && (r = {});
    var t,
      i = 0,
      o = 0,
      u = 0,
      s = 0,
      c = null;
    function f() {
      return (
        window.Promise &&
        new Promise(function (n) {
          return (c = n);
        })
      );
    }
    var l,
      d,
      p,
      v,
      h,
      m,
      y,
      b,
      x = f(),
      k =
        ((d = M(n, (l = r))),
        (p = M(e, l)),
        (v = V(p, l)),
        (h = Z(l.targets)),
        (m = R(h, v)),
        (y = W(m, p)),
        (b = J),
        J++,
        w(d, {
          id: b,
          children: [],
          animatables: h,
          animations: m,
          duration: y.duration,
          delay: y.delay,
          endDelay: y.endDelay,
        }));
    function C() {
      (k.reversed = !k.reversed),
        t.forEach(function (n) {
          return (n.reversed = k.reversed);
        });
    }
    function O(n) {
      return k.reversed ? k.duration - n : n;
    }
    function P() {
      (i = 0), (o = O(k.currentTime) * (1 / en.speed));
    }
    function I(n, e) {
      e && e.seek(n - e.timelineOffset);
    }
    function B(n) {
      for (var e = 0, r = k.animations, t = r.length; e < t; ) {
        var i = r[e],
          o = i.animatable,
          u = i.tweens,
          s = u.length - 1,
          c = u[s];
        s &&
          (c =
            g(u, function (e) {
              return n < e.end;
            })[0] || c);
        for (
          var f = a(n - c.start - c.delay, 0, c.duration) / c.duration,
            l = isNaN(f) ? 1 : c.easing(f),
            d = c.to.strings,
            p = c.round,
            v = [],
            h = c.to.numbers.length,
            m = void 0,
            y = 0;
          y < h;
          y++
        ) {
          var b = void 0,
            x = c.to.numbers[y],
            M = c.from.numbers[y] || 0;
          (b = c.isPath ? $(c.value, l * x) : M + l * (x - M)),
            p && ((c.isColor && y > 2) || (b = Math.round(b * p) / p)),
            v.push(b);
        }
        var w = d.length;
        if (w) {
          m = d[0];
          for (var C = 0; C < w; C++) {
            d[C];
            var O = d[C + 1],
              P = v[C];
            isNaN(P) || (m += O ? P + O : P + ' ');
          }
        } else m = v[0];
        H[i.type](o.target, i.property, m, o.transforms),
          (i.currentValue = m),
          e++;
      }
    }
    function D(n) {
      k[n] && !k.passThrough && k[n](k);
    }
    function T(n) {
      var e = k.duration,
        r = k.delay,
        l = e - k.endDelay,
        d = O(n);
      (k.progress = a((d / e) * 100, 0, 100)),
        (k.reversePlayback = d < k.currentTime),
        t &&
          (function (n) {
            if (k.reversePlayback) for (var e = s; e--; ) I(n, t[e]);
            else for (var r = 0; r < s; r++) I(n, t[r]);
          })(d),
        !k.began &&
          k.currentTime > 0 &&
          ((k.began = !0), D('begin'), D('loopBegin')),
        d <= r && 0 !== k.currentTime && B(0),
        ((d >= l && k.currentTime !== e) || !e) && B(e),
        d > r && d < l
          ? (k.changeBegan ||
              ((k.changeBegan = !0),
              (k.changeCompleted = !1),
              D('changeBegin')),
            D('change'),
            B(d))
          : k.changeBegan &&
            ((k.changeCompleted = !0),
            (k.changeBegan = !1),
            D('changeComplete')),
        (k.currentTime = a(d, 0, e)),
        k.began && D('update'),
        n >= e &&
          ((o = 0),
          k.remaining && !0 !== k.remaining && k.remaining--,
          k.remaining
            ? ((i = u),
              D('loopComplete'),
              D('loopBegin'),
              'alternate' === k.direction && C())
            : ((k.paused = !0),
              k.completed ||
                ((k.completed = !0),
                D('loopComplete'),
                D('complete'),
                'Promise' in window && (c(), (x = f())))));
    }
    return (
      (k.reset = function () {
        var n = k.direction;
        (k.passThrough = !1),
          (k.currentTime = 0),
          (k.progress = 0),
          (k.paused = !0),
          (k.began = !1),
          (k.changeBegan = !1),
          (k.completed = !1),
          (k.changeCompleted = !1),
          (k.reversePlayback = !1),
          (k.reversed = 'reverse' === n),
          (k.remaining = k.loop),
          (t = k.children);
        for (var e = (s = t.length); e--; ) k.children[e].reset();
        ((k.reversed && !0 !== k.loop) ||
          ('alternate' === n && 1 === k.loop)) &&
          k.remaining++,
          B(0);
      }),
      (k.set = function (n, e) {
        return G(n, e), k;
      }),
      (k.tick = function (n) {
        (u = n), i || (i = u), T((u + (o - i)) * en.speed);
      }),
      (k.seek = function (n) {
        T(O(n));
      }),
      (k.pause = function () {
        (k.paused = !0), P();
      }),
      (k.play = function () {
        k.paused && ((k.paused = !1), U.push(k), P(), K || nn());
      }),
      (k.reverse = function () {
        C(), P();
      }),
      (k.restart = function () {
        k.reset(), k.play();
      }),
      (k.finished = x),
      k.reset(),
      k.autoplay && k.play(),
      k
    );
  }
  function rn(n, e) {
    for (var r = e.length; r--; )
      b(n, e[r].animatable.target) && e.splice(r, 1);
  }
  return (
    document.addEventListener('visibilitychange', function () {
      document.hidden
        ? (U.forEach(function (n) {
            return n.pause();
          }),
          (_ = U.slice(0)),
          (U = []))
        : _.forEach(function (n) {
            return n.play();
          });
    }),
    (en.version = '3.0.0'),
    (en.speed = 1),
    (en.running = U),
    (en.remove = function (n) {
      for (var e = Y(n), r = U.length; r--; ) {
        var t = U[r],
          a = t.animations,
          i = t.children;
        rn(e, a);
        for (var o = i.length; o--; ) {
          var u = i[o],
            s = u.animations;
          rn(e, s), s.length || u.children.length || i.splice(o, 1);
        }
        a.length || i.length || t.pause();
      }
    }),
    (en.get = N),
    (en.set = G),
    (en.convertPx = I),
    (en.path = function (n, e) {
      var r = u.str(n) ? h(n)[0] : n,
        t = e || 100;
      return function (n) {
        return { property: n, el: r, svg: q(r), totalLength: j(r) * (t / 100) };
      };
    }),
    (en.setDashoffset = function (n) {
      var e = j(n);
      return n.setAttribute('stroke-dasharray', e), e;
    }),
    (en.stagger = function (n, e) {
      void 0 === e && (e = {});
      var r = e.direction || 'normal',
        t = e.easing ? v(e.easing) : null,
        a = e.grid,
        i = e.axis,
        o = e.from || 0,
        s = 'first' === o,
        c = 'center' === o,
        f = 'last' === o,
        l = u.arr(n),
        d = l ? parseFloat(n[0]) : parseFloat(n),
        p = l ? parseFloat(n[1]) : 0,
        h = C(l ? n[1] : n) || 0,
        g = e.start || 0 + (l ? d : 0),
        m = [],
        y = 0;
      return function (n, e, u) {
        if (
          (s && (o = 0), c && (o = (u - 1) / 2), f && (o = u - 1), !m.length)
        ) {
          for (var v = 0; v < u; v++) {
            if (a) {
              var b = c ? (a[0] - 1) / 2 : o % a[0],
                x = c ? (a[1] - 1) / 2 : Math.floor(o / a[0]),
                M = b - (v % a[0]),
                w = x - Math.floor(v / a[0]),
                k = Math.sqrt(M * M + w * w);
              'x' === i && (k = -M), 'y' === i && (k = -w), m.push(k);
            } else m.push(Math.abs(o - v));
            y = Math.max.apply(Math, m);
          }
          t &&
            (m = m.map(function (n) {
              return t(n / y) * y;
            })),
            'reverse' === r &&
              (m = m.map(function (n) {
                return i ? (n < 0 ? -1 * n : -n) : Math.abs(y - n);
              }));
        }
        return g + (l ? (p - d) / y : d) * (Math.round(100 * m[e]) / 100) + h;
      };
    }),
    (en.timeline = function (n) {
      void 0 === n && (n = {});
      var r = en(n);
      return (
        (r.duration = 0),
        (r.add = function (t, a) {
          var i = U.indexOf(r),
            o = r.children;
          function s(n) {
            n.passThrough = !0;
          }
          i > -1 && U.splice(i, 1);
          for (var c = 0; c < o.length; c++) s(o[c]);
          var f = w(t, M(e, n));
          f.targets = f.targets || n.targets;
          var l = r.duration;
          (f.autoplay = !1),
            (f.direction = r.direction),
            (f.timelineOffset = u.und(a) ? l : A(a, l)),
            s(r),
            r.seek(f.timelineOffset);
          var d = en(f);
          s(d), o.push(d);
          var p = W(o, n);
          return (
            (r.delay = p.delay),
            (r.endDelay = p.endDelay),
            (r.duration = p.duration),
            r.seek(0),
            r.reset(),
            r.autoplay && r.play(),
            r
          );
        }),
        r
      );
    }),
    (en.easing = v),
    (en.penner = p),
    (en.random = function (n, e) {
      return Math.floor(Math.random() * (e - n + 1)) + n;
    }),
    en
  );
});

!(function (e, t) {
  'object' == typeof exports && 'undefined' != typeof module
    ? (module.exports = t())
    : 'function' == typeof define && define.amd
    ? define(t)
    : ((e = e || self).Swiper = t());
})(this, function () {
  'use strict';
  var e =
      'undefined' == typeof document
        ? {
            body: {},
            addEventListener: function () {},
            removeEventListener: function () {},
            activeElement: { blur: function () {}, nodeName: '' },
            querySelector: function () {
              return null;
            },
            querySelectorAll: function () {
              return [];
            },
            getElementById: function () {
              return null;
            },
            createEvent: function () {
              return { initEvent: function () {} };
            },
            createElement: function () {
              return {
                children: [],
                childNodes: [],
                style: {},
                setAttribute: function () {},
                getElementsByTagName: function () {
                  return [];
                },
              };
            },
            location: { hash: '' },
          }
        : document,
    t =
      'undefined' == typeof window
        ? {
            document: e,
            navigator: { userAgent: '' },
            location: {},
            history: {},
            CustomEvent: function () {
              return this;
            },
            addEventListener: function () {},
            removeEventListener: function () {},
            getComputedStyle: function () {
              return {
                getPropertyValue: function () {
                  return '';
                },
              };
            },
            Image: function () {},
            Date: function () {},
            screen: {},
            setTimeout: function () {},
            clearTimeout: function () {},
          }
        : window,
    i = function (e) {
      for (var t = 0; t < e.length; t += 1) this[t] = e[t];
      return (this.length = e.length), this;
    };
  function s(s, a) {
    var r = [],
      n = 0;
    if (s && !a && s instanceof i) return s;
    if (s)
      if ('string' == typeof s) {
        var o,
          l,
          d = s.trim();
        if (d.indexOf('<') >= 0 && d.indexOf('>') >= 0) {
          var h = 'div';
          for (
            0 === d.indexOf('<li') && (h = 'ul'),
              0 === d.indexOf('<tr') && (h = 'tbody'),
              (0 !== d.indexOf('<td') && 0 !== d.indexOf('<th')) || (h = 'tr'),
              0 === d.indexOf('<tbody') && (h = 'table'),
              0 === d.indexOf('<option') && (h = 'select'),
              (l = e.createElement(h)).innerHTML = d,
              n = 0;
            n < l.childNodes.length;
            n += 1
          )
            r.push(l.childNodes[n]);
        } else
          for (
            o =
              a || '#' !== s[0] || s.match(/[ .<>:~]/)
                ? (a || e).querySelectorAll(s.trim())
                : [e.getElementById(s.trim().split('#')[1])],
              n = 0;
            n < o.length;
            n += 1
          )
            o[n] && r.push(o[n]);
      } else if (s.nodeType || s === t || s === e) r.push(s);
      else if (s.length > 0 && s[0].nodeType)
        for (n = 0; n < s.length; n += 1) r.push(s[n]);
    return new i(r);
  }
  function a(e) {
    for (var t = [], i = 0; i < e.length; i += 1)
      -1 === t.indexOf(e[i]) && t.push(e[i]);
    return t;
  }
  (s.fn = i.prototype), (s.Class = i), (s.Dom7 = i);
  var r = {
    addClass: function (e) {
      if (void 0 === e) return this;
      for (var t = e.split(' '), i = 0; i < t.length; i += 1)
        for (var s = 0; s < this.length; s += 1)
          void 0 !== this[s] &&
            void 0 !== this[s].classList &&
            this[s].classList.add(t[i]);
      return this;
    },
    removeClass: function (e) {
      for (var t = e.split(' '), i = 0; i < t.length; i += 1)
        for (var s = 0; s < this.length; s += 1)
          void 0 !== this[s] &&
            void 0 !== this[s].classList &&
            this[s].classList.remove(t[i]);
      return this;
    },
    hasClass: function (e) {
      return !!this[0] && this[0].classList.contains(e);
    },
    toggleClass: function (e) {
      for (var t = e.split(' '), i = 0; i < t.length; i += 1)
        for (var s = 0; s < this.length; s += 1)
          void 0 !== this[s] &&
            void 0 !== this[s].classList &&
            this[s].classList.toggle(t[i]);
      return this;
    },
    attr: function (e, t) {
      var i = arguments;
      if (1 === arguments.length && 'string' == typeof e)
        return this[0] ? this[0].getAttribute(e) : void 0;
      for (var s = 0; s < this.length; s += 1)
        if (2 === i.length) this[s].setAttribute(e, t);
        else
          for (var a in e) (this[s][a] = e[a]), this[s].setAttribute(a, e[a]);
      return this;
    },
    removeAttr: function (e) {
      for (var t = 0; t < this.length; t += 1) this[t].removeAttribute(e);
      return this;
    },
    data: function (e, t) {
      var i;
      if (void 0 !== t) {
        for (var s = 0; s < this.length; s += 1)
          (i = this[s]).dom7ElementDataStorage ||
            (i.dom7ElementDataStorage = {}),
            (i.dom7ElementDataStorage[e] = t);
        return this;
      }
      if ((i = this[0])) {
        if (i.dom7ElementDataStorage && e in i.dom7ElementDataStorage)
          return i.dom7ElementDataStorage[e];
        var a = i.getAttribute('data-' + e);
        return a || void 0;
      }
    },
    transform: function (e) {
      for (var t = 0; t < this.length; t += 1) {
        var i = this[t].style;
        (i.webkitTransform = e), (i.transform = e);
      }
      return this;
    },
    transition: function (e) {
      'string' != typeof e && (e += 'ms');
      for (var t = 0; t < this.length; t += 1) {
        var i = this[t].style;
        (i.webkitTransitionDuration = e), (i.transitionDuration = e);
      }
      return this;
    },
    on: function () {
      for (var e, t = [], i = arguments.length; i--; ) t[i] = arguments[i];
      var a = t[0],
        r = t[1],
        n = t[2],
        o = t[3];
      function l(e) {
        var t = e.target;
        if (t) {
          var i = e.target.dom7EventData || [];
          if ((i.indexOf(e) < 0 && i.unshift(e), s(t).is(r))) n.apply(t, i);
          else
            for (var a = s(t).parents(), o = 0; o < a.length; o += 1)
              s(a[o]).is(r) && n.apply(a[o], i);
        }
      }
      function d(e) {
        var t = (e && e.target && e.target.dom7EventData) || [];
        t.indexOf(e) < 0 && t.unshift(e), n.apply(this, t);
      }
      'function' == typeof t[1] &&
        ((a = (e = t)[0]), (n = e[1]), (o = e[2]), (r = void 0)),
        o || (o = !1);
      for (var h, p = a.split(' '), c = 0; c < this.length; c += 1) {
        var u = this[c];
        if (r)
          for (h = 0; h < p.length; h += 1) {
            var v = p[h];
            u.dom7LiveListeners || (u.dom7LiveListeners = {}),
              u.dom7LiveListeners[v] || (u.dom7LiveListeners[v] = []),
              u.dom7LiveListeners[v].push({ listener: n, proxyListener: l }),
              u.addEventListener(v, l, o);
          }
        else
          for (h = 0; h < p.length; h += 1) {
            var f = p[h];
            u.dom7Listeners || (u.dom7Listeners = {}),
              u.dom7Listeners[f] || (u.dom7Listeners[f] = []),
              u.dom7Listeners[f].push({ listener: n, proxyListener: d }),
              u.addEventListener(f, d, o);
          }
      }
      return this;
    },
    off: function () {
      for (var e, t = [], i = arguments.length; i--; ) t[i] = arguments[i];
      var s = t[0],
        a = t[1],
        r = t[2],
        n = t[3];
      'function' == typeof t[1] &&
        ((s = (e = t)[0]), (r = e[1]), (n = e[2]), (a = void 0)),
        n || (n = !1);
      for (var o = s.split(' '), l = 0; l < o.length; l += 1)
        for (var d = o[l], h = 0; h < this.length; h += 1) {
          var p = this[h],
            c = void 0;
          if (
            (!a && p.dom7Listeners
              ? (c = p.dom7Listeners[d])
              : a && p.dom7LiveListeners && (c = p.dom7LiveListeners[d]),
            c && c.length)
          )
            for (var u = c.length - 1; u >= 0; u -= 1) {
              var v = c[u];
              r && v.listener === r
                ? (p.removeEventListener(d, v.proxyListener, n), c.splice(u, 1))
                : r &&
                  v.listener &&
                  v.listener.dom7proxy &&
                  v.listener.dom7proxy === r
                ? (p.removeEventListener(d, v.proxyListener, n), c.splice(u, 1))
                : r ||
                  (p.removeEventListener(d, v.proxyListener, n),
                  c.splice(u, 1));
            }
        }
      return this;
    },
    trigger: function () {
      for (var i = [], s = arguments.length; s--; ) i[s] = arguments[s];
      for (var a = i[0].split(' '), r = i[1], n = 0; n < a.length; n += 1)
        for (var o = a[n], l = 0; l < this.length; l += 1) {
          var d = this[l],
            h = void 0;
          try {
            h = new t.CustomEvent(o, {
              detail: r,
              bubbles: !0,
              cancelable: !0,
            });
          } catch (t) {
            (h = e.createEvent('Event')).initEvent(o, !0, !0), (h.detail = r);
          }
          (d.dom7EventData = i.filter(function (e, t) {
            return t > 0;
          })),
            d.dispatchEvent(h),
            (d.dom7EventData = []),
            delete d.dom7EventData;
        }
      return this;
    },
    transitionEnd: function (e) {
      var t,
        i = ['webkitTransitionEnd', 'transitionend'],
        s = this;
      function a(r) {
        if (r.target === this)
          for (e.call(this, r), t = 0; t < i.length; t += 1) s.off(i[t], a);
      }
      if (e) for (t = 0; t < i.length; t += 1) s.on(i[t], a);
      return this;
    },
    outerWidth: function (e) {
      if (this.length > 0) {
        if (e) {
          var t = this.styles();
          return (
            this[0].offsetWidth +
            parseFloat(t.getPropertyValue('margin-right')) +
            parseFloat(t.getPropertyValue('margin-left'))
          );
        }
        return this[0].offsetWidth;
      }
      return null;
    },
    outerHeight: function (e) {
      if (this.length > 0) {
        if (e) {
          var t = this.styles();
          return (
            this[0].offsetHeight +
            parseFloat(t.getPropertyValue('margin-top')) +
            parseFloat(t.getPropertyValue('margin-bottom'))
          );
        }
        return this[0].offsetHeight;
      }
      return null;
    },
    offset: function () {
      if (this.length > 0) {
        var i = this[0],
          s = i.getBoundingClientRect(),
          a = e.body,
          r = i.clientTop || a.clientTop || 0,
          n = i.clientLeft || a.clientLeft || 0,
          o = i === t ? t.scrollY : i.scrollTop,
          l = i === t ? t.scrollX : i.scrollLeft;
        return { top: s.top + o - r, left: s.left + l - n };
      }
      return null;
    },
    css: function (e, i) {
      var s;
      if (1 === arguments.length) {
        if ('string' != typeof e) {
          for (s = 0; s < this.length; s += 1)
            for (var a in e) this[s].style[a] = e[a];
          return this;
        }
        if (this[0])
          return t.getComputedStyle(this[0], null).getPropertyValue(e);
      }
      if (2 === arguments.length && 'string' == typeof e) {
        for (s = 0; s < this.length; s += 1) this[s].style[e] = i;
        return this;
      }
      return this;
    },
    each: function (e) {
      if (!e) return this;
      for (var t = 0; t < this.length; t += 1)
        if (!1 === e.call(this[t], t, this[t])) return this;
      return this;
    },
    html: function (e) {
      if (void 0 === e) return this[0] ? this[0].innerHTML : void 0;
      for (var t = 0; t < this.length; t += 1) this[t].innerHTML = e;
      return this;
    },
    text: function (e) {
      if (void 0 === e) return this[0] ? this[0].textContent.trim() : null;
      for (var t = 0; t < this.length; t += 1) this[t].textContent = e;
      return this;
    },
    is: function (a) {
      var r,
        n,
        o = this[0];
      if (!o || void 0 === a) return !1;
      if ('string' == typeof a) {
        if (o.matches) return o.matches(a);
        if (o.webkitMatchesSelector) return o.webkitMatchesSelector(a);
        if (o.msMatchesSelector) return o.msMatchesSelector(a);
        for (r = s(a), n = 0; n < r.length; n += 1) if (r[n] === o) return !0;
        return !1;
      }
      if (a === e) return o === e;
      if (a === t) return o === t;
      if (a.nodeType || a instanceof i) {
        for (r = a.nodeType ? [a] : a, n = 0; n < r.length; n += 1)
          if (r[n] === o) return !0;
        return !1;
      }
      return !1;
    },
    index: function () {
      var e,
        t = this[0];
      if (t) {
        for (e = 0; null !== (t = t.previousSibling); )
          1 === t.nodeType && (e += 1);
        return e;
      }
    },
    eq: function (e) {
      if (void 0 === e) return this;
      var t,
        s = this.length;
      return new i(
        e > s - 1 ? [] : e < 0 ? ((t = s + e) < 0 ? [] : [this[t]]) : [this[e]]
      );
    },
    append: function () {
      for (var t, s = [], a = arguments.length; a--; ) s[a] = arguments[a];
      for (var r = 0; r < s.length; r += 1) {
        t = s[r];
        for (var n = 0; n < this.length; n += 1)
          if ('string' == typeof t) {
            var o = e.createElement('div');
            for (o.innerHTML = t; o.firstChild; )
              this[n].appendChild(o.firstChild);
          } else if (t instanceof i)
            for (var l = 0; l < t.length; l += 1) this[n].appendChild(t[l]);
          else this[n].appendChild(t);
      }
      return this;
    },
    prepend: function (t) {
      var s, a;
      for (s = 0; s < this.length; s += 1)
        if ('string' == typeof t) {
          var r = e.createElement('div');
          for (r.innerHTML = t, a = r.childNodes.length - 1; a >= 0; a -= 1)
            this[s].insertBefore(r.childNodes[a], this[s].childNodes[0]);
        } else if (t instanceof i)
          for (a = 0; a < t.length; a += 1)
            this[s].insertBefore(t[a], this[s].childNodes[0]);
        else this[s].insertBefore(t, this[s].childNodes[0]);
      return this;
    },
    next: function (e) {
      return this.length > 0
        ? e
          ? this[0].nextElementSibling && s(this[0].nextElementSibling).is(e)
            ? new i([this[0].nextElementSibling])
            : new i([])
          : this[0].nextElementSibling
          ? new i([this[0].nextElementSibling])
          : new i([])
        : new i([]);
    },
    nextAll: function (e) {
      var t = [],
        a = this[0];
      if (!a) return new i([]);
      for (; a.nextElementSibling; ) {
        var r = a.nextElementSibling;
        e ? s(r).is(e) && t.push(r) : t.push(r), (a = r);
      }
      return new i(t);
    },
    prev: function (e) {
      if (this.length > 0) {
        var t = this[0];
        return e
          ? t.previousElementSibling && s(t.previousElementSibling).is(e)
            ? new i([t.previousElementSibling])
            : new i([])
          : t.previousElementSibling
          ? new i([t.previousElementSibling])
          : new i([]);
      }
      return new i([]);
    },
    prevAll: function (e) {
      var t = [],
        a = this[0];
      if (!a) return new i([]);
      for (; a.previousElementSibling; ) {
        var r = a.previousElementSibling;
        e ? s(r).is(e) && t.push(r) : t.push(r), (a = r);
      }
      return new i(t);
    },
    parent: function (e) {
      for (var t = [], i = 0; i < this.length; i += 1)
        null !== this[i].parentNode &&
          (e
            ? s(this[i].parentNode).is(e) && t.push(this[i].parentNode)
            : t.push(this[i].parentNode));
      return s(a(t));
    },
    parents: function (e) {
      for (var t = [], i = 0; i < this.length; i += 1)
        for (var r = this[i].parentNode; r; )
          e ? s(r).is(e) && t.push(r) : t.push(r), (r = r.parentNode);
      return s(a(t));
    },
    closest: function (e) {
      var t = this;
      return void 0 === e
        ? new i([])
        : (t.is(e) || (t = t.parents(e).eq(0)), t);
    },
    find: function (e) {
      for (var t = [], s = 0; s < this.length; s += 1)
        for (var a = this[s].querySelectorAll(e), r = 0; r < a.length; r += 1)
          t.push(a[r]);
      return new i(t);
    },
    children: function (e) {
      for (var t = [], r = 0; r < this.length; r += 1)
        for (var n = this[r].childNodes, o = 0; o < n.length; o += 1)
          e
            ? 1 === n[o].nodeType && s(n[o]).is(e) && t.push(n[o])
            : 1 === n[o].nodeType && t.push(n[o]);
      return new i(a(t));
    },
    filter: function (e) {
      for (var t = [], s = 0; s < this.length; s += 1)
        e.call(this[s], s, this[s]) && t.push(this[s]);
      return new i(t);
    },
    remove: function () {
      for (var e = 0; e < this.length; e += 1)
        this[e].parentNode && this[e].parentNode.removeChild(this[e]);
      return this;
    },
    add: function () {
      for (var e = [], t = arguments.length; t--; ) e[t] = arguments[t];
      var i, a;
      for (i = 0; i < e.length; i += 1) {
        var r = s(e[i]);
        for (a = 0; a < r.length; a += 1)
          (this[this.length] = r[a]), (this.length += 1);
      }
      return this;
    },
    styles: function () {
      return this[0] ? t.getComputedStyle(this[0], null) : {};
    },
  };
  Object.keys(r).forEach(function (e) {
    s.fn[e] = s.fn[e] || r[e];
  });
  var n = {
      deleteProps: function (e) {
        var t = e;
        Object.keys(t).forEach(function (e) {
          try {
            t[e] = null;
          } catch (e) {}
          try {
            delete t[e];
          } catch (e) {}
        });
      },
      nextTick: function (e, t) {
        return void 0 === t && (t = 0), setTimeout(e, t);
      },
      now: function () {
        return Date.now();
      },
      getTranslate: function (e, i) {
        var s, a, r;
        void 0 === i && (i = 'x');
        var n = t.getComputedStyle(e, null);
        return (
          t.WebKitCSSMatrix
            ? ((a = n.transform || n.webkitTransform).split(',').length > 6 &&
                (a = a
                  .split(', ')
                  .map(function (e) {
                    return e.replace(',', '.');
                  })
                  .join(', ')),
              (r = new t.WebKitCSSMatrix('none' === a ? '' : a)))
            : (s = (r =
                n.MozTransform ||
                n.OTransform ||
                n.MsTransform ||
                n.msTransform ||
                n.transform ||
                n
                  .getPropertyValue('transform')
                  .replace('translate(', 'matrix(1, 0, 0, 1,'))
                .toString()
                .split(',')),
          'x' === i &&
            (a = t.WebKitCSSMatrix
              ? r.m41
              : 16 === s.length
              ? parseFloat(s[12])
              : parseFloat(s[4])),
          'y' === i &&
            (a = t.WebKitCSSMatrix
              ? r.m42
              : 16 === s.length
              ? parseFloat(s[13])
              : parseFloat(s[5])),
          a || 0
        );
      },
      parseUrlQuery: function (e) {
        var i,
          s,
          a,
          r,
          n = {},
          o = e || t.location.href;
        if ('string' == typeof o && o.length)
          for (
            r = (s = (o = o.indexOf('?') > -1 ? o.replace(/\S*\?/, '') : '')
              .split('&')
              .filter(function (e) {
                return '' !== e;
              })).length,
              i = 0;
            i < r;
            i += 1
          )
            (a = s[i].replace(/#\S+/g, '').split('=')),
              (n[decodeURIComponent(a[0])] =
                void 0 === a[1] ? void 0 : decodeURIComponent(a[1]) || '');
        return n;
      },
      isObject: function (e) {
        return (
          'object' == typeof e &&
          null !== e &&
          e.constructor &&
          e.constructor === Object
        );
      },
      extend: function () {
        for (var e = [], t = arguments.length; t--; ) e[t] = arguments[t];
        for (var i = Object(e[0]), s = 1; s < e.length; s += 1) {
          var a = e[s];
          if (null != a)
            for (
              var r = Object.keys(Object(a)), o = 0, l = r.length;
              o < l;
              o += 1
            ) {
              var d = r[o],
                h = Object.getOwnPropertyDescriptor(a, d);
              void 0 !== h &&
                h.enumerable &&
                (n.isObject(i[d]) && n.isObject(a[d])
                  ? n.extend(i[d], a[d])
                  : !n.isObject(i[d]) && n.isObject(a[d])
                  ? ((i[d] = {}), n.extend(i[d], a[d]))
                  : (i[d] = a[d]));
            }
        }
        return i;
      },
    },
    o = {
      touch:
        (t.Modernizr && !0 === t.Modernizr.touch) ||
        !!(
          t.navigator.maxTouchPoints > 0 ||
          'ontouchstart' in t ||
          (t.DocumentTouch && e instanceof t.DocumentTouch)
        ),
      pointerEvents:
        !!t.PointerEvent &&
        'maxTouchPoints' in t.navigator &&
        t.navigator.maxTouchPoints > 0,
      observer: 'MutationObserver' in t || 'WebkitMutationObserver' in t,
      passiveListener: (function () {
        var e = !1;
        try {
          var i = Object.defineProperty({}, 'passive', {
            get: function () {
              e = !0;
            },
          });
          t.addEventListener('testPassiveListener', null, i);
        } catch (e) {}
        return e;
      })(),
      gestures: 'ongesturestart' in t,
    },
    l = function (e) {
      void 0 === e && (e = {});
      var t = this;
      (t.params = e),
        (t.eventsListeners = {}),
        t.params &&
          t.params.on &&
          Object.keys(t.params.on).forEach(function (e) {
            t.on(e, t.params.on[e]);
          });
    },
    d = { components: { configurable: !0 } };
  (l.prototype.on = function (e, t, i) {
    var s = this;
    if ('function' != typeof t) return s;
    var a = i ? 'unshift' : 'push';
    return (
      e.split(' ').forEach(function (e) {
        s.eventsListeners[e] || (s.eventsListeners[e] = []),
          s.eventsListeners[e][a](t);
      }),
      s
    );
  }),
    (l.prototype.once = function (e, t, i) {
      var s = this;
      if ('function' != typeof t) return s;
      function a() {
        for (var i = [], r = arguments.length; r--; ) i[r] = arguments[r];
        s.off(e, a), a.f7proxy && delete a.f7proxy, t.apply(s, i);
      }
      return (a.f7proxy = t), s.on(e, a, i);
    }),
    (l.prototype.off = function (e, t) {
      var i = this;
      return i.eventsListeners
        ? (e.split(' ').forEach(function (e) {
            void 0 === t
              ? (i.eventsListeners[e] = [])
              : i.eventsListeners[e] &&
                i.eventsListeners[e].length &&
                i.eventsListeners[e].forEach(function (s, a) {
                  (s === t || (s.f7proxy && s.f7proxy === t)) &&
                    i.eventsListeners[e].splice(a, 1);
                });
          }),
          i)
        : i;
    }),
    (l.prototype.emit = function () {
      for (var e = [], t = arguments.length; t--; ) e[t] = arguments[t];
      var i,
        s,
        a,
        r = this;
      if (!r.eventsListeners) return r;
      'string' == typeof e[0] || Array.isArray(e[0])
        ? ((i = e[0]), (s = e.slice(1, e.length)), (a = r))
        : ((i = e[0].events), (s = e[0].data), (a = e[0].context || r));
      var n = Array.isArray(i) ? i : i.split(' ');
      return (
        n.forEach(function (e) {
          if (r.eventsListeners && r.eventsListeners[e]) {
            var t = [];
            r.eventsListeners[e].forEach(function (e) {
              t.push(e);
            }),
              t.forEach(function (e) {
                e.apply(a, s);
              });
          }
        }),
        r
      );
    }),
    (l.prototype.useModulesParams = function (e) {
      var t = this;
      t.modules &&
        Object.keys(t.modules).forEach(function (i) {
          var s = t.modules[i];
          s.params && n.extend(e, s.params);
        });
    }),
    (l.prototype.useModules = function (e) {
      void 0 === e && (e = {});
      var t = this;
      t.modules &&
        Object.keys(t.modules).forEach(function (i) {
          var s = t.modules[i],
            a = e[i] || {};
          s.instance &&
            Object.keys(s.instance).forEach(function (e) {
              var i = s.instance[e];
              t[e] = 'function' == typeof i ? i.bind(t) : i;
            }),
            s.on &&
              t.on &&
              Object.keys(s.on).forEach(function (e) {
                t.on(e, s.on[e]);
              }),
            s.create && s.create.bind(t)(a);
        });
    }),
    (d.components.set = function (e) {
      this.use && this.use(e);
    }),
    (l.installModule = function (e) {
      for (var t = [], i = arguments.length - 1; i-- > 0; )
        t[i] = arguments[i + 1];
      var s = this;
      s.prototype.modules || (s.prototype.modules = {});
      var a = e.name || Object.keys(s.prototype.modules).length + '_' + n.now();
      return (
        (s.prototype.modules[a] = e),
        e.proto &&
          Object.keys(e.proto).forEach(function (t) {
            s.prototype[t] = e.proto[t];
          }),
        e.static &&
          Object.keys(e.static).forEach(function (t) {
            s[t] = e.static[t];
          }),
        e.install && e.install.apply(s, t),
        s
      );
    }),
    (l.use = function (e) {
      for (var t = [], i = arguments.length - 1; i-- > 0; )
        t[i] = arguments[i + 1];
      var s = this;
      return Array.isArray(e)
        ? (e.forEach(function (e) {
            return s.installModule(e);
          }),
          s)
        : s.installModule.apply(s, [e].concat(t));
    }),
    Object.defineProperties(l, d);
  var h = {
    updateSize: function () {
      var e,
        t,
        i = this.$el;
      (e = void 0 !== this.params.width ? this.params.width : i[0].clientWidth),
        (t =
          void 0 !== this.params.height
            ? this.params.height
            : i[0].clientHeight),
        (0 === e && this.isHorizontal()) ||
          (0 === t && this.isVertical()) ||
          ((e =
            e -
            parseInt(i.css('padding-left'), 10) -
            parseInt(i.css('padding-right'), 10)),
          (t =
            t -
            parseInt(i.css('padding-top'), 10) -
            parseInt(i.css('padding-bottom'), 10)),
          n.extend(this, {
            width: e,
            height: t,
            size: this.isHorizontal() ? e : t,
          }));
    },
    updateSlides: function () {
      var e = this.params,
        i = this.$wrapperEl,
        s = this.size,
        a = this.rtlTranslate,
        r = this.wrongRTL,
        o = this.virtual && e.virtual.enabled,
        l = o ? this.virtual.slides.length : this.slides.length,
        d = i.children('.' + this.params.slideClass),
        h = o ? this.virtual.slides.length : d.length,
        p = [],
        c = [],
        u = [];
      function v(t) {
        return !e.cssMode || t !== d.length - 1;
      }
      var f = e.slidesOffsetBefore;
      'function' == typeof f && (f = e.slidesOffsetBefore.call(this));
      var m = e.slidesOffsetAfter;
      'function' == typeof m && (m = e.slidesOffsetAfter.call(this));
      var g = this.snapGrid.length,
        b = this.snapGrid.length,
        w = e.spaceBetween,
        y = -f,
        x = 0,
        T = 0;
      if (void 0 !== s) {
        var E, S;
        'string' == typeof w &&
          w.indexOf('%') >= 0 &&
          (w = (parseFloat(w.replace('%', '')) / 100) * s),
          (this.virtualSize = -w),
          a
            ? d.css({ marginLeft: '', marginTop: '' })
            : d.css({ marginRight: '', marginBottom: '' }),
          e.slidesPerColumn > 1 &&
            ((E =
              Math.floor(h / e.slidesPerColumn) ===
              h / this.params.slidesPerColumn
                ? h
                : Math.ceil(h / e.slidesPerColumn) * e.slidesPerColumn),
            'auto' !== e.slidesPerView &&
              'row' === e.slidesPerColumnFill &&
              (E = Math.max(E, e.slidesPerView * e.slidesPerColumn)));
        for (
          var C,
            M = e.slidesPerColumn,
            P = E / M,
            z = Math.floor(h / e.slidesPerColumn),
            k = 0;
          k < h;
          k += 1
        ) {
          S = 0;
          var $ = d.eq(k);
          if (e.slidesPerColumn > 1) {
            var L = void 0,
              I = void 0,
              D = void 0;
            if ('row' === e.slidesPerColumnFill && e.slidesPerGroup > 1) {
              var O = Math.floor(k / (e.slidesPerGroup * e.slidesPerColumn)),
                A = k - e.slidesPerColumn * e.slidesPerGroup * O,
                G =
                  0 === O
                    ? e.slidesPerGroup
                    : Math.min(
                        Math.ceil((h - O * M * e.slidesPerGroup) / M),
                        e.slidesPerGroup
                      );
              (L =
                (I = A - (D = Math.floor(A / G)) * G + O * e.slidesPerGroup) +
                (D * E) / M),
                $.css({
                  '-webkit-box-ordinal-group': L,
                  '-moz-box-ordinal-group': L,
                  '-ms-flex-order': L,
                  '-webkit-order': L,
                  order: L,
                });
            } else
              'column' === e.slidesPerColumnFill
                ? ((D = k - (I = Math.floor(k / M)) * M),
                  (I > z || (I === z && D === M - 1)) &&
                    (D += 1) >= M &&
                    ((D = 0), (I += 1)))
                : (I = k - (D = Math.floor(k / P)) * P);
            $.css(
              'margin-' + (this.isHorizontal() ? 'top' : 'left'),
              0 !== D && e.spaceBetween && e.spaceBetween + 'px'
            );
          }
          if ('none' !== $.css('display')) {
            if ('auto' === e.slidesPerView) {
              var H = t.getComputedStyle($[0], null),
                B = $[0].style.transform,
                N = $[0].style.webkitTransform;
              if (
                (B && ($[0].style.transform = 'none'),
                N && ($[0].style.webkitTransform = 'none'),
                e.roundLengths)
              )
                S = this.isHorizontal() ? $.outerWidth(!0) : $.outerHeight(!0);
              else if (this.isHorizontal()) {
                var X = parseFloat(H.getPropertyValue('width')),
                  V = parseFloat(H.getPropertyValue('padding-left')),
                  Y = parseFloat(H.getPropertyValue('padding-right')),
                  F = parseFloat(H.getPropertyValue('margin-left')),
                  W = parseFloat(H.getPropertyValue('margin-right')),
                  R = H.getPropertyValue('box-sizing');
                S = R && 'border-box' === R ? X + F + W : X + V + Y + F + W;
              } else {
                var q = parseFloat(H.getPropertyValue('height')),
                  j = parseFloat(H.getPropertyValue('padding-top')),
                  K = parseFloat(H.getPropertyValue('padding-bottom')),
                  U = parseFloat(H.getPropertyValue('margin-top')),
                  _ = parseFloat(H.getPropertyValue('margin-bottom')),
                  Z = H.getPropertyValue('box-sizing');
                S = Z && 'border-box' === Z ? q + U + _ : q + j + K + U + _;
              }
              B && ($[0].style.transform = B),
                N && ($[0].style.webkitTransform = N),
                e.roundLengths && (S = Math.floor(S));
            } else
              (S = (s - (e.slidesPerView - 1) * w) / e.slidesPerView),
                e.roundLengths && (S = Math.floor(S)),
                d[k] &&
                  (this.isHorizontal()
                    ? (d[k].style.width = S + 'px')
                    : (d[k].style.height = S + 'px'));
            d[k] && (d[k].swiperSlideSize = S),
              u.push(S),
              e.centeredSlides
                ? ((y = y + S / 2 + x / 2 + w),
                  0 === x && 0 !== k && (y = y - s / 2 - w),
                  0 === k && (y = y - s / 2 - w),
                  Math.abs(y) < 0.001 && (y = 0),
                  e.roundLengths && (y = Math.floor(y)),
                  T % e.slidesPerGroup == 0 && p.push(y),
                  c.push(y))
                : (e.roundLengths && (y = Math.floor(y)),
                  (T - Math.min(this.params.slidesPerGroupSkip, T)) %
                    this.params.slidesPerGroup ==
                    0 && p.push(y),
                  c.push(y),
                  (y = y + S + w)),
              (this.virtualSize += S + w),
              (x = S),
              (T += 1);
          }
        }
        if (
          ((this.virtualSize = Math.max(this.virtualSize, s) + m),
          a &&
            r &&
            ('slide' === e.effect || 'coverflow' === e.effect) &&
            i.css({ width: this.virtualSize + e.spaceBetween + 'px' }),
          e.setWrapperSize &&
            (this.isHorizontal()
              ? i.css({ width: this.virtualSize + e.spaceBetween + 'px' })
              : i.css({ height: this.virtualSize + e.spaceBetween + 'px' })),
          e.slidesPerColumn > 1 &&
            ((this.virtualSize = (S + e.spaceBetween) * E),
            (this.virtualSize =
              Math.ceil(this.virtualSize / e.slidesPerColumn) - e.spaceBetween),
            this.isHorizontal()
              ? i.css({ width: this.virtualSize + e.spaceBetween + 'px' })
              : i.css({ height: this.virtualSize + e.spaceBetween + 'px' }),
            e.centeredSlides))
        ) {
          C = [];
          for (var Q = 0; Q < p.length; Q += 1) {
            var J = p[Q];
            e.roundLengths && (J = Math.floor(J)),
              p[Q] < this.virtualSize + p[0] && C.push(J);
          }
          p = C;
        }
        if (!e.centeredSlides) {
          C = [];
          for (var ee = 0; ee < p.length; ee += 1) {
            var te = p[ee];
            e.roundLengths && (te = Math.floor(te)),
              p[ee] <= this.virtualSize - s && C.push(te);
          }
          (p = C),
            Math.floor(this.virtualSize - s) - Math.floor(p[p.length - 1]) >
              1 && p.push(this.virtualSize - s);
        }
        if (
          (0 === p.length && (p = [0]),
          0 !== e.spaceBetween &&
            (this.isHorizontal()
              ? a
                ? d.filter(v).css({ marginLeft: w + 'px' })
                : d.filter(v).css({ marginRight: w + 'px' })
              : d.filter(v).css({ marginBottom: w + 'px' })),
          e.centeredSlides && e.centeredSlidesBounds)
        ) {
          var ie = 0;
          u.forEach(function (t) {
            ie += t + (e.spaceBetween ? e.spaceBetween : 0);
          });
          var se = (ie -= e.spaceBetween) - s;
          p = p.map(function (e) {
            return e < 0 ? -f : e > se ? se + m : e;
          });
        }
        if (e.centerInsufficientSlides) {
          var ae = 0;
          if (
            (u.forEach(function (t) {
              ae += t + (e.spaceBetween ? e.spaceBetween : 0);
            }),
            (ae -= e.spaceBetween) < s)
          ) {
            var re = (s - ae) / 2;
            p.forEach(function (e, t) {
              p[t] = e - re;
            }),
              c.forEach(function (e, t) {
                c[t] = e + re;
              });
          }
        }
        n.extend(this, {
          slides: d,
          snapGrid: p,
          slidesGrid: c,
          slidesSizesGrid: u,
        }),
          h !== l && this.emit('slidesLengthChange'),
          p.length !== g &&
            (this.params.watchOverflow && this.checkOverflow(),
            this.emit('snapGridLengthChange')),
          c.length !== b && this.emit('slidesGridLengthChange'),
          (e.watchSlidesProgress || e.watchSlidesVisibility) &&
            this.updateSlidesOffset();
      }
    },
    updateAutoHeight: function (e) {
      var t,
        i = [],
        s = 0;
      if (
        ('number' == typeof e
          ? this.setTransition(e)
          : !0 === e && this.setTransition(this.params.speed),
        'auto' !== this.params.slidesPerView && this.params.slidesPerView > 1)
      )
        if (this.params.centeredSlides) i.push.apply(i, this.visibleSlides);
        else
          for (t = 0; t < Math.ceil(this.params.slidesPerView); t += 1) {
            var a = this.activeIndex + t;
            if (a > this.slides.length) break;
            i.push(this.slides.eq(a)[0]);
          }
      else i.push(this.slides.eq(this.activeIndex)[0]);
      for (t = 0; t < i.length; t += 1)
        if (void 0 !== i[t]) {
          var r = i[t].offsetHeight;
          s = r > s ? r : s;
        }
      s && this.$wrapperEl.css('height', s + 'px');
    },
    updateSlidesOffset: function () {
      for (var e = this.slides, t = 0; t < e.length; t += 1)
        e[t].swiperSlideOffset = this.isHorizontal()
          ? e[t].offsetLeft
          : e[t].offsetTop;
    },
    updateSlidesProgress: function (e) {
      void 0 === e && (e = (this && this.translate) || 0);
      var t = this.params,
        i = this.slides,
        a = this.rtlTranslate;
      if (0 !== i.length) {
        void 0 === i[0].swiperSlideOffset && this.updateSlidesOffset();
        var r = -e;
        a && (r = e),
          i.removeClass(t.slideVisibleClass),
          (this.visibleSlidesIndexes = []),
          (this.visibleSlides = []);
        for (var n = 0; n < i.length; n += 1) {
          var o = i[n],
            l =
              (r +
                (t.centeredSlides ? this.minTranslate() : 0) -
                o.swiperSlideOffset) /
              (o.swiperSlideSize + t.spaceBetween);
          if (t.watchSlidesVisibility || (t.centeredSlides && t.autoHeight)) {
            var d = -(r - o.swiperSlideOffset),
              h = d + this.slidesSizesGrid[n];
            ((d >= 0 && d < this.size - 1) ||
              (h > 1 && h <= this.size) ||
              (d <= 0 && h >= this.size)) &&
              (this.visibleSlides.push(o),
              this.visibleSlidesIndexes.push(n),
              i.eq(n).addClass(t.slideVisibleClass));
          }
          o.progress = a ? -l : l;
        }
        this.visibleSlides = s(this.visibleSlides);
      }
    },
    updateProgress: function (e) {
      if (void 0 === e) {
        var t = this.rtlTranslate ? -1 : 1;
        e = (this && this.translate && this.translate * t) || 0;
      }
      var i = this.params,
        s = this.maxTranslate() - this.minTranslate(),
        a = this.progress,
        r = this.isBeginning,
        o = this.isEnd,
        l = r,
        d = o;
      0 === s
        ? ((a = 0), (r = !0), (o = !0))
        : ((r = (a = (e - this.minTranslate()) / s) <= 0), (o = a >= 1)),
        n.extend(this, { progress: a, isBeginning: r, isEnd: o }),
        (i.watchSlidesProgress ||
          i.watchSlidesVisibility ||
          (i.centeredSlides && i.autoHeight)) &&
          this.updateSlidesProgress(e),
        r && !l && this.emit('reachBeginning toEdge'),
        o && !d && this.emit('reachEnd toEdge'),
        ((l && !r) || (d && !o)) && this.emit('fromEdge'),
        this.emit('progress', a);
    },
    updateSlidesClasses: function () {
      var e,
        t = this.slides,
        i = this.params,
        s = this.$wrapperEl,
        a = this.activeIndex,
        r = this.realIndex,
        n = this.virtual && i.virtual.enabled;
      t.removeClass(
        i.slideActiveClass +
          ' ' +
          i.slideNextClass +
          ' ' +
          i.slidePrevClass +
          ' ' +
          i.slideDuplicateActiveClass +
          ' ' +
          i.slideDuplicateNextClass +
          ' ' +
          i.slideDuplicatePrevClass
      ),
        (e = n
          ? this.$wrapperEl.find(
              '.' + i.slideClass + '[data-swiper-slide-index="' + a + '"]'
            )
          : t.eq(a)).addClass(i.slideActiveClass),
        i.loop &&
          (e.hasClass(i.slideDuplicateClass)
            ? s
                .children(
                  '.' +
                    i.slideClass +
                    ':not(.' +
                    i.slideDuplicateClass +
                    ')[data-swiper-slide-index="' +
                    r +
                    '"]'
                )
                .addClass(i.slideDuplicateActiveClass)
            : s
                .children(
                  '.' +
                    i.slideClass +
                    '.' +
                    i.slideDuplicateClass +
                    '[data-swiper-slide-index="' +
                    r +
                    '"]'
                )
                .addClass(i.slideDuplicateActiveClass));
      var o = e
        .nextAll('.' + i.slideClass)
        .eq(0)
        .addClass(i.slideNextClass);
      i.loop && 0 === o.length && (o = t.eq(0)).addClass(i.slideNextClass);
      var l = e
        .prevAll('.' + i.slideClass)
        .eq(0)
        .addClass(i.slidePrevClass);
      i.loop && 0 === l.length && (l = t.eq(-1)).addClass(i.slidePrevClass),
        i.loop &&
          (o.hasClass(i.slideDuplicateClass)
            ? s
                .children(
                  '.' +
                    i.slideClass +
                    ':not(.' +
                    i.slideDuplicateClass +
                    ')[data-swiper-slide-index="' +
                    o.attr('data-swiper-slide-index') +
                    '"]'
                )
                .addClass(i.slideDuplicateNextClass)
            : s
                .children(
                  '.' +
                    i.slideClass +
                    '.' +
                    i.slideDuplicateClass +
                    '[data-swiper-slide-index="' +
                    o.attr('data-swiper-slide-index') +
                    '"]'
                )
                .addClass(i.slideDuplicateNextClass),
          l.hasClass(i.slideDuplicateClass)
            ? s
                .children(
                  '.' +
                    i.slideClass +
                    ':not(.' +
                    i.slideDuplicateClass +
                    ')[data-swiper-slide-index="' +
                    l.attr('data-swiper-slide-index') +
                    '"]'
                )
                .addClass(i.slideDuplicatePrevClass)
            : s
                .children(
                  '.' +
                    i.slideClass +
                    '.' +
                    i.slideDuplicateClass +
                    '[data-swiper-slide-index="' +
                    l.attr('data-swiper-slide-index') +
                    '"]'
                )
                .addClass(i.slideDuplicatePrevClass));
    },
    updateActiveIndex: function (e) {
      var t,
        i = this.rtlTranslate ? this.translate : -this.translate,
        s = this.slidesGrid,
        a = this.snapGrid,
        r = this.params,
        o = this.activeIndex,
        l = this.realIndex,
        d = this.snapIndex,
        h = e;
      if (void 0 === h) {
        for (var p = 0; p < s.length; p += 1)
          void 0 !== s[p + 1]
            ? i >= s[p] && i < s[p + 1] - (s[p + 1] - s[p]) / 2
              ? (h = p)
              : i >= s[p] && i < s[p + 1] && (h = p + 1)
            : i >= s[p] && (h = p);
        r.normalizeSlideIndex && (h < 0 || void 0 === h) && (h = 0);
      }
      if (a.indexOf(i) >= 0) t = a.indexOf(i);
      else {
        var c = Math.min(r.slidesPerGroupSkip, h);
        t = c + Math.floor((h - c) / r.slidesPerGroup);
      }
      if ((t >= a.length && (t = a.length - 1), h !== o)) {
        var u = parseInt(
          this.slides.eq(h).attr('data-swiper-slide-index') || h,
          10
        );
        n.extend(this, {
          snapIndex: t,
          realIndex: u,
          previousIndex: o,
          activeIndex: h,
        }),
          this.emit('activeIndexChange'),
          this.emit('snapIndexChange'),
          l !== u && this.emit('realIndexChange'),
          (this.initialized || this.runCallbacksOnInit) &&
            this.emit('slideChange');
      } else t !== d && ((this.snapIndex = t), this.emit('snapIndexChange'));
    },
    updateClickedSlide: function (e) {
      var t = this.params,
        i = s(e.target).closest('.' + t.slideClass)[0],
        a = !1;
      if (i)
        for (var r = 0; r < this.slides.length; r += 1)
          this.slides[r] === i && (a = !0);
      if (!i || !a)
        return (this.clickedSlide = void 0), void (this.clickedIndex = void 0);
      (this.clickedSlide = i),
        this.virtual && this.params.virtual.enabled
          ? (this.clickedIndex = parseInt(
              s(i).attr('data-swiper-slide-index'),
              10
            ))
          : (this.clickedIndex = s(i).index()),
        t.slideToClickedSlide &&
          void 0 !== this.clickedIndex &&
          this.clickedIndex !== this.activeIndex &&
          this.slideToClickedSlide();
    },
  };
  var p = {
    getTranslate: function (e) {
      void 0 === e && (e = this.isHorizontal() ? 'x' : 'y');
      var t = this.params,
        i = this.rtlTranslate,
        s = this.translate,
        a = this.$wrapperEl;
      if (t.virtualTranslate) return i ? -s : s;
      if (t.cssMode) return s;
      var r = n.getTranslate(a[0], e);
      return i && (r = -r), r || 0;
    },
    setTranslate: function (e, t) {
      var i = this.rtlTranslate,
        s = this.params,
        a = this.$wrapperEl,
        r = this.wrapperEl,
        n = this.progress,
        o = 0,
        l = 0;
      this.isHorizontal() ? (o = i ? -e : e) : (l = e),
        s.roundLengths && ((o = Math.floor(o)), (l = Math.floor(l))),
        s.cssMode
          ? (r[
              this.isHorizontal() ? 'scrollLeft' : 'scrollTop'
            ] = this.isHorizontal() ? -o : -l)
          : s.virtualTranslate ||
            a.transform('translate3d(' + o + 'px, ' + l + 'px, 0px)'),
        (this.previousTranslate = this.translate),
        (this.translate = this.isHorizontal() ? o : l);
      var d = this.maxTranslate() - this.minTranslate();
      (0 === d ? 0 : (e - this.minTranslate()) / d) !== n &&
        this.updateProgress(e),
        this.emit('setTranslate', this.translate, t);
    },
    minTranslate: function () {
      return -this.snapGrid[0];
    },
    maxTranslate: function () {
      return -this.snapGrid[this.snapGrid.length - 1];
    },
    translateTo: function (e, t, i, s, a) {
      var r;
      void 0 === e && (e = 0),
        void 0 === t && (t = this.params.speed),
        void 0 === i && (i = !0),
        void 0 === s && (s = !0);
      var n = this,
        o = n.params,
        l = n.wrapperEl;
      if (n.animating && o.preventInteractionOnTransition) return !1;
      var d,
        h = n.minTranslate(),
        p = n.maxTranslate();
      if (
        ((d = s && e > h ? h : s && e < p ? p : e),
        n.updateProgress(d),
        o.cssMode)
      ) {
        var c = n.isHorizontal();
        return (
          0 === t
            ? (l[c ? 'scrollLeft' : 'scrollTop'] = -d)
            : l.scrollTo
            ? l.scrollTo(
                (((r = {})[c ? 'left' : 'top'] = -d),
                (r.behavior = 'smooth'),
                r)
              )
            : (l[c ? 'scrollLeft' : 'scrollTop'] = -d),
          !0
        );
      }
      return (
        0 === t
          ? (n.setTransition(0),
            n.setTranslate(d),
            i &&
              (n.emit('beforeTransitionStart', t, a), n.emit('transitionEnd')))
          : (n.setTransition(t),
            n.setTranslate(d),
            i &&
              (n.emit('beforeTransitionStart', t, a),
              n.emit('transitionStart')),
            n.animating ||
              ((n.animating = !0),
              n.onTranslateToWrapperTransitionEnd ||
                (n.onTranslateToWrapperTransitionEnd = function (e) {
                  n &&
                    !n.destroyed &&
                    e.target === this &&
                    (n.$wrapperEl[0].removeEventListener(
                      'transitionend',
                      n.onTranslateToWrapperTransitionEnd
                    ),
                    n.$wrapperEl[0].removeEventListener(
                      'webkitTransitionEnd',
                      n.onTranslateToWrapperTransitionEnd
                    ),
                    (n.onTranslateToWrapperTransitionEnd = null),
                    delete n.onTranslateToWrapperTransitionEnd,
                    i && n.emit('transitionEnd'));
                }),
              n.$wrapperEl[0].addEventListener(
                'transitionend',
                n.onTranslateToWrapperTransitionEnd
              ),
              n.$wrapperEl[0].addEventListener(
                'webkitTransitionEnd',
                n.onTranslateToWrapperTransitionEnd
              ))),
        !0
      );
    },
  };
  var c = {
    setTransition: function (e, t) {
      this.params.cssMode || this.$wrapperEl.transition(e),
        this.emit('setTransition', e, t);
    },
    transitionStart: function (e, t) {
      void 0 === e && (e = !0);
      var i = this.activeIndex,
        s = this.params,
        a = this.previousIndex;
      if (!s.cssMode) {
        s.autoHeight && this.updateAutoHeight();
        var r = t;
        if (
          (r || (r = i > a ? 'next' : i < a ? 'prev' : 'reset'),
          this.emit('transitionStart'),
          e && i !== a)
        ) {
          if ('reset' === r) return void this.emit('slideResetTransitionStart');
          this.emit('slideChangeTransitionStart'),
            'next' === r
              ? this.emit('slideNextTransitionStart')
              : this.emit('slidePrevTransitionStart');
        }
      }
    },
    transitionEnd: function (e, t) {
      void 0 === e && (e = !0);
      var i = this.activeIndex,
        s = this.previousIndex,
        a = this.params;
      if (((this.animating = !1), !a.cssMode)) {
        this.setTransition(0);
        var r = t;
        if (
          (r || (r = i > s ? 'next' : i < s ? 'prev' : 'reset'),
          this.emit('transitionEnd'),
          e && i !== s)
        ) {
          if ('reset' === r) return void this.emit('slideResetTransitionEnd');
          this.emit('slideChangeTransitionEnd'),
            'next' === r
              ? this.emit('slideNextTransitionEnd')
              : this.emit('slidePrevTransitionEnd');
        }
      }
    },
  };
  var u = {
    slideTo: function (e, t, i, s) {
      var a;
      void 0 === e && (e = 0),
        void 0 === t && (t = this.params.speed),
        void 0 === i && (i = !0);
      var r = this,
        n = e;
      n < 0 && (n = 0);
      var o = r.params,
        l = r.snapGrid,
        d = r.slidesGrid,
        h = r.previousIndex,
        p = r.activeIndex,
        c = r.rtlTranslate,
        u = r.wrapperEl;
      if (r.animating && o.preventInteractionOnTransition) return !1;
      var v = Math.min(r.params.slidesPerGroupSkip, n),
        f = v + Math.floor((n - v) / r.params.slidesPerGroup);
      f >= l.length && (f = l.length - 1),
        (p || o.initialSlide || 0) === (h || 0) &&
          i &&
          r.emit('beforeSlideChangeStart');
      var m,
        g = -l[f];
      if ((r.updateProgress(g), o.normalizeSlideIndex))
        for (var b = 0; b < d.length; b += 1)
          -Math.floor(100 * g) >= Math.floor(100 * d[b]) && (n = b);
      if (r.initialized && n !== p) {
        if (!r.allowSlideNext && g < r.translate && g < r.minTranslate())
          return !1;
        if (
          !r.allowSlidePrev &&
          g > r.translate &&
          g > r.maxTranslate() &&
          (p || 0) !== n
        )
          return !1;
      }
      if (
        ((m = n > p ? 'next' : n < p ? 'prev' : 'reset'),
        (c && -g === r.translate) || (!c && g === r.translate))
      )
        return (
          r.updateActiveIndex(n),
          o.autoHeight && r.updateAutoHeight(),
          r.updateSlidesClasses(),
          'slide' !== o.effect && r.setTranslate(g),
          'reset' !== m && (r.transitionStart(i, m), r.transitionEnd(i, m)),
          !1
        );
      if (o.cssMode) {
        var w = r.isHorizontal();
        return (
          0 === t
            ? (u[w ? 'scrollLeft' : 'scrollTop'] = -g)
            : u.scrollTo
            ? u.scrollTo(
                (((a = {})[w ? 'left' : 'top'] = -g),
                (a.behavior = 'smooth'),
                a)
              )
            : (u[w ? 'scrollLeft' : 'scrollTop'] = -g),
          !0
        );
      }
      return (
        0 === t
          ? (r.setTransition(0),
            r.setTranslate(g),
            r.updateActiveIndex(n),
            r.updateSlidesClasses(),
            r.emit('beforeTransitionStart', t, s),
            r.transitionStart(i, m),
            r.transitionEnd(i, m))
          : (r.setTransition(t),
            r.setTranslate(g),
            r.updateActiveIndex(n),
            r.updateSlidesClasses(),
            r.emit('beforeTransitionStart', t, s),
            r.transitionStart(i, m),
            r.animating ||
              ((r.animating = !0),
              r.onSlideToWrapperTransitionEnd ||
                (r.onSlideToWrapperTransitionEnd = function (e) {
                  r &&
                    !r.destroyed &&
                    e.target === this &&
                    (r.$wrapperEl[0].removeEventListener(
                      'transitionend',
                      r.onSlideToWrapperTransitionEnd
                    ),
                    r.$wrapperEl[0].removeEventListener(
                      'webkitTransitionEnd',
                      r.onSlideToWrapperTransitionEnd
                    ),
                    (r.onSlideToWrapperTransitionEnd = null),
                    delete r.onSlideToWrapperTransitionEnd,
                    r.transitionEnd(i, m));
                }),
              r.$wrapperEl[0].addEventListener(
                'transitionend',
                r.onSlideToWrapperTransitionEnd
              ),
              r.$wrapperEl[0].addEventListener(
                'webkitTransitionEnd',
                r.onSlideToWrapperTransitionEnd
              ))),
        !0
      );
    },
    slideToLoop: function (e, t, i, s) {
      void 0 === e && (e = 0),
        void 0 === t && (t = this.params.speed),
        void 0 === i && (i = !0);
      var a = e;
      return (
        this.params.loop && (a += this.loopedSlides), this.slideTo(a, t, i, s)
      );
    },
    slideNext: function (e, t, i) {
      void 0 === e && (e = this.params.speed), void 0 === t && (t = !0);
      var s = this.params,
        a = this.animating,
        r = this.activeIndex < s.slidesPerGroupSkip ? 1 : s.slidesPerGroup;
      if (s.loop) {
        if (a) return !1;
        this.loopFix(), (this._clientLeft = this.$wrapperEl[0].clientLeft);
      }
      return this.slideTo(this.activeIndex + r, e, t, i);
    },
    slidePrev: function (e, t, i) {
      void 0 === e && (e = this.params.speed), void 0 === t && (t = !0);
      var s = this.params,
        a = this.animating,
        r = this.snapGrid,
        n = this.slidesGrid,
        o = this.rtlTranslate;
      if (s.loop) {
        if (a) return !1;
        this.loopFix(), (this._clientLeft = this.$wrapperEl[0].clientLeft);
      }
      function l(e) {
        return e < 0 ? -Math.floor(Math.abs(e)) : Math.floor(e);
      }
      var d,
        h = l(o ? this.translate : -this.translate),
        p = r.map(function (e) {
          return l(e);
        }),
        c =
          (n.map(function (e) {
            return l(e);
          }),
          r[p.indexOf(h)],
          r[p.indexOf(h) - 1]);
      return (
        void 0 === c &&
          s.cssMode &&
          r.forEach(function (e) {
            !c && h >= e && (c = e);
          }),
        void 0 !== c && (d = n.indexOf(c)) < 0 && (d = this.activeIndex - 1),
        this.slideTo(d, e, t, i)
      );
    },
    slideReset: function (e, t, i) {
      return (
        void 0 === e && (e = this.params.speed),
        void 0 === t && (t = !0),
        this.slideTo(this.activeIndex, e, t, i)
      );
    },
    slideToClosest: function (e, t, i, s) {
      void 0 === e && (e = this.params.speed),
        void 0 === t && (t = !0),
        void 0 === s && (s = 0.5);
      var a = this.activeIndex,
        r = Math.min(this.params.slidesPerGroupSkip, a),
        n = r + Math.floor((a - r) / this.params.slidesPerGroup),
        o = this.rtlTranslate ? this.translate : -this.translate;
      if (o >= this.snapGrid[n]) {
        var l = this.snapGrid[n];
        o - l > (this.snapGrid[n + 1] - l) * s &&
          (a += this.params.slidesPerGroup);
      } else {
        var d = this.snapGrid[n - 1];
        o - d <= (this.snapGrid[n] - d) * s &&
          (a -= this.params.slidesPerGroup);
      }
      return (
        (a = Math.max(a, 0)),
        (a = Math.min(a, this.slidesGrid.length - 1)),
        this.slideTo(a, e, t, i)
      );
    },
    slideToClickedSlide: function () {
      var e,
        t = this,
        i = t.params,
        a = t.$wrapperEl,
        r =
          'auto' === i.slidesPerView
            ? t.slidesPerViewDynamic()
            : i.slidesPerView,
        o = t.clickedIndex;
      if (i.loop) {
        if (t.animating) return;
        (e = parseInt(s(t.clickedSlide).attr('data-swiper-slide-index'), 10)),
          i.centeredSlides
            ? o < t.loopedSlides - r / 2 ||
              o > t.slides.length - t.loopedSlides + r / 2
              ? (t.loopFix(),
                (o = a
                  .children(
                    '.' +
                      i.slideClass +
                      '[data-swiper-slide-index="' +
                      e +
                      '"]:not(.' +
                      i.slideDuplicateClass +
                      ')'
                  )
                  .eq(0)
                  .index()),
                n.nextTick(function () {
                  t.slideTo(o);
                }))
              : t.slideTo(o)
            : o > t.slides.length - r
            ? (t.loopFix(),
              (o = a
                .children(
                  '.' +
                    i.slideClass +
                    '[data-swiper-slide-index="' +
                    e +
                    '"]:not(.' +
                    i.slideDuplicateClass +
                    ')'
                )
                .eq(0)
                .index()),
              n.nextTick(function () {
                t.slideTo(o);
              }))
            : t.slideTo(o);
      } else t.slideTo(o);
    },
  };
  var v = {
    loopCreate: function () {
      var t = this,
        i = t.params,
        a = t.$wrapperEl;
      a.children('.' + i.slideClass + '.' + i.slideDuplicateClass).remove();
      var r = a.children('.' + i.slideClass);
      if (i.loopFillGroupWithBlank) {
        var n = i.slidesPerGroup - (r.length % i.slidesPerGroup);
        if (n !== i.slidesPerGroup) {
          for (var o = 0; o < n; o += 1) {
            var l = s(e.createElement('div')).addClass(
              i.slideClass + ' ' + i.slideBlankClass
            );
            a.append(l);
          }
          r = a.children('.' + i.slideClass);
        }
      }
      'auto' !== i.slidesPerView ||
        i.loopedSlides ||
        (i.loopedSlides = r.length),
        (t.loopedSlides = Math.ceil(
          parseFloat(i.loopedSlides || i.slidesPerView, 10)
        )),
        (t.loopedSlides += i.loopAdditionalSlides),
        t.loopedSlides > r.length && (t.loopedSlides = r.length);
      var d = [],
        h = [];
      r.each(function (e, i) {
        var a = s(i);
        e < t.loopedSlides && h.push(i),
          e < r.length && e >= r.length - t.loopedSlides && d.push(i),
          a.attr('data-swiper-slide-index', e);
      });
      for (var p = 0; p < h.length; p += 1)
        a.append(s(h[p].cloneNode(!0)).addClass(i.slideDuplicateClass));
      for (var c = d.length - 1; c >= 0; c -= 1)
        a.prepend(s(d[c].cloneNode(!0)).addClass(i.slideDuplicateClass));
    },
    loopFix: function () {
      this.emit('beforeLoopFix');
      var e,
        t = this.activeIndex,
        i = this.slides,
        s = this.loopedSlides,
        a = this.allowSlidePrev,
        r = this.allowSlideNext,
        n = this.snapGrid,
        o = this.rtlTranslate;
      (this.allowSlidePrev = !0), (this.allowSlideNext = !0);
      var l = -n[t] - this.getTranslate();
      if (t < s)
        (e = i.length - 3 * s + t),
          (e += s),
          this.slideTo(e, 0, !1, !0) &&
            0 !== l &&
            this.setTranslate((o ? -this.translate : this.translate) - l);
      else if (t >= i.length - s) {
        (e = -i.length + t + s),
          (e += s),
          this.slideTo(e, 0, !1, !0) &&
            0 !== l &&
            this.setTranslate((o ? -this.translate : this.translate) - l);
      }
      (this.allowSlidePrev = a),
        (this.allowSlideNext = r),
        this.emit('loopFix');
    },
    loopDestroy: function () {
      var e = this.$wrapperEl,
        t = this.params,
        i = this.slides;
      e
        .children(
          '.' +
            t.slideClass +
            '.' +
            t.slideDuplicateClass +
            ',.' +
            t.slideClass +
            '.' +
            t.slideBlankClass
        )
        .remove(),
        i.removeAttr('data-swiper-slide-index');
    },
  };
  var f = {
    setGrabCursor: function (e) {
      if (
        !(
          o.touch ||
          !this.params.simulateTouch ||
          (this.params.watchOverflow && this.isLocked) ||
          this.params.cssMode
        )
      ) {
        var t = this.el;
        (t.style.cursor = 'move'),
          (t.style.cursor = e ? '-webkit-grabbing' : '-webkit-grab'),
          (t.style.cursor = e ? '-moz-grabbin' : '-moz-grab'),
          (t.style.cursor = e ? 'grabbing' : 'grab');
      }
    },
    unsetGrabCursor: function () {
      o.touch ||
        (this.params.watchOverflow && this.isLocked) ||
        this.params.cssMode ||
        (this.el.style.cursor = '');
    },
  };
  var m,
    g,
    b,
    w,
    y,
    x,
    T,
    E,
    S,
    C,
    M,
    P,
    z,
    k,
    $,
    L = {
      appendSlide: function (e) {
        var t = this.$wrapperEl,
          i = this.params;
        if (
          (i.loop && this.loopDestroy(), 'object' == typeof e && 'length' in e)
        )
          for (var s = 0; s < e.length; s += 1) e[s] && t.append(e[s]);
        else t.append(e);
        i.loop && this.loopCreate(),
          (i.observer && o.observer) || this.update();
      },
      prependSlide: function (e) {
        var t = this.params,
          i = this.$wrapperEl,
          s = this.activeIndex;
        t.loop && this.loopDestroy();
        var a = s + 1;
        if ('object' == typeof e && 'length' in e) {
          for (var r = 0; r < e.length; r += 1) e[r] && i.prepend(e[r]);
          a = s + e.length;
        } else i.prepend(e);
        t.loop && this.loopCreate(),
          (t.observer && o.observer) || this.update(),
          this.slideTo(a, 0, !1);
      },
      addSlide: function (e, t) {
        var i = this.$wrapperEl,
          s = this.params,
          a = this.activeIndex;
        s.loop &&
          ((a -= this.loopedSlides),
          this.loopDestroy(),
          (this.slides = i.children('.' + s.slideClass)));
        var r = this.slides.length;
        if (e <= 0) this.prependSlide(t);
        else if (e >= r) this.appendSlide(t);
        else {
          for (var n = a > e ? a + 1 : a, l = [], d = r - 1; d >= e; d -= 1) {
            var h = this.slides.eq(d);
            h.remove(), l.unshift(h);
          }
          if ('object' == typeof t && 'length' in t) {
            for (var p = 0; p < t.length; p += 1) t[p] && i.append(t[p]);
            n = a > e ? a + t.length : a;
          } else i.append(t);
          for (var c = 0; c < l.length; c += 1) i.append(l[c]);
          s.loop && this.loopCreate(),
            (s.observer && o.observer) || this.update(),
            s.loop
              ? this.slideTo(n + this.loopedSlides, 0, !1)
              : this.slideTo(n, 0, !1);
        }
      },
      removeSlide: function (e) {
        var t = this.params,
          i = this.$wrapperEl,
          s = this.activeIndex;
        t.loop &&
          ((s -= this.loopedSlides),
          this.loopDestroy(),
          (this.slides = i.children('.' + t.slideClass)));
        var a,
          r = s;
        if ('object' == typeof e && 'length' in e) {
          for (var n = 0; n < e.length; n += 1)
            (a = e[n]),
              this.slides[a] && this.slides.eq(a).remove(),
              a < r && (r -= 1);
          r = Math.max(r, 0);
        } else
          (a = e),
            this.slides[a] && this.slides.eq(a).remove(),
            a < r && (r -= 1),
            (r = Math.max(r, 0));
        t.loop && this.loopCreate(),
          (t.observer && o.observer) || this.update(),
          t.loop
            ? this.slideTo(r + this.loopedSlides, 0, !1)
            : this.slideTo(r, 0, !1);
      },
      removeAllSlides: function () {
        for (var e = [], t = 0; t < this.slides.length; t += 1) e.push(t);
        this.removeSlide(e);
      },
    },
    I =
      ((m = t.navigator.platform),
      (g = t.navigator.userAgent),
      (b = {
        ios: !1,
        android: !1,
        androidChrome: !1,
        desktop: !1,
        iphone: !1,
        ipod: !1,
        ipad: !1,
        edge: !1,
        ie: !1,
        firefox: !1,
        macos: !1,
        windows: !1,
        cordova: !(!t.cordova && !t.phonegap),
        phonegap: !(!t.cordova && !t.phonegap),
        electron: !1,
      }),
      (w = t.screen.width),
      (y = t.screen.height),
      (x = g.match(/(Android);?[\s\/]+([\d.]+)?/)),
      (T = g.match(/(iPad).*OS\s([\d_]+)/)),
      (E = g.match(/(iPod)(.*OS\s([\d_]+))?/)),
      (S = !T && g.match(/(iPhone\sOS|iOS)\s([\d_]+)/)),
      (C = g.indexOf('MSIE ') >= 0 || g.indexOf('Trident/') >= 0),
      (M = g.indexOf('Edge/') >= 0),
      (P = g.indexOf('Gecko/') >= 0 && g.indexOf('Firefox/') >= 0),
      (z = 'Win32' === m),
      (k = g.toLowerCase().indexOf('electron') >= 0),
      ($ = 'MacIntel' === m),
      !T &&
        $ &&
        o.touch &&
        ((1024 === w && 1366 === y) ||
          (834 === w && 1194 === y) ||
          (834 === w && 1112 === y) ||
          (768 === w && 1024 === y)) &&
        ((T = g.match(/(Version)\/([\d.]+)/)), ($ = !1)),
      (b.ie = C),
      (b.edge = M),
      (b.firefox = P),
      x &&
        !z &&
        ((b.os = 'android'),
        (b.osVersion = x[2]),
        (b.android = !0),
        (b.androidChrome = g.toLowerCase().indexOf('chrome') >= 0)),
      (T || S || E) && ((b.os = 'ios'), (b.ios = !0)),
      S && !E && ((b.osVersion = S[2].replace(/_/g, '.')), (b.iphone = !0)),
      T && ((b.osVersion = T[2].replace(/_/g, '.')), (b.ipad = !0)),
      E &&
        ((b.osVersion = E[3] ? E[3].replace(/_/g, '.') : null), (b.ipod = !0)),
      b.ios &&
        b.osVersion &&
        g.indexOf('Version/') >= 0 &&
        '10' === b.osVersion.split('.')[0] &&
        (b.osVersion = g.toLowerCase().split('version/')[1].split(' ')[0]),
      (b.webView =
        !(
          !(S || T || E) ||
          (!g.match(/.*AppleWebKit(?!.*Safari)/i) && !t.navigator.standalone)
        ) ||
        (t.matchMedia && t.matchMedia('(display-mode: standalone)').matches)),
      (b.webview = b.webView),
      (b.standalone = b.webView),
      (b.desktop = !(b.ios || b.android) || k),
      b.desktop &&
        ((b.electron = k),
        (b.macos = $),
        (b.windows = z),
        b.macos && (b.os = 'macos'),
        b.windows && (b.os = 'windows')),
      (b.pixelRatio = t.devicePixelRatio || 1),
      b);
  function D(i) {
    var a = this.touchEventsData,
      r = this.params,
      o = this.touches;
    if (!this.animating || !r.preventInteractionOnTransition) {
      var l = i;
      l.originalEvent && (l = l.originalEvent);
      var d = s(l.target);
      if (
        ('wrapper' !== r.touchEventsTarget ||
          d.closest(this.wrapperEl).length) &&
        ((a.isTouchEvent = 'touchstart' === l.type),
        (a.isTouchEvent || !('which' in l) || 3 !== l.which) &&
          !(
            (!a.isTouchEvent && 'button' in l && l.button > 0) ||
            (a.isTouched && a.isMoved)
          ))
      )
        if (
          r.noSwiping &&
          d.closest(
            r.noSwipingSelector ? r.noSwipingSelector : '.' + r.noSwipingClass
          )[0]
        )
          this.allowClick = !0;
        else if (!r.swipeHandler || d.closest(r.swipeHandler)[0]) {
          (o.currentX =
            'touchstart' === l.type ? l.targetTouches[0].pageX : l.pageX),
            (o.currentY =
              'touchstart' === l.type ? l.targetTouches[0].pageY : l.pageY);
          var h = o.currentX,
            p = o.currentY,
            c = r.edgeSwipeDetection || r.iOSEdgeSwipeDetection,
            u = r.edgeSwipeThreshold || r.iOSEdgeSwipeThreshold;
          if (!c || !(h <= u || h >= t.screen.width - u)) {
            if (
              (n.extend(a, {
                isTouched: !0,
                isMoved: !1,
                allowTouchCallbacks: !0,
                isScrolling: void 0,
                startMoving: void 0,
              }),
              (o.startX = h),
              (o.startY = p),
              (a.touchStartTime = n.now()),
              (this.allowClick = !0),
              this.updateSize(),
              (this.swipeDirection = void 0),
              r.threshold > 0 && (a.allowThresholdMove = !1),
              'touchstart' !== l.type)
            ) {
              var v = !0;
              d.is(a.formElements) && (v = !1),
                e.activeElement &&
                  s(e.activeElement).is(a.formElements) &&
                  e.activeElement !== d[0] &&
                  e.activeElement.blur();
              var f = v && this.allowTouchMove && r.touchStartPreventDefault;
              (r.touchStartForcePreventDefault || f) && l.preventDefault();
            }
            this.emit('touchStart', l);
          }
        }
    }
  }
  function O(t) {
    var i = this.touchEventsData,
      a = this.params,
      r = this.touches,
      o = this.rtlTranslate,
      l = t;
    if ((l.originalEvent && (l = l.originalEvent), i.isTouched)) {
      if (!i.isTouchEvent || 'mousemove' !== l.type) {
        var d =
            'touchmove' === l.type &&
            l.targetTouches &&
            (l.targetTouches[0] || l.changedTouches[0]),
          h = 'touchmove' === l.type ? d.pageX : l.pageX,
          p = 'touchmove' === l.type ? d.pageY : l.pageY;
        if (l.preventedByNestedSwiper)
          return (r.startX = h), void (r.startY = p);
        if (!this.allowTouchMove)
          return (
            (this.allowClick = !1),
            void (
              i.isTouched &&
              (n.extend(r, { startX: h, startY: p, currentX: h, currentY: p }),
              (i.touchStartTime = n.now()))
            )
          );
        if (i.isTouchEvent && a.touchReleaseOnEdges && !a.loop)
          if (this.isVertical()) {
            if (
              (p < r.startY && this.translate <= this.maxTranslate()) ||
              (p > r.startY && this.translate >= this.minTranslate())
            )
              return (i.isTouched = !1), void (i.isMoved = !1);
          } else if (
            (h < r.startX && this.translate <= this.maxTranslate()) ||
            (h > r.startX && this.translate >= this.minTranslate())
          )
            return;
        if (
          i.isTouchEvent &&
          e.activeElement &&
          l.target === e.activeElement &&
          s(l.target).is(i.formElements)
        )
          return (i.isMoved = !0), void (this.allowClick = !1);
        if (
          (i.allowTouchCallbacks && this.emit('touchMove', l),
          !(l.targetTouches && l.targetTouches.length > 1))
        ) {
          (r.currentX = h), (r.currentY = p);
          var c = r.currentX - r.startX,
            u = r.currentY - r.startY;
          if (
            !(
              this.params.threshold &&
              Math.sqrt(Math.pow(c, 2) + Math.pow(u, 2)) < this.params.threshold
            )
          ) {
            var v;
            if (void 0 === i.isScrolling)
              (this.isHorizontal() && r.currentY === r.startY) ||
              (this.isVertical() && r.currentX === r.startX)
                ? (i.isScrolling = !1)
                : c * c + u * u >= 25 &&
                  ((v = (180 * Math.atan2(Math.abs(u), Math.abs(c))) / Math.PI),
                  (i.isScrolling = this.isHorizontal()
                    ? v > a.touchAngle
                    : 90 - v > a.touchAngle));
            if (
              (i.isScrolling && this.emit('touchMoveOpposite', l),
              void 0 === i.startMoving &&
                ((r.currentX === r.startX && r.currentY === r.startY) ||
                  (i.startMoving = !0)),
              i.isScrolling)
            )
              i.isTouched = !1;
            else if (i.startMoving) {
              (this.allowClick = !1),
                a.cssMode || l.preventDefault(),
                a.touchMoveStopPropagation && !a.nested && l.stopPropagation(),
                i.isMoved ||
                  (a.loop && this.loopFix(),
                  (i.startTranslate = this.getTranslate()),
                  this.setTransition(0),
                  this.animating &&
                    this.$wrapperEl.trigger(
                      'webkitTransitionEnd transitionend'
                    ),
                  (i.allowMomentumBounce = !1),
                  !a.grabCursor ||
                    (!0 !== this.allowSlideNext &&
                      !0 !== this.allowSlidePrev) ||
                    this.setGrabCursor(!0),
                  this.emit('sliderFirstMove', l)),
                this.emit('sliderMove', l),
                (i.isMoved = !0);
              var f = this.isHorizontal() ? c : u;
              (r.diff = f),
                (f *= a.touchRatio),
                o && (f = -f),
                (this.swipeDirection = f > 0 ? 'prev' : 'next'),
                (i.currentTranslate = f + i.startTranslate);
              var m = !0,
                g = a.resistanceRatio;
              if (
                (a.touchReleaseOnEdges && (g = 0),
                f > 0 && i.currentTranslate > this.minTranslate()
                  ? ((m = !1),
                    a.resistance &&
                      (i.currentTranslate =
                        this.minTranslate() -
                        1 +
                        Math.pow(
                          -this.minTranslate() + i.startTranslate + f,
                          g
                        )))
                  : f < 0 &&
                    i.currentTranslate < this.maxTranslate() &&
                    ((m = !1),
                    a.resistance &&
                      (i.currentTranslate =
                        this.maxTranslate() +
                        1 -
                        Math.pow(
                          this.maxTranslate() - i.startTranslate - f,
                          g
                        ))),
                m && (l.preventedByNestedSwiper = !0),
                !this.allowSlideNext &&
                  'next' === this.swipeDirection &&
                  i.currentTranslate < i.startTranslate &&
                  (i.currentTranslate = i.startTranslate),
                !this.allowSlidePrev &&
                  'prev' === this.swipeDirection &&
                  i.currentTranslate > i.startTranslate &&
                  (i.currentTranslate = i.startTranslate),
                a.threshold > 0)
              ) {
                if (!(Math.abs(f) > a.threshold || i.allowThresholdMove))
                  return void (i.currentTranslate = i.startTranslate);
                if (!i.allowThresholdMove)
                  return (
                    (i.allowThresholdMove = !0),
                    (r.startX = r.currentX),
                    (r.startY = r.currentY),
                    (i.currentTranslate = i.startTranslate),
                    void (r.diff = this.isHorizontal()
                      ? r.currentX - r.startX
                      : r.currentY - r.startY)
                  );
              }
              a.followFinger &&
                !a.cssMode &&
                ((a.freeMode ||
                  a.watchSlidesProgress ||
                  a.watchSlidesVisibility) &&
                  (this.updateActiveIndex(), this.updateSlidesClasses()),
                a.freeMode &&
                  (0 === i.velocities.length &&
                    i.velocities.push({
                      position: r[this.isHorizontal() ? 'startX' : 'startY'],
                      time: i.touchStartTime,
                    }),
                  i.velocities.push({
                    position: r[this.isHorizontal() ? 'currentX' : 'currentY'],
                    time: n.now(),
                  })),
                this.updateProgress(i.currentTranslate),
                this.setTranslate(i.currentTranslate));
            }
          }
        }
      }
    } else i.startMoving && i.isScrolling && this.emit('touchMoveOpposite', l);
  }
  function A(e) {
    var t = this,
      i = t.touchEventsData,
      s = t.params,
      a = t.touches,
      r = t.rtlTranslate,
      o = t.$wrapperEl,
      l = t.slidesGrid,
      d = t.snapGrid,
      h = e;
    if (
      (h.originalEvent && (h = h.originalEvent),
      i.allowTouchCallbacks && t.emit('touchEnd', h),
      (i.allowTouchCallbacks = !1),
      !i.isTouched)
    )
      return (
        i.isMoved && s.grabCursor && t.setGrabCursor(!1),
        (i.isMoved = !1),
        void (i.startMoving = !1)
      );
    s.grabCursor &&
      i.isMoved &&
      i.isTouched &&
      (!0 === t.allowSlideNext || !0 === t.allowSlidePrev) &&
      t.setGrabCursor(!1);
    var p,
      c = n.now(),
      u = c - i.touchStartTime;
    if (
      (t.allowClick &&
        (t.updateClickedSlide(h),
        t.emit('tap click', h),
        u < 300 &&
          c - i.lastClickTime < 300 &&
          t.emit('doubleTap doubleClick', h)),
      (i.lastClickTime = n.now()),
      n.nextTick(function () {
        t.destroyed || (t.allowClick = !0);
      }),
      !i.isTouched ||
        !i.isMoved ||
        !t.swipeDirection ||
        0 === a.diff ||
        i.currentTranslate === i.startTranslate)
    )
      return (i.isTouched = !1), (i.isMoved = !1), void (i.startMoving = !1);
    if (
      ((i.isTouched = !1),
      (i.isMoved = !1),
      (i.startMoving = !1),
      (p = s.followFinger
        ? r
          ? t.translate
          : -t.translate
        : -i.currentTranslate),
      !s.cssMode)
    )
      if (s.freeMode) {
        if (p < -t.minTranslate()) return void t.slideTo(t.activeIndex);
        if (p > -t.maxTranslate())
          return void (t.slides.length < d.length
            ? t.slideTo(d.length - 1)
            : t.slideTo(t.slides.length - 1));
        if (s.freeModeMomentum) {
          if (i.velocities.length > 1) {
            var v = i.velocities.pop(),
              f = i.velocities.pop(),
              m = v.position - f.position,
              g = v.time - f.time;
            (t.velocity = m / g),
              (t.velocity /= 2),
              Math.abs(t.velocity) < s.freeModeMinimumVelocity &&
                (t.velocity = 0),
              (g > 150 || n.now() - v.time > 300) && (t.velocity = 0);
          } else t.velocity = 0;
          (t.velocity *= s.freeModeMomentumVelocityRatio),
            (i.velocities.length = 0);
          var b = 1e3 * s.freeModeMomentumRatio,
            w = t.velocity * b,
            y = t.translate + w;
          r && (y = -y);
          var x,
            T,
            E = !1,
            S = 20 * Math.abs(t.velocity) * s.freeModeMomentumBounceRatio;
          if (y < t.maxTranslate())
            s.freeModeMomentumBounce
              ? (y + t.maxTranslate() < -S && (y = t.maxTranslate() - S),
                (x = t.maxTranslate()),
                (E = !0),
                (i.allowMomentumBounce = !0))
              : (y = t.maxTranslate()),
              s.loop && s.centeredSlides && (T = !0);
          else if (y > t.minTranslate())
            s.freeModeMomentumBounce
              ? (y - t.minTranslate() > S && (y = t.minTranslate() + S),
                (x = t.minTranslate()),
                (E = !0),
                (i.allowMomentumBounce = !0))
              : (y = t.minTranslate()),
              s.loop && s.centeredSlides && (T = !0);
          else if (s.freeModeSticky) {
            for (var C, M = 0; M < d.length; M += 1)
              if (d[M] > -y) {
                C = M;
                break;
              }
            y = -(y =
              Math.abs(d[C] - y) < Math.abs(d[C - 1] - y) ||
              'next' === t.swipeDirection
                ? d[C]
                : d[C - 1]);
          }
          if (
            (T &&
              t.once('transitionEnd', function () {
                t.loopFix();
              }),
            0 !== t.velocity)
          ) {
            if (
              ((b = r
                ? Math.abs((-y - t.translate) / t.velocity)
                : Math.abs((y - t.translate) / t.velocity)),
              s.freeModeSticky)
            ) {
              var P = Math.abs((r ? -y : y) - t.translate),
                z = t.slidesSizesGrid[t.activeIndex];
              b = P < z ? s.speed : P < 2 * z ? 1.5 * s.speed : 2.5 * s.speed;
            }
          } else if (s.freeModeSticky) return void t.slideToClosest();
          s.freeModeMomentumBounce && E
            ? (t.updateProgress(x),
              t.setTransition(b),
              t.setTranslate(y),
              t.transitionStart(!0, t.swipeDirection),
              (t.animating = !0),
              o.transitionEnd(function () {
                t &&
                  !t.destroyed &&
                  i.allowMomentumBounce &&
                  (t.emit('momentumBounce'),
                  t.setTransition(s.speed),
                  t.setTranslate(x),
                  o.transitionEnd(function () {
                    t && !t.destroyed && t.transitionEnd();
                  }));
              }))
            : t.velocity
            ? (t.updateProgress(y),
              t.setTransition(b),
              t.setTranslate(y),
              t.transitionStart(!0, t.swipeDirection),
              t.animating ||
                ((t.animating = !0),
                o.transitionEnd(function () {
                  t && !t.destroyed && t.transitionEnd();
                })))
            : t.updateProgress(y),
            t.updateActiveIndex(),
            t.updateSlidesClasses();
        } else if (s.freeModeSticky) return void t.slideToClosest();
        (!s.freeModeMomentum || u >= s.longSwipesMs) &&
          (t.updateProgress(), t.updateActiveIndex(), t.updateSlidesClasses());
      } else {
        for (
          var k = 0, $ = t.slidesSizesGrid[0], L = 0;
          L < l.length;
          L += L < s.slidesPerGroupSkip ? 1 : s.slidesPerGroup
        ) {
          var I = L < s.slidesPerGroupSkip - 1 ? 1 : s.slidesPerGroup;
          void 0 !== l[L + I]
            ? p >= l[L] && p < l[L + I] && ((k = L), ($ = l[L + I] - l[L]))
            : p >= l[L] && ((k = L), ($ = l[l.length - 1] - l[l.length - 2]));
        }
        var D = (p - l[k]) / $,
          O = k < s.slidesPerGroupSkip - 1 ? 1 : s.slidesPerGroup;
        if (u > s.longSwipesMs) {
          if (!s.longSwipes) return void t.slideTo(t.activeIndex);
          'next' === t.swipeDirection &&
            (D >= s.longSwipesRatio ? t.slideTo(k + O) : t.slideTo(k)),
            'prev' === t.swipeDirection &&
              (D > 1 - s.longSwipesRatio ? t.slideTo(k + O) : t.slideTo(k));
        } else {
          if (!s.shortSwipes) return void t.slideTo(t.activeIndex);
          t.navigation &&
          (h.target === t.navigation.nextEl || h.target === t.navigation.prevEl)
            ? h.target === t.navigation.nextEl
              ? t.slideTo(k + O)
              : t.slideTo(k)
            : ('next' === t.swipeDirection && t.slideTo(k + O),
              'prev' === t.swipeDirection && t.slideTo(k));
        }
      }
  }
  function G() {
    var e = this.params,
      t = this.el;
    if (!t || 0 !== t.offsetWidth) {
      e.breakpoints && this.setBreakpoint();
      var i = this.allowSlideNext,
        s = this.allowSlidePrev,
        a = this.snapGrid;
      (this.allowSlideNext = !0),
        (this.allowSlidePrev = !0),
        this.updateSize(),
        this.updateSlides(),
        this.updateSlidesClasses(),
        ('auto' === e.slidesPerView || e.slidesPerView > 1) &&
        this.isEnd &&
        !this.params.centeredSlides
          ? this.slideTo(this.slides.length - 1, 0, !1, !0)
          : this.slideTo(this.activeIndex, 0, !1, !0),
        this.autoplay &&
          this.autoplay.running &&
          this.autoplay.paused &&
          this.autoplay.run(),
        (this.allowSlidePrev = s),
        (this.allowSlideNext = i),
        this.params.watchOverflow &&
          a !== this.snapGrid &&
          this.checkOverflow();
    }
  }
  function H(e) {
    this.allowClick ||
      (this.params.preventClicks && e.preventDefault(),
      this.params.preventClicksPropagation &&
        this.animating &&
        (e.stopPropagation(), e.stopImmediatePropagation()));
  }
  function B() {
    var e = this.wrapperEl;
    (this.previousTranslate = this.translate),
      (this.translate = this.isHorizontal() ? -e.scrollLeft : -e.scrollTop),
      -0 === this.translate && (this.translate = 0),
      this.updateActiveIndex(),
      this.updateSlidesClasses();
    var t = this.maxTranslate() - this.minTranslate();
    (0 === t ? 0 : (this.translate - this.minTranslate()) / t) !==
      this.progress && this.updateProgress(this.translate),
      this.emit('setTranslate', this.translate, !1);
  }
  var N = !1;
  function X() {}
  var V = {
      init: !0,
      direction: 'horizontal',
      touchEventsTarget: 'container',
      initialSlide: 0,
      speed: 300,
      cssMode: !1,
      updateOnWindowResize: !0,
      preventInteractionOnTransition: !1,
      edgeSwipeDetection: !1,
      edgeSwipeThreshold: 20,
      freeMode: !1,
      freeModeMomentum: !0,
      freeModeMomentumRatio: 1,
      freeModeMomentumBounce: !0,
      freeModeMomentumBounceRatio: 1,
      freeModeMomentumVelocityRatio: 1,
      freeModeSticky: !1,
      freeModeMinimumVelocity: 0.02,
      autoHeight: !1,
      setWrapperSize: !1,
      virtualTranslate: !1,
      effect: 'slide',
      breakpoints: void 0,
      spaceBetween: 0,
      slidesPerView: 1,
      slidesPerColumn: 1,
      slidesPerColumnFill: 'column',
      slidesPerGroup: 1,
      slidesPerGroupSkip: 0,
      centeredSlides: !1,
      centeredSlidesBounds: !1,
      slidesOffsetBefore: 0,
      slidesOffsetAfter: 0,
      normalizeSlideIndex: !0,
      centerInsufficientSlides: !1,
      watchOverflow: !1,
      roundLengths: !1,
      touchRatio: 1,
      touchAngle: 45,
      simulateTouch: !0,
      shortSwipes: !0,
      longSwipes: !0,
      longSwipesRatio: 0.5,
      longSwipesMs: 300,
      followFinger: !0,
      allowTouchMove: !0,
      threshold: 0,
      touchMoveStopPropagation: !1,
      touchStartPreventDefault: !0,
      touchStartForcePreventDefault: !1,
      touchReleaseOnEdges: !1,
      uniqueNavElements: !0,
      resistance: !0,
      resistanceRatio: 0.85,
      watchSlidesProgress: !1,
      watchSlidesVisibility: !1,
      grabCursor: !1,
      preventClicks: !0,
      preventClicksPropagation: !0,
      slideToClickedSlide: !1,
      preloadImages: !0,
      updateOnImagesReady: !0,
      loop: !1,
      loopAdditionalSlides: 0,
      loopedSlides: null,
      loopFillGroupWithBlank: !1,
      allowSlidePrev: !0,
      allowSlideNext: !0,
      swipeHandler: null,
      noSwiping: !0,
      noSwipingClass: 'swiper-no-swiping',
      noSwipingSelector: null,
      passiveListeners: !0,
      containerModifierClass: 'swiper-container-',
      slideClass: 'swiper-slide',
      slideBlankClass: 'swiper-slide-invisible-blank',
      slideActiveClass: 'swiper-slide-active',
      slideDuplicateActiveClass: 'swiper-slide-duplicate-active',
      slideVisibleClass: 'swiper-slide-visible',
      slideDuplicateClass: 'swiper-slide-duplicate',
      slideNextClass: 'swiper-slide-next',
      slideDuplicateNextClass: 'swiper-slide-duplicate-next',
      slidePrevClass: 'swiper-slide-prev',
      slideDuplicatePrevClass: 'swiper-slide-duplicate-prev',
      wrapperClass: 'swiper-wrapper',
      runCallbacksOnInit: !0,
    },
    Y = {
      update: h,
      translate: p,
      transition: c,
      slide: u,
      loop: v,
      grabCursor: f,
      manipulation: L,
      events: {
        attachEvents: function () {
          var t = this.params,
            i = this.touchEvents,
            s = this.el,
            a = this.wrapperEl;
          (this.onTouchStart = D.bind(this)),
            (this.onTouchMove = O.bind(this)),
            (this.onTouchEnd = A.bind(this)),
            t.cssMode && (this.onScroll = B.bind(this)),
            (this.onClick = H.bind(this));
          var r = !!t.nested;
          if (!o.touch && o.pointerEvents)
            s.addEventListener(i.start, this.onTouchStart, !1),
              e.addEventListener(i.move, this.onTouchMove, r),
              e.addEventListener(i.end, this.onTouchEnd, !1);
          else {
            if (o.touch) {
              var n = !(
                'touchstart' !== i.start ||
                !o.passiveListener ||
                !t.passiveListeners
              ) && { passive: !0, capture: !1 };
              s.addEventListener(i.start, this.onTouchStart, n),
                s.addEventListener(
                  i.move,
                  this.onTouchMove,
                  o.passiveListener ? { passive: !1, capture: r } : r
                ),
                s.addEventListener(i.end, this.onTouchEnd, n),
                i.cancel && s.addEventListener(i.cancel, this.onTouchEnd, n),
                N || (e.addEventListener('touchstart', X), (N = !0));
            }
            ((t.simulateTouch && !I.ios && !I.android) ||
              (t.simulateTouch && !o.touch && I.ios)) &&
              (s.addEventListener('mousedown', this.onTouchStart, !1),
              e.addEventListener('mousemove', this.onTouchMove, r),
              e.addEventListener('mouseup', this.onTouchEnd, !1));
          }
          (t.preventClicks || t.preventClicksPropagation) &&
            s.addEventListener('click', this.onClick, !0),
            t.cssMode && a.addEventListener('scroll', this.onScroll),
            t.updateOnWindowResize
              ? this.on(
                  I.ios || I.android
                    ? 'resize orientationchange observerUpdate'
                    : 'resize observerUpdate',
                  G,
                  !0
                )
              : this.on('observerUpdate', G, !0);
        },
        detachEvents: function () {
          var t = this.params,
            i = this.touchEvents,
            s = this.el,
            a = this.wrapperEl,
            r = !!t.nested;
          if (!o.touch && o.pointerEvents)
            s.removeEventListener(i.start, this.onTouchStart, !1),
              e.removeEventListener(i.move, this.onTouchMove, r),
              e.removeEventListener(i.end, this.onTouchEnd, !1);
          else {
            if (o.touch) {
              var n = !(
                'onTouchStart' !== i.start ||
                !o.passiveListener ||
                !t.passiveListeners
              ) && { passive: !0, capture: !1 };
              s.removeEventListener(i.start, this.onTouchStart, n),
                s.removeEventListener(i.move, this.onTouchMove, r),
                s.removeEventListener(i.end, this.onTouchEnd, n),
                i.cancel && s.removeEventListener(i.cancel, this.onTouchEnd, n);
            }
            ((t.simulateTouch && !I.ios && !I.android) ||
              (t.simulateTouch && !o.touch && I.ios)) &&
              (s.removeEventListener('mousedown', this.onTouchStart, !1),
              e.removeEventListener('mousemove', this.onTouchMove, r),
              e.removeEventListener('mouseup', this.onTouchEnd, !1));
          }
          (t.preventClicks || t.preventClicksPropagation) &&
            s.removeEventListener('click', this.onClick, !0),
            t.cssMode && a.removeEventListener('scroll', this.onScroll),
            this.off(
              I.ios || I.android
                ? 'resize orientationchange observerUpdate'
                : 'resize observerUpdate',
              G
            );
        },
      },
      breakpoints: {
        setBreakpoint: function () {
          var e = this.activeIndex,
            t = this.initialized,
            i = this.loopedSlides;
          void 0 === i && (i = 0);
          var s = this.params,
            a = this.$el,
            r = s.breakpoints;
          if (r && (!r || 0 !== Object.keys(r).length)) {
            var o = this.getBreakpoint(r);
            if (o && this.currentBreakpoint !== o) {
              var l = o in r ? r[o] : void 0;
              l &&
                [
                  'slidesPerView',
                  'spaceBetween',
                  'slidesPerGroup',
                  'slidesPerGroupSkip',
                  'slidesPerColumn',
                ].forEach(function (e) {
                  var t = l[e];
                  void 0 !== t &&
                    (l[e] =
                      'slidesPerView' !== e || ('AUTO' !== t && 'auto' !== t)
                        ? 'slidesPerView' === e
                          ? parseFloat(t)
                          : parseInt(t, 10)
                        : 'auto');
                });
              var d = l || this.originalParams,
                h = s.slidesPerColumn > 1,
                p = d.slidesPerColumn > 1;
              h && !p
                ? a.removeClass(
                    s.containerModifierClass +
                      'multirow ' +
                      s.containerModifierClass +
                      'multirow-column'
                  )
                : !h &&
                  p &&
                  (a.addClass(s.containerModifierClass + 'multirow'),
                  'column' === d.slidesPerColumnFill &&
                    a.addClass(s.containerModifierClass + 'multirow-column'));
              var c = d.direction && d.direction !== s.direction,
                u = s.loop && (d.slidesPerView !== s.slidesPerView || c);
              c && t && this.changeDirection(),
                n.extend(this.params, d),
                n.extend(this, {
                  allowTouchMove: this.params.allowTouchMove,
                  allowSlideNext: this.params.allowSlideNext,
                  allowSlidePrev: this.params.allowSlidePrev,
                }),
                (this.currentBreakpoint = o),
                u &&
                  t &&
                  (this.loopDestroy(),
                  this.loopCreate(),
                  this.updateSlides(),
                  this.slideTo(e - i + this.loopedSlides, 0, !1)),
                this.emit('breakpoint', d);
            }
          }
        },
        getBreakpoint: function (e) {
          if (e) {
            var i = !1,
              s = Object.keys(e).map(function (e) {
                if ('string' == typeof e && 0 === e.indexOf('@')) {
                  var i = parseFloat(e.substr(1));
                  return { value: t.innerHeight * i, point: e };
                }
                return { value: e, point: e };
              });
            s.sort(function (e, t) {
              return parseInt(e.value, 10) - parseInt(t.value, 10);
            });
            for (var a = 0; a < s.length; a += 1) {
              var r = s[a],
                n = r.point;
              r.value <= t.innerWidth && (i = n);
            }
            return i || 'max';
          }
        },
      },
      checkOverflow: {
        checkOverflow: function () {
          var e = this.params,
            t = this.isLocked,
            i =
              this.slides.length > 0 &&
              e.slidesOffsetBefore +
                e.spaceBetween * (this.slides.length - 1) +
                this.slides[0].offsetWidth * this.slides.length;
          e.slidesOffsetBefore && e.slidesOffsetAfter && i
            ? (this.isLocked = i <= this.size)
            : (this.isLocked = 1 === this.snapGrid.length),
            (this.allowSlideNext = !this.isLocked),
            (this.allowSlidePrev = !this.isLocked),
            t !== this.isLocked && this.emit(this.isLocked ? 'lock' : 'unlock'),
            t &&
              t !== this.isLocked &&
              ((this.isEnd = !1), this.navigation.update());
        },
      },
      classes: {
        addClasses: function () {
          var e = this.classNames,
            t = this.params,
            i = this.rtl,
            s = this.$el,
            a = [];
          a.push('initialized'),
            a.push(t.direction),
            t.freeMode && a.push('free-mode'),
            t.autoHeight && a.push('autoheight'),
            i && a.push('rtl'),
            t.slidesPerColumn > 1 &&
              (a.push('multirow'),
              'column' === t.slidesPerColumnFill && a.push('multirow-column')),
            I.android && a.push('android'),
            I.ios && a.push('ios'),
            t.cssMode && a.push('css-mode'),
            a.forEach(function (i) {
              e.push(t.containerModifierClass + i);
            }),
            s.addClass(e.join(' '));
        },
        removeClasses: function () {
          var e = this.$el,
            t = this.classNames;
          e.removeClass(t.join(' '));
        },
      },
      images: {
        loadImage: function (e, i, s, a, r, n) {
          var o;
          function l() {
            n && n();
          }
          e.complete && r
            ? l()
            : i
            ? (((o = new t.Image()).onload = l),
              (o.onerror = l),
              a && (o.sizes = a),
              s && (o.srcset = s),
              i && (o.src = i))
            : l();
        },
        preloadImages: function () {
          var e = this;
          function t() {
            null != e &&
              e &&
              !e.destroyed &&
              (void 0 !== e.imagesLoaded && (e.imagesLoaded += 1),
              e.imagesLoaded === e.imagesToLoad.length &&
                (e.params.updateOnImagesReady && e.update(),
                e.emit('imagesReady')));
          }
          e.imagesToLoad = e.$el.find('img');
          for (var i = 0; i < e.imagesToLoad.length; i += 1) {
            var s = e.imagesToLoad[i];
            e.loadImage(
              s,
              s.currentSrc || s.getAttribute('src'),
              s.srcset || s.getAttribute('srcset'),
              s.sizes || s.getAttribute('sizes'),
              !0,
              t
            );
          }
        },
      },
    },
    F = {},
    W = (function (e) {
      function t() {
        for (var i, a, r, l = [], d = arguments.length; d--; )
          l[d] = arguments[d];
        1 === l.length && l[0].constructor && l[0].constructor === Object
          ? (r = l[0])
          : ((a = (i = l)[0]), (r = i[1])),
          r || (r = {}),
          (r = n.extend({}, r)),
          a && !r.el && (r.el = a),
          e.call(this, r),
          Object.keys(Y).forEach(function (e) {
            Object.keys(Y[e]).forEach(function (i) {
              t.prototype[i] || (t.prototype[i] = Y[e][i]);
            });
          });
        var h = this;
        void 0 === h.modules && (h.modules = {}),
          Object.keys(h.modules).forEach(function (e) {
            var t = h.modules[e];
            if (t.params) {
              var i = Object.keys(t.params)[0],
                s = t.params[i];
              if ('object' != typeof s || null === s) return;
              if (!(i in r && 'enabled' in s)) return;
              !0 === r[i] && (r[i] = { enabled: !0 }),
                'object' != typeof r[i] ||
                  'enabled' in r[i] ||
                  (r[i].enabled = !0),
                r[i] || (r[i] = { enabled: !1 });
            }
          });
        var p = n.extend({}, V);
        h.useModulesParams(p),
          (h.params = n.extend({}, p, F, r)),
          (h.originalParams = n.extend({}, h.params)),
          (h.passedParams = n.extend({}, r)),
          (h.$ = s);
        var c = s(h.params.el);
        if ((a = c[0])) {
          if (c.length > 1) {
            var u = [];
            return (
              c.each(function (e, i) {
                var s = n.extend({}, r, { el: i });
                u.push(new t(s));
              }),
              u
            );
          }
          var v, f, m;
          return (
            (a.swiper = h),
            c.data('swiper', h),
            a && a.shadowRoot && a.shadowRoot.querySelector
              ? ((v = s(
                  a.shadowRoot.querySelector('.' + h.params.wrapperClass)
                )).children = function (e) {
                  return c.children(e);
                })
              : (v = c.children('.' + h.params.wrapperClass)),
            n.extend(h, {
              $el: c,
              el: a,
              $wrapperEl: v,
              wrapperEl: v[0],
              classNames: [],
              slides: s(),
              slidesGrid: [],
              snapGrid: [],
              slidesSizesGrid: [],
              isHorizontal: function () {
                return 'horizontal' === h.params.direction;
              },
              isVertical: function () {
                return 'vertical' === h.params.direction;
              },
              rtl:
                'rtl' === a.dir.toLowerCase() || 'rtl' === c.css('direction'),
              rtlTranslate:
                'horizontal' === h.params.direction &&
                ('rtl' === a.dir.toLowerCase() || 'rtl' === c.css('direction')),
              wrongRTL: '-webkit-box' === v.css('display'),
              activeIndex: 0,
              realIndex: 0,
              isBeginning: !0,
              isEnd: !1,
              translate: 0,
              previousTranslate: 0,
              progress: 0,
              velocity: 0,
              animating: !1,
              allowSlideNext: h.params.allowSlideNext,
              allowSlidePrev: h.params.allowSlidePrev,
              touchEvents:
                ((f = ['touchstart', 'touchmove', 'touchend', 'touchcancel']),
                (m = ['mousedown', 'mousemove', 'mouseup']),
                o.pointerEvents &&
                  (m = ['pointerdown', 'pointermove', 'pointerup']),
                (h.touchEventsTouch = {
                  start: f[0],
                  move: f[1],
                  end: f[2],
                  cancel: f[3],
                }),
                (h.touchEventsDesktop = { start: m[0], move: m[1], end: m[2] }),
                o.touch || !h.params.simulateTouch
                  ? h.touchEventsTouch
                  : h.touchEventsDesktop),
              touchEventsData: {
                isTouched: void 0,
                isMoved: void 0,
                allowTouchCallbacks: void 0,
                touchStartTime: void 0,
                isScrolling: void 0,
                currentTranslate: void 0,
                startTranslate: void 0,
                allowThresholdMove: void 0,
                formElements:
                  'input, select, option, textarea, button, video, label',
                lastClickTime: n.now(),
                clickTimeout: void 0,
                velocities: [],
                allowMomentumBounce: void 0,
                isTouchEvent: void 0,
                startMoving: void 0,
              },
              allowClick: !0,
              allowTouchMove: h.params.allowTouchMove,
              touches: {
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
                diff: 0,
              },
              imagesToLoad: [],
              imagesLoaded: 0,
            }),
            h.useModules(),
            h.params.init && h.init(),
            h
          );
        }
      }
      e && (t.__proto__ = e),
        (t.prototype = Object.create(e && e.prototype)),
        (t.prototype.constructor = t);
      var i = {
        extendedDefaults: { configurable: !0 },
        defaults: { configurable: !0 },
        Class: { configurable: !0 },
        $: { configurable: !0 },
      };
      return (
        (t.prototype.slidesPerViewDynamic = function () {
          var e = this.params,
            t = this.slides,
            i = this.slidesGrid,
            s = this.size,
            a = this.activeIndex,
            r = 1;
          if (e.centeredSlides) {
            for (
              var n, o = t[a].swiperSlideSize, l = a + 1;
              l < t.length;
              l += 1
            )
              t[l] &&
                !n &&
                ((r += 1), (o += t[l].swiperSlideSize) > s && (n = !0));
            for (var d = a - 1; d >= 0; d -= 1)
              t[d] &&
                !n &&
                ((r += 1), (o += t[d].swiperSlideSize) > s && (n = !0));
          } else
            for (var h = a + 1; h < t.length; h += 1)
              i[h] - i[a] < s && (r += 1);
          return r;
        }),
        (t.prototype.update = function () {
          var e = this;
          if (e && !e.destroyed) {
            var t = e.snapGrid,
              i = e.params;
            i.breakpoints && e.setBreakpoint(),
              e.updateSize(),
              e.updateSlides(),
              e.updateProgress(),
              e.updateSlidesClasses(),
              e.params.freeMode
                ? (s(), e.params.autoHeight && e.updateAutoHeight())
                : (('auto' === e.params.slidesPerView ||
                    e.params.slidesPerView > 1) &&
                  e.isEnd &&
                  !e.params.centeredSlides
                    ? e.slideTo(e.slides.length - 1, 0, !1, !0)
                    : e.slideTo(e.activeIndex, 0, !1, !0)) || s(),
              i.watchOverflow && t !== e.snapGrid && e.checkOverflow(),
              e.emit('update');
          }
          function s() {
            var t = e.rtlTranslate ? -1 * e.translate : e.translate,
              i = Math.min(Math.max(t, e.maxTranslate()), e.minTranslate());
            e.setTranslate(i), e.updateActiveIndex(), e.updateSlidesClasses();
          }
        }),
        (t.prototype.changeDirection = function (e, t) {
          void 0 === t && (t = !0);
          var i = this.params.direction;
          return (
            e || (e = 'horizontal' === i ? 'vertical' : 'horizontal'),
            e === i || ('horizontal' !== e && 'vertical' !== e)
              ? this
              : (this.$el
                  .removeClass('' + this.params.containerModifierClass + i)
                  .addClass('' + this.params.containerModifierClass + e),
                (this.params.direction = e),
                this.slides.each(function (t, i) {
                  'vertical' === e
                    ? (i.style.width = '')
                    : (i.style.height = '');
                }),
                this.emit('changeDirection'),
                t && this.update(),
                this)
          );
        }),
        (t.prototype.init = function () {
          this.initialized ||
            (this.emit('beforeInit'),
            this.params.breakpoints && this.setBreakpoint(),
            this.addClasses(),
            this.params.loop && this.loopCreate(),
            this.updateSize(),
            this.updateSlides(),
            this.params.watchOverflow && this.checkOverflow(),
            this.params.grabCursor && this.setGrabCursor(),
            this.params.preloadImages && this.preloadImages(),
            this.params.loop
              ? this.slideTo(
                  this.params.initialSlide + this.loopedSlides,
                  0,
                  this.params.runCallbacksOnInit
                )
              : this.slideTo(
                  this.params.initialSlide,
                  0,
                  this.params.runCallbacksOnInit
                ),
            this.attachEvents(),
            (this.initialized = !0),
            this.emit('init'));
        }),
        (t.prototype.destroy = function (e, t) {
          void 0 === e && (e = !0), void 0 === t && (t = !0);
          var i = this,
            s = i.params,
            a = i.$el,
            r = i.$wrapperEl,
            o = i.slides;
          return void 0 === i.params || i.destroyed
            ? null
            : (i.emit('beforeDestroy'),
              (i.initialized = !1),
              i.detachEvents(),
              s.loop && i.loopDestroy(),
              t &&
                (i.removeClasses(),
                a.removeAttr('style'),
                r.removeAttr('style'),
                o &&
                  o.length &&
                  o
                    .removeClass(
                      [
                        s.slideVisibleClass,
                        s.slideActiveClass,
                        s.slideNextClass,
                        s.slidePrevClass,
                      ].join(' ')
                    )
                    .removeAttr('style')
                    .removeAttr('data-swiper-slide-index')),
              i.emit('destroy'),
              Object.keys(i.eventsListeners).forEach(function (e) {
                i.off(e);
              }),
              !1 !== e &&
                ((i.$el[0].swiper = null),
                i.$el.data('swiper', null),
                n.deleteProps(i)),
              (i.destroyed = !0),
              null);
        }),
        (t.extendDefaults = function (e) {
          n.extend(F, e);
        }),
        (i.extendedDefaults.get = function () {
          return F;
        }),
        (i.defaults.get = function () {
          return V;
        }),
        (i.Class.get = function () {
          return e;
        }),
        (i.$.get = function () {
          return s;
        }),
        Object.defineProperties(t, i),
        t
      );
    })(l),
    R = { name: 'device', proto: { device: I }, static: { device: I } },
    q = { name: 'support', proto: { support: o }, static: { support: o } },
    j = {
      isEdge: !!t.navigator.userAgent.match(/Edge/g),
      isSafari: (function () {
        var e = t.navigator.userAgent.toLowerCase();
        return (
          e.indexOf('safari') >= 0 &&
          e.indexOf('chrome') < 0 &&
          e.indexOf('android') < 0
        );
      })(),
      isUiWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(
        t.navigator.userAgent
      ),
    },
    K = { name: 'browser', proto: { browser: j }, static: { browser: j } },
    U = {
      name: 'resize',
      create: function () {
        var e = this;
        n.extend(e, {
          resize: {
            resizeHandler: function () {
              e &&
                !e.destroyed &&
                e.initialized &&
                (e.emit('beforeResize'), e.emit('resize'));
            },
            orientationChangeHandler: function () {
              e && !e.destroyed && e.initialized && e.emit('orientationchange');
            },
          },
        });
      },
      on: {
        init: function () {
          t.addEventListener('resize', this.resize.resizeHandler),
            t.addEventListener(
              'orientationchange',
              this.resize.orientationChangeHandler
            );
        },
        destroy: function () {
          t.removeEventListener('resize', this.resize.resizeHandler),
            t.removeEventListener(
              'orientationchange',
              this.resize.orientationChangeHandler
            );
        },
      },
    },
    _ = {
      func: t.MutationObserver || t.WebkitMutationObserver,
      attach: function (e, i) {
        void 0 === i && (i = {});
        var s = this,
          a = new (0, _.func)(function (e) {
            if (1 !== e.length) {
              var i = function () {
                s.emit('observerUpdate', e[0]);
              };
              t.requestAnimationFrame
                ? t.requestAnimationFrame(i)
                : t.setTimeout(i, 0);
            } else s.emit('observerUpdate', e[0]);
          });
        a.observe(e, {
          attributes: void 0 === i.attributes || i.attributes,
          childList: void 0 === i.childList || i.childList,
          characterData: void 0 === i.characterData || i.characterData,
        }),
          s.observer.observers.push(a);
      },
      init: function () {
        if (o.observer && this.params.observer) {
          if (this.params.observeParents)
            for (var e = this.$el.parents(), t = 0; t < e.length; t += 1)
              this.observer.attach(e[t]);
          this.observer.attach(this.$el[0], {
            childList: this.params.observeSlideChildren,
          }),
            this.observer.attach(this.$wrapperEl[0], { attributes: !1 });
        }
      },
      destroy: function () {
        this.observer.observers.forEach(function (e) {
          e.disconnect();
        }),
          (this.observer.observers = []);
      },
    },
    Z = {
      name: 'observer',
      params: { observer: !1, observeParents: !1, observeSlideChildren: !1 },
      create: function () {
        n.extend(this, {
          observer: {
            init: _.init.bind(this),
            attach: _.attach.bind(this),
            destroy: _.destroy.bind(this),
            observers: [],
          },
        });
      },
      on: {
        init: function () {
          this.observer.init();
        },
        destroy: function () {
          this.observer.destroy();
        },
      },
    },
    Q = {
      update: function (e) {
        var t = this,
          i = t.params,
          s = i.slidesPerView,
          a = i.slidesPerGroup,
          r = i.centeredSlides,
          o = t.params.virtual,
          l = o.addSlidesBefore,
          d = o.addSlidesAfter,
          h = t.virtual,
          p = h.from,
          c = h.to,
          u = h.slides,
          v = h.slidesGrid,
          f = h.renderSlide,
          m = h.offset;
        t.updateActiveIndex();
        var g,
          b,
          w,
          y = t.activeIndex || 0;
        (g = t.rtlTranslate ? 'right' : t.isHorizontal() ? 'left' : 'top'),
          r
            ? ((b = Math.floor(s / 2) + a + l), (w = Math.floor(s / 2) + a + d))
            : ((b = s + (a - 1) + l), (w = a + d));
        var x = Math.max((y || 0) - w, 0),
          T = Math.min((y || 0) + b, u.length - 1),
          E = (t.slidesGrid[x] || 0) - (t.slidesGrid[0] || 0);
        function S() {
          t.updateSlides(),
            t.updateProgress(),
            t.updateSlidesClasses(),
            t.lazy && t.params.lazy.enabled && t.lazy.load();
        }
        if (
          (n.extend(t.virtual, {
            from: x,
            to: T,
            offset: E,
            slidesGrid: t.slidesGrid,
          }),
          p === x && c === T && !e)
        )
          return (
            t.slidesGrid !== v && E !== m && t.slides.css(g, E + 'px'),
            void t.updateProgress()
          );
        if (t.params.virtual.renderExternal)
          return (
            t.params.virtual.renderExternal.call(t, {
              offset: E,
              from: x,
              to: T,
              slides: (function () {
                for (var e = [], t = x; t <= T; t += 1) e.push(u[t]);
                return e;
              })(),
            }),
            void S()
          );
        var C = [],
          M = [];
        if (e) t.$wrapperEl.find('.' + t.params.slideClass).remove();
        else
          for (var P = p; P <= c; P += 1)
            (P < x || P > T) &&
              t.$wrapperEl
                .find(
                  '.' +
                    t.params.slideClass +
                    '[data-swiper-slide-index="' +
                    P +
                    '"]'
                )
                .remove();
        for (var z = 0; z < u.length; z += 1)
          z >= x &&
            z <= T &&
            (void 0 === c || e
              ? M.push(z)
              : (z > c && M.push(z), z < p && C.push(z)));
        M.forEach(function (e) {
          t.$wrapperEl.append(f(u[e], e));
        }),
          C.sort(function (e, t) {
            return t - e;
          }).forEach(function (e) {
            t.$wrapperEl.prepend(f(u[e], e));
          }),
          t.$wrapperEl.children('.swiper-slide').css(g, E + 'px'),
          S();
      },
      renderSlide: function (e, t) {
        var i = this.params.virtual;
        if (i.cache && this.virtual.cache[t]) return this.virtual.cache[t];
        var a = i.renderSlide
          ? s(i.renderSlide.call(this, e, t))
          : s(
              '<div class="' +
                this.params.slideClass +
                '" data-swiper-slide-index="' +
                t +
                '">' +
                e +
                '</div>'
            );
        return (
          a.attr('data-swiper-slide-index') ||
            a.attr('data-swiper-slide-index', t),
          i.cache && (this.virtual.cache[t] = a),
          a
        );
      },
      appendSlide: function (e) {
        if ('object' == typeof e && 'length' in e)
          for (var t = 0; t < e.length; t += 1)
            e[t] && this.virtual.slides.push(e[t]);
        else this.virtual.slides.push(e);
        this.virtual.update(!0);
      },
      prependSlide: function (e) {
        var t = this.activeIndex,
          i = t + 1,
          s = 1;
        if (Array.isArray(e)) {
          for (var a = 0; a < e.length; a += 1)
            e[a] && this.virtual.slides.unshift(e[a]);
          (i = t + e.length), (s = e.length);
        } else this.virtual.slides.unshift(e);
        if (this.params.virtual.cache) {
          var r = this.virtual.cache,
            n = {};
          Object.keys(r).forEach(function (e) {
            var t = r[e],
              i = t.attr('data-swiper-slide-index');
            i && t.attr('data-swiper-slide-index', parseInt(i, 10) + 1),
              (n[parseInt(e, 10) + s] = t);
          }),
            (this.virtual.cache = n);
        }
        this.virtual.update(!0), this.slideTo(i, 0);
      },
      removeSlide: function (e) {
        if (null != e) {
          var t = this.activeIndex;
          if (Array.isArray(e))
            for (var i = e.length - 1; i >= 0; i -= 1)
              this.virtual.slides.splice(e[i], 1),
                this.params.virtual.cache && delete this.virtual.cache[e[i]],
                e[i] < t && (t -= 1),
                (t = Math.max(t, 0));
          else
            this.virtual.slides.splice(e, 1),
              this.params.virtual.cache && delete this.virtual.cache[e],
              e < t && (t -= 1),
              (t = Math.max(t, 0));
          this.virtual.update(!0), this.slideTo(t, 0);
        }
      },
      removeAllSlides: function () {
        (this.virtual.slides = []),
          this.params.virtual.cache && (this.virtual.cache = {}),
          this.virtual.update(!0),
          this.slideTo(0, 0);
      },
    },
    J = {
      name: 'virtual',
      params: {
        virtual: {
          enabled: !1,
          slides: [],
          cache: !0,
          renderSlide: null,
          renderExternal: null,
          addSlidesBefore: 0,
          addSlidesAfter: 0,
        },
      },
      create: function () {
        n.extend(this, {
          virtual: {
            update: Q.update.bind(this),
            appendSlide: Q.appendSlide.bind(this),
            prependSlide: Q.prependSlide.bind(this),
            removeSlide: Q.removeSlide.bind(this),
            removeAllSlides: Q.removeAllSlides.bind(this),
            renderSlide: Q.renderSlide.bind(this),
            slides: this.params.virtual.slides,
            cache: {},
          },
        });
      },
      on: {
        beforeInit: function () {
          if (this.params.virtual.enabled) {
            this.classNames.push(
              this.params.containerModifierClass + 'virtual'
            );
            var e = { watchSlidesProgress: !0 };
            n.extend(this.params, e),
              n.extend(this.originalParams, e),
              this.params.initialSlide || this.virtual.update();
          }
        },
        setTranslate: function () {
          this.params.virtual.enabled && this.virtual.update();
        },
      },
    },
    ee = {
      handle: function (i) {
        var s = this.rtlTranslate,
          a = i;
        a.originalEvent && (a = a.originalEvent);
        var r = a.keyCode || a.charCode;
        if (
          !this.allowSlideNext &&
          ((this.isHorizontal() && 39 === r) ||
            (this.isVertical() && 40 === r) ||
            34 === r)
        )
          return !1;
        if (
          !this.allowSlidePrev &&
          ((this.isHorizontal() && 37 === r) ||
            (this.isVertical() && 38 === r) ||
            33 === r)
        )
          return !1;
        if (
          !(
            a.shiftKey ||
            a.altKey ||
            a.ctrlKey ||
            a.metaKey ||
            (e.activeElement &&
              e.activeElement.nodeName &&
              ('input' === e.activeElement.nodeName.toLowerCase() ||
                'textarea' === e.activeElement.nodeName.toLowerCase()))
          )
        ) {
          if (
            this.params.keyboard.onlyInViewport &&
            (33 === r ||
              34 === r ||
              37 === r ||
              39 === r ||
              38 === r ||
              40 === r)
          ) {
            var n = !1;
            if (
              this.$el.parents('.' + this.params.slideClass).length > 0 &&
              0 === this.$el.parents('.' + this.params.slideActiveClass).length
            )
              return;
            var o = t.innerWidth,
              l = t.innerHeight,
              d = this.$el.offset();
            s && (d.left -= this.$el[0].scrollLeft);
            for (
              var h = [
                  [d.left, d.top],
                  [d.left + this.width, d.top],
                  [d.left, d.top + this.height],
                  [d.left + this.width, d.top + this.height],
                ],
                p = 0;
              p < h.length;
              p += 1
            ) {
              var c = h[p];
              c[0] >= 0 && c[0] <= o && c[1] >= 0 && c[1] <= l && (n = !0);
            }
            if (!n) return;
          }
          this.isHorizontal()
            ? ((33 !== r && 34 !== r && 37 !== r && 39 !== r) ||
                (a.preventDefault ? a.preventDefault() : (a.returnValue = !1)),
              (((34 !== r && 39 !== r) || s) &&
                ((33 !== r && 37 !== r) || !s)) ||
                this.slideNext(),
              (((33 !== r && 37 !== r) || s) &&
                ((34 !== r && 39 !== r) || !s)) ||
                this.slidePrev())
            : ((33 !== r && 34 !== r && 38 !== r && 40 !== r) ||
                (a.preventDefault ? a.preventDefault() : (a.returnValue = !1)),
              (34 !== r && 40 !== r) || this.slideNext(),
              (33 !== r && 38 !== r) || this.slidePrev()),
            this.emit('keyPress', r);
        }
      },
      enable: function () {
        this.keyboard.enabled ||
          (s(e).on('keydown', this.keyboard.handle),
          (this.keyboard.enabled = !0));
      },
      disable: function () {
        this.keyboard.enabled &&
          (s(e).off('keydown', this.keyboard.handle),
          (this.keyboard.enabled = !1));
      },
    },
    te = {
      name: 'keyboard',
      params: { keyboard: { enabled: !1, onlyInViewport: !0 } },
      create: function () {
        n.extend(this, {
          keyboard: {
            enabled: !1,
            enable: ee.enable.bind(this),
            disable: ee.disable.bind(this),
            handle: ee.handle.bind(this),
          },
        });
      },
      on: {
        init: function () {
          this.params.keyboard.enabled && this.keyboard.enable();
        },
        destroy: function () {
          this.keyboard.enabled && this.keyboard.disable();
        },
      },
    };
  var ie = {
      lastScrollTime: n.now(),
      lastEventBeforeSnap: void 0,
      recentWheelEvents: [],
      event: function () {
        return t.navigator.userAgent.indexOf('firefox') > -1
          ? 'DOMMouseScroll'
          : (function () {
              var t = 'onwheel' in e;
              if (!t) {
                var i = e.createElement('div');
                i.setAttribute('onwheel', 'return;'),
                  (t = 'function' == typeof i.onwheel);
              }
              return (
                !t &&
                  e.implementation &&
                  e.implementation.hasFeature &&
                  !0 !== e.implementation.hasFeature('', '') &&
                  (t = e.implementation.hasFeature('Events.wheel', '3.0')),
                t
              );
            })()
          ? 'wheel'
          : 'mousewheel';
      },
      normalize: function (e) {
        var t = 0,
          i = 0,
          s = 0,
          a = 0;
        return (
          'detail' in e && (i = e.detail),
          'wheelDelta' in e && (i = -e.wheelDelta / 120),
          'wheelDeltaY' in e && (i = -e.wheelDeltaY / 120),
          'wheelDeltaX' in e && (t = -e.wheelDeltaX / 120),
          'axis' in e && e.axis === e.HORIZONTAL_AXIS && ((t = i), (i = 0)),
          (s = 10 * t),
          (a = 10 * i),
          'deltaY' in e && (a = e.deltaY),
          'deltaX' in e && (s = e.deltaX),
          e.shiftKey && !s && ((s = a), (a = 0)),
          (s || a) &&
            e.deltaMode &&
            (1 === e.deltaMode
              ? ((s *= 40), (a *= 40))
              : ((s *= 800), (a *= 800))),
          s && !t && (t = s < 1 ? -1 : 1),
          a && !i && (i = a < 1 ? -1 : 1),
          { spinX: t, spinY: i, pixelX: s, pixelY: a }
        );
      },
      handleMouseEnter: function () {
        this.mouseEntered = !0;
      },
      handleMouseLeave: function () {
        this.mouseEntered = !1;
      },
      handle: function (e) {
        var t = e,
          i = this,
          a = i.params.mousewheel;
        i.params.cssMode && t.preventDefault();
        var r = i.$el;
        if (
          ('container' !== i.params.mousewheel.eventsTarged &&
            (r = s(i.params.mousewheel.eventsTarged)),
          !i.mouseEntered && !r[0].contains(t.target) && !a.releaseOnEdges)
        )
          return !0;
        t.originalEvent && (t = t.originalEvent);
        var o = 0,
          l = i.rtlTranslate ? -1 : 1,
          d = ie.normalize(t);
        if (a.forceToAxis)
          if (i.isHorizontal()) {
            if (!(Math.abs(d.pixelX) > Math.abs(d.pixelY))) return !0;
            o = d.pixelX * l;
          } else {
            if (!(Math.abs(d.pixelY) > Math.abs(d.pixelX))) return !0;
            o = d.pixelY;
          }
        else
          o =
            Math.abs(d.pixelX) > Math.abs(d.pixelY) ? -d.pixelX * l : -d.pixelY;
        if (0 === o) return !0;
        if ((a.invert && (o = -o), i.params.freeMode)) {
          var h = {
              time: n.now(),
              delta: Math.abs(o),
              direction: Math.sign(o),
            },
            p = i.mousewheel.lastEventBeforeSnap,
            c =
              p &&
              h.time < p.time + 500 &&
              h.delta <= p.delta &&
              h.direction === p.direction;
          if (!c) {
            (i.mousewheel.lastEventBeforeSnap = void 0),
              i.params.loop && i.loopFix();
            var u = i.getTranslate() + o * a.sensitivity,
              v = i.isBeginning,
              f = i.isEnd;
            if (
              (u >= i.minTranslate() && (u = i.minTranslate()),
              u <= i.maxTranslate() && (u = i.maxTranslate()),
              i.setTransition(0),
              i.setTranslate(u),
              i.updateProgress(),
              i.updateActiveIndex(),
              i.updateSlidesClasses(),
              ((!v && i.isBeginning) || (!f && i.isEnd)) &&
                i.updateSlidesClasses(),
              i.params.freeModeSticky)
            ) {
              clearTimeout(i.mousewheel.timeout),
                (i.mousewheel.timeout = void 0);
              var m = i.mousewheel.recentWheelEvents;
              m.length >= 15 && m.shift();
              var g = m.length ? m[m.length - 1] : void 0,
                b = m[0];
              if (
                (m.push(h),
                g && (h.delta > g.delta || h.direction !== g.direction))
              )
                m.splice(0);
              else if (
                m.length >= 15 &&
                h.time - b.time < 500 &&
                b.delta - h.delta >= 1 &&
                h.delta <= 6
              ) {
                var w = o > 0 ? 0.8 : 0.2;
                (i.mousewheel.lastEventBeforeSnap = h),
                  m.splice(0),
                  (i.mousewheel.timeout = n.nextTick(function () {
                    i.slideToClosest(i.params.speed, !0, void 0, w);
                  }, 0));
              }
              i.mousewheel.timeout ||
                (i.mousewheel.timeout = n.nextTick(function () {
                  (i.mousewheel.lastEventBeforeSnap = h),
                    m.splice(0),
                    i.slideToClosest(i.params.speed, !0, void 0, 0.5);
                }, 500));
            }
            if (
              (c || i.emit('scroll', t),
              i.params.autoplay &&
                i.params.autoplayDisableOnInteraction &&
                i.autoplay.stop(),
              u === i.minTranslate() || u === i.maxTranslate())
            )
              return !0;
          }
        } else {
          var y = {
              time: n.now(),
              delta: Math.abs(o),
              direction: Math.sign(o),
              raw: e,
            },
            x = i.mousewheel.recentWheelEvents;
          x.length >= 2 && x.shift();
          var T = x.length ? x[x.length - 1] : void 0;
          if (
            (x.push(y),
            T
              ? (y.direction !== T.direction || y.delta > T.delta) &&
                i.mousewheel.animateSlider(y)
              : i.mousewheel.animateSlider(y),
            i.mousewheel.releaseScroll(y))
          )
            return !0;
        }
        return t.preventDefault ? t.preventDefault() : (t.returnValue = !1), !1;
      },
      animateSlider: function (e) {
        return (
          (e.delta >= 6 && n.now() - this.mousewheel.lastScrollTime < 60) ||
          (e.direction < 0
            ? (this.isEnd && !this.params.loop) ||
              this.animating ||
              (this.slideNext(), this.emit('scroll', e.raw))
            : (this.isBeginning && !this.params.loop) ||
              this.animating ||
              (this.slidePrev(), this.emit('scroll', e.raw)),
          (this.mousewheel.lastScrollTime = new t.Date().getTime()),
          !1)
        );
      },
      releaseScroll: function (e) {
        var t = this.params.mousewheel;
        if (e.direction < 0) {
          if (this.isEnd && !this.params.loop && t.releaseOnEdges) return !0;
        } else if (this.isBeginning && !this.params.loop && t.releaseOnEdges)
          return !0;
        return !1;
      },
      enable: function () {
        var e = ie.event();
        if (this.params.cssMode)
          return (
            this.wrapperEl.removeEventListener(e, this.mousewheel.handle), !0
          );
        if (!e) return !1;
        if (this.mousewheel.enabled) return !1;
        var t = this.$el;
        return (
          'container' !== this.params.mousewheel.eventsTarged &&
            (t = s(this.params.mousewheel.eventsTarged)),
          t.on('mouseenter', this.mousewheel.handleMouseEnter),
          t.on('mouseleave', this.mousewheel.handleMouseLeave),
          t.on(e, this.mousewheel.handle),
          (this.mousewheel.enabled = !0),
          !0
        );
      },
      disable: function () {
        var e = ie.event();
        if (this.params.cssMode)
          return this.wrapperEl.addEventListener(e, this.mousewheel.handle), !0;
        if (!e) return !1;
        if (!this.mousewheel.enabled) return !1;
        var t = this.$el;
        return (
          'container' !== this.params.mousewheel.eventsTarged &&
            (t = s(this.params.mousewheel.eventsTarged)),
          t.off(e, this.mousewheel.handle),
          (this.mousewheel.enabled = !1),
          !0
        );
      },
    },
    se = {
      update: function () {
        var e = this.params.navigation;
        if (!this.params.loop) {
          var t = this.navigation,
            i = t.$nextEl,
            s = t.$prevEl;
          s &&
            s.length > 0 &&
            (this.isBeginning
              ? s.addClass(e.disabledClass)
              : s.removeClass(e.disabledClass),
            s[
              this.params.watchOverflow && this.isLocked
                ? 'addClass'
                : 'removeClass'
            ](e.lockClass)),
            i &&
              i.length > 0 &&
              (this.isEnd
                ? i.addClass(e.disabledClass)
                : i.removeClass(e.disabledClass),
              i[
                this.params.watchOverflow && this.isLocked
                  ? 'addClass'
                  : 'removeClass'
              ](e.lockClass));
        }
      },
      onPrevClick: function (e) {
        e.preventDefault(),
          (this.isBeginning && !this.params.loop) || this.slidePrev();
      },
      onNextClick: function (e) {
        e.preventDefault(),
          (this.isEnd && !this.params.loop) || this.slideNext();
      },
      init: function () {
        var e,
          t,
          i = this.params.navigation;
        (i.nextEl || i.prevEl) &&
          (i.nextEl &&
            ((e = s(i.nextEl)),
            this.params.uniqueNavElements &&
              'string' == typeof i.nextEl &&
              e.length > 1 &&
              1 === this.$el.find(i.nextEl).length &&
              (e = this.$el.find(i.nextEl))),
          i.prevEl &&
            ((t = s(i.prevEl)),
            this.params.uniqueNavElements &&
              'string' == typeof i.prevEl &&
              t.length > 1 &&
              1 === this.$el.find(i.prevEl).length &&
              (t = this.$el.find(i.prevEl))),
          e && e.length > 0 && e.on('click', this.navigation.onNextClick),
          t && t.length > 0 && t.on('click', this.navigation.onPrevClick),
          n.extend(this.navigation, {
            $nextEl: e,
            nextEl: e && e[0],
            $prevEl: t,
            prevEl: t && t[0],
          }));
      },
      destroy: function () {
        var e = this.navigation,
          t = e.$nextEl,
          i = e.$prevEl;
        t &&
          t.length &&
          (t.off('click', this.navigation.onNextClick),
          t.removeClass(this.params.navigation.disabledClass)),
          i &&
            i.length &&
            (i.off('click', this.navigation.onPrevClick),
            i.removeClass(this.params.navigation.disabledClass));
      },
    },
    ae = {
      update: function () {
        var e = this.rtl,
          t = this.params.pagination;
        if (
          t.el &&
          this.pagination.el &&
          this.pagination.$el &&
          0 !== this.pagination.$el.length
        ) {
          var i,
            a =
              this.virtual && this.params.virtual.enabled
                ? this.virtual.slides.length
                : this.slides.length,
            r = this.pagination.$el,
            n = this.params.loop
              ? Math.ceil(
                  (a - 2 * this.loopedSlides) / this.params.slidesPerGroup
                )
              : this.snapGrid.length;
          if (
            (this.params.loop
              ? ((i = Math.ceil(
                  (this.activeIndex - this.loopedSlides) /
                    this.params.slidesPerGroup
                )) >
                  a - 1 - 2 * this.loopedSlides &&
                  (i -= a - 2 * this.loopedSlides),
                i > n - 1 && (i -= n),
                i < 0 &&
                  'bullets' !== this.params.paginationType &&
                  (i = n + i))
              : (i =
                  void 0 !== this.snapIndex
                    ? this.snapIndex
                    : this.activeIndex || 0),
            'bullets' === t.type &&
              this.pagination.bullets &&
              this.pagination.bullets.length > 0)
          ) {
            var o,
              l,
              d,
              h = this.pagination.bullets;
            if (
              (t.dynamicBullets &&
                ((this.pagination.bulletSize = h
                  .eq(0)
                  [this.isHorizontal() ? 'outerWidth' : 'outerHeight'](!0)),
                r.css(
                  this.isHorizontal() ? 'width' : 'height',
                  this.pagination.bulletSize * (t.dynamicMainBullets + 4) + 'px'
                ),
                t.dynamicMainBullets > 1 &&
                  void 0 !== this.previousIndex &&
                  ((this.pagination.dynamicBulletIndex +=
                    i - this.previousIndex),
                  this.pagination.dynamicBulletIndex > t.dynamicMainBullets - 1
                    ? (this.pagination.dynamicBulletIndex =
                        t.dynamicMainBullets - 1)
                    : this.pagination.dynamicBulletIndex < 0 &&
                      (this.pagination.dynamicBulletIndex = 0)),
                (o = i - this.pagination.dynamicBulletIndex),
                (d =
                  ((l = o + (Math.min(h.length, t.dynamicMainBullets) - 1)) +
                    o) /
                  2)),
              h.removeClass(
                t.bulletActiveClass +
                  ' ' +
                  t.bulletActiveClass +
                  '-next ' +
                  t.bulletActiveClass +
                  '-next-next ' +
                  t.bulletActiveClass +
                  '-prev ' +
                  t.bulletActiveClass +
                  '-prev-prev ' +
                  t.bulletActiveClass +
                  '-main'
              ),
              r.length > 1)
            )
              h.each(function (e, a) {
                var r = s(a),
                  n = r.index();
                n === i && r.addClass(t.bulletActiveClass),
                  t.dynamicBullets &&
                    (n >= o &&
                      n <= l &&
                      r.addClass(t.bulletActiveClass + '-main'),
                    n === o &&
                      r
                        .prev()
                        .addClass(t.bulletActiveClass + '-prev')
                        .prev()
                        .addClass(t.bulletActiveClass + '-prev-prev'),
                    n === l &&
                      r
                        .next()
                        .addClass(t.bulletActiveClass + '-next')
                        .next()
                        .addClass(t.bulletActiveClass + '-next-next'));
              });
            else {
              var p = h.eq(i),
                c = p.index();
              if ((p.addClass(t.bulletActiveClass), t.dynamicBullets)) {
                for (var u = h.eq(o), v = h.eq(l), f = o; f <= l; f += 1)
                  h.eq(f).addClass(t.bulletActiveClass + '-main');
                if (this.params.loop)
                  if (c >= h.length - t.dynamicMainBullets) {
                    for (var m = t.dynamicMainBullets; m >= 0; m -= 1)
                      h.eq(h.length - m).addClass(
                        t.bulletActiveClass + '-main'
                      );
                    h.eq(h.length - t.dynamicMainBullets - 1).addClass(
                      t.bulletActiveClass + '-prev'
                    );
                  } else
                    u
                      .prev()
                      .addClass(t.bulletActiveClass + '-prev')
                      .prev()
                      .addClass(t.bulletActiveClass + '-prev-prev'),
                      v
                        .next()
                        .addClass(t.bulletActiveClass + '-next')
                        .next()
                        .addClass(t.bulletActiveClass + '-next-next');
                else
                  u
                    .prev()
                    .addClass(t.bulletActiveClass + '-prev')
                    .prev()
                    .addClass(t.bulletActiveClass + '-prev-prev'),
                    v
                      .next()
                      .addClass(t.bulletActiveClass + '-next')
                      .next()
                      .addClass(t.bulletActiveClass + '-next-next');
              }
            }
            if (t.dynamicBullets) {
              var g = Math.min(h.length, t.dynamicMainBullets + 4),
                b =
                  (this.pagination.bulletSize * g -
                    this.pagination.bulletSize) /
                    2 -
                  d * this.pagination.bulletSize,
                w = e ? 'right' : 'left';
              h.css(this.isHorizontal() ? w : 'top', b + 'px');
            }
          }
          if (
            ('fraction' === t.type &&
              (r
                .find('.' + t.currentClass)
                .text(t.formatFractionCurrent(i + 1)),
              r.find('.' + t.totalClass).text(t.formatFractionTotal(n))),
            'progressbar' === t.type)
          ) {
            var y;
            y = t.progressbarOpposite
              ? this.isHorizontal()
                ? 'vertical'
                : 'horizontal'
              : this.isHorizontal()
              ? 'horizontal'
              : 'vertical';
            var x = (i + 1) / n,
              T = 1,
              E = 1;
            'horizontal' === y ? (T = x) : (E = x),
              r
                .find('.' + t.progressbarFillClass)
                .transform(
                  'translate3d(0,0,0) scaleX(' + T + ') scaleY(' + E + ')'
                )
                .transition(this.params.speed);
          }
          'custom' === t.type && t.renderCustom
            ? (r.html(t.renderCustom(this, i + 1, n)),
              this.emit('paginationRender', this, r[0]))
            : this.emit('paginationUpdate', this, r[0]),
            r[
              this.params.watchOverflow && this.isLocked
                ? 'addClass'
                : 'removeClass'
            ](t.lockClass);
        }
      },
      render: function () {
        var e = this.params.pagination;
        if (
          e.el &&
          this.pagination.el &&
          this.pagination.$el &&
          0 !== this.pagination.$el.length
        ) {
          var t =
              this.virtual && this.params.virtual.enabled
                ? this.virtual.slides.length
                : this.slides.length,
            i = this.pagination.$el,
            s = '';
          if ('bullets' === e.type) {
            for (
              var a = this.params.loop
                  ? Math.ceil(
                      (t - 2 * this.loopedSlides) / this.params.slidesPerGroup
                    )
                  : this.snapGrid.length,
                r = 0;
              r < a;
              r += 1
            )
              e.renderBullet
                ? (s += e.renderBullet.call(this, r, e.bulletClass))
                : (s +=
                    '<' +
                    e.bulletElement +
                    ' class="' +
                    e.bulletClass +
                    '"></' +
                    e.bulletElement +
                    '>');
            i.html(s), (this.pagination.bullets = i.find('.' + e.bulletClass));
          }
          'fraction' === e.type &&
            ((s = e.renderFraction
              ? e.renderFraction.call(this, e.currentClass, e.totalClass)
              : '<span class="' +
                e.currentClass +
                '"></span> / <span class="' +
                e.totalClass +
                '"></span>'),
            i.html(s)),
            'progressbar' === e.type &&
              ((s = e.renderProgressbar
                ? e.renderProgressbar.call(this, e.progressbarFillClass)
                : '<span class="' + e.progressbarFillClass + '"></span>'),
              i.html(s)),
            'custom' !== e.type &&
              this.emit('paginationRender', this.pagination.$el[0]);
        }
      },
      init: function () {
        var e = this,
          t = e.params.pagination;
        if (t.el) {
          var i = s(t.el);
          0 !== i.length &&
            (e.params.uniqueNavElements &&
              'string' == typeof t.el &&
              i.length > 1 &&
              1 === e.$el.find(t.el).length &&
              (i = e.$el.find(t.el)),
            'bullets' === t.type && t.clickable && i.addClass(t.clickableClass),
            i.addClass(t.modifierClass + t.type),
            'bullets' === t.type &&
              t.dynamicBullets &&
              (i.addClass('' + t.modifierClass + t.type + '-dynamic'),
              (e.pagination.dynamicBulletIndex = 0),
              t.dynamicMainBullets < 1 && (t.dynamicMainBullets = 1)),
            'progressbar' === t.type &&
              t.progressbarOpposite &&
              i.addClass(t.progressbarOppositeClass),
            t.clickable &&
              i.on('click', '.' + t.bulletClass, function (t) {
                t.preventDefault();
                var i = s(this).index() * e.params.slidesPerGroup;
                e.params.loop && (i += e.loopedSlides), e.slideTo(i);
              }),
            n.extend(e.pagination, { $el: i, el: i[0] }));
        }
      },
      destroy: function () {
        var e = this.params.pagination;
        if (
          e.el &&
          this.pagination.el &&
          this.pagination.$el &&
          0 !== this.pagination.$el.length
        ) {
          var t = this.pagination.$el;
          t.removeClass(e.hiddenClass),
            t.removeClass(e.modifierClass + e.type),
            this.pagination.bullets &&
              this.pagination.bullets.removeClass(e.bulletActiveClass),
            e.clickable && t.off('click', '.' + e.bulletClass);
        }
      },
    },
    re = {
      setTranslate: function () {
        if (this.params.scrollbar.el && this.scrollbar.el) {
          var e = this.scrollbar,
            t = this.rtlTranslate,
            i = this.progress,
            s = e.dragSize,
            a = e.trackSize,
            r = e.$dragEl,
            n = e.$el,
            o = this.params.scrollbar,
            l = s,
            d = (a - s) * i;
          t
            ? (d = -d) > 0
              ? ((l = s - d), (d = 0))
              : -d + s > a && (l = a + d)
            : d < 0
            ? ((l = s + d), (d = 0))
            : d + s > a && (l = a - d),
            this.isHorizontal()
              ? (r.transform('translate3d(' + d + 'px, 0, 0)'),
                (r[0].style.width = l + 'px'))
              : (r.transform('translate3d(0px, ' + d + 'px, 0)'),
                (r[0].style.height = l + 'px')),
            o.hide &&
              (clearTimeout(this.scrollbar.timeout),
              (n[0].style.opacity = 1),
              (this.scrollbar.timeout = setTimeout(function () {
                (n[0].style.opacity = 0), n.transition(400);
              }, 1e3)));
        }
      },
      setTransition: function (e) {
        this.params.scrollbar.el &&
          this.scrollbar.el &&
          this.scrollbar.$dragEl.transition(e);
      },
      updateSize: function () {
        if (this.params.scrollbar.el && this.scrollbar.el) {
          var e = this.scrollbar,
            t = e.$dragEl,
            i = e.$el;
          (t[0].style.width = ''), (t[0].style.height = '');
          var s,
            a = this.isHorizontal() ? i[0].offsetWidth : i[0].offsetHeight,
            r = this.size / this.virtualSize,
            o = r * (a / this.size);
          (s =
            'auto' === this.params.scrollbar.dragSize
              ? a * r
              : parseInt(this.params.scrollbar.dragSize, 10)),
            this.isHorizontal()
              ? (t[0].style.width = s + 'px')
              : (t[0].style.height = s + 'px'),
            (i[0].style.display = r >= 1 ? 'none' : ''),
            this.params.scrollbar.hide && (i[0].style.opacity = 0),
            n.extend(e, {
              trackSize: a,
              divider: r,
              moveDivider: o,
              dragSize: s,
            }),
            e.$el[
              this.params.watchOverflow && this.isLocked
                ? 'addClass'
                : 'removeClass'
            ](this.params.scrollbar.lockClass);
        }
      },
      getPointerPosition: function (e) {
        return this.isHorizontal()
          ? 'touchstart' === e.type || 'touchmove' === e.type
            ? e.targetTouches[0].clientX
            : e.clientX
          : 'touchstart' === e.type || 'touchmove' === e.type
          ? e.targetTouches[0].clientY
          : e.clientY;
      },
      setDragPosition: function (e) {
        var t,
          i = this.scrollbar,
          s = this.rtlTranslate,
          a = i.$el,
          r = i.dragSize,
          n = i.trackSize,
          o = i.dragStartPos;
        (t =
          (i.getPointerPosition(e) -
            a.offset()[this.isHorizontal() ? 'left' : 'top'] -
            (null !== o ? o : r / 2)) /
          (n - r)),
          (t = Math.max(Math.min(t, 1), 0)),
          s && (t = 1 - t);
        var l =
          this.minTranslate() + (this.maxTranslate() - this.minTranslate()) * t;
        this.updateProgress(l),
          this.setTranslate(l),
          this.updateActiveIndex(),
          this.updateSlidesClasses();
      },
      onDragStart: function (e) {
        var t = this.params.scrollbar,
          i = this.scrollbar,
          s = this.$wrapperEl,
          a = i.$el,
          r = i.$dragEl;
        (this.scrollbar.isTouched = !0),
          (this.scrollbar.dragStartPos =
            e.target === r[0] || e.target === r
              ? i.getPointerPosition(e) -
                e.target.getBoundingClientRect()[
                  this.isHorizontal() ? 'left' : 'top'
                ]
              : null),
          e.preventDefault(),
          e.stopPropagation(),
          s.transition(100),
          r.transition(100),
          i.setDragPosition(e),
          clearTimeout(this.scrollbar.dragTimeout),
          a.transition(0),
          t.hide && a.css('opacity', 1),
          this.params.cssMode &&
            this.$wrapperEl.css('scroll-snap-type', 'none'),
          this.emit('scrollbarDragStart', e);
      },
      onDragMove: function (e) {
        var t = this.scrollbar,
          i = this.$wrapperEl,
          s = t.$el,
          a = t.$dragEl;
        this.scrollbar.isTouched &&
          (e.preventDefault ? e.preventDefault() : (e.returnValue = !1),
          t.setDragPosition(e),
          i.transition(0),
          s.transition(0),
          a.transition(0),
          this.emit('scrollbarDragMove', e));
      },
      onDragEnd: function (e) {
        var t = this.params.scrollbar,
          i = this.scrollbar,
          s = this.$wrapperEl,
          a = i.$el;
        this.scrollbar.isTouched &&
          ((this.scrollbar.isTouched = !1),
          this.params.cssMode &&
            (this.$wrapperEl.css('scroll-snap-type', ''), s.transition('')),
          t.hide &&
            (clearTimeout(this.scrollbar.dragTimeout),
            (this.scrollbar.dragTimeout = n.nextTick(function () {
              a.css('opacity', 0), a.transition(400);
            }, 1e3))),
          this.emit('scrollbarDragEnd', e),
          t.snapOnRelease && this.slideToClosest());
      },
      enableDraggable: function () {
        if (this.params.scrollbar.el) {
          var t = this.scrollbar,
            i = this.touchEventsTouch,
            s = this.touchEventsDesktop,
            a = this.params,
            r = t.$el[0],
            n = !(!o.passiveListener || !a.passiveListeners) && {
              passive: !1,
              capture: !1,
            },
            l = !(!o.passiveListener || !a.passiveListeners) && {
              passive: !0,
              capture: !1,
            };
          o.touch
            ? (r.addEventListener(i.start, this.scrollbar.onDragStart, n),
              r.addEventListener(i.move, this.scrollbar.onDragMove, n),
              r.addEventListener(i.end, this.scrollbar.onDragEnd, l))
            : (r.addEventListener(s.start, this.scrollbar.onDragStart, n),
              e.addEventListener(s.move, this.scrollbar.onDragMove, n),
              e.addEventListener(s.end, this.scrollbar.onDragEnd, l));
        }
      },
      disableDraggable: function () {
        if (this.params.scrollbar.el) {
          var t = this.scrollbar,
            i = this.touchEventsTouch,
            s = this.touchEventsDesktop,
            a = this.params,
            r = t.$el[0],
            n = !(!o.passiveListener || !a.passiveListeners) && {
              passive: !1,
              capture: !1,
            },
            l = !(!o.passiveListener || !a.passiveListeners) && {
              passive: !0,
              capture: !1,
            };
          o.touch
            ? (r.removeEventListener(i.start, this.scrollbar.onDragStart, n),
              r.removeEventListener(i.move, this.scrollbar.onDragMove, n),
              r.removeEventListener(i.end, this.scrollbar.onDragEnd, l))
            : (r.removeEventListener(s.start, this.scrollbar.onDragStart, n),
              e.removeEventListener(s.move, this.scrollbar.onDragMove, n),
              e.removeEventListener(s.end, this.scrollbar.onDragEnd, l));
        }
      },
      init: function () {
        if (this.params.scrollbar.el) {
          var e = this.scrollbar,
            t = this.$el,
            i = this.params.scrollbar,
            a = s(i.el);
          this.params.uniqueNavElements &&
            'string' == typeof i.el &&
            a.length > 1 &&
            1 === t.find(i.el).length &&
            (a = t.find(i.el));
          var r = a.find('.' + this.params.scrollbar.dragClass);
          0 === r.length &&
            ((r = s(
              '<div class="' + this.params.scrollbar.dragClass + '"></div>'
            )),
            a.append(r)),
            n.extend(e, { $el: a, el: a[0], $dragEl: r, dragEl: r[0] }),
            i.draggable && e.enableDraggable();
        }
      },
      destroy: function () {
        this.scrollbar.disableDraggable();
      },
    },
    ne = {
      setTransform: function (e, t) {
        var i = this.rtl,
          a = s(e),
          r = i ? -1 : 1,
          n = a.attr('data-swiper-parallax') || '0',
          o = a.attr('data-swiper-parallax-x'),
          l = a.attr('data-swiper-parallax-y'),
          d = a.attr('data-swiper-parallax-scale'),
          h = a.attr('data-swiper-parallax-opacity');
        if (
          (o || l
            ? ((o = o || '0'), (l = l || '0'))
            : this.isHorizontal()
            ? ((o = n), (l = '0'))
            : ((l = n), (o = '0')),
          (o =
            o.indexOf('%') >= 0
              ? parseInt(o, 10) * t * r + '%'
              : o * t * r + 'px'),
          (l = l.indexOf('%') >= 0 ? parseInt(l, 10) * t + '%' : l * t + 'px'),
          null != h)
        ) {
          var p = h - (h - 1) * (1 - Math.abs(t));
          a[0].style.opacity = p;
        }
        if (null == d) a.transform('translate3d(' + o + ', ' + l + ', 0px)');
        else {
          var c = d - (d - 1) * (1 - Math.abs(t));
          a.transform(
            'translate3d(' + o + ', ' + l + ', 0px) scale(' + c + ')'
          );
        }
      },
      setTranslate: function () {
        var e = this,
          t = e.$el,
          i = e.slides,
          a = e.progress,
          r = e.snapGrid;
        t
          .children(
            '[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]'
          )
          .each(function (t, i) {
            e.parallax.setTransform(i, a);
          }),
          i.each(function (t, i) {
            var n = i.progress;
            e.params.slidesPerGroup > 1 &&
              'auto' !== e.params.slidesPerView &&
              (n += Math.ceil(t / 2) - a * (r.length - 1)),
              (n = Math.min(Math.max(n, -1), 1)),
              s(i)
                .find(
                  '[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]'
                )
                .each(function (t, i) {
                  e.parallax.setTransform(i, n);
                });
          });
      },
      setTransition: function (e) {
        void 0 === e && (e = this.params.speed);
        this.$el
          .find(
            '[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]'
          )
          .each(function (t, i) {
            var a = s(i),
              r = parseInt(a.attr('data-swiper-parallax-duration'), 10) || e;
            0 === e && (r = 0), a.transition(r);
          });
      },
    },
    oe = {
      getDistanceBetweenTouches: function (e) {
        if (e.targetTouches.length < 2) return 1;
        var t = e.targetTouches[0].pageX,
          i = e.targetTouches[0].pageY,
          s = e.targetTouches[1].pageX,
          a = e.targetTouches[1].pageY;
        return Math.sqrt(Math.pow(s - t, 2) + Math.pow(a - i, 2));
      },
      onGestureStart: function (e) {
        var t = this.params.zoom,
          i = this.zoom,
          a = i.gesture;
        if (
          ((i.fakeGestureTouched = !1), (i.fakeGestureMoved = !1), !o.gestures)
        ) {
          if (
            'touchstart' !== e.type ||
            ('touchstart' === e.type && e.targetTouches.length < 2)
          )
            return;
          (i.fakeGestureTouched = !0),
            (a.scaleStart = oe.getDistanceBetweenTouches(e));
        }
        (a.$slideEl && a.$slideEl.length) ||
        ((a.$slideEl = s(e.target).closest('.' + this.params.slideClass)),
        0 === a.$slideEl.length &&
          (a.$slideEl = this.slides.eq(this.activeIndex)),
        (a.$imageEl = a.$slideEl.find(
          'img, svg, canvas, picture, .swiper-zoom-target'
        )),
        (a.$imageWrapEl = a.$imageEl.parent('.' + t.containerClass)),
        (a.maxRatio = a.$imageWrapEl.attr('data-swiper-zoom') || t.maxRatio),
        0 !== a.$imageWrapEl.length)
          ? (a.$imageEl.transition(0), (this.zoom.isScaling = !0))
          : (a.$imageEl = void 0);
      },
      onGestureChange: function (e) {
        var t = this.params.zoom,
          i = this.zoom,
          s = i.gesture;
        if (!o.gestures) {
          if (
            'touchmove' !== e.type ||
            ('touchmove' === e.type && e.targetTouches.length < 2)
          )
            return;
          (i.fakeGestureMoved = !0),
            (s.scaleMove = oe.getDistanceBetweenTouches(e));
        }
        s.$imageEl &&
          0 !== s.$imageEl.length &&
          (o.gestures
            ? (i.scale = e.scale * i.currentScale)
            : (i.scale = (s.scaleMove / s.scaleStart) * i.currentScale),
          i.scale > s.maxRatio &&
            (i.scale =
              s.maxRatio - 1 + Math.pow(i.scale - s.maxRatio + 1, 0.5)),
          i.scale < t.minRatio &&
            (i.scale =
              t.minRatio + 1 - Math.pow(t.minRatio - i.scale + 1, 0.5)),
          s.$imageEl.transform('translate3d(0,0,0) scale(' + i.scale + ')'));
      },
      onGestureEnd: function (e) {
        var t = this.params.zoom,
          i = this.zoom,
          s = i.gesture;
        if (!o.gestures) {
          if (!i.fakeGestureTouched || !i.fakeGestureMoved) return;
          if (
            'touchend' !== e.type ||
            ('touchend' === e.type && e.changedTouches.length < 2 && !I.android)
          )
            return;
          (i.fakeGestureTouched = !1), (i.fakeGestureMoved = !1);
        }
        s.$imageEl &&
          0 !== s.$imageEl.length &&
          ((i.scale = Math.max(Math.min(i.scale, s.maxRatio), t.minRatio)),
          s.$imageEl
            .transition(this.params.speed)
            .transform('translate3d(0,0,0) scale(' + i.scale + ')'),
          (i.currentScale = i.scale),
          (i.isScaling = !1),
          1 === i.scale && (s.$slideEl = void 0));
      },
      onTouchStart: function (e) {
        var t = this.zoom,
          i = t.gesture,
          s = t.image;
        i.$imageEl &&
          0 !== i.$imageEl.length &&
          (s.isTouched ||
            (I.android && e.preventDefault(),
            (s.isTouched = !0),
            (s.touchesStart.x =
              'touchstart' === e.type ? e.targetTouches[0].pageX : e.pageX),
            (s.touchesStart.y =
              'touchstart' === e.type ? e.targetTouches[0].pageY : e.pageY)));
      },
      onTouchMove: function (e) {
        var t = this.zoom,
          i = t.gesture,
          s = t.image,
          a = t.velocity;
        if (
          i.$imageEl &&
          0 !== i.$imageEl.length &&
          ((this.allowClick = !1), s.isTouched && i.$slideEl)
        ) {
          s.isMoved ||
            ((s.width = i.$imageEl[0].offsetWidth),
            (s.height = i.$imageEl[0].offsetHeight),
            (s.startX = n.getTranslate(i.$imageWrapEl[0], 'x') || 0),
            (s.startY = n.getTranslate(i.$imageWrapEl[0], 'y') || 0),
            (i.slideWidth = i.$slideEl[0].offsetWidth),
            (i.slideHeight = i.$slideEl[0].offsetHeight),
            i.$imageWrapEl.transition(0),
            this.rtl && ((s.startX = -s.startX), (s.startY = -s.startY)));
          var r = s.width * t.scale,
            o = s.height * t.scale;
          if (!(r < i.slideWidth && o < i.slideHeight)) {
            if (
              ((s.minX = Math.min(i.slideWidth / 2 - r / 2, 0)),
              (s.maxX = -s.minX),
              (s.minY = Math.min(i.slideHeight / 2 - o / 2, 0)),
              (s.maxY = -s.minY),
              (s.touchesCurrent.x =
                'touchmove' === e.type ? e.targetTouches[0].pageX : e.pageX),
              (s.touchesCurrent.y =
                'touchmove' === e.type ? e.targetTouches[0].pageY : e.pageY),
              !s.isMoved && !t.isScaling)
            ) {
              if (
                this.isHorizontal() &&
                ((Math.floor(s.minX) === Math.floor(s.startX) &&
                  s.touchesCurrent.x < s.touchesStart.x) ||
                  (Math.floor(s.maxX) === Math.floor(s.startX) &&
                    s.touchesCurrent.x > s.touchesStart.x))
              )
                return void (s.isTouched = !1);
              if (
                !this.isHorizontal() &&
                ((Math.floor(s.minY) === Math.floor(s.startY) &&
                  s.touchesCurrent.y < s.touchesStart.y) ||
                  (Math.floor(s.maxY) === Math.floor(s.startY) &&
                    s.touchesCurrent.y > s.touchesStart.y))
              )
                return void (s.isTouched = !1);
            }
            e.preventDefault(),
              e.stopPropagation(),
              (s.isMoved = !0),
              (s.currentX = s.touchesCurrent.x - s.touchesStart.x + s.startX),
              (s.currentY = s.touchesCurrent.y - s.touchesStart.y + s.startY),
              s.currentX < s.minX &&
                (s.currentX =
                  s.minX + 1 - Math.pow(s.minX - s.currentX + 1, 0.8)),
              s.currentX > s.maxX &&
                (s.currentX =
                  s.maxX - 1 + Math.pow(s.currentX - s.maxX + 1, 0.8)),
              s.currentY < s.minY &&
                (s.currentY =
                  s.minY + 1 - Math.pow(s.minY - s.currentY + 1, 0.8)),
              s.currentY > s.maxY &&
                (s.currentY =
                  s.maxY - 1 + Math.pow(s.currentY - s.maxY + 1, 0.8)),
              a.prevPositionX || (a.prevPositionX = s.touchesCurrent.x),
              a.prevPositionY || (a.prevPositionY = s.touchesCurrent.y),
              a.prevTime || (a.prevTime = Date.now()),
              (a.x =
                (s.touchesCurrent.x - a.prevPositionX) /
                (Date.now() - a.prevTime) /
                2),
              (a.y =
                (s.touchesCurrent.y - a.prevPositionY) /
                (Date.now() - a.prevTime) /
                2),
              Math.abs(s.touchesCurrent.x - a.prevPositionX) < 2 && (a.x = 0),
              Math.abs(s.touchesCurrent.y - a.prevPositionY) < 2 && (a.y = 0),
              (a.prevPositionX = s.touchesCurrent.x),
              (a.prevPositionY = s.touchesCurrent.y),
              (a.prevTime = Date.now()),
              i.$imageWrapEl.transform(
                'translate3d(' + s.currentX + 'px, ' + s.currentY + 'px,0)'
              );
          }
        }
      },
      onTouchEnd: function () {
        var e = this.zoom,
          t = e.gesture,
          i = e.image,
          s = e.velocity;
        if (t.$imageEl && 0 !== t.$imageEl.length) {
          if (!i.isTouched || !i.isMoved)
            return (i.isTouched = !1), void (i.isMoved = !1);
          (i.isTouched = !1), (i.isMoved = !1);
          var a = 300,
            r = 300,
            n = s.x * a,
            o = i.currentX + n,
            l = s.y * r,
            d = i.currentY + l;
          0 !== s.x && (a = Math.abs((o - i.currentX) / s.x)),
            0 !== s.y && (r = Math.abs((d - i.currentY) / s.y));
          var h = Math.max(a, r);
          (i.currentX = o), (i.currentY = d);
          var p = i.width * e.scale,
            c = i.height * e.scale;
          (i.minX = Math.min(t.slideWidth / 2 - p / 2, 0)),
            (i.maxX = -i.minX),
            (i.minY = Math.min(t.slideHeight / 2 - c / 2, 0)),
            (i.maxY = -i.minY),
            (i.currentX = Math.max(Math.min(i.currentX, i.maxX), i.minX)),
            (i.currentY = Math.max(Math.min(i.currentY, i.maxY), i.minY)),
            t.$imageWrapEl
              .transition(h)
              .transform(
                'translate3d(' + i.currentX + 'px, ' + i.currentY + 'px,0)'
              );
        }
      },
      onTransitionEnd: function () {
        var e = this.zoom,
          t = e.gesture;
        t.$slideEl &&
          this.previousIndex !== this.activeIndex &&
          (t.$imageEl.transform('translate3d(0,0,0) scale(1)'),
          t.$imageWrapEl.transform('translate3d(0,0,0)'),
          (e.scale = 1),
          (e.currentScale = 1),
          (t.$slideEl = void 0),
          (t.$imageEl = void 0),
          (t.$imageWrapEl = void 0));
      },
      toggle: function (e) {
        var t = this.zoom;
        t.scale && 1 !== t.scale ? t.out() : t.in(e);
      },
      in: function (e) {
        var t,
          i,
          s,
          a,
          r,
          n,
          o,
          l,
          d,
          h,
          p,
          c,
          u,
          v,
          f,
          m,
          g = this.zoom,
          b = this.params.zoom,
          w = g.gesture,
          y = g.image;
        (w.$slideEl ||
          ((w.$slideEl = this.slides.eq(this.activeIndex)),
          (w.$imageEl = w.$slideEl.find(
            'img, svg, canvas, picture, .swiper-zoom-target'
          )),
          (w.$imageWrapEl = w.$imageEl.parent('.' + b.containerClass))),
        w.$imageEl && 0 !== w.$imageEl.length) &&
          (w.$slideEl.addClass('' + b.zoomedSlideClass),
          void 0 === y.touchesStart.x && e
            ? ((t =
                'touchend' === e.type ? e.changedTouches[0].pageX : e.pageX),
              (i = 'touchend' === e.type ? e.changedTouches[0].pageY : e.pageY))
            : ((t = y.touchesStart.x), (i = y.touchesStart.y)),
          (g.scale = w.$imageWrapEl.attr('data-swiper-zoom') || b.maxRatio),
          (g.currentScale =
            w.$imageWrapEl.attr('data-swiper-zoom') || b.maxRatio),
          e
            ? ((f = w.$slideEl[0].offsetWidth),
              (m = w.$slideEl[0].offsetHeight),
              (s = w.$slideEl.offset().left + f / 2 - t),
              (a = w.$slideEl.offset().top + m / 2 - i),
              (o = w.$imageEl[0].offsetWidth),
              (l = w.$imageEl[0].offsetHeight),
              (d = o * g.scale),
              (h = l * g.scale),
              (u = -(p = Math.min(f / 2 - d / 2, 0))),
              (v = -(c = Math.min(m / 2 - h / 2, 0))),
              (r = s * g.scale) < p && (r = p),
              r > u && (r = u),
              (n = a * g.scale) < c && (n = c),
              n > v && (n = v))
            : ((r = 0), (n = 0)),
          w.$imageWrapEl
            .transition(300)
            .transform('translate3d(' + r + 'px, ' + n + 'px,0)'),
          w.$imageEl
            .transition(300)
            .transform('translate3d(0,0,0) scale(' + g.scale + ')'));
      },
      out: function () {
        var e = this.zoom,
          t = this.params.zoom,
          i = e.gesture;
        i.$slideEl ||
          ((i.$slideEl = this.slides.eq(this.activeIndex)),
          (i.$imageEl = i.$slideEl.find(
            'img, svg, canvas, picture, .swiper-zoom-target'
          )),
          (i.$imageWrapEl = i.$imageEl.parent('.' + t.containerClass))),
          i.$imageEl &&
            0 !== i.$imageEl.length &&
            ((e.scale = 1),
            (e.currentScale = 1),
            i.$imageWrapEl.transition(300).transform('translate3d(0,0,0)'),
            i.$imageEl.transition(300).transform('translate3d(0,0,0) scale(1)'),
            i.$slideEl.removeClass('' + t.zoomedSlideClass),
            (i.$slideEl = void 0));
      },
      enable: function () {
        var e = this.zoom;
        if (!e.enabled) {
          e.enabled = !0;
          var t = !(
              'touchstart' !== this.touchEvents.start ||
              !o.passiveListener ||
              !this.params.passiveListeners
            ) && { passive: !0, capture: !1 },
            i = !o.passiveListener || { passive: !1, capture: !0 },
            s = '.' + this.params.slideClass;
          o.gestures
            ? (this.$wrapperEl.on('gesturestart', s, e.onGestureStart, t),
              this.$wrapperEl.on('gesturechange', s, e.onGestureChange, t),
              this.$wrapperEl.on('gestureend', s, e.onGestureEnd, t))
            : 'touchstart' === this.touchEvents.start &&
              (this.$wrapperEl.on(
                this.touchEvents.start,
                s,
                e.onGestureStart,
                t
              ),
              this.$wrapperEl.on(
                this.touchEvents.move,
                s,
                e.onGestureChange,
                i
              ),
              this.$wrapperEl.on(this.touchEvents.end, s, e.onGestureEnd, t),
              this.touchEvents.cancel &&
                this.$wrapperEl.on(
                  this.touchEvents.cancel,
                  s,
                  e.onGestureEnd,
                  t
                )),
            this.$wrapperEl.on(
              this.touchEvents.move,
              '.' + this.params.zoom.containerClass,
              e.onTouchMove,
              i
            );
        }
      },
      disable: function () {
        var e = this.zoom;
        if (e.enabled) {
          this.zoom.enabled = !1;
          var t = !(
              'touchstart' !== this.touchEvents.start ||
              !o.passiveListener ||
              !this.params.passiveListeners
            ) && { passive: !0, capture: !1 },
            i = !o.passiveListener || { passive: !1, capture: !0 },
            s = '.' + this.params.slideClass;
          o.gestures
            ? (this.$wrapperEl.off('gesturestart', s, e.onGestureStart, t),
              this.$wrapperEl.off('gesturechange', s, e.onGestureChange, t),
              this.$wrapperEl.off('gestureend', s, e.onGestureEnd, t))
            : 'touchstart' === this.touchEvents.start &&
              (this.$wrapperEl.off(
                this.touchEvents.start,
                s,
                e.onGestureStart,
                t
              ),
              this.$wrapperEl.off(
                this.touchEvents.move,
                s,
                e.onGestureChange,
                i
              ),
              this.$wrapperEl.off(this.touchEvents.end, s, e.onGestureEnd, t),
              this.touchEvents.cancel &&
                this.$wrapperEl.off(
                  this.touchEvents.cancel,
                  s,
                  e.onGestureEnd,
                  t
                )),
            this.$wrapperEl.off(
              this.touchEvents.move,
              '.' + this.params.zoom.containerClass,
              e.onTouchMove,
              i
            );
        }
      },
    },
    le = {
      loadInSlide: function (e, t) {
        void 0 === t && (t = !0);
        var i = this,
          a = i.params.lazy;
        if (void 0 !== e && 0 !== i.slides.length) {
          var r =
              i.virtual && i.params.virtual.enabled
                ? i.$wrapperEl.children(
                    '.' +
                      i.params.slideClass +
                      '[data-swiper-slide-index="' +
                      e +
                      '"]'
                  )
                : i.slides.eq(e),
            n = r.find(
              '.' +
                a.elementClass +
                ':not(.' +
                a.loadedClass +
                '):not(.' +
                a.loadingClass +
                ')'
            );
          !r.hasClass(a.elementClass) ||
            r.hasClass(a.loadedClass) ||
            r.hasClass(a.loadingClass) ||
            (n = n.add(r[0])),
            0 !== n.length &&
              n.each(function (e, n) {
                var o = s(n);
                o.addClass(a.loadingClass);
                var l = o.attr('data-background'),
                  d = o.attr('data-src'),
                  h = o.attr('data-srcset'),
                  p = o.attr('data-sizes');
                i.loadImage(o[0], d || l, h, p, !1, function () {
                  if (null != i && i && (!i || i.params) && !i.destroyed) {
                    if (
                      (l
                        ? (o.css('background-image', 'url("' + l + '")'),
                          o.removeAttr('data-background'))
                        : (h &&
                            (o.attr('srcset', h), o.removeAttr('data-srcset')),
                          p && (o.attr('sizes', p), o.removeAttr('data-sizes')),
                          d && (o.attr('src', d), o.removeAttr('data-src'))),
                      o.addClass(a.loadedClass).removeClass(a.loadingClass),
                      r.find('.' + a.preloaderClass).remove(),
                      i.params.loop && t)
                    ) {
                      var e = r.attr('data-swiper-slide-index');
                      if (r.hasClass(i.params.slideDuplicateClass)) {
                        var s = i.$wrapperEl.children(
                          '[data-swiper-slide-index="' +
                            e +
                            '"]:not(.' +
                            i.params.slideDuplicateClass +
                            ')'
                        );
                        i.lazy.loadInSlide(s.index(), !1);
                      } else {
                        var n = i.$wrapperEl.children(
                          '.' +
                            i.params.slideDuplicateClass +
                            '[data-swiper-slide-index="' +
                            e +
                            '"]'
                        );
                        i.lazy.loadInSlide(n.index(), !1);
                      }
                    }
                    i.emit('lazyImageReady', r[0], o[0]),
                      i.params.autoHeight && i.updateAutoHeight();
                  }
                }),
                  i.emit('lazyImageLoad', r[0], o[0]);
              });
        }
      },
      load: function () {
        var e = this,
          t = e.$wrapperEl,
          i = e.params,
          a = e.slides,
          r = e.activeIndex,
          n = e.virtual && i.virtual.enabled,
          o = i.lazy,
          l = i.slidesPerView;
        function d(e) {
          if (n) {
            if (
              t.children(
                '.' + i.slideClass + '[data-swiper-slide-index="' + e + '"]'
              ).length
            )
              return !0;
          } else if (a[e]) return !0;
          return !1;
        }
        function h(e) {
          return n ? s(e).attr('data-swiper-slide-index') : s(e).index();
        }
        if (
          ('auto' === l && (l = 0),
          e.lazy.initialImageLoaded || (e.lazy.initialImageLoaded = !0),
          e.params.watchSlidesVisibility)
        )
          t.children('.' + i.slideVisibleClass).each(function (t, i) {
            var a = n ? s(i).attr('data-swiper-slide-index') : s(i).index();
            e.lazy.loadInSlide(a);
          });
        else if (l > 1)
          for (var p = r; p < r + l; p += 1) d(p) && e.lazy.loadInSlide(p);
        else e.lazy.loadInSlide(r);
        if (o.loadPrevNext)
          if (l > 1 || (o.loadPrevNextAmount && o.loadPrevNextAmount > 1)) {
            for (
              var c = o.loadPrevNextAmount,
                u = l,
                v = Math.min(r + u + Math.max(c, u), a.length),
                f = Math.max(r - Math.max(u, c), 0),
                m = r + l;
              m < v;
              m += 1
            )
              d(m) && e.lazy.loadInSlide(m);
            for (var g = f; g < r; g += 1) d(g) && e.lazy.loadInSlide(g);
          } else {
            var b = t.children('.' + i.slideNextClass);
            b.length > 0 && e.lazy.loadInSlide(h(b));
            var w = t.children('.' + i.slidePrevClass);
            w.length > 0 && e.lazy.loadInSlide(h(w));
          }
      },
    },
    de = {
      LinearSpline: function (e, t) {
        var i,
          s,
          a,
          r,
          n,
          o = function (e, t) {
            for (s = -1, i = e.length; i - s > 1; )
              e[(a = (i + s) >> 1)] <= t ? (s = a) : (i = a);
            return i;
          };
        return (
          (this.x = e),
          (this.y = t),
          (this.lastIndex = e.length - 1),
          (this.interpolate = function (e) {
            return e
              ? ((n = o(this.x, e)),
                (r = n - 1),
                ((e - this.x[r]) * (this.y[n] - this.y[r])) /
                  (this.x[n] - this.x[r]) +
                  this.y[r])
              : 0;
          }),
          this
        );
      },
      getInterpolateFunction: function (e) {
        this.controller.spline ||
          (this.controller.spline = this.params.loop
            ? new de.LinearSpline(this.slidesGrid, e.slidesGrid)
            : new de.LinearSpline(this.snapGrid, e.snapGrid));
      },
      setTranslate: function (e, t) {
        var i,
          s,
          a = this,
          r = a.controller.control;
        function n(e) {
          var t = a.rtlTranslate ? -a.translate : a.translate;
          'slide' === a.params.controller.by &&
            (a.controller.getInterpolateFunction(e),
            (s = -a.controller.spline.interpolate(-t))),
            (s && 'container' !== a.params.controller.by) ||
              ((i =
                (e.maxTranslate() - e.minTranslate()) /
                (a.maxTranslate() - a.minTranslate())),
              (s = (t - a.minTranslate()) * i + e.minTranslate())),
            a.params.controller.inverse && (s = e.maxTranslate() - s),
            e.updateProgress(s),
            e.setTranslate(s, a),
            e.updateActiveIndex(),
            e.updateSlidesClasses();
        }
        if (Array.isArray(r))
          for (var o = 0; o < r.length; o += 1)
            r[o] !== t && r[o] instanceof W && n(r[o]);
        else r instanceof W && t !== r && n(r);
      },
      setTransition: function (e, t) {
        var i,
          s = this,
          a = s.controller.control;
        function r(t) {
          t.setTransition(e, s),
            0 !== e &&
              (t.transitionStart(),
              t.params.autoHeight &&
                n.nextTick(function () {
                  t.updateAutoHeight();
                }),
              t.$wrapperEl.transitionEnd(function () {
                a &&
                  (t.params.loop &&
                    'slide' === s.params.controller.by &&
                    t.loopFix(),
                  t.transitionEnd());
              }));
        }
        if (Array.isArray(a))
          for (i = 0; i < a.length; i += 1)
            a[i] !== t && a[i] instanceof W && r(a[i]);
        else a instanceof W && t !== a && r(a);
      },
    },
    he = {
      makeElFocusable: function (e) {
        return e.attr('tabIndex', '0'), e;
      },
      addElRole: function (e, t) {
        return e.attr('role', t), e;
      },
      addElLabel: function (e, t) {
        return e.attr('aria-label', t), e;
      },
      disableEl: function (e) {
        return e.attr('aria-disabled', !0), e;
      },
      enableEl: function (e) {
        return e.attr('aria-disabled', !1), e;
      },
      onEnterKey: function (e) {
        var t = this.params.a11y;
        if (13 === e.keyCode) {
          var i = s(e.target);
          this.navigation &&
            this.navigation.$nextEl &&
            i.is(this.navigation.$nextEl) &&
            ((this.isEnd && !this.params.loop) || this.slideNext(),
            this.isEnd
              ? this.a11y.notify(t.lastSlideMessage)
              : this.a11y.notify(t.nextSlideMessage)),
            this.navigation &&
              this.navigation.$prevEl &&
              i.is(this.navigation.$prevEl) &&
              ((this.isBeginning && !this.params.loop) || this.slidePrev(),
              this.isBeginning
                ? this.a11y.notify(t.firstSlideMessage)
                : this.a11y.notify(t.prevSlideMessage)),
            this.pagination &&
              i.is('.' + this.params.pagination.bulletClass) &&
              i[0].click();
        }
      },
      notify: function (e) {
        var t = this.a11y.liveRegion;
        0 !== t.length && (t.html(''), t.html(e));
      },
      updateNavigation: function () {
        if (!this.params.loop && this.navigation) {
          var e = this.navigation,
            t = e.$nextEl,
            i = e.$prevEl;
          i &&
            i.length > 0 &&
            (this.isBeginning ? this.a11y.disableEl(i) : this.a11y.enableEl(i)),
            t &&
              t.length > 0 &&
              (this.isEnd ? this.a11y.disableEl(t) : this.a11y.enableEl(t));
        }
      },
      updatePagination: function () {
        var e = this,
          t = e.params.a11y;
        e.pagination &&
          e.params.pagination.clickable &&
          e.pagination.bullets &&
          e.pagination.bullets.length &&
          e.pagination.bullets.each(function (i, a) {
            var r = s(a);
            e.a11y.makeElFocusable(r),
              e.a11y.addElRole(r, 'button'),
              e.a11y.addElLabel(
                r,
                t.paginationBulletMessage.replace(/{{index}}/, r.index() + 1)
              );
          });
      },
      init: function () {
        this.$el.append(this.a11y.liveRegion);
        var e,
          t,
          i = this.params.a11y;
        this.navigation &&
          this.navigation.$nextEl &&
          (e = this.navigation.$nextEl),
          this.navigation &&
            this.navigation.$prevEl &&
            (t = this.navigation.$prevEl),
          e &&
            (this.a11y.makeElFocusable(e),
            this.a11y.addElRole(e, 'button'),
            this.a11y.addElLabel(e, i.nextSlideMessage),
            e.on('keydown', this.a11y.onEnterKey)),
          t &&
            (this.a11y.makeElFocusable(t),
            this.a11y.addElRole(t, 'button'),
            this.a11y.addElLabel(t, i.prevSlideMessage),
            t.on('keydown', this.a11y.onEnterKey)),
          this.pagination &&
            this.params.pagination.clickable &&
            this.pagination.bullets &&
            this.pagination.bullets.length &&
            this.pagination.$el.on(
              'keydown',
              '.' + this.params.pagination.bulletClass,
              this.a11y.onEnterKey
            );
      },
      destroy: function () {
        var e, t;
        this.a11y.liveRegion &&
          this.a11y.liveRegion.length > 0 &&
          this.a11y.liveRegion.remove(),
          this.navigation &&
            this.navigation.$nextEl &&
            (e = this.navigation.$nextEl),
          this.navigation &&
            this.navigation.$prevEl &&
            (t = this.navigation.$prevEl),
          e && e.off('keydown', this.a11y.onEnterKey),
          t && t.off('keydown', this.a11y.onEnterKey),
          this.pagination &&
            this.params.pagination.clickable &&
            this.pagination.bullets &&
            this.pagination.bullets.length &&
            this.pagination.$el.off(
              'keydown',
              '.' + this.params.pagination.bulletClass,
              this.a11y.onEnterKey
            );
      },
    },
    pe = {
      init: function () {
        if (this.params.history) {
          if (!t.history || !t.history.pushState)
            return (
              (this.params.history.enabled = !1),
              void (this.params.hashNavigation.enabled = !0)
            );
          var e = this.history;
          (e.initialized = !0),
            (e.paths = pe.getPathValues()),
            (e.paths.key || e.paths.value) &&
              (e.scrollToSlide(
                0,
                e.paths.value,
                this.params.runCallbacksOnInit
              ),
              this.params.history.replaceState ||
                t.addEventListener(
                  'popstate',
                  this.history.setHistoryPopState
                ));
        }
      },
      destroy: function () {
        this.params.history.replaceState ||
          t.removeEventListener('popstate', this.history.setHistoryPopState);
      },
      setHistoryPopState: function () {
        (this.history.paths = pe.getPathValues()),
          this.history.scrollToSlide(
            this.params.speed,
            this.history.paths.value,
            !1
          );
      },
      getPathValues: function () {
        var e = t.location.pathname
            .slice(1)
            .split('/')
            .filter(function (e) {
              return '' !== e;
            }),
          i = e.length;
        return { key: e[i - 2], value: e[i - 1] };
      },
      setHistory: function (e, i) {
        if (this.history.initialized && this.params.history.enabled) {
          var s = this.slides.eq(i),
            a = pe.slugify(s.attr('data-history'));
          t.location.pathname.includes(e) || (a = e + '/' + a);
          var r = t.history.state;
          (r && r.value === a) ||
            (this.params.history.replaceState
              ? t.history.replaceState({ value: a }, null, a)
              : t.history.pushState({ value: a }, null, a));
        }
      },
      slugify: function (e) {
        return e
          .toString()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, '');
      },
      scrollToSlide: function (e, t, i) {
        if (t)
          for (var s = 0, a = this.slides.length; s < a; s += 1) {
            var r = this.slides.eq(s);
            if (
              pe.slugify(r.attr('data-history')) === t &&
              !r.hasClass(this.params.slideDuplicateClass)
            ) {
              var n = r.index();
              this.slideTo(n, e, i);
            }
          }
        else this.slideTo(0, e, i);
      },
    },
    ce = {
      onHashCange: function () {
        var t = e.location.hash.replace('#', '');
        if (t !== this.slides.eq(this.activeIndex).attr('data-hash')) {
          var i = this.$wrapperEl
            .children('.' + this.params.slideClass + '[data-hash="' + t + '"]')
            .index();
          if (void 0 === i) return;
          this.slideTo(i);
        }
      },
      setHash: function () {
        if (
          this.hashNavigation.initialized &&
          this.params.hashNavigation.enabled
        )
          if (
            this.params.hashNavigation.replaceState &&
            t.history &&
            t.history.replaceState
          )
            t.history.replaceState(
              null,
              null,
              '#' + this.slides.eq(this.activeIndex).attr('data-hash') || ''
            );
          else {
            var i = this.slides.eq(this.activeIndex),
              s = i.attr('data-hash') || i.attr('data-history');
            e.location.hash = s || '';
          }
      },
      init: function () {
        if (
          !(
            !this.params.hashNavigation.enabled ||
            (this.params.history && this.params.history.enabled)
          )
        ) {
          this.hashNavigation.initialized = !0;
          var i = e.location.hash.replace('#', '');
          if (i)
            for (var a = 0, r = this.slides.length; a < r; a += 1) {
              var n = this.slides.eq(a);
              if (
                (n.attr('data-hash') || n.attr('data-history')) === i &&
                !n.hasClass(this.params.slideDuplicateClass)
              ) {
                var o = n.index();
                this.slideTo(o, 0, this.params.runCallbacksOnInit, !0);
              }
            }
          this.params.hashNavigation.watchState &&
            s(t).on('hashchange', this.hashNavigation.onHashCange);
        }
      },
      destroy: function () {
        this.params.hashNavigation.watchState &&
          s(t).off('hashchange', this.hashNavigation.onHashCange);
      },
    },
    ue = {
      run: function () {
        var e = this,
          t = e.slides.eq(e.activeIndex),
          i = e.params.autoplay.delay;
        t.attr('data-swiper-autoplay') &&
          (i = t.attr('data-swiper-autoplay') || e.params.autoplay.delay),
          clearTimeout(e.autoplay.timeout),
          (e.autoplay.timeout = n.nextTick(function () {
            e.params.autoplay.reverseDirection
              ? e.params.loop
                ? (e.loopFix(),
                  e.slidePrev(e.params.speed, !0, !0),
                  e.emit('autoplay'))
                : e.isBeginning
                ? e.params.autoplay.stopOnLastSlide
                  ? e.autoplay.stop()
                  : (e.slideTo(e.slides.length - 1, e.params.speed, !0, !0),
                    e.emit('autoplay'))
                : (e.slidePrev(e.params.speed, !0, !0), e.emit('autoplay'))
              : e.params.loop
              ? (e.loopFix(),
                e.slideNext(e.params.speed, !0, !0),
                e.emit('autoplay'))
              : e.isEnd
              ? e.params.autoplay.stopOnLastSlide
                ? e.autoplay.stop()
                : (e.slideTo(0, e.params.speed, !0, !0), e.emit('autoplay'))
              : (e.slideNext(e.params.speed, !0, !0), e.emit('autoplay')),
              e.params.cssMode && e.autoplay.running && e.autoplay.run();
          }, i));
      },
      start: function () {
        return (
          void 0 === this.autoplay.timeout &&
          !this.autoplay.running &&
          ((this.autoplay.running = !0),
          this.emit('autoplayStart'),
          this.autoplay.run(),
          !0)
        );
      },
      stop: function () {
        return (
          !!this.autoplay.running &&
          void 0 !== this.autoplay.timeout &&
          (this.autoplay.timeout &&
            (clearTimeout(this.autoplay.timeout),
            (this.autoplay.timeout = void 0)),
          (this.autoplay.running = !1),
          this.emit('autoplayStop'),
          !0)
        );
      },
      pause: function (e) {
        this.autoplay.running &&
          (this.autoplay.paused ||
            (this.autoplay.timeout && clearTimeout(this.autoplay.timeout),
            (this.autoplay.paused = !0),
            0 !== e && this.params.autoplay.waitForTransition
              ? (this.$wrapperEl[0].addEventListener(
                  'transitionend',
                  this.autoplay.onTransitionEnd
                ),
                this.$wrapperEl[0].addEventListener(
                  'webkitTransitionEnd',
                  this.autoplay.onTransitionEnd
                ))
              : ((this.autoplay.paused = !1), this.autoplay.run())));
      },
    },
    ve = {
      setTranslate: function () {
        for (var e = this.slides, t = 0; t < e.length; t += 1) {
          var i = this.slides.eq(t),
            s = -i[0].swiperSlideOffset;
          this.params.virtualTranslate || (s -= this.translate);
          var a = 0;
          this.isHorizontal() || ((a = s), (s = 0));
          var r = this.params.fadeEffect.crossFade
            ? Math.max(1 - Math.abs(i[0].progress), 0)
            : 1 + Math.min(Math.max(i[0].progress, -1), 0);
          i.css({ opacity: r }).transform(
            'translate3d(' + s + 'px, ' + a + 'px, 0px)'
          );
        }
      },
      setTransition: function (e) {
        var t = this,
          i = t.slides,
          s = t.$wrapperEl;
        if ((i.transition(e), t.params.virtualTranslate && 0 !== e)) {
          var a = !1;
          i.transitionEnd(function () {
            if (!a && t && !t.destroyed) {
              (a = !0), (t.animating = !1);
              for (
                var e = ['webkitTransitionEnd', 'transitionend'], i = 0;
                i < e.length;
                i += 1
              )
                s.trigger(e[i]);
            }
          });
        }
      },
    },
    fe = {
      setTranslate: function () {
        var e,
          t = this.$el,
          i = this.$wrapperEl,
          a = this.slides,
          r = this.width,
          n = this.height,
          o = this.rtlTranslate,
          l = this.size,
          d = this.params.cubeEffect,
          h = this.isHorizontal(),
          p = this.virtual && this.params.virtual.enabled,
          c = 0;
        d.shadow &&
          (h
            ? (0 === (e = i.find('.swiper-cube-shadow')).length &&
                ((e = s('<div class="swiper-cube-shadow"></div>')),
                i.append(e)),
              e.css({ height: r + 'px' }))
            : 0 === (e = t.find('.swiper-cube-shadow')).length &&
              ((e = s('<div class="swiper-cube-shadow"></div>')), t.append(e)));
        for (var u = 0; u < a.length; u += 1) {
          var v = a.eq(u),
            f = u;
          p && (f = parseInt(v.attr('data-swiper-slide-index'), 10));
          var m = 90 * f,
            g = Math.floor(m / 360);
          o && ((m = -m), (g = Math.floor(-m / 360)));
          var b = Math.max(Math.min(v[0].progress, 1), -1),
            w = 0,
            y = 0,
            x = 0;
          f % 4 == 0
            ? ((w = 4 * -g * l), (x = 0))
            : (f - 1) % 4 == 0
            ? ((w = 0), (x = 4 * -g * l))
            : (f - 2) % 4 == 0
            ? ((w = l + 4 * g * l), (x = l))
            : (f - 3) % 4 == 0 && ((w = -l), (x = 3 * l + 4 * l * g)),
            o && (w = -w),
            h || ((y = w), (w = 0));
          var T =
            'rotateX(' +
            (h ? 0 : -m) +
            'deg) rotateY(' +
            (h ? m : 0) +
            'deg) translate3d(' +
            w +
            'px, ' +
            y +
            'px, ' +
            x +
            'px)';
          if (
            (b <= 1 &&
              b > -1 &&
              ((c = 90 * f + 90 * b), o && (c = 90 * -f - 90 * b)),
            v.transform(T),
            d.slideShadows)
          ) {
            var E = h
                ? v.find('.swiper-slide-shadow-left')
                : v.find('.swiper-slide-shadow-top'),
              S = h
                ? v.find('.swiper-slide-shadow-right')
                : v.find('.swiper-slide-shadow-bottom');
            0 === E.length &&
              ((E = s(
                '<div class="swiper-slide-shadow-' +
                  (h ? 'left' : 'top') +
                  '"></div>'
              )),
              v.append(E)),
              0 === S.length &&
                ((S = s(
                  '<div class="swiper-slide-shadow-' +
                    (h ? 'right' : 'bottom') +
                    '"></div>'
                )),
                v.append(S)),
              E.length && (E[0].style.opacity = Math.max(-b, 0)),
              S.length && (S[0].style.opacity = Math.max(b, 0));
          }
        }
        if (
          (i.css({
            '-webkit-transform-origin': '50% 50% -' + l / 2 + 'px',
            '-moz-transform-origin': '50% 50% -' + l / 2 + 'px',
            '-ms-transform-origin': '50% 50% -' + l / 2 + 'px',
            'transform-origin': '50% 50% -' + l / 2 + 'px',
          }),
          d.shadow)
        )
          if (h)
            e.transform(
              'translate3d(0px, ' +
                (r / 2 + d.shadowOffset) +
                'px, ' +
                -r / 2 +
                'px) rotateX(90deg) rotateZ(0deg) scale(' +
                d.shadowScale +
                ')'
            );
          else {
            var C = Math.abs(c) - 90 * Math.floor(Math.abs(c) / 90),
              M =
                1.5 -
                (Math.sin((2 * C * Math.PI) / 360) / 2 +
                  Math.cos((2 * C * Math.PI) / 360) / 2),
              P = d.shadowScale,
              z = d.shadowScale / M,
              k = d.shadowOffset;
            e.transform(
              'scale3d(' +
                P +
                ', 1, ' +
                z +
                ') translate3d(0px, ' +
                (n / 2 + k) +
                'px, ' +
                -n / 2 / z +
                'px) rotateX(-90deg)'
            );
          }
        var $ = j.isSafari || j.isUiWebView ? -l / 2 : 0;
        i.transform(
          'translate3d(0px,0,' +
            $ +
            'px) rotateX(' +
            (this.isHorizontal() ? 0 : c) +
            'deg) rotateY(' +
            (this.isHorizontal() ? -c : 0) +
            'deg)'
        );
      },
      setTransition: function (e) {
        var t = this.$el;
        this.slides
          .transition(e)
          .find(
            '.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left'
          )
          .transition(e),
          this.params.cubeEffect.shadow &&
            !this.isHorizontal() &&
            t.find('.swiper-cube-shadow').transition(e);
      },
    },
    me = {
      setTranslate: function () {
        for (
          var e = this.slides, t = this.rtlTranslate, i = 0;
          i < e.length;
          i += 1
        ) {
          var a = e.eq(i),
            r = a[0].progress;
          this.params.flipEffect.limitRotation &&
            (r = Math.max(Math.min(a[0].progress, 1), -1));
          var n = -180 * r,
            o = 0,
            l = -a[0].swiperSlideOffset,
            d = 0;
          if (
            (this.isHorizontal()
              ? t && (n = -n)
              : ((d = l), (l = 0), (o = -n), (n = 0)),
            (a[0].style.zIndex = -Math.abs(Math.round(r)) + e.length),
            this.params.flipEffect.slideShadows)
          ) {
            var h = this.isHorizontal()
                ? a.find('.swiper-slide-shadow-left')
                : a.find('.swiper-slide-shadow-top'),
              p = this.isHorizontal()
                ? a.find('.swiper-slide-shadow-right')
                : a.find('.swiper-slide-shadow-bottom');
            0 === h.length &&
              ((h = s(
                '<div class="swiper-slide-shadow-' +
                  (this.isHorizontal() ? 'left' : 'top') +
                  '"></div>'
              )),
              a.append(h)),
              0 === p.length &&
                ((p = s(
                  '<div class="swiper-slide-shadow-' +
                    (this.isHorizontal() ? 'right' : 'bottom') +
                    '"></div>'
                )),
                a.append(p)),
              h.length && (h[0].style.opacity = Math.max(-r, 0)),
              p.length && (p[0].style.opacity = Math.max(r, 0));
          }
          a.transform(
            'translate3d(' +
              l +
              'px, ' +
              d +
              'px, 0px) rotateX(' +
              o +
              'deg) rotateY(' +
              n +
              'deg)'
          );
        }
      },
      setTransition: function (e) {
        var t = this,
          i = t.slides,
          s = t.activeIndex,
          a = t.$wrapperEl;
        if (
          (i
            .transition(e)
            .find(
              '.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left'
            )
            .transition(e),
          t.params.virtualTranslate && 0 !== e)
        ) {
          var r = !1;
          i.eq(s).transitionEnd(function () {
            if (!r && t && !t.destroyed) {
              (r = !0), (t.animating = !1);
              for (
                var e = ['webkitTransitionEnd', 'transitionend'], i = 0;
                i < e.length;
                i += 1
              )
                a.trigger(e[i]);
            }
          });
        }
      },
    },
    ge = {
      setTranslate: function () {
        for (
          var e = this.width,
            t = this.height,
            i = this.slides,
            a = this.$wrapperEl,
            r = this.slidesSizesGrid,
            n = this.params.coverflowEffect,
            l = this.isHorizontal(),
            d = this.translate,
            h = l ? e / 2 - d : t / 2 - d,
            p = l ? n.rotate : -n.rotate,
            c = n.depth,
            u = 0,
            v = i.length;
          u < v;
          u += 1
        ) {
          var f = i.eq(u),
            m = r[u],
            g = ((h - f[0].swiperSlideOffset - m / 2) / m) * n.modifier,
            b = l ? p * g : 0,
            w = l ? 0 : p * g,
            y = -c * Math.abs(g),
            x = n.stretch;
          'string' == typeof x &&
            -1 !== x.indexOf('%') &&
            (x = (parseFloat(n.stretch) / 100) * m);
          var T = l ? 0 : x * g,
            E = l ? x * g : 0;
          Math.abs(E) < 0.001 && (E = 0),
            Math.abs(T) < 0.001 && (T = 0),
            Math.abs(y) < 0.001 && (y = 0),
            Math.abs(b) < 0.001 && (b = 0),
            Math.abs(w) < 0.001 && (w = 0);
          var S =
            'translate3d(' +
            E +
            'px,' +
            T +
            'px,' +
            y +
            'px)  rotateX(' +
            w +
            'deg) rotateY(' +
            b +
            'deg)';
          if (
            (f.transform(S),
            (f[0].style.zIndex = 1 - Math.abs(Math.round(g))),
            n.slideShadows)
          ) {
            var C = l
                ? f.find('.swiper-slide-shadow-left')
                : f.find('.swiper-slide-shadow-top'),
              M = l
                ? f.find('.swiper-slide-shadow-right')
                : f.find('.swiper-slide-shadow-bottom');
            0 === C.length &&
              ((C = s(
                '<div class="swiper-slide-shadow-' +
                  (l ? 'left' : 'top') +
                  '"></div>'
              )),
              f.append(C)),
              0 === M.length &&
                ((M = s(
                  '<div class="swiper-slide-shadow-' +
                    (l ? 'right' : 'bottom') +
                    '"></div>'
                )),
                f.append(M)),
              C.length && (C[0].style.opacity = g > 0 ? g : 0),
              M.length && (M[0].style.opacity = -g > 0 ? -g : 0);
          }
        }
        (o.pointerEvents || o.prefixedPointerEvents) &&
          (a[0].style.perspectiveOrigin = h + 'px 50%');
      },
      setTransition: function (e) {
        this.slides
          .transition(e)
          .find(
            '.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left'
          )
          .transition(e);
      },
    },
    be = {
      init: function () {
        var e = this.params.thumbs,
          t = this.constructor;
        e.swiper instanceof t
          ? ((this.thumbs.swiper = e.swiper),
            n.extend(this.thumbs.swiper.originalParams, {
              watchSlidesProgress: !0,
              slideToClickedSlide: !1,
            }),
            n.extend(this.thumbs.swiper.params, {
              watchSlidesProgress: !0,
              slideToClickedSlide: !1,
            }))
          : n.isObject(e.swiper) &&
            ((this.thumbs.swiper = new t(
              n.extend({}, e.swiper, {
                watchSlidesVisibility: !0,
                watchSlidesProgress: !0,
                slideToClickedSlide: !1,
              })
            )),
            (this.thumbs.swiperCreated = !0)),
          this.thumbs.swiper.$el.addClass(
            this.params.thumbs.thumbsContainerClass
          ),
          this.thumbs.swiper.on('tap', this.thumbs.onThumbClick);
      },
      onThumbClick: function () {
        var e = this.thumbs.swiper;
        if (e) {
          var t = e.clickedIndex,
            i = e.clickedSlide;
          if (
            !(
              (i && s(i).hasClass(this.params.thumbs.slideThumbActiveClass)) ||
              null == t
            )
          ) {
            var a;
            if (
              ((a = e.params.loop
                ? parseInt(
                    s(e.clickedSlide).attr('data-swiper-slide-index'),
                    10
                  )
                : t),
              this.params.loop)
            ) {
              var r = this.activeIndex;
              this.slides.eq(r).hasClass(this.params.slideDuplicateClass) &&
                (this.loopFix(),
                (this._clientLeft = this.$wrapperEl[0].clientLeft),
                (r = this.activeIndex));
              var n = this.slides
                  .eq(r)
                  .prevAll('[data-swiper-slide-index="' + a + '"]')
                  .eq(0)
                  .index(),
                o = this.slides
                  .eq(r)
                  .nextAll('[data-swiper-slide-index="' + a + '"]')
                  .eq(0)
                  .index();
              a = void 0 === n ? o : void 0 === o ? n : o - r < r - n ? o : n;
            }
            this.slideTo(a);
          }
        }
      },
      update: function (e) {
        var t = this.thumbs.swiper;
        if (t) {
          var i =
            'auto' === t.params.slidesPerView
              ? t.slidesPerViewDynamic()
              : t.params.slidesPerView;
          if (this.realIndex !== t.realIndex) {
            var s,
              a = t.activeIndex;
            if (t.params.loop) {
              t.slides.eq(a).hasClass(t.params.slideDuplicateClass) &&
                (t.loopFix(),
                (t._clientLeft = t.$wrapperEl[0].clientLeft),
                (a = t.activeIndex));
              var r = t.slides
                  .eq(a)
                  .prevAll('[data-swiper-slide-index="' + this.realIndex + '"]')
                  .eq(0)
                  .index(),
                n = t.slides
                  .eq(a)
                  .nextAll('[data-swiper-slide-index="' + this.realIndex + '"]')
                  .eq(0)
                  .index();
              s =
                void 0 === r
                  ? n
                  : void 0 === n
                  ? r
                  : n - a == a - r
                  ? a
                  : n - a < a - r
                  ? n
                  : r;
            } else s = this.realIndex;
            t.visibleSlidesIndexes &&
              t.visibleSlidesIndexes.indexOf(s) < 0 &&
              (t.params.centeredSlides
                ? (s =
                    s > a
                      ? s - Math.floor(i / 2) + 1
                      : s + Math.floor(i / 2) - 1)
                : s > a && (s = s - i + 1),
              t.slideTo(s, e ? 0 : void 0));
          }
          var o = 1,
            l = this.params.thumbs.slideThumbActiveClass;
          if (
            (this.params.slidesPerView > 1 &&
              !this.params.centeredSlides &&
              (o = this.params.slidesPerView),
            this.params.thumbs.multipleActiveThumbs || (o = 1),
            (o = Math.floor(o)),
            t.slides.removeClass(l),
            t.params.loop || (t.params.virtual && t.params.virtual.enabled))
          )
            for (var d = 0; d < o; d += 1)
              t.$wrapperEl
                .children(
                  '[data-swiper-slide-index="' + (this.realIndex + d) + '"]'
                )
                .addClass(l);
          else
            for (var h = 0; h < o; h += 1)
              t.slides.eq(this.realIndex + h).addClass(l);
        }
      },
    },
    we = [
      R,
      q,
      K,
      U,
      Z,
      J,
      te,
      {
        name: 'mousewheel',
        params: {
          mousewheel: {
            enabled: !1,
            releaseOnEdges: !1,
            invert: !1,
            forceToAxis: !1,
            sensitivity: 1,
            eventsTarged: 'container',
          },
        },
        create: function () {
          n.extend(this, {
            mousewheel: {
              enabled: !1,
              enable: ie.enable.bind(this),
              disable: ie.disable.bind(this),
              handle: ie.handle.bind(this),
              handleMouseEnter: ie.handleMouseEnter.bind(this),
              handleMouseLeave: ie.handleMouseLeave.bind(this),
              animateSlider: ie.animateSlider.bind(this),
              releaseScroll: ie.releaseScroll.bind(this),
              lastScrollTime: n.now(),
              lastEventBeforeSnap: void 0,
              recentWheelEvents: [],
            },
          });
        },
        on: {
          init: function () {
            !this.params.mousewheel.enabled &&
              this.params.cssMode &&
              this.mousewheel.disable(),
              this.params.mousewheel.enabled && this.mousewheel.enable();
          },
          destroy: function () {
            this.params.cssMode && this.mousewheel.enable(),
              this.mousewheel.enabled && this.mousewheel.disable();
          },
        },
      },
      {
        name: 'navigation',
        params: {
          navigation: {
            nextEl: null,
            prevEl: null,
            hideOnClick: !1,
            disabledClass: 'swiper-button-disabled',
            hiddenClass: 'swiper-button-hidden',
            lockClass: 'swiper-button-lock',
          },
        },
        create: function () {
          n.extend(this, {
            navigation: {
              init: se.init.bind(this),
              update: se.update.bind(this),
              destroy: se.destroy.bind(this),
              onNextClick: se.onNextClick.bind(this),
              onPrevClick: se.onPrevClick.bind(this),
            },
          });
        },
        on: {
          init: function () {
            this.navigation.init(), this.navigation.update();
          },
          toEdge: function () {
            this.navigation.update();
          },
          fromEdge: function () {
            this.navigation.update();
          },
          destroy: function () {
            this.navigation.destroy();
          },
          click: function (e) {
            var t,
              i = this.navigation,
              a = i.$nextEl,
              r = i.$prevEl;
            !this.params.navigation.hideOnClick ||
              s(e.target).is(r) ||
              s(e.target).is(a) ||
              (a
                ? (t = a.hasClass(this.params.navigation.hiddenClass))
                : r && (t = r.hasClass(this.params.navigation.hiddenClass)),
              !0 === t
                ? this.emit('navigationShow', this)
                : this.emit('navigationHide', this),
              a && a.toggleClass(this.params.navigation.hiddenClass),
              r && r.toggleClass(this.params.navigation.hiddenClass));
          },
        },
      },
      {
        name: 'pagination',
        params: {
          pagination: {
            el: null,
            bulletElement: 'span',
            clickable: !1,
            hideOnClick: !1,
            renderBullet: null,
            renderProgressbar: null,
            renderFraction: null,
            renderCustom: null,
            progressbarOpposite: !1,
            type: 'bullets',
            dynamicBullets: !1,
            dynamicMainBullets: 1,
            formatFractionCurrent: function (e) {
              return e;
            },
            formatFractionTotal: function (e) {
              return e;
            },
            bulletClass: 'swiper-pagination-bullet',
            bulletActiveClass: 'swiper-pagination-bullet-active',
            modifierClass: 'swiper-pagination-',
            currentClass: 'swiper-pagination-current',
            totalClass: 'swiper-pagination-total',
            hiddenClass: 'swiper-pagination-hidden',
            progressbarFillClass: 'swiper-pagination-progressbar-fill',
            progressbarOppositeClass: 'swiper-pagination-progressbar-opposite',
            clickableClass: 'swiper-pagination-clickable',
            lockClass: 'swiper-pagination-lock',
          },
        },
        create: function () {
          n.extend(this, {
            pagination: {
              init: ae.init.bind(this),
              render: ae.render.bind(this),
              update: ae.update.bind(this),
              destroy: ae.destroy.bind(this),
              dynamicBulletIndex: 0,
            },
          });
        },
        on: {
          init: function () {
            this.pagination.init(),
              this.pagination.render(),
              this.pagination.update();
          },
          activeIndexChange: function () {
            this.params.loop
              ? this.pagination.update()
              : void 0 === this.snapIndex && this.pagination.update();
          },
          snapIndexChange: function () {
            this.params.loop || this.pagination.update();
          },
          slidesLengthChange: function () {
            this.params.loop &&
              (this.pagination.render(), this.pagination.update());
          },
          snapGridLengthChange: function () {
            this.params.loop ||
              (this.pagination.render(), this.pagination.update());
          },
          destroy: function () {
            this.pagination.destroy();
          },
          click: function (e) {
            this.params.pagination.el &&
              this.params.pagination.hideOnClick &&
              this.pagination.$el.length > 0 &&
              !s(e.target).hasClass(this.params.pagination.bulletClass) &&
              (!0 ===
              this.pagination.$el.hasClass(this.params.pagination.hiddenClass)
                ? this.emit('paginationShow', this)
                : this.emit('paginationHide', this),
              this.pagination.$el.toggleClass(
                this.params.pagination.hiddenClass
              ));
          },
        },
      },
      {
        name: 'scrollbar',
        params: {
          scrollbar: {
            el: null,
            dragSize: 'auto',
            hide: !1,
            draggable: !1,
            snapOnRelease: !0,
            lockClass: 'swiper-scrollbar-lock',
            dragClass: 'swiper-scrollbar-drag',
          },
        },
        create: function () {
          n.extend(this, {
            scrollbar: {
              init: re.init.bind(this),
              destroy: re.destroy.bind(this),
              updateSize: re.updateSize.bind(this),
              setTranslate: re.setTranslate.bind(this),
              setTransition: re.setTransition.bind(this),
              enableDraggable: re.enableDraggable.bind(this),
              disableDraggable: re.disableDraggable.bind(this),
              setDragPosition: re.setDragPosition.bind(this),
              getPointerPosition: re.getPointerPosition.bind(this),
              onDragStart: re.onDragStart.bind(this),
              onDragMove: re.onDragMove.bind(this),
              onDragEnd: re.onDragEnd.bind(this),
              isTouched: !1,
              timeout: null,
              dragTimeout: null,
            },
          });
        },
        on: {
          init: function () {
            this.scrollbar.init(),
              this.scrollbar.updateSize(),
              this.scrollbar.setTranslate();
          },
          update: function () {
            this.scrollbar.updateSize();
          },
          resize: function () {
            this.scrollbar.updateSize();
          },
          observerUpdate: function () {
            this.scrollbar.updateSize();
          },
          setTranslate: function () {
            this.scrollbar.setTranslate();
          },
          setTransition: function (e) {
            this.scrollbar.setTransition(e);
          },
          destroy: function () {
            this.scrollbar.destroy();
          },
        },
      },
      {
        name: 'parallax',
        params: { parallax: { enabled: !1 } },
        create: function () {
          n.extend(this, {
            parallax: {
              setTransform: ne.setTransform.bind(this),
              setTranslate: ne.setTranslate.bind(this),
              setTransition: ne.setTransition.bind(this),
            },
          });
        },
        on: {
          beforeInit: function () {
            this.params.parallax.enabled &&
              ((this.params.watchSlidesProgress = !0),
              (this.originalParams.watchSlidesProgress = !0));
          },
          init: function () {
            this.params.parallax.enabled && this.parallax.setTranslate();
          },
          setTranslate: function () {
            this.params.parallax.enabled && this.parallax.setTranslate();
          },
          setTransition: function (e) {
            this.params.parallax.enabled && this.parallax.setTransition(e);
          },
        },
      },
      {
        name: 'zoom',
        params: {
          zoom: {
            enabled: !1,
            maxRatio: 3,
            minRatio: 1,
            toggle: !0,
            containerClass: 'swiper-zoom-container',
            zoomedSlideClass: 'swiper-slide-zoomed',
          },
        },
        create: function () {
          var e = this,
            t = {
              enabled: !1,
              scale: 1,
              currentScale: 1,
              isScaling: !1,
              gesture: {
                $slideEl: void 0,
                slideWidth: void 0,
                slideHeight: void 0,
                $imageEl: void 0,
                $imageWrapEl: void 0,
                maxRatio: 3,
              },
              image: {
                isTouched: void 0,
                isMoved: void 0,
                currentX: void 0,
                currentY: void 0,
                minX: void 0,
                minY: void 0,
                maxX: void 0,
                maxY: void 0,
                width: void 0,
                height: void 0,
                startX: void 0,
                startY: void 0,
                touchesStart: {},
                touchesCurrent: {},
              },
              velocity: {
                x: void 0,
                y: void 0,
                prevPositionX: void 0,
                prevPositionY: void 0,
                prevTime: void 0,
              },
            };
          'onGestureStart onGestureChange onGestureEnd onTouchStart onTouchMove onTouchEnd onTransitionEnd toggle enable disable in out'
            .split(' ')
            .forEach(function (i) {
              t[i] = oe[i].bind(e);
            }),
            n.extend(e, { zoom: t });
          var i = 1;
          Object.defineProperty(e.zoom, 'scale', {
            get: function () {
              return i;
            },
            set: function (t) {
              if (i !== t) {
                var s = e.zoom.gesture.$imageEl
                    ? e.zoom.gesture.$imageEl[0]
                    : void 0,
                  a = e.zoom.gesture.$slideEl
                    ? e.zoom.gesture.$slideEl[0]
                    : void 0;
                e.emit('zoomChange', t, s, a);
              }
              i = t;
            },
          });
        },
        on: {
          init: function () {
            this.params.zoom.enabled && this.zoom.enable();
          },
          destroy: function () {
            this.zoom.disable();
          },
          touchStart: function (e) {
            this.zoom.enabled && this.zoom.onTouchStart(e);
          },
          touchEnd: function (e) {
            this.zoom.enabled && this.zoom.onTouchEnd(e);
          },
          doubleTap: function (e) {
            this.params.zoom.enabled &&
              this.zoom.enabled &&
              this.params.zoom.toggle &&
              this.zoom.toggle(e);
          },
          transitionEnd: function () {
            this.zoom.enabled &&
              this.params.zoom.enabled &&
              this.zoom.onTransitionEnd();
          },
          slideChange: function () {
            this.zoom.enabled &&
              this.params.zoom.enabled &&
              this.params.cssMode &&
              this.zoom.onTransitionEnd();
          },
        },
      },
      {
        name: 'lazy',
        params: {
          lazy: {
            enabled: !1,
            loadPrevNext: !1,
            loadPrevNextAmount: 1,
            loadOnTransitionStart: !1,
            elementClass: 'swiper-lazy',
            loadingClass: 'swiper-lazy-loading',
            loadedClass: 'swiper-lazy-loaded',
            preloaderClass: 'swiper-lazy-preloader',
          },
        },
        create: function () {
          n.extend(this, {
            lazy: {
              initialImageLoaded: !1,
              load: le.load.bind(this),
              loadInSlide: le.loadInSlide.bind(this),
            },
          });
        },
        on: {
          beforeInit: function () {
            this.params.lazy.enabled &&
              this.params.preloadImages &&
              (this.params.preloadImages = !1);
          },
          init: function () {
            this.params.lazy.enabled &&
              !this.params.loop &&
              0 === this.params.initialSlide &&
              this.lazy.load();
          },
          scroll: function () {
            this.params.freeMode &&
              !this.params.freeModeSticky &&
              this.lazy.load();
          },
          resize: function () {
            this.params.lazy.enabled && this.lazy.load();
          },
          scrollbarDragMove: function () {
            this.params.lazy.enabled && this.lazy.load();
          },
          transitionStart: function () {
            this.params.lazy.enabled &&
              (this.params.lazy.loadOnTransitionStart ||
                (!this.params.lazy.loadOnTransitionStart &&
                  !this.lazy.initialImageLoaded)) &&
              this.lazy.load();
          },
          transitionEnd: function () {
            this.params.lazy.enabled &&
              !this.params.lazy.loadOnTransitionStart &&
              this.lazy.load();
          },
          slideChange: function () {
            this.params.lazy.enabled && this.params.cssMode && this.lazy.load();
          },
        },
      },
      {
        name: 'controller',
        params: { controller: { control: void 0, inverse: !1, by: 'slide' } },
        create: function () {
          n.extend(this, {
            controller: {
              control: this.params.controller.control,
              getInterpolateFunction: de.getInterpolateFunction.bind(this),
              setTranslate: de.setTranslate.bind(this),
              setTransition: de.setTransition.bind(this),
            },
          });
        },
        on: {
          update: function () {
            this.controller.control &&
              this.controller.spline &&
              ((this.controller.spline = void 0),
              delete this.controller.spline);
          },
          resize: function () {
            this.controller.control &&
              this.controller.spline &&
              ((this.controller.spline = void 0),
              delete this.controller.spline);
          },
          observerUpdate: function () {
            this.controller.control &&
              this.controller.spline &&
              ((this.controller.spline = void 0),
              delete this.controller.spline);
          },
          setTranslate: function (e, t) {
            this.controller.control && this.controller.setTranslate(e, t);
          },
          setTransition: function (e, t) {
            this.controller.control && this.controller.setTransition(e, t);
          },
        },
      },
      {
        name: 'a11y',
        params: {
          a11y: {
            enabled: !0,
            notificationClass: 'swiper-notification',
            prevSlideMessage: 'Previous slide',
            nextSlideMessage: 'Next slide',
            firstSlideMessage: 'This is the first slide',
            lastSlideMessage: 'This is the last slide',
            paginationBulletMessage: 'Go to slide {{index}}',
          },
        },
        create: function () {
          var e = this;
          n.extend(e, {
            a11y: {
              liveRegion: s(
                '<span class="' +
                  e.params.a11y.notificationClass +
                  '" aria-live="assertive" aria-atomic="true"></span>'
              ),
            },
          }),
            Object.keys(he).forEach(function (t) {
              e.a11y[t] = he[t].bind(e);
            });
        },
        on: {
          init: function () {
            this.params.a11y.enabled &&
              (this.a11y.init(), this.a11y.updateNavigation());
          },
          toEdge: function () {
            this.params.a11y.enabled && this.a11y.updateNavigation();
          },
          fromEdge: function () {
            this.params.a11y.enabled && this.a11y.updateNavigation();
          },
          paginationUpdate: function () {
            this.params.a11y.enabled && this.a11y.updatePagination();
          },
          destroy: function () {
            this.params.a11y.enabled && this.a11y.destroy();
          },
        },
      },
      {
        name: 'history',
        params: { history: { enabled: !1, replaceState: !1, key: 'slides' } },
        create: function () {
          n.extend(this, {
            history: {
              init: pe.init.bind(this),
              setHistory: pe.setHistory.bind(this),
              setHistoryPopState: pe.setHistoryPopState.bind(this),
              scrollToSlide: pe.scrollToSlide.bind(this),
              destroy: pe.destroy.bind(this),
            },
          });
        },
        on: {
          init: function () {
            this.params.history.enabled && this.history.init();
          },
          destroy: function () {
            this.params.history.enabled && this.history.destroy();
          },
          transitionEnd: function () {
            this.history.initialized &&
              this.history.setHistory(
                this.params.history.key,
                this.activeIndex
              );
          },
          slideChange: function () {
            this.history.initialized &&
              this.params.cssMode &&
              this.history.setHistory(
                this.params.history.key,
                this.activeIndex
              );
          },
        },
      },
      {
        name: 'hash-navigation',
        params: {
          hashNavigation: { enabled: !1, replaceState: !1, watchState: !1 },
        },
        create: function () {
          n.extend(this, {
            hashNavigation: {
              initialized: !1,
              init: ce.init.bind(this),
              destroy: ce.destroy.bind(this),
              setHash: ce.setHash.bind(this),
              onHashCange: ce.onHashCange.bind(this),
            },
          });
        },
        on: {
          init: function () {
            this.params.hashNavigation.enabled && this.hashNavigation.init();
          },
          destroy: function () {
            this.params.hashNavigation.enabled && this.hashNavigation.destroy();
          },
          transitionEnd: function () {
            this.hashNavigation.initialized && this.hashNavigation.setHash();
          },
          slideChange: function () {
            this.hashNavigation.initialized &&
              this.params.cssMode &&
              this.hashNavigation.setHash();
          },
        },
      },
      {
        name: 'autoplay',
        params: {
          autoplay: {
            enabled: !1,
            delay: 3e3,
            waitForTransition: !0,
            disableOnInteraction: !0,
            stopOnLastSlide: !1,
            reverseDirection: !1,
          },
        },
        create: function () {
          var e = this;
          n.extend(e, {
            autoplay: {
              running: !1,
              paused: !1,
              run: ue.run.bind(e),
              start: ue.start.bind(e),
              stop: ue.stop.bind(e),
              pause: ue.pause.bind(e),
              onVisibilityChange: function () {
                'hidden' === document.visibilityState &&
                  e.autoplay.running &&
                  e.autoplay.pause(),
                  'visible' === document.visibilityState &&
                    e.autoplay.paused &&
                    (e.autoplay.run(), (e.autoplay.paused = !1));
              },
              onTransitionEnd: function (t) {
                e &&
                  !e.destroyed &&
                  e.$wrapperEl &&
                  t.target === this &&
                  (e.$wrapperEl[0].removeEventListener(
                    'transitionend',
                    e.autoplay.onTransitionEnd
                  ),
                  e.$wrapperEl[0].removeEventListener(
                    'webkitTransitionEnd',
                    e.autoplay.onTransitionEnd
                  ),
                  (e.autoplay.paused = !1),
                  e.autoplay.running ? e.autoplay.run() : e.autoplay.stop());
              },
            },
          });
        },
        on: {
          init: function () {
            this.params.autoplay.enabled &&
              (this.autoplay.start(),
              document.addEventListener(
                'visibilitychange',
                this.autoplay.onVisibilityChange
              ));
          },
          beforeTransitionStart: function (e, t) {
            this.autoplay.running &&
              (t || !this.params.autoplay.disableOnInteraction
                ? this.autoplay.pause(e)
                : this.autoplay.stop());
          },
          sliderFirstMove: function () {
            this.autoplay.running &&
              (this.params.autoplay.disableOnInteraction
                ? this.autoplay.stop()
                : this.autoplay.pause());
          },
          touchEnd: function () {
            this.params.cssMode &&
              this.autoplay.paused &&
              !this.params.autoplay.disableOnInteraction &&
              this.autoplay.run();
          },
          destroy: function () {
            this.autoplay.running && this.autoplay.stop(),
              document.removeEventListener(
                'visibilitychange',
                this.autoplay.onVisibilityChange
              );
          },
        },
      },
      {
        name: 'effect-fade',
        params: { fadeEffect: { crossFade: !1 } },
        create: function () {
          n.extend(this, {
            fadeEffect: {
              setTranslate: ve.setTranslate.bind(this),
              setTransition: ve.setTransition.bind(this),
            },
          });
        },
        on: {
          beforeInit: function () {
            if ('fade' === this.params.effect) {
              this.classNames.push(this.params.containerModifierClass + 'fade');
              var e = {
                slidesPerView: 1,
                slidesPerColumn: 1,
                slidesPerGroup: 1,
                watchSlidesProgress: !0,
                spaceBetween: 0,
                virtualTranslate: !0,
              };
              n.extend(this.params, e), n.extend(this.originalParams, e);
            }
          },
          setTranslate: function () {
            'fade' === this.params.effect && this.fadeEffect.setTranslate();
          },
          setTransition: function (e) {
            'fade' === this.params.effect && this.fadeEffect.setTransition(e);
          },
        },
      },
      {
        name: 'effect-cube',
        params: {
          cubeEffect: {
            slideShadows: !0,
            shadow: !0,
            shadowOffset: 20,
            shadowScale: 0.94,
          },
        },
        create: function () {
          n.extend(this, {
            cubeEffect: {
              setTranslate: fe.setTranslate.bind(this),
              setTransition: fe.setTransition.bind(this),
            },
          });
        },
        on: {
          beforeInit: function () {
            if ('cube' === this.params.effect) {
              this.classNames.push(this.params.containerModifierClass + 'cube'),
                this.classNames.push(this.params.containerModifierClass + '3d');
              var e = {
                slidesPerView: 1,
                slidesPerColumn: 1,
                slidesPerGroup: 1,
                watchSlidesProgress: !0,
                resistanceRatio: 0,
                spaceBetween: 0,
                centeredSlides: !1,
                virtualTranslate: !0,
              };
              n.extend(this.params, e), n.extend(this.originalParams, e);
            }
          },
          setTranslate: function () {
            'cube' === this.params.effect && this.cubeEffect.setTranslate();
          },
          setTransition: function (e) {
            'cube' === this.params.effect && this.cubeEffect.setTransition(e);
          },
        },
      },
      {
        name: 'effect-flip',
        params: { flipEffect: { slideShadows: !0, limitRotation: !0 } },
        create: function () {
          n.extend(this, {
            flipEffect: {
              setTranslate: me.setTranslate.bind(this),
              setTransition: me.setTransition.bind(this),
            },
          });
        },
        on: {
          beforeInit: function () {
            if ('flip' === this.params.effect) {
              this.classNames.push(this.params.containerModifierClass + 'flip'),
                this.classNames.push(this.params.containerModifierClass + '3d');
              var e = {
                slidesPerView: 1,
                slidesPerColumn: 1,
                slidesPerGroup: 1,
                watchSlidesProgress: !0,
                spaceBetween: 0,
                virtualTranslate: !0,
              };
              n.extend(this.params, e), n.extend(this.originalParams, e);
            }
          },
          setTranslate: function () {
            'flip' === this.params.effect && this.flipEffect.setTranslate();
          },
          setTransition: function (e) {
            'flip' === this.params.effect && this.flipEffect.setTransition(e);
          },
        },
      },
      {
        name: 'effect-coverflow',
        params: {
          coverflowEffect: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: !0,
          },
        },
        create: function () {
          n.extend(this, {
            coverflowEffect: {
              setTranslate: ge.setTranslate.bind(this),
              setTransition: ge.setTransition.bind(this),
            },
          });
        },
        on: {
          beforeInit: function () {
            'coverflow' === this.params.effect &&
              (this.classNames.push(
                this.params.containerModifierClass + 'coverflow'
              ),
              this.classNames.push(this.params.containerModifierClass + '3d'),
              (this.params.watchSlidesProgress = !0),
              (this.originalParams.watchSlidesProgress = !0));
          },
          setTranslate: function () {
            'coverflow' === this.params.effect &&
              this.coverflowEffect.setTranslate();
          },
          setTransition: function (e) {
            'coverflow' === this.params.effect &&
              this.coverflowEffect.setTransition(e);
          },
        },
      },
      {
        name: 'thumbs',
        params: {
          thumbs: {
            multipleActiveThumbs: !0,
            swiper: null,
            slideThumbActiveClass: 'swiper-slide-thumb-active',
            thumbsContainerClass: 'swiper-container-thumbs',
          },
        },
        create: function () {
          n.extend(this, {
            thumbs: {
              swiper: null,
              init: be.init.bind(this),
              update: be.update.bind(this),
              onThumbClick: be.onThumbClick.bind(this),
            },
          });
        },
        on: {
          beforeInit: function () {
            var e = this.params.thumbs;
            e && e.swiper && (this.thumbs.init(), this.thumbs.update(!0));
          },
          slideChange: function () {
            this.thumbs.swiper && this.thumbs.update();
          },
          update: function () {
            this.thumbs.swiper && this.thumbs.update();
          },
          resize: function () {
            this.thumbs.swiper && this.thumbs.update();
          },
          observerUpdate: function () {
            this.thumbs.swiper && this.thumbs.update();
          },
          setTransition: function (e) {
            var t = this.thumbs.swiper;
            t && t.setTransition(e);
          },
          beforeDestroy: function () {
            var e = this.thumbs.swiper;
            e && this.thumbs.swiperCreated && e && e.destroy();
          },
        },
      },
    ];
  return (
    void 0 === W.use &&
      ((W.use = W.Class.use), (W.installModule = W.Class.installModule)),
    W.use(we),
    W
  );
});
!(function (a) {
  if ('object' == typeof exports && 'undefined' != typeof module)
    module.exports = a();
  else if ('function' == typeof define && define.amd) define([], a);
  else {
    var b;
    (b =
      'undefined' != typeof window
        ? window
        : 'undefined' != typeof global
        ? global
        : 'undefined' != typeof self
        ? self
        : this),
      (b.ProgressBar = a());
  }
})(function () {
  var a;
  return (function () {
    function a(b, c, d) {
      function e(g, h) {
        if (!c[g]) {
          if (!b[g]) {
            var i = 'function' == typeof require && require;
            if (!h && i) return i(g, !0);
            if (f) return f(g, !0);
            var j = new Error("Cannot find module '" + g + "'");
            throw ((j.code = 'MODULE_NOT_FOUND'), j);
          }
          var k = (c[g] = { exports: {} });
          b[g][0].call(
            k.exports,
            function (a) {
              return e(b[g][1][a] || a);
            },
            k,
            k.exports,
            a,
            b,
            c,
            d
          );
        }
        return c[g].exports;
      }
      for (
        var f = 'function' == typeof require && require, g = 0;
        g < d.length;
        g++
      )
        e(d[g]);
      return e;
    }
    return a;
  })()(
    {
      1: [
        function (b, c, d) {
          !(function (b, e) {
            'object' == typeof d && 'object' == typeof c
              ? (c.exports = e())
              : 'function' == typeof a && a.amd
              ? a('shifty', [], e)
              : 'object' == typeof d
              ? (d.shifty = e())
              : (b.shifty = e());
          })(window, function () {
            return (function (a) {
              function b(d) {
                if (c[d]) return c[d].exports;
                var e = (c[d] = { i: d, l: !1, exports: {} });
                return (
                  a[d].call(e.exports, e, e.exports, b), (e.l = !0), e.exports
                );
              }
              var c = {};
              return (
                (b.m = a),
                (b.c = c),
                (b.d = function (a, c, d) {
                  b.o(a, c) ||
                    Object.defineProperty(a, c, { enumerable: !0, get: d });
                }),
                (b.r = function (a) {
                  'undefined' != typeof Symbol &&
                    Symbol.toStringTag &&
                    Object.defineProperty(a, Symbol.toStringTag, {
                      value: 'Module',
                    }),
                    Object.defineProperty(a, '__esModule', { value: !0 });
                }),
                (b.t = function (a, c) {
                  if ((1 & c && (a = b(a)), 8 & c)) return a;
                  if (4 & c && 'object' == typeof a && a && a.__esModule)
                    return a;
                  var d = Object.create(null);
                  if (
                    (b.r(d),
                    Object.defineProperty(d, 'default', {
                      enumerable: !0,
                      value: a,
                    }),
                    2 & c && 'string' != typeof a)
                  )
                    for (var e in a)
                      b.d(
                        d,
                        e,
                        function (b) {
                          return a[b];
                        }.bind(null, e)
                      );
                  return d;
                }),
                (b.n = function (a) {
                  var c =
                    a && a.__esModule
                      ? function () {
                          return a.default;
                        }
                      : function () {
                          return a;
                        };
                  return b.d(c, 'a', c), c;
                }),
                (b.o = function (a, b) {
                  return Object.prototype.hasOwnProperty.call(a, b);
                }),
                (b.p = ''),
                b((b.s = 3))
              );
            })([
              function (a, b, c) {
                'use strict';
                (function (a) {
                  function d(a, b) {
                    for (var c = 0; c < b.length; c++) {
                      var d = b[c];
                      (d.enumerable = d.enumerable || !1),
                        (d.configurable = !0),
                        'value' in d && (d.writable = !0),
                        Object.defineProperty(a, d.key, d);
                    }
                  }
                  function e(a) {
                    return (e =
                      'function' == typeof Symbol &&
                      'symbol' == typeof Symbol.iterator
                        ? function (a) {
                            return typeof a;
                          }
                        : function (a) {
                            return a &&
                              'function' == typeof Symbol &&
                              a.constructor === Symbol &&
                              a !== Symbol.prototype
                              ? 'symbol'
                              : typeof a;
                          })(a);
                  }
                  function f(a) {
                    for (var b = 1; b < arguments.length; b++) {
                      var c = null != arguments[b] ? arguments[b] : {},
                        d = Object.keys(c);
                      'function' == typeof Object.getOwnPropertySymbols &&
                        (d = d.concat(
                          Object.getOwnPropertySymbols(c).filter(function (a) {
                            return Object.getOwnPropertyDescriptor(
                              c,
                              a
                            ).enumerable;
                          })
                        )),
                        d.forEach(function (b) {
                          g(a, b, c[b]);
                        });
                    }
                    return a;
                  }
                  function g(a, b, c) {
                    return (
                      b in a
                        ? Object.defineProperty(a, b, {
                            value: c,
                            enumerable: !0,
                            configurable: !0,
                            writable: !0,
                          })
                        : (a[b] = c),
                      a
                    );
                  }
                  function h() {
                    var a =
                        arguments.length > 0 && void 0 !== arguments[0]
                          ? arguments[0]
                          : {},
                      b = new u(),
                      c = b.tween(a);
                    return (c.tweenable = b), c;
                  }
                  c.d(b, 'e', function () {
                    return p;
                  }),
                    c.d(b, 'c', function () {
                      return r;
                    }),
                    c.d(b, 'b', function () {
                      return s;
                    }),
                    c.d(b, 'a', function () {
                      return u;
                    }),
                    c.d(b, 'd', function () {
                      return h;
                    });
                  var i = c(1),
                    j = 'undefined' != typeof window ? window : a,
                    k =
                      j.requestAnimationFrame ||
                      j.webkitRequestAnimationFrame ||
                      j.oRequestAnimationFrame ||
                      j.msRequestAnimationFrame ||
                      (j.mozCancelRequestAnimationFrame &&
                        j.mozRequestAnimationFrame) ||
                      setTimeout,
                    l = function () {},
                    m = null,
                    n = null,
                    o = f({}, i),
                    p = function (a, b, c, d, e, f, g) {
                      var h = a < f ? 0 : (a - f) / e;
                      for (var i in b) {
                        var j = g[i],
                          k = j.call ? j : o[j],
                          l = c[i];
                        b[i] = l + (d[i] - l) * k(h);
                      }
                      return b;
                    },
                    q = function (a, b) {
                      var c = a._attachment,
                        d = a._currentState,
                        e = a._delay,
                        f = a._easing,
                        g = a._originalState,
                        h = a._duration,
                        i = a._step,
                        j = a._targetState,
                        k = a._timestamp,
                        l = k + e + h,
                        m = b > l ? l : b,
                        n = h - (l - m);
                      m >= l
                        ? (i(j, c, n), a.stop(!0))
                        : (a._applyFilter('beforeTween'),
                          m < k + e ? ((m = 1), (h = 1), (k = 1)) : (k += e),
                          p(m, d, g, j, h, k, f),
                          a._applyFilter('afterTween'),
                          i(d, c, n));
                    },
                    r = function () {
                      for (var a = u.now(), b = m; b; ) {
                        var c = b._next;
                        q(b, a), (b = c);
                      }
                    },
                    s = function (a) {
                      var b =
                          arguments.length > 1 && void 0 !== arguments[1]
                            ? arguments[1]
                            : 'linear',
                        c = {},
                        d = e(b);
                      if ('string' === d || 'function' === d)
                        for (var f in a) c[f] = b;
                      else for (var g in a) c[g] = b[g] || 'linear';
                      return c;
                    },
                    t = function (a) {
                      if (a === m)
                        (m = a._next) ? (m._previous = null) : (n = null);
                      else if (a === n)
                        (n = a._previous) ? (n._next = null) : (m = null);
                      else {
                        var b = a._previous,
                          c = a._next;
                        (b._next = c), (c._previous = b);
                      }
                      a._previous = a._next = null;
                    },
                    u = (function () {
                      function a() {
                        var b =
                            arguments.length > 0 && void 0 !== arguments[0]
                              ? arguments[0]
                              : {},
                          c =
                            arguments.length > 1 && void 0 !== arguments[1]
                              ? arguments[1]
                              : void 0;
                        !(function (a, b) {
                          if (!(a instanceof b))
                            throw new TypeError(
                              'Cannot call a class as a function'
                            );
                        })(this, a),
                          (this._currentState = b),
                          (this._configured = !1),
                          (this._filters = []),
                          (this._timestamp = null),
                          (this._next = null),
                          (this._previous = null),
                          c && this.setConfig(c);
                      }
                      var b, c, e;
                      return (
                        (b = a),
                        (c = [
                          {
                            key: '_applyFilter',
                            value: function (a) {
                              var b = !0,
                                c = !1,
                                d = void 0;
                              try {
                                for (
                                  var e, f = this._filters[Symbol.iterator]();
                                  !(b = (e = f.next()).done);
                                  b = !0
                                ) {
                                  var g = e.value[a];
                                  g && g(this);
                                }
                              } catch (a) {
                                (c = !0), (d = a);
                              } finally {
                                try {
                                  b || null == f.return || f.return();
                                } finally {
                                  if (c) throw d;
                                }
                              }
                            },
                          },
                          {
                            key: 'tween',
                            value: function () {
                              var b =
                                  arguments.length > 0 &&
                                  void 0 !== arguments[0]
                                    ? arguments[0]
                                    : void 0,
                                c = this._attachment,
                                d = this._configured;
                              return (
                                (!b && d) || this.setConfig(b),
                                (this._pausedAtTime = null),
                                (this._timestamp = a.now()),
                                this._start(this.get(), c),
                                this.resume()
                              );
                            },
                          },
                          {
                            key: 'setConfig',
                            value: function () {
                              var b = this,
                                c =
                                  arguments.length > 0 &&
                                  void 0 !== arguments[0]
                                    ? arguments[0]
                                    : {},
                                d = c.attachment,
                                e = c.delay,
                                g = void 0 === e ? 0 : e,
                                h = c.duration,
                                i = void 0 === h ? 500 : h,
                                j = c.easing,
                                k = c.from,
                                m = c.promise,
                                n = void 0 === m ? Promise : m,
                                o = c.start,
                                p = void 0 === o ? l : o,
                                q = c.step,
                                r = void 0 === q ? l : q,
                                t = c.to;
                              (this._configured = !0),
                                (this._attachment = d),
                                (this._isPlaying = !1),
                                (this._pausedAtTime = null),
                                (this._scheduleId = null),
                                (this._delay = g),
                                (this._start = p),
                                (this._step = r),
                                (this._duration = i),
                                (this._currentState = f({}, k || this.get())),
                                (this._originalState = this.get()),
                                (this._targetState = f({}, t || this.get()));
                              var u = this._currentState;
                              (this._targetState = f({}, u, this._targetState)),
                                (this._easing = s(u, j));
                              var v = a.filters;
                              for (var w in ((this._filters.length = 0), v))
                                v[w].doesApply(this) &&
                                  this._filters.push(v[w]);
                              return (
                                this._applyFilter('tweenCreated'),
                                (this._promise = new n(function (a, c) {
                                  (b._resolve = a), (b._reject = c);
                                })),
                                this._promise.catch(l),
                                this
                              );
                            },
                          },
                          {
                            key: 'get',
                            value: function () {
                              return f({}, this._currentState);
                            },
                          },
                          {
                            key: 'set',
                            value: function (a) {
                              this._currentState = a;
                            },
                          },
                          {
                            key: 'pause',
                            value: function () {
                              if (this._isPlaying)
                                return (
                                  (this._pausedAtTime = a.now()),
                                  (this._isPlaying = !1),
                                  t(this),
                                  this
                                );
                            },
                          },
                          {
                            key: 'resume',
                            value: function () {
                              if (null === this._timestamp) return this.tween();
                              if (this._isPlaying) return this._promise;
                              var b = a.now();
                              return (
                                this._pausedAtTime &&
                                  ((this._timestamp += b - this._pausedAtTime),
                                  (this._pausedAtTime = null)),
                                (this._isPlaying = !0),
                                null === m
                                  ? ((m = this),
                                    (n = this),
                                    (function a() {
                                      m && (k.call(j, a, 1e3 / 60), r());
                                    })())
                                  : ((this._previous = n),
                                    (n._next = this),
                                    (n = this)),
                                this._promise
                              );
                            },
                          },
                          {
                            key: 'seek',
                            value: function (b) {
                              b = Math.max(b, 0);
                              var c = a.now();
                              return this._timestamp + b === 0
                                ? this
                                : ((this._timestamp = c - b),
                                  this._isPlaying || q(this, c),
                                  this);
                            },
                          },
                          {
                            key: 'stop',
                            value: function () {
                              var a =
                                  arguments.length > 0 &&
                                  void 0 !== arguments[0] &&
                                  arguments[0],
                                b = this._attachment,
                                c = this._currentState,
                                d = this._easing,
                                e = this._originalState,
                                f = this._targetState;
                              if (this._isPlaying)
                                return (
                                  (this._isPlaying = !1),
                                  t(this),
                                  a
                                    ? (this._applyFilter('beforeTween'),
                                      p(1, c, e, f, 1, 0, d),
                                      this._applyFilter('afterTween'),
                                      this._applyFilter('afterTweenEnd'),
                                      this._resolve(c, b))
                                    : this._reject(c, b),
                                  this
                                );
                            },
                          },
                          {
                            key: 'isPlaying',
                            value: function () {
                              return this._isPlaying;
                            },
                          },
                          {
                            key: 'setScheduleFunction',
                            value: function (b) {
                              a.setScheduleFunction(b);
                            },
                          },
                          {
                            key: 'dispose',
                            value: function () {
                              for (var a in this) delete this[a];
                            },
                          },
                        ]) && d(b.prototype, c),
                        e && d(b, e),
                        a
                      );
                    })();
                  (u.setScheduleFunction = function (a) {
                    return (k = a);
                  }),
                    (u.formulas = o),
                    (u.filters = {}),
                    (u.now =
                      Date.now ||
                      function () {
                        return +new Date();
                      });
                }.call(this, c(2)));
              },
              function (a, b, c) {
                'use strict';
                c.r(b),
                  c.d(b, 'linear', function () {
                    return d;
                  }),
                  c.d(b, 'easeInQuad', function () {
                    return e;
                  }),
                  c.d(b, 'easeOutQuad', function () {
                    return f;
                  }),
                  c.d(b, 'easeInOutQuad', function () {
                    return g;
                  }),
                  c.d(b, 'easeInCubic', function () {
                    return h;
                  }),
                  c.d(b, 'easeOutCubic', function () {
                    return i;
                  }),
                  c.d(b, 'easeInOutCubic', function () {
                    return j;
                  }),
                  c.d(b, 'easeInQuart', function () {
                    return k;
                  }),
                  c.d(b, 'easeOutQuart', function () {
                    return l;
                  }),
                  c.d(b, 'easeInOutQuart', function () {
                    return m;
                  }),
                  c.d(b, 'easeInQuint', function () {
                    return n;
                  }),
                  c.d(b, 'easeOutQuint', function () {
                    return o;
                  }),
                  c.d(b, 'easeInOutQuint', function () {
                    return p;
                  }),
                  c.d(b, 'easeInSine', function () {
                    return q;
                  }),
                  c.d(b, 'easeOutSine', function () {
                    return r;
                  }),
                  c.d(b, 'easeInOutSine', function () {
                    return s;
                  }),
                  c.d(b, 'easeInExpo', function () {
                    return t;
                  }),
                  c.d(b, 'easeOutExpo', function () {
                    return u;
                  }),
                  c.d(b, 'easeInOutExpo', function () {
                    return v;
                  }),
                  c.d(b, 'easeInCirc', function () {
                    return w;
                  }),
                  c.d(b, 'easeOutCirc', function () {
                    return x;
                  }),
                  c.d(b, 'easeInOutCirc', function () {
                    return y;
                  }),
                  c.d(b, 'easeOutBounce', function () {
                    return z;
                  }),
                  c.d(b, 'easeInBack', function () {
                    return A;
                  }),
                  c.d(b, 'easeOutBack', function () {
                    return B;
                  }),
                  c.d(b, 'easeInOutBack', function () {
                    return C;
                  }),
                  c.d(b, 'elastic', function () {
                    return D;
                  }),
                  c.d(b, 'swingFromTo', function () {
                    return E;
                  }),
                  c.d(b, 'swingFrom', function () {
                    return F;
                  }),
                  c.d(b, 'swingTo', function () {
                    return G;
                  }),
                  c.d(b, 'bounce', function () {
                    return H;
                  }),
                  c.d(b, 'bouncePast', function () {
                    return I;
                  }),
                  c.d(b, 'easeFromTo', function () {
                    return J;
                  }),
                  c.d(b, 'easeFrom', function () {
                    return K;
                  }),
                  c.d(b, 'easeTo', function () {
                    return L;
                  });
                var d = function (a) {
                    return a;
                  },
                  e = function (a) {
                    return Math.pow(a, 2);
                  },
                  f = function (a) {
                    return -(Math.pow(a - 1, 2) - 1);
                  },
                  g = function (a) {
                    return (a /= 0.5) < 1
                      ? 0.5 * Math.pow(a, 2)
                      : -0.5 * ((a -= 2) * a - 2);
                  },
                  h = function (a) {
                    return Math.pow(a, 3);
                  },
                  i = function (a) {
                    return Math.pow(a - 1, 3) + 1;
                  },
                  j = function (a) {
                    return (a /= 0.5) < 1
                      ? 0.5 * Math.pow(a, 3)
                      : 0.5 * (Math.pow(a - 2, 3) + 2);
                  },
                  k = function (a) {
                    return Math.pow(a, 4);
                  },
                  l = function (a) {
                    return -(Math.pow(a - 1, 4) - 1);
                  },
                  m = function (a) {
                    return (a /= 0.5) < 1
                      ? 0.5 * Math.pow(a, 4)
                      : -0.5 * ((a -= 2) * Math.pow(a, 3) - 2);
                  },
                  n = function (a) {
                    return Math.pow(a, 5);
                  },
                  o = function (a) {
                    return Math.pow(a - 1, 5) + 1;
                  },
                  p = function (a) {
                    return (a /= 0.5) < 1
                      ? 0.5 * Math.pow(a, 5)
                      : 0.5 * (Math.pow(a - 2, 5) + 2);
                  },
                  q = function (a) {
                    return 1 - Math.cos(a * (Math.PI / 2));
                  },
                  r = function (a) {
                    return Math.sin(a * (Math.PI / 2));
                  },
                  s = function (a) {
                    return -0.5 * (Math.cos(Math.PI * a) - 1);
                  },
                  t = function (a) {
                    return 0 === a ? 0 : Math.pow(2, 10 * (a - 1));
                  },
                  u = function (a) {
                    return 1 === a ? 1 : 1 - Math.pow(2, -10 * a);
                  },
                  v = function (a) {
                    return 0 === a
                      ? 0
                      : 1 === a
                      ? 1
                      : (a /= 0.5) < 1
                      ? 0.5 * Math.pow(2, 10 * (a - 1))
                      : 0.5 * (2 - Math.pow(2, -10 * --a));
                  },
                  w = function (a) {
                    return -(Math.sqrt(1 - a * a) - 1);
                  },
                  x = function (a) {
                    return Math.sqrt(1 - Math.pow(a - 1, 2));
                  },
                  y = function (a) {
                    return (a /= 0.5) < 1
                      ? -0.5 * (Math.sqrt(1 - a * a) - 1)
                      : 0.5 * (Math.sqrt(1 - (a -= 2) * a) + 1);
                  },
                  z = function (a) {
                    return a < 1 / 2.75
                      ? 7.5625 * a * a
                      : a < 2 / 2.75
                      ? 7.5625 * (a -= 1.5 / 2.75) * a + 0.75
                      : a < 2.5 / 2.75
                      ? 7.5625 * (a -= 2.25 / 2.75) * a + 0.9375
                      : 7.5625 * (a -= 2.625 / 2.75) * a + 0.984375;
                  },
                  A = function (a) {
                    var b = 1.70158;
                    return a * a * ((b + 1) * a - b);
                  },
                  B = function (a) {
                    var b = 1.70158;
                    return (a -= 1) * a * ((b + 1) * a + b) + 1;
                  },
                  C = function (a) {
                    var b = 1.70158;
                    return (a /= 0.5) < 1
                      ? a * a * ((1 + (b *= 1.525)) * a - b) * 0.5
                      : 0.5 * ((a -= 2) * a * ((1 + (b *= 1.525)) * a + b) + 2);
                  },
                  D = function (a) {
                    return (
                      -1 *
                        Math.pow(4, -8 * a) *
                        Math.sin(((6 * a - 1) * (2 * Math.PI)) / 2) +
                      1
                    );
                  },
                  E = function (a) {
                    var b = 1.70158;
                    return (a /= 0.5) < 1
                      ? a * a * ((1 + (b *= 1.525)) * a - b) * 0.5
                      : 0.5 * ((a -= 2) * a * ((1 + (b *= 1.525)) * a + b) + 2);
                  },
                  F = function (a) {
                    var b = 1.70158;
                    return a * a * ((b + 1) * a - b);
                  },
                  G = function (a) {
                    var b = 1.70158;
                    return (a -= 1) * a * ((b + 1) * a + b) + 1;
                  },
                  H = function (a) {
                    return a < 1 / 2.75
                      ? 7.5625 * a * a
                      : a < 2 / 2.75
                      ? 7.5625 * (a -= 1.5 / 2.75) * a + 0.75
                      : a < 2.5 / 2.75
                      ? 7.5625 * (a -= 2.25 / 2.75) * a + 0.9375
                      : 7.5625 * (a -= 2.625 / 2.75) * a + 0.984375;
                  },
                  I = function (a) {
                    return a < 1 / 2.75
                      ? 7.5625 * a * a
                      : a < 2 / 2.75
                      ? 2 - (7.5625 * (a -= 1.5 / 2.75) * a + 0.75)
                      : a < 2.5 / 2.75
                      ? 2 - (7.5625 * (a -= 2.25 / 2.75) * a + 0.9375)
                      : 2 - (7.5625 * (a -= 2.625 / 2.75) * a + 0.984375);
                  },
                  J = function (a) {
                    return (a /= 0.5) < 1
                      ? 0.5 * Math.pow(a, 4)
                      : -0.5 * ((a -= 2) * Math.pow(a, 3) - 2);
                  },
                  K = function (a) {
                    return Math.pow(a, 4);
                  },
                  L = function (a) {
                    return Math.pow(a, 0.25);
                  };
              },
              function (a, b) {
                var c;
                c = (function () {
                  return this;
                })();
                try {
                  c = c || new Function('return this')();
                } catch (a) {
                  'object' == typeof window && (c = window);
                }
                a.exports = c;
              },
              function (a, b, c) {
                'use strict';
                function d(a) {
                  return parseInt(a, 16);
                }
                function e(a) {
                  var b = a._currentState;
                  [b, a._originalState, a._targetState].forEach(z),
                    (a._tokenData = C(b));
                }
                function f(a) {
                  var b = a._currentState,
                    c = a._originalState,
                    d = a._targetState,
                    e = a._easing,
                    f = a._tokenData;
                  I(e, f),
                    [b, c, d].forEach(function (a) {
                      return D(a, f);
                    });
                }
                function g(a) {
                  var b = a._currentState,
                    c = a._originalState,
                    d = a._targetState,
                    e = a._easing,
                    f = a._tokenData;
                  [b, c, d].forEach(function (a) {
                    return H(a, f);
                  }),
                    J(e, f);
                }
                function h(a, b, c) {
                  return (
                    b in a
                      ? Object.defineProperty(a, b, {
                          value: c,
                          enumerable: !0,
                          configurable: !0,
                          writable: !0,
                        })
                      : (a[b] = c),
                    a
                  );
                }
                function i(a) {
                  return (
                    (function (a) {
                      if (Array.isArray(a)) {
                        for (
                          var b = 0, c = new Array(a.length);
                          b < a.length;
                          b++
                        )
                          c[b] = a[b];
                        return c;
                      }
                    })(a) ||
                    (function (a) {
                      if (
                        Symbol.iterator in Object(a) ||
                        '[object Arguments]' ===
                          Object.prototype.toString.call(a)
                      )
                        return Array.from(a);
                    })(a) ||
                    (function () {
                      throw new TypeError(
                        'Invalid attempt to spread non-iterable instance'
                      );
                    })()
                  );
                }
                function j(a, b) {
                  for (var c = 0; c < b.length; c++) {
                    var d = b[c];
                    (d.enumerable = d.enumerable || !1),
                      (d.configurable = !0),
                      'value' in d && (d.writable = !0),
                      Object.defineProperty(a, d.key, d);
                  }
                }
                function k(a, b) {
                  if (!b.has(a))
                    throw new TypeError(
                      'attempted to get private field on non-instance'
                    );
                  var c = b.get(a);
                  return c.get ? c.get.call(a) : c.value;
                }
                function l(a, b, c, d, e, f) {
                  var g = 0,
                    h = 0,
                    i = 0,
                    j = 0,
                    k = 0,
                    l = 0,
                    m = function (a) {
                      return ((g * a + h) * a + i) * a;
                    },
                    n = function (a) {
                      return a >= 0 ? a : 0 - a;
                    };
                  return (
                    (g = 1 - (i = 3 * b) - (h = 3 * (d - b) - i)),
                    (j = 1 - (l = 3 * c) - (k = 3 * (e - c) - l)),
                    (function (a, b) {
                      return (
                        (c = (function (a, b) {
                          var c, d, e, f, j, k, l;
                          for (e = a, k = 0; k < 8; k++) {
                            if (((f = m(e) - a), n(f) < b)) return e;
                            if (
                              n((j = (3 * g * (l = e) + 2 * h) * l + i)) < 1e-6
                            )
                              break;
                            e -= f / j;
                          }
                          if ((e = a) < (c = 0)) return c;
                          if (e > (d = 1)) return d;
                          for (; c < d; ) {
                            if (((f = m(e)), n(f - a) < b)) return e;
                            a > f ? (c = e) : (d = e), (e = 0.5 * (d - c) + c);
                          }
                          return e;
                        })(a, b)),
                        ((j * c + k) * c + l) * c
                      );
                      var c;
                    })(
                      a,
                      (function (a) {
                        return 1 / (200 * a);
                      })(f)
                    )
                  );
                }
                c.r(b);
                var m = {};
                c.r(m),
                  c.d(m, 'doesApply', function () {
                    return K;
                  }),
                  c.d(m, 'tweenCreated', function () {
                    return e;
                  }),
                  c.d(m, 'beforeTween', function () {
                    return f;
                  }),
                  c.d(m, 'afterTween', function () {
                    return g;
                  });
                var n,
                  o,
                  p = c(0),
                  q = /(\d|-|\.)/,
                  r = /([^\-0-9.]+)/g,
                  s = /[0-9.-]+/g,
                  t =
                    ((n = s.source),
                    (o = /,\s*/.source),
                    new RegExp(
                      'rgb\\('
                        .concat(n)
                        .concat(o)
                        .concat(n)
                        .concat(o)
                        .concat(n, '\\)'),
                      'g'
                    )),
                  u = /^.*\(/,
                  v = /#([0-9]|[a-f]){3,6}/gi,
                  w = function (a, b) {
                    return a.map(function (a, c) {
                      return '_'.concat(b, '_').concat(c);
                    });
                  },
                  x = function (a) {
                    return 'rgb('.concat(
                      ((b = a),
                      3 === (b = b.replace(/#/, '')).length &&
                        (b =
                          (b = b.split(''))[0] +
                          b[0] +
                          b[1] +
                          b[1] +
                          b[2] +
                          b[2]),
                      [
                        d(b.substr(0, 2)),
                        d(b.substr(2, 2)),
                        d(b.substr(4, 2)),
                      ]).join(','),
                      ')'
                    );
                    var b;
                  },
                  y = function (a, b, c) {
                    var d = b.match(a),
                      e = b.replace(a, 'VAL');
                    return (
                      d &&
                        d.forEach(function (a) {
                          return (e = e.replace('VAL', c(a)));
                        }),
                      e
                    );
                  },
                  z = function (a) {
                    for (var b in a) {
                      var c = a[b];
                      'string' == typeof c && c.match(v) && (a[b] = y(v, c, x));
                    }
                  },
                  A = function (a) {
                    var b = a.match(s).map(Math.floor);
                    return ''.concat(a.match(u)[0]).concat(b.join(','), ')');
                  },
                  B = function (a) {
                    return a.match(s);
                  },
                  C = function (a) {
                    var b,
                      c,
                      d = {};
                    for (var e in a) {
                      var f = a[e];
                      'string' == typeof f &&
                        (d[e] = {
                          formatString:
                            ((b = f),
                            (c = void 0),
                            (c = b.match(r)),
                            c
                              ? (1 === c.length || b.charAt(0).match(q)) &&
                                c.unshift('')
                              : (c = ['', '']),
                            c.join('VAL')),
                          chunkNames: w(B(f), e),
                        });
                    }
                    return d;
                  },
                  D = function (a, b) {
                    var c = function (c) {
                      B(a[c]).forEach(function (d, e) {
                        return (a[b[c].chunkNames[e]] = +d);
                      }),
                        delete a[c];
                    };
                    for (var d in b) c(d);
                  },
                  E = function (a, b) {
                    var c = {};
                    return (
                      b.forEach(function (b) {
                        (c[b] = a[b]), delete a[b];
                      }),
                      c
                    );
                  },
                  F = function (a, b) {
                    return b.map(function (b) {
                      return a[b];
                    });
                  },
                  G = function (a, b) {
                    return (
                      b.forEach(function (b) {
                        return (a = a.replace('VAL', +b.toFixed(4)));
                      }),
                      a
                    );
                  },
                  H = function (a, b) {
                    for (var c in b) {
                      var d = b[c],
                        e = d.chunkNames,
                        f = d.formatString,
                        g = G(f, F(E(a, e), e));
                      a[c] = y(t, g, A);
                    }
                  },
                  I = function (a, b) {
                    var c = function (c) {
                      var d = b[c].chunkNames,
                        e = a[c];
                      if ('string' == typeof e) {
                        var f = e.split(' '),
                          g = f[f.length - 1];
                        d.forEach(function (b, c) {
                          return (a[b] = f[c] || g);
                        });
                      } else
                        d.forEach(function (b) {
                          return (a[b] = e);
                        });
                      delete a[c];
                    };
                    for (var d in b) c(d);
                  },
                  J = function (a, b) {
                    for (var c in b) {
                      var d = b[c].chunkNames,
                        e = a[d[0]];
                      a[c] =
                        'string' == typeof e
                          ? d
                              .map(function (b) {
                                var c = a[b];
                                return delete a[b], c;
                              })
                              .join(' ')
                          : e;
                    }
                  },
                  K = function (a) {
                    var b = a._currentState;
                    return Object.keys(b).some(function (a) {
                      return 'string' == typeof b[a];
                    });
                  },
                  L = new p.a(),
                  M = p.a.filters,
                  N = function (a, b, c, d) {
                    var e =
                        arguments.length > 4 && void 0 !== arguments[4]
                          ? arguments[4]
                          : 0,
                      f = (function (a) {
                        for (var b = 1; b < arguments.length; b++) {
                          var c = null != arguments[b] ? arguments[b] : {},
                            d = Object.keys(c);
                          'function' == typeof Object.getOwnPropertySymbols &&
                            (d = d.concat(
                              Object.getOwnPropertySymbols(c).filter(function (
                                a
                              ) {
                                return Object.getOwnPropertyDescriptor(c, a)
                                  .enumerable;
                              })
                            )),
                            d.forEach(function (b) {
                              h(a, b, c[b]);
                            });
                        }
                        return a;
                      })({}, a),
                      g = Object(p.b)(a, d);
                    for (var i in ((L._filters.length = 0),
                    L.set({}),
                    (L._currentState = f),
                    (L._originalState = a),
                    (L._targetState = b),
                    (L._easing = g),
                    M))
                      M[i].doesApply(L) && L._filters.push(M[i]);
                    L._applyFilter('tweenCreated'),
                      L._applyFilter('beforeTween');
                    var j = Object(p.e)(c, f, a, b, 1, e, g);
                    return L._applyFilter('afterTween'), j;
                  },
                  O = (function () {
                    function a() {
                      !(function (a, b) {
                        if (!(a instanceof b))
                          throw new TypeError(
                            'Cannot call a class as a function'
                          );
                      })(this, a),
                        P.set(this, { writable: !0, value: [] });
                      for (
                        var b = arguments.length, c = new Array(b), d = 0;
                        d < b;
                        d++
                      )
                        c[d] = arguments[d];
                      c.forEach(this.add.bind(this));
                    }
                    var b, c, d;
                    return (
                      (b = a),
                      (c = [
                        {
                          key: 'add',
                          value: function (a) {
                            return k(this, P).push(a), a;
                          },
                        },
                        {
                          key: 'remove',
                          value: function (a) {
                            var b = k(this, P).indexOf(a);
                            return ~b && k(this, P).splice(b, 1), a;
                          },
                        },
                        {
                          key: 'empty',
                          value: function () {
                            return this.tweenables.map(this.remove.bind(this));
                          },
                        },
                        {
                          key: 'isPlaying',
                          value: function () {
                            return k(this, P).some(function (a) {
                              return a.isPlaying();
                            });
                          },
                        },
                        {
                          key: 'play',
                          value: function () {
                            return (
                              k(this, P).forEach(function (a) {
                                return a.tween();
                              }),
                              this
                            );
                          },
                        },
                        {
                          key: 'pause',
                          value: function () {
                            return (
                              k(this, P).forEach(function (a) {
                                return a.pause();
                              }),
                              this
                            );
                          },
                        },
                        {
                          key: 'resume',
                          value: function () {
                            return (
                              k(this, P).forEach(function (a) {
                                return a.resume();
                              }),
                              this
                            );
                          },
                        },
                        {
                          key: 'stop',
                          value: function (a) {
                            return (
                              k(this, P).forEach(function (b) {
                                return b.stop(a);
                              }),
                              this
                            );
                          },
                        },
                        {
                          key: 'tweenables',
                          get: function () {
                            return i(k(this, P));
                          },
                        },
                        {
                          key: 'promises',
                          get: function () {
                            return k(this, P).map(function (a) {
                              return a._promise;
                            });
                          },
                        },
                      ]) && j(b.prototype, c),
                      d && j(b, d),
                      a
                    );
                  })(),
                  P = new WeakMap(),
                  Q = function (a, b, c, d, e) {
                    var f = (function (a, b, c, d) {
                      return function (e) {
                        return l(e, a, b, c, d, 1);
                      };
                    })(b, c, d, e);
                    return (
                      (f.displayName = a),
                      (f.x1 = b),
                      (f.y1 = c),
                      (f.x2 = d),
                      (f.y2 = e),
                      (p.a.formulas[a] = f)
                    );
                  },
                  R = function (a) {
                    return delete p.a.formulas[a];
                  };
                c.d(b, 'processTweens', function () {
                  return p.c;
                }),
                  c.d(b, 'Tweenable', function () {
                    return p.a;
                  }),
                  c.d(b, 'tween', function () {
                    return p.d;
                  }),
                  c.d(b, 'interpolate', function () {
                    return N;
                  }),
                  c.d(b, 'Scene', function () {
                    return O;
                  }),
                  c.d(b, 'setBezierFunction', function () {
                    return Q;
                  }),
                  c.d(b, 'unsetBezierFunction', function () {
                    return R;
                  }),
                  (p.a.filters.token = m);
              },
            ]);
          });
        },
        {},
      ],
      2: [
        function (a, b, c) {
          var d = a('./shape'),
            e = a('./utils'),
            f = function (a, b) {
              (this._pathTemplate =
                'M 50,50 m 0,-{radius} a {radius},{radius} 0 1 1 0,{2radius} a {radius},{radius} 0 1 1 0,-{2radius}'),
                (this.containerAspectRatio = 1),
                d.apply(this, arguments);
            };
          (f.prototype = new d()),
            (f.prototype.constructor = f),
            (f.prototype._pathString = function (a) {
              var b = a.strokeWidth;
              a.trailWidth &&
                a.trailWidth > a.strokeWidth &&
                (b = a.trailWidth);
              var c = 50 - b / 2;
              return e.render(this._pathTemplate, {
                radius: c,
                '2radius': 2 * c,
              });
            }),
            (f.prototype._trailString = function (a) {
              return this._pathString(a);
            }),
            (b.exports = f);
        },
        { './shape': 7, './utils': 9 },
      ],
      3: [
        function (a, b, c) {
          var d = a('./shape'),
            e = a('./utils'),
            f = function (a, b) {
              (this._pathTemplate = 'M 0,{center} L 100,{center}'),
                d.apply(this, arguments);
            };
          (f.prototype = new d()),
            (f.prototype.constructor = f),
            (f.prototype._initializeSvg = function (a, b) {
              a.setAttribute('viewBox', '0 0 100 ' + b.strokeWidth),
                a.setAttribute('preserveAspectRatio', 'none');
            }),
            (f.prototype._pathString = function (a) {
              return e.render(this._pathTemplate, {
                center: a.strokeWidth / 2,
              });
            }),
            (f.prototype._trailString = function (a) {
              return this._pathString(a);
            }),
            (b.exports = f);
        },
        { './shape': 7, './utils': 9 },
      ],
      4: [
        function (a, b, c) {
          b.exports = {
            Line: a('./line'),
            Circle: a('./circle'),
            SemiCircle: a('./semicircle'),
            Square: a('./square'),
            Path: a('./path'),
            Shape: a('./shape'),
            utils: a('./utils'),
          };
        },
        {
          './circle': 2,
          './line': 3,
          './path': 5,
          './semicircle': 6,
          './shape': 7,
          './square': 8,
          './utils': 9,
        },
      ],
      5: [
        function (a, b, c) {
          var d = a('shifty'),
            e = a('./utils'),
            f = d.Tweenable,
            g = {
              easeIn: 'easeInCubic',
              easeOut: 'easeOutCubic',
              easeInOut: 'easeInOutCubic',
            },
            h = function a(b, c) {
              if (!(this instanceof a))
                throw new Error('Constructor was called without new keyword');
              c = e.extend(
                {
                  delay: 0,
                  duration: 800,
                  easing: 'linear',
                  from: {},
                  to: {},
                  step: function () {},
                },
                c
              );
              var d;
              (d = e.isString(b) ? document.querySelector(b) : b),
                (this.path = d),
                (this._opts = c),
                (this._tweenable = null);
              var f = this.path.getTotalLength();
              (this.path.style.strokeDasharray = f + ' ' + f), this.set(0);
            };
          (h.prototype.value = function () {
            var a = this._getComputedDashOffset(),
              b = this.path.getTotalLength(),
              c = 1 - a / b;
            return parseFloat(c.toFixed(6), 10);
          }),
            (h.prototype.set = function (a) {
              this.stop(),
                (this.path.style.strokeDashoffset = this._progressToOffset(a));
              var b = this._opts.step;
              if (e.isFunction(b)) {
                var c = this._easing(this._opts.easing);
                b(
                  this._calculateTo(a, c),
                  this._opts.shape || this,
                  this._opts.attachment
                );
              }
            }),
            (h.prototype.stop = function () {
              this._stopTween(),
                (this.path.style.strokeDashoffset = this._getComputedDashOffset());
            }),
            (h.prototype.animate = function (a, b, c) {
              (b = b || {}), e.isFunction(b) && ((c = b), (b = {}));
              var d = e.extend({}, b),
                g = e.extend({}, this._opts);
              b = e.extend(g, b);
              var h = this._easing(b.easing),
                i = this._resolveFromAndTo(a, h, d);
              this.stop(), this.path.getBoundingClientRect();
              var j = this._getComputedDashOffset(),
                k = this._progressToOffset(a),
                l = this;
              (this._tweenable = new f()),
                this._tweenable
                  .tween({
                    from: e.extend({ offset: j }, i.from),
                    to: e.extend({ offset: k }, i.to),
                    duration: b.duration,
                    delay: b.delay,
                    easing: h,
                    step: function (a) {
                      l.path.style.strokeDashoffset = a.offset;
                      var c = b.shape || l;
                      b.step(a, c, b.attachment);
                    },
                  })
                  .then(function (a) {
                    e.isFunction(c) && c();
                  });
            }),
            (h.prototype._getComputedDashOffset = function () {
              var a = window.getComputedStyle(this.path, null);
              return parseFloat(a.getPropertyValue('stroke-dashoffset'), 10);
            }),
            (h.prototype._progressToOffset = function (a) {
              var b = this.path.getTotalLength();
              return b - a * b;
            }),
            (h.prototype._resolveFromAndTo = function (a, b, c) {
              return c.from && c.to
                ? { from: c.from, to: c.to }
                : { from: this._calculateFrom(b), to: this._calculateTo(a, b) };
            }),
            (h.prototype._calculateFrom = function (a) {
              return d.interpolate(
                this._opts.from,
                this._opts.to,
                this.value(),
                a
              );
            }),
            (h.prototype._calculateTo = function (a, b) {
              return d.interpolate(this._opts.from, this._opts.to, a, b);
            }),
            (h.prototype._stopTween = function () {
              null !== this._tweenable &&
                (this._tweenable.stop(), (this._tweenable = null));
            }),
            (h.prototype._easing = function (a) {
              return g.hasOwnProperty(a) ? g[a] : a;
            }),
            (b.exports = h);
        },
        { './utils': 9, shifty: 1 },
      ],
      6: [
        function (a, b, c) {
          var d = a('./shape'),
            e = a('./circle'),
            f = a('./utils'),
            g = function (a, b) {
              (this._pathTemplate =
                'M 50,50 m -{radius},0 a {radius},{radius} 0 1 1 {2radius},0'),
                (this.containerAspectRatio = 2),
                d.apply(this, arguments);
            };
          (g.prototype = new d()),
            (g.prototype.constructor = g),
            (g.prototype._initializeSvg = function (a, b) {
              a.setAttribute('viewBox', '0 0 100 50');
            }),
            (g.prototype._initializeTextContainer = function (a, b, c) {
              a.text.style &&
                ((c.style.top = 'auto'),
                (c.style.bottom = '0'),
                a.text.alignToBottom
                  ? f.setStyle(c, 'transform', 'translate(-50%, 0)')
                  : f.setStyle(c, 'transform', 'translate(-50%, 50%)'));
            }),
            (g.prototype._pathString = e.prototype._pathString),
            (g.prototype._trailString = e.prototype._trailString),
            (b.exports = g);
        },
        { './circle': 2, './shape': 7, './utils': 9 },
      ],
      7: [
        function (a, b, c) {
          var d = a('./path'),
            e = a('./utils'),
            f = 'Object is destroyed',
            g = function a(b, c) {
              if (!(this instanceof a))
                throw new Error('Constructor was called without new keyword');
              if (0 !== arguments.length) {
                (this._opts = e.extend(
                  {
                    color: '#555',
                    strokeWidth: 1,
                    trailColor: null,
                    trailWidth: null,
                    fill: null,
                    text: {
                      style: {
                        color: null,
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        padding: 0,
                        margin: 0,
                        transform: {
                          prefix: !0,
                          value: 'translate(-50%, -50%)',
                        },
                      },
                      autoStyleContainer: !0,
                      alignToBottom: !0,
                      value: null,
                      className: 'progressbar-text',
                    },
                    svgStyle: { display: 'block', width: '100%' },
                    warnings: !1,
                  },
                  c,
                  !0
                )),
                  e.isObject(c) &&
                    void 0 !== c.svgStyle &&
                    (this._opts.svgStyle = c.svgStyle),
                  e.isObject(c) &&
                    e.isObject(c.text) &&
                    void 0 !== c.text.style &&
                    (this._opts.text.style = c.text.style);
                var f,
                  g = this._createSvgView(this._opts);
                if (!(f = e.isString(b) ? document.querySelector(b) : b))
                  throw new Error('Container does not exist: ' + b);
                (this._container = f),
                  this._container.appendChild(g.svg),
                  this._opts.warnings &&
                    this._warnContainerAspectRatio(this._container),
                  this._opts.svgStyle &&
                    e.setStyles(g.svg, this._opts.svgStyle),
                  (this.svg = g.svg),
                  (this.path = g.path),
                  (this.trail = g.trail),
                  (this.text = null);
                var h = e.extend(
                  { attachment: void 0, shape: this },
                  this._opts
                );
                (this._progressPath = new d(g.path, h)),
                  e.isObject(this._opts.text) &&
                    null !== this._opts.text.value &&
                    this.setText(this._opts.text.value);
              }
            };
          (g.prototype.animate = function (a, b, c) {
            if (null === this._progressPath) throw new Error(f);
            this._progressPath.animate(a, b, c);
          }),
            (g.prototype.stop = function () {
              if (null === this._progressPath) throw new Error(f);
              void 0 !== this._progressPath && this._progressPath.stop();
            }),
            (g.prototype.pause = function () {
              if (null === this._progressPath) throw new Error(f);
              void 0 !== this._progressPath &&
                this._progressPath._tweenable &&
                this._progressPath._tweenable.pause();
            }),
            (g.prototype.resume = function () {
              if (null === this._progressPath) throw new Error(f);
              void 0 !== this._progressPath &&
                this._progressPath._tweenable &&
                this._progressPath._tweenable.resume();
            }),
            (g.prototype.destroy = function () {
              if (null === this._progressPath) throw new Error(f);
              this.stop(),
                this.svg.parentNode.removeChild(this.svg),
                (this.svg = null),
                (this.path = null),
                (this.trail = null),
                (this._progressPath = null),
                null !== this.text &&
                  (this.text.parentNode.removeChild(this.text),
                  (this.text = null));
            }),
            (g.prototype.set = function (a) {
              if (null === this._progressPath) throw new Error(f);
              this._progressPath.set(a);
            }),
            (g.prototype.value = function () {
              if (null === this._progressPath) throw new Error(f);
              return void 0 === this._progressPath
                ? 0
                : this._progressPath.value();
            }),
            (g.prototype.setText = function (a) {
              if (null === this._progressPath) throw new Error(f);
              null === this.text &&
                ((this.text = this._createTextContainer(
                  this._opts,
                  this._container
                )),
                this._container.appendChild(this.text)),
                e.isObject(a)
                  ? (e.removeChildren(this.text), this.text.appendChild(a))
                  : (this.text.innerHTML = a);
            }),
            (g.prototype._createSvgView = function (a) {
              var b = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'svg'
              );
              this._initializeSvg(b, a);
              var c = null;
              (a.trailColor || a.trailWidth) &&
                ((c = this._createTrail(a)), b.appendChild(c));
              var d = this._createPath(a);
              return b.appendChild(d), { svg: b, path: d, trail: c };
            }),
            (g.prototype._initializeSvg = function (a, b) {
              a.setAttribute('viewBox', '0 0 100 100');
            }),
            (g.prototype._createPath = function (a) {
              var b = this._pathString(a);
              return this._createPathElement(b, a);
            }),
            (g.prototype._createTrail = function (a) {
              var b = this._trailString(a),
                c = e.extend({}, a);
              return (
                c.trailColor || (c.trailColor = '#eee'),
                c.trailWidth || (c.trailWidth = c.strokeWidth),
                (c.color = c.trailColor),
                (c.strokeWidth = c.trailWidth),
                (c.fill = null),
                this._createPathElement(b, c)
              );
            }),
            (g.prototype._createPathElement = function (a, b) {
              var c = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'path'
              );
              return (
                c.setAttribute('d', a),
                c.setAttribute('stroke', b.color),
                c.setAttribute('stroke-width', b.strokeWidth),
                b.fill
                  ? c.setAttribute('fill', b.fill)
                  : c.setAttribute('fill-opacity', '0'),
                c
              );
            }),
            (g.prototype._createTextContainer = function (a, b) {
              var c = document.createElement('div');
              c.className = a.text.className;
              var d = a.text.style;
              return (
                d &&
                  (a.text.autoStyleContainer && (b.style.position = 'relative'),
                  e.setStyles(c, d),
                  d.color || (c.style.color = a.color)),
                this._initializeTextContainer(a, b, c),
                c
              );
            }),
            (g.prototype._initializeTextContainer = function (a, b, c) {}),
            (g.prototype._pathString = function (a) {
              throw new Error('Override this function for each progress bar');
            }),
            (g.prototype._trailString = function (a) {
              throw new Error('Override this function for each progress bar');
            }),
            (g.prototype._warnContainerAspectRatio = function (a) {
              if (this.containerAspectRatio) {
                var b = window.getComputedStyle(a, null),
                  c = parseFloat(b.getPropertyValue('width'), 10),
                  d = parseFloat(b.getPropertyValue('height'), 10);
                e.floatEquals(this.containerAspectRatio, c / d) ||
                  (console.warn(
                    'Incorrect aspect ratio of container',
                    '#' + a.id,
                    'detected:',
                    b.getPropertyValue('width') + '(width)',
                    '/',
                    b.getPropertyValue('height') + '(height)',
                    '=',
                    c / d
                  ),
                  console.warn(
                    'Aspect ratio of should be',
                    this.containerAspectRatio
                  ));
              }
            }),
            (b.exports = g);
        },
        { './path': 5, './utils': 9 },
      ],
      8: [
        function (a, b, c) {
          var d = a('./shape'),
            e = a('./utils'),
            f = function (a, b) {
              (this._pathTemplate =
                'M 0,{halfOfStrokeWidth} L {width},{halfOfStrokeWidth} L {width},{width} L {halfOfStrokeWidth},{width} L {halfOfStrokeWidth},{strokeWidth}'),
                (this._trailTemplate =
                  'M {startMargin},{halfOfStrokeWidth} L {width},{halfOfStrokeWidth} L {width},{width} L {halfOfStrokeWidth},{width} L {halfOfStrokeWidth},{halfOfStrokeWidth}'),
                d.apply(this, arguments);
            };
          (f.prototype = new d()),
            (f.prototype.constructor = f),
            (f.prototype._pathString = function (a) {
              var b = 100 - a.strokeWidth / 2;
              return e.render(this._pathTemplate, {
                width: b,
                strokeWidth: a.strokeWidth,
                halfOfStrokeWidth: a.strokeWidth / 2,
              });
            }),
            (f.prototype._trailString = function (a) {
              var b = 100 - a.strokeWidth / 2;
              return e.render(this._trailTemplate, {
                width: b,
                strokeWidth: a.strokeWidth,
                halfOfStrokeWidth: a.strokeWidth / 2,
                startMargin: a.strokeWidth / 2 - a.trailWidth / 2,
              });
            }),
            (b.exports = f);
        },
        { './shape': 7, './utils': 9 },
      ],
      9: [
        function (a, b, c) {
          function d(a, b, c) {
            (a = a || {}), (b = b || {}), (c = c || !1);
            for (var e in b)
              if (b.hasOwnProperty(e)) {
                var f = a[e],
                  g = b[e];
                c && l(f) && l(g) ? (a[e] = d(f, g, c)) : (a[e] = g);
              }
            return a;
          }
          function e(a, b) {
            var c = a;
            for (var d in b)
              if (b.hasOwnProperty(d)) {
                var e = b[d],
                  f = '\\{' + d + '\\}',
                  g = new RegExp(f, 'g');
                c = c.replace(g, e);
              }
            return c;
          }
          function f(a, b, c) {
            for (var d = a.style, e = 0; e < p.length; ++e) {
              d[p[e] + h(b)] = c;
            }
            d[b] = c;
          }
          function g(a, b) {
            m(b, function (b, c) {
              null !== b &&
                void 0 !== b &&
                (l(b) && !0 === b.prefix ? f(a, c, b.value) : (a.style[c] = b));
            });
          }
          function h(a) {
            return a.charAt(0).toUpperCase() + a.slice(1);
          }
          function i(a) {
            return 'string' == typeof a || a instanceof String;
          }
          function j(a) {
            return 'function' == typeof a;
          }
          function k(a) {
            return '[object Array]' === Object.prototype.toString.call(a);
          }
          function l(a) {
            return !k(a) && 'object' == typeof a && !!a;
          }
          function m(a, b) {
            for (var c in a)
              if (a.hasOwnProperty(c)) {
                var d = a[c];
                b(d, c);
              }
          }
          function n(a, b) {
            return Math.abs(a - b) < q;
          }
          function o(a) {
            for (; a.firstChild; ) a.removeChild(a.firstChild);
          }
          var p = 'Webkit Moz O ms'.split(' '),
            q = 0.001;
          b.exports = {
            extend: d,
            render: e,
            setStyle: f,
            setStyles: g,
            capitalize: h,
            isString: i,
            isFunction: j,
            isObject: l,
            forEachObject: m,
            floatEquals: n,
            removeChildren: o,
          };
        },
        {},
      ],
    },
    {},
    [4]
  )(4);
});
(function ($) {
  'use strict';
  var t = function (t, e, i) {
    (this.toRotate = e),
      (this.el = t),
      (this.loopNum = 0),
      (this.period = parseInt(i, 10) || 2e3),
      (this.txt = ''),
      this.tick(),
      (this.isDeleting = !1);
  };
  (t.prototype.tick = function () {
    var t = this.loopNum % this.toRotate.length,
      e = this.toRotate[t];
    this.isDeleting
      ? (this.txt = e.substring(0, this.txt.length - 1))
      : (this.txt = e.substring(0, this.txt.length + 1)),
      (this.el.innerHTML = '<span class="wrap">' + this.txt + '</span>');
    var i = this,
      s = 200 - 100 * Math.random();
    this.isDeleting && (s /= 6),
      this.isDeleting || this.txt !== e
        ? this.isDeleting &&
          '' === this.txt &&
          ((this.isDeleting = !1), this.loopNum++, (s = 500))
        : ((s = this.period), (this.isDeleting = !0)),
      setTimeout(function () {
        i.tick();
      }, s);
  }),
    (window.onload = function () {
      for (
        var e = document.getElementsByClassName('txt-rotate'), i = 0;
        i < e.length;
        i++
      ) {
        var s = e[i].getAttribute('data-rotate'),
          n = e[i].getAttribute('data-period');
        s && new t(e[i], JSON.parse(s), n);
      }
      var a = document.createElement('style');
      (a.type = 'text/css'),
        (a.innerHTML =
          '.txt-rotate > .wrap { border-right: 0.08em solid rgba(215,205,240,.6); padding-right: 5px }'),
        document.body.appendChild(a);
    }),
    document.addEventListener('swup:contentReplaced', function () {
      for (
        var e = document.getElementsByClassName('txt-rotate'), i = 0;
        i < e.length;
        i++
      ) {
        var s = e[i].getAttribute('data-rotate'),
          n = e[i].getAttribute('data-period');
        s && new t(e[i], JSON.parse(s), n);
      }
      var a = document.createElement('style');
      (a.type = 'text/css'),
        (a.innerHTML =
          '.txt-rotate > .wrap { border-right: 0.08em solid rgba(215,205,240,.6); padding-right: 5px }'),
        document.body.appendChild(a);
    });
})(jQuery);
/*! This file is auto-generated */
/*!
 * imagesLoaded PACKAGED v4.1.4
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */
!(function (e, t) {
  'function' == typeof define && define.amd
    ? define('ev-emitter/ev-emitter', t)
    : 'object' == typeof module && module.exports
    ? (module.exports = t())
    : (e.EvEmitter = t());
})('undefined' != typeof window ? window : this, function () {
  function e() {}
  var t = e.prototype;
  return (
    (t.on = function (e, t) {
      if (e && t) {
        var i = (this._events = this._events || {}),
          n = (i[e] = i[e] || []);
        return n.indexOf(t) == -1 && n.push(t), this;
      }
    }),
    (t.once = function (e, t) {
      if (e && t) {
        this.on(e, t);
        var i = (this._onceEvents = this._onceEvents || {}),
          n = (i[e] = i[e] || {});
        return (n[t] = !0), this;
      }
    }),
    (t.off = function (e, t) {
      var i = this._events && this._events[e];
      if (i && i.length) {
        var n = i.indexOf(t);
        return n != -1 && i.splice(n, 1), this;
      }
    }),
    (t.emitEvent = function (e, t) {
      var i = this._events && this._events[e];
      if (i && i.length) {
        (i = i.slice(0)), (t = t || []);
        for (
          var n = this._onceEvents && this._onceEvents[e], o = 0;
          o < i.length;
          o++
        ) {
          var r = i[o],
            s = n && n[r];
          s && (this.off(e, r), delete n[r]), r.apply(this, t);
        }
        return this;
      }
    }),
    (t.allOff = function () {
      delete this._events, delete this._onceEvents;
    }),
    e
  );
}),
  (function (e, t) {
    'use strict';
    'function' == typeof define && define.amd
      ? define(['ev-emitter/ev-emitter'], function (i) {
          return t(e, i);
        })
      : 'object' == typeof module && module.exports
      ? (module.exports = t(e, require('ev-emitter')))
      : (e.imagesLoaded = t(e, e.EvEmitter));
  })('undefined' != typeof window ? window : this, function (e, t) {
    function i(e, t) {
      for (var i in t) e[i] = t[i];
      return e;
    }
    function n(e) {
      if (Array.isArray(e)) return e;
      var t = 'object' == typeof e && 'number' == typeof e.length;
      return t ? d.call(e) : [e];
    }
    function o(e, t, r) {
      if (!(this instanceof o)) return new o(e, t, r);
      var s = e;
      return (
        'string' == typeof e && (s = document.querySelectorAll(e)),
        s
          ? ((this.elements = n(s)),
            (this.options = i({}, this.options)),
            'function' == typeof t ? (r = t) : i(this.options, t),
            r && this.on('always', r),
            this.getImages(),
            h && (this.jqDeferred = new h.Deferred()),
            void setTimeout(this.check.bind(this)))
          : void a.error('Bad element for imagesLoaded ' + (s || e))
      );
    }
    function r(e) {
      this.img = e;
    }
    function s(e, t) {
      (this.url = e), (this.element = t), (this.img = new Image());
    }
    var h = e.jQuery,
      a = e.console,
      d = Array.prototype.slice;
    (o.prototype = Object.create(t.prototype)),
      (o.prototype.options = {}),
      (o.prototype.getImages = function () {
        (this.images = []), this.elements.forEach(this.addElementImages, this);
      }),
      (o.prototype.addElementImages = function (e) {
        'IMG' == e.nodeName && this.addImage(e),
          this.options.background === !0 && this.addElementBackgroundImages(e);
        var t = e.nodeType;
        if (t && u[t]) {
          for (var i = e.querySelectorAll('img'), n = 0; n < i.length; n++) {
            var o = i[n];
            this.addImage(o);
          }
          if ('string' == typeof this.options.background) {
            var r = e.querySelectorAll(this.options.background);
            for (n = 0; n < r.length; n++) {
              var s = r[n];
              this.addElementBackgroundImages(s);
            }
          }
        }
      });
    var u = { 1: !0, 9: !0, 11: !0 };
    return (
      (o.prototype.addElementBackgroundImages = function (e) {
        var t = getComputedStyle(e);
        if (t)
          for (
            var i = /url\((['"])?(.*?)\1\)/gi, n = i.exec(t.backgroundImage);
            null !== n;

          ) {
            var o = n && n[2];
            o && this.addBackground(o, e), (n = i.exec(t.backgroundImage));
          }
      }),
      (o.prototype.addImage = function (e) {
        var t = new r(e);
        this.images.push(t);
      }),
      (o.prototype.addBackground = function (e, t) {
        var i = new s(e, t);
        this.images.push(i);
      }),
      (o.prototype.check = function () {
        function e(e, i, n) {
          setTimeout(function () {
            t.progress(e, i, n);
          });
        }
        var t = this;
        return (
          (this.progressedCount = 0),
          (this.hasAnyBroken = !1),
          this.images.length
            ? void this.images.forEach(function (t) {
                t.once('progress', e), t.check();
              })
            : void this.complete()
        );
      }),
      (o.prototype.progress = function (e, t, i) {
        this.progressedCount++,
          (this.hasAnyBroken = this.hasAnyBroken || !e.isLoaded),
          this.emitEvent('progress', [this, e, t]),
          this.jqDeferred &&
            this.jqDeferred.notify &&
            this.jqDeferred.notify(this, e),
          this.progressedCount == this.images.length && this.complete(),
          this.options.debug && a && a.log('progress: ' + i, e, t);
      }),
      (o.prototype.complete = function () {
        var e = this.hasAnyBroken ? 'fail' : 'done';
        if (
          ((this.isComplete = !0),
          this.emitEvent(e, [this]),
          this.emitEvent('always', [this]),
          this.jqDeferred)
        ) {
          var t = this.hasAnyBroken ? 'reject' : 'resolve';
          this.jqDeferred[t](this);
        }
      }),
      (r.prototype = Object.create(t.prototype)),
      (r.prototype.check = function () {
        var e = this.getIsImageComplete();
        return e
          ? void this.confirm(0 !== this.img.naturalWidth, 'naturalWidth')
          : ((this.proxyImage = new Image()),
            this.proxyImage.addEventListener('load', this),
            this.proxyImage.addEventListener('error', this),
            this.img.addEventListener('load', this),
            this.img.addEventListener('error', this),
            void (this.proxyImage.src = this.img.src));
      }),
      (r.prototype.getIsImageComplete = function () {
        return this.img.complete && this.img.naturalWidth;
      }),
      (r.prototype.confirm = function (e, t) {
        (this.isLoaded = e), this.emitEvent('progress', [this, this.img, t]);
      }),
      (r.prototype.handleEvent = function (e) {
        var t = 'on' + e.type;
        this[t] && this[t](e);
      }),
      (r.prototype.onload = function () {
        this.confirm(!0, 'onload'), this.unbindEvents();
      }),
      (r.prototype.onerror = function () {
        this.confirm(!1, 'onerror'), this.unbindEvents();
      }),
      (r.prototype.unbindEvents = function () {
        this.proxyImage.removeEventListener('load', this),
          this.proxyImage.removeEventListener('error', this),
          this.img.removeEventListener('load', this),
          this.img.removeEventListener('error', this);
      }),
      (s.prototype = Object.create(r.prototype)),
      (s.prototype.check = function () {
        this.img.addEventListener('load', this),
          this.img.addEventListener('error', this),
          (this.img.src = this.url);
        var e = this.getIsImageComplete();
        e &&
          (this.confirm(0 !== this.img.naturalWidth, 'naturalWidth'),
          this.unbindEvents());
      }),
      (s.prototype.unbindEvents = function () {
        this.img.removeEventListener('load', this),
          this.img.removeEventListener('error', this);
      }),
      (s.prototype.confirm = function (e, t) {
        (this.isLoaded = e),
          this.emitEvent('progress', [this, this.element, t]);
      }),
      (o.makeJQueryPlugin = function (t) {
        (t = t || e.jQuery),
          t &&
            ((h = t),
            (h.fn.imagesLoaded = function (e, t) {
              var i = new o(this, e, t);
              return i.jqDeferred.promise(h(this));
            }));
      }),
      o.makeJQueryPlugin(),
      o
    );
  });
/*!
 * Isotope PACKAGED v3.0.6
 *
 * Licensed GPLv3 for open source use
 * or Isotope Commercial License for commercial use
 *
 * https://isotope.metafizzy.co
 * Copyright 2010-2018 Metafizzy
 */
!(function (t, e) {
  'function' == typeof define && define.amd
    ? define('jquery-bridget/jquery-bridget', ['jquery'], function (i) {
        return e(t, i);
      })
    : 'object' == typeof module && module.exports
    ? (module.exports = e(t, require('jquery')))
    : (t.jQueryBridget = e(t, t.jQuery));
})(window, function (t, e) {
  'use strict';
  function i(i, s, a) {
    function u(t, e, o) {
      var n,
        s = '$().' + i + '("' + e + '")';
      return (
        t.each(function (t, u) {
          var h = a.data(u, i);
          if (!h)
            return void r(
              i + ' not initialized. Cannot call methods, i.e. ' + s
            );
          var d = h[e];
          if (!d || '_' == e.charAt(0))
            return void r(s + ' is not a valid method');
          var l = d.apply(h, o);
          n = void 0 === n ? l : n;
        }),
        void 0 !== n ? n : t
      );
    }
    function h(t, e) {
      t.each(function (t, o) {
        var n = a.data(o, i);
        n ? (n.option(e), n._init()) : ((n = new s(o, e)), a.data(o, i, n));
      });
    }
    (a = a || e || t.jQuery),
      a &&
        (s.prototype.option ||
          (s.prototype.option = function (t) {
            a.isPlainObject(t) &&
              (this.options = a.extend(!0, this.options, t));
          }),
        (a.fn[i] = function (t) {
          if ('string' == typeof t) {
            var e = n.call(arguments, 1);
            return u(this, t, e);
          }
          return h(this, t), this;
        }),
        o(a));
  }
  function o(t) {
    !t || (t && t.bridget) || (t.bridget = i);
  }
  var n = Array.prototype.slice,
    s = t.console,
    r =
      'undefined' == typeof s
        ? function () {}
        : function (t) {
            s.error(t);
          };
  return o(e || t.jQuery), i;
}),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('ev-emitter/ev-emitter', e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e())
      : (t.EvEmitter = e());
  })('undefined' != typeof window ? window : this, function () {
    function t() {}
    var e = t.prototype;
    return (
      (e.on = function (t, e) {
        if (t && e) {
          var i = (this._events = this._events || {}),
            o = (i[t] = i[t] || []);
          return o.indexOf(e) == -1 && o.push(e), this;
        }
      }),
      (e.once = function (t, e) {
        if (t && e) {
          this.on(t, e);
          var i = (this._onceEvents = this._onceEvents || {}),
            o = (i[t] = i[t] || {});
          return (o[e] = !0), this;
        }
      }),
      (e.off = function (t, e) {
        var i = this._events && this._events[t];
        if (i && i.length) {
          var o = i.indexOf(e);
          return o != -1 && i.splice(o, 1), this;
        }
      }),
      (e.emitEvent = function (t, e) {
        var i = this._events && this._events[t];
        if (i && i.length) {
          (i = i.slice(0)), (e = e || []);
          for (
            var o = this._onceEvents && this._onceEvents[t], n = 0;
            n < i.length;
            n++
          ) {
            var s = i[n],
              r = o && o[s];
            r && (this.off(t, s), delete o[s]), s.apply(this, e);
          }
          return this;
        }
      }),
      (e.allOff = function () {
        delete this._events, delete this._onceEvents;
      }),
      t
    );
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('get-size/get-size', e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e())
      : (t.getSize = e());
  })(window, function () {
    'use strict';
    function t(t) {
      var e = parseFloat(t),
        i = t.indexOf('%') == -1 && !isNaN(e);
      return i && e;
    }
    function e() {}
    function i() {
      for (
        var t = {
            width: 0,
            height: 0,
            innerWidth: 0,
            innerHeight: 0,
            outerWidth: 0,
            outerHeight: 0,
          },
          e = 0;
        e < h;
        e++
      ) {
        var i = u[e];
        t[i] = 0;
      }
      return t;
    }
    function o(t) {
      var e = getComputedStyle(t);
      return (
        e ||
          a(
            'Style returned ' +
              e +
              '. Are you running this code in a hidden iframe on Firefox? See https://bit.ly/getsizebug1'
          ),
        e
      );
    }
    function n() {
      if (!d) {
        d = !0;
        var e = document.createElement('div');
        (e.style.width = '200px'),
          (e.style.padding = '1px 2px 3px 4px'),
          (e.style.borderStyle = 'solid'),
          (e.style.borderWidth = '1px 2px 3px 4px'),
          (e.style.boxSizing = 'border-box');
        var i = document.body || document.documentElement;
        i.appendChild(e);
        var n = o(e);
        (r = 200 == Math.round(t(n.width))),
          (s.isBoxSizeOuter = r),
          i.removeChild(e);
      }
    }
    function s(e) {
      if (
        (n(),
        'string' == typeof e && (e = document.querySelector(e)),
        e && 'object' == typeof e && e.nodeType)
      ) {
        var s = o(e);
        if ('none' == s.display) return i();
        var a = {};
        (a.width = e.offsetWidth), (a.height = e.offsetHeight);
        for (
          var d = (a.isBorderBox = 'border-box' == s.boxSizing), l = 0;
          l < h;
          l++
        ) {
          var f = u[l],
            c = s[f],
            m = parseFloat(c);
          a[f] = isNaN(m) ? 0 : m;
        }
        var p = a.paddingLeft + a.paddingRight,
          y = a.paddingTop + a.paddingBottom,
          g = a.marginLeft + a.marginRight,
          v = a.marginTop + a.marginBottom,
          _ = a.borderLeftWidth + a.borderRightWidth,
          z = a.borderTopWidth + a.borderBottomWidth,
          I = d && r,
          x = t(s.width);
        x !== !1 && (a.width = x + (I ? 0 : p + _));
        var S = t(s.height);
        return (
          S !== !1 && (a.height = S + (I ? 0 : y + z)),
          (a.innerWidth = a.width - (p + _)),
          (a.innerHeight = a.height - (y + z)),
          (a.outerWidth = a.width + g),
          (a.outerHeight = a.height + v),
          a
        );
      }
    }
    var r,
      a =
        'undefined' == typeof console
          ? e
          : function (t) {
              console.error(t);
            },
      u = [
        'paddingLeft',
        'paddingRight',
        'paddingTop',
        'paddingBottom',
        'marginLeft',
        'marginRight',
        'marginTop',
        'marginBottom',
        'borderLeftWidth',
        'borderRightWidth',
        'borderTopWidth',
        'borderBottomWidth',
      ],
      h = u.length,
      d = !1;
    return s;
  }),
  (function (t, e) {
    'use strict';
    'function' == typeof define && define.amd
      ? define('desandro-matches-selector/matches-selector', e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e())
      : (t.matchesSelector = e());
  })(window, function () {
    'use strict';
    var t = (function () {
      var t = window.Element.prototype;
      if (t.matches) return 'matches';
      if (t.matchesSelector) return 'matchesSelector';
      for (var e = ['webkit', 'moz', 'ms', 'o'], i = 0; i < e.length; i++) {
        var o = e[i],
          n = o + 'MatchesSelector';
        if (t[n]) return n;
      }
    })();
    return function (e, i) {
      return e[t](i);
    };
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('fizzy-ui-utils/utils', [
          'desandro-matches-selector/matches-selector',
        ], function (i) {
          return e(t, i);
        })
      : 'object' == typeof module && module.exports
      ? (module.exports = e(t, require('desandro-matches-selector')))
      : (t.fizzyUIUtils = e(t, t.matchesSelector));
  })(window, function (t, e) {
    var i = {};
    (i.extend = function (t, e) {
      for (var i in e) t[i] = e[i];
      return t;
    }),
      (i.modulo = function (t, e) {
        return ((t % e) + e) % e;
      });
    var o = Array.prototype.slice;
    (i.makeArray = function (t) {
      if (Array.isArray(t)) return t;
      if (null === t || void 0 === t) return [];
      var e = 'object' == typeof t && 'number' == typeof t.length;
      return e ? o.call(t) : [t];
    }),
      (i.removeFrom = function (t, e) {
        var i = t.indexOf(e);
        i != -1 && t.splice(i, 1);
      }),
      (i.getParent = function (t, i) {
        for (; t.parentNode && t != document.body; )
          if (((t = t.parentNode), e(t, i))) return t;
      }),
      (i.getQueryElement = function (t) {
        return 'string' == typeof t ? document.querySelector(t) : t;
      }),
      (i.handleEvent = function (t) {
        var e = 'on' + t.type;
        this[e] && this[e](t);
      }),
      (i.filterFindElements = function (t, o) {
        t = i.makeArray(t);
        var n = [];
        return (
          t.forEach(function (t) {
            if (t instanceof HTMLElement) {
              if (!o) return void n.push(t);
              e(t, o) && n.push(t);
              for (var i = t.querySelectorAll(o), s = 0; s < i.length; s++)
                n.push(i[s]);
            }
          }),
          n
        );
      }),
      (i.debounceMethod = function (t, e, i) {
        i = i || 100;
        var o = t.prototype[e],
          n = e + 'Timeout';
        t.prototype[e] = function () {
          var t = this[n];
          clearTimeout(t);
          var e = arguments,
            s = this;
          this[n] = setTimeout(function () {
            o.apply(s, e), delete s[n];
          }, i);
        };
      }),
      (i.docReady = function (t) {
        var e = document.readyState;
        'complete' == e || 'interactive' == e
          ? setTimeout(t)
          : document.addEventListener('DOMContentLoaded', t);
      }),
      (i.toDashed = function (t) {
        return t
          .replace(/(.)([A-Z])/g, function (t, e, i) {
            return e + '-' + i;
          })
          .toLowerCase();
      });
    var n = t.console;
    return (
      (i.htmlInit = function (e, o) {
        i.docReady(function () {
          var s = i.toDashed(o),
            r = 'data-' + s,
            a = document.querySelectorAll('[' + r + ']'),
            u = document.querySelectorAll('.js-' + s),
            h = i.makeArray(a).concat(i.makeArray(u)),
            d = r + '-options',
            l = t.jQuery;
          h.forEach(function (t) {
            var i,
              s = t.getAttribute(r) || t.getAttribute(d);
            try {
              i = s && JSON.parse(s);
            } catch (a) {
              return void (
                n &&
                n.error('Error parsing ' + r + ' on ' + t.className + ': ' + a)
              );
            }
            var u = new e(t, i);
            l && l.data(t, o, u);
          });
        });
      }),
      i
    );
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('outlayer/item', [
          'ev-emitter/ev-emitter',
          'get-size/get-size',
        ], e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e(require('ev-emitter'), require('get-size')))
      : ((t.Outlayer = {}), (t.Outlayer.Item = e(t.EvEmitter, t.getSize)));
  })(window, function (t, e) {
    'use strict';
    function i(t) {
      for (var e in t) return !1;
      return (e = null), !0;
    }
    function o(t, e) {
      t &&
        ((this.element = t),
        (this.layout = e),
        (this.position = { x: 0, y: 0 }),
        this._create());
    }
    function n(t) {
      return t.replace(/([A-Z])/g, function (t) {
        return '-' + t.toLowerCase();
      });
    }
    var s = document.documentElement.style,
      r = 'string' == typeof s.transition ? 'transition' : 'WebkitTransition',
      a = 'string' == typeof s.transform ? 'transform' : 'WebkitTransform',
      u = {
        WebkitTransition: 'webkitTransitionEnd',
        transition: 'transitionend',
      }[r],
      h = {
        transform: a,
        transition: r,
        transitionDuration: r + 'Duration',
        transitionProperty: r + 'Property',
        transitionDelay: r + 'Delay',
      },
      d = (o.prototype = Object.create(t.prototype));
    (d.constructor = o),
      (d._create = function () {
        (this._transn = { ingProperties: {}, clean: {}, onEnd: {} }),
          this.css({ position: 'absolute' });
      }),
      (d.handleEvent = function (t) {
        var e = 'on' + t.type;
        this[e] && this[e](t);
      }),
      (d.getSize = function () {
        this.size = e(this.element);
      }),
      (d.css = function (t) {
        var e = this.element.style;
        for (var i in t) {
          var o = h[i] || i;
          e[o] = t[i];
        }
      }),
      (d.getPosition = function () {
        var t = getComputedStyle(this.element),
          e = this.layout._getOption('originLeft'),
          i = this.layout._getOption('originTop'),
          o = t[e ? 'left' : 'right'],
          n = t[i ? 'top' : 'bottom'],
          s = parseFloat(o),
          r = parseFloat(n),
          a = this.layout.size;
        o.indexOf('%') != -1 && (s = (s / 100) * a.width),
          n.indexOf('%') != -1 && (r = (r / 100) * a.height),
          (s = isNaN(s) ? 0 : s),
          (r = isNaN(r) ? 0 : r),
          (s -= e ? a.paddingLeft : a.paddingRight),
          (r -= i ? a.paddingTop : a.paddingBottom),
          (this.position.x = s),
          (this.position.y = r);
      }),
      (d.layoutPosition = function () {
        var t = this.layout.size,
          e = {},
          i = this.layout._getOption('originLeft'),
          o = this.layout._getOption('originTop'),
          n = i ? 'paddingLeft' : 'paddingRight',
          s = i ? 'left' : 'right',
          r = i ? 'right' : 'left',
          a = this.position.x + t[n];
        (e[s] = this.getXValue(a)), (e[r] = '');
        var u = o ? 'paddingTop' : 'paddingBottom',
          h = o ? 'top' : 'bottom',
          d = o ? 'bottom' : 'top',
          l = this.position.y + t[u];
        (e[h] = this.getYValue(l)),
          (e[d] = ''),
          this.css(e),
          this.emitEvent('layout', [this]);
      }),
      (d.getXValue = function (t) {
        var e = this.layout._getOption('horizontal');
        return this.layout.options.percentPosition && !e
          ? (t / this.layout.size.width) * 100 + '%'
          : t + 'px';
      }),
      (d.getYValue = function (t) {
        var e = this.layout._getOption('horizontal');
        return this.layout.options.percentPosition && e
          ? (t / this.layout.size.height) * 100 + '%'
          : t + 'px';
      }),
      (d._transitionTo = function (t, e) {
        this.getPosition();
        var i = this.position.x,
          o = this.position.y,
          n = t == this.position.x && e == this.position.y;
        if ((this.setPosition(t, e), n && !this.isTransitioning))
          return void this.layoutPosition();
        var s = t - i,
          r = e - o,
          a = {};
        (a.transform = this.getTranslate(s, r)),
          this.transition({
            to: a,
            onTransitionEnd: { transform: this.layoutPosition },
            isCleaning: !0,
          });
      }),
      (d.getTranslate = function (t, e) {
        var i = this.layout._getOption('originLeft'),
          o = this.layout._getOption('originTop');
        return (
          (t = i ? t : -t),
          (e = o ? e : -e),
          'translate3d(' + t + 'px, ' + e + 'px, 0)'
        );
      }),
      (d.goTo = function (t, e) {
        this.setPosition(t, e), this.layoutPosition();
      }),
      (d.moveTo = d._transitionTo),
      (d.setPosition = function (t, e) {
        (this.position.x = parseFloat(t)), (this.position.y = parseFloat(e));
      }),
      (d._nonTransition = function (t) {
        this.css(t.to), t.isCleaning && this._removeStyles(t.to);
        for (var e in t.onTransitionEnd) t.onTransitionEnd[e].call(this);
      }),
      (d.transition = function (t) {
        if (!parseFloat(this.layout.options.transitionDuration))
          return void this._nonTransition(t);
        var e = this._transn;
        for (var i in t.onTransitionEnd) e.onEnd[i] = t.onTransitionEnd[i];
        for (i in t.to)
          (e.ingProperties[i] = !0), t.isCleaning && (e.clean[i] = !0);
        if (t.from) {
          this.css(t.from);
          var o = this.element.offsetHeight;
          o = null;
        }
        this.enableTransition(t.to),
          this.css(t.to),
          (this.isTransitioning = !0);
      });
    var l = 'opacity,' + n(a);
    (d.enableTransition = function () {
      if (!this.isTransitioning) {
        var t = this.layout.options.transitionDuration;
        (t = 'number' == typeof t ? t + 'ms' : t),
          this.css({
            transitionProperty: l,
            transitionDuration: t,
            transitionDelay: this.staggerDelay || 0,
          }),
          this.element.addEventListener(u, this, !1);
      }
    }),
      (d.onwebkitTransitionEnd = function (t) {
        this.ontransitionend(t);
      }),
      (d.onotransitionend = function (t) {
        this.ontransitionend(t);
      });
    var f = { '-webkit-transform': 'transform' };
    (d.ontransitionend = function (t) {
      if (t.target === this.element) {
        var e = this._transn,
          o = f[t.propertyName] || t.propertyName;
        if (
          (delete e.ingProperties[o],
          i(e.ingProperties) && this.disableTransition(),
          o in e.clean &&
            ((this.element.style[t.propertyName] = ''), delete e.clean[o]),
          o in e.onEnd)
        ) {
          var n = e.onEnd[o];
          n.call(this), delete e.onEnd[o];
        }
        this.emitEvent('transitionEnd', [this]);
      }
    }),
      (d.disableTransition = function () {
        this.removeTransitionStyles(),
          this.element.removeEventListener(u, this, !1),
          (this.isTransitioning = !1);
      }),
      (d._removeStyles = function (t) {
        var e = {};
        for (var i in t) e[i] = '';
        this.css(e);
      });
    var c = {
      transitionProperty: '',
      transitionDuration: '',
      transitionDelay: '',
    };
    return (
      (d.removeTransitionStyles = function () {
        this.css(c);
      }),
      (d.stagger = function (t) {
        (t = isNaN(t) ? 0 : t), (this.staggerDelay = t + 'ms');
      }),
      (d.removeElem = function () {
        this.element.parentNode.removeChild(this.element),
          this.css({ display: '' }),
          this.emitEvent('remove', [this]);
      }),
      (d.remove = function () {
        return r && parseFloat(this.layout.options.transitionDuration)
          ? (this.once('transitionEnd', function () {
              this.removeElem();
            }),
            void this.hide())
          : void this.removeElem();
      }),
      (d.reveal = function () {
        delete this.isHidden, this.css({ display: '' });
        var t = this.layout.options,
          e = {},
          i = this.getHideRevealTransitionEndProperty('visibleStyle');
        (e[i] = this.onRevealTransitionEnd),
          this.transition({
            from: t.hiddenStyle,
            to: t.visibleStyle,
            isCleaning: !0,
            onTransitionEnd: e,
          });
      }),
      (d.onRevealTransitionEnd = function () {
        this.isHidden || this.emitEvent('reveal');
      }),
      (d.getHideRevealTransitionEndProperty = function (t) {
        var e = this.layout.options[t];
        if (e.opacity) return 'opacity';
        for (var i in e) return i;
      }),
      (d.hide = function () {
        (this.isHidden = !0), this.css({ display: '' });
        var t = this.layout.options,
          e = {},
          i = this.getHideRevealTransitionEndProperty('hiddenStyle');
        (e[i] = this.onHideTransitionEnd),
          this.transition({
            from: t.visibleStyle,
            to: t.hiddenStyle,
            isCleaning: !0,
            onTransitionEnd: e,
          });
      }),
      (d.onHideTransitionEnd = function () {
        this.isHidden &&
          (this.css({ display: 'none' }), this.emitEvent('hide'));
      }),
      (d.destroy = function () {
        this.css({
          position: '',
          left: '',
          right: '',
          top: '',
          bottom: '',
          transition: '',
          transform: '',
        });
      }),
      o
    );
  }),
  (function (t, e) {
    'use strict';
    'function' == typeof define && define.amd
      ? define('outlayer/outlayer', [
          'ev-emitter/ev-emitter',
          'get-size/get-size',
          'fizzy-ui-utils/utils',
          './item',
        ], function (i, o, n, s) {
          return e(t, i, o, n, s);
        })
      : 'object' == typeof module && module.exports
      ? (module.exports = e(
          t,
          require('ev-emitter'),
          require('get-size'),
          require('fizzy-ui-utils'),
          require('./item')
        ))
      : (t.Outlayer = e(
          t,
          t.EvEmitter,
          t.getSize,
          t.fizzyUIUtils,
          t.Outlayer.Item
        ));
  })(window, function (t, e, i, o, n) {
    'use strict';
    function s(t, e) {
      var i = o.getQueryElement(t);
      if (!i)
        return void (
          u &&
          u.error(
            'Bad element for ' + this.constructor.namespace + ': ' + (i || t)
          )
        );
      (this.element = i),
        h && (this.$element = h(this.element)),
        (this.options = o.extend({}, this.constructor.defaults)),
        this.option(e);
      var n = ++l;
      (this.element.outlayerGUID = n), (f[n] = this), this._create();
      var s = this._getOption('initLayout');
      s && this.layout();
    }
    function r(t) {
      function e() {
        t.apply(this, arguments);
      }
      return (
        (e.prototype = Object.create(t.prototype)),
        (e.prototype.constructor = e),
        e
      );
    }
    function a(t) {
      if ('number' == typeof t) return t;
      var e = t.match(/(^\d*\.?\d*)(\w*)/),
        i = e && e[1],
        o = e && e[2];
      if (!i.length) return 0;
      i = parseFloat(i);
      var n = m[o] || 1;
      return i * n;
    }
    var u = t.console,
      h = t.jQuery,
      d = function () {},
      l = 0,
      f = {};
    (s.namespace = 'outlayer'),
      (s.Item = n),
      (s.defaults = {
        containerStyle: { position: 'relative' },
        initLayout: !0,
        originLeft: !0,
        originTop: !0,
        resize: !0,
        resizeContainer: !0,
        transitionDuration: '0.4s',
        hiddenStyle: { opacity: 0, transform: 'scale(0.001)' },
        visibleStyle: { opacity: 1, transform: 'scale(1)' },
      });
    var c = s.prototype;
    o.extend(c, e.prototype),
      (c.option = function (t) {
        o.extend(this.options, t);
      }),
      (c._getOption = function (t) {
        var e = this.constructor.compatOptions[t];
        return e && void 0 !== this.options[e]
          ? this.options[e]
          : this.options[t];
      }),
      (s.compatOptions = {
        initLayout: 'isInitLayout',
        horizontal: 'isHorizontal',
        layoutInstant: 'isLayoutInstant',
        originLeft: 'isOriginLeft',
        originTop: 'isOriginTop',
        resize: 'isResizeBound',
        resizeContainer: 'isResizingContainer',
      }),
      (c._create = function () {
        this.reloadItems(),
          (this.stamps = []),
          this.stamp(this.options.stamp),
          o.extend(this.element.style, this.options.containerStyle);
        var t = this._getOption('resize');
        t && this.bindResize();
      }),
      (c.reloadItems = function () {
        this.items = this._itemize(this.element.children);
      }),
      (c._itemize = function (t) {
        for (
          var e = this._filterFindItemElements(t),
            i = this.constructor.Item,
            o = [],
            n = 0;
          n < e.length;
          n++
        ) {
          var s = e[n],
            r = new i(s, this);
          o.push(r);
        }
        return o;
      }),
      (c._filterFindItemElements = function (t) {
        return o.filterFindElements(t, this.options.itemSelector);
      }),
      (c.getItemElements = function () {
        return this.items.map(function (t) {
          return t.element;
        });
      }),
      (c.layout = function () {
        this._resetLayout(), this._manageStamps();
        var t = this._getOption('layoutInstant'),
          e = void 0 !== t ? t : !this._isLayoutInited;
        this.layoutItems(this.items, e), (this._isLayoutInited = !0);
      }),
      (c._init = c.layout),
      (c._resetLayout = function () {
        this.getSize();
      }),
      (c.getSize = function () {
        this.size = i(this.element);
      }),
      (c._getMeasurement = function (t, e) {
        var o,
          n = this.options[t];
        n
          ? ('string' == typeof n
              ? (o = this.element.querySelector(n))
              : n instanceof HTMLElement && (o = n),
            (this[t] = o ? i(o)[e] : n))
          : (this[t] = 0);
      }),
      (c.layoutItems = function (t, e) {
        (t = this._getItemsForLayout(t)),
          this._layoutItems(t, e),
          this._postLayout();
      }),
      (c._getItemsForLayout = function (t) {
        return t.filter(function (t) {
          return !t.isIgnored;
        });
      }),
      (c._layoutItems = function (t, e) {
        if ((this._emitCompleteOnItems('layout', t), t && t.length)) {
          var i = [];
          t.forEach(function (t) {
            var o = this._getItemLayoutPosition(t);
            (o.item = t), (o.isInstant = e || t.isLayoutInstant), i.push(o);
          }, this),
            this._processLayoutQueue(i);
        }
      }),
      (c._getItemLayoutPosition = function () {
        return { x: 0, y: 0 };
      }),
      (c._processLayoutQueue = function (t) {
        this.updateStagger(),
          t.forEach(function (t, e) {
            this._positionItem(t.item, t.x, t.y, t.isInstant, e);
          }, this);
      }),
      (c.updateStagger = function () {
        var t = this.options.stagger;
        return null === t || void 0 === t
          ? void (this.stagger = 0)
          : ((this.stagger = a(t)), this.stagger);
      }),
      (c._positionItem = function (t, e, i, o, n) {
        o ? t.goTo(e, i) : (t.stagger(n * this.stagger), t.moveTo(e, i));
      }),
      (c._postLayout = function () {
        this.resizeContainer();
      }),
      (c.resizeContainer = function () {
        var t = this._getOption('resizeContainer');
        if (t) {
          var e = this._getContainerSize();
          e &&
            (this._setContainerMeasure(e.width, !0),
            this._setContainerMeasure(e.height, !1));
        }
      }),
      (c._getContainerSize = d),
      (c._setContainerMeasure = function (t, e) {
        if (void 0 !== t) {
          var i = this.size;
          i.isBorderBox &&
            (t += e
              ? i.paddingLeft +
                i.paddingRight +
                i.borderLeftWidth +
                i.borderRightWidth
              : i.paddingBottom +
                i.paddingTop +
                i.borderTopWidth +
                i.borderBottomWidth),
            (t = Math.max(t, 0)),
            (this.element.style[e ? 'width' : 'height'] = t + 'px');
        }
      }),
      (c._emitCompleteOnItems = function (t, e) {
        function i() {
          n.dispatchEvent(t + 'Complete', null, [e]);
        }
        function o() {
          r++, r == s && i();
        }
        var n = this,
          s = e.length;
        if (!e || !s) return void i();
        var r = 0;
        e.forEach(function (e) {
          e.once(t, o);
        });
      }),
      (c.dispatchEvent = function (t, e, i) {
        var o = e ? [e].concat(i) : i;
        if ((this.emitEvent(t, o), h))
          if (((this.$element = this.$element || h(this.element)), e)) {
            var n = h.Event(e);
            (n.type = t), this.$element.trigger(n, i);
          } else this.$element.trigger(t, i);
      }),
      (c.ignore = function (t) {
        var e = this.getItem(t);
        e && (e.isIgnored = !0);
      }),
      (c.unignore = function (t) {
        var e = this.getItem(t);
        e && delete e.isIgnored;
      }),
      (c.stamp = function (t) {
        (t = this._find(t)),
          t &&
            ((this.stamps = this.stamps.concat(t)),
            t.forEach(this.ignore, this));
      }),
      (c.unstamp = function (t) {
        (t = this._find(t)),
          t &&
            t.forEach(function (t) {
              o.removeFrom(this.stamps, t), this.unignore(t);
            }, this);
      }),
      (c._find = function (t) {
        if (t)
          return (
            'string' == typeof t && (t = this.element.querySelectorAll(t)),
            (t = o.makeArray(t))
          );
      }),
      (c._manageStamps = function () {
        this.stamps &&
          this.stamps.length &&
          (this._getBoundingRect(),
          this.stamps.forEach(this._manageStamp, this));
      }),
      (c._getBoundingRect = function () {
        var t = this.element.getBoundingClientRect(),
          e = this.size;
        this._boundingRect = {
          left: t.left + e.paddingLeft + e.borderLeftWidth,
          top: t.top + e.paddingTop + e.borderTopWidth,
          right: t.right - (e.paddingRight + e.borderRightWidth),
          bottom: t.bottom - (e.paddingBottom + e.borderBottomWidth),
        };
      }),
      (c._manageStamp = d),
      (c._getElementOffset = function (t) {
        var e = t.getBoundingClientRect(),
          o = this._boundingRect,
          n = i(t),
          s = {
            left: e.left - o.left - n.marginLeft,
            top: e.top - o.top - n.marginTop,
            right: o.right - e.right - n.marginRight,
            bottom: o.bottom - e.bottom - n.marginBottom,
          };
        return s;
      }),
      (c.handleEvent = o.handleEvent),
      (c.bindResize = function () {
        t.addEventListener('resize', this), (this.isResizeBound = !0);
      }),
      (c.unbindResize = function () {
        t.removeEventListener('resize', this), (this.isResizeBound = !1);
      }),
      (c.onresize = function () {
        this.resize();
      }),
      o.debounceMethod(s, 'onresize', 100),
      (c.resize = function () {
        this.isResizeBound && this.needsResizeLayout() && this.layout();
      }),
      (c.needsResizeLayout = function () {
        var t = i(this.element),
          e = this.size && t;
        return e && t.innerWidth !== this.size.innerWidth;
      }),
      (c.addItems = function (t) {
        var e = this._itemize(t);
        return e.length && (this.items = this.items.concat(e)), e;
      }),
      (c.appended = function (t) {
        var e = this.addItems(t);
        e.length && (this.layoutItems(e, !0), this.reveal(e));
      }),
      (c.prepended = function (t) {
        var e = this._itemize(t);
        if (e.length) {
          var i = this.items.slice(0);
          (this.items = e.concat(i)),
            this._resetLayout(),
            this._manageStamps(),
            this.layoutItems(e, !0),
            this.reveal(e),
            this.layoutItems(i);
        }
      }),
      (c.reveal = function (t) {
        if ((this._emitCompleteOnItems('reveal', t), t && t.length)) {
          var e = this.updateStagger();
          t.forEach(function (t, i) {
            t.stagger(i * e), t.reveal();
          });
        }
      }),
      (c.hide = function (t) {
        if ((this._emitCompleteOnItems('hide', t), t && t.length)) {
          var e = this.updateStagger();
          t.forEach(function (t, i) {
            t.stagger(i * e), t.hide();
          });
        }
      }),
      (c.revealItemElements = function (t) {
        var e = this.getItems(t);
        this.reveal(e);
      }),
      (c.hideItemElements = function (t) {
        var e = this.getItems(t);
        this.hide(e);
      }),
      (c.getItem = function (t) {
        for (var e = 0; e < this.items.length; e++) {
          var i = this.items[e];
          if (i.element == t) return i;
        }
      }),
      (c.getItems = function (t) {
        t = o.makeArray(t);
        var e = [];
        return (
          t.forEach(function (t) {
            var i = this.getItem(t);
            i && e.push(i);
          }, this),
          e
        );
      }),
      (c.remove = function (t) {
        var e = this.getItems(t);
        this._emitCompleteOnItems('remove', e),
          e &&
            e.length &&
            e.forEach(function (t) {
              t.remove(), o.removeFrom(this.items, t);
            }, this);
      }),
      (c.destroy = function () {
        var t = this.element.style;
        (t.height = ''),
          (t.position = ''),
          (t.width = ''),
          this.items.forEach(function (t) {
            t.destroy();
          }),
          this.unbindResize();
        var e = this.element.outlayerGUID;
        delete f[e],
          delete this.element.outlayerGUID,
          h && h.removeData(this.element, this.constructor.namespace);
      }),
      (s.data = function (t) {
        t = o.getQueryElement(t);
        var e = t && t.outlayerGUID;
        return e && f[e];
      }),
      (s.create = function (t, e) {
        var i = r(s);
        return (
          (i.defaults = o.extend({}, s.defaults)),
          o.extend(i.defaults, e),
          (i.compatOptions = o.extend({}, s.compatOptions)),
          (i.namespace = t),
          (i.data = s.data),
          (i.Item = r(n)),
          o.htmlInit(i, t),
          h && h.bridget && h.bridget(t, i),
          i
        );
      });
    var m = { ms: 1, s: 1e3 };
    return (s.Item = n), s;
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('isotope-layout/js/item', ['outlayer/outlayer'], e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e(require('outlayer')))
      : ((t.Isotope = t.Isotope || {}), (t.Isotope.Item = e(t.Outlayer)));
  })(window, function (t) {
    'use strict';
    function e() {
      t.Item.apply(this, arguments);
    }
    var i = (e.prototype = Object.create(t.Item.prototype)),
      o = i._create;
    (i._create = function () {
      (this.id = this.layout.itemGUID++), o.call(this), (this.sortData = {});
    }),
      (i.updateSortData = function () {
        if (!this.isIgnored) {
          (this.sortData.id = this.id),
            (this.sortData['original-order'] = this.id),
            (this.sortData.random = Math.random());
          var t = this.layout.options.getSortData,
            e = this.layout._sorters;
          for (var i in t) {
            var o = e[i];
            this.sortData[i] = o(this.element, this);
          }
        }
      });
    var n = i.destroy;
    return (
      (i.destroy = function () {
        n.apply(this, arguments), this.css({ display: '' });
      }),
      e
    );
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('isotope-layout/js/layout-mode', [
          'get-size/get-size',
          'outlayer/outlayer',
        ], e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e(require('get-size'), require('outlayer')))
      : ((t.Isotope = t.Isotope || {}),
        (t.Isotope.LayoutMode = e(t.getSize, t.Outlayer)));
  })(window, function (t, e) {
    'use strict';
    function i(t) {
      (this.isotope = t),
        t &&
          ((this.options = t.options[this.namespace]),
          (this.element = t.element),
          (this.items = t.filteredItems),
          (this.size = t.size));
    }
    var o = i.prototype,
      n = [
        '_resetLayout',
        '_getItemLayoutPosition',
        '_manageStamp',
        '_getContainerSize',
        '_getElementOffset',
        'needsResizeLayout',
        '_getOption',
      ];
    return (
      n.forEach(function (t) {
        o[t] = function () {
          return e.prototype[t].apply(this.isotope, arguments);
        };
      }),
      (o.needsVerticalResizeLayout = function () {
        var e = t(this.isotope.element),
          i = this.isotope.size && e;
        return i && e.innerHeight != this.isotope.size.innerHeight;
      }),
      (o._getMeasurement = function () {
        this.isotope._getMeasurement.apply(this, arguments);
      }),
      (o.getColumnWidth = function () {
        this.getSegmentSize('column', 'Width');
      }),
      (o.getRowHeight = function () {
        this.getSegmentSize('row', 'Height');
      }),
      (o.getSegmentSize = function (t, e) {
        var i = t + e,
          o = 'outer' + e;
        if ((this._getMeasurement(i, o), !this[i])) {
          var n = this.getFirstItemSize();
          this[i] = (n && n[o]) || this.isotope.size['inner' + e];
        }
      }),
      (o.getFirstItemSize = function () {
        var e = this.isotope.filteredItems[0];
        return e && e.element && t(e.element);
      }),
      (o.layout = function () {
        this.isotope.layout.apply(this.isotope, arguments);
      }),
      (o.getSize = function () {
        this.isotope.getSize(), (this.size = this.isotope.size);
      }),
      (i.modes = {}),
      (i.create = function (t, e) {
        function n() {
          i.apply(this, arguments);
        }
        return (
          (n.prototype = Object.create(o)),
          (n.prototype.constructor = n),
          e && (n.options = e),
          (n.prototype.namespace = t),
          (i.modes[t] = n),
          n
        );
      }),
      i
    );
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('masonry-layout/masonry', [
          'outlayer/outlayer',
          'get-size/get-size',
        ], e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e(require('outlayer'), require('get-size')))
      : (t.Masonry = e(t.Outlayer, t.getSize));
  })(window, function (t, e) {
    var i = t.create('masonry');
    i.compatOptions.fitWidth = 'isFitWidth';
    var o = i.prototype;
    return (
      (o._resetLayout = function () {
        this.getSize(),
          this._getMeasurement('columnWidth', 'outerWidth'),
          this._getMeasurement('gutter', 'outerWidth'),
          this.measureColumns(),
          (this.colYs = []);
        for (var t = 0; t < this.cols; t++) this.colYs.push(0);
        (this.maxY = 0), (this.horizontalColIndex = 0);
      }),
      (o.measureColumns = function () {
        if ((this.getContainerWidth(), !this.columnWidth)) {
          var t = this.items[0],
            i = t && t.element;
          this.columnWidth = (i && e(i).outerWidth) || this.containerWidth;
        }
        var o = (this.columnWidth += this.gutter),
          n = this.containerWidth + this.gutter,
          s = n / o,
          r = o - (n % o),
          a = r && r < 1 ? 'round' : 'floor';
        (s = Math[a](s)), (this.cols = Math.max(s, 1));
      }),
      (o.getContainerWidth = function () {
        var t = this._getOption('fitWidth'),
          i = t ? this.element.parentNode : this.element,
          o = e(i);
        this.containerWidth = o && o.innerWidth;
      }),
      (o._getItemLayoutPosition = function (t) {
        t.getSize();
        var e = t.size.outerWidth % this.columnWidth,
          i = e && e < 1 ? 'round' : 'ceil',
          o = Math[i](t.size.outerWidth / this.columnWidth);
        o = Math.min(o, this.cols);
        for (
          var n = this.options.horizontalOrder
              ? '_getHorizontalColPosition'
              : '_getTopColPosition',
            s = this[n](o, t),
            r = { x: this.columnWidth * s.col, y: s.y },
            a = s.y + t.size.outerHeight,
            u = o + s.col,
            h = s.col;
          h < u;
          h++
        )
          this.colYs[h] = a;
        return r;
      }),
      (o._getTopColPosition = function (t) {
        var e = this._getTopColGroup(t),
          i = Math.min.apply(Math, e);
        return { col: e.indexOf(i), y: i };
      }),
      (o._getTopColGroup = function (t) {
        if (t < 2) return this.colYs;
        for (var e = [], i = this.cols + 1 - t, o = 0; o < i; o++)
          e[o] = this._getColGroupY(o, t);
        return e;
      }),
      (o._getColGroupY = function (t, e) {
        if (e < 2) return this.colYs[t];
        var i = this.colYs.slice(t, t + e);
        return Math.max.apply(Math, i);
      }),
      (o._getHorizontalColPosition = function (t, e) {
        var i = this.horizontalColIndex % this.cols,
          o = t > 1 && i + t > this.cols;
        i = o ? 0 : i;
        var n = e.size.outerWidth && e.size.outerHeight;
        return (
          (this.horizontalColIndex = n ? i + t : this.horizontalColIndex),
          { col: i, y: this._getColGroupY(i, t) }
        );
      }),
      (o._manageStamp = function (t) {
        var i = e(t),
          o = this._getElementOffset(t),
          n = this._getOption('originLeft'),
          s = n ? o.left : o.right,
          r = s + i.outerWidth,
          a = Math.floor(s / this.columnWidth);
        a = Math.max(0, a);
        var u = Math.floor(r / this.columnWidth);
        (u -= r % this.columnWidth ? 0 : 1), (u = Math.min(this.cols - 1, u));
        for (
          var h = this._getOption('originTop'),
            d = (h ? o.top : o.bottom) + i.outerHeight,
            l = a;
          l <= u;
          l++
        )
          this.colYs[l] = Math.max(d, this.colYs[l]);
      }),
      (o._getContainerSize = function () {
        this.maxY = Math.max.apply(Math, this.colYs);
        var t = { height: this.maxY };
        return (
          this._getOption('fitWidth') &&
            (t.width = this._getContainerFitWidth()),
          t
        );
      }),
      (o._getContainerFitWidth = function () {
        for (var t = 0, e = this.cols; --e && 0 === this.colYs[e]; ) t++;
        return (this.cols - t) * this.columnWidth - this.gutter;
      }),
      (o.needsResizeLayout = function () {
        var t = this.containerWidth;
        return this.getContainerWidth(), t != this.containerWidth;
      }),
      i
    );
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('isotope-layout/js/layout-modes/masonry', [
          '../layout-mode',
          'masonry-layout/masonry',
        ], e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e(
          require('../layout-mode'),
          require('masonry-layout')
        ))
      : e(t.Isotope.LayoutMode, t.Masonry);
  })(window, function (t, e) {
    'use strict';
    var i = t.create('masonry'),
      o = i.prototype,
      n = { _getElementOffset: !0, layout: !0, _getMeasurement: !0 };
    for (var s in e.prototype) n[s] || (o[s] = e.prototype[s]);
    var r = o.measureColumns;
    o.measureColumns = function () {
      (this.items = this.isotope.filteredItems), r.call(this);
    };
    var a = o._getOption;
    return (
      (o._getOption = function (t) {
        return 'fitWidth' == t
          ? void 0 !== this.options.isFitWidth
            ? this.options.isFitWidth
            : this.options.fitWidth
          : a.apply(this.isotope, arguments);
      }),
      i
    );
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('isotope-layout/js/layout-modes/fit-rows', ['../layout-mode'], e)
      : 'object' == typeof exports
      ? (module.exports = e(require('../layout-mode')))
      : e(t.Isotope.LayoutMode);
  })(window, function (t) {
    'use strict';
    var e = t.create('fitRows'),
      i = e.prototype;
    return (
      (i._resetLayout = function () {
        (this.x = 0),
          (this.y = 0),
          (this.maxY = 0),
          this._getMeasurement('gutter', 'outerWidth');
      }),
      (i._getItemLayoutPosition = function (t) {
        t.getSize();
        var e = t.size.outerWidth + this.gutter,
          i = this.isotope.size.innerWidth + this.gutter;
        0 !== this.x && e + this.x > i && ((this.x = 0), (this.y = this.maxY));
        var o = { x: this.x, y: this.y };
        return (
          (this.maxY = Math.max(this.maxY, this.y + t.size.outerHeight)),
          (this.x += e),
          o
        );
      }),
      (i._getContainerSize = function () {
        return { height: this.maxY };
      }),
      e
    );
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define('isotope-layout/js/layout-modes/vertical', ['../layout-mode'], e)
      : 'object' == typeof module && module.exports
      ? (module.exports = e(require('../layout-mode')))
      : e(t.Isotope.LayoutMode);
  })(window, function (t) {
    'use strict';
    var e = t.create('vertical', { horizontalAlignment: 0 }),
      i = e.prototype;
    return (
      (i._resetLayout = function () {
        this.y = 0;
      }),
      (i._getItemLayoutPosition = function (t) {
        t.getSize();
        var e =
            (this.isotope.size.innerWidth - t.size.outerWidth) *
            this.options.horizontalAlignment,
          i = this.y;
        return (this.y += t.size.outerHeight), { x: e, y: i };
      }),
      (i._getContainerSize = function () {
        return { height: this.y };
      }),
      e
    );
  }),
  (function (t, e) {
    'function' == typeof define && define.amd
      ? define([
          'outlayer/outlayer',
          'get-size/get-size',
          'desandro-matches-selector/matches-selector',
          'fizzy-ui-utils/utils',
          'isotope-layout/js/item',
          'isotope-layout/js/layout-mode',
          'isotope-layout/js/layout-modes/masonry',
          'isotope-layout/js/layout-modes/fit-rows',
          'isotope-layout/js/layout-modes/vertical',
        ], function (i, o, n, s, r, a) {
          return e(t, i, o, n, s, r, a);
        })
      : 'object' == typeof module && module.exports
      ? (module.exports = e(
          t,
          require('outlayer'),
          require('get-size'),
          require('desandro-matches-selector'),
          require('fizzy-ui-utils'),
          require('isotope-layout/js/item'),
          require('isotope-layout/js/layout-mode'),
          require('isotope-layout/js/layout-modes/masonry'),
          require('isotope-layout/js/layout-modes/fit-rows'),
          require('isotope-layout/js/layout-modes/vertical')
        ))
      : (t.Isotope = e(
          t,
          t.Outlayer,
          t.getSize,
          t.matchesSelector,
          t.fizzyUIUtils,
          t.Isotope.Item,
          t.Isotope.LayoutMode
        ));
  })(window, function (t, e, i, o, n, s, r) {
    function a(t, e) {
      return function (i, o) {
        for (var n = 0; n < t.length; n++) {
          var s = t[n],
            r = i.sortData[s],
            a = o.sortData[s];
          if (r > a || r < a) {
            var u = void 0 !== e[s] ? e[s] : e,
              h = u ? 1 : -1;
            return (r > a ? 1 : -1) * h;
          }
        }
        return 0;
      };
    }
    var u = t.jQuery,
      h = String.prototype.trim
        ? function (t) {
            return t.trim();
          }
        : function (t) {
            return t.replace(/^\s+|\s+$/g, '');
          },
      d = e.create('isotope', {
        layoutMode: 'masonry',
        isJQueryFiltering: !0,
        sortAscending: !0,
      });
    (d.Item = s), (d.LayoutMode = r);
    var l = d.prototype;
    (l._create = function () {
      (this.itemGUID = 0),
        (this._sorters = {}),
        this._getSorters(),
        e.prototype._create.call(this),
        (this.modes = {}),
        (this.filteredItems = this.items),
        (this.sortHistory = ['original-order']);
      for (var t in r.modes) this._initLayoutMode(t);
    }),
      (l.reloadItems = function () {
        (this.itemGUID = 0), e.prototype.reloadItems.call(this);
      }),
      (l._itemize = function () {
        for (
          var t = e.prototype._itemize.apply(this, arguments), i = 0;
          i < t.length;
          i++
        ) {
          var o = t[i];
          o.id = this.itemGUID++;
        }
        return this._updateItemsSortData(t), t;
      }),
      (l._initLayoutMode = function (t) {
        var e = r.modes[t],
          i = this.options[t] || {};
        (this.options[t] = e.options ? n.extend(e.options, i) : i),
          (this.modes[t] = new e(this));
      }),
      (l.layout = function () {
        return !this._isLayoutInited && this._getOption('initLayout')
          ? void this.arrange()
          : void this._layout();
      }),
      (l._layout = function () {
        var t = this._getIsInstant();
        this._resetLayout(),
          this._manageStamps(),
          this.layoutItems(this.filteredItems, t),
          (this._isLayoutInited = !0);
      }),
      (l.arrange = function (t) {
        this.option(t), this._getIsInstant();
        var e = this._filter(this.items);
        (this.filteredItems = e.matches),
          this._bindArrangeComplete(),
          this._isInstant
            ? this._noTransition(this._hideReveal, [e])
            : this._hideReveal(e),
          this._sort(),
          this._layout();
      }),
      (l._init = l.arrange),
      (l._hideReveal = function (t) {
        this.reveal(t.needReveal), this.hide(t.needHide);
      }),
      (l._getIsInstant = function () {
        var t = this._getOption('layoutInstant'),
          e = void 0 !== t ? t : !this._isLayoutInited;
        return (this._isInstant = e), e;
      }),
      (l._bindArrangeComplete = function () {
        function t() {
          e &&
            i &&
            o &&
            n.dispatchEvent('arrangeComplete', null, [n.filteredItems]);
        }
        var e,
          i,
          o,
          n = this;
        this.once('layoutComplete', function () {
          (e = !0), t();
        }),
          this.once('hideComplete', function () {
            (i = !0), t();
          }),
          this.once('revealComplete', function () {
            (o = !0), t();
          });
      }),
      (l._filter = function (t) {
        var e = this.options.filter;
        e = e || '*';
        for (
          var i = [], o = [], n = [], s = this._getFilterTest(e), r = 0;
          r < t.length;
          r++
        ) {
          var a = t[r];
          if (!a.isIgnored) {
            var u = s(a);
            u && i.push(a),
              u && a.isHidden ? o.push(a) : u || a.isHidden || n.push(a);
          }
        }
        return { matches: i, needReveal: o, needHide: n };
      }),
      (l._getFilterTest = function (t) {
        return u && this.options.isJQueryFiltering
          ? function (e) {
              return u(e.element).is(t);
            }
          : 'function' == typeof t
          ? function (e) {
              return t(e.element);
            }
          : function (e) {
              return o(e.element, t);
            };
      }),
      (l.updateSortData = function (t) {
        var e;
        t ? ((t = n.makeArray(t)), (e = this.getItems(t))) : (e = this.items),
          this._getSorters(),
          this._updateItemsSortData(e);
      }),
      (l._getSorters = function () {
        var t = this.options.getSortData;
        for (var e in t) {
          var i = t[e];
          this._sorters[e] = f(i);
        }
      }),
      (l._updateItemsSortData = function (t) {
        for (var e = t && t.length, i = 0; e && i < e; i++) {
          var o = t[i];
          o.updateSortData();
        }
      });
    var f = (function () {
      function t(t) {
        if ('string' != typeof t) return t;
        var i = h(t).split(' '),
          o = i[0],
          n = o.match(/^\[(.+)\]$/),
          s = n && n[1],
          r = e(s, o),
          a = d.sortDataParsers[i[1]];
        return (t = a
          ? function (t) {
              return t && a(r(t));
            }
          : function (t) {
              return t && r(t);
            });
      }
      function e(t, e) {
        return t
          ? function (e) {
              return e.getAttribute(t);
            }
          : function (t) {
              var i = t.querySelector(e);
              return i && i.textContent;
            };
      }
      return t;
    })();
    (d.sortDataParsers = {
      parseInt: function (t) {
        return parseInt(t, 10);
      },
      parseFloat: function (t) {
        return parseFloat(t);
      },
    }),
      (l._sort = function () {
        if (this.options.sortBy) {
          var t = n.makeArray(this.options.sortBy);
          this._getIsSameSortBy(t) ||
            (this.sortHistory = t.concat(this.sortHistory));
          var e = a(this.sortHistory, this.options.sortAscending);
          this.filteredItems.sort(e);
        }
      }),
      (l._getIsSameSortBy = function (t) {
        for (var e = 0; e < t.length; e++)
          if (t[e] != this.sortHistory[e]) return !1;
        return !0;
      }),
      (l._mode = function () {
        var t = this.options.layoutMode,
          e = this.modes[t];
        if (!e) throw new Error('No layout mode: ' + t);
        return (e.options = this.options[t]), e;
      }),
      (l._resetLayout = function () {
        e.prototype._resetLayout.call(this), this._mode()._resetLayout();
      }),
      (l._getItemLayoutPosition = function (t) {
        return this._mode()._getItemLayoutPosition(t);
      }),
      (l._manageStamp = function (t) {
        this._mode()._manageStamp(t);
      }),
      (l._getContainerSize = function () {
        return this._mode()._getContainerSize();
      }),
      (l.needsResizeLayout = function () {
        return this._mode().needsResizeLayout();
      }),
      (l.appended = function (t) {
        var e = this.addItems(t);
        if (e.length) {
          var i = this._filterRevealAdded(e);
          this.filteredItems = this.filteredItems.concat(i);
        }
      }),
      (l.prepended = function (t) {
        var e = this._itemize(t);
        if (e.length) {
          this._resetLayout(), this._manageStamps();
          var i = this._filterRevealAdded(e);
          this.layoutItems(this.filteredItems),
            (this.filteredItems = i.concat(this.filteredItems)),
            (this.items = e.concat(this.items));
        }
      }),
      (l._filterRevealAdded = function (t) {
        var e = this._filter(t);
        return (
          this.hide(e.needHide),
          this.reveal(e.matches),
          this.layoutItems(e.matches, !0),
          e.matches
        );
      }),
      (l.insert = function (t) {
        var e = this.addItems(t);
        if (e.length) {
          var i,
            o,
            n = e.length;
          for (i = 0; i < n; i++)
            (o = e[i]), this.element.appendChild(o.element);
          var s = this._filter(e).matches;
          for (i = 0; i < n; i++) e[i].isLayoutInstant = !0;
          for (this.arrange(), i = 0; i < n; i++) delete e[i].isLayoutInstant;
          this.reveal(s);
        }
      });
    var c = l.remove;
    return (
      (l.remove = function (t) {
        t = n.makeArray(t);
        var e = this.getItems(t);
        c.call(this, t);
        for (var i = e && e.length, o = 0; i && o < i; o++) {
          var s = e[o];
          n.removeFrom(this.filteredItems, s);
        }
      }),
      (l.shuffle = function () {
        for (var t = 0; t < this.items.length; t++) {
          var e = this.items[t];
          e.sortData.random = Math.random();
        }
        (this.options.sortBy = 'random'), this._sort(), this._layout();
      }),
      (l._noTransition = function (t, e) {
        var i = this.options.transitionDuration;
        this.options.transitionDuration = 0;
        var o = t.apply(this, e);
        return (this.options.transitionDuration = i), o;
      }),
      (l.getFilteredItemElements = function () {
        return this.filteredItems.map(function (t) {
          return t.element;
        });
      }),
      d
    );
  });
/*! Magnific Popup - v1.1.0 - 2016-02-20
 * http://dimsemenov.com/plugins/magnific-popup/
 * Copyright (c) 2016 Dmitry Semenov; */
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    factory(require('jquery'));
  } else {
    factory(window.jQuery || window.Zepto);
  }
})(function ($) {
  var CLOSE_EVENT = 'Close',
    BEFORE_CLOSE_EVENT = 'BeforeClose',
    AFTER_CLOSE_EVENT = 'AfterClose',
    BEFORE_APPEND_EVENT = 'BeforeAppend',
    MARKUP_PARSE_EVENT = 'MarkupParse',
    OPEN_EVENT = 'Open',
    CHANGE_EVENT = 'Change',
    NS = 'mfp',
    EVENT_NS = '.' + NS,
    READY_CLASS = 'mfp-ready',
    REMOVING_CLASS = 'mfp-removing',
    PREVENT_CLOSE_CLASS = 'mfp-prevent-close';
  var mfp,
    MagnificPopup = function () {},
    _isJQ = !!window.jQuery,
    _prevStatus,
    _window = $(window),
    _document,
    _prevContentType,
    _wrapClasses,
    _currPopupType;
  var _mfpOn = function (name, f) {
      mfp.ev.on(NS + name + EVENT_NS, f);
    },
    _getEl = function (className, appendTo, html, raw) {
      var el = document.createElement('div');
      el.className = 'mfp-' + className;
      if (html) {
        el.innerHTML = html;
      }
      if (!raw) {
        el = $(el);
        if (appendTo) {
          el.appendTo(appendTo);
        }
      } else if (appendTo) {
        appendTo.appendChild(el);
      }
      return el;
    },
    _mfpTrigger = function (e, data) {
      mfp.ev.triggerHandler(NS + e, data);
      if (mfp.st.callbacks) {
        e = e.charAt(0).toLowerCase() + e.slice(1);
        if (mfp.st.callbacks[e]) {
          mfp.st.callbacks[e].apply(mfp, $.isArray(data) ? data : [data]);
        }
      }
    },
    _getCloseBtn = function (type) {
      if (type !== _currPopupType || !mfp.currTemplate.closeBtn) {
        mfp.currTemplate.closeBtn = $(
          mfp.st.closeMarkup.replace('%title%', mfp.st.tClose)
        );
        _currPopupType = type;
      }
      return mfp.currTemplate.closeBtn;
    },
    _checkInstance = function () {
      if (!$.magnificPopup.instance) {
        mfp = new MagnificPopup();
        mfp.init();
        $.magnificPopup.instance = mfp;
      }
    },
    supportsTransitions = function () {
      var s = document.createElement('p').style,
        v = ['ms', 'O', 'Moz', 'Webkit'];
      if (s['transition'] !== undefined) {
        return true;
      }
      while (v.length) {
        if (v.pop() + 'Transition' in s) {
          return true;
        }
      }
      return false;
    };
  MagnificPopup.prototype = {
    constructor: MagnificPopup,
    init: function () {
      var appVersion = navigator.appVersion;
      mfp.isLowIE = mfp.isIE8 = document.all && !document.addEventListener;
      mfp.isAndroid = /android/gi.test(appVersion);
      mfp.isIOS = /iphone|ipad|ipod/gi.test(appVersion);
      mfp.supportsTransition = supportsTransitions();
      mfp.probablyMobile =
        mfp.isAndroid ||
        mfp.isIOS ||
        /(Opera Mini)|Kindle|webOS|BlackBerry|(Opera Mobi)|(Windows Phone)|IEMobile/i.test(
          navigator.userAgent
        );
      _document = $(document);
      mfp.popupsCache = {};
    },
    open: function (data) {
      var i;
      if (data.isObj === false) {
        mfp.items = data.items.toArray();
        mfp.index = 0;
        var items = data.items,
          item;
        for (i = 0; i < items.length; i++) {
          item = items[i];
          if (item.parsed) {
            item = item.el[0];
          }
          if (item === data.el[0]) {
            mfp.index = i;
            break;
          }
        }
      } else {
        mfp.items = $.isArray(data.items) ? data.items : [data.items];
        mfp.index = data.index || 0;
      }
      if (mfp.isOpen) {
        mfp.updateItemHTML();
        return;
      }
      mfp.types = [];
      _wrapClasses = '';
      if (data.mainEl && data.mainEl.length) {
        mfp.ev = data.mainEl.eq(0);
      } else {
        mfp.ev = _document;
      }
      if (data.key) {
        if (!mfp.popupsCache[data.key]) {
          mfp.popupsCache[data.key] = {};
        }
        mfp.currTemplate = mfp.popupsCache[data.key];
      } else {
        mfp.currTemplate = {};
      }
      mfp.st = $.extend(true, {}, $.magnificPopup.defaults, data);
      mfp.fixedContentPos =
        mfp.st.fixedContentPos === 'auto'
          ? !mfp.probablyMobile
          : mfp.st.fixedContentPos;
      if (mfp.st.modal) {
        mfp.st.closeOnContentClick = false;
        mfp.st.closeOnBgClick = false;
        mfp.st.showCloseBtn = false;
        mfp.st.enableEscapeKey = false;
      }
      if (!mfp.bgOverlay) {
        mfp.bgOverlay = _getEl('bg').on('click' + EVENT_NS, function () {
          mfp.close();
        });
        mfp.wrap = _getEl('wrap')
          .attr('tabindex', -1)
          .on('click' + EVENT_NS, function (e) {
            if (mfp._checkIfClose(e.target)) {
              mfp.close();
            }
          });
        mfp.container = _getEl('container', mfp.wrap);
      }
      mfp.contentContainer = _getEl('content');
      if (mfp.st.preloader) {
        mfp.preloader = _getEl('preloader', mfp.container, mfp.st.tLoading);
      }
      var modules = $.magnificPopup.modules;
      for (i = 0; i < modules.length; i++) {
        var n = modules[i];
        n = n.charAt(0).toUpperCase() + n.slice(1);
        mfp['init' + n].call(mfp);
      }
      _mfpTrigger('BeforeOpen');
      if (mfp.st.showCloseBtn) {
        if (!mfp.st.closeBtnInside) {
          mfp.wrap.append(_getCloseBtn());
        } else {
          _mfpOn(MARKUP_PARSE_EVENT, function (e, template, values, item) {
            values.close_replaceWith = _getCloseBtn(item.type);
          });
          _wrapClasses += ' mfp-close-btn-in';
        }
      }
      if (mfp.st.alignTop) {
        _wrapClasses += ' mfp-align-top';
      }
      if (mfp.fixedContentPos) {
        mfp.wrap.css({
          overflow: mfp.st.overflowY,
          overflowX: 'hidden',
          overflowY: mfp.st.overflowY,
        });
      } else {
        mfp.wrap.css({ top: _window.scrollTop(), position: 'absolute' });
      }
      if (
        mfp.st.fixedBgPos === false ||
        (mfp.st.fixedBgPos === 'auto' && !mfp.fixedContentPos)
      ) {
        mfp.bgOverlay.css({ height: _document.height(), position: 'absolute' });
      }
      if (mfp.st.enableEscapeKey) {
        _document.on('keyup' + EVENT_NS, function (e) {
          if (e.keyCode === 27) {
            mfp.close();
          }
        });
      }
      _window.on('resize' + EVENT_NS, function () {
        mfp.updateSize();
      });
      if (!mfp.st.closeOnContentClick) {
        _wrapClasses += ' mfp-auto-cursor';
      }
      if (_wrapClasses) mfp.wrap.addClass(_wrapClasses);
      var windowHeight = (mfp.wH = _window.height());
      var windowStyles = {};
      if (mfp.fixedContentPos) {
        if (mfp._hasScrollBar(windowHeight)) {
          var s = mfp._getScrollbarSize();
          if (s) {
            windowStyles.marginRight = s;
          }
        }
      }
      if (mfp.fixedContentPos) {
        if (!mfp.isIE7) {
          windowStyles.overflow = 'hidden';
        } else {
          $('body, html').css('overflow', 'hidden');
        }
      }
      var classesToadd = mfp.st.mainClass;
      if (mfp.isIE7) {
        classesToadd += ' mfp-ie7';
      }
      if (classesToadd) {
        mfp._addClassToMFP(classesToadd);
      }
      mfp.updateItemHTML();
      _mfpTrigger('BuildControls');
      $('html').css(windowStyles);
      mfp.bgOverlay
        .add(mfp.wrap)
        .prependTo(mfp.st.prependTo || $(document.body));
      mfp._lastFocusedEl = document.activeElement;
      setTimeout(function () {
        if (mfp.content) {
          mfp._addClassToMFP(READY_CLASS);
          mfp._setFocus();
        } else {
          mfp.bgOverlay.addClass(READY_CLASS);
        }
        _document.on('focusin' + EVENT_NS, mfp._onFocusIn);
      }, 16);
      mfp.isOpen = true;
      mfp.updateSize(windowHeight);
      _mfpTrigger(OPEN_EVENT);
      return data;
    },
    close: function () {
      if (!mfp.isOpen) return;
      _mfpTrigger(BEFORE_CLOSE_EVENT);
      mfp.isOpen = false;
      if (mfp.st.removalDelay && !mfp.isLowIE && mfp.supportsTransition) {
        mfp._addClassToMFP(REMOVING_CLASS);
        setTimeout(function () {
          mfp._close();
        }, mfp.st.removalDelay);
      } else {
        mfp._close();
      }
    },
    _close: function () {
      _mfpTrigger(CLOSE_EVENT);
      var classesToRemove = REMOVING_CLASS + ' ' + READY_CLASS + ' ';
      mfp.bgOverlay.detach();
      mfp.wrap.detach();
      mfp.container.empty();
      if (mfp.st.mainClass) {
        classesToRemove += mfp.st.mainClass + ' ';
      }
      mfp._removeClassFromMFP(classesToRemove);
      if (mfp.fixedContentPos) {
        var windowStyles = { marginRight: '' };
        if (mfp.isIE7) {
          $('body, html').css('overflow', '');
        } else {
          windowStyles.overflow = '';
        }
        $('html').css(windowStyles);
      }
      _document.off('keyup' + EVENT_NS + ' focusin' + EVENT_NS);
      mfp.ev.off(EVENT_NS);
      mfp.wrap.attr('class', 'mfp-wrap').removeAttr('style');
      mfp.bgOverlay.attr('class', 'mfp-bg');
      mfp.container.attr('class', 'mfp-container');
      if (
        mfp.st.showCloseBtn &&
        (!mfp.st.closeBtnInside || mfp.currTemplate[mfp.currItem.type] === true)
      ) {
        if (mfp.currTemplate.closeBtn) mfp.currTemplate.closeBtn.detach();
      }
      if (mfp.st.autoFocusLast && mfp._lastFocusedEl) {
        $(mfp._lastFocusedEl).focus();
      }
      mfp.currItem = null;
      mfp.content = null;
      mfp.currTemplate = null;
      mfp.prevHeight = 0;
      _mfpTrigger(AFTER_CLOSE_EVENT);
    },
    updateSize: function (winHeight) {
      if (mfp.isIOS) {
        var zoomLevel =
          document.documentElement.clientWidth / window.innerWidth;
        var height = window.innerHeight * zoomLevel;
        mfp.wrap.css('height', height);
        mfp.wH = height;
      } else {
        mfp.wH = winHeight || _window.height();
      }
      if (!mfp.fixedContentPos) {
        mfp.wrap.css('height', mfp.wH);
      }
      _mfpTrigger('Resize');
    },
    updateItemHTML: function () {
      var item = mfp.items[mfp.index];
      mfp.contentContainer.detach();
      if (mfp.content) mfp.content.detach();
      if (!item.parsed) {
        item = mfp.parseEl(mfp.index);
      }
      var type = item.type;
      _mfpTrigger('BeforeChange', [
        mfp.currItem ? mfp.currItem.type : '',
        type,
      ]);
      mfp.currItem = item;
      if (!mfp.currTemplate[type]) {
        var markup = mfp.st[type] ? mfp.st[type].markup : false;
        _mfpTrigger('FirstMarkupParse', markup);
        if (markup) {
          mfp.currTemplate[type] = $(markup);
        } else {
          mfp.currTemplate[type] = true;
        }
      }
      if (_prevContentType && _prevContentType !== item.type) {
        mfp.container.removeClass('mfp-' + _prevContentType + '-holder');
      }
      var newContent = mfp[
        'get' + type.charAt(0).toUpperCase() + type.slice(1)
      ](item, mfp.currTemplate[type]);
      mfp.appendContent(newContent, type);
      item.preloaded = true;
      _mfpTrigger(CHANGE_EVENT, item);
      _prevContentType = item.type;
      mfp.container.prepend(mfp.contentContainer);
      _mfpTrigger('AfterChange');
    },
    appendContent: function (newContent, type) {
      mfp.content = newContent;
      if (newContent) {
        if (
          mfp.st.showCloseBtn &&
          mfp.st.closeBtnInside &&
          mfp.currTemplate[type] === true
        ) {
          if (!mfp.content.find('.mfp-close').length) {
            mfp.content.append(_getCloseBtn());
          }
        } else {
          mfp.content = newContent;
        }
      } else {
        mfp.content = '';
      }
      _mfpTrigger(BEFORE_APPEND_EVENT);
      mfp.container.addClass('mfp-' + type + '-holder');
      mfp.contentContainer.append(mfp.content);
    },
    parseEl: function (index) {
      var item = mfp.items[index],
        type;
      if (item.tagName) {
        item = { el: $(item) };
      } else {
        type = item.type;
        item = { data: item, src: item.src };
      }
      if (item.el) {
        var types = mfp.types;
        for (var i = 0; i < types.length; i++) {
          if (item.el.hasClass('mfp-' + types[i])) {
            type = types[i];
            break;
          }
        }
        item.src = item.el.attr('data-mfp-src');
        if (!item.src) {
          item.src = item.el.attr('href');
        }
      }
      item.type = type || mfp.st.type || 'inline';
      item.index = index;
      item.parsed = true;
      mfp.items[index] = item;
      _mfpTrigger('ElementParse', item);
      return mfp.items[index];
    },
    addGroup: function (el, options) {
      var eHandler = function (e) {
        e.mfpEl = this;
        mfp._openClick(e, el, options);
      };
      if (!options) {
        options = {};
      }
      var eName = 'click.magnificPopup';
      options.mainEl = el;
      if (options.items) {
        options.isObj = true;
        el.off(eName).on(eName, eHandler);
      } else {
        options.isObj = false;
        if (options.delegate) {
          el.off(eName).on(eName, options.delegate, eHandler);
        } else {
          options.items = el;
          el.off(eName).on(eName, eHandler);
        }
      }
    },
    _openClick: function (e, el, options) {
      var midClick =
        options.midClick !== undefined
          ? options.midClick
          : $.magnificPopup.defaults.midClick;
      if (
        !midClick &&
        (e.which === 2 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)
      ) {
        return;
      }
      var disableOn =
        options.disableOn !== undefined
          ? options.disableOn
          : $.magnificPopup.defaults.disableOn;
      if (disableOn) {
        if ($.isFunction(disableOn)) {
          if (!disableOn.call(mfp)) {
            return true;
          }
        } else {
          if (_window.width() < disableOn) {
            return true;
          }
        }
      }
      if (e.type) {
        e.preventDefault();
        if (mfp.isOpen) {
          e.stopPropagation();
        }
      }
      options.el = $(e.mfpEl);
      if (options.delegate) {
        options.items = el.find(options.delegate);
      }
      mfp.open(options);
    },
    updateStatus: function (status, text) {
      if (mfp.preloader) {
        if (_prevStatus !== status) {
          mfp.container.removeClass('mfp-s-' + _prevStatus);
        }
        if (!text && status === 'loading') {
          text = mfp.st.tLoading;
        }
        var data = { status: status, text: text };
        _mfpTrigger('UpdateStatus', data);
        status = data.status;
        text = data.text;
        mfp.preloader.html(text);
        mfp.preloader.find('a').on('click', function (e) {
          e.stopImmediatePropagation();
        });
        mfp.container.addClass('mfp-s-' + status);
        _prevStatus = status;
      }
    },
    _checkIfClose: function (target) {
      if ($(target).hasClass(PREVENT_CLOSE_CLASS)) {
        return;
      }
      var closeOnContent = mfp.st.closeOnContentClick;
      var closeOnBg = mfp.st.closeOnBgClick;
      if (closeOnContent && closeOnBg) {
        return true;
      } else {
        if (
          !mfp.content ||
          $(target).hasClass('mfp-close') ||
          (mfp.preloader && target === mfp.preloader[0])
        ) {
          return true;
        }
        if (target !== mfp.content[0] && !$.contains(mfp.content[0], target)) {
          if (closeOnBg) {
            if ($.contains(document, target)) {
              return true;
            }
          }
        } else if (closeOnContent) {
          return true;
        }
      }
      return false;
    },
    _addClassToMFP: function (cName) {
      mfp.bgOverlay.addClass(cName);
      mfp.wrap.addClass(cName);
    },
    _removeClassFromMFP: function (cName) {
      this.bgOverlay.removeClass(cName);
      mfp.wrap.removeClass(cName);
    },
    _hasScrollBar: function (winHeight) {
      return (
        (mfp.isIE7 ? _document.height() : document.body.scrollHeight) >
        (winHeight || _window.height())
      );
    },
    _setFocus: function () {
      (mfp.st.focus ? mfp.content.find(mfp.st.focus).eq(0) : mfp.wrap).focus();
    },
    _onFocusIn: function (e) {
      if (e.target !== mfp.wrap[0] && !$.contains(mfp.wrap[0], e.target)) {
        mfp._setFocus();
        return false;
      }
    },
    _parseMarkup: function (template, values, item) {
      var arr;
      if (item.data) {
        values = $.extend(item.data, values);
      }
      _mfpTrigger(MARKUP_PARSE_EVENT, [template, values, item]);
      $.each(values, function (key, value) {
        if (value === undefined || value === false) {
          return true;
        }
        arr = key.split('_');
        if (arr.length > 1) {
          var el = template.find(EVENT_NS + '-' + arr[0]);
          if (el.length > 0) {
            var attr = arr[1];
            if (attr === 'replaceWith') {
              if (el[0] !== value[0]) {
                el.replaceWith(value);
              }
            } else if (attr === 'img') {
              if (el.is('img')) {
                el.attr('src', value);
              } else {
                el.replaceWith(
                  $('<img>').attr('src', value).attr('class', el.attr('class'))
                );
              }
            } else {
              el.attr(arr[1], value);
            }
          }
        } else {
          template.find(EVENT_NS + '-' + key).html(value);
        }
      });
    },
    _getScrollbarSize: function () {
      if (mfp.scrollbarSize === undefined) {
        var scrollDiv = document.createElement('div');
        scrollDiv.style.cssText =
          'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
        document.body.appendChild(scrollDiv);
        mfp.scrollbarSize = scrollDiv.offsetWidth - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
      }
      return mfp.scrollbarSize;
    },
  };
  $.magnificPopup = {
    instance: null,
    proto: MagnificPopup.prototype,
    modules: [],
    open: function (options, index) {
      _checkInstance();
      if (!options) {
        options = {};
      } else {
        options = $.extend(true, {}, options);
      }
      options.isObj = true;
      options.index = index || 0;
      return this.instance.open(options);
    },
    close: function () {
      return $.magnificPopup.instance && $.magnificPopup.instance.close();
    },
    registerModule: function (name, module) {
      if (module.options) {
        $.magnificPopup.defaults[name] = module.options;
      }
      $.extend(this.proto, module.proto);
      this.modules.push(name);
    },
    defaults: {
      disableOn: 0,
      key: null,
      midClick: false,
      mainClass: '',
      preloader: true,
      focus: '',
      closeOnContentClick: false,
      closeOnBgClick: true,
      closeBtnInside: true,
      showCloseBtn: true,
      enableEscapeKey: true,
      modal: false,
      alignTop: false,
      removalDelay: 0,
      prependTo: null,
      fixedContentPos: 'auto',
      fixedBgPos: 'auto',
      overflowY: 'auto',
      closeMarkup:
        '<button title="%title%" type="button" class="mfp-close">&#215;</button>',
      tClose: 'Close (Esc)',
      tLoading: 'Loading...',
      autoFocusLast: true,
    },
  };
  $.fn.magnificPopup = function (options) {
    _checkInstance();
    var jqEl = $(this);
    if (typeof options === 'string') {
      if (options === 'open') {
        var items,
          itemOpts = _isJQ ? jqEl.data('magnificPopup') : jqEl[0].magnificPopup,
          index = parseInt(arguments[1], 10) || 0;
        if (itemOpts.items) {
          items = itemOpts.items[index];
        } else {
          items = jqEl;
          if (itemOpts.delegate) {
            items = items.find(itemOpts.delegate);
          }
          items = items.eq(index);
        }
        mfp._openClick({ mfpEl: items }, jqEl, itemOpts);
      } else {
        if (mfp.isOpen)
          mfp[options].apply(mfp, Array.prototype.slice.call(arguments, 1));
      }
    } else {
      options = $.extend(true, {}, options);
      if (_isJQ) {
        jqEl.data('magnificPopup', options);
      } else {
        jqEl[0].magnificPopup = options;
      }
      mfp.addGroup(jqEl, options);
    }
    return jqEl;
  };
  var INLINE_NS = 'inline',
    _hiddenClass,
    _inlinePlaceholder,
    _lastInlineElement,
    _putInlineElementsBack = function () {
      if (_lastInlineElement) {
        _inlinePlaceholder
          .after(_lastInlineElement.addClass(_hiddenClass))
          .detach();
        _lastInlineElement = null;
      }
    };
  $.magnificPopup.registerModule(INLINE_NS, {
    options: {
      hiddenClass: 'hide',
      markup: '',
      tNotFound: 'Content not found',
    },
    proto: {
      initInline: function () {
        mfp.types.push(INLINE_NS);
        _mfpOn(CLOSE_EVENT + '.' + INLINE_NS, function () {
          _putInlineElementsBack();
        });
      },
      getInline: function (item, template) {
        _putInlineElementsBack();
        if (item.src) {
          var inlineSt = mfp.st.inline,
            el = $(item.src);
          if (el.length) {
            var parent = el[0].parentNode;
            if (parent && parent.tagName) {
              if (!_inlinePlaceholder) {
                _hiddenClass = inlineSt.hiddenClass;
                _inlinePlaceholder = _getEl(_hiddenClass);
                _hiddenClass = 'mfp-' + _hiddenClass;
              }
              _lastInlineElement = el
                .after(_inlinePlaceholder)
                .detach()
                .removeClass(_hiddenClass);
            }
            mfp.updateStatus('ready');
          } else {
            mfp.updateStatus('error', inlineSt.tNotFound);
            el = $('<div>');
          }
          item.inlineElement = el;
          return el;
        }
        mfp.updateStatus('ready');
        mfp._parseMarkup(template, {}, item);
        return template;
      },
    },
  });
  var AJAX_NS = 'ajax',
    _ajaxCur,
    _removeAjaxCursor = function () {
      if (_ajaxCur) {
        $(document.body).removeClass(_ajaxCur);
      }
    },
    _destroyAjaxRequest = function () {
      _removeAjaxCursor();
      if (mfp.req) {
        mfp.req.abort();
      }
    };
  $.magnificPopup.registerModule(AJAX_NS, {
    options: {
      settings: null,
      cursor: 'mfp-ajax-cur',
      tError: '<a href="%url%">The content</a> could not be loaded.',
    },
    proto: {
      initAjax: function () {
        mfp.types.push(AJAX_NS);
        _ajaxCur = mfp.st.ajax.cursor;
        _mfpOn(CLOSE_EVENT + '.' + AJAX_NS, _destroyAjaxRequest);
        _mfpOn('BeforeChange.' + AJAX_NS, _destroyAjaxRequest);
      },
      getAjax: function (item) {
        if (_ajaxCur) {
          $(document.body).addClass(_ajaxCur);
        }
        mfp.updateStatus('loading');
        var opts = $.extend(
          {
            url: item.src,
            success: function (data, textStatus, jqXHR) {
              var temp = { data: data, xhr: jqXHR };
              _mfpTrigger('ParseAjax', temp);
              mfp.appendContent($(temp.data), AJAX_NS);
              item.finished = true;
              _removeAjaxCursor();
              mfp._setFocus();
              setTimeout(function () {
                mfp.wrap.addClass(READY_CLASS);
              }, 16);
              mfp.updateStatus('ready');
              _mfpTrigger('AjaxContentAdded');
            },
            error: function () {
              _removeAjaxCursor();
              item.finished = item.loadError = true;
              mfp.updateStatus(
                'error',
                mfp.st.ajax.tError.replace('%url%', item.src)
              );
            },
          },
          mfp.st.ajax.settings
        );
        mfp.req = $.ajax(opts);
        return '';
      },
    },
  });
  var _imgInterval,
    _getTitle = function (item) {
      if (item.data && item.data.title !== undefined) return item.data.title;
      var src = mfp.st.image.titleSrc;
      if (src) {
        if ($.isFunction(src)) {
          return src.call(mfp, item);
        } else if (item.el) {
          return item.el.attr(src) || '';
        }
      }
      return '';
    };
  $.magnificPopup.registerModule('image', {
    options: {
      markup:
        '<div class="mfp-figure">' +
        '<div class="mfp-close"></div>' +
        '<figure>' +
        '<div class="mfp-img"></div>' +
        '<figcaption>' +
        '<div class="mfp-bottom-bar">' +
        '<div class="mfp-title"></div>' +
        '<div class="mfp-counter"></div>' +
        '</div>' +
        '</figcaption>' +
        '</figure>' +
        '</div>',
      cursor: 'mfp-zoom-out-cur',
      titleSrc: 'title',
      verticalFit: true,
      tError: '<a href="%url%">The image</a> could not be loaded.',
    },
    proto: {
      initImage: function () {
        var imgSt = mfp.st.image,
          ns = '.image';
        mfp.types.push('image');
        _mfpOn(OPEN_EVENT + ns, function () {
          if (mfp.currItem.type === 'image' && imgSt.cursor) {
            $(document.body).addClass(imgSt.cursor);
          }
        });
        _mfpOn(CLOSE_EVENT + ns, function () {
          if (imgSt.cursor) {
            $(document.body).removeClass(imgSt.cursor);
          }
          _window.off('resize' + EVENT_NS);
        });
        _mfpOn('Resize' + ns, mfp.resizeImage);
        if (mfp.isLowIE) {
          _mfpOn('AfterChange', mfp.resizeImage);
        }
      },
      resizeImage: function () {
        var item = mfp.currItem;
        if (!item || !item.img) return;
        if (mfp.st.image.verticalFit) {
          var decr = 0;
          if (mfp.isLowIE) {
            decr =
              parseInt(item.img.css('padding-top'), 10) +
              parseInt(item.img.css('padding-bottom'), 10);
          }
          item.img.css('max-height', mfp.wH - decr);
        }
      },
      _onImageHasSize: function (item) {
        if (item.img) {
          item.hasSize = true;
          if (_imgInterval) {
            clearInterval(_imgInterval);
          }
          item.isCheckingImgSize = false;
          _mfpTrigger('ImageHasSize', item);
          if (item.imgHidden) {
            if (mfp.content) mfp.content.removeClass('mfp-loading');
            item.imgHidden = false;
          }
        }
      },
      findImageSize: function (item) {
        var counter = 0,
          img = item.img[0],
          mfpSetInterval = function (delay) {
            if (_imgInterval) {
              clearInterval(_imgInterval);
            }
            _imgInterval = setInterval(function () {
              if (img.naturalWidth > 0) {
                mfp._onImageHasSize(item);
                return;
              }
              if (counter > 200) {
                clearInterval(_imgInterval);
              }
              counter++;
              if (counter === 3) {
                mfpSetInterval(10);
              } else if (counter === 40) {
                mfpSetInterval(50);
              } else if (counter === 100) {
                mfpSetInterval(500);
              }
            }, delay);
          };
        mfpSetInterval(1);
      },
      getImage: function (item, template) {
        var guard = 0,
          onLoadComplete = function () {
            if (item) {
              if (item.img[0].complete) {
                item.img.off('.mfploader');
                if (item === mfp.currItem) {
                  mfp._onImageHasSize(item);
                  mfp.updateStatus('ready');
                }
                item.hasSize = true;
                item.loaded = true;
                _mfpTrigger('ImageLoadComplete');
              } else {
                guard++;
                if (guard < 200) {
                  setTimeout(onLoadComplete, 100);
                } else {
                  onLoadError();
                }
              }
            }
          },
          onLoadError = function () {
            if (item) {
              item.img.off('.mfploader');
              if (item === mfp.currItem) {
                mfp._onImageHasSize(item);
                mfp.updateStatus(
                  'error',
                  imgSt.tError.replace('%url%', item.src)
                );
              }
              item.hasSize = true;
              item.loaded = true;
              item.loadError = true;
            }
          },
          imgSt = mfp.st.image;
        var el = template.find('.mfp-img');
        if (el.length) {
          var img = document.createElement('img');
          img.className = 'mfp-img';
          if (item.el && item.el.find('img').length) {
            img.alt = item.el.find('img').attr('alt');
          }
          item.img = $(img)
            .on('load.mfploader', onLoadComplete)
            .on('error.mfploader', onLoadError);
          img.src = item.src;
          if (el.is('img')) {
            item.img = item.img.clone();
          }
          img = item.img[0];
          if (img.naturalWidth > 0) {
            item.hasSize = true;
          } else if (!img.width) {
            item.hasSize = false;
          }
        }
        mfp._parseMarkup(
          template,
          { title: _getTitle(item), img_replaceWith: item.img },
          item
        );
        mfp.resizeImage();
        if (item.hasSize) {
          if (_imgInterval) clearInterval(_imgInterval);
          if (item.loadError) {
            template.addClass('mfp-loading');
            mfp.updateStatus('error', imgSt.tError.replace('%url%', item.src));
          } else {
            template.removeClass('mfp-loading');
            mfp.updateStatus('ready');
          }
          return template;
        }
        mfp.updateStatus('loading');
        item.loading = true;
        if (!item.hasSize) {
          item.imgHidden = true;
          template.addClass('mfp-loading');
          mfp.findImageSize(item);
        }
        return template;
      },
    },
  });
  var hasMozTransform,
    getHasMozTransform = function () {
      if (hasMozTransform === undefined) {
        hasMozTransform =
          document.createElement('p').style.MozTransform !== undefined;
      }
      return hasMozTransform;
    };
  $.magnificPopup.registerModule('zoom', {
    options: {
      enabled: false,
      easing: 'ease-in-out',
      duration: 300,
      opener: function (element) {
        return element.is('img') ? element : element.find('img');
      },
    },
    proto: {
      initZoom: function () {
        var zoomSt = mfp.st.zoom,
          ns = '.zoom',
          image;
        if (!zoomSt.enabled || !mfp.supportsTransition) {
          return;
        }
        var duration = zoomSt.duration,
          getElToAnimate = function (image) {
            var newImg = image
                .clone()
                .removeAttr('style')
                .removeAttr('class')
                .addClass('mfp-animated-image'),
              transition =
                'all ' + zoomSt.duration / 1000 + 's ' + zoomSt.easing,
              cssObj = {
                position: 'fixed',
                zIndex: 9999,
                left: 0,
                top: 0,
                '-webkit-backface-visibility': 'hidden',
              },
              t = 'transition';
            cssObj['-webkit-' + t] = cssObj['-moz-' + t] = cssObj[
              '-o-' + t
            ] = cssObj[t] = transition;
            newImg.css(cssObj);
            return newImg;
          },
          showMainContent = function () {
            mfp.content.css('visibility', 'visible');
          },
          openTimeout,
          animatedImg;
        _mfpOn('BuildControls' + ns, function () {
          if (mfp._allowZoom()) {
            clearTimeout(openTimeout);
            mfp.content.css('visibility', 'hidden');
            image = mfp._getItemToZoom();
            if (!image) {
              showMainContent();
              return;
            }
            animatedImg = getElToAnimate(image);
            animatedImg.css(mfp._getOffset());
            mfp.wrap.append(animatedImg);
            openTimeout = setTimeout(function () {
              animatedImg.css(mfp._getOffset(true));
              openTimeout = setTimeout(function () {
                showMainContent();
                setTimeout(function () {
                  animatedImg.remove();
                  image = animatedImg = null;
                  _mfpTrigger('ZoomAnimationEnded');
                }, 16);
              }, duration);
            }, 16);
          }
        });
        _mfpOn(BEFORE_CLOSE_EVENT + ns, function () {
          if (mfp._allowZoom()) {
            clearTimeout(openTimeout);
            mfp.st.removalDelay = duration;
            if (!image) {
              image = mfp._getItemToZoom();
              if (!image) {
                return;
              }
              animatedImg = getElToAnimate(image);
            }
            animatedImg.css(mfp._getOffset(true));
            mfp.wrap.append(animatedImg);
            mfp.content.css('visibility', 'hidden');
            setTimeout(function () {
              animatedImg.css(mfp._getOffset());
            }, 16);
          }
        });
        _mfpOn(CLOSE_EVENT + ns, function () {
          if (mfp._allowZoom()) {
            showMainContent();
            if (animatedImg) {
              animatedImg.remove();
            }
            image = null;
          }
        });
      },
      _allowZoom: function () {
        return mfp.currItem.type === 'image';
      },
      _getItemToZoom: function () {
        if (mfp.currItem.hasSize) {
          return mfp.currItem.img;
        } else {
          return false;
        }
      },
      _getOffset: function (isLarge) {
        var el;
        if (isLarge) {
          el = mfp.currItem.img;
        } else {
          el = mfp.st.zoom.opener(mfp.currItem.el || mfp.currItem);
        }
        var offset = el.offset();
        var paddingTop = parseInt(el.css('padding-top'), 10);
        var paddingBottom = parseInt(el.css('padding-bottom'), 10);
        offset.top -= $(window).scrollTop() - paddingTop;
        var obj = {
          width: el.width(),
          height:
            (_isJQ ? el.innerHeight() : el[0].offsetHeight) -
            paddingBottom -
            paddingTop,
        };
        if (getHasMozTransform()) {
          obj['-moz-transform'] = obj['transform'] =
            'translate(' + offset.left + 'px,' + offset.top + 'px)';
        } else {
          obj.left = offset.left;
          obj.top = offset.top;
        }
        return obj;
      },
    },
  });
  var IFRAME_NS = 'iframe',
    _emptyPage = '//about:blank',
    _fixIframeBugs = function (isShowing) {
      if (mfp.currTemplate[IFRAME_NS]) {
        var el = mfp.currTemplate[IFRAME_NS].find('iframe');
        if (el.length) {
          if (!isShowing) {
            el[0].src = _emptyPage;
          }
          if (mfp.isIE8) {
            el.css('display', isShowing ? 'block' : 'none');
          }
        }
      }
    };
  $.magnificPopup.registerModule(IFRAME_NS, {
    options: {
      markup:
        '<div class="mfp-iframe-scaler">' +
        '<div class="mfp-close"></div>' +
        '<iframe class="mfp-iframe" src="//about:blank" frameborder="0" allowfullscreen></iframe>' +
        '</div>',
      srcAction: 'iframe_src',
      patterns: {
        youtube: {
          index: 'youtube.com',
          id: 'v=',
          src: 'https://www.youtube.com/embed/%id%?autoplay=1',
        },
        vimeo: {
          index: 'vimeo.com/',
          id: '/',
          src: 'https://player.vimeo.com/video/%id%?autoplay=1',
        },
        gmaps: { index: '//maps.google.', src: '%id%&output=embed' },
      },
    },
    proto: {
      initIframe: function () {
        mfp.types.push(IFRAME_NS);
        _mfpOn('BeforeChange', function (e, prevType, newType) {
          if (prevType !== newType) {
            if (prevType === IFRAME_NS) {
              _fixIframeBugs();
            } else if (newType === IFRAME_NS) {
              _fixIframeBugs(true);
            }
          }
        });
        _mfpOn(CLOSE_EVENT + '.' + IFRAME_NS, function () {
          _fixIframeBugs();
        });
      },
      getIframe: function (item, template) {
        var embedSrc = item.src;
        var iframeSt = mfp.st.iframe;
        $.each(iframeSt.patterns, function () {
          if (embedSrc.indexOf(this.index) > -1) {
            if (this.id) {
              if (typeof this.id === 'string') {
                embedSrc = embedSrc.substr(
                  embedSrc.lastIndexOf(this.id) + this.id.length,
                  embedSrc.length
                );
              } else {
                embedSrc = this.id.call(this, embedSrc);
              }
            }
            embedSrc = this.src.replace('%id%', embedSrc);
            return false;
          }
        });
        var dataObj = {};
        if (iframeSt.srcAction) {
          dataObj[iframeSt.srcAction] = embedSrc;
        }
        mfp._parseMarkup(template, dataObj, item);
        mfp.updateStatus('ready');
        return template;
      },
    },
  });
  var _getLoopedId = function (index) {
      var numSlides = mfp.items.length;
      if (index > numSlides - 1) {
        return index - numSlides;
      } else if (index < 0) {
        return numSlides + index;
      }
      return index;
    },
    _replaceCurrTotal = function (text, curr, total) {
      return text.replace(/%curr%/gi, curr + 1).replace(/%total%/gi, total);
    };
  $.magnificPopup.registerModule('gallery', {
    options: {
      enabled: false,
      arrowMarkup:
        '<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"></button>',
      preload: [0, 2],
      navigateByImgClick: true,
      arrows: true,
      tPrev: 'Previous (Left arrow key)',
      tNext: 'Next (Right arrow key)',
      tCounter: '%curr% of %total%',
    },
    proto: {
      initGallery: function () {
        var gSt = mfp.st.gallery,
          ns = '.mfp-gallery';
        mfp.direction = true;
        if (!gSt || !gSt.enabled) return false;
        _wrapClasses += ' mfp-gallery';
        _mfpOn(OPEN_EVENT + ns, function () {
          if (gSt.navigateByImgClick) {
            mfp.wrap.on('click' + ns, '.mfp-img', function () {
              if (mfp.items.length > 1) {
                mfp.next();
                return false;
              }
            });
          }
          _document.on('keydown' + ns, function (e) {
            if (e.keyCode === 37) {
              mfp.prev();
            } else if (e.keyCode === 39) {
              mfp.next();
            }
          });
        });
        _mfpOn('UpdateStatus' + ns, function (e, data) {
          if (data.text) {
            data.text = _replaceCurrTotal(
              data.text,
              mfp.currItem.index,
              mfp.items.length
            );
          }
        });
        _mfpOn(MARKUP_PARSE_EVENT + ns, function (e, element, values, item) {
          var l = mfp.items.length;
          values.counter =
            l > 1 ? _replaceCurrTotal(gSt.tCounter, item.index, l) : '';
        });
        _mfpOn('BuildControls' + ns, function () {
          if (mfp.items.length > 1 && gSt.arrows && !mfp.arrowLeft) {
            var markup = gSt.arrowMarkup,
              arrowLeft = (mfp.arrowLeft = $(
                markup
                  .replace(/%title%/gi, gSt.tPrev)
                  .replace(/%dir%/gi, 'left')
              ).addClass(PREVENT_CLOSE_CLASS)),
              arrowRight = (mfp.arrowRight = $(
                markup
                  .replace(/%title%/gi, gSt.tNext)
                  .replace(/%dir%/gi, 'right')
              ).addClass(PREVENT_CLOSE_CLASS));
            arrowLeft.click(function () {
              mfp.prev();
            });
            arrowRight.click(function () {
              mfp.next();
            });
            mfp.container.append(arrowLeft.add(arrowRight));
          }
        });
        _mfpOn(CHANGE_EVENT + ns, function () {
          if (mfp._preloadTimeout) clearTimeout(mfp._preloadTimeout);
          mfp._preloadTimeout = setTimeout(function () {
            mfp.preloadNearbyImages();
            mfp._preloadTimeout = null;
          }, 16);
        });
        _mfpOn(CLOSE_EVENT + ns, function () {
          _document.off(ns);
          mfp.wrap.off('click' + ns);
          mfp.arrowRight = mfp.arrowLeft = null;
        });
      },
      next: function () {
        mfp.direction = true;
        mfp.index = _getLoopedId(mfp.index + 1);
        mfp.updateItemHTML();
      },
      prev: function () {
        mfp.direction = false;
        mfp.index = _getLoopedId(mfp.index - 1);
        mfp.updateItemHTML();
      },
      goTo: function (newIndex) {
        mfp.direction = newIndex >= mfp.index;
        mfp.index = newIndex;
        mfp.updateItemHTML();
      },
      preloadNearbyImages: function () {
        var p = mfp.st.gallery.preload,
          preloadBefore = Math.min(p[0], mfp.items.length),
          preloadAfter = Math.min(p[1], mfp.items.length),
          i;
        for (i = 1; i <= (mfp.direction ? preloadAfter : preloadBefore); i++) {
          mfp._preloadItem(mfp.index + i);
        }
        for (i = 1; i <= (mfp.direction ? preloadBefore : preloadAfter); i++) {
          mfp._preloadItem(mfp.index - i);
        }
      },
      _preloadItem: function (index) {
        index = _getLoopedId(index);
        if (mfp.items[index].preloaded) {
          return;
        }
        var item = mfp.items[index];
        if (!item.parsed) {
          item = mfp.parseEl(index);
        }
        _mfpTrigger('LazyLoad', item);
        if (item.type === 'image') {
          item.img = $('<img class="mfp-img" />')
            .on('load.mfploader', function () {
              item.hasSize = true;
            })
            .on('error.mfploader', function () {
              item.hasSize = true;
              item.loadError = true;
              _mfpTrigger('LazyLoadError', item);
            })
            .attr('src', item.src);
        }
        item.preloaded = true;
      },
    },
  });
  var RETINA_NS = 'retina';
  $.magnificPopup.registerModule(RETINA_NS, {
    options: {
      replaceSrc: function (item) {
        return item.src.replace(/\.\w+$/, function (m) {
          return '@2x' + m;
        });
      },
      ratio: 1,
    },
    proto: {
      initRetina: function () {
        if (window.devicePixelRatio > 1) {
          var st = mfp.st.retina,
            ratio = st.ratio;
          ratio = !isNaN(ratio) ? ratio : ratio();
          if (ratio > 1) {
            _mfpOn('ImageHasSize' + '.' + RETINA_NS, function (e, item) {
              item.img.css({
                'max-width': item.img[0].naturalWidth / ratio,
                width: '100%',
              });
            });
            _mfpOn('ElementParse' + '.' + RETINA_NS, function (e, item) {
              item.src = st.replaceSrc(item, ratio);
            });
          }
        }
      },
    },
  });
  _checkInstance();
});
(function ($) {
  'use strict';
  $('.data-no-swup > a').attr('data-no-swup', '');
  if (!$('body').hasClass('default--scrolling')) {
    Scrollbar.use(OverscrollPlugin);
    if ($('#scrollbar').length) {
      var scrollbar = Scrollbar.init(document.querySelector('#scrollbar'), {
        damping: 0.05,
        renderByPixel: true,
        continuousScrolling: true,
      });
    }
    if ($('#scrollbar2').length) {
      var scrollbar2 = Scrollbar.init(document.querySelector('#scrollbar2'), {
        damping: 0.05,
        renderByPixel: true,
        continuousScrolling: true,
      });
    }
  }
  $(window).on('scroll', function () {
    if ($(window).scrollTop() > 40) {
      $('body').addClass('fixed');
    } else {
      $('body').removeClass('fixed');
    }
  });
  $(window).on('load', function () {
    anime({
      targets: '.art-preloader',
      opacity: [1, 0],
      delay: 2200,
      duration: 400,
      easing: 'linear',
      complete: function (anim) {
        $('.art-preloader').css('display', 'none');
      },
    });
    anime({
      targets: '.art-counter-frame',
      opacity: [0, 1],
      duration: 800,
      delay: 2300,
      easing: 'linear',
    });
    anime({
      targets: '.art-counter',
      delay: 1300,
      opacity: [1, 1],
      complete: function (anim) {
        $('.art-counter').each(function () {
          $(this)
            .prop('Counter', 0)
            .animate(
              { Counter: $(this).text() },
              {
                duration: 2000,
                easing: 'linear',
                step: function (now) {
                  $(this).text(Math.ceil(now));
                },
              }
            );
        });
      },
    });
    var bar_delay = 2500;
    $('.art-skills-progress').each(function () {
      var bar_id = $(this).attr('id');
      var bar_val = parseInt($(this).attr('data-value')) / 100;
      var bar_type = $(this).attr('data-type');
      bar_delay = bar_delay + 100;
      if (bar_type == 'circles') {
        var bar = new ProgressBar.Circle('#' + bar_id, {
          strokeWidth: 7,
          easing: 'easeInOut',
          duration: 1400,
          delay: bar_delay,
          trailWidth: 7,
          step: function (state, circle) {
            var value = Math.round(circle.value() * 100);
            if (value === 0) {
              circle.setText('');
            } else {
              circle.setText(value);
            }
          },
        });
        bar.animate(bar_val);
      }
      if (bar_type == 'progress') {
        var bar = new ProgressBar.Line('#' + bar_id, {
          strokeWidth: 1.72,
          easing: 'easeInOut',
          duration: 1400,
          delay: bar_delay,
          trailWidth: 1.72,
          svgStyle: { width: '100%', height: '100%' },
          step: (state, bar) => {
            bar.setText(Math.round(bar.value() * 100) + ' %');
          },
        });
        bar.animate(bar_val);
      }
    });
  });
  bar.animate(1);
  $('.art-input').keyup(function () {
    if ($(this).val()) {
      $(this).addClass('art-active');
    } else {
      $(this).removeClass('art-active');
    }
  });
  $('.art-filter a').on('click', function () {
    $('.art-filter .art-current').removeClass('art-current');
    $(this).addClass('art-current');
    var selector = $(this).data('filter');
    $('.art-grid').isotope({ filter: selector });
    return false;
  });
  if ($('.art-grid').length) {
    var $container = $('.art-grid');
    $container.imagesLoaded(function () {
      $container.isotope({
        filter: '*',
        itemSelector: '.art-grid-item',
        transitionDuration: '.6s',
      });
    });
  }
  var swiper = new Swiper('.art-testimonial-slider', {
    slidesPerView: 3,
    spaceBetween: 30,
    speed: 1400,
    autoplay: false,
    autoplaySpeed: 5000,
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: {
      nextEl: '.art-testi-swiper-next',
      prevEl: '.art-testi-swiper-prev',
    },
    breakpoints: {
      0: { slidesPerView: 1 },
      720: { slidesPerView: 2 },
      1200: { slidesPerView: 2 },
      1500: { slidesPerView: 2 },
    },
  });
  var swiper = new Swiper('.art-works-slider', {
    slidesPerView: 3,
    spaceBetween: 30,
    speed: 1400,
    autoplay: { delay: 4000 },
    autoplaySpeed: 5000,
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: {
      nextEl: '.art-works-swiper-next',
      prevEl: '.art-works-swiper-prev',
    },
    breakpoints: {
      0: { slidesPerView: 1 },
      720: { slidesPerView: 2 },
      1200: { slidesPerView: 2 },
      1500: { slidesPerView: 2 },
    },
  });
  var swiper = new Swiper('.art-blog-slider', {
    slidesPerView: 3,
    spaceBetween: 30,
    speed: 1400,
    autoplay: { delay: 4000 },
    autoplaySpeed: 5000,
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: {
      nextEl: '.art-blog-swiper-next',
      prevEl: '.art-blog-swiper-prev',
    },
    breakpoints: {
      0: { slidesPerView: 1 },
      720: { slidesPerView: 2 },
      1200: { slidesPerView: 2 },
      1500: { slidesPerView: 3 },
    },
  });
  if (
    /\.(?:jpg|jpeg|gif|png)$/i.test(
      $('.wp-block-gallery .blocks-gallery-item:first a').attr('href')
    )
  ) {
    $('.wp-block-gallery a').magnificPopup({
      gallery: { enabled: true },
      type: 'image',
      closeOnContentClick: false,
      fixedContentPos: false,
      closeBtnInside: false,
      removalDelay: 500,
      callbacks: {
        beforeOpen: function () {
          this.st.image.markup = this.st.image.markup.replace(
            'mfp-figure',
            'mfp-figure mfp-with-anim'
          );
          this.st.mainClass = 'mfp-zoom-in';
        },
      },
    });
  }
  $('[data-magnific-inline]').magnificPopup({
    type: 'inline',
    overflowY: 'auto',
    preloader: false,
    removalDelay: 500,
    callbacks: {
      beforeOpen: function () {
        this.st.mainClass = 'mfp-zoom-in';
      },
    },
  });
  $('[data-magnific-image]').magnificPopup({
    type: 'image',
    closeOnContentClick: true,
    fixedContentPos: false,
    closeBtnInside: false,
    removalDelay: 500,
    callbacks: {
      beforeOpen: function () {
        this.st.image.markup = this.st.image.markup.replace(
          'mfp-figure',
          'mfp-figure mfp-with-anim'
        );
        this.st.mainClass = 'mfp-zoom-in';
      },
    },
  });
  if (!$('body').hasClass('elementor-page')) {
    $('a').each(function (i, el) {
      var href_value = el.href;
      if (/\.(jpg|png|gif)$/.test(href_value)) {
        $(el).magnificPopup({
          type: 'image',
          closeOnContentClick: true,
          fixedContentPos: false,
          closeBtnInside: false,
          removalDelay: 500,
          callbacks: {
            beforeOpen: function () {
              this.st.image.markup = this.st.image.markup.replace(
                'mfp-figure',
                'mfp-figure mfp-with-anim'
              );
              this.st.mainClass = 'mfp-zoom-in';
            },
          },
        });
      }
    });
  }
  $('[data-magnific-video]').magnificPopup({
    disableOn: 700,
    type: 'iframe',
    iframe: {
      patterns: {
        youtube_short: {
          index: 'youtu.be/',
          id: 'youtu.be/',
          src: 'https://www.youtube.com/embed/%id%?autoplay=1',
        },
      },
    },
    preloader: false,
    fixedContentPos: false,
    removalDelay: 500,
    callbacks: {
      markupParse: function (template, values, item) {
        template.find('iframe').attr('allow', 'autoplay');
      },
      beforeOpen: function () {
        this.st.image.markup = this.st.image.markup.replace(
          'mfp-figure',
          'mfp-figure mfp-with-anim'
        );
        this.st.mainClass = 'mfp-zoom-in';
      },
    },
  });
  $('[data-magnific-music]').magnificPopup({
    disableOn: 700,
    type: 'iframe',
    preloader: false,
    fixedContentPos: false,
    closeBtnInside: true,
    removalDelay: 500,
    callbacks: {
      beforeOpen: function () {
        this.st.image.markup = this.st.image.markup.replace(
          'mfp-figure',
          'mfp-figure mfp-with-anim'
        );
        this.st.mainClass = 'mfp-zoom-in';
      },
    },
  });
  $('[data-magnific-gallery]').magnificPopup({
    gallery: { enabled: true },
    type: 'image',
    closeOnContentClick: false,
    fixedContentPos: false,
    closeBtnInside: false,
    removalDelay: 500,
    callbacks: {
      beforeOpen: function () {
        this.st.image.markup = this.st.image.markup.replace(
          'mfp-figure',
          'mfp-figure mfp-with-anim'
        );
        this.st.mainClass = 'mfp-zoom-in';
      },
    },
  });
  $('.current-menu-item a').clone().appendTo('.art-current-page');
  $('.art-map-overlay').on('click', function () {
    $(this).addClass('art-active');
  });
  $('.art-info-bar-btn').on('click', function () {
    $('.art-info-bar').toggleClass('art-active');
    $('.art-menu-bar-btn').toggleClass('art-disabled');
  });
  $('.art-menu-bar-btn').on('click', function () {
    $('.art-menu-bar-btn , .art-menu-bar').toggleClass('art-active');
    $('.art-info-bar-btn').toggleClass('art-disabled');
  });
  $('.art-info-bar-btn , .art-menu-bar-btn').on('click', function () {
    $('.art-content').toggleClass('art-active');
  });
  $('.art-curtain , .art-mobile-top-bar').on('click', function () {
    $(
      '.art-menu-bar-btn , .art-menu-bar , .art-info-bar , .art-content , .art-menu-bar-btn , .art-info-bar-btn'
    ).removeClass('art-active , art-disabled');
  });
  $('.menu-item a').on('click', function () {
    if ($(this).parent().hasClass('menu-item-has-children')) {
      $(this).parent().children('.sub-menu').toggleClass('art-active');
      if (
        $(this).attr('href') != '' &&
        $(this).attr('href') != '#' &&
        $(this).attr('href') != '#.'
      ) {
        if ($(this).parent().hasClass('opened')) {
          $(this).parent().removeClass('opened');
        } else {
          $(this).parent().addClass('opened');
          return false;
        }
      } else {
        return false;
      }
    } else {
      $(
        '.art-menu-bar-btn , .art-menu-bar , .art-info-bar , .art-content , .art-menu-bar-btn , .art-info-bar-btn'
      ).removeClass('art-active , art-disabled');
    }
    if ($(this).attr('href') != '') {
      if ($(this).attr('href').charAt(0) == '#') {
        var section_id = $(this).attr('href');
        if ($(section_id).length && !$('body').hasClass('default--scrolling')) {
          var section_top =
            scrollbar.scrollTop + $(section_id).offset().top - 30;
          scrollbar.scrollTo(0, section_top, 500);
        }
      }
    }
  });
  $('.art-price-list li').each(function () {
    if ($(this).find('del').text()) {
      $(this).addClass('art-empty-item');
      $(this).html($(this).find('del').text());
    }
  });
  $('.art-input').on('focusin', function () {
    $(this).parent().next('label').addClass('focused');
  });
  $('.art-input').on('focusout', function () {
    $(this).parent().next('label').removeClass('focused');
  });
})(jQuery);
(function e(t, n) {
  if (typeof exports === 'object' && typeof module === 'object')
    module.exports = n();
  else if (typeof define === 'function' && define.amd) define([], n);
  else if (typeof exports === 'object') exports['Swup'] = n();
  else t['Swup'] = n();
})(window, function () {
  return (function (e) {
    var t = {};
    function n(r) {
      if (t[r]) {
        return t[r].exports;
      }
      var i = (t[r] = { i: r, l: false, exports: {} });
      e[r].call(i.exports, i, i.exports, n);
      i.l = true;
      return i.exports;
    }
    n.m = e;
    n.c = t;
    n.d = function (e, t, r) {
      if (!n.o(e, t)) {
        Object.defineProperty(e, t, { enumerable: true, get: r });
      }
    };
    n.r = function (e) {
      if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
        Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' });
      }
      Object.defineProperty(e, '__esModule', { value: true });
    };
    n.t = function (e, t) {
      if (t & 1) e = n(e);
      if (t & 8) return e;
      if (t & 4 && typeof e === 'object' && e && e.__esModule) return e;
      var r = Object.create(null);
      n.r(r);
      Object.defineProperty(r, 'default', { enumerable: true, value: e });
      if (t & 2 && typeof e != 'string')
        for (var i in e)
          n.d(
            r,
            i,
            function (t) {
              return e[t];
            }.bind(null, i)
          );
      return r;
    };
    n.n = function (e) {
      var t =
        e && e.__esModule
          ? function t() {
              return e['default'];
            }
          : function t() {
              return e;
            };
      n.d(t, 'a', t);
      return t;
    };
    n.o = function (e, t) {
      return Object.prototype.hasOwnProperty.call(e, t);
    };
    n.p = '';
    return n((n.s = 2));
  })([
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      t.Link = t.markSwupElements = t.getCurrentUrl = t.transitionEnd = t.fetch = t.getDataFromHtml = t.createHistoryRecord = t.classify = undefined;
      var r = n(8);
      var i = w(r);
      var a = n(9);
      var o = w(a);
      var s = n(10);
      var u = w(s);
      var l = n(11);
      var c = w(l);
      var f = n(12);
      var d = w(f);
      var h = n(13);
      var p = w(h);
      var v = n(14);
      var g = w(v);
      var m = n(15);
      var y = w(m);
      function w(e) {
        return e && e.__esModule ? e : { default: e };
      }
      var b = (t.classify = i.default);
      var E = (t.createHistoryRecord = o.default);
      var P = (t.getDataFromHtml = u.default);
      var _ = (t.fetch = c.default);
      var k = (t.transitionEnd = d.default);
      var S = (t.getCurrentUrl = p.default);
      var O = (t.markSwupElements = g.default);
      var j = (t.Link = y.default);
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = (t.query = function e(t) {
        var n =
          arguments.length > 1 && arguments[1] !== undefined
            ? arguments[1]
            : document;
        if (typeof t !== 'string') {
          return t;
        }
        return n.querySelector(t);
      });
      var i = (t.queryAll = function e(t) {
        var n =
          arguments.length > 1 && arguments[1] !== undefined
            ? arguments[1]
            : document;
        if (typeof t !== 'string') {
          return t;
        }
        return Array.prototype.slice.call(n.querySelectorAll(t));
      });
    },
    function (e, t, n) {
      'use strict';
      var r = n(3);
      var i = a(r);
      function a(e) {
        return e && e.__esModule ? e : { default: e };
      }
      e.exports = i.default;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r =
        Object.assign ||
        function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var n = arguments[t];
            for (var r in n) {
              if (Object.prototype.hasOwnProperty.call(n, r)) {
                e[r] = n[r];
              }
            }
          }
          return e;
        };
      var i = (function () {
        function e(e, t) {
          for (var n = 0; n < t.length; n++) {
            var r = t[n];
            r.enumerable = r.enumerable || false;
            r.configurable = true;
            if ('value' in r) r.writable = true;
            Object.defineProperty(e, r.key, r);
          }
        }
        return function (t, n, r) {
          if (n) e(t.prototype, n);
          if (r) e(t, r);
          return t;
        };
      })();
      var a = n(4);
      var o = M(a);
      var s = n(6);
      var u = M(s);
      var l = n(7);
      var c = M(l);
      var f = n(16);
      var d = M(f);
      var h = n(17);
      var p = M(h);
      var v = n(18);
      var g = M(v);
      var m = n(19);
      var y = M(m);
      var w = n(20);
      var b = M(w);
      var E = n(21);
      var P = M(E);
      var _ = n(22);
      var k = M(_);
      var S = n(23);
      var O = n(1);
      var j = n(0);
      function M(e) {
        return e && e.__esModule ? e : { default: e };
      }
      function H(e, t) {
        if (!(e instanceof t)) {
          throw new TypeError('Cannot call a class as a function');
        }
      }
      var L = (function () {
        function e(t) {
          H(this, e);
          var n = {
            animateHistoryBrowsing: false,
            animationSelector: '[class*="transition-"]',
            linkSelector:
              'a[href^="' +
              window.location.origin +
              '"]:not([data-no-swup]), a[href^="/"]:not([data-no-swup]), a[href^="#"]:not([data-no-swup])',
            cache: true,
            containers: ['#swup'],
            requestHeaders: {
              'X-Requested-With': 'swup',
              Accept: 'text/html, application/xhtml+xml',
            },
            plugins: [],
            skipPopStateHandling: function e(t) {
              return !(t.state && t.state.source === 'swup');
            },
          };
          var i = r({}, n, t);
          this._handlers = {
            animationInDone: [],
            animationInStart: [],
            animationOutDone: [],
            animationOutStart: [],
            animationSkipped: [],
            clickLink: [],
            contentReplaced: [],
            disabled: [],
            enabled: [],
            openPageInNewTab: [],
            pageLoaded: [],
            pageRetrievedFromCache: [],
            pageView: [],
            popState: [],
            samePage: [],
            samePageWithHash: [],
            serverError: [],
            transitionStart: [],
            transitionEnd: [],
            willReplaceContent: [],
          };
          this.scrollToElement = null;
          this.preloadPromise = null;
          this.options = i;
          this.plugins = [];
          this.transition = {};
          this.delegatedListeners = {};
          this.boundPopStateHandler = this.popStateHandler.bind(this);
          this.cache = new u.default();
          this.cache.swup = this;
          this.loadPage = c.default;
          this.renderPage = d.default;
          this.triggerEvent = p.default;
          this.on = g.default;
          this.off = y.default;
          this.updateTransition = b.default;
          this.getAnimationPromises = P.default;
          this.getPageData = k.default;
          this.log = function () {};
          this.use = S.use;
          this.unuse = S.unuse;
          this.findPlugin = S.findPlugin;
          this.enable();
        }
        i(e, [
          {
            key: 'enable',
            value: function e() {
              var t = this;
              if (typeof Promise === 'undefined') {
                console.warn('Promise is not supported');
                return;
              }
              this.delegatedListeners.click = (0, o.default)(
                document,
                this.options.linkSelector,
                'click',
                this.linkClickHandler.bind(this)
              );
              window.addEventListener('popstate', this.boundPopStateHandler);
              var n = (0, j.getDataFromHtml)(
                document.documentElement.outerHTML,
                this.options.containers
              );
              n.url = n.responseURL = (0, j.getCurrentUrl)();
              if (this.options.cache) {
                this.cache.cacheUrl(n);
              }
              (0, j.markSwupElements)(
                document.documentElement,
                this.options.containers
              );
              this.options.plugins.forEach(function (e) {
                t.use(e);
              });
              window.history.replaceState(
                Object.assign({}, window.history.state, {
                  url: window.location.href,
                  random: Math.random(),
                  source: 'swup',
                }),
                document.title,
                window.location.href
              );
              this.triggerEvent('enabled');
              document.documentElement.classList.add('swup-enabled');
              this.triggerEvent('pageView');
            },
          },
          {
            key: 'destroy',
            value: function e() {
              var t = this;
              this.delegatedListeners.click.destroy();
              window.removeEventListener('popstate', this.boundPopStateHandler);
              this.cache.empty();
              this.options.plugins.forEach(function (e) {
                t.unuse(e);
              });
              (0, O.queryAll)('[data-swup]').forEach(function (e) {
                e.removeAttribute('data-swup');
              });
              this.off();
              this.triggerEvent('disabled');
              document.documentElement.classList.remove('swup-enabled');
            },
          },
          {
            key: 'linkClickHandler',
            value: function e(t) {
              if (!t.metaKey && !t.ctrlKey && !t.shiftKey && !t.altKey) {
                if (t.button === 0) {
                  this.triggerEvent('clickLink', t);
                  t.preventDefault();
                  var n = new j.Link(t.delegateTarget);
                  if (
                    n.getAddress() == (0, j.getCurrentUrl)() ||
                    n.getAddress() == ''
                  ) {
                    if (n.getHash() != '') {
                      this.triggerEvent('samePageWithHash', t);
                      var r = document.querySelector(n.getHash());
                      if (r != null) {
                        history.replaceState(
                          {
                            url: n.getAddress() + n.getHash(),
                            random: Math.random(),
                            source: 'swup',
                          },
                          document.title,
                          n.getAddress() + n.getHash()
                        );
                      } else {
                        console.warn(
                          'Element for offset not found (' + n.getHash() + ')'
                        );
                      }
                    } else {
                      this.triggerEvent('samePage', t);
                    }
                  } else {
                    if (n.getHash() != '') {
                      this.scrollToElement = n.getHash();
                    }
                    var i = t.delegateTarget.getAttribute(
                      'data-swup-transition'
                    );
                    this.loadPage(
                      { url: n.getAddress(), customTransition: i },
                      false
                    );
                  }
                }
              } else {
                this.triggerEvent('openPageInNewTab', t);
              }
            },
          },
          {
            key: 'popStateHandler',
            value: function e(t) {
              if (this.options.skipPopStateHandling(t)) return;
              var n = new j.Link(
                t.state ? t.state.url : window.location.pathname
              );
              if (n.getHash() !== '') {
                this.scrollToElement = n.getHash();
              } else {
                t.preventDefault();
              }
              this.triggerEvent('popState', t);
              this.loadPage({ url: n.getAddress() }, t);
            },
          },
        ]);
        return e;
      })();
      t.default = L;
    },
    function (e, t, n) {
      var r = n(5);
      function i(e, t, n, r, i) {
        var o = a.apply(this, arguments);
        e.addEventListener(n, o, i);
        return {
          destroy: function () {
            e.removeEventListener(n, o, i);
          },
        };
      }
      function a(e, t, n, i) {
        return function (n) {
          n.delegateTarget = r(n.target, t);
          if (n.delegateTarget) {
            i.call(e, n);
          }
        };
      }
      e.exports = i;
    },
    function (e, t) {
      var n = 9;
      if (typeof Element !== 'undefined' && !Element.prototype.matches) {
        var r = Element.prototype;
        r.matches =
          r.matchesSelector ||
          r.mozMatchesSelector ||
          r.msMatchesSelector ||
          r.oMatchesSelector ||
          r.webkitMatchesSelector;
      }
      function i(e, t) {
        while (e && e.nodeType !== n) {
          if (typeof e.matches === 'function' && e.matches(t)) {
            return e;
          }
          e = e.parentNode;
        }
      }
      e.exports = i;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = (function () {
        function e(e, t) {
          for (var n = 0; n < t.length; n++) {
            var r = t[n];
            r.enumerable = r.enumerable || false;
            r.configurable = true;
            if ('value' in r) r.writable = true;
            Object.defineProperty(e, r.key, r);
          }
        }
        return function (t, n, r) {
          if (n) e(t.prototype, n);
          if (r) e(t, r);
          return t;
        };
      })();
      function i(e, t) {
        if (!(e instanceof t)) {
          throw new TypeError('Cannot call a class as a function');
        }
      }
      var a = (t.Cache = (function () {
        function e() {
          i(this, e);
          this.pages = {};
          this.last = null;
        }
        r(e, [
          {
            key: 'cacheUrl',
            value: function e(t) {
              if (t.url in this.pages === false) {
                this.pages[t.url] = t;
              }
              this.last = this.pages[t.url];
              this.swup.log(
                'Cache (' + Object.keys(this.pages).length + ')',
                this.pages
              );
            },
          },
          {
            key: 'getPage',
            value: function e(t) {
              return this.pages[t];
            },
          },
          {
            key: 'getCurrentPage',
            value: function e() {
              return this.getPage(
                window.location.pathname + window.location.search
              );
            },
          },
          {
            key: 'exists',
            value: function e(t) {
              return t in this.pages;
            },
          },
          {
            key: 'empty',
            value: function e() {
              this.pages = {};
              this.last = null;
              this.swup.log('Cache cleared');
            },
          },
          {
            key: 'remove',
            value: function e(t) {
              delete this.pages[t];
            },
          },
        ]);
        return e;
      })());
      t.default = a;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r =
        Object.assign ||
        function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var n = arguments[t];
            for (var r in n) {
              if (Object.prototype.hasOwnProperty.call(n, r)) {
                e[r] = n[r];
              }
            }
          }
          return e;
        };
      var i = n(0);
      var a = function e(t, n) {
        var a = this;
        var o = [],
          s = void 0;
        var u = function e() {
          a.triggerEvent('animationOutStart');
          document.documentElement.classList.add('is-changing');
          document.documentElement.classList.add('is-leaving');
          document.documentElement.classList.add('is-animating');
          if (n) {
            document.documentElement.classList.add('is-popstate');
          }
          document.documentElement.classList.add(
            'to-' + (0, i.classify)(t.url)
          );
          o = a.getAnimationPromises('out');
          Promise.all(o).then(function () {
            a.triggerEvent('animationOutDone');
          });
          if (!n) {
            var r = void 0;
            if (a.scrollToElement != null) {
              r = t.url + a.scrollToElement;
            } else {
              r = t.url;
            }
            (0, i.createHistoryRecord)(r);
          }
        };
        this.triggerEvent('transitionStart', n);
        if (t.customTransition != null) {
          this.updateTransition(
            window.location.pathname,
            t.url,
            t.customTransition
          );
          document.documentElement.classList.add(
            'to-' + (0, i.classify)(t.customTransition)
          );
        } else {
          this.updateTransition(window.location.pathname, t.url);
        }
        if (!n || this.options.animateHistoryBrowsing) {
          u();
        } else {
          this.triggerEvent('animationSkipped');
        }
        if (this.cache.exists(t.url)) {
          s = new Promise(function (e) {
            e();
          });
          this.triggerEvent('pageRetrievedFromCache');
        } else {
          if (!this.preloadPromise || this.preloadPromise.route != t.url) {
            s = new Promise(function (e, n) {
              (0,
              i.fetch)(r({}, t, { headers: a.options.requestHeaders }), function (r) {
                if (r.status === 500) {
                  a.triggerEvent('serverError');
                  n(t.url);
                  return;
                } else {
                  var i = a.getPageData(r);
                  if (i != null) {
                    i.url = t.url;
                  } else {
                    n(t.url);
                    return;
                  }
                  a.cache.cacheUrl(i);
                  a.triggerEvent('pageLoaded');
                }
                e();
              });
            });
          } else {
            s = this.preloadPromise;
          }
        }
        Promise.all(o.concat([s]))
          .then(function () {
            a.renderPage(a.cache.getPage(t.url), n);
            a.preloadPromise = null;
          })
          .catch(function (e) {
            a.options.skipPopStateHandling = function () {
              window.location = e;
              return true;
            };
            window.history.go(-1);
          });
      };
      t.default = a;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = function e(t) {
        var n = t
          .toString()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/\//g, '-')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, '');
        if (n[0] === '/') n = n.splice(1);
        if (n === '') n = 'homepage';
        return n;
      };
      t.default = r;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = function e(t) {
        window.history.pushState(
          {
            url: t || window.location.href.split(window.location.hostname)[1],
            random: Math.random(),
            source: 'swup',
          },
          document.getElementsByTagName('title')[0].innerText,
          t || window.location.href.split(window.location.hostname)[1]
        );
      };
      t.default = r;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r =
        typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
          ? function (e) {
              return typeof e;
            }
          : function (e) {
              return e &&
                typeof Symbol === 'function' &&
                e.constructor === Symbol &&
                e !== Symbol.prototype
                ? 'symbol'
                : typeof e;
            };
      var i = n(1);
      var a = function e(t, n) {
        var a = document.createElement('html');
        a.innerHTML = t;
        var o = [];
        var s = function e(t) {
          if (a.querySelector(n[t]) == null) {
            return { v: null };
          } else {
            (0, i.queryAll)(n[t]).forEach(function (e, r) {
              (0, i.queryAll)(n[t], a)[r].setAttribute('data-swup', o.length);
              o.push((0, i.queryAll)(n[t], a)[r].outerHTML);
            });
          }
        };
        for (var u = 0; u < n.length; u++) {
          var l = s(u);
          if ((typeof l === 'undefined' ? 'undefined' : r(l)) === 'object')
            return l.v;
        }
        var c = {
          title: a.querySelector('title').innerText,
          pageClass: a.querySelector('body').className,
          originalContent: t,
          blocks: o,
        };
        a.innerHTML = '';
        a = null;
        return c;
      };
      t.default = a;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r =
        Object.assign ||
        function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var n = arguments[t];
            for (var r in n) {
              if (Object.prototype.hasOwnProperty.call(n, r)) {
                e[r] = n[r];
              }
            }
          }
          return e;
        };
      var i = function e(t) {
        var n =
          arguments.length > 1 && arguments[1] !== undefined
            ? arguments[1]
            : false;
        var i = {
          url: window.location.pathname + window.location.search,
          method: 'GET',
          data: null,
          headers: {},
        };
        var a = r({}, i, t);
        var o = new XMLHttpRequest();
        o.onreadystatechange = function () {
          if (o.readyState === 4) {
            if (o.status !== 500) {
              n(o);
            } else {
              n(o);
            }
          }
        };
        o.open(a.method, a.url, true);
        Object.keys(a.headers).forEach(function (e) {
          o.setRequestHeader(e, a.headers[e]);
        });
        o.send(a.data);
        return o;
      };
      t.default = i;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = function e() {
        var t = document.createElement('div');
        var n = {
          WebkitTransition: 'webkitTransitionEnd',
          MozTransition: 'transitionend',
          OTransition: 'oTransitionEnd otransitionend',
          transition: 'transitionend',
        };
        for (var r in n) {
          if (t.style[r] !== undefined) {
            return n[r];
          }
        }
        return false;
      };
      t.default = r;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = function e() {
        return window.location.pathname + window.location.search;
      };
      t.default = r;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = n(1);
      var i = function e(t, n) {
        var i = 0;
        var a = function e(a) {
          if (t.querySelector(n[a]) == null) {
            console.warn('Element ' + n[a] + ' is not in current page.');
          } else {
            (0, r.queryAll)(n[a]).forEach(function (e, o) {
              (0, r.queryAll)(n[a], t)[o].setAttribute('data-swup', i);
              i++;
            });
          }
        };
        for (var o = 0; o < n.length; o++) {
          a(o);
        }
      };
      t.default = i;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = (function () {
        function e(e, t) {
          for (var n = 0; n < t.length; n++) {
            var r = t[n];
            r.enumerable = r.enumerable || false;
            r.configurable = true;
            if ('value' in r) r.writable = true;
            Object.defineProperty(e, r.key, r);
          }
        }
        return function (t, n, r) {
          if (n) e(t.prototype, n);
          if (r) e(t, r);
          return t;
        };
      })();
      function i(e, t) {
        if (!(e instanceof t)) {
          throw new TypeError('Cannot call a class as a function');
        }
      }
      var a = (function () {
        function e(t) {
          i(this, e);
          if (t instanceof Element || t instanceof SVGElement) {
            this.link = t;
          } else {
            this.link = document.createElement('a');
            this.link.href = t;
          }
        }
        r(e, [
          {
            key: 'getPath',
            value: function e() {
              var t = this.link.pathname;
              if (t[0] !== '/') {
                t = '/' + t;
              }
              return t;
            },
          },
          {
            key: 'getAddress',
            value: function e() {
              var t = this.link.pathname + this.link.search;
              if (this.link.getAttribute('xlink:href')) {
                t = this.link.getAttribute('xlink:href');
              }
              if (t[0] !== '/') {
                t = '/' + t;
              }
              return t;
            },
          },
          {
            key: 'getHash',
            value: function e() {
              return this.link.hash;
            },
          },
        ]);
        return e;
      })();
      t.default = a;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r =
        Object.assign ||
        function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var n = arguments[t];
            for (var r in n) {
              if (Object.prototype.hasOwnProperty.call(n, r)) {
                e[r] = n[r];
              }
            }
          }
          return e;
        };
      var i = n(1);
      var a = n(0);
      var o = function e(t, n) {
        var i = this;
        document.documentElement.classList.remove('is-leaving');
        var o = new a.Link(t.responseURL);
        if (window.location.pathname !== o.getPath()) {
          window.history.replaceState(
            { url: o.getPath(), random: Math.random(), source: 'swup' },
            document.title,
            o.getPath()
          );
          this.cache.cacheUrl(r({}, t, { url: o.getPath() }));
        }
        if (!n || this.options.animateHistoryBrowsing) {
          document.documentElement.classList.add('is-rendering');
        }
        this.triggerEvent('willReplaceContent', n);
        for (var s = 0; s < t.blocks.length; s++) {
          document.body.querySelector('[data-swup="' + s + '"]').outerHTML =
            t.blocks[s];
        }
        document.title = t.title;
        this.triggerEvent('contentReplaced', n);
        this.triggerEvent('pageView', n);
        if (!this.options.cache) {
          this.cache.empty();
        }
        setTimeout(function () {
          if (!n || i.options.animateHistoryBrowsing) {
            i.triggerEvent('animationInStart');
            document.documentElement.classList.remove('is-animating');
          }
        }, 10);
        var u = this.getAnimationPromises('in');
        if (!n || this.options.animateHistoryBrowsing) {
          Promise.all(u).then(function () {
            i.triggerEvent('animationInDone');
            i.triggerEvent('transitionEnd', n);
            document.documentElement.className.split(' ').forEach(function (e) {
              if (
                new RegExp('^to-').test(e) ||
                e === 'is-changing' ||
                e === 'is-rendering' ||
                e === 'is-popstate'
              ) {
                document.documentElement.classList.remove(e);
              }
            });
          });
        } else {
          this.triggerEvent('transitionEnd', n);
        }
        this.scrollToElement = null;
      };
      t.default = o;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = function e(t, n) {
        this._handlers[t].forEach(function (e) {
          try {
            e(n);
          } catch (e) {
            console.error(e);
          }
        });
        var r = new CustomEvent('swup:' + t, { detail: t });
        document.dispatchEvent(r);
      };
      t.default = r;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = function e(t, n) {
        if (this._handlers[t]) {
          this._handlers[t].push(n);
        } else {
          console.warn('Unsupported event ' + t + '.');
        }
      };
      t.default = r;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = function e(t, n) {
        var r = this;
        if (t != null) {
          if (n != null) {
            if (
              this._handlers[t] &&
              this._handlers[t].filter(function (e) {
                return e === n;
              }).length
            ) {
              var i = this._handlers[t].filter(function (e) {
                return e === n;
              })[0];
              var a = this._handlers[t].indexOf(i);
              if (a > -1) {
                this._handlers[t].splice(a, 1);
              }
            } else {
              console.warn("Handler for event '" + t + "' no found.");
            }
          } else {
            this._handlers[t] = [];
          }
        } else {
          Object.keys(this._handlers).forEach(function (e) {
            r._handlers[e] = [];
          });
        }
      };
      t.default = r;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = function e(t, n, r) {
        this.transition = { from: t, to: n, custom: r };
      };
      t.default = r;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = n(1);
      var i = n(0);
      var a = function e() {
        var t = [];
        var n = (0, r.queryAll)(this.options.animationSelector);
        n.forEach(function (e) {
          var n = new Promise(function (t) {
            e.addEventListener((0, i.transitionEnd)(), function (n) {
              if (e == n.target) {
                t();
              }
            });
          });
          t.push(n);
        });
        return t;
      };
      t.default = a;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = n(0);
      var i = function e(t) {
        var n = t.responseText;
        var i = (0, r.getDataFromHtml)(n, this.options.containers);
        if (i) {
          i.responseURL = t.responseURL ? t.responseURL : window.location.href;
        } else {
          console.warn('Received page is invalid.');
          return null;
        }
        return i;
      };
      t.default = i;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = (t.use = function e(t) {
        if (!t.isSwupPlugin) {
          console.warn('Not swup plugin instance ' + t + '.');
          return;
        }
        this.plugins.push(t);
        t.swup = this;
        if (typeof t._beforeMount === 'function') {
          t._beforeMount();
        }
        t.mount();
        return this.plugins;
      });
      var i = (t.unuse = function e(t) {
        var n = void 0;
        if (typeof t === 'string') {
          n = this.plugins.find(function (e) {
            return t === e.name;
          });
        } else {
          n = t;
        }
        if (!n) {
          console.warn('No such plugin.');
          return;
        }
        n.unmount();
        if (typeof n._afterUnmount === 'function') {
          n._afterUnmount();
        }
        var r = this.plugins.indexOf(n);
        this.plugins.splice(r, 1);
        return this.plugins;
      });
      var a = (t.findPlugin = function e(t) {
        return this.plugins.find(function (e) {
          return t === e.name;
        });
      });
    },
  ]);
});
(function e(t, n) {
  if (typeof exports === 'object' && typeof module === 'object')
    module.exports = n();
  else if (typeof define === 'function' && define.amd) define([], n);
  else if (typeof exports === 'object') exports['SwupBodyClassPlugin'] = n();
  else t['SwupBodyClassPlugin'] = n();
})(window, function () {
  return (function (e) {
    var t = {};
    function n(r) {
      if (t[r]) {
        return t[r].exports;
      }
      var o = (t[r] = { i: r, l: false, exports: {} });
      e[r].call(o.exports, o, o.exports, n);
      o.l = true;
      return o.exports;
    }
    n.m = e;
    n.c = t;
    n.d = function (e, t, r) {
      if (!n.o(e, t)) {
        Object.defineProperty(e, t, { enumerable: true, get: r });
      }
    };
    n.r = function (e) {
      if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
        Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' });
      }
      Object.defineProperty(e, '__esModule', { value: true });
    };
    n.t = function (e, t) {
      if (t & 1) e = n(e);
      if (t & 8) return e;
      if (t & 4 && typeof e === 'object' && e && e.__esModule) return e;
      var r = Object.create(null);
      n.r(r);
      Object.defineProperty(r, 'default', { enumerable: true, value: e });
      if (t & 2 && typeof e != 'string')
        for (var o in e)
          n.d(
            r,
            o,
            function (t) {
              return e[t];
            }.bind(null, o)
          );
      return r;
    };
    n.n = function (e) {
      var t =
        e && e.__esModule
          ? function t() {
              return e['default'];
            }
          : function t() {
              return e;
            };
      n.d(t, 'a', t);
      return t;
    };
    n.o = function (e, t) {
      return Object.prototype.hasOwnProperty.call(e, t);
    };
    n.p = '';
    return n((n.s = 0));
  })([
    function (e, t, n) {
      'use strict';
      var r = n(1);
      var o = u(r);
      function u(e) {
        return e && e.__esModule ? e : { default: e };
      }
      e.exports = o.default;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r =
        Object.assign ||
        function (e) {
          for (var t = 1; t < arguments.length; t++) {
            var n = arguments[t];
            for (var r in n) {
              if (Object.prototype.hasOwnProperty.call(n, r)) {
                e[r] = n[r];
              }
            }
          }
          return e;
        };
      var o = (function () {
        function e(e, t) {
          for (var n = 0; n < t.length; n++) {
            var r = t[n];
            r.enumerable = r.enumerable || false;
            r.configurable = true;
            if ('value' in r) r.writable = true;
            Object.defineProperty(e, r.key, r);
          }
        }
        return function (t, n, r) {
          if (n) e(t.prototype, n);
          if (r) e(t, r);
          return t;
        };
      })();
      var u = n(2);
      var i = f(u);
      function f(e) {
        return e && e.__esModule ? e : { default: e };
      }
      function a(e, t) {
        if (!(e instanceof t)) {
          throw new TypeError('Cannot call a class as a function');
        }
      }
      function l(e, t) {
        if (!e) {
          throw new ReferenceError(
            "this hasn't been initialised - super() hasn't been called"
          );
        }
        return t && (typeof t === 'object' || typeof t === 'function') ? t : e;
      }
      function c(e, t) {
        if (typeof t !== 'function' && t !== null) {
          throw new TypeError(
            'Super expression must either be null or a function, not ' +
              typeof t
          );
        }
        e.prototype = Object.create(t && t.prototype, {
          constructor: {
            value: e,
            enumerable: false,
            writable: true,
            configurable: true,
          },
        });
        if (t)
          Object.setPrototypeOf
            ? Object.setPrototypeOf(e, t)
            : (e.__proto__ = t);
      }
      var s = (function (e) {
        c(t, e);
        function t(e) {
          a(this, t);
          var n = l(this, (t.__proto__ || Object.getPrototypeOf(t)).call(this));
          n.name = 'BodyClassPlugin';
          var o = { prefix: '' };
          n.options = r({}, o, e);
          return n;
        }
        o(t, [
          {
            key: 'mount',
            value: function e() {
              var t = this;
              this.swup.on('contentReplaced', function () {
                var e = t.swup.cache.getCurrentPage();
                document.body.className.split(' ').forEach(function (e) {
                  if (t.isValidClassName(e)) {
                    document.body.classList.remove(e);
                  }
                });
                if (e.pageClass !== '') {
                  e.pageClass.split(' ').forEach(function (e) {
                    if (t.isValidClassName(e)) {
                      document.body.classList.add(e);
                    }
                  });
                }
              });
            },
          },
          {
            key: 'isValidClassName',
            value: function e(t) {
              return t !== '' && t.indexOf(this.options.prefix) !== -1;
            },
          },
        ]);
        return t;
      })(i.default);
      t.default = s;
    },
    function (e, t, n) {
      'use strict';
      Object.defineProperty(t, '__esModule', { value: true });
      var r = (function () {
        function e(e, t) {
          for (var n = 0; n < t.length; n++) {
            var r = t[n];
            r.enumerable = r.enumerable || false;
            r.configurable = true;
            if ('value' in r) r.writable = true;
            Object.defineProperty(e, r.key, r);
          }
        }
        return function (t, n, r) {
          if (n) e(t.prototype, n);
          if (r) e(t, r);
          return t;
        };
      })();
      function o(e, t) {
        if (!(e instanceof t)) {
          throw new TypeError('Cannot call a class as a function');
        }
      }
      var u = (function () {
        function e() {
          o(this, e);
          this.isSwupPlugin = true;
        }
        r(e, [
          { key: 'mount', value: function e() {} },
          { key: 'unmount', value: function e() {} },
        ]);
        return e;
      })();
      t.default = u;
    },
  ]);
});
(function ($) {
  'use strict';
  const options = {
    containers: ['#swup', '#swupMenu'],
    animateHistoryBrowsing: true,
    plugins: [new SwupBodyClassPlugin()],
  };
  if ($('#swup').length && $('#swupMenu').length) {
    const swup = new Swup(options);
  }
  document.addEventListener('swup:contentReplaced', function () {
    if ($('body').hasClass('default--scrolling')) {
      $('html, body').animate({ scrollTop: 0 }, 0);
    }
    var body_classes = $('body').attr('class').split(' ');
    var page_class = '';
    var page_id = 0;
    for (var i = 0; i < body_classes.length; i++) {
      if (body_classes[i].substring(0, 8) == 'page-id-') {
        var page_class = body_classes[i];
        var page_id = parseInt(page_class.replace('page-id-', ''));
      } else if (body_classes[i].substring(0, 15) == 'elementor-page-') {
        var page_class = body_classes[i];
        var page_id = parseInt(page_class.replace('elementor-page-', ''));
      }
    }
    var elementor_post_css_url =
      swup_url_data.url.replace('themes/arter', '') +
      'uploads/elementor/css/post-' +
      page_id +
      '.css';
    if (!$('#elementor-post-' + page_id + '-css').length) {
      $(
        '<link id="elementor-post-' +
          page_id +
          '-css" href="' +
          elementor_post_css_url +
          '" rel="stylesheet">'
      ).appendTo('head');
    }
    if (!$('body').hasClass('default--scrolling')) {
      Scrollbar.use(OverscrollPlugin);
      var scrollbar = Scrollbar.init(document.querySelector('#scrollbar'), {
        damping: 0.05,
        renderByPixel: true,
        continuousScrolling: true,
      });
      var scrollbar2 = Scrollbar.init(document.querySelector('#scrollbar2'), {
        damping: 0.05,
        renderByPixel: true,
        continuousScrolling: true,
      });
    }
    if ($('.art-grid').length) {
      var $container = $('.art-grid');
      $container.imagesLoaded(function () {
        $container.isotope({
          filter: '*',
          itemSelector: '.art-grid-item',
          transitionDuration: '.6s',
        });
      });
    }
    $('.art-filter a').on('click', function () {
      $('.art-filter .art-current').removeClass('art-current');
      $(this).addClass('art-current');
      var selector = $(this).data('filter');
      $('.art-grid').isotope({ filter: selector });
      return false;
    });
    anime({
      targets: '.art-counter-frame',
      opacity: [0, 1],
      duration: 800,
      delay: 300,
      easing: 'linear',
    });
    $('.art-counter').each(function () {
      $(this)
        .prop('Counter', 0)
        .animate(
          { Counter: $(this).text() },
          {
            duration: 2000,
            easing: 'linear',
            step: function (now) {
              $(this).text(Math.ceil(now));
            },
          }
        );
    });
    var swiper = new Swiper('.art-testimonial-slider', {
      slidesPerView: 3,
      spaceBetween: 30,
      speed: 1400,
      autoplay: false,
      autoplaySpeed: 5000,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: {
        nextEl: '.art-testi-swiper-next',
        prevEl: '.art-testi-swiper-prev',
      },
      breakpoints: {
        0: { slidesPerView: 1 },
        720: { slidesPerView: 2 },
        1200: { slidesPerView: 2 },
        1500: { slidesPerView: 2 },
      },
    });
    var swiper = new Swiper('.art-works-slider', {
      slidesPerView: 3,
      spaceBetween: 30,
      speed: 1400,
      autoplay: { delay: 4000 },
      autoplaySpeed: 5000,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: {
        nextEl: '.art-works-swiper-next',
        prevEl: '.art-works-swiper-prev',
      },
      breakpoints: {
        0: { slidesPerView: 1 },
        720: { slidesPerView: 2 },
        1200: { slidesPerView: 2 },
        1500: { slidesPerView: 2 },
      },
    });
    var swiper = new Swiper('.art-blog-slider', {
      slidesPerView: 3,
      spaceBetween: 30,
      speed: 1400,
      autoplay: { delay: 4000 },
      autoplaySpeed: 5000,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: {
        nextEl: '.art-blog-swiper-next',
        prevEl: '.art-blog-swiper-prev',
      },
      breakpoints: {
        0: { slidesPerView: 1 },
        720: { slidesPerView: 2 },
        1200: { slidesPerView: 3 },
        1500: { slidesPerView: 3 },
      },
    });
    if (
      /\.(?:jpg|jpeg|gif|png)$/i.test(
        $('.wp-block-gallery .blocks-gallery-item:first a').attr('href')
      )
    ) {
      $('.wp-block-gallery a').magnificPopup({
        gallery: { enabled: true },
        type: 'image',
        closeOnContentClick: false,
        fixedContentPos: false,
        closeBtnInside: false,
        removalDelay: 500,
        callbacks: {
          beforeOpen: function () {
            this.st.image.markup = this.st.image.markup.replace(
              'mfp-figure',
              'mfp-figure mfp-with-anim'
            );
            this.st.mainClass = 'mfp-zoom-in';
          },
        },
      });
    }
    $('[data-magnific-inline]').magnificPopup({
      type: 'inline',
      overflowY: 'auto',
      preloader: false,
      removalDelay: 500,
      callbacks: {
        beforeOpen: function () {
          this.st.mainClass = 'mfp-zoom-in';
        },
      },
    });
    $('[data-magnific-image]').magnificPopup({
      type: 'image',
      closeOnContentClick: true,
      fixedContentPos: false,
      closeBtnInside: false,
      removalDelay: 500,
      callbacks: {
        beforeOpen: function () {
          this.st.image.markup = this.st.image.markup.replace(
            'mfp-figure',
            'mfp-figure mfp-with-anim'
          );
          this.st.mainClass = 'mfp-zoom-in';
        },
      },
    });
    if (!$('body').hasClass('elementor-page')) {
      $('a').each(function (i, el) {
        var href_value = el.href;
        if (/\.(jpg|png|gif)$/.test(href_value)) {
          $(el).magnificPopup({
            type: 'image',
            closeOnContentClick: true,
            fixedContentPos: false,
            closeBtnInside: false,
            removalDelay: 500,
            callbacks: {
              beforeOpen: function () {
                this.st.image.markup = this.st.image.markup.replace(
                  'mfp-figure',
                  'mfp-figure mfp-with-anim'
                );
                this.st.mainClass = 'mfp-zoom-in';
              },
            },
          });
        }
      });
    }
    $('[data-magnific-video]').magnificPopup({
      disableOn: 700,
      type: 'iframe',
      iframe: {
        patterns: {
          youtube_short: {
            index: 'youtu.be/',
            id: 'youtu.be/',
            src: 'https://www.youtube.com/embed/%id%?autoplay=1',
          },
        },
      },
      preloader: false,
      fixedContentPos: false,
      removalDelay: 500,
      callbacks: {
        markupParse: function (template, values, item) {
          template.find('iframe').attr('allow', 'autoplay');
        },
        beforeOpen: function () {
          this.st.image.markup = this.st.image.markup.replace(
            'mfp-figure',
            'mfp-figure mfp-with-anim'
          );
          this.st.mainClass = 'mfp-zoom-in';
        },
      },
    });
    $('[data-magnific-music]').magnificPopup({
      disableOn: 700,
      type: 'iframe',
      preloader: false,
      fixedContentPos: false,
      closeBtnInside: true,
      removalDelay: 500,
      callbacks: {
        beforeOpen: function () {
          this.st.image.markup = this.st.image.markup.replace(
            'mfp-figure',
            'mfp-figure mfp-with-anim'
          );
          this.st.mainClass = 'mfp-zoom-in';
        },
      },
    });
    $('[data-magnific-gallery]').magnificPopup({
      gallery: { enabled: true },
      type: 'image',
      closeOnContentClick: false,
      fixedContentPos: false,
      closeBtnInside: false,
      removalDelay: 500,
      callbacks: {
        beforeOpen: function () {
          this.st.image.markup = this.st.image.markup.replace(
            'mfp-figure',
            'mfp-figure mfp-with-anim'
          );
          this.st.mainClass = 'mfp-zoom-in';
        },
      },
    });
    $('.current-menu-item a').clone().prependTo('.art-current-page');
    $('.menu-item a').on('click', function () {
      if ($(this).parent().hasClass('menu-item-has-children')) {
        $(this).parent().children('.sub-menu').toggleClass('art-active');
        if (
          $(this).attr('href') != '' &&
          $(this).attr('href') != '#' &&
          $(this).attr('href') != '#.'
        ) {
          if ($(this).parent().hasClass('opened')) {
            $(this).parent().removeClass('opened');
          } else {
            $(this).parent().addClass('opened');
            return false;
          }
        } else {
          return false;
        }
      } else {
        $(
          '.art-menu-bar-btn , .art-menu-bar , .art-info-bar , .art-content , .art-menu-bar-btn , .art-info-bar-btn'
        ).removeClass('art-active , art-disabled');
      }
      if ($(this).attr('href') != '') {
        if ($(this).attr('href').charAt(0) == '#') {
          var section_id = $(this).attr('href');
          if (
            $(section_id).length &&
            !$('body').hasClass('default--scrolling')
          ) {
            var section_top =
              scrollbar.scrollTop + $(section_id).offset().top - 30;
            scrollbar.scrollTo(0, section_top, 500);
          }
        }
      }
    });
  });
})(jQuery);
/*! This file is auto-generated */
!(function (d, l) {
  'use strict';
  var e = !1,
    o = !1;
  if (l.querySelector) if (d.addEventListener) e = !0;
  if (((d.wp = d.wp || {}), !d.wp.receiveEmbedMessage))
    if (
      ((d.wp.receiveEmbedMessage = function (e) {
        var t = e.data;
        if (t)
          if (t.secret || t.message || t.value)
            if (!/[^a-zA-Z0-9]/.test(t.secret)) {
              var r,
                a,
                i,
                s,
                n,
                o = l.querySelectorAll(
                  'iframe[data-secret="' + t.secret + '"]'
                ),
                c = l.querySelectorAll(
                  'blockquote[data-secret="' + t.secret + '"]'
                );
              for (r = 0; r < c.length; r++) c[r].style.display = 'none';
              for (r = 0; r < o.length; r++)
                if (((a = o[r]), e.source === a.contentWindow)) {
                  if ((a.removeAttribute('style'), 'height' === t.message)) {
                    if (1e3 < (i = parseInt(t.value, 10))) i = 1e3;
                    else if (~~i < 200) i = 200;
                    a.height = i;
                  }
                  if ('link' === t.message)
                    if (
                      ((s = l.createElement('a')),
                      (n = l.createElement('a')),
                      (s.href = a.getAttribute('src')),
                      (n.href = t.value),
                      n.host === s.host)
                    )
                      if (l.activeElement === a) d.top.location.href = t.value;
                }
            }
      }),
      e)
    )
      d.addEventListener('message', d.wp.receiveEmbedMessage, !1),
        l.addEventListener('DOMContentLoaded', t, !1),
        d.addEventListener('load', t, !1);
  function t() {
    if (!o) {
      o = !0;
      var e,
        t,
        r,
        a,
        i = -1 !== navigator.appVersion.indexOf('MSIE 10'),
        s = !!navigator.userAgent.match(/Trident.*rv:11\./),
        n = l.querySelectorAll('iframe.wp-embedded-content');
      for (t = 0; t < n.length; t++) {
        if (!(r = n[t]).getAttribute('data-secret'))
          (a = Math.random().toString(36).substr(2, 10)),
            (r.src += '#?secret=' + a),
            r.setAttribute('data-secret', a);
        if (i || s)
          (e = r.cloneNode(!0)).removeAttribute('security'),
            r.parentNode.replaceChild(e, r);
      }
    }
  }
})(window, document);
