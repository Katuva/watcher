/**
 * Created by wesley on 23/02/2015.
 */

var config = require('config');
var fs = require('fs');

var securityConfig = config.get('security');
var serverConfig = config.get('server');

var io = require('socket.io').listen(serverConfig.connection.port);
var crypto = require('crypto');

var console = require('./consolo');
var _ = require('lodash');

function checkHash(token, data) {
  var hash = crypto.createHash('sha256');
  hash.setEncoding('hex');

  hash.write(securityConfig.secret);
  hash.write(data);
  hash.end();

  return hash.read() === token;
}

io.on('connection', function(socket) {
  console.log(console.icon.bullet, 'Remote connection established.');

  socket.on('syncDirs', function(dirs, token) {
    if (checkHash(token, JSON.stringify(dirs))) {
      _.forEach(dirs, function(dir) {
        console.log(console.icon.plus, dir);
        fs.mkdirSync(serverConfig.path + '/' + dir);
      });
    }
    else {
      console.log(console.icon.bullet, 'Error, hashes do not match!');
    }
  });

  socket.on('syncFiles', function(files, token) {
    if (checkHash(token, JSON.stringify(files))) {
      _.forEach(files, function(file) {
        console.log(console.icon.plus, file.path);
        fs.writeFileSync(serverConfig.path + '/' + file.path, file.data);
      });
    }
    else {
      console.log(console.icon.bullet, 'Error, hashes do not match!');
    }
  });

  socket.on('add', function(file, token, data) {
    if (checkHash(token, file + data)) {
      console.log(console.icon.plus, file);

      fs.writeFile(serverConfig.path + '/' + file, data, function(err) {
        if (err) console.log('Error saving file:', err);
      });
    }
    else {
      console.log(console.icon.bullet, 'Error, hashes do not match!');
    }
  });

  socket.on('addDir', function(dir, token) {
    if (checkHash(token, dir)) {
      console.log(console.icon.plus, dir);

      fs.mkdirSync(serverConfig.path + '/' + dir);
    }
    else {
      console.log(console.icon.bullet, 'Error, hashes do not match!');
    }
  });

  socket.on('unlink', function(file, token) {
    if (checkHash(token, file)) {
      console.log(console.icon.cross, file);

      fs.unlink(serverConfig.path + '/' + file);
    }
    else {
      console.log(console.icon.bullet, 'Error, hashes do not match!');
    }
  });

  socket.on('unlinkDir', function(dir, token) {
    if (checkHash(token, dir)) {
      console.log(console.icon.cross, dir);

      fs.rmdir(serverConfig.path + '/' + dir);
    }
    else {
      console.log(console.icon.bullet, 'Error, hashes do not match!');
    }
  });

  socket.on('change', function(path, token, data) {
    if (checkHash(token, data)) {
      console.log(console.icon.edit, path);

      fs.writeFile(serverConfig.path + '/' + path, data, function(err) {
        if (err) console.log('Error saving file:', err);
      });
    }
    else {
      console.log(console.icon.bullet, 'Error, hashes do not match!');
    }
  });
});
