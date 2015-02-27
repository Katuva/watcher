/**
 * Created by wesley on 23/02/2015.
 */

var chokidar = require('chokidar');
var console = require('./consolo');
var config = require('config');
var args = require('command-line-args');
var io = require('socket.io-client');
var fs = require('fs');
var crypto = require('crypto');
var _ = require('lodash');
var dir = require('node-dir');
var anymatch = require('anymatch');
var colors = require('colors');

var clientConfig = config.get('client');
var securityConfig = config.get('security');

function makeHash(data) {
  var hash = crypto.createHash('sha256');
  hash.setEncoding('hex');

  hash.write(securityConfig.secret);
  hash.write(data);
  hash.end();
  return hash.read();
}

function stripPath(path) {
  _.forEach(clientConfig.watcher.watch, function(cwd) {
    cwd = _.escapeRegExp(cwd);
    var re = new RegExp(cwd, 'g');
    path = path.replace(re, '');
  });

  path = _.trimLeft(path, ['\\', '/']);
  return path;
}

var cli = args([
  { name: 'verbose', type: Boolean, alias: 'v', description: 'Full output' },
  { name: 'help', type: Boolean, alias: 'h', description: 'Print usage instructions' },
  { name: 'fullsync', type: Boolean, alias: 'fs', description: 'Perform a full sync' }
]);

var options = cli.parse();

var usage = cli.getUsage({
  header: 'A live sync app.',
  footer: '\nFor more information, visit http://www.twyman.io/sync'
});

if (options.help) {
  console.log(usage);
  process.exit();
}

var socket = io.connect(clientConfig.connection.host);

var watcher = chokidar.watch(clientConfig.watcher.watch, {
  ignored: clientConfig.watcher.ignore,
  ignoreInitial: true,
  persistent: true
});

socket.on('connect', function() {
  console.log(console.icon.right_arrow, 'Connected to server @', clientConfig.connection.host);

  if (options.fullsync) {
    dir.paths(clientConfig.watcher.watch[0], function(err, paths) {
      if (err) throw err;

      process.stdout.write(console.icon.bullet + ' Sending full sync:\t\t\t\t');

      var dirs = [];
      var files = [];

      _.forEach(paths.dirs, function(dir) {
        if (!anymatch(clientConfig.watcher.ignore, dir)) {
          dirs.push(stripPath(dir));
        }
      });

      socket.emit('syncDirs', dirs, makeHash(JSON.stringify(dirs)));

      _.forEach(paths.files, function(file) {
        if (!anymatch(clientConfig.watcher.ignore, file)) {
          var data = fs.readFileSync(file);

          files.push({
            path: stripPath(file),
            data: data
          });
        }
      });

      socket.emit('syncFiles', files, makeHash(JSON.stringify(files)));

      process.stdout.write('[ ' + 'Done'.green + ' ]\n');
    });
  }

  watcher
    .on('add', function(file) {
      console.log(console.icon.plus, 'File', file, 'has been added');

      fs.readFile(file, function(err, data) {
        if (err) throw err;

        socket.emit('add', stripPath(file), makeHash(stripPath(file) + data), data);
      });
    })
    .on('addDir', function(path) {
      console.log(console.icon.plus, 'Directory', path, 'has been added');

      socket.emit('addDir', stripPath(path), makeHash(stripPath(path)));
    })
    .on('change', function(path) {
      console.log(console.icon.edit, 'File', path, 'has been changed');
      fs.readFile(path, function(err, data) {
        if (err) throw err;

        socket.emit('change', stripPath(path), makeHash(data), data);
      });
    })
    .on('unlink', function(path) {
      console.log(console.icon.cross, 'File', path, 'has been removed');

      watcher.unwatch(path);

      socket.emit('unlink', stripPath(path), makeHash(stripPath(path)));
    })
    .on('unlinkDir', function(path) {
      console.log(console.icon.cross, 'Directory', path, 'has been removed');

      watcher.unwatch(path);

      socket.emit('unlinkDir', stripPath(path), makeHash(stripPath(path)));
    })
    .on('error', function(error) { console.error('Error happened', error); })
    .on('ready', function() {
      console.enabled = true;
      console.log(console.icon.bullet, 'Initial scan complete. Ready for changes.');
    });
});
