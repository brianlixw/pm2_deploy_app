'use strict';
var pm2 = require('pm2');

module.exports = function(Testpm2) {
  Testpm2.raiseError = function(){
    var test_env = process.env.TEST_ENV;
    console.log(test_env);
    process.exit(1)
    // throw 'PM2 RAISE ERROR'
  };

  Testpm2.remoteMethod(
    'raiseError',
    {
      accepts: [{arg: 'user', type: 'string'}],
      returns: {arg: 'raiseError:', type: 'string'},
      http: {path: '/raiseError', verb: 'post'}
    }
  );

};
