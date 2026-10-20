Vue.config.errorHandler = function (err) {
  if (app) { app.status = 'Error: ' + (err.message || String(err)); }
};

function ready(fn) {
  if (document.readyState !== 'loading') { fn(); }
  else { document.addEventListener('DOMContentLoaded', fn); }
}

var CREDENCIA_KEY = 'datos_credencial';
var CREDENCIA_FIELDS = [
  'nombre_completo', 'id_usuario', 'telefono', 'fecha_nacimiento', 'estado',
  'calle', 'num_ext', 'num_int', 'colonia', 'curp', 'zona',
  'programa_de_familia', 'firma',
];

function addDemo(row, isLabels) {
  CREDENCIA_FIELDS.forEach(function (f) {
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
  CREDENCIA_FIELDS.forEach(function (f) {
    mapped[f] = source[f] || '';
  });
  return mapped;
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
      credenciales: [],
      tableConnected: false,
      haveRows: false,
      rowConnected: false,
    },
    computed: {
      isError: function () {
        return !!this.status && this.status !== 'waiting';
      },
    },
    created: function () {
      var self = this;

      if (document.location.search.indexOf('labels=1') > -1) {
        this.credenciales = [addDemo({}, true)];
        this.status = null;
        return;
      }
      if (document.location.search.indexOf('demo=1') > -1) {
        this.credenciales = exampleCredenciales.map(function (row) {
          return mapRecord(row[CREDENCIA_KEY] || row);
        });
        this.status = null;
        return;
      }

      grist.ready({ requiredAccess: 'read table' });

      grist.onRecords(function (records) {
        self.updateCredenciales(records);
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
      updateCredenciales: function (rows) {
        if (!rows || !rows.length) { this.credenciales = []; return; }
        var mapped = [];
        for (var ri = 0; ri < rows.length; ri++) {
          var row = rows[ri];
          var source = row[CREDENCIA_KEY] || row;
          mapped.push(mapRecord(source));
        }
        this.credenciales = mapped;
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
