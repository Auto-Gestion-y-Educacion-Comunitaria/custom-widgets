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

function mapRecord(source) {
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch (e) { source = {}; }
  }
  if (!source || typeof source !== 'object') source = {};
  var mapped = {};
  DIPLOMA_FIELDS.forEach(function (f) {
    mapped[f] = source[f] || '';
  });
  return mapped;
}

function fitTextWhenReady(fn) {
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fn);
  } else {
    fn();
  }
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
    while (container.scrollHeight > availHeight + 1 && fontSize > 4 && i < 50) {
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
      diplomas: [],
      tableConnected: false,
      haveRows: false,
      rowConnected: false,
    },
    created: function () {
      var self = this;

      if (document.location.search.indexOf('labels=1') > -1) {
        this.diplomas = [addDemo({}, true)];
        return;
      }
      if (document.location.search.indexOf('demo=1') > -1) {
        this.diplomas = exampleDiplomas.map(function (row) {
          return mapRecord(row[DIPLOMA_KEY] || row);
        });
        return;
      }

      grist.ready({ requiredAccess: 'read table' });

      grist.onRecords(function (records) {
        self.updateDiplomas(records);
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
      if (this.diplomas.length) fitTextWhenReady(fitText);
    },
    methods: {
      updateDiplomas: function (rows) {
        if (!rows || !rows.length) { this.diplomas = []; return; }
        var mapped = [];
        for (var ri = 0; ri < rows.length; ri++) {
          var row = rows[ri];
          var source = row[DIPLOMA_KEY] || row;
          mapped.push(mapRecord(source));
        }
        this.diplomas = mapped;
        this.status = null;
        this.$nextTick(function () { fitTextWhenReady(fitText); });
      },
      updateStatus: function () {
        if (!this.tableConnected || !this.haveRows || !this.rowConnected) {
          this.status = 'waiting';
        }
      },
    },
  });
});
