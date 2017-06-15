'use strict';

var crypto = require('crypto'),
  CODEMAP = {
    "A0000": "ERROR",
    "A1000": "SUCCESS"
  };

module.exports = function (Tasklog) {
  var app = require('../../server/server');

  Tasklog.createLog = function (user, cb) {
    /**
     * @param {str} user
     * @param {function} cb
     * @description
     * collect the data from the Employee, Company and CompanyAttr, then create the tasklog that ready to be sent to RabbitMQ
     *
     * @date 2017-04-10
     * @author lixw
     */
    var Employee = app.models.Employee,
      Company = app.models.Company,
      Companyattr = app.models.CompanyAttr;

    //Find the employees to send
    Employee.find({
      where: {
        published: false,
        expired: false
      },
      include: {
        relation: 'employeeSet',
        scope: {
          fields: ['set', 'id']
        }
      }
    }, function (err, employeeinfos) {
      if (err) cb(err);

      //add md5str for each row
      for (var i = 0, l = employeeinfos.length; i < l; i++) {
        employeeinfos[i].md5str = crypto.createHash('md5').update(JSON.stringify(employeeinfos[i])).digest('hex');
      }
      ;

      //Find the companies to send
      Company.find({
        where: {
          published: false,
          expired: false
        }
      }, function (err, companyinfos) {
        if (err) cb(err);

        //add md5str for each row
        for (var i = 0, l = companyinfos.length; i < l; i++) {
          companyinfos[i].md5str = crypto.createHash('md5').update(JSON.stringify(companyinfos[i])).digest('hex');
        }
        ;

        //find the company_attrs to send
        Companyattr.find({
          where: {
            published: false,
            expired: false
          }
        }, function (err, companyattrinfos) {
          if (err) cb(err);

          //add md5str for each row
          for (var i = 0, l = companyattrinfos.length; i < l; i++) {
            companyattrinfos[i].md5str = crypto.createHash('md5').update(JSON.stringify(companyattrinfos[i])).digest('hex');
          }
          ;
          var taskmsg = {
            'Employee': employeeinfos,
            'Company': companyinfos,
            'CompanyAttr': companyattrinfos
          };
          console.log(JSON.stringify(taskmsg));
          var timestamp = new Date().getTime(),
            currenttime = new Date().toLocaleDateString(),
            username = user,
            employeeinfos_md5 = crypto.createHash('md5').update(JSON.stringify(taskmsg));

          //create the tasklog message
          var tasklogmsg = {
            code: timestamp,
            operator: username,
            createtime: currenttime,
            msg: JSON.stringify(taskmsg),
            md5: employeeinfos_md5.digest('hex'),
            issent: false,
            error: false,
            iscomplete: false
          };
          Tasklog.create(tasklogmsg, function (err, tasklog) {
            if (err) cb(err, tasklog);
            cb(null, tasklog);
          });
        });
      });
    });
  };

  Tasklog.sendMsg = function (logid, cb) {
    /**
     * @param {str} logid
     * @param {function} cb
     * @description
     * Send a tasklog to RabbitMQ
     *
     * @date 2017-04-10
     * @author lixw
     */
    var amqp = require('amqp');
    var celery = require('node-celery/celery'),
      client = celery.createClient({
        CELERY_BROKER_URL: 'amqp://guest:guest@172.16.8.208:5672//',
        CELERY_RESULT_BACKEND: 'amqp://guest:guest@172.16.8.208:5672//',
        CELERY_ROUTES: {
          'app.smcc.ins.task': {
            queue: 'employee_000'
          }
        }
      });
    //var connection = amqp.createConnection({url: "amqp://guest:guest@172.16.8.208:5672"});

    Tasklog.find({
      where: {"id": logid}
    }, function (err, tasklog) {
      if (err) cb(err);
      if (tasklog.length === 0) {
        cb(null, 'Logid is incorrect');
      }
      else {
        //console.log(tasklog);
        //var msg = JSON.parse(JSON.stringify(tasklog[0])).msg;

        var sendmsg = ["center.instance.sync.employee", {
          "format": "json",
          "timestamp": new Date().getTime(),
          "params_data": JSON.parse(JSON.stringify(tasklog[0])).msg,
          "server_group_name": "apple",
          "db_name": "instance_apple_db",
          "server_name": "instance_apple",
          "task_type": "async",
          "limit_db": true,
          "send_from": "center.call.ins,call",
          "send_to": "123456",
          "callback": {
            "code": {"SUCCESS": "A1000", "ERROR": "A0000"},
            "tasklog_id": JSON.parse(JSON.stringify(tasklog[0])).id,
            "error_msg": "",
            "timestamp": new Date().getTime()
          },
          "version": "1.0",
          "model": "employee",
          "method": "sync_employee"
        }];

        //Create a node-celery task
        var SMCCTask = client.createTask('app.smcc.ins.task');
        client.on('error', function (err) {
          console.log(err);
          Tasklog.updateAll({id: logid}, {
            error: true,
            errormsg: "message can't be sent to RabbitMQ"
          }, function (err) {
            if (err) cb(err);
            cb(null, "Error, message can't be sent to RabbitMQ");
          });
        });

        client.on('connect', function () {
          // send a task to the queue
          var result = SMCCTask.call(sendmsg, {});
          if (result) {
            // console.log(result);
            Tasklog.updateAll({id: logid}, {issent: true}, function (err, tasklog) {
              if (err) cb(err);
              cb(null, "message has been sent to RabbitMQ");
            });
          };
        });
      };
    });
  }

  Tasklog.getOdooResult = function (data, cb) {
    /**
     * @param {str} callbackresult
     * @param {function} cb
     * @description
     * Get processing result from odoo
     * CallBackResult format:
     * {"tasklog_id":"string","code":"string","error_msg":"string","time_stamp":"datetime"}
     *
     * @date 2017-04-17
     * @author lixw
     */
    var odoo_result = JSON.parse(data),
      Employee = app.models.Employee,
      Employeeset = app.models.EmployeeSet,
      Company = app.models.Company,
      Companyattr = app.models.CompanyAttr;

    Tasklog.find({
      where: {
        id: odoo_result.tasklog_id
      }
    }, function (err, tasklog) {
      if (err) cb(err);
      if (tasklog.length === 0) cb("The Tasklog ID is incorrect");
      var result_code = odoo_result.code;
      if (CODEMAP[result_code] === "ERROR") {
        Tasklog.updateAll({id: tasklog[0].id}, {
          error: true,
          errormsg: odoo_result.error_msg,
          iscomplete: false
        }, function (err) {
          if (err) cb(err);
          cb(null, tasklog);
        });
      }
      ;

      if (CODEMAP[result_code] === "SUCCESS") {
        Tasklog.updateAll({id: tasklog[0].id}, {
          error: false,
          errormsg: null,
          iscomplete: true
        }, function (err) {
          if (err) cb(err);
          console.log(tasklog);
          var model_msg = JSON.parse(tasklog[0].msg);

          var employeeidlist = [],
            employeesetidlist = [],
            companyidlist = [],
            companyattridlist = [];

          //get id list in the msg

          for (var i = 0, l = model_msg.Employee.length; i < l; i++) {
            if (model_msg.Employee[i]) {
              employeeidlist.push(model_msg.Employee[i].id);
            }
            if (model_msg.Employee[i].employeeSet) {
              employeesetidlist.push(model_msg.Employee[i].employeeSet.id);
            }
          }
          for (var x = 0, y = model_msg.Company.length; x < y; x++) {
            if (model_msg.Company[x]) {
              companyidlist.push(model_msg.Company[x].id);
            }
          }
          for (var m = 0, n = model_msg.CompanyAttr.length; m < n; m++) {
            if (model_msg.CompanyAttr[m]) {
              companyattridlist.push(model_msg.CompanyAttr[m].id);
            }
          }

          //update the flag in the model
          Employee.updateAll({id: {inq: employeeidlist}}, {published: true}, function (err) {
            if (err) cb(err);
            Employeeset.updateAll({id: {inq: employeesetidlist}}, {published: true}, function (err) {
              if (err) cb(err);
              Company.updateAll({id: {inq: companyidlist}}, {published: true}, function (err) {
                if (err) cb(err);
                Companyattr.updateAll({id: {inq: companyattridlist}}, {published: true}, function (err) {
                  if (err) cb(err);
                  cb(null, model_msg);
                });
              });
            });
          });
        });
      };
    });
  }



  Tasklog.remoteMethod(
    'createLog',
    {
      accepts: [{arg: 'user', type: 'string'}],
      returns: {arg: 'createLog:', type: 'string'},
      http: {path: '/createLog', verb: 'post'}
    }
  );

  Tasklog.remoteMethod(
    'sendMsg',
    {
      accepts: [{arg: 'logid', type: 'string'}],
      returns: {arg: 'sendMsg:', type: 'string'},
      http: {path: '/sendMsg', verb: 'post'}
    }
  );

  Tasklog.remoteMethod(
    'getOdooResult',
    {
      accepts: [{arg: 'data', type: 'string'}],
      returns: {arg: 'getOdooResult:', type: 'string'},
      http: {path: '/getOdooResult', verb: 'post'}
    }
  );

};
