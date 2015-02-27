/**
 * Created by wesley on 23/02/2015.
 */

var colors = require('colors');

module.exports = {
  enabled: true,

  icon: {
    right_arrow: '\u25B6'.green,
    left_arrow: '\u25C0'.red,
    plus: '\u271A'.green,
    cross: '\u2716'.red,
    bullet: '\u2756'.cyan,
    edit: '\u270E'.yellow
  },

  log: function() {
    if (this.enabled) {
      console.log.apply(console, arguments);
    }
  },

  info: function() {
    if (this.enabled) {
      console.info.apply(console, arguments);
    }
  },

  warn: function() {
    if (this.enabled) {
      console.warn.apply(console, arguments);
    }
  },

  error: function() {
    if (this.enabled) {
      console.error.apply(console, arguments);
    }
  }
};
