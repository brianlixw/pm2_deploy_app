'use strict';
var async = require('async');

module.exports = function (Company) {

  Company.newCompany = function (newCorpStr, cb) {
    var companyCache = Company.app.models.CompanyCache;
    var newCorpData = JSON.parse(newCorpStr);
    var pKey = newCorpJson.code;
    if (pKey) {
          companyCache.upsertWithWhere({code: pKey}, newCorpData, function (err, cacheRecord) {
            cb(err, cacheRecord);
          })
        }
    else cb(null, 'wrong json')
  };

  Company.checkCompany = function (cb) {
    var companyCache = Company.app.models.CompanyCache;
    companyCache.find(function (err, cacheRecord) {
      cb(err, cacheRecord)
    })
  };

  Company.upsertCompany = function (companyCode, cb) {
    var companyCodeJson = JSON.parse(companyCode);
    var pKey = companyCodeJson.code;
    if (pKey) {
      var companyCache = Company.app.models.CompanyCache;
      async.waterfall([
        function (done) {
          companyCache.find({fields: {id: false},where: {code: pKey}},
            function (err, cacheRecords) {
              done(err, cacheRecords)
            }
          )
        },
        function (cacheRecords, done) {
          if (cacheRecords.length !== 0) {
            var cacheRecordJson=cacheRecords[0].toJSON();
            Company.upsertWithWhere({code: pKey}, cacheRecordJson, function (err, newCompany) {
              done(err, newCompany)
            })
          }
          else done(null, 'no cache')
        }
      ], function (err, result) {
        cb(err, result);
      });
    }
    else cb(null, 'wrong json.code')
  };


  Company.remoteMethod(
    'newCompany',
    {
      accepts: [{arg: 'newcompany', type: 'string'}],
      returns: {arg: 'companycache:', type: 'string'},
      http: {path: '/newCompany', verb: 'post'}
    }
  );
  Company.remoteMethod(
    'checkCompany',
    {
      returns: {arg: 'companycache:', type: 'string'},
      http: {path: '/checkCompany', verb: 'get'}
    }
  );
  Company.remoteMethod(
    'upsertCompany',
    {
      accepts: [{arg: 'companyCode', type: 'string'}],
      returns: {arg: 'upsertCompany:', type: 'string'},
      http: {path: '/upsertCompany', verb: 'post'}
    }
  );
};
