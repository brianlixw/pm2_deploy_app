/**
 * Created by lixw on 2017/3/30.
 */

var app = require('../server/server'),
  Tasklog = app.models.Tasklog;

describe('unitest on tasklog', function () {
  describe('check create log', function () {
    before(function (done) {
      superagent.post(serverUrl + 'Employees')
        .send(
          {
            "employeeNumber": "EMPTST999",
            "name": "EMPTST999",
            "firstName": "string",
            "gender": "male",
            "nationality": "string",
            "identificationId": "string",
            "marriaged": "string",
            "personalMobile": "string",
            "workEmail": "test@test.com",
            "birthDay": "string",
            "payTaxIdType": "string",
            "payTaxIdNumber": "string",
            "workActivity": "string",
            "hireDate": "string",
            "departureTime": "string",
            "scoialWorkStartDate": "string",
            "scoialWorkingAge": "string",
            "innerWorkingAge": "string",
            "bankAccount": "string",
            "bankAccountHolder": "string",
            "bankName": "string",
            "bankIdentificationNumberType": "string",
            "bankIdentificationNumber": "string",
            "expired": false,
            "published": false
          }
        )
        .end(function (err, res) {
          if (err) console.log(err);
          done();
        })
    });
    it('create task log', function (done) {
      superagent.post(serverUrl + 'tasklogs/createLog')
        .send(
          {
            "user": "test"
          }
        )
        .end(function (err, res) {
          expect(err).toEqual(null);
          expect(res.status).toEqual(200);
          done();
        });
    });

    it('send task log to RabbitMQ', function (done) {
      Tasklog.find({where: {operator: "test"}}, function (err, tasklog) {
        superagent.post(serverUrl + 'tasklogs/sendMsg')
          .send(
            {
              "id": tasklog.id
            }
          )
          .end(function (err, res) {
            expect(err).toEqual(null);
            //console.log(res);
            expect(res).toNotEqual(null);
          });
      })

      var amqp = require('amqp');
      var connection = amqp.createConnection({url: "amqp://guest:guest@172.16.8.208:5672"});

      connection.on('ready', function () {
        connection.queue('instance_apple_db1000', {durable: true, autoDelete: false}, function (queue) {
          queue.subscribe(function (message) {
            if (!message) throw 'No message in the rabbitMQ';
            else done();
          });
        });
      });
    });

    it('get SUCCESS callback message from odoo', function (done) {
      Tasklog.find({where: {operator: "test"}}, function (err, tasklog) {
        var send_msg = util.format("{\"tasklog_id\":\"%s\",\"code\":\"A1000\",\"error_msg\":\"\",\"time_stamp\":\"2017-04-18\"}", tasklog[0].id);
        superagent.post(serverUrl + 'tasklogs/getOdooResult')
          .send(
            {
              callbackresult: send_msg
            }
          )
          .end(function (err, res) {
            expect(err).toEqual(null);
            expect(res.status).toEqual(200);
            Tasklog.find({where: {id: tasklog[0].id}}, function (err, testresult) {
              expect(testresult[0].iscomplete).toEqual(true);
              done();
            });
          });
      });
    });

    it('get ERROR callback message from odoo', function (done) {
      Tasklog.find({where: {operator: "test"}}, function (err, tasklog) {
        var send_msg = util.format("{\"tasklog_id\":\"%s\",\"code\":\"A0000\",\"error_msg\":\"It's just a test.\",\"time_stamp\":\"2017-04-18\"}", tasklog[0].id);
        superagent.post(serverUrl + 'tasklogs/getOdooResult')
          .send(
            {
              callbackresult: send_msg
            }
          )
          .end(function (err, res) {
            expect(err).toEqual(null);
            expect(res.status).toEqual(200);
            Tasklog.find({where: {id: tasklog[0].id}}, function (err, testresult) {
              expect(testresult[0].error).toEqual(true);
              done();
            });
          });
      });
    });
  });
})
