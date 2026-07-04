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
      },
      updateStatus: function () {
        if (!this.tableConnected || !this.haveRows || !this.rowConnected) {
          this.status = 'waiting';
        }
      },
    },
  });
});
