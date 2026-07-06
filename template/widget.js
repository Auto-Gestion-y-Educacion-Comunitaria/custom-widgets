Vue.config.errorHandler = function (err) {
  if (app) { app.status = 'Error: ' + (err.message || String(err)); }
};

function ready(fn) {
  if (document.readyState !== 'loading') { fn(); }
  else { document.addEventListener('DOMContentLoaded', fn); }
}

var DIPLOMA_KEY = 'datos_diploma';
var DIPLOMA_FIELDS = [
  'Nombres', 'Apellido_Paterno', 'Apellido_Materno',
  'Subprograma', 'Ha_avanzado_en', 'Continuar_trabajando',
  'Habilidades_conquistadas', 'Responsable', 'Libros',
];

function addDemo(row, isLabels) {
  DIPLOMA_FIELDS.forEach(function (f) {
    if (!row[f]) {
      row[f] = isLabels ? '<<' + f + '>>' : f;
    }
  });
  return row;
}

function fitText() {
  var containers = document.querySelectorAll('.fit-text');
  for (var ci = 0; ci < containers.length; ci++) {
    var container = containers[ci];
    var span = container.querySelector('span');
    if (!span) continue;

    var p = container.querySelector('p');
    if (!p) continue;

    var availHeight = container.clientHeight;

    var fontSize = parseFloat(getComputedStyle(span).fontSize) || 10;
    span.style.fontSize = fontSize + 'px';
    p.style.lineHeight = fontSize + 'px';

    var origOverflow = container.style.overflow;
    container.style.overflow = 'hidden';

    var i = 0;
    while (container.scrollHeight > availHeight && fontSize > 4 && i < 50) {
      fontSize -= 0.5;
      span.style.fontSize = fontSize + 'px';
      p.style.lineHeight = fontSize + 'px';
      i++;
    }

    container.style.overflow = origOverflow;
  }
}

function handleError(err) {
  if (app) {
    app.status = 'Error: ' + (err.message || String(err));
  }
}

var app;

ready(function () {
  app = new Vue({
    el: '#app',
    data: {
      status: 'waiting',
      diploma: null,
      tableConnected: false,
      haveRows: false,
      rowConnected: false,
    },
    created: function () {
      var self = this;

      if (document.location.search.indexOf('labels=1') > -1) {
        this.diploma = addDemo({}, true);
        return;
      }
      if (document.location.search.indexOf('demo=1') > -1) {
        this.diploma = exampleData[DIPLOMA_KEY] || exampleData;
        return;
      }

      grist.ready({ requiredAccess: 'read table' });

      grist.onRecord(function (row) {
        self.updateDiploma(row);
      });

      grist.on('message', function (e) {
        var data = e.data;
        if (data.tableId) { self.tableConnected = true; }
        if (data.rowCount !== undefined && data.rowCount > 0) { self.haveRows = true; }
        if (data.selectBy) { self.rowConnected = true; }
        self.updateStatus();
      });
    },
    mounted: function () {
      if (this.diploma) fitText();
    },
    methods: {
      updateDiploma: function (row) {
        if (!row) { this.diploma = null; return; }
        var source = row[DIPLOMA_KEY] || row;
        if (typeof source === 'string') {
          try { source = JSON.parse(source); } catch (e) { source = {}; }
        }
        var mapped = {};
        DIPLOMA_FIELDS.forEach(function (f) {
          mapped[f] = source[f] || '';
        });
        this.diploma = mapped;
        this.status = null;
        var self = this;
        this.$nextTick(fitText);
      },
      updateStatus: function () {
        if (!this.tableConnected || !this.haveRows || !this.rowConnected) {
          this.status = 'waiting';
        }
      },
    },
  });
});
