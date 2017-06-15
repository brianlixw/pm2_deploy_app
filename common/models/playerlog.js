'use strict';

var crypto = require('crypto');

module.exports = function (Playerlog) {
  var app = require('../../server/server');
  Playerlog.createLog = function (user, cb) {
    var Playerinfo = app.models.Playerinfo;
    //var playerobj = playerinfo.find({where: {and:[{"ischeck": true}, {"islog": false}]}});
    Playerinfo.find({
      where: {
        and: [{"ischeck": true}, {"islog": false}]
      }
    }, function (err, playerinfos) {
      if (err) cb(err);
      console.log(playerinfos);
      var timestamp = new Date().getTime();
      var currenttime = new Date().toLocaleDateString();
      var username = user;
      var playerinfos_md5 = crypto.createHash('md5').update(JSON.stringify(playerinfos));
      var playerlog = {
        code: timestamp,
        operator: username,
        createtime: currenttime,
        msg: JSON.stringify(playerinfos),
        md5: playerinfos_md5.digest('hex'),
        issent: false,
        error: false,
        iscomplete: false
      };
      var playerinfos_idlist = [],
        i = 0;
      while (i < playerinfos.length) {
        playerinfos_idlist.push(playerinfos[i].id);
        i++;
      }
      ;
      console.log(playerinfos_idlist);

      Playerlog.create(playerlog, function (err, playerlog) {
        if (err) cb(err, playerlog);
        Playerinfo.updateAll({"id": {inq: playerinfos_idlist}}, {islog: true}, function (err, playerinfo) {
          cb(err, playerinfo);
        })
      });
    });
  };

  Playerlog.sendMsg = function (logid, cb) {
    var amqp = require('amqp');
    var celery = require('node-celery/celery'),
      client = celery.createClient({
        CELERY_BROKER_URL: 'amqp://guest:guest@172.16.8.208:5672//',
        CELERY_RESULT_BACKEND: 'amqp://guest:guest@172.16.8.208:5672//',
        CELERY_ROUTES: {
          'app.smcc.ins.task': {
            queue: 'instance_apple_db1000'
          }
        }
      });
    var connection = amqp.createConnection({url: "amqp://guest:guest@172.16.8.208:5672"});

    function publishToMQ(taskname,args){
      var SMCCTask = client.createTask(taskname);
      client.on('error', function(err) {
        console.log(err);
      });
      client.on('connect', function() {
        return SMCCTask.call(args, {}); // sends a task to the queue
      });

    };

    Playerlog.find({
      where: {"id": logid}
    },function(err,playerlog){
      if(err) cb(err);
      if(playerlog.length===0) {
        cb(null,'Logid is incorrect');
      }
      else {
        console.log(playerlog);
        var msg=JSON.parse(JSON.stringify(playerlog[0])).msg;
        console.log(msg);
        //cb(null,playerlog);

        //send msg to rabbitmq
        connection.on('error',function(err){
          console.log(err);
          cb(err);
        })

        connection.on('ready', function () {
          var callbackCalled = false;
          connection.exchange('instance_apple_db1000', {type: 'direct',autoDelete:false});//create exchange
          connection.queue("instance_apple_db1000",{durable:true,autoDelete:false}, function(queue){//create queue
            queue.bind('instance_apple_db1000','instance_apple_db1000', function() {//bind exchange and queue
              //exchange.publish('queue_name', 'this is message is testing ......');
              callbackCalled = true;
            });
            publishToMQ('app.smcc.ins.task',playerlog.msg,function(result){
              console.log(result);
            });
          });
        });
      };

      //console.log(playerlog);
    })
  }

  Playerlog.remoteMethod(
    'createLog',
    {
      accepts: [{arg: 'user', type: 'string'}],
      returns: {arg: 'createLog:', type: 'string'},
      http: {path: '/createLog', verb: 'post'}
    }
  );

  Playerlog.remoteMethod(
    'sendMsg',
    {
      accepts: [{arg: 'logid', type: 'string'}],
      returns: {arg: 'sendMsg:', type: 'string'},
      http: {path: '/sendMsg', verb: 'post'}
    }
  );

};
